/**
 * v2.4.8 follow-up (2026-09-08) -- one settings grammar for both studios.
 *
 * Operator report: the Video advanced panel and the Image advanced panel
 * looked like two different applications, and some Video options could not be
 * reached at all -- the panel grew past the window with no scroller of its
 * own, so CFG Scale and everything under it were simply off-screen.
 *
 * These are the shared chrome, not a form engine: a capped, scrollable card
 * (nothing can fall off the bottom again), a section heading, a responsive
 * field grid, and a compact row for the few controls that belong in the chat
 * area at all times. Each studio keeps its own fields and its own domain
 * rules; only the layout and the type are shared, which is what makes the two
 * panels read as one product.
 */

import type { ReactNode } from "react";

export interface StudioSettingsPanelProps {
  /** Card heading, e.g. "Image settings". */
  readonly title: string;
  readonly testId?: string;
  /** Right side of the heading row: a reset button, a tier note. */
  readonly trailing?: ReactNode;
  readonly children: ReactNode;
}

/**
 * The scrolling card every studio panel lives in.
 *
 * The height cap is the accessibility fix: the panel sits in the composer
 * footer, so without one it pushes the transcript away and puts its own last
 * fields under the window edge. It is a viewport fraction rather than a fixed
 * pixel height so a short window still shows a usable panel.
 */
export function StudioSettingsPanel({
  title,
  testId,
  trailing,
  children,
}: StudioSettingsPanelProps): JSX.Element {
  return (
    <section
      className="nx-card"
      data-testid={testId}
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--space-2)",
          padding: "var(--space-2) var(--space-3)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: "var(--text-sm)",
            fontWeight: 600,
            color: "var(--fg-0)",
          }}
        >
          {title}
        </h3>
        {trailing}
      </header>
      <div
        data-testid={testId ? `${testId}-scroll` : undefined}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
          padding: "var(--space-3)",
          // Every option stays reachable: the panel scrolls inside itself
          // instead of growing past the window.
          maxHeight: "min(46vh, 30rem)",
          overflowY: "auto",
          minHeight: 0,
        }}
      >
        {children}
      </div>
    </section>
  );
}

export interface StudioSettingsSectionProps {
  readonly title: string;
  /** One short line under the heading when the section needs a why. */
  readonly hint?: string;
  readonly testId?: string;
  readonly children: ReactNode;
}

/** A titled group of fields, laid out on the shared responsive grid. */
export function StudioSettingsSection({
  title,
  hint,
  testId,
  children,
}: StudioSettingsSectionProps): JSX.Element {
  return (
    <div data-testid={testId} style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        <span
          style={{
            fontSize: "var(--text-xs)",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--fg-muted)",
          }}
        >
          {title}
        </span>
        {hint ? (
          <span style={{ fontSize: "var(--text-xs)", color: "var(--fg-muted)", opacity: 0.85 }}>
            {hint}
          </span>
        ) : null}
      </div>
      <div
        style={{
          display: "grid",
          // Fluid columns: two or three on a wide window, one when narrow, with
          // no fixed pixel width anywhere.
          gridTemplateColumns: "repeat(auto-fit, minmax(13rem, 1fr))",
          gap: "var(--space-2) var(--space-3)",
          alignItems: "start",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export interface StudioSettingsFieldProps {
  readonly label: ReactNode;
  /** One short line under the control (a tier warning, a segment note). */
  readonly hint?: ReactNode;
  /** Take the whole grid row: prompts, switches, repeated rows. */
  readonly full?: boolean;
  readonly children: ReactNode;
}

/** Label above control, one field per grid cell. */
export function StudioSettingsField({
  label,
  hint,
  full = false,
  children,
}: StudioSettingsFieldProps): JSX.Element {
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-1)",
        minWidth: 0,
        ...(full ? { gridColumn: "1 / -1" } : {}),
      }}
    >
      <span style={{ fontSize: "var(--text-xs)", color: "var(--fg-muted)" }}>{label}</span>
      {children}
      {hint}
    </label>
  );
}

/**
 * The always-visible row under the composer.
 *
 * Operator ask: the handful of settings changed on nearly every prompt
 * (resolution and size for an image, duration and resolution for a video)
 * should not be behind a panel at all. This is that row: compact, wrapping,
 * and the same shape on both tabs.
 */
export function StudioQuickControls({
  testId,
  children,
}: {
  readonly testId?: string;
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <div
      data-testid={testId}
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "flex-end",
        gap: "var(--space-2) var(--space-3)",
      }}
    >
      {children}
    </div>
  );
}

/** One compact control in the quick row: a small label over a narrow field. */
export function StudioQuickControl({
  label,
  width = "9rem",
  children,
}: {
  readonly label: ReactNode;
  /** Minimum width of the control; it still grows with the row. */
  readonly width?: string;
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "2px",
        minWidth: 0,
        flex: `0 1 ${width}`,
      }}
    >
      <span
        style={{
          fontSize: "var(--text-xs)",
          color: "var(--fg-muted)",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

/**
 * v2.4.9 -- one control on the composer row itself.
 *
 * `StudioQuickControl` stacks a label over its field, which is right for a
 * dedicated row but too tall once the controls move onto the Context / Model
 * row. This is the inline form: label and field side by side, sized to their
 * content, so several fit beside the picker without a second row.
 */
export function StudioInlineControl({
  label,
  width = "8rem",
  disabledReason,
  children,
}: {
  readonly label: ReactNode;
  /** Basis for the field; it still shrinks on a narrow window. */
  readonly width?: string;
  /** When set, the control is explained rather than silently inert. */
  readonly disabledReason?: string;
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <label
      title={disabledReason}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-1)",
        minWidth: 0,
        flex: "0 0 auto",
        opacity: disabledReason ? 0.55 : 1,
      }}
    >
      <span
        style={{
          fontSize: "var(--text-xs)",
          color: "var(--fg-muted)",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      {/*
        `.nx-composer-control` gives the child the Context pill's height,
        radius, border and fill, so the settings and the pill read as one row
        rather than two toolbars. `flex: 0 0 auto` at the declared width stops
        a long option ("1216 x 832 (landscape)") from being cropped.
      */}
      <span
        className="nx-composer-control"
        style={{ display: "block", flex: `0 0 ${width}`, minWidth: 0 }}
      >
        {children}
      </span>
    </label>
  );
}
