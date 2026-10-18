"""v2.14.0 -- the audio runtime runs from installed weights only.

Kokoro used to be built with no local paths, so it fetched from Hugging Face;
CTranslate2 could not find torch's CUDA DLLs on Windows. These tests cover the
fail-closed weights check and both fixes without importing Kokoro or Whisper.
"""

from __future__ import annotations

import os

import pytest

from runtimes.audio import engines


def test_huggingface_libraries_are_forced_offline():
    assert os.environ.get("HF_HUB_OFFLINE") == "1"
    assert os.environ.get("TRANSFORMERS_OFFLINE") == "1"


@pytest.mark.parametrize("missing", engines.KOKORO_FILES)
def test_speak_fails_closed_when_any_kokoro_file_is_missing(
    tmp_path, monkeypatch, missing
):
    monkeypatch.delenv("NEXUS_AUDIO_STUB", raising=False)
    monkeypatch.setenv("NEXUS_MODELS_ROOT", str(tmp_path))
    model_dir = tmp_path / "weights" / "kokoro-82m"
    for name in engines.KOKORO_FILES:
        if name != missing:
            (model_dir / name).parent.mkdir(parents=True, exist_ok=True)
            (model_dir / name).write_bytes(b"x")
    with pytest.raises(RuntimeError, match="TTS weights are not installed"):
        engines.speak({"text": "hello"})


def test_torch_cuda_dlls_are_put_on_path_on_windows(tmp_path, monkeypatch):
    torch_dir = tmp_path / "torch"
    (torch_dir / "lib").mkdir(parents=True)
    (torch_dir / "__init__.py").write_text("")

    class Spec:
        origin = str(torch_dir / "__init__.py")

    added: list[str] = []
    # Faking os.name makes pathlib.Path build a WindowsPath, which a Linux
    # runner cannot instantiate; keep the engine on the host's path class.
    monkeypatch.setattr(engines, "Path", type(tmp_path))
    monkeypatch.setattr(engines.os, "name", "nt")
    monkeypatch.setattr(
        "importlib.util.find_spec", lambda name: Spec() if name == "torch" else None
    )
    monkeypatch.setattr(engines.os, "add_dll_directory", added.append, raising=False)
    monkeypatch.setenv("PATH", "C:/other")

    engines._expose_torch_cuda_dlls()
    engines._expose_torch_cuda_dlls()  # idempotent: PATH gains the folder once

    lib = str(torch_dir / "lib")
    assert added == [lib, lib]
    assert os.environ["PATH"].split(os.pathsep).count(lib) == 1
    assert os.environ["PATH"].split(os.pathsep)[0] == lib


def test_torch_dll_helper_is_a_no_op_off_windows_or_without_torch(monkeypatch):
    monkeypatch.setenv("PATH", "C:/other")
    monkeypatch.setattr(engines.os, "name", "posix")
    engines._expose_torch_cuda_dlls()
    assert os.environ["PATH"] == "C:/other"
    monkeypatch.setattr(engines.os, "name", "nt")
    monkeypatch.setattr("importlib.util.find_spec", lambda name: None)
    engines._expose_torch_cuda_dlls()
    assert os.environ["PATH"] == "C:/other"


def test_whisper_model_is_built_once_and_reused(tmp_path, monkeypatch):
    import sys
    import types

    monkeypatch.delenv("NEXUS_AUDIO_STUB", raising=False)
    monkeypatch.setenv("NEXUS_MODELS_ROOT", str(tmp_path))
    (tmp_path / "weights" / "faster-whisper-large-v3").mkdir(parents=True)
    built: list[str] = []

    class Segment:
        text = " hello "

    class WhisperModel:
        def __init__(self, path, local_files_only):
            assert local_files_only is True
            built.append(path)

        def transcribe(self, _path):
            return [Segment()], None

    monkeypatch.setitem(sys.modules, "faster_whisper", types.SimpleNamespace(WhisperModel=WhisperModel))
    monkeypatch.setattr(engines, "_WHISPER", None)
    for _ in range(3):
        assert engines.transcribe({"audioBase64": "AAAA"}) == {"transcript": "hello"}
    assert len(built) == 1


def test_transcribe_fails_closed_without_whisper_weights(tmp_path, monkeypatch):
    monkeypatch.delenv("NEXUS_AUDIO_STUB", raising=False)
    monkeypatch.setenv("NEXUS_MODELS_ROOT", str(tmp_path))
    monkeypatch.setattr(engines, "_WHISPER", None)
    with pytest.raises(RuntimeError, match="STT weights are not installed"):
        engines.transcribe({"audioBase64": "AAAA"})
