"""Phase 1 tests for the prominent overall installer progress surface."""

from __future__ import annotations

from PyQt5.QtWidgets import QProgressBar

from nexus_installer.installer_state import InstallerState
from nexus_installer.pages.installing import InstallingPage
from nexus_installer.widgets.overall_progress import (
    ANIMATION_CYCLE_MS,
    OVERALL_PROGRESS_HEIGHT,
    OverallProgressBar,
)


def test_overall_bar_is_larger_and_percentage_bearing(qt_app: object) -> None:
    bar = OverallProgressBar(reduced_motion=True)
    subordinate = QProgressBar()
    subordinate.setFixedHeight(8)
    bar.set_fraction(0.42)

    assert bar.height() == OVERALL_PROGRESS_HEIGHT
    assert bar.height() > subordinate.height()
    assert bar.maximum() == 1000
    assert bar.value() == 420
    assert bar.format() == "%p%"
    assert "42%" in bar.accessibleDescription()


def test_overall_bar_is_monotonic_and_ignores_invalid_values(qt_app: object) -> None:
    bar = OverallProgressBar(reduced_motion=True)
    bar.set_fraction(0.6)
    bar.set_fraction(0.2)
    bar.set_fraction(float("nan"))
    assert bar.value() == 600


def test_overall_animation_stops_when_hidden_or_complete(qt_app: object) -> None:
    bar = OverallProgressBar(reduced_motion=False)
    bar.show()
    qt_app.processEvents()
    assert bar.is_animation_running()

    bar.hide()
    qt_app.processEvents()
    assert not bar.is_animation_running()

    bar.show()
    qt_app.processEvents()
    assert bar.is_animation_running()
    bar.complete()
    assert not bar.is_animation_running()


def test_fixed_percentage_renders_a_moving_gradient(qt_app: object) -> None:
    bar = OverallProgressBar(reduced_motion=False)
    bar.resize(640, OVERALL_PROGRESS_HEIGHT)
    bar.set_fraction(0.42)
    bar.show()
    qt_app.processEvents()
    bar._timer.stop()
    first = bar.grab().toImage()
    value = bar.value()
    for _ in range(8):
        bar._advance_gradient()
    second = bar.grab().toImage()
    assert bar.value() == value
    assert first != second


def test_overall_animation_uses_a_slow_cycle(qt_app: object) -> None:
    bar = OverallProgressBar(reduced_motion=False)
    first = bar.animation_phase
    bar._advance_gradient()
    assert ANIMATION_CYCLE_MS >= 10_000
    assert 0.0 < bar.animation_phase - first < 0.01


def test_reset_is_stationary_zero_percent_not_a_travelling_segment(
    qt_app: object,
) -> None:
    bar = OverallProgressBar(reduced_motion=False)
    assert bar.minimum() == 0
    assert bar.maximum() == 1000
    assert bar.value() == 0


def test_reduced_motion_never_starts_timer(qt_app: object) -> None:
    bar = OverallProgressBar(reduced_motion=True)
    bar.show()
    qt_app.processEvents()
    assert not bar.is_animation_running()


def test_page_uses_warning_title_for_optional_failures(qt_app: object) -> None:
    page = InstallingPage(InstallerState())
    page._on_finished(True, "Optional Unsloth provisioning needs attention.")
    assert page._title.text() == "Installation Complete with Warnings"
    assert page._progress.value() == 1000
    assert not page._progress.is_animation_running()


def test_page_cancel_stops_overall_animation(qt_app: object) -> None:
    page = InstallingPage(InstallerState())
    page._is_running = True
    page._progress.show()
    page._progress.set_running(True)
    qt_app.processEvents()
    page.cancel_install()
    assert not page._progress.is_animation_running()


def test_overall_bar_uses_the_desktop_particle_treatment(qt_app: object) -> None:
    """v2.4.9: the installer bar and the desktop generation bar are one design.

    The operator asked for "the same progress bar design as the loading model
    one". The shared grammar is a dark inset capsule, an accent ramp, and a
    drifting particle field -- NOT the old sweeping sheen, which was this
    widget's own idiom and washed the fill into a pale band.
    """
    from nexus_installer.widgets.overall_progress import PARTICLE_LAYERS

    # Five layers, mirroring the five radial-gradient layers in globals.css.
    assert len(PARTICLE_LAYERS) == 5
    # Alternating drift signs are what give the field depth; one direction
    # reads as a single sliding texture.
    drifts = [layer[3] for layer in PARTICLE_LAYERS]
    assert any(d > 0 for d in drifts) and any(d < 0 for d in drifts)
    for spacing, radius, alpha, _drift, y_ratio in PARTICLE_LAYERS:
        assert spacing > 0
        assert 0 < radius < 4
        assert 0 < alpha <= 255
        assert 0.0 <= y_ratio <= 1.0


def test_overall_bar_paints_at_every_fraction(qt_app: object) -> None:
    """Painting must not raise at the edges: empty, sliver, and full.

    A zero-width fill is the one that historically divides by zero, and a
    full-width one is where the particle loop runs longest.
    """
    from PyQt5.QtGui import QPixmap

    for fraction in (0.0, 0.001, 0.5, 1.0):
        bar = OverallProgressBar(reduced_motion=False)
        bar.resize(400, 30)
        bar.set_fraction(fraction)
        pixmap = QPixmap(bar.size())
        bar.render(pixmap)
        assert not pixmap.isNull()


def test_reduced_motion_freezes_the_particle_field(qt_app: object) -> None:
    """Reduced motion keeps the texture and stops the movement."""
    bar = OverallProgressBar(reduced_motion=True)
    bar.resize(400, 30)
    bar.set_fraction(0.6)
    assert bar.reduced_motion is True
    assert not bar.is_animation_running()
