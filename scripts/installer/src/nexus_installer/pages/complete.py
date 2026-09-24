"""Complete page: services status, management commands, and launch buttons."""

from __future__ import annotations

import contextlib
import subprocess
from typing import TYPE_CHECKING

from PyQt5.QtCore import pyqtSignal
from PyQt5.QtGui import QGuiApplication
from PyQt5.QtWidgets import (
    QFileDialog,
    QHBoxLayout,
    QLabel,
    QVBoxLayout,
    QWidget,
)

from nexus_installer.background import paths as bg_paths
from nexus_installer.background import state_store
from nexus_installer.constants import (
    ACCENT,
    BG_CARD,
    BG_INPUT,
    BORDER,
    FONT_MONO,
    FS_BODY,
    FS_CAPTION,
    SUCCESS,
    TEXT_SECONDARY,
    WARNING,
)
from nexus_installer.engine.install_summary import summarize_install
from nexus_installer.engine.model_router import (
    default_catalog_path,
    load_catalog_index,
)
from nexus_installer.video_enhancement_support import INSTALLER_NOTE
from nexus_installer.widgets.callout_box import CalloutBox
from nexus_installer.widgets.page_intro import PageLede
from nexus_installer.widgets.secondary_button import SecondaryButton
from nexus_installer.widgets.tertiary_button import TertiaryButton

if TYPE_CHECKING:
    from nexus_installer.installer_state import InstallerState


class _CommandRow(QWidget):
    """Monospace command with a copy-to-clipboard button."""

    def __init__(self, label: str, command: str, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self._command = command

        layout = QHBoxLayout(self)
        layout.setContentsMargins(0, 4, 0, 4)
        layout.setSpacing(8)

        desc = QLabel(label)
        desc.setStyleSheet(
            f"color: {TEXT_SECONDARY}; font-size: {FS_CAPTION}px; "
            f"background: transparent;"
        )
        desc.setFixedWidth(180)
        layout.addWidget(desc)

        code_label = QLabel(command)
        code_label.setStyleSheet(
            f"font-family: '{FONT_MONO}'; font-size: {FS_BODY}px; "
            f"color: {ACCENT}; background-color: {BG_INPUT}; "
            f"padding: 4px 8px; border-radius: 4px;"
        )
        layout.addWidget(code_label, stretch=1)

        copy_btn = SecondaryButton("Copy")
        copy_btn.setFixedWidth(60)
        # v2.2.3 Phase 7 (7.3): shrink the Copy rows via a LOCAL override on
        # this page's own buttons only -- the 38px min-height comes from the
        # global QPushButton#secondaryButton rule (theme.py, fed by
        # BUTTON_HEIGHT), which must stay untouched so Open VS Code / Finish
        # keep their full height.
        copy_btn.setStyleSheet(
            "QPushButton#secondaryButton { min-height: 24px; padding: 0 8px; }"
        )
        copy_btn.clicked.connect(self._copy)
        layout.addWidget(copy_btn)

    def _copy(self) -> None:
        clipboard = QGuiApplication.clipboard()
        if clipboard:
            clipboard.setText(self._command)


class CompletePage(QWidget):
    """Final wizard page showing results and next steps."""

    #: Emitted when the user clicks "Retry failed downloads" (v1.15.0 Phase 3).
    retry_requested = pyqtSignal()

    #: Emitted when the user clicks Close -- finish the wizard without
    #: launching the desktop app (v2.4.11).
    close_requested = pyqtSignal()

    #: Emitted when the set of footer-hosted buttons changes (retry
    #: appearing, no desktop app to close beside) so the window re-hosts them.
    footer_actions_changed = pyqtSignal()

    def __init__(self, state: InstallerState, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self._state = state

        # v2.2.3 Phase 7 (7.3): compact layout so the page fits without
        # scrolling (spacing 16 -> 8, card padding 12 -> 6).
        layout = QVBoxLayout(self)
        layout.setSpacing(8)

        # Title (updated dynamically on show)
        self._title = QLabel("Installation Complete")
        self._title.setObjectName("pageTitle")
        layout.addWidget(self._title)

        self._subtitle = PageLede("Nexus is installed and ready to use.")
        layout.addWidget(self._subtitle)

        self._video2x_note = QLabel(INSTALLER_NOTE)
        self._video2x_note.setWordWrap(True)
        self._video2x_note.setObjectName("video2xOptionalNote")
        self._video2x_note.setStyleSheet(
            f"color: {TEXT_SECONDARY}; font-size: {FS_CAPTION}px; "
            f"background: transparent;"
        )
        layout.addWidget(self._video2x_note)

        # Failure warning (hidden by default)
        self._warning_callout = CalloutBox(title="Some steps encountered issues")
        self._warning_callout.setStyleSheet(
            "QFrame#calloutBox { background: #2a2112; "
            f"border-left: 3px solid {WARNING}; "
            "border-radius: 6px; }}"
        )
        self._warning_callout.setVisible(False)
        layout.addWidget(self._warning_callout)

        # Running Services card
        services_label = QLabel("Running Services")
        services_label.setObjectName("sectionHead")
        layout.addWidget(services_label)

        self._services_card = QWidget()
        self._services_card.setStyleSheet(
            f"background-color: {BG_CARD}; border: 1px solid {BORDER}; "
            f"border-radius: 8px; padding: 6px;"
        )
        self._services_layout = QVBoxLayout(self._services_card)
        layout.addWidget(self._services_card)

        # Managing Nexus card
        manage_label = QLabel("Managing Nexus")
        manage_label.setObjectName("sectionHead")
        layout.addWidget(manage_label)

        manage_card = QWidget()
        manage_card.setStyleSheet(
            f"background-color: {BG_CARD}; border: 1px solid {BORDER}; "
            f"border-radius: 8px; padding: 6px;"
        )
        manage_layout = QVBoxLayout(manage_card)
        manage_layout.addWidget(_CommandRow("Start Ollama", "ollama serve"))
        manage_layout.addWidget(
            _CommandRow("Pull a different model", "ollama pull gemma4:26b")
        )
        manage_layout.addWidget(_CommandRow("Check model status", "ollama list"))
        manage_layout.addWidget(
            _CommandRow(
                "Uninstall extension",
                "code --uninstall-extension nexus-coding.nexus-coding",
            )
        )
        layout.addWidget(manage_card)

        # v2.4.11: every action on this page sits in the footer row, right
        # aligned where Finish already lives -- "View Logs", "Close",
        # "Launch Nexus AI". The page owns the widgets; the footer only hosts
        # them while this page shows (see `footer_actions`).
        self._save_log_btn = SecondaryButton("View Logs")
        self._save_log_btn.clicked.connect(self._save_log)

        # v1.15.0 Phase 3 (Issue 2): retry just the failed downloads. Hidden
        # unless the summary reports retryable failures (a gated skip is not
        # retryable -- it needs a token, not another attempt).
        self._retry_btn = SecondaryButton("Retry failed downloads")
        self._retry_btn.setObjectName("retryFailedButton")
        self._retry_btn.clicked.connect(self.retry_requested.emit)
        self._retry_btn.setVisible(False)

        # Close finishes the wizard without launching the app. Filled gray so
        # it reads as a real second choice beside the cyan primary.
        self._close_btn = TertiaryButton("Close")
        self._close_btn.clicked.connect(self.close_requested.emit)

        layout.addStretch()

    def showEvent(self, event: object) -> None:  # noqa: N802
        super().showEvent(event)  # type: ignore[arg-type]
        self._refresh()

    def footer_actions(self) -> list[QWidget]:
        """Buttons the wizard footer hosts while this page shows.

        Ordered left to right; the footer's own primary (Launch Nexus AI /
        Finish) follows them.
        """
        actions: list[QWidget] = [self._save_log_btn]
        if self._retry_btn.isVisible():
            actions.append(self._retry_btn)
        if self.can_launch_desktop():
            # With no desktop app to launch the primary is already a plain
            # "Finish", and a Close beside it would be the same action twice.
            actions.append(self._close_btn)
        return actions

    def finish_button_text(self) -> str:
        """Label for the footer's primary button on this page."""
        return "Launch Nexus AI" if self.can_launch_desktop() else "Finish"

    def can_launch_desktop(self) -> bool:
        """True when an installed desktop executable is there to start."""
        state = self._state
        return bool(state.desktop_installed and state.desktop_exe_path)

    def _refresh(self) -> None:
        state = self._state

        # v1.15.0 Phase 3 (Issue 2): plain-language per-model outcome summary.
        # Failed downloads get a human reason (not a raw "Error: 400"); gated
        # declines read as "skipped - needs token", distinct from a failure.
        catalog = load_catalog_index(default_catalog_path())
        summary = summarize_install(state, catalog)
        engine_failure = next(
            (f for f in state.step_failures if f.get("step") == "engine"),
            None,
        )
        non_model_failures = [
            s for s in state.failed_steps if s not in ("model", "engine")
        ]
        optional_failures = [
            failure
            for failure in state.step_failures
            if failure.get("step") in state.optional_failed_steps
        ]

        callout_lines = [
            f"\u2022 {outcome.display_name}: {outcome.reason}"
            for outcome in summary.failed
        ]
        callout_lines += [
            f"\u2022 Optional model skipped - {outcome.display_name}: {outcome.reason}"
            for outcome in summary.skipped
        ]
        if engine_failure:
            callout_lines.append(
                f"\u2022 {engine_failure.get('summary', 'The installer stopped.')}"
            )
            suggestion = str(engine_failure.get("suggestion") or "")
            if suggestion:
                callout_lines.append(f"\u2022 {suggestion}")
        elif "engine" in state.failed_steps:
            callout_lines.append(
                "\u2022 The installer hit an unexpected error and stopped."
            )
        callout_lines += [
            f"\u2022 The {step} step did not complete." for step in non_model_failures
        ]
        callout_lines += [
            f"\u2022 {failure.get('summary', 'An optional component is not ready.')}"
            for failure in optional_failures
        ]

        has_failure = bool(
            summary.failed
            or non_model_failures
            or optional_failures
            or engine_failure
            or "engine" in state.failed_steps
        )
        if engine_failure or "engine" in state.failed_steps:
            self._title.setText("Installation Stopped")
            self._subtitle.setStyleSheet(
                f"color: {WARNING}; font-size: {FS_BODY}px; background: transparent;"
            )
            self._subtitle.setText(
                "The installer hit an unexpected error. See details below."
            )
        elif has_failure:
            self._title.setText("Installation Completed with Warnings")
            self._subtitle.setStyleSheet(
                f"color: {WARNING}; font-size: {FS_BODY}px; background: transparent;"
            )
            self._subtitle.setText(
                "Some components could not be installed. See details below."
            )
        else:
            self._title.setText("Installation Complete")

        self._warning_callout.setVisible(bool(callout_lines))
        if callout_lines:
            self._warning_callout.set_body("<br>".join(callout_lines))

        # Only failed downloads are retryable; a gated skip needs a token.
        self._retry_btn.setVisible(bool(summary.retryable_ids))

        # Rebuild services list
        while self._services_layout.count():
            item = self._services_layout.takeAt(0)
            if item and item.widget():
                item.widget().deleteLater()

        self._add_service("Ollama", state.ollama_url, state.ollama_installed)
        self._add_service(
            "Python backend", "http://localhost:11435", bool(state.python_path)
        )
        ext_installed = "extension" not in state.failed_steps
        self._add_service(
            "VS Code extension",
            "nexus-coding.nexus-coding (installed)"
            if ext_installed
            else "Not installed",
            ext_installed,
        )
        if state.desktop_installed:
            # v2.2.0 Phase 1 (1.4): surface the sidecar verdict, not just a
            # binary pass/fail -- "health check passed" used to mean only
            # "the window opened".
            detail_suffix = (
                f" -- {state.desktop_health_detail}"
                if getattr(state, "desktop_health_detail", "")
                else ""
            )
            desktop_detail = (
                f"Installed (health check passed{detail_suffix})"
                if state.desktop_health_ok
                else (
                    "Installed (health check FAILED"
                    f"{detail_suffix}) -- the app backend cannot start"
                )
            )
        else:
            desktop_detail = "Not installed"
        self._add_service(
            "Nexus Desktop",
            desktop_detail,
            state.desktop_installed and state.desktop_health_ok,
        )

        # Launching only makes sense when the desktop app actually landed; the
        # footer primary falls back to a plain "Finish" otherwise.
        can_launch = self.can_launch_desktop()
        state.launch_desktop_on_finish = can_launch
        self._close_btn.setVisible(can_launch)
        self.footer_actions_changed.emit()

    def _add_service(self, name: str, detail: str, ok: bool) -> None:
        row = QHBoxLayout()
        # v2.2.3 Phase 7 (7.3): drop the default 11px QHBoxLayout margins so
        # the service rows pack tightly inside the compact card.
        row.setContentsMargins(0, 0, 0, 0)
        name_label = QLabel(name)
        name_label.setStyleSheet(
            f"font-size: {FS_BODY}px; font-weight: bold; background: transparent;"
        )
        # 160px clipped "VS Code extension"; 200px fits every service name.
        name_label.setFixedWidth(200)
        row.addWidget(name_label)

        detail_label = QLabel(detail)
        color = SUCCESS if ok else WARNING
        detail_label.setStyleSheet(
            f"color: {color}; font-size: {FS_CAPTION}px; background: transparent;"
        )
        row.addWidget(detail_label, stretch=1)

        container = QWidget()
        container.setLayout(row)
        self._services_layout.addWidget(container)

    def acknowledge(self) -> None:
        """Close out the run without launching anything.

        Drops the persisted install-state so a later cold launch starts at
        Welcome instead of reopening this outcome view (v1.15.0 Phase 2 /
        Issue 1). Both Close and Launch go through here.
        """
        state_store.clear_state(bg_paths.state_file())

    def on_finish(self) -> None:
        """Called by the window when the footer primary is clicked.

        v2.4.11: that button IS the launch action ("Launch Nexus AI"), so the
        launch is unconditional; a user who does not want the app clicks Close.
        """
        self.acknowledge()
        if not self.can_launch_desktop():
            return
        self._state.launch_desktop_on_finish = True
        with contextlib.suppress(OSError):
            subprocess.Popen([self._state.desktop_exe_path])

    def _save_log(self) -> None:
        path, _ = QFileDialog.getSaveFileName(
            self,
            "Save Installation Log",
            "nexus-install.log",
            "Text Files (*.log *.txt)",
        )
        if path:
            log_text = "\n".join(self._state.install_log)
            with open(path, "w", encoding="utf-8") as f:
                f.write(log_text)
