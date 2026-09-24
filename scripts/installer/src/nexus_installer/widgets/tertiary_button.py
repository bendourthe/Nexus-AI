"""Filled gray button for a neutral action beside a primary one."""

from __future__ import annotations

from PyQt5.QtWidgets import QPushButton, QWidget


class TertiaryButton(QPushButton):
    """QPushButton styled as a filled neutral (gray) action button.

    Sits between SecondaryButton (transparent, low emphasis) and
    PrimaryButton (cyan gradient): a real choice the user may take, but not
    the one the page is steering toward -- e.g. Close beside Launch.
    """

    def __init__(self, text: str = "", parent: QWidget | None = None) -> None:
        super().__init__(text, parent)
        self.setObjectName("tertiaryButton")
