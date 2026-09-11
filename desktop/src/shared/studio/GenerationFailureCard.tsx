/**
 * v2.4.9 -- the failure card.
 *
 * Replaces dumping a raw sidecar / Zod error into the transcript. The user
 * sees one sentence, the specific reason, and what to do; the untouched trace
 * stays one click away behind Copy details, so a bug report is still possible
 * without making everyone read JSON.
 */

import { useState } from "react";
import {
  failureClipboardText,
  type GenerationFailure,
} from "./generationError";

export interface GenerationFailureCardProps {
  readonly failure: GenerationFailure;
  readonly testId?: string;
}

export function GenerationFailureCard({
  failure,
  testId,
}: GenerationFailureCardProps): JSX.Element {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const copy = async (): Promise<void> => {
    const text = failureClipboardText(failure);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be denied; the trace is still readable via Show details.
      setOpen(true);
    }
  };

  return (
    <section
      data-testid={testId ?? "generation-failure"}
      data-failure-kind={failure.kind}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-2)",
        padding: "var(--space-3)",
        borderRadius: "var(--radius-md, 10px)",
        border: "1px solid color-mix(in srgb, var(--status-err, #ef4444) 45%, transparent)",
        background: "color-mix(in srgb, var(--status-err, #ef4444) 8%, var(--bg-1))",
        maxWidth: "min(100%, 34rem)",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-2)" }}>
        <span aria-hidden="true" style={{ color: "var(--status-err, #ef4444)" }}>
          !
        </span>
        <strong data-testid="generation-failure-headline" style={{ color: "var(--fg-0)" }}>
          {failure.headline}
        </strong>
      </div>

      {failure.summary ? (
        <p
          data-testid="generation-failure-summary"
          style={{ margin: 0, color: "var(--fg-1, var(--fg-0))" }}
        >
          {failure.summary}
        </p>
      ) : null}

      {failure.hint ? (
        <p
          data-testid="generation-failure-hint"
          style={{ margin: 0, color: "var(--fg-muted)", fontSize: "var(--text-sm)" }}
        >
          {failure.hint}
        </p>
      ) : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
        <button
          type="button"
          data-testid="generation-failure-copy"
          onClick={() => void copy()}
          style={buttonStyle}
        >
          {copied ? "Copied" : "Copy details"}
        </button>
        <button
          type="button"
          data-testid="generation-failure-toggle"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          style={buttonStyle}
        >
          {open ? "Hide details" : "Show details"}
        </button>
      </div>

      {open ? (
        <pre
          data-testid="generation-failure-detail"
          style={{
            margin: 0,
            padding: "var(--space-2)",
            borderRadius: "var(--radius-sm, 6px)",
            background: "var(--bg-0)",
            color: "var(--fg-muted)",
            fontSize: "var(--text-xs)",
            fontFamily: "var(--font-mono, monospace)",
            // A long trace scrolls inside the card instead of stretching the pane.
            maxHeight: "14rem",
            overflow: "auto",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {failure.detail}
        </pre>
      ) : null}
    </section>
  );
}

const buttonStyle = {
  padding: "0.25rem 0.7rem",
  borderRadius: "999px",
  border: "1px solid var(--border-1)",
  background: "transparent",
  color: "var(--fg-0)",
  cursor: "pointer",
  fontSize: "var(--text-xs)",
} as const;
