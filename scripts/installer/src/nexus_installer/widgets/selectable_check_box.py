"""A checkbox whose caption is selectable text.

`QCheckBox` paints its caption itself, and a button's text can never be
selected or copied. Every other caption in the wizard is a `QLabel` that
`selectable_text.make_labels_selectable` has already opened up, so the Features
list was the one place where a user could not copy what they were reading.

This composite keeps the native box and moves the caption into a sibling
`QLabel`: the label is selectable, and clicking it still toggles the box, so
the row behaves exactly like a `QCheckBox` to the user. The `QCheckBox` API
this codebase actually calls (`setText` / `text` / `setChecked` / `isChecked` /
`setEnabled` / `setToolTip` / `stateChanged` / `toggled`) is re-exported, so
call sites swap the class name and nothing else.
"""

from __future__ import annotations

from PyQt5.QtCore import Qt
from PyQt5.QtWidgets import QCheckBox, QHBoxLayout, QLabel, QWidget

from nexus_installer.constants import TEXT_MUTED, TEXT_PRIMARY


class _CaptionLabel(QLabel):
    """Selectable caption that still toggles its checkbox on a plain click."""

    def __init__(self, box: QCheckBox, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self._box = box
        self.setWordWrap(True)
        self.setTextInteractionFlags(
            Qt.TextInteractionFlag.TextSelectableByMouse
            | Qt.TextInteractionFlag.LinksAccessibleByMouse
        )

    def mouseReleaseEvent(self, event) -> None:  # noqa: N802, ANN001
        """Toggle on a click, but never on the release that ends a drag-select.

        `hasSelectedText` is the discriminator: a user who dragged across the
        caption to copy it gets their selection, not a surprise state change.
        """
        super().mouseReleaseEvent(event)
        if not self._box.isEnabled():
            return
        if self.hasSelectedText():
            return
        if event is not None and event.button() != Qt.MouseButton.LeftButton:
            return
        self._box.toggle()


class SelectableCheckBox(QWidget):
    """`QCheckBox` behavior with a caption the user can select and copy."""

    def __init__(self, text: str = "", parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground, True)

        self._box = QCheckBox(self)
        self._box.setText("")
        self._caption = _CaptionLabel(self._box, self)

        layout = QHBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(8)
        layout.addWidget(self._box, 0, Qt.AlignmentFlag.AlignTop)
        layout.addWidget(self._caption, 1)

        # Signals are re-exported rather than redeclared so existing
        # `.stateChanged.connect(...)` / `.toggled.connect(...)` call sites keep
        # working against the real QCheckBox.
        self.stateChanged = self._box.stateChanged
        self.toggled = self._box.toggled

        self.setText(text)
        self._sync_caption_color()
        self._box.toggled.connect(lambda _checked: self._sync_caption_color())

    # -- QCheckBox surface --------------------------------------------------
    @property
    def check_box(self) -> QCheckBox:
        """The underlying box, for callers that need the widget itself."""
        return self._box

    @property
    def caption(self) -> QLabel:
        """The caption label, for callers that need to style it."""
        return self._caption

    def text(self) -> str:
        return self._caption.text()

    def setText(self, text: str) -> None:  # noqa: N802
        self._caption.setText(text)

    def isChecked(self) -> bool:  # noqa: N802
        return self._box.isChecked()

    def setChecked(self, checked: bool) -> None:  # noqa: N802
        self._box.setChecked(checked)

    def isEnabled(self) -> bool:  # noqa: N802
        return self._box.isEnabled()

    def setEnabled(self, enabled: bool) -> None:  # noqa: N802
        super().setEnabled(True)  # keep the caption selectable while disabled
        self._box.setEnabled(enabled)
        self._sync_caption_color()

    def setToolTip(self, tip: str) -> None:  # noqa: N802
        super().setToolTip(tip)
        self._box.setToolTip(tip)
        self._caption.setToolTip(tip)

    def blockSignals(self, block: bool) -> bool:  # noqa: N802
        return self._box.blockSignals(block)

    def toggle(self) -> None:
        self._box.toggle()

    def _sync_caption_color(self) -> None:
        color = TEXT_PRIMARY if self._box.isEnabled() else TEXT_MUTED
        self._caption.setStyleSheet(f"color: {color}; background: transparent;")


__all__ = ["SelectableCheckBox"]
