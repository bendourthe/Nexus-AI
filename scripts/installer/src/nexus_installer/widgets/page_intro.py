"""One intro treatment for every wizard page.

Before this, each page sized its own intro paragraph inline: Welcome used the
14px caption floor for a six-line wall of prose, Review and Models used 16px
body, and Installing had no intro at all. `PageLede` gives all of them the same
role -- a short, readable sentence directly under the page title -- so moving
between tabs feels like one product rather than five screens.

`CapabilityGrid` is the Welcome hero's visual summary: what the app does, as
four accent-coded columns instead of a paragraph the reader has to parse.
"""

from __future__ import annotations

from PyQt5.QtCore import Qt
from PyQt5.QtWidgets import (
    QFrame,
    QGridLayout,
    QLabel,
    QSizePolicy,
    QVBoxLayout,
    QWidget,
)

from nexus_installer.constants import (
    FS_BODY,
    FS_H2,
    FS_H3,
    FW_SEMIBOLD,
    TEXT_BODY,
    TEXT_SECONDARY,
    rgba_css,
)

#: Columns per capability row before wrapping to a second row.
_GRID_COLUMNS = 4


class PageLede(QLabel):
    """The one-sentence intro under a page title, at a readable size."""

    def __init__(self, text: str, parent: QWidget | None = None) -> None:
        super().__init__(text, parent)
        self.setObjectName("pageLede")
        self.setWordWrap(True)
        self.setStyleSheet(
            f"color: {TEXT_BODY}; font-size: {FS_H2}px; background: transparent;"
        )


class PageNote(QLabel):
    """Secondary detail under a lede: the caveats, not the headline."""

    def __init__(self, text: str, parent: QWidget | None = None) -> None:
        super().__init__(text, parent)
        self.setObjectName("pageNote")
        self.setWordWrap(True)
        self.setStyleSheet(
            f"color: {TEXT_SECONDARY}; font-size: {FS_BODY}px; background: transparent;"
        )


class CapabilityCard(QFrame):
    """One accent-coded capability: name over a one-line description."""

    def __init__(
        self,
        name: str,
        description: str,
        accent: str,
        parent: QWidget | None = None,
    ) -> None:
        super().__init__(parent)
        self.setObjectName("capabilityCard")
        # The accent is per-card, so the tint and left rule are set here rather
        # than in the shared stylesheet.
        self.setStyleSheet(
            f"QFrame#capabilityCard {{ background-color: {rgba_css(accent, 0.07)};"
            f" border: 1px solid {rgba_css(accent, 0.35)};"
            f" border-left: 3px solid {accent};"
            f" border-radius: 10px; }}"
            "QFrame#capabilityCard QLabel { background: transparent; border: none; }"
        )
        self.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Minimum)

        layout = QVBoxLayout(self)
        layout.setContentsMargins(12, 10, 12, 10)
        layout.setSpacing(3)

        title = QLabel(name)
        title.setStyleSheet(
            f"color: {accent}; font-size: {FS_H3}px; "
            f"font-weight: {FW_SEMIBOLD}; background: transparent;"
        )
        layout.addWidget(title)

        body = QLabel(description)
        body.setWordWrap(True)
        body.setStyleSheet(
            f"color: {TEXT_BODY}; font-size: {FS_BODY}px; background: transparent;"
        )
        layout.addWidget(body)


class CapabilityGrid(QWidget):
    """Accent-coded capability cards laid out in an even grid."""

    def __init__(
        self,
        items: tuple[tuple[str, str, str], ...],
        parent: QWidget | None = None,
        *,
        columns: int = _GRID_COLUMNS,
    ) -> None:
        super().__init__(parent)
        self.setStyleSheet("background: transparent;")

        grid = QGridLayout(self)
        grid.setContentsMargins(0, 0, 0, 0)
        grid.setHorizontalSpacing(10)
        grid.setVerticalSpacing(10)
        for index, (name, description, accent) in enumerate(items):
            card = CapabilityCard(name, description, accent)
            grid.addWidget(
                card,
                index // columns,
                index % columns,
                alignment=Qt.AlignmentFlag.AlignTop,
            )
        for column in range(min(columns, len(items))):
            grid.setColumnStretch(column, 1)


__all__ = ["CapabilityCard", "CapabilityGrid", "PageLede", "PageNote"]
