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
    QHBoxLayout,
    QLabel,
    QSizePolicy,
    QVBoxLayout,
    QWidget,
)

from nexus_installer.constants import (
    BG_CARD,
    BORDER_STRONG,
    FS_BODY,
    FS_H2,
    FS_H3,
    FW_SEMIBOLD,
    TEXT_BODY,
    TEXT_PRIMARY,
    TEXT_SECONDARY,
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
    """One capability: a name over a one-line description.

    v2.4.11 operator report: the four pillar cards "look flashy and like AI
    slop". They were four saturated tinted panels -- a coloured wash, a
    coloured border, a 3px coloured rule and a coloured heading, each in a
    different hue, stacked four across. Four full-strength accents competing
    on the first screen is what read as decoration rather than product.

    The card now uses the same surface as every other card in the wizard (the
    prerequisite rows directly beneath it, the Complete page's service list),
    and the module's colour survives as ONE small mark: a dot beside the name.
    The colour still tells you which pillar you are reading; it no longer
    shouts it.
    """

    #: Diameter of the accent dot, in px.
    DOT_PX = 8

    def __init__(
        self,
        name: str,
        description: str,
        accent: str,
        parent: QWidget | None = None,
    ) -> None:
        super().__init__(parent)
        self.setObjectName("capabilityCard")
        self.setStyleSheet(
            f"QFrame#capabilityCard {{ background-color: {BG_CARD};"
            f" border: 1px solid {BORDER_STRONG};"
            f" border-radius: 10px; }}"
            "QFrame#capabilityCard QLabel { background: transparent; border: none; }"
        )
        self.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Minimum)

        layout = QVBoxLayout(self)
        layout.setContentsMargins(14, 12, 14, 12)
        layout.setSpacing(6)

        head = QHBoxLayout()
        head.setContentsMargins(0, 0, 0, 0)
        head.setSpacing(8)

        dot = QLabel()
        dot.setObjectName("capabilityDot")
        dot.setFixedSize(self.DOT_PX, self.DOT_PX)
        dot.setStyleSheet(
            f"background-color: {accent}; border: none;"
            f" border-radius: {self.DOT_PX // 2}px;"
        )
        head.addWidget(dot, alignment=Qt.AlignmentFlag.AlignVCenter)

        title = QLabel(name)
        title.setObjectName("capabilityTitle")
        title.setStyleSheet(
            f"color: {TEXT_PRIMARY}; font-size: {FS_H3}px; "
            f"font-weight: {FW_SEMIBOLD}; background: transparent;"
        )
        head.addWidget(title, alignment=Qt.AlignmentFlag.AlignVCenter)
        head.addStretch()
        layout.addLayout(head)

        body = QLabel(description)
        body.setWordWrap(True)
        body.setStyleSheet(
            f"color: {TEXT_SECONDARY}; font-size: {FS_BODY}px; background: transparent;"
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
