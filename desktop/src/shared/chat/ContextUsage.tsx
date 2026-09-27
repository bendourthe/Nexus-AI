import type { ContextAccount } from "../../../../core/chat/contextAccounting";

export function ContextUsage({ account }: { readonly account: ContextAccount }): JSX.Element | null {
  if (!account.visible || account.total === null) return null;
  return (
    <div data-testid="context-pressure" role="group" aria-label="Context pressure">
      {account.lines.map((line) => (
        <span key={line.name}>
          {line.name}: {line.tokens === "unknown" ? "unknown" : line.tokens}
        </span>
      ))}
      <span>unaccounted: {account.unaccounted}</span>
      <span>total: {account.total}</span>
      {account.remaining !== null ? <span>remaining: {account.remaining}</span> : null}
      {account.cacheRead !== null ? <span>cache read: {account.cacheRead}</span> : null}
      {account.cacheCreation !== null ? <span>cache creation: {account.cacheCreation}</span> : null}
    </div>
  );
}
