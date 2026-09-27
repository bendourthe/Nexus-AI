/**
 * Branch affordance for one message.
 *
 * Composed by MessageBubble. It is not inlined there: the bubble is already
 * the message surface's hot path.
 */

export interface BranchSibling {
  readonly id: string;
  readonly label: string;
  readonly active: boolean;
}

export interface BranchControlProps {
  readonly messageId: string;
  readonly canBranch: boolean;
  readonly siblings: readonly BranchSibling[];
  readonly onBranch: (messageId: string) => void;
  readonly onSelect: (branchId: string) => void;
  readonly error?: string | null;
}

export function BranchControl({
  messageId,
  canBranch,
  siblings,
  onBranch,
  onSelect,
  error,
}: BranchControlProps): JSX.Element | null {
  const showSwitcher = siblings.length > 1;
  if (!canBranch && !showSwitcher && !error) return null;
  const activeIndex = Math.max(
    0,
    siblings.findIndex((sibling) => sibling.active),
  );
  const previous = activeIndex > 0 ? siblings[activeIndex - 1] : undefined;
  const next = activeIndex < siblings.length - 1 ? siblings[activeIndex + 1] : undefined;
  return (
    <div
      data-testid={`branch-control-${messageId}`}
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "var(--space-2)",
        marginTop: "var(--space-1)",
      }}
    >
      {canBranch ? (
        <button
          type="button"
          data-testid={`branch-from-${messageId}`}
          aria-label="Branch from here"
          onClick={() => onBranch(messageId)}
        >
          Branch from here
        </button>
      ) : null}
      {showSwitcher ? (
        <span role="group" aria-label={`Branch ${activeIndex + 1} of ${siblings.length}`}>
          <button
            type="button"
            aria-label="Previous branch"
            disabled={!previous}
            onClick={() => previous && onSelect(previous.id)}
          >
            Previous branch
          </button>
          <span>
            Branch {activeIndex + 1} of {siblings.length}
          </span>
          <button
            type="button"
            aria-label="Next branch"
            disabled={!next}
            onClick={() => next && onSelect(next.id)}
          >
            Next branch
          </button>
        </span>
      ) : null}
      {error ? (
        <p role="alert" data-testid={`branch-error-${messageId}`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
