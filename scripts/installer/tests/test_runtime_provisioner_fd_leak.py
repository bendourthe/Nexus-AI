"""v2.4.9 BG-21 regression -- `provision_node` must not leak the mkstemp fd.

`provision_node` created its download scratch file with
`Path(tempfile.mkstemp(...)[1])`, taking only the path and discarding the
file descriptor. On Windows that leaves an OS handle open for the life of
the process, so the `finally: tmp.unlink(...)` raises
`PermissionError: [WinError 32] The process cannot access the file because
it is being used by another process`, which propagates out of the
provisioner and fails the whole "Wiring Desktop Runtime" step. POSIX permits
unlinking an open file, which is why this broke only Windows installs and
why the Linux smoke test stayed green while Windows went red.

The test is platform-independent on purpose: it asserts the descriptor is
closed rather than asserting a Windows-specific error, so it fails against
pre-change code on every OS instead of only on the one that breaks.
"""

from __future__ import annotations

import os
import tempfile
from pathlib import Path
from unittest.mock import MagicMock

import pytest

from nexus_installer.engine import runtime_provisioner as rp


@pytest.fixture()
def log() -> MagicMock:
    return MagicMock()


def test_provision_node_closes_the_mkstemp_descriptor(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, log: MagicMock
) -> None:
    """Every descriptor mkstemp hands out must be closed before the sweep."""
    root = tmp_path / "runtime"
    monkeypatch.setattr(rp, "runtime_root", lambda: root)
    monkeypatch.setattr(rp, "_node_download_key", lambda: "win-x64")
    monkeypatch.setattr(
        rp,
        "NODE_DOWNLOADS",
        {"win-x64": {"url": "https://example.invalid/node.zip", "sha256": "ab" * 32}},
    )

    opened: list[int] = []
    real_mkstemp = tempfile.mkstemp

    def tracking_mkstemp(*args: object, **kwargs: object):
        fd, path = real_mkstemp(*args, **kwargs)
        opened.append(fd)
        return fd, path

    monkeypatch.setattr(rp.tempfile, "mkstemp", tracking_mkstemp)

    # Fail the download immediately: the descriptor is created before any
    # network work, so this exercises the leak without touching the network.
    class _Boom:
        def __enter__(self):
            raise OSError("no network in tests")

        def __exit__(self, *exc: object) -> None:
            return None

    monkeypatch.setattr(rp.httpx, "stream", lambda *a, **k: _Boom())

    assert rp.provision_node(None, log) is None
    assert opened, "provision_node did not create a scratch file via mkstemp"

    for fd in opened:
        with pytest.raises(OSError):
            # A closed descriptor raises EBADF. If this does NOT raise, the
            # descriptor is still open and Windows will refuse to unlink the
            # file underneath it.
            os.fstat(fd)


def test_provision_node_removes_its_scratch_file(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, log: MagicMock
) -> None:
    """The scratch file is gone afterwards, not merely unlinked-in-intent."""
    root = tmp_path / "runtime"
    monkeypatch.setattr(rp, "runtime_root", lambda: root)
    monkeypatch.setattr(rp, "_node_download_key", lambda: "win-x64")
    monkeypatch.setattr(
        rp,
        "NODE_DOWNLOADS",
        {"win-x64": {"url": "https://example.invalid/node.zip", "sha256": "ab" * 32}},
    )

    created: list[Path] = []
    real_mkstemp = tempfile.mkstemp

    def tracking_mkstemp(*args: object, **kwargs: object):
        fd, path = real_mkstemp(*args, **kwargs)
        created.append(Path(path))
        return fd, path

    monkeypatch.setattr(rp.tempfile, "mkstemp", tracking_mkstemp)

    class _Boom:
        def __enter__(self):
            raise OSError("no network in tests")

        def __exit__(self, *exc: object) -> None:
            return None

    monkeypatch.setattr(rp.httpx, "stream", lambda *a, **k: _Boom())

    assert rp.provision_node(None, log) is None
    assert created, "no scratch file was created"
    for path in created:
        assert not path.exists(), f"scratch file survived the finally: {path}"
