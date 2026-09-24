"""Make the Desktop / Start Menu shortcut choices real (v2.4.11).

Operator report: "I keep deselecting 'Create desktop shortcut', yet the
installer still creates one no matter what. Meanwhile, Add to Startup is
enabled, but nothing is added to my start menu."

Both observations had the same cause: nothing read those two checkboxes. The
wizard stored `add_desktop_shortcut` / `add_start_menu_shortcut` on the state
and no step ever consumed them, so what appeared on the machine was whatever
the embedded desktop-app installer happened to do on its own -- a Desktop icon
the user had just declined, and no Start Menu entry they had asked for.

So the wizard reconciles both after the desktop app lands: it creates the
shortcuts that were asked for and removes the ones that were not, whoever put
them there. Reconciling (rather than only creating) is the point -- a checkbox
that cannot UNDO what another installer did is not a choice.

Windows only. The macOS bundle lives in /Applications and Linux desktop entries
are written by their own packaging; neither has an equivalent to undo.
"""

from __future__ import annotations

import os
import sys
from collections.abc import Callable
from dataclasses import dataclass
from typing import TYPE_CHECKING

from nexus_installer.engine.platform_utils import run_command

if TYPE_CHECKING:
    from nexus_installer.installer_state import InstallerState

#: Shortcut file name, matching the desktop app's product name.
SHORTCUT_NAME = "Nexus AI Studio.lnk"


@dataclass(frozen=True)
class ShortcutPlan:
    """One shortcut location and whether the user asked for it."""

    label: str
    path: str
    wanted: bool


def _shell_folder(name: str) -> str | None:
    """The real path of a Windows shell folder, or None when unreadable.

    Asking the registry rather than assuming `~/Desktop` matters: a Desktop
    redirected into OneDrive (the default on many machines) lives somewhere
    else entirely, and NSIS writes its icon to the redirected one. Guessing
    would mean an unticked icon we "removed" was never the icon the user sees.
    """
    try:
        import winreg  # noqa: PLC0415 - Windows-only, imported where used
    except ImportError:
        return None
    try:
        with winreg.OpenKey(
            winreg.HKEY_CURRENT_USER,
            r"Software\Microsoft\Windows\CurrentVersion\Explorer\Shell Folders",
        ) as key:
            value, _kind = winreg.QueryValueEx(key, name)
    except OSError:
        return None
    return str(value) if value else None


def desktop_dir() -> str:
    """The user's Desktop folder, honoring a redirected one."""
    return _shell_folder("Desktop") or os.path.join(os.path.expanduser("~"), "Desktop")


def start_menu_dir() -> str:
    """The user's Start Menu Programs folder, honoring a redirected one."""
    resolved = _shell_folder("Programs")
    if resolved:
        return resolved
    appdata = os.environ.get("APPDATA") or os.path.join(
        os.path.expanduser("~"), "AppData", "Roaming"
    )
    return os.path.join(appdata, "Microsoft", "Windows", "Start Menu", "Programs")


def shortcut_names(desktop_exe_path: str) -> list[str]:
    """Every .lnk name this product may have been installed under.

    The desktop app's setup program names its icon after the product, so the
    binary's own name is the authority; the constant stays as a fallback for
    the paths where the binary is not known yet.
    """
    names = [SHORTCUT_NAME]
    stem = os.path.splitext(os.path.basename(desktop_exe_path or ""))[0]
    if stem:
        candidate = f"{stem}.lnk"
        if candidate not in names:
            names.insert(0, candidate)
    return names


def plan_shortcuts(state: InstallerState) -> list[ShortcutPlan]:
    """What the two checkboxes mean, as concrete paths."""
    names = shortcut_names(state.desktop_exe_path or "")
    return [
        ShortcutPlan(
            "Desktop",
            os.path.join(desktop_dir(), names[0]),
            bool(state.add_desktop_shortcut),
        ),
        ShortcutPlan(
            "Start Menu",
            os.path.join(start_menu_dir(), names[0]),
            bool(state.add_start_menu_shortcut),
        ),
    ]


def _create_script(path: str, target: str) -> str:
    """PowerShell that writes one .lnk through the shell COM object.

    A .lnk is a COM-authored binary, and the installer ships no pywin32, so
    the shell's own WScript.Shell writes it -- the same object Explorer uses.
    """
    working = os.path.dirname(target)
    return (
        "$s = New-Object -ComObject WScript.Shell; "
        f"$l = $s.CreateShortcut('{path}'); "
        f"$l.TargetPath = '{target}'; "
        f"$l.WorkingDirectory = '{working}'; "
        f"$l.IconLocation = '{target},0'; "
        "$l.Save()"
    )


def create_shortcut(
    path: str,
    target: str,
    *,
    runner: Callable[[list[str]], tuple[int, str, str]] | None = None,
) -> bool:
    """Write a .lnk at `path` pointing at `target`. True when it lands."""
    if not target:
        return False
    os.makedirs(os.path.dirname(path), exist_ok=True)
    invoke = runner or (lambda cmd: run_command(cmd, timeout=60))
    code, _, _ = invoke(
        [
            "powershell",
            "-NoProfile",
            "-NonInteractive",
            "-Command",
            _create_script(path, target),
        ]
    )
    return code == 0


def remove_shortcut(path: str) -> bool:
    """Delete a .lnk. True when it is gone (including when it never existed)."""
    try:
        os.remove(path)
        return True
    except FileNotFoundError:
        return True
    except OSError:
        return False


def reconcile_shortcuts(
    state: InstallerState,
    log: Callable[[str, str], None],
    *,
    runner: Callable[[list[str]], tuple[int, str, str]] | None = None,
    platform: str | None = None,
) -> None:
    """Bring Desktop / Start Menu into line with what the user ticked.

    Best-effort and never fatal: a shortcut is a convenience, and failing the
    whole install over one would be a worse outcome than the missing icon.
    """
    if (platform or sys.platform) != "win32":
        return
    target = state.desktop_exe_path or ""
    if not target:
        log("No desktop binary to point a shortcut at; skipping shortcuts.", "info")
        return
    names = shortcut_names(target)
    for plan in plan_shortcuts(state):
        folder = os.path.dirname(plan.path)
        # Every name this product may be installed under, so an icon written
        # under the OTHER name is still the icon this choice governs.
        present = [
            os.path.join(folder, name)
            for name in names
            if os.path.exists(os.path.join(folder, name))
        ]
        if plan.wanted and not present:
            if create_shortcut(plan.path, target, runner=runner):
                log(f"{plan.label} shortcut created.", "success")
            else:
                log(f"Could not create the {plan.label} shortcut.", "warning")
        elif not plan.wanted and present:
            # The desktop app's own setup program may have created these.
            if all(remove_shortcut(path) for path in present):
                log(f"{plan.label} shortcut removed (you unticked it).", "info")
            else:
                log(f"Could not remove the {plan.label} shortcut.", "warning")
