/**
 * v2.4.9 -- one progress bar for every pending job, on every tab.
 *
 * Three operator reports drove this:
 *
 *  1. "The bar appears at different width during the process." The old bar
 *     took its width from the LONGEST CAPTION UNDER IT (`${widest}ch`), so it
 *     grew and shrank as the wording changed -- wide on "generating usually
 *     takes about 1 h 20 min", narrow on "about 5 s left". Width is now a
 *     fixed track that never depends on the text.
 *  2. "Elapsed time and time left should be on the same row." They are: one
 *     row under the track, elapsed left, remaining right.
 *  3. "The bar should show right away." An image model showed a bare caption
 *     for 37 seconds and only got a bar with ~1 s to go, because the bar only
 *     rendered once a byte fraction existed. It now renders immediately in an
 *     INDETERMINATE state (a sweeping particle band) and swaps to the measured
 *     fill the moment a fraction arrives.
 *
 * The particle treatment is CSS-only (`globals.css`, `.nexus-genbar-*`): the
 * pending pill already owns a Canvas rAF loop for the orb, and a second
 * per-message animation loop is not worth the frame budget.
 */

import { PROGRESS_BAR_MAX_WIDTH } from "./generationProgress";

export interface GenerationProgressBarProps {
  /** 0-1 when measured; null renders the indeterminate sweep. */
  readonly fraction: number | null;
  /** Left of the timing row, e.g. "0:14 elapsed". */
  readonly elapsed?: string | null;
  /** Right of the timing row, e.g. "about 5 s left". */
  readonly remaining?: string | null;
  /** Above the track, e.g. "Step 12 of 30". */
  readonly position?: string | null;
  /** Under the timing row while nothing has been measured yet. */
  readonly hint?: string | null;
  /** Accent token for the fill; defaults to the chat accent. */
  readonly accentVar?: string;
  readonly testId?: string;
  readonly clockTestId?: string;
}

/**
 * Fixed-width track, timing row, optional hint.
 *
 * The track width is deliberately a constant expression and NOT derived from
 * any caption: that derivation was the reported bug. It still shrinks on a
 * narrow pane through `max-width: 100%`.
 */
export function GenerationProgressBar({
  fraction,
  elapsed,
  remaining,
  position,
  hint,
  accentVar = "--accent-chatbot",
  testId,
  clockTestId,
}: GenerationProgressBarProps): JSX.Element {
  const determinate = fraction !== null && Number.isFinite(fraction);
  const pct = determinate ? Math.min(100, Math.max(0, fraction * 100)) : 0;
  return (
    <div
      data-testid={testId}
      style={{
        display: "flex",
        flexDirection: "column",
        // Left-aligned like every other transcript row (operator report: the
        // studio block was centered while chat and agents were not).
        alignItems: "stretch",
        gap: "var(--space-1)",
        // `width: 100%` + a max, not `min(22rem, 100%)`: the pair is the same
        // rule and, unlike a CSS math function, it is inspectable in tests.
        width: "100%",
        maxWidth: PROGRESS_BAR_MAX_WIDTH,
      }}
    >
      {position ? (
        <span
          data-testid={testId ? `${testId}-position` : undefined}
          style={{ color: "var(--fg-muted)", fontSize: "var(--text-xs)" }}
        >
          {position}
        </span>
      ) : null}

      <div
        className="nexus-genbar"
        data-determinate={determinate ? "true" : "false"}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        {...(determinate
          ? { "aria-valuenow": Math.round(pct) }
          : { "aria-valuetext": "Working" })}
        aria-label={position ?? "Progress"}
        style={{ ["--nexus-genbar-accent" as string]: `var(${accentVar})` }}
      >
        {/*
          Determinate: a fill clipped to the measured fraction, with the
          particle layer riding inside it. Indeterminate: the same particle
          layer sweeping the full track, so the bar is never an empty box.
        */}
        <div
          className="nexus-genbar-fill"
          data-testid={testId ? `${testId}-fill` : undefined}
          style={determinate ? { width: `${pct}%` } : undefined}
        >
          <span className="nexus-genbar-particles" aria-hidden="true" />
        </div>
      </div>

      {elapsed || remaining ? (
        <div
          data-testid={clockTestId}
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: "var(--space-3)",
            color: "var(--fg-muted)",
            fontSize: "var(--text-xs)",
          }}
        >
          <span>{elapsed ?? ""}</span>
          <span>{remaining ?? ""}</span>
        </div>
      ) : null}

      {hint ? (
        <span
          data-testid={testId ? `${testId}-hint` : undefined}
          style={{ color: "var(--fg-muted)", fontSize: "var(--text-xs)", opacity: 0.8 }}
        >
          {hint}
        </span>
      ) : null}
    </div>
  );
}
