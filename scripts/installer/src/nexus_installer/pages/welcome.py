"""Welcome page: compact hero, prerequisites cards, and the configuration panel.

The former Setup and Configuration steps are folded in here: the prerequisite
cards (VS Code, Python, disk, Ollama, GPU) sit under the hero, and the
configuration cards (install path + Ollama URL, features) follow, so every
machine-level choice is made on one page before the model selection.
"""

from __future__ import annotations

from collections.abc import Callable
from typing import TYPE_CHECKING, Any

from PyQt5.QtCore import Qt
from PyQt5.QtWidgets import QLabel, QVBoxLayout, QWidget

from nexus_installer.constants import (
    ACCENT_CHAT,
    ACCENT_CODING,
    ACCENT_IMAGE,
    ACCENT_VIDEO,
    FS_H1,
)
from nexus_installer.pages.configuration import ConfigurationPage
from nexus_installer.pages.prerequisites import PrerequisitesPage
from nexus_installer.widgets.gradient_wordmark import GradientWordmark
from nexus_installer.widgets.page_intro import CapabilityGrid, PageLede, PageNote

if TYPE_CHECKING:
    from nexus_installer.installer_state import InstallerState

# (name, one-line description, module accent) -- the desktop app's four
# pillars. The former version was a bare chip row that named the pillars
# without saying what any of them do.
_PILLARS: tuple[tuple[str, str, str], ...] = (
    (
        "Chat",
        "Talk to local language models, with your documents as context.",
        ACCENT_CHAT,
    ),
    (
        "Agentic Coding",
        "An agent that reads, writes and runs your code, in the app or in VS Code.",
        ACCENT_CODING,
    ),
    (
        "Image",
        "Generate and edit images from a prompt on your own GPU.",
        ACCENT_IMAGE,
    ),
    (
        "Video",
        "Turn prompts or stills into short video clips, then upscale them.",
        ACCENT_VIDEO,
    ),
)


class WelcomePage(QWidget):
    """First wizard page: intro, live prerequisite checks, configuration."""

    def __init__(
        self,
        state: InstallerState,
        parent: QWidget | None = None,
        *,
        detect_fn: Callable[..., Any] | None = None,
        inspect_fn: Callable[..., Any] | None = None,
        list_fn: Callable[..., Any] | None = None,
    ) -> None:
        super().__init__(parent)
        self._state = state

        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(10)

        # Hero title at page-title scale (the display size made the hero alone
        # fill the first screen).
        title = GradientWordmark(
            "Welcome to Nexus",
            " AI Studio",
            FS_H1,
            align=Qt.AlignmentFlag.AlignLeft,
        )
        layout.addWidget(title)

        # One claim, at a size someone actually reads.
        layout.addWidget(
            PageLede(
                "Your fully local AI workstation. Every model runs on your own "
                "hardware, and nothing you type or generate leaves this machine."
            )
        )

        # What the app does, as four accent-coded cards rather than a
        # paragraph the reader has to unpack.
        layout.addWidget(CapabilityGrid(_PILLARS))

        layout.addWidget(
            PageNote(
                "This wizard installs all of it for you -- the runtime, the models "
                "you pick, the VS Code extension, and the Nexus desktop app -- with "
                "no terminal required. How long it takes depends on your connection "
                "and the models you select."
            )
        )

        # The machine checks, including GPU detection, directly under the hero.
        self._prereq = PrerequisitesPage(state)
        layout.addWidget(self._prereq)

        # Configuration: install path + Ollama URL, and the optional features.
        config_head = QLabel("Configuration")
        config_head.setObjectName("cardHead")
        layout.addWidget(config_head)
        self._config = ConfigurationPage(
            state, detect_fn=detect_fn, inspect_fn=inspect_fn, list_fn=list_fn
        )
        layout.addWidget(self._config)
        # Unsloth's compatibility lock depends on the GPU probe that runs on
        # this very page, so re-evaluate it the moment the probe finishes.
        self._prereq.gpu_detected.connect(self._config.refresh_host)

        layout.addStretch()

    def set_interactive(self, enabled: bool) -> None:
        """Lock the configuration choices once installation has started."""
        self._config.set_interactive(enabled)

    def validate(self) -> tuple[bool, str]:
        """Next requires the prerequisites and a usable install path."""
        ok, msg = self._prereq.validate()
        if not ok:
            return ok, msg
        return self._config.validate()
