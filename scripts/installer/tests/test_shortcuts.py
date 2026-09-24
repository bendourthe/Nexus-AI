"""The Desktop / Start Menu checkboxes actually decide what lands (v2.4.11).

Operator report: "I keep deselecting 'Create desktop shortcut', yet the
installer still creates one no matter what. Meanwhile, Add to Startup is
enabled, but nothing is added to my start menu." Nothing read either flag, so
the machine got whatever the embedded desktop-app setup program did on its own.
"""

from __future__ import annotations

import os
from pathlib import Path

from nexus_installer.engine import shortcuts
from nexus_installer.installer_state import InstallerState


class _Runner:
    """Stands in for PowerShell: records the call, writes the .lnk."""

    def __init__(self, exit_code: int = 0) -> None:
        self.calls: list[list[str]] = []
        self.exit_code = exit_code

    def __call__(self, cmd: list[str]) -> tuple[int, str, str]:
        self.calls.append(cmd)
        if self.exit_code == 0:
            # The real WScript.Shell writes the file; mirror that so the
            # reconcile loop sees the same world a real run would.
            target = cmd[-1].split("CreateShortcut('")[1].split("')")[0]
            Path(target).write_bytes(b"lnk")
        return (self.exit_code, "", "")


def _state(tmp_path: Path, *, desktop: bool, start_menu: bool) -> InstallerState:
    exe = tmp_path / "Nexus AI Studio.exe"
    exe.write_bytes(b"exe")
    return InstallerState(
        desktop_exe_path=str(exe),
        add_desktop_shortcut=desktop,
        add_start_menu_shortcut=start_menu,
    )


def _redirect(monkeypatch, tmp_path: Path) -> tuple[Path, Path]:
    desktop = tmp_path / "Desktop"
    start_menu = tmp_path / "StartMenu" / "Programs"
    desktop.mkdir(parents=True)
    start_menu.mkdir(parents=True)
    monkeypatch.setattr(shortcuts, "desktop_dir", lambda: str(desktop))
    monkeypatch.setattr(shortcuts, "start_menu_dir", lambda: str(start_menu))
    return desktop, start_menu


def test_creates_only_what_was_ticked(monkeypatch, tmp_path: Path) -> None:
    desktop, start_menu = _redirect(monkeypatch, tmp_path)
    runner = _Runner()
    state = _state(tmp_path, desktop=False, start_menu=True)

    shortcuts.reconcile_shortcuts(
        state, lambda *_a: None, runner=runner, platform="win32"
    )

    assert (start_menu / shortcuts.SHORTCUT_NAME).exists()
    assert not (desktop / shortcuts.SHORTCUT_NAME).exists()
    assert len(runner.calls) == 1


def test_removes_a_desktop_icon_the_user_unticked(monkeypatch, tmp_path: Path) -> None:
    """The desktop app's own setup program drops one; the choice must undo it."""
    desktop, _ = _redirect(monkeypatch, tmp_path)
    stray = desktop / shortcuts.SHORTCUT_NAME
    stray.write_bytes(b"lnk")
    state = _state(tmp_path, desktop=False, start_menu=False)

    shortcuts.reconcile_shortcuts(
        state, lambda *_a: None, runner=_Runner(), platform="win32"
    )

    assert not stray.exists()


def test_keeps_an_existing_shortcut_that_was_ticked(
    monkeypatch, tmp_path: Path
) -> None:
    desktop, _ = _redirect(monkeypatch, tmp_path)
    existing = desktop / shortcuts.SHORTCUT_NAME
    existing.write_bytes(b"original")
    runner = _Runner()
    state = _state(tmp_path, desktop=True, start_menu=False)

    shortcuts.reconcile_shortcuts(
        state, lambda *_a: None, runner=runner, platform="win32"
    )

    # Already there: no rewrite, no second icon.
    assert existing.read_bytes() == b"original"
    assert runner.calls == []


def test_removes_an_icon_written_under_the_product_binary_name(
    monkeypatch, tmp_path: Path
) -> None:
    """NSIS names its icon after the product; detection must use that name."""
    desktop, _ = _redirect(monkeypatch, tmp_path)
    state = _state(tmp_path, desktop=False, start_menu=False)
    stem = Path(state.desktop_exe_path).stem
    stray = desktop / f"{stem}.lnk"
    stray.write_bytes(b"lnk")

    shortcuts.reconcile_shortcuts(
        state, lambda *_a: None, runner=_Runner(), platform="win32"
    )

    assert not stray.exists()


def test_shortcut_names_lead_with_the_binary_name() -> None:
    names = shortcuts.shortcut_names(os.path.join("C:", "apps", "Nexus AI Studio.exe"))
    assert names[0] == "Nexus AI Studio.lnk"
    assert shortcuts.SHORTCUT_NAME in names


def test_reports_but_does_not_raise_when_the_shell_fails(
    monkeypatch, tmp_path: Path
) -> None:
    _redirect(monkeypatch, tmp_path)
    messages: list[tuple[str, str]] = []
    state = _state(tmp_path, desktop=True, start_menu=False)

    shortcuts.reconcile_shortcuts(
        state,
        lambda text, level: messages.append((text, level)),
        runner=_Runner(exit_code=1),
        platform="win32",
    )

    assert any(level == "warning" for _text, level in messages)


def test_skips_without_a_desktop_binary(monkeypatch, tmp_path: Path) -> None:
    desktop, _ = _redirect(monkeypatch, tmp_path)
    state = InstallerState(add_desktop_shortcut=True)

    shortcuts.reconcile_shortcuts(
        state, lambda *_a: None, runner=_Runner(), platform="win32"
    )

    assert not (desktop / shortcuts.SHORTCUT_NAME).exists()


def test_is_a_no_op_off_windows(monkeypatch, tmp_path: Path) -> None:
    desktop, _ = _redirect(monkeypatch, tmp_path)
    state = _state(tmp_path, desktop=True, start_menu=True)

    shortcuts.reconcile_shortcuts(
        state, lambda *_a: None, runner=_Runner(), platform="darwin"
    )

    assert not (desktop / shortcuts.SHORTCUT_NAME).exists()


def test_start_menu_dir_follows_appdata(monkeypatch) -> None:
    monkeypatch.setenv(
        "APPDATA", os.path.join("C:", "Users", "x", "AppData", "Roaming")
    )
    assert shortcuts.start_menu_dir().endswith(
        os.path.join("Microsoft", "Windows", "Start Menu", "Programs")
    )
