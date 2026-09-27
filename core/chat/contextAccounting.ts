/**
 * Context pressure for the next request. Cache counters are not part of the
 * total: they overlap the prompt tokens they describe.
 *
 * Invariant: when `total` is a number, `known + unaccounted === total`.
 * An unknown category is never stored as zero.
 */

export interface ContextCategoryInput {
  readonly name: string;
  readonly tokens: number | null;
}

export interface ContextCategoryLine {
  readonly name: string;
  readonly tokens: number | "unknown";
}

export interface ContextAccount {
  readonly lines: readonly ContextCategoryLine[];
  readonly known: number;
  readonly unaccounted: number;
  readonly total: number | null;
  readonly cacheRead: number | null;
  readonly cacheCreation: number | null;
  readonly remaining: number | null;
  readonly visible: boolean;
}

export function accountContext(input: {
  readonly categories: readonly ContextCategoryInput[];
  readonly observedTotal: number | null;
  readonly windowTokens: number | null;
  readonly cacheRead?: number | null;
  readonly cacheCreation?: number | null;
}): ContextAccount {
  const lines: ContextCategoryLine[] = input.categories.map((category) =>
    category.tokens === null
      ? { name: category.name, tokens: "unknown" }
      : { name: category.name, tokens: category.tokens },
  );
  const known = input.categories.reduce(
    (sum, category) => sum + (category.tokens === null ? 0 : category.tokens),
    0,
  );
  const anyUnknown = input.categories.some((category) => category.tokens === null);
  const total =
    input.observedTotal === null
      ? anyUnknown
        ? null
        : known
      : input.observedTotal;
  const unaccounted = total === null ? 0 : Math.max(0, total - known);
  const windowTokens = input.windowTokens;
  const remaining =
    total === null || windowTokens === null ? null : Math.max(0, windowTokens - total);
  const pressure =
    total !== null && windowTokens !== null && windowTokens > 0 && total / windowTokens >= 0.5;
  const visible = total !== null && (pressure || unaccounted > 0);
  return {
    lines,
    known,
    unaccounted,
    total,
    cacheRead: input.cacheRead ?? null,
    cacheCreation: input.cacheCreation ?? null,
    remaining,
    visible,
  };
}
