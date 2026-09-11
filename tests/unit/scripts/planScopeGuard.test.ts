import { describe, expect, it } from "vitest";

// v2.4.10 Phase 1 (T007). The scope guard is the mechanical check every phase from 2
// onward inherits in place of a prose promise, so the test suite has to actually run it;
// a guard wired only to an npm script nobody invokes is documentation, not a gate.
// @ts-expect-error -- plain .mjs helper, no type declarations by design.
import { runScopeGuard } from "../../../scripts/check-plan-scope-guard.mjs";

interface ScopeGuardResult {
  ok: boolean;
  base: { ref: string; sha: string } | null;
  problems: string[];
}

describe("v2.4.10 plan scope guard", () => {
  it("passes on the current branch", () => {
    const result = runScopeGuard() as ScopeGuardResult;
    expect(result.problems).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("resolves a base ref rather than passing vacuously", () => {
    const result = runScopeGuard() as ScopeGuardResult;
    // Fail-closed contract: an unresolvable base must surface as ok === false, never as a
    // silent pass. If base is null here the guard is reporting safety it never checked.
    expect(result.base).not.toBeNull();
    expect(result.base?.sha).toMatch(/^[0-9a-f]{40}$/);
  });
});
