"""v2.14.0 T005 -- cancellable, streaming audio runtime.

Kokoro and Whisper are replaced by fakes: `_pcm_segments` yields scripted PCM
and `transcribe` returns at once, so the lane, bound and cancellation logic is
tested without weights. Every test reads the runtime's real stdout lines.
"""

from __future__ import annotations

import json
import struct
import sys
import threading
import time
import types

import pytest

from runtimes.audio import engines, main


def _old_float32_pcm_to_int16_le(samples: list[float]) -> bytes:
    """The pre-v2.14.0 per-sample loop, kept here as the equality oracle."""
    out = bytearray()
    for x in samples:
        v = int(x * 32767.0)
        v = max(-32768, min(32767, v))
        out.extend(struct.pack("<h", v))
    return bytes(out)


class Output:
    """Accumulates the runtime's stdout lines through pytest's capsys.

    Pytest reinstalls its own sys.stdout at the start of each test phase, so a
    patched stream would be replaced; capsys captures the lanes' writes too.
    """

    def __init__(self, capsys: pytest.CaptureFixture[str]) -> None:
        self._capsys = capsys
        self._text = ""

    def messages(self) -> list[dict]:
        self._text += self._capsys.readouterr().out
        return [json.loads(line) for line in self._text.splitlines() if line.strip()]


@pytest.fixture()
def out(capsys: pytest.CaptureFixture[str]) -> Output:
    return Output(capsys)


@pytest.fixture()
def runtime(out):  # noqa: ARG001 -- stdout must be captured before lanes start
    rt = main.AudioRuntime()
    yield rt
    rt.close()


def wait_for(predicate, timeout: float = 5.0) -> None:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if predicate():
            return
        time.sleep(0.01)
    raise AssertionError("condition not met in time")


def response(out: Output, req_id: int) -> dict | None:
    return next((m for m in out.messages() if m.get("id") == req_id), None)


def request(
    rt: main.AudioRuntime, req_id: int, method: str, params: dict | None = None
) -> None:
    rt.route(
        json.dumps({"jsonrpc": "2.0", "id": req_id, "method": method, "params": params})
    )


def fake_segments(
    monkeypatch,
    count: int,
    gate: threading.Event | None = None,
    pcm: bytes = b"\x01\x00" * 4,
    delay: float = 0.0,
):
    def segments(_text):
        for _ in range(count):
            if gate is not None:
                gate.wait(5)
            if delay:
                time.sleep(delay)
            yield pcm

    monkeypatch.delenv("NEXUS_AUDIO_STUB", raising=False)
    monkeypatch.setattr(engines, "_pcm_segments", segments)


class TestConversion:
    @pytest.mark.parametrize(
        "samples",
        [
            [0.0, 1.0, -1.0, 0.5, -0.5],
            [2.0, -2.0, 1e-9, -1e-9],
            [0.123456, -0.654321, 0.99999, -0.99999],
        ],
    )
    def test_vectorized_conversion_equals_the_old_loop(self, samples):
        assert engines.float32_pcm_to_int16_le(samples) == _old_float32_pcm_to_int16_le(
            samples
        )

    def test_accepts_numpy_arrays(self):
        np = pytest.importorskip("numpy")
        arr = np.linspace(-1.2, 1.2, 101, dtype=np.float32)
        assert engines.float32_pcm_to_int16_le(arr) == _old_float32_pcm_to_int16_le(
            arr.tolist()
        )


class TestPipelineCache:
    def test_pipeline_is_built_once_from_local_weights(self, tmp_path, monkeypatch):
        monkeypatch.setenv("NEXUS_MODELS_ROOT", str(tmp_path))
        model_dir = tmp_path / "weights" / "kokoro-82m"
        for name in engines.KOKORO_FILES:
            (model_dir / name).parent.mkdir(parents=True, exist_ok=True)
            (model_dir / name).write_bytes(b"x")
        built: list[dict] = []

        class KModel:
            def __init__(self, **kwargs):
                built.append(kwargs)

        class KPipeline:
            def __init__(self, **kwargs):
                self.kwargs = kwargs

        monkeypatch.setitem(
            sys.modules,
            "kokoro",
            types.SimpleNamespace(KModel=KModel, KPipeline=KPipeline),
        )
        monkeypatch.setattr(engines, "_PIPELINE", None)
        first = engines._kokoro_pipeline()
        second = engines._kokoro_pipeline()
        assert first is second
        assert len(built) == 1
        assert built[0]["config"].endswith("config.json")
        assert built[0]["model"].endswith("kokoro-v1_0.pth")

    def test_missing_weights_fail_closed(self, tmp_path, monkeypatch, out, runtime):
        monkeypatch.delenv("NEXUS_AUDIO_STUB", raising=False)
        monkeypatch.setenv("NEXUS_MODELS_ROOT", str(tmp_path))
        monkeypatch.setattr(engines, "_PIPELINE", None)
        request(runtime, 1, "speak.stream", {"jobId": "j1", "text": "Hello."})
        wait_for(lambda: response(out, 1) is not None)
        assert "TTS weights are not installed" in response(out, 1)["error"]["message"]


class TestStreaming:
    def test_segments_arrive_in_order_then_one_terminal_message(
        self, monkeypatch, out, runtime
    ):
        fake_segments(monkeypatch, 3)
        request(runtime, 1, "speak.stream", {"jobId": "j1", "text": "One. Two. Three."})
        wait_for(lambda: response(out, 1) is not None)
        msgs = out.messages()
        segs = [m for m in msgs if m.get("method") == "speak.segment"]
        assert [s["params"]["seq"] for s in segs] == [0, 1, 2]
        assert all(s["params"]["jobId"] == "j1" for s in segs)
        assert response(out, 1)["result"] == {
            "jobId": "j1",
            "status": "completed",
            "segments": 3,
        }
        assert msgs.index(response(out, 1)) == len(msgs) - 1
        assert sum(1 for m in msgs if m.get("id") == 1) == 1

    def test_cancel_stops_between_segments(self, monkeypatch, out, runtime):
        fake_segments(monkeypatch, 50, delay=0.02)
        request(runtime, 1, "speak.stream", {"jobId": "j1", "text": "Long reply."})
        wait_for(
            lambda: any(m.get("method") == "speak.segment" for m in out.messages())
        )
        request(runtime, 2, "speak.cancel", {"jobId": "j1"})
        wait_for(lambda: response(out, 1) is not None)
        assert response(out, 2)["result"] == {"ok": True}
        assert response(out, 1)["result"]["status"] == "cancelled"
        assert response(out, 1)["result"]["segments"] < 50

    def test_cancel_answers_identically_for_unknown_and_malformed_ids(
        self, out, runtime
    ):
        request(runtime, 1, "speak.cancel", {"jobId": "never-existed"})
        request(runtime, 2, "speak.cancel", {})
        wait_for(lambda: response(out, 2) is not None)
        assert response(out, 1)["result"] == response(out, 2)["result"] == {"ok": True}

    def test_a_new_stream_cancels_the_active_one(self, monkeypatch, out, runtime):
        gate = threading.Event()
        fake_segments(monkeypatch, 20, gate=gate)
        request(runtime, 1, "speak.stream", {"jobId": "a", "text": "First."})
        request(runtime, 2, "speak.stream", {"jobId": "b", "text": "Second."})
        gate.set()
        wait_for(lambda: response(out, 2) is not None)
        assert response(out, 1)["result"]["status"] == "cancelled"
        assert response(out, 2)["result"]["status"] == "completed"

    def test_stream_requires_a_job_id(self, out, runtime):
        request(runtime, 1, "speak.stream", {"text": "Hello."})
        wait_for(lambda: response(out, 1) is not None)
        assert response(out, 1)["error"]["code"] == main.INVALID_PARAMS

    def test_transcribe_is_served_during_an_active_stream(
        self, monkeypatch, out, runtime
    ):
        gate = threading.Event()
        fake_segments(monkeypatch, 5, gate=gate)
        monkeypatch.setattr(engines, "transcribe", lambda _p: {"transcript": "heard"})
        request(runtime, 1, "speak.stream", {"jobId": "j1", "text": "Reply."})
        request(runtime, 2, "transcribe", {"audioBase64": "AAAA"})
        wait_for(lambda: response(out, 2) is not None)
        assert response(out, 1) is None, "stream must still be running"
        assert response(out, 2)["result"] == {"transcript": "heard"}
        gate.set()
        wait_for(lambda: response(out, 1) is not None)

    def test_health_answers_while_synthesis_is_busy(self, monkeypatch, out, runtime):
        gate = threading.Event()
        fake_segments(monkeypatch, 2, gate=gate)
        request(runtime, 1, "speak.stream", {"jobId": "j1", "text": "Reply."})
        request(runtime, 2, "health")
        wait_for(lambda: response(out, 2) is not None)
        assert response(out, 1) is None
        gate.set()
        wait_for(lambda: response(out, 1) is not None)

    def test_one_shot_speak_still_returns_one_wav(self, monkeypatch, out, runtime):
        fake_segments(monkeypatch, 2)
        request(runtime, 1, "speak", {"text": "Hello."})
        wait_for(lambda: response(out, 1) is not None)
        assert response(out, 1)["result"]["mimeType"] == "audio/wav"

    def test_output_lines_stay_whole_under_concurrency(self, out):
        threads = [
            threading.Thread(
                target=main._notify, args=("x", {"n": i, "pad": "y" * 5000})
            )
            for i in range(40)
        ]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        assert sorted(m["params"]["n"] for m in out.messages()) == list(range(40))


class TestBounds:
    def test_text_over_the_cap_is_rejected_before_synthesis(self, monkeypatch):
        called = []
        monkeypatch.delenv("NEXUS_AUDIO_STUB", raising=False)
        monkeypatch.setattr(
            engines, "_pcm_segments", lambda _t: called.append(1) or iter(())
        )
        with pytest.raises(engines.SpeakLimitError, match="8000"):
            list(
                engines.iter_speak_segments(
                    {"text": "a" * (engines.MAX_SPEAK_CHARS + 1)}
                )
            )
        with pytest.raises(engines.SpeakLimitError):
            engines.speak({"text": "a" * (engines.MAX_SPEAK_CHARS + 1)})
        assert called == []

    def test_empty_text_is_rejected(self):
        with pytest.raises(ValueError, match="text is required"):
            list(engines.iter_speak_segments({"text": "   "}))

    def test_segment_count_cap(self, monkeypatch):
        fake_segments(monkeypatch, engines.MAX_SEGMENTS_PER_JOB + 1)
        with pytest.raises(engines.SpeakLimitError, match="segments"):
            list(engines.iter_speak_segments({"text": "x"}))

    def test_segment_byte_cap(self, monkeypatch):
        big = b"\x00" * (engines.MAX_SEGMENT_BASE64_BYTES)
        fake_segments(monkeypatch, 1, pcm=big)
        with pytest.raises(engines.SpeakLimitError, match="per-segment"):
            list(engines.iter_speak_segments({"text": "x"}))

    def test_job_byte_cap(self, monkeypatch):
        monkeypatch.setattr(engines, "MAX_JOB_BASE64_BYTES", 100)
        fake_segments(monkeypatch, 3, pcm=b"\x00" * 40)
        with pytest.raises(engines.SpeakLimitError, match="per-job"):
            list(engines.iter_speak_segments({"text": "x"}))

    def test_segment_timeout(self, monkeypatch):
        fake_segments(monkeypatch, 2)
        ticks = iter([0.0, engines.SEGMENT_TIMEOUT_S + 1])
        with pytest.raises(engines.SpeakLimitError, match="exceeded"):
            list(engines.iter_speak_segments({"text": "x"}, clock=lambda: next(ticks)))
