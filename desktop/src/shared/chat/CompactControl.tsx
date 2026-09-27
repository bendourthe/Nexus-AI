import { useState } from "react";

export interface CompactControlProps {
  readonly visible: boolean;
  readonly streaming: boolean;
  readonly disabledReason?: string | null;
  readonly turnsToSummarise?: number;
  readonly onCompact: () => void;
  readonly onUndo: () => void;
  readonly canUndo: boolean;
}

export function CompactControl({
  visible,
  streaming,
  disabledReason,
  turnsToSummarise = 0,
  onCompact,
  onUndo,
  canUndo,
}: CompactControlProps): JSX.Element | null {
  const [armed, setArmed] = useState(false);
  if (!visible) return null;
  const reason = streaming ? "a reply is still streaming" : (disabledReason ?? null);
  const disabled = reason !== null;
  return (
    <div data-testid="compact-control">
      {armed ? (
        <p role="status">
          This will summarise {turnsToSummarise} older turns. The recent turns stay as they are.
        </p>
      ) : null}
      <button
        type="button"
        aria-label={reason ? `Compact thread, unavailable: ${reason}` : "Compact thread"}
        disabled={disabled}
        onClick={() => {
          if (!armed) {
            setArmed(true);
            return;
          }
          setArmed(false);
          onCompact();
        }}
      >
        Compact thread
      </button>
      <button type="button" aria-label="Undo compaction" disabled={!canUndo} onClick={onUndo}>
        Undo compaction
      </button>
    </div>
  );
}
