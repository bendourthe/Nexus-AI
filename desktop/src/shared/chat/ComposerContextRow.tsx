/**
 * v2.2.7 Phase 3 -- footer row under the typing area: Context pill, then the
 * model picker, then a non-blocking 80% "Start a new session" suggestion.
 */

import type { ReactNode } from "react";
import type { SessionContextUsage } from "../../../../core/chat/sessionContextUsage";
import { ContextUsageBar } from "./ContextUsageBar";

export interface ComposerContextRowProps {
  readonly usage: SessionContextUsage;
  readonly onStartNewSession?: () => void;
  /** Image / Video park Advanced settings on this row (Context | Model | Advanced). */
  readonly trailing?: ReactNode;
  /**
   * v2.4.9: the studios' always-visible controls (resolution, size, duration)
   * render INSIDE this row rather than on a second row under it.
   *
   * Operator ask: "the settings for Image and Video generation should all be
   * on the same row as the context, model selector, etc. and be more compact."
   * A separate `StudioQuickControls` block below the row was two rows of
   * chrome under a one-line composer.
   */
  readonly quickControls?: ReactNode;
  readonly children: ReactNode;
}

export function ComposerContextRow({
  usage,
  onStartNewSession,
  trailing,
  quickControls,
  children,
}: ComposerContextRowProps): JSX.Element {
  const showBar = usage.percent !== null && usage.denominatorKind !== "none";
  return (
    <div
      data-testid="composer-context-row"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-2)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-3)",
          // v2.2.9 Phase 1.2 (T002): one row. Wrapping is what produced the
          // inverted screenshot-1 layout (picker dumped under a 9rem pill).
          flexWrap: "nowrap",
        }}
      >
        {showBar ? <ContextUsageBar usage={usage} /> : null}
        {/*
          Bounded picker: ~25-30% of the row when the Context bar is present,
          with a min width that still fits long catalog display names such as
          "Nemotron 3.5 Lightning 30B-A3B". Longer names ellipsize inside the
          selector, which carries a title tooltip.
        */}
        <div
          data-testid="composer-picker-slot"
          style={
            showBar
              ? {
                  // With the studio controls on the row too, the picker takes a
                  // narrower share; it still fits the longest catalog name.
                  minWidth: quickControls ? "11rem" : "14rem",
                  maxWidth: quickControls ? "22%" : "30%",
                  flex: quickControls ? "0 1 22%" : "0 1 30%",
                  overflow: "hidden",
                }
              : { minWidth: 0, flex: "1 1 auto" }
          }
        >
          {children}
        </div>
        {quickControls ? (
          <div
            data-testid="composer-quick-slot"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
              // v2.4.9: the settings size to their CONTENT so a long option
              // cannot crop; the Context pill absorbs the slack instead, which
              // is what closes the trailing gap in the row.
              flex: "0 0 auto",
              minWidth: 0,
              // On a narrow window they scroll sideways rather than wrapping
              // the row (wrapping is what produced the inverted layout this
              // row was built to fix).
              overflowX: "auto",
              scrollbarWidth: "thin",
            }}
          >
            {quickControls}
          </div>
        ) : null}
        {trailing ? (
          <div
            data-testid="composer-advanced-slot"
            style={{ flex: "0 0 auto" }}
          >
            {trailing}
          </div>
        ) : null}
      </div>
      {usage.atOrAbove80 && onStartNewSession ? (
        <div
          data-testid="context-usage-cta"
          role="status"
          style={{ fontSize: "var(--text-xs)", color: "var(--status-warn)" }}
        >
          This session is at{" "}
          {Math.floor(Math.max(0, usage.percent ?? 0) + 1e-9)}% of context.
          Starting a new session keeps this transcript.
          <button
            type="button"
            data-testid="context-usage-new-session"
            onClick={onStartNewSession}
            style={{
              marginLeft: "var(--space-2)",
              padding: "0.15rem 0.6rem",
              borderRadius: "999px",
              border: "1px solid var(--status-warn)",
              background: "transparent",
              color: "var(--fg-0)",
              cursor: "pointer",
            }}
          >
            Start a new session
          </button>
        </div>
      ) : null}
    </div>
  );
}
