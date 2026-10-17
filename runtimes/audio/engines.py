"""v2.0.0 Phase 1 -- local STT (faster-whisper) + TTS (Kokoro) engines.

Heavy imports are lazy so `health` and `version` answer on a bare CI host
with no CTranslate2 and no Kokoro. Weights are read from the installer
catalog path (`~/.nexus/models/weights/<id>`); nothing is downloaded here.
"""

from __future__ import annotations

import base64
import os
import tempfile
import threading
import time
from collections.abc import Callable, Iterator
from pathlib import Path
from typing import Any

from . import version

STT_UNAVAILABLE = (
    "STT weights are not installed. Install faster-whisper-large-v3 from Settings > Models."
)
TTS_UNAVAILABLE = "TTS weights are not installed. Install kokoro-82m from Settings > Models."

# v2.14.0: Kokoro and huggingface_hub must never reach the network. These are
# read at import time, and the engine imports are lazy, so set them first.
os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")

KOKORO_REPO_ID = "hexgrad/Kokoro-82M"
KOKORO_VOICE = "af_heart"
# Files the offline Kokoro construction opens (catalog `weights.files`).
KOKORO_FILES = ("config.json", "kokoro-v1_0.pth", f"voices/{KOKORO_VOICE}.pt")
KOKORO_SAMPLE_RATE = 24000

# v2.14.0 frozen runtime bounds (docs/releases/v2/v2.14/development/gates.md).
MAX_SPEAK_CHARS = 8000
MAX_SEGMENTS_PER_JOB = 200
MAX_SEGMENT_BASE64_BYTES = 2 * 1024 * 1024
MAX_JOB_BASE64_BYTES = 64 * 1024 * 1024
SEGMENT_TIMEOUT_S = 30.0

_STUB_WAV = bytes.fromhex(
    "524946462400000057415645666d7420100000000100010044ac000088580100020010006461746100000000"
)  # 44-byte empty 16-bit mono WAV header


class SpeakLimitError(ValueError):
    """A synthesis request or job exceeded a frozen bound."""


def _expose_torch_cuda_dlls() -> None:
    """Let CTranslate2 find the CUDA DLLs (cublas64_12, cudnn) that torch ships.

    On Windows these live in `torch/lib`, which is not on the DLL search path
    until torch itself is imported, so a transcription before any synthesis
    failed with "cublas64_12.dll is not found". No-op elsewhere or without torch.
    """
    if os.name != "nt":
        return
    import importlib.util

    spec = importlib.util.find_spec("torch")
    if spec is None or not spec.origin:
        return
    lib = Path(spec.origin).parent / "lib"
    if not lib.is_dir():
        return
    os.add_dll_directory(str(lib))
    # CTranslate2 loads cuBLAS lazily with a plain LoadLibrary, which searches
    # PATH and ignores add_dll_directory, so PATH needs the folder too.
    entries = os.environ.get("PATH", "").split(os.pathsep)
    if str(lib) not in entries:
        os.environ["PATH"] = os.pathsep.join([str(lib), *entries])


def models_root() -> Path:
    override = os.environ.get("NEXUS_MODELS_ROOT")
    if override:
        return Path(override)
    return Path.home() / ".nexus" / "models"


def weights_dir(model_id: str) -> Path:
    return models_root() / "weights" / model_id


def _strip_data_url(payload: str) -> bytes:
    marker = "base64,"
    idx = payload.find(marker)
    raw = payload[idx + len(marker) :] if idx >= 0 else payload
    return base64.b64decode(raw)


def health() -> dict[str, Any]:
    stub = os.environ.get("NEXUS_AUDIO_STUB") == "1"
    stt_dir = weights_dir(version.STT_MODEL_ID)
    tts_dir = weights_dir(version.TTS_MODEL_ID)
    stt_ok = stub or stt_dir.is_dir()
    tts_ok = stub or tts_dir.is_dir()
    return {
        "ok": True,
        "stt": {
            "available": stt_ok,
            "reason": "stub" if stub else ("installed" if stt_ok else STT_UNAVAILABLE),
        },
        "tts": {
            "available": tts_ok,
            "reason": "stub" if stub else ("installed" if tts_ok else TTS_UNAVAILABLE),
        },
        "platform": f"{os.name}",
    }


_WHISPER_LOCK = threading.Lock()
_WHISPER: Any = None


def _whisper_model() -> Any:
    """Build the Whisper model once per process from the installed weights.

    v2.14.0 Phase 2 rework: the baseline rebuilt it on every call, which cost
    4 to 7 s of every voice turn. Missing weights fail closed and never fetch.
    """
    global _WHISPER
    with _WHISPER_LOCK:
        if _WHISPER is not None:
            return _WHISPER
        model_dir = weights_dir(version.STT_MODEL_ID)
        if not model_dir.is_dir():
            raise RuntimeError(STT_UNAVAILABLE)
        _expose_torch_cuda_dlls()
        try:
            from faster_whisper import WhisperModel  # type: ignore[import-untyped]
        except ImportError as exc:
            raise RuntimeError("faster-whisper is not installed in the audio runtime venv") from exc
        _WHISPER = WhisperModel(str(model_dir), local_files_only=True)
        return _WHISPER


def transcribe(params: dict[str, Any] | None) -> dict[str, Any]:
    payload = (params or {}).get("audioBase64") or ""
    if not str(payload).strip():
        raise ValueError("audioBase64 is required")
    if os.environ.get("NEXUS_AUDIO_STUB") == "1":
        return {"transcript": "stub transcript"}
    model = _whisper_model()
    audio_bytes = _strip_data_url(str(payload))
    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as handle:
        handle.write(audio_bytes)
        path = handle.name
    try:
        segments, _info = model.transcribe(path)
        text = " ".join(seg.text.strip() for seg in segments if getattr(seg, "text", "")).strip()
        return {"transcript": text}
    finally:
        try:
            os.unlink(path)
        except OSError:
            pass


def _speak_text(params: dict[str, Any] | None) -> str:
    text = str((params or {}).get("text") or "").strip()
    if not text:
        raise ValueError("text is required")
    if len(text) > MAX_SPEAK_CHARS:
        raise SpeakLimitError(f"text exceeds {MAX_SPEAK_CHARS} characters")
    return text


_PIPELINE_LOCK = threading.Lock()
_PIPELINE: Any = None


def _kokoro_pipeline() -> Any:
    """Build the Kokoro pipeline once per process from the installed weights.

    v2.14.0 T005: the baseline rebuilt it on every call (about 8 s of a cold
    turn). Missing weights fail closed with TTS_UNAVAILABLE and never fetch.
    """
    global _PIPELINE
    with _PIPELINE_LOCK:
        if _PIPELINE is not None:
            return _PIPELINE
        model_dir = weights_dir(version.TTS_MODEL_ID)
        if not all((model_dir / name).is_file() for name in KOKORO_FILES):
            raise RuntimeError(TTS_UNAVAILABLE)
        try:
            from kokoro import KModel, KPipeline  # type: ignore[import-untyped]
        except ImportError as exc:
            raise RuntimeError("kokoro is not installed in the audio runtime venv") from exc
        model = KModel(
            repo_id=KOKORO_REPO_ID,
            config=str(model_dir / "config.json"),
            model=str(model_dir / "kokoro-v1_0.pth"),
        )
        _PIPELINE = KPipeline(lang_code="a", repo_id=KOKORO_REPO_ID, model=model)
        return _PIPELINE


def _kokoro_voice() -> str:
    return str(weights_dir(version.TTS_MODEL_ID) / "voices" / f"{KOKORO_VOICE}.pt")


def _pcm_segments(text: str) -> Iterator[bytes]:
    """Yield little-endian int16 PCM, one item per Kokoro segment."""
    pipeline = _kokoro_pipeline()
    for _gs, _ps, audio in pipeline(text, voice=_kokoro_voice()):
        yield float32_pcm_to_int16_le(audio)


def iter_speak_segments(
    params: dict[str, Any] | None,
    cancelled: Callable[[], bool] = lambda: False,
    clock: Callable[[], float] = time.monotonic,
) -> Iterator[str]:
    """Yield one base64 WAV per Kokoro segment, enforcing every frozen bound.

    `cancelled` is checked before each segment is produced and before it is
    yielded, so a cancel takes effect between segments. Raises SpeakLimitError
    when a segment, the job, or a segment's synthesis time exceeds its bound.
    """
    text = _speak_text(params)
    if os.environ.get("NEXUS_AUDIO_STUB") == "1":
        segments: Iterator[bytes] = iter([b""])
        stub = True
    else:
        segments = _pcm_segments(text)
        stub = False
    total = 0
    count = 0
    started = clock()
    while not cancelled():
        try:
            pcm = next(segments)
        except StopIteration:
            return
        elapsed = clock() - started
        if elapsed > SEGMENT_TIMEOUT_S:
            raise SpeakLimitError(f"segment synthesis exceeded {SEGMENT_TIMEOUT_S:.0f} s")
        wav = _STUB_WAV if stub else _wrap_wav(pcm, sample_rate=KOKORO_SAMPLE_RATE)
        encoded = base64.b64encode(wav).decode("ascii")
        count += 1
        total += len(encoded)
        if count > MAX_SEGMENTS_PER_JOB:
            raise SpeakLimitError(f"job exceeds {MAX_SEGMENTS_PER_JOB} segments")
        if len(encoded) > MAX_SEGMENT_BASE64_BYTES:
            raise SpeakLimitError("segment exceeds the per-segment byte cap")
        if total > MAX_JOB_BASE64_BYTES:
            raise SpeakLimitError("job exceeds the per-job byte cap")
        if cancelled():
            return
        yield encoded
        started = clock()


def speak(params: dict[str, Any] | None) -> dict[str, Any]:
    """One-shot synthesis: the whole reply as one WAV (cached pipeline)."""
    text = _speak_text(params)
    if os.environ.get("NEXUS_AUDIO_STUB") == "1":
        return {"audioBase64": base64.b64encode(_STUB_WAV).decode("ascii"), "mimeType": "audio/wav"}
    raw = b"".join(_pcm_segments(text))
    wav = _wrap_wav(raw, sample_rate=KOKORO_SAMPLE_RATE)
    return {"audioBase64": base64.b64encode(wav).decode("ascii"), "mimeType": "audio/wav"}


def float32_pcm_to_int16_le(samples: Any) -> bytes:
    """Clip float32 PCM in [-1, 1] to little-endian signed 16-bit samples.

    v2.14.0 T005: vectorized. Truncates toward zero before clipping, exactly as
    the former per-sample `int(x * 32767.0)` loop did.
    """
    import numpy as np

    scaled = np.trunc(np.asarray(samples, dtype=np.float64).ravel() * 32767.0)
    return np.clip(scaled, -32768, 32767).astype("<i2").tobytes()


def _wrap_wav(pcm: bytes, sample_rate: int) -> bytes:
    import struct

    data_size = len(pcm)
    header = struct.pack(
        "<4sI4s4sIHHIIHH4sI",
        b"RIFF",
        36 + data_size,
        b"WAVE",
        b"fmt ",
        16,
        1,
        1,
        sample_rate,
        sample_rate * 2,
        2,
        16,
        b"data",
        data_size,
    )
    return header + pcm
