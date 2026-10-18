"""
v2.0.0 Phase 1 -- Python STT/TTS runtime entry point.

Line-delimited JSON-RPC 2.0 over stdin/stdout, matching `runtimes/ocr/main.py`.
`health` and `version` never import faster-whisper or Kokoro.

v2.14.0 T005 -- the runtime no longer blocks on one request at a time. A stdin
reader answers `health`, `version` and `speak.cancel` at once and hands work to
two lanes: a synthesis worker (`speak`, `speak.stream`) and a transcription
worker (`transcribe`), so a transcription is served while a reply is being
spoken. `speak.stream` emits one `speak.segment` notification per Kokoro
segment and then exactly one terminal response (completed or cancelled) or an
error. A new `speak` or `speak.stream` cancels the active and queued synthesis
jobs: one stream per runtime. Writes to stdout are serialized.
"""

from __future__ import annotations

import json
import queue
import sys
import threading
import traceback
from dataclasses import dataclass, field
from typing import Any, Callable, Optional

from . import engines, version

JsonRpcParams = Optional[dict]
JsonRpcResult = dict[str, Any]
HandlerFn = Callable[[JsonRpcParams], JsonRpcResult]

PARSE_ERROR = -32700
INVALID_REQUEST = -32600
METHOD_NOT_FOUND = -32601
INVALID_PARAMS = -32602
INTERNAL_ERROR = -32603

MAX_JOB_ID_CHARS = 128

_STDOUT_LOCK = threading.Lock()


def _emit(payload: dict[str, Any]) -> None:
    with _STDOUT_LOCK:
        sys.stdout.write(json.dumps(payload) + "\n")
        sys.stdout.flush()


def _ok(req_id: Any, result: JsonRpcResult) -> None:
    _emit({"jsonrpc": "2.0", "id": req_id, "result": result})


def _err(req_id: Any, code: int, message: str) -> None:
    _emit({"jsonrpc": "2.0", "id": req_id, "error": {"code": code, "message": message}})


def _notify(method: str, params: dict[str, Any]) -> None:
    """Emit a JSON-RPC notification (no `id`, so no response is expected)."""
    _emit({"jsonrpc": "2.0", "method": method, "params": params})


def _handle_health(_params: JsonRpcParams) -> JsonRpcResult:
    return engines.health()


def _handle_version(_params: JsonRpcParams) -> JsonRpcResult:
    return {
        "name": "nexus-audio-runtime",
        "version": version.RUNTIME_VERSION,
        "protocol": version.PROTOCOL_VERSION,
    }


def _handle_transcribe(params: JsonRpcParams) -> JsonRpcResult:
    return engines.transcribe(params)


def _handle_speak(params: JsonRpcParams) -> JsonRpcResult:
    return engines.speak(params)


def build_handlers() -> dict[str, HandlerFn]:
    """Synchronous handlers. `speak.stream` and `speak.cancel` need the lanes
    of a running `AudioRuntime` and are routed there, not through this map."""
    return {
        "health": _handle_health,
        "version": _handle_version,
        "transcribe": _handle_transcribe,
        "speak": _handle_speak,
    }


def _parse(line: str) -> tuple[Any, str, JsonRpcParams] | None:
    """Parse one request line, answering malformed ones. None when answered."""
    try:
        request = json.loads(line)
    except json.JSONDecodeError:
        _err(None, PARSE_ERROR, "parse error")
        return None
    if not isinstance(request, dict):
        _err(None, INVALID_REQUEST, "request must be an object")
        return None
    method = request.get("method")
    req_id = request.get("id")
    params = request.get("params")
    if not isinstance(method, str):
        _err(req_id, INVALID_REQUEST, "method must be a string")
        return None
    if params is not None and not isinstance(params, dict):
        _err(req_id, INVALID_REQUEST, "params must be an object")
        return None
    return req_id, method, params


def _call(req_id: Any, handler: HandlerFn, params: JsonRpcParams) -> None:
    try:
        result = handler(params)
    except Exception as exc:  # noqa: BLE001 -- surface engine errors on the wire
        _err(req_id, INTERNAL_ERROR, str(exc) or traceback.format_exc())
        return
    _ok(req_id, result)


def dispatch(line: str, handlers: dict[str, HandlerFn]) -> None:
    """Answer one request synchronously (kept for callers and tests)."""
    parsed = _parse(line)
    if parsed is None:
        return
    req_id, method, params = parsed
    handler = handlers.get(method)
    if handler is None:
        _err(req_id, METHOD_NOT_FOUND, f"unknown method: {method}")
        return
    _call(req_id, handler, params)


def _job_id(params: JsonRpcParams) -> str | None:
    value = (params or {}).get("jobId")
    if isinstance(value, str) and 0 < len(value) <= MAX_JOB_ID_CHARS:
        return value
    return None


@dataclass
class SynthesisJob:
    req_id: Any
    method: str
    params: JsonRpcParams
    job_id: str | None
    cancel: threading.Event = field(default_factory=threading.Event)


class SynthesisLane:
    """One synthesis worker. Every new job pre-empts the active and queued ones."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._pending: list[SynthesisJob] = []
        self._active: SynthesisJob | None = None
        self._wake = threading.Condition(self._lock)
        self._closed = False
        self._thread = threading.Thread(
            target=self._run, name="audio-synthesis", daemon=True
        )
        self._thread.start()

    def submit(self, job: SynthesisJob) -> None:
        with self._lock:
            if self._active is not None:
                self._active.cancel.set()
            for queued in self._pending:
                queued.cancel.set()
            self._pending.append(job)
            self._wake.notify()

    def cancel(self, job_id: str) -> None:
        """Set the cancel flag of a matching job. Unknown ids are a no-op."""
        with self._lock:
            for job in [self._active, *self._pending]:
                if job is not None and job.job_id == job_id:
                    job.cancel.set()

    def close(self, timeout: float = 5.0) -> None:
        with self._lock:
            self._closed = True
            for job in [self._active, *self._pending]:
                if job is not None:
                    job.cancel.set()
            self._wake.notify()
        self._thread.join(timeout)

    def _next(self) -> SynthesisJob | None:
        with self._lock:
            while not self._pending and not self._closed:
                self._wake.wait()
            if not self._pending:
                return None
            self._active = self._pending.pop(0)
            return self._active

    def _run(self) -> None:
        while True:
            job = self._next()
            if job is None:
                return
            try:
                self._serve(job)
            finally:
                with self._lock:
                    self._active = None

    @staticmethod
    def _serve(job: SynthesisJob) -> None:
        if job.method == "speak":
            if job.cancel.is_set():
                _err(job.req_id, INTERNAL_ERROR, "speak cancelled by a newer request")
                return
            _call(job.req_id, _handle_speak, job.params)
            return
        segments = 0
        try:
            for audio in engines.iter_speak_segments(job.params, job.cancel.is_set):
                _notify(
                    "speak.segment",
                    {
                        "jobId": job.job_id,
                        "seq": segments,
                        "audioBase64": audio,
                        "mimeType": "audio/wav",
                    },
                )
                segments += 1
        except Exception as exc:  # noqa: BLE001 -- the terminal error message
            _err(job.req_id, INTERNAL_ERROR, str(exc) or traceback.format_exc())
            return
        status = "cancelled" if job.cancel.is_set() else "completed"
        _ok(job.req_id, {"jobId": job.job_id, "status": status, "segments": segments})


class TranscriptionLane:
    """Serves `transcribe` on its own thread so it never waits on synthesis."""

    def __init__(self) -> None:
        self._queue: queue.Queue[tuple[Any, JsonRpcParams] | None] = queue.Queue()
        self._thread = threading.Thread(
            target=self._run, name="audio-transcription", daemon=True
        )
        self._thread.start()

    def submit(self, req_id: Any, params: JsonRpcParams) -> None:
        self._queue.put((req_id, params))

    def close(self, timeout: float = 30.0) -> None:
        self._queue.put(None)
        self._thread.join(timeout)

    def _run(self) -> None:
        while True:
            item = self._queue.get()
            if item is None:
                return
            _call(item[0], _handle_transcribe, item[1])


class AudioRuntime:
    """Routes parsed requests to the inline handlers or a lane."""

    def __init__(self) -> None:
        self.synthesis = SynthesisLane()
        self.transcription = TranscriptionLane()

    def route(self, line: str) -> None:
        parsed = _parse(line)
        if parsed is None:
            return
        req_id, method, params = parsed
        if method == "health":
            _call(req_id, _handle_health, params)
        elif method == "version":
            _call(req_id, _handle_version, params)
        elif method == "transcribe":
            self.transcription.submit(req_id, params)
        elif method == "speak":
            self.synthesis.submit(SynthesisJob(req_id, method, params, None))
        elif method == "speak.stream":
            job_id = _job_id(params)
            if job_id is None:
                _err(req_id, INVALID_PARAMS, "jobId must be a non-empty string")
                return
            self.synthesis.submit(SynthesisJob(req_id, method, params, job_id))
        elif method == "speak.cancel":
            job_id = _job_id(params)
            if job_id is not None:
                self.synthesis.cancel(job_id)
            # The same answer for unknown, finished and foreign ids.
            _ok(req_id, {"ok": True})
        else:
            _err(req_id, METHOD_NOT_FOUND, f"unknown method: {method}")

    def close(self) -> None:
        self.synthesis.close()
        self.transcription.close()


def _request_stream() -> Any:
    """The stream requests are read from.

    On Windows a thread blocked in a synchronous read of the stdin pipe stalls
    every other call on that pipe, including the `GetFileType` a native DLL's
    runtime start-up makes on the standard input handle. A lane loading numpy,
    torch or CTranslate2's cuBLAS while the reader waits then hangs for good.
    Read requests from a duplicate of the pipe and point standard input at the
    null device, so DLL start-up never touches the pipe. Elsewhere, stdin.
    """
    if sys.platform != "win32":
        return sys.stdin
    import os

    reader = os.fdopen(os.dup(sys.stdin.fileno()), "r", encoding="utf-8", errors="replace")
    null = os.open(os.devnull, os.O_RDONLY)
    os.dup2(null, 0)
    os.close(null)
    return reader


def main() -> None:
    requests = _request_stream()
    runtime = AudioRuntime()
    try:
        for line in requests:
            text = line.strip()
            if text:
                runtime.route(text)
    finally:
        runtime.close()


if __name__ == "__main__":
    main()
