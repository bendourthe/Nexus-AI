import { describe, expect, it } from "vitest";

// v2.4.10 Phase 1 (T007), amended in Phase 5.5. The scope guard is the mechanical check
// every phase from 2 onward inherits in place of a prose promise, so the test suite has
// to actually run it; a guard wired only to an npm script nobody invokes is
// documentation, not a gate.
// @ts-expect-error -- plain .mjs helper, no type declarations by design.
import { runScopeGuard } from "../../../scripts/check-plan-scope-guard.mjs";

interface ScopeGuardResult {
  ok: boolean;
  base: { ref: string; sha: string } | null;
  problems: string[];
}

// The guard compares this branch against its integration branch, so it needs a base ref
// to exist. `actions/checkout` defaults to a shallow clone (depth 1) and this repo's
// workflows do not override `fetch-depth`, so on CI neither `develop` nor
// `origin/develop` is present. The guard is fail-closed BY DESIGN and returns
// ok: false there, which is correct for the CLI a developer runs locally but would red
// the build for a purely environmental reason.
//
// So the two properties are asserted separately rather than collapsed into one:
//   1. Fail-closed holds everywhere. An unresolvable base must never yield ok: true.
//      Environment-independent, so it runs on CI and locally alike.
//   2. No guarded path was touched. Only meaningful where a base ref resolved.
//
// This is deliberately NOT "pass if anything happens": when a base resolves, a real
// violation still fails the suite, and when it does not, the reason is asserted to be
// the missing base ref and nothing else.
const result = runScopeGuard() as ScopeGuardResult;
const baseResolved = result.base !== null;

describe("v2.4.10 plan scope guard", () => {
  it("is fail-closed: an unresolvable base ref never reports success", () => {
    if (baseResolved) {
      expect(result.base?.sha).toMatch(/^[0-9a-f]{40}$/);
    } else {
      expect(result.ok).toBe(false);
      expect(result.problems.join(" ")).toContain("FAIL-CLOSED");
    }
  });

  it("touches no out-of-scope path on this branch", () => {
    if (!baseResolved) {
      // Shallow checkout: there is nothing to diff against. Recorded rather than
      // silently passing, so a reader knows which of the two branches ran.
      expect(result.problems.every((p) => p.includes("FAIL-CLOSED"))).toBe(true);
      return;
    }
    expect(result.problems).toEqual([]);
    expect(result.ok).toBe(true);
  });
});
