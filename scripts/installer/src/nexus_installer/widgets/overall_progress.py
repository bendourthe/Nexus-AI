"""Prominent animated overall installer progress widget.

v2.4.9: repainted to match the desktop app's generation bar
(`.nexus-genbar` in `desktop/src/styles/globals.css`), so the installer and the
product it installs show the same progress treatment rather than two different
bars. The shared grammar is: a dark inset capsule with a faint accent rim, an
accent gradient fill with an outer glow, and a field of pale particles drifting
along the fill at several speeds.

Two deliberate differences from the web bar, both because this is the
installer's ONLY progress readout while the desktop bar has a caption and a
timing row around it: the capsule stays tall enough to carry a percentage
badge, and the badge is kept.
"""

from __future__ import annotations

import math

from PyQt5.QtCore import QPointF, QRectF, QSize, Qt, QTimer
from PyQt5.QtGui import QColor, QLinearGradient, QPainter, QPainterPath, QPen
from PyQt5.QtWidgets import QProgressBar, QWidget

from nexus_installer.constants import (
    ACCENT,
    ACCENT_BRIGHT,
    ACCENT_DIM,
    BG_CARD,
    BG_HEADER,
    BG_WINDOW,
    BORDER,
    TEXT_PRIMARY,
)
from nexus_installer.widgets.background import resolve_reduced_motion

OVERALL_PROGRESS_HEIGHT = 30
FRAME_INTERVAL_MS = 40
ANIMATION_CYCLE_MS = 12_000
BAR_INSET = 2.0

#: Particle layers, mirroring the five radial-gradient layers of
#: `.nexus-genbar-particles`. Each is (spacing px, radius px, alpha 0-255,
#: drift px per animation cycle, vertical position 0-1). Alternating drift
#: signs are what make the field read as depth rather than one sliding
#: texture.
PARTICLE_LAYERS: tuple[tuple[float, float, int, float, float], ...] = (
    (42.0, 1.1, 217, 42.0, 0.50),
    (66.0, 0.9, 140, -66.0, 0.32),
    (54.0, 1.3, 178, 54.0, 0.68),
    (88.0, 0.8, 115, -88.0, 0.40),
    (72.0, 1.0, 166, 72.0, 0.60),
)


class OverallProgressBar(QProgressBar):
    """A determinate percentage bar with a moving signature gradient."""

    def __init__(
        self,
        parent: QWidget | None = None,
        *,
        reduced_motion: bool | None = None,
    ) -> None:
        super().__init__(parent)
        self.setObjectName("overallProgress")
        self.setFixedHeight(OVERALL_PROGRESS_HEIGHT)
        self.setTextVisible(True)
        self.setFormat("%p%")
        self.setAccessibleName("Overall installation progress")
        self._reduced_motion = (
            resolve_reduced_motion() if reduced_motion is None else reduced_motion
        )
        self._active = False
        self._phase = 0.0
        self._last_fraction = 0.0
        self._timer = QTimer(self)
        self._timer.setInterval(FRAME_INTERVAL_MS)
        self._timer.timeout.connect(self._advance_gradient)
        self.reset_for_run()

    @property
    def reduced_motion(self) -> bool:
        return self._reduced_motion

    @property
    def animation_phase(self) -> float:
        return self._phase

    def is_animation_running(self) -> bool:
        return self._timer.isActive()

    def sizeHint(self) -> QSize:  # noqa: N802
        hint = super().sizeHint()
        return QSize(max(320, hint.width()), OVERALL_PROGRESS_HEIGHT)

    def reset_for_run(self) -> None:
        self._last_fraction = 0.0
        self._phase = 0.0
        self.setRange(0, 1000)
        self.setValue(0)
        self.setAccessibleDescription("Installation is preparing progress details.")
        self.set_running(True)
        self.update()

    def set_fraction(self, fraction: float) -> None:
        if not math.isfinite(float(fraction)):
            return
        self._last_fraction = max(
            self._last_fraction, max(0.0, min(1.0, float(fraction)))
        )
        self.setValue(round(self._last_fraction * 1000))
        percent = round(self._last_fraction * 100)
        self.setAccessibleDescription(f"Installation is {percent}% complete.")
        self.update()

    def complete(self) -> None:
        self.set_fraction(1.0)
        self.set_running(False)

    def cancel(self) -> None:
        self.set_running(False)

    def set_running(self, running: bool) -> None:
        self._active = bool(running)
        self._sync_timer()

    def _sync_timer(self) -> None:
        should_run = self._active and self.isVisible() and not self._reduced_motion
        if should_run and not self._timer.isActive():
            self._timer.start()
        elif not should_run and self._timer.isActive():
            self._timer.stop()

    def _advance_gradient(self) -> None:
        self._phase = (self._phase + (FRAME_INTERVAL_MS / ANIMATION_CYCLE_MS)) % 1.0
        self.update()

    def showEvent(self, event: object) -> None:  # noqa: N802
        super().showEvent(event)  # type: ignore[arg-type]
        self._sync_timer()

    def hideEvent(self, event: object) -> None:  # noqa: N802
        super().hideEvent(event)  # type: ignore[arg-type]
        self._timer.stop()

    def _paint_particles(self, painter: QPainter, fill_rect: QRectF) -> None:
        """Drifting pale dots inside the fill, one pass per layer.

        The web bar gets this from five repeating radial gradients animated at
        different rates; Qt has no repeating-gradient primitive, so each layer
        is drawn as a row of dots whose x positions are offset by the shared
        animation phase times that layer's own drift. Same construction, same
        result: a field with depth rather than one sliding texture.

        The caller has already clipped to the fill path, so dots near the
        leading edge are cut by the capsule instead of spilling past it.
        """
        if fill_rect.width() <= 0:
            return
        # Reduced motion keeps the field but freezes it: the dots still read as
        # texture, nothing moves.
        phase = 0.0 if self._reduced_motion else self._phase
        painter.setPen(Qt.PenStyle.NoPen)
        for spacing, dot_radius, alpha, drift, y_ratio in PARTICLE_LAYERS:
            colour = QColor("#ffffff")
            colour.setAlpha(alpha)
            painter.setBrush(colour)
            y = fill_rect.top() + fill_rect.height() * y_ratio
            # Start one spacing to the left so a dot entering the capsule is
            # never popped into existence at the edge.
            offset = (phase * drift) % spacing
            x = fill_rect.left() - spacing + offset
            while x <= fill_rect.right() + spacing:
                painter.drawEllipse(QPointF(x, y), dot_radius, dot_radius)
                x += spacing
        painter.setBrush(Qt.BrushStyle.NoBrush)

    def paintEvent(self, _event: object) -> None:  # noqa: N802
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing, True)
        rect = QRectF(self.rect().adjusted(0, 0, -1, -1))
        radius = rect.height() / 2.0

        # Track: the web bar's dark vertical wash under a faint accent rim.
        track_path = QPainterPath()
        track_path.addRoundedRect(rect, radius, radius)
        track = QLinearGradient(0.0, rect.top(), 0.0, rect.bottom())
        track.setColorAt(0.0, QColor(BG_WINDOW))
        track.setColorAt(1.0, QColor(BG_HEADER))
        painter.fillPath(track_path, track)
        rim = QColor(ACCENT)
        rim.setAlpha(56)  # 22% of the accent, as in the CSS inset ring
        painter.setPen(QPen(rim, 1.0))
        painter.drawPath(track_path)

        denominator = max(1, self.maximum() - self.minimum())
        fraction = (self.value() - self.minimum()) / denominator
        fill_width = (rect.width() - (BAR_INSET * 2.0)) * max(0.0, min(1.0, fraction))

        if fill_width > 0:
            fill_rect = QRectF(
                rect.left() + BAR_INSET,
                rect.top() + BAR_INSET,
                max(1.0, fill_width),
                rect.height() - (BAR_INSET * 2.0),
            )
            fill_radius = min(fill_rect.height(), fill_rect.width()) / 2.0
            fill_path = QPainterPath()
            fill_path.addRoundedRect(fill_rect, fill_radius, fill_radius)

            painter.save()
            # Outer glow, the Qt stand-in for the CSS box-shadow on the fill.
            glow = QColor(ACCENT)
            for step, alpha in ((2.5, 26), (1.5, 44)):
                glow.setAlpha(alpha)
                halo = QPainterPath()
                halo_rect = fill_rect.adjusted(-step, -step, step, step)
                halo_radius = halo_rect.height() / 2.0
                halo.addRoundedRect(halo_rect, halo_radius, halo_radius)
                painter.setPen(QPen(glow, 1.2))
                painter.setBrush(Qt.BrushStyle.NoBrush)
                painter.drawPath(halo)

            # Fill: dim at the left, full accent at the leading edge, matching
            # the web bar's 38% -> 92% ramp.
            base = QLinearGradient(fill_rect.left(), 0.0, fill_rect.right(), 0.0)
            base.setColorAt(0.0, QColor(ACCENT_DIM))
            base.setColorAt(1.0, QColor(ACCENT))
            painter.fillPath(fill_path, base)

            painter.setClipPath(fill_path)
            self._paint_particles(painter, fill_rect)
            # v2.4.9: the sweeping sheen and the top/bottom "glass" ramp are
            # gone. They were this widget's own idiom and, next to the desktop
            # bar, washed the fill into a pale band that read as a different
            # control. The web bar's fill is the accent ramp plus particles;
            # so is this one now.
            painter.restore()

            outline = QColor(ACCENT_BRIGHT)
            outline.setAlpha(105)
            painter.setPen(QPen(outline, 1.0))
            painter.setBrush(Qt.BrushStyle.NoBrush)
            painter.drawPath(fill_path)

        if self.maximum() != 0:
            font = painter.font()
            font.setBold(True)
            font.setPixelSize(14)
            painter.setFont(font)
            percent = round(self._last_fraction * 100)
            text = f"{percent}%"
            metrics = painter.fontMetrics()
            badge_width = metrics.horizontalAdvance(text) + 20
            badge_height = min(24.0, rect.height() - 4.0)
            badge = QRectF(
                rect.center().x() - badge_width / 2.0,
                rect.center().y() - badge_height / 2.0,
                badge_width,
                badge_height,
            )
            badge_color = QColor(BG_CARD)
            badge_color.setAlpha(230)
            painter.setPen(QPen(QColor(BORDER), 1.0))
            painter.setBrush(badge_color)
            painter.drawRoundedRect(badge, badge_height / 2.0, badge_height / 2.0)
            painter.setPen(QColor(TEXT_PRIMARY))
            painter.drawText(badge, Qt.AlignmentFlag.AlignCenter, text)


__all__ = [
    "ANIMATION_CYCLE_MS",
    "FRAME_INTERVAL_MS",
    "OVERALL_PROGRESS_HEIGHT",
    "OverallProgressBar",
]
