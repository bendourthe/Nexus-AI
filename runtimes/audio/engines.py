"""v2.0.0 Phase 1 -- local STT (faster-whisper) + TTS (Kokoro) engines.

Heavy imports are lazy so `health` and `version` answer on a bare CI host
with no CTranslate2 and no Kokoro. Weights are read from the installer
catalog path (`~/.nexus/models/weights/<id>`); nothing is downloaded here.
"""

from __future__ import annotations

import base64
import os
import tempfile
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


def transcribe(params: dict[str, Any] | None) -> dict[str, Any]:
    payload = (params or {}).get("audioBase64") or ""
    if not str(payload).strip():
        raise ValueError("audioBase64 is required")
    if os.environ.get("NEXUS_AUDIO_STUB") == "1":
        return {"transcript": "stub transcript"}
    model_dir = weights_dir(version.STT_MODEL_ID)
    if not model_dir.is_dir():
        raise RuntimeError(STT_UNAVAILABLE)
    _expose_torch_cuda_dlls()
    try:
        from faster_whisper import WhisperModel  # type: ignore[import-untyped]
    except ImportError as exc:
        raise RuntimeError(
            "faster-whisper is not installed in the audio runtime venv"
        ) from exc
    audio_bytes = _strip_data_url(str(payload))
    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as handle:
        handle.write(audio_bytes)
        path = handle.name
    try:
        model = WhisperModel(str(model_dir), local_files_only=True)
        segments, _info = model.transcribe(path)
        text = " ".join(seg.text.strip() for seg in segments if getattr(seg, "text", "")).strip()
        return {"transcript": text}
    finally:
        try:
            os.unlink(path)
        except OSError:
            pass


def speak(params: dict[str, Any] | None) -> dict[str, Any]:
    text = str((params or {}).get("text") or "").strip()
    if not text:
        raise ValueError("text is required")
    if os.environ.get("NEXUS_AUDIO_STUB") == "1":
        silence = (
            b"RIFF$\x00\x00\x00WAVEfmt "
            b"\x10\x00\x00\x00\x01\x00\x01\x00"
            b"D\xac\x00\x00\x88X\x01\x00\x02\x00\x10\x00"
            b"data\x00\x00\x00\x00"
        )
        return {"audioBase64": base64.b64encode(silence).decode("ascii"), "mimeType": "audio/wav"}
    model_dir = weights_dir(version.TTS_MODEL_ID)
    if not all((model_dir / name).is_file() for name in KOKORO_FILES):
        raise RuntimeError(TTS_UNAVAILABLE)
    try:
        from kokoro import KModel, KPipeline  # type: ignore[import-untyped]
    except ImportError as exc:
        raise RuntimeError("kokoro is not installed in the audio runtime venv") from exc
    # Built from the local weights only. Still constructed per call; v2.14.0
    # T005 caches it once the Phase 1 baseline has measured this cost.
    model = KModel(
        repo_id=KOKORO_REPO_ID,
        config=str(model_dir / "config.json"),
        model=str(model_dir / "kokoro-v1_0.pth"),
    )
    pipeline = KPipeline(lang_code="a", repo_id=KOKORO_REPO_ID, model=model)
    voice = str(model_dir / "voices" / f"{KOKORO_VOICE}.pt")
    chunks: list[bytes] = []
    for _gs, _ps, audio in pipeline(text, voice=voice):
        # audio is a numpy array; encode lazily via wave in a temp file if needed.
        import numpy as np

        pcm = np.asarray(audio).astype(np.float32)
        chunks.append(float32_pcm_to_int16_le(pcm.ravel().tolist()))
    raw = b"".join(chunks)
    wav = _wrap_wav(raw, sample_rate=24000)
    return {"audioBase64": base64.b64encode(wav).decode("ascii"), "mimeType": "audio/wav"}


def float32_pcm_to_int16_le(samples: list[float]) -> bytes:
    """Clip float32 PCM in [-1, 1] to little-endian signed 16-bit samples."""
    import struct

    out = bytearray()
    for x in samples:
        v = int(x * 32767.0)
        if v > 32767:
            v = 32767
        elif v < -32768:
            v = -32768
        out.extend(struct.pack("<h", v))
    return bytes(out)


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
