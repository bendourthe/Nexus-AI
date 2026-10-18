"""v2.14.0 T005 -- a lane can load a native module while requests are read.

On Windows, a main thread blocked reading the stdin pipe stalled a worker's
first numpy import (DLL start-up queries the standard input handle), so the
streaming runtime hung on its first `speak.stream`. `_request_stream` reads
from a duplicate of the pipe and points standard input at the null device.
"""

from __future__ import annotations

import subprocess
import sys
import textwrap
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[3]

CHILD = textwrap.dedent(
    """
    import sys, threading
    from runtimes.audio import main

    def load():
        import numpy  # first import of a native module, on a worker thread
        sys.stdout.write("imported\\n")
        sys.stdout.flush()

    stream = main._request_stream()
    threading.Thread(target=load, daemon=True).start()
    for line in stream:
        pass
    """
)


@pytest.mark.skipif(
    sys.platform != "win32", reason="the stall is specific to Windows pipes"
)
def test_worker_imports_numpy_while_requests_are_read_from_the_pipe():
    pytest.importorskip("numpy")
    child = subprocess.Popen(
        [sys.executable, "-c", CHILD],
        cwd=ROOT,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        text=True,
    )
    try:
        # stdin stays open, so the reader is blocked for the whole wait.
        line = _read_line_with_timeout(child, 30.0)
        assert line == "imported"
    finally:
        child.kill()
        child.wait(10)


def _read_line_with_timeout(child: subprocess.Popen, timeout: float) -> str:
    import threading

    result: list[str] = []
    reader = threading.Thread(
        target=lambda: result.append(child.stdout.readline().strip()), daemon=True
    )
    reader.start()
    reader.join(timeout)
    if not result:
        raise AssertionError("worker import stalled behind the stdin reader")
    return result[0]
