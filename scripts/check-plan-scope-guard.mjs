#!/usr/bin/env node
/**
 * v2.4.10 Phase 1 (T007) -- out-of-scope branch-diff guard.
 *
 * The v2.4.10 plan changes a model's display TIER INPUT, never the shared display
 * comparator. Two implementations are therefore off limits for the whole plan, and the
 * plan inherits this one mechanical check instead of repeating a prose promise in every
 * phase prompt:
 *
 *   - core/registry/modelDisplayPolicy.ts                          (desktop comparator)
 *   - scripts/installer/src/nexus_installer/catalog_tab_sort.py    (installer comparator)
 *
 * A third path is half-guarded: core/registry/model-display-order.fixture.json may gain
 * NEW rows (Phase 3.3 is allowed to add synthetic fixture rows) but may not have any
 * PRE-EXISTING row mutated, because the two parity suites both assert against it and a
 * quietly edited row would make a broken order look correct on both surfaces at once.
 *
 * core/registry/recommended.json is deliberately NOT guarded: Phase 4 changes it by
 * decision, as the tier input that actually routes installer users.
 *
 * FAIL-CLOSED: if the base ref cannot be resolved, this exits non-zero rather than
 * passing vacuously. A guard that silently passes when it cannot see the diff is worse
 * than no guard, because it reports safety it never checked.
 *
 * Usage:
 *   node scripts/check-plan-scope-guard.mjs [--base <ref>]
 *
 * Base ref resolution order (first that resolves wins):
 *   1. --base <ref>
 *   2. $PLAN_SCOPE_GUARD_BASE
 *   3. merge-base against develop, then origin/develop
 *
 * LOCAL `develop` IS TRIED FIRST ON PURPOSE. This feature branch was cut from local
 * develop, which at the time of writing sits 4 commits ahead of origin/develop. Taking
 * the remote as the base would fold those 4 unrelated v2.4.9 commits into "this branch's
 * diff", so the guard would police paths this plan never touched and could fail for
 * someone else's change. The local branch point is the honest scope for this guard.
 * (The publication gate in Phase 5 measures against the REMOTE deliberately, for the
 * opposite reason: what actually merges is what matters there.)
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const FORBIDDEN_PATHS = [
  "core/registry/modelDisplayPolicy.ts",
  "scripts/installer/src/nexus_installer/catalog_tab_sort.py",
];

const APPEND_ONLY_FIXTURE = "core/registry/model-display-order.fixture.json";

const CANDIDATE_BASES = ["develop", "origin/develop"];

function git(args, { allowFail = false } = {}) {
  try {
    return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (err) {
    if (allowFail) return null;
    throw err;
  }
}

function resolveBase() {
  const flagIdx = process.argv.indexOf("--base");
  const explicit =
    flagIdx >= 0 ? process.argv[flagIdx + 1] : process.env.PLAN_SCOPE_GUARD_BASE;

  const candidates = explicit ? [explicit] : CANDIDATE_BASES;
  for (const ref of candidates) {
    const verified = git(["rev-parse", "--verify", "--quiet", `${ref}^{commit}`], {
      allowFail: true,
    });
    if (!verified) continue;
    const mergeBase = git(["merge-base", ref, "HEAD"], { allowFail: true });
    if (mergeBase) return { ref, sha: mergeBase.trim() };
  }
  return null;
}

function changedPaths(baseSha) {
  const out = git(["diff", "--name-only", `${baseSha}...HEAD`], { allowFail: true });
  const tracked = out === null ? [] : out.split("\n").filter(Boolean);
  // Include the working tree and the index so the guard catches an uncommitted edit too;
  // a guard that only sees committed work passes right up until the moment it matters.
  const dirty = git(["diff", "--name-only", "HEAD"], { allowFail: true }) ?? "";
  const staged = git(["diff", "--name-only", "--cached"], { allowFail: true }) ?? "";
  return new Set([
    ...tracked,
    ...dirty.split("\n").filter(Boolean),
    ...staged.split("\n").filter(Boolean),
  ]);
}

function fixtureRowsAt(ref) {
  const raw = git(["show", `${ref}:${APPEND_ONLY_FIXTURE}`], { allowFail: true });
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw);
    const rows = Array.isArray(parsed?.rows) ? parsed.rows : [];
    return new Map(rows.map((r) => [r.id, JSON.stringify(r)]));
  } catch {
    return null;
  }
}

function currentFixtureRows() {
  const raw = git(["show", `HEAD:${APPEND_ONLY_FIXTURE}`], { allowFail: true });
  let source = raw;
  if (source === null) return null;
  // Prefer the working-tree copy when it differs, so an uncommitted mutation is caught.
  try {
    source = readFileSync(APPEND_ONLY_FIXTURE, "utf8");
  } catch {
    /* fall back to HEAD */
  }
  try {
    const parsed = JSON.parse(source);
    const rows = Array.isArray(parsed?.rows) ? parsed.rows : [];
    return new Map(rows.map((r) => [r.id, JSON.stringify(r)]));
  } catch {
    return null;
  }
}

export function runScopeGuard() {
  const problems = [];

  const base = resolveBase();
  if (!base) {
    return {
      ok: false,
      base: null,
      problems: [
        "FAIL-CLOSED: could not resolve a base ref. Tried " +
          CANDIDATE_BASES.join(", ") +
          ". Pass --base <ref> or set PLAN_SCOPE_GUARD_BASE.",
      ],
    };
  }

  const changed = changedPaths(base.sha);

  for (const p of FORBIDDEN_PATHS) {
    if (changed.has(p)) {
      problems.push(
        `out-of-scope path modified: ${p} -- the v2.4.10 plan changes the tier INPUT, never the shared comparator`,
      );
    }
  }

  if (changed.has(APPEND_ONLY_FIXTURE)) {
    const before = fixtureRowsAt(base.sha);
    const after = currentFixtureRows();
    if (before === null || after === null) {
      problems.push(
        `FAIL-CLOSED: ${APPEND_ONLY_FIXTURE} changed but could not be parsed on both sides for comparison`,
      );
    } else {
      for (const [id, json] of before) {
        if (!after.has(id)) {
          problems.push(`pre-existing fixture row removed: ${id}`);
        } else if (after.get(id) !== json) {
          problems.push(`pre-existing fixture row modified: ${id} -- adding NEW rows is allowed, editing existing ones is not`);
        }
      }
    }
  }

  return { ok: problems.length === 0, base, problems };
}

function main() {
  const { ok, base, problems } = runScopeGuard();
  if (!ok) {
    console.error("plan-scope-guard: FAIL");
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  console.log(`plan-scope-guard: OK (base ${base.ref} @ ${base.sha.slice(0, 8)})`);
}

// Only run as a CLI, so the test suite can import runScopeGuard() without exiting.
if (process.argv[1] && process.argv[1].endsWith("check-plan-scope-guard.mjs")) {
  main();
}
