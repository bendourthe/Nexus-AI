# Phase 3 - Architecture refactor, known gaps, and CI/CD

**Plan**: [v2.7.0-adoption-avatar-install-gate.md](../../plans/v2.7.0-adoption-avatar-install-gate.md)
**Date**: 2026-09-27
**Branch**: `feat/v2.7.0-adoption-avatar-install-gate`

## Plan delta

**Disposition**: No delta

The last-phase duties matched the plan. DF-8 stays open. The Empero subsection from Phase 2 is still the right ending. No workflow file was edited. Publication is the remaining task (T017) and is not a change to the product behavior.

## What this phase recorded

`docs/v2/v2.7/development/last-phase-evidence.md` quotes the architecture scan, gap reconciliation, living-docs check, git hygiene, CI field comparison, Tier 3 deep pass, Goal review, human checks, and the local suites.

The deep pass added one test: a checked talking-head confirm clears when the official avatar row disappears. Isolated run passed. That was `fix_rerun_cycles_used` 1.

## Verification

Root Vitest: 555 files passed, 3 skipped, 5938 tests passed, 12 skipped, exit 0.

Desktop Vitest in parallel: 6 failures in `video2x-adapter` and `windows-video-process-host`, both untouched by this plan. Isolated re-run: 89 passed, 1 skipped, exit 0.

## CI impact

No pipeline edit. Differences that were not applied are QG-v270-2 and QG-v270-3. The avatar and doc tests are already on `ci-required` through `test-ts` and desktop Vitest.

## Gitignore

0 patterns added.

## Next

Push this branch once, open the pull request against `develop`, and wait for `ci-required`.
