# Feature inventory contract

**Status**: living reference. Introduced in v2.4.9 Phase 3 as the record of decision **D3**.
**Artifacts**: [`feature_list.json`](../../feature_list.json), [`scripts/check-feature-drift.mjs`](../../scripts/check-feature-drift.mjs), [`tests/unit/scripts/check-feature-drift.test.ts`](../../tests/unit/scripts/check-feature-drift.test.ts)
**Enforced by**: the `check-feature-drift` job in `.github/workflows/ci.yml` (gating, every pull request) and the daily `docs-drift` workflow (one rolling issue).

## Why this document exists

`feature_list.json` shipped for a long time declaring `"version": "v0.8.0"` while `package.json` read `2.4.1` and the release line was at v2.4.8. Its 21 entries described an architecture that no longer existed: a "6-stage compaction pipeline", a "webview render protocol (7 primitives)", a "4-layer memory subsystem" under an old module path. **No job read the file.** An inventory nobody checks is not an inventory; it is a document that quietly becomes false.

Phase 3 made it true and then made it enforced. This document records the three decisions that shaped what "true" means here, because each had a real alternative and the checker's behaviour is unreadable without them.

## What the inventory asserts

Each entry carries:

| Field | Enforced? | Meaning |
|---|---|---|
| `id` | **Yes** | Unique within the file. A duplicate is an error. |
| `name` | **Yes** | Must appear verbatim in the README region named by `region`. |
| `region` | **Yes** | Which README region states this feature. Must be a known region. |
| `evidence` | **Yes** | A path that must resolve in the working tree. |
| `description` | No | Prose for a human reading the file. |
| `status` | No | Advisory. |
| `testedAt` | No | Advisory. The date the feature was last deliberately verified. |
| `verificationCommand` | No | Advisory. **Never executed by the checker.** |

There is deliberately **no `version` field**, and the checker fails if one is reintroduced.

### D3 part A -- why `verificationCommand` is advisory

The alternative was a checker that shells out to every command. That is a full test run wearing an inventory's clothes: slow, and a duplicate of `ci.yml`, which already runs those tests. A checker that cannot run on every pull request does not get run.

The cost of the choice is stated rather than hidden: **this gate cannot detect a feature that exists as a file and is broken.** It detects a feature that has been deleted, moved, renamed, or quietly dropped from the README. Correctness is `ci.yml`'s job; existence and honesty are this one's.

The plan offered a third option, a two-tier design where a nightly job runs the commands. That is the right move if the advisory fields prove to go stale, and it is deliberately not built yet.

## What the checker parses

`README.md` has no single features section, so the regions are named explicitly and bounded by heading. Each region runs from its own `## ` heading to the next `## ` heading.

| Region id | Heading | Names | Shape |
|---|---|---|---|
| `readme:four-pillars` | `## The Four Pillars` | 10 | `###` headings, with a leading `N. ` stripped |
| `readme:featured-capabilities` | `## Featured Capabilities` | 19 | `\| **Name** \|` table rows |

**29 names in total.** Drift is checked in both directions: an inventory entry whose name is absent from its region is an error, and a name stated in a region with no entry is also an error. An inventory that only ever grows is as untrue as one that only shrinks.

### D3 part B -- why the region bound is the load-bearing part

`README.md` carries a roughly 180-line `What's new in vX` changelog (lines 122-306) whose prose names features. A checker that searched the whole file would pass on a feature that had been deleted from the capabilities table but still appeared in a historical changelog entry. That is a **false pass**, and it is the specific failure this design avoids: nothing outside the two region slices is ever read.

There is a test for exactly this. `tests/unit/scripts/check-feature-drift.test.ts` asserts that a name present in changelog prose and absent from its region still fails.

### The overlap between the two regions is intentional

Six capabilities are named in both regions under different wording -- for example `Document parsing (OCR)` as a pillar and `Document parsing` as a capability row, and `Ask inbox and scheduled runs (opt-in)` against `Ask inbox + scheduler`. They are separate entries sharing an `evidence` path, because they are two separate claims the README makes and each should be independently true. Deduplicating them would mean one of the two README names stops being checked.

## D3 part C -- the version field, and why removing it was the safe choice

The file declared `v0.8.0`. Three options existed:

1. **Drop the assertion and derive the version from `package.json` at read time.** Chosen.
2. Keep the field and make it advisory. Rejected: it goes stale again on the first release, and a stale field in a document whose whole purpose is being true is an odd thing to ship.
3. Have the release flow rewrite it. Rejected: it couples the release flow to this file, and a release that forgets the step fails in the place hardest to fix.

The decisive argument is a failure mode, not a preference. `semantic-release` computes and bumps the version on `main` without touching `feature_list.json`. A **gating** version assertion would therefore go red on the first release after it landed, and it would be unfixable from inside the release commit that broke it. Any consumer needing the version reads `package.json`.

## Rebuilding or extending the inventory

- Adding a feature to the README in either region **requires** an entry in the same commit, or CI fails. That is the point.
- Renaming a region heading requires updating `REGIONS` in the checker in the same commit. The checker fails closed on a missing heading rather than silently narrowing what it enforces, so the failure is loud.
- `evidence` should point at the most specific file that would not survive the feature's removal. A directory or a barrel file that outlives the feature weakens the check.
- The checker is dependency-free on purpose, so the CI job needs no `npm ci` and stays fast enough that nobody is tempted to make it conditional.

## Known limits

Recorded rather than implied:

- **Existence, not correctness.** See D3 part A.
- **Verbatim name matching.** A README that rewords a capability fails the check until the inventory is updated. That is intended friction, but it does mean a copy edit can turn CI red.
- **Two regions, not the whole README.** Features named in `## Quick Start`, `### CLI tools (already shipped)`, or `## Roadmap` are outside the contract. Widening coverage is a deliberate later decision, not an oversight; it is recorded as a known gap for the v2.4 cycle.
