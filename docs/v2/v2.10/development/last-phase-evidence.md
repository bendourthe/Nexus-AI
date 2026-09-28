# Last-phase evidence - v2.10.0 System One exclusion

**Plan**: `docs/v2/v2.10/plans/v2.10.0-adoption-system-one-models.md`
**Branch**: `feat/v2.10.0-system-one-models`
**Worktree**: `C:\Users\bdour\Documents\Projects\Development\Nexus-AI-v2.10.0-system-one-models`
**Phase 1 commit**: `f4d126fc64cfd05d1f242f28f3b5993e7b838a62`
**Date**: 2026-09-28

## Architecture refactor

Empty-directory scan (Python `os.walk`, skipping `node_modules`, `.git`, `dist`, `coverage`, `target`, and dot directories):

```
.\modules\coding\skills\catalog\__nonexistent_user__
.\modules\coding\skills\catalog\__none__
EMPTY_COUNT 2
```

Those two paths are skill-catalog test placeholders. Prior evidence left them in place. They were not pruned. No other empty directory was found. No files moved. Layout stays `docs/v2/v2.10/` for the live plan. v2.9 is already at `docs/archive/v2/v2.9/`.

`npm run check:docs-layout`:

```
check-docs-layout: canonical layout OK (no docs/versions|docs/archive/versions wrappers)
```

## Known-gaps reconciliation

DF-v210-1 is the only System One exclusion heading in `docs/v2/v2.10/known-gaps.md`. The Reason names hosted Jev, Laya 0.3.20, and Kev 0.8B, 4B, 9B, and 27B, points at `docs/archive/v2/v2.8/plans/v2.8.0-adoption-qwen-image-nimble.md`, and ends with `not admitted, no catalog row`. It was not copied into `docs/reference/model-acceptance.md`. `core/registry/catalog.json`, `core/registry/recommended.json`, `core/skills/PromptInjectionScanner.ts`, `src/tools/ConfirmationGate.ts`, and `modules/coding/routing/commandRouter.ts` were not edited.

Glob of `docs/**/known-gaps.md` status lines. Files whose status is still in progress were not edited:

- `docs/v2/v2.10/known-gaps.md` (`in-progress`)
- `docs/archive/v2/v2.5/known-gaps.md`
- `docs/archive/v2/v2.4/known-gaps.md`
- `docs/archive/v2/v2.3/known-gaps.md`
- `docs/archive/v2/v2.0/known-gaps.md`
- `docs/archive/v1/v1.20/known-gaps.md`
- `docs/archive/v1/v1.19/known-gaps.md`

`docs/archive/v2/v2.6` through `v2.9` are archived. Their open rows stay in the v2.10 carry-forward table. This note does not close them, and it does not close DF-11.

## Living docs architecture

Present and unchanged by this plan: `docs/handbooks/markdown/atlas.md`, `docs/handbooks/markdown/generation-recovery.md`, three technical companions, matching HTML, `docs/decisions/README.md`, `docs/README.md`, `docs/DEVLOG.md`, and `docs/todos.md`. `docs/testing/` and `docs/validation/` were not created.

`npm run docs:handbooks:check`:

```
generate-handbooks: 5 generated file(s) are missing or stale
  - docs\handbooks\html\atlas.html
  - docs\handbooks\html\generation-recovery.html
  - docs\handbooks\html\technical\installer-runtime.html
  - docs\handbooks\html\technical\media-runtime.html
  - docs\handbooks\html\technical\transcript-and-workspaces.html
```

The checker hashes working-tree Markdown. On this Windows checkout those bytes are CRLF and the committed HTML was generated from LF. That is the existing carry-forward `QG-v270-1`. This plan did not edit handbook Markdown, so the HTML was not regenerated.

## Git-tree hygiene

```
python scripts/check_release_preconditions.py --branches --repo-settings
```

Quoted at Phase 1 commit `f4d126fc`, before this evidence commit:

```
[branches]
current=feat/v2.10.0-system-one-models
head=f4d126fc64cf
protected_checkout=no
working_tree=clean
origin=https://github.com/bendourthe/Nexus-AI.git
upstream=(none)
local_count=9
merged_into_head_count=3

[repo-settings]
status=observed
repository=bendourthe/Nexus-AI
default_branch=main
private=false
archived=false
issues_enabled=true
delete_branch_on_merge=false
default_branch_protection=observed
```

Report only. No branch was deleted in this step.

## CI/CD coverage

**DETECT**: GitHub Actions. `.github/workflows/ci.yml` is the active test workflow. Not "none detected".

**COMPARE** (read from the current `ci.yml`, not from a green run):

| Field | Observed |
|---|---|
| Events | `push` with `branches-ignore: ["dependabot/**"]`; `pull_request` on `main` and `develop` |
| Runner | `ubuntu-latest` for `test-ts` |
| Aggregate required check | Job `ci-required`, `if: always()`, `needs` the lint, test, build, catalog, coverage, nexus-check, bench, prompts, vsix, feature-drift, command-parity, release-assets, architecture, init, python, and audit jobs |
| Permissions | No workflow-level `permissions` block. `ci-required` sets `contents: read` |
| Action pins | `actions/checkout` and `actions/setup-node` are pinned to commit SHAs |
| Caching | `setup-node` uses `cache: "npm"` |
| Concurrency | `cancel-in-progress: true` on group `ci-${{ github.workflow }}-${{ github.head_ref \|\| github.ref }}` |
| Path scoping | Pull requests are limited to `main` and `develop`. This phase adds no new path |
| Artifact retention | `audit-runtimes` uses `retention-days: 30` |
| Structured reports | `test-ts` runs `npm run test -- --reporter=verbose --coverage` |
| Deployment | This plan does not deploy |
| Failure recovery | In-progress runs cancel. A red required check fails `ci-required` |

`package.json` still has no `fast` / `full` / `platform` / `report` / `release` scripts, and `ci.yml` still has no workflow-level permissions block. Those differences stay `QG-v270-2`. `scripts/check_installer_parity.py` is absent. This plan changes no installer. That execution gap stays `QG-v270-3`.

**PROPOSE / APPROVAL**: No pipeline edit. The new test is already inside `tests/unit/`, which `test-ts` runs. Applying a permissions block or a new parity script was not approved for this exclusion note.

## Tier 3 deep pass

### Tier 3 blast-radius verdict

- **Verdict**: run
- **Diff evidence**: `git diff --stat origin/develop...HEAD` at `f4d126fc` lists `docs/v2/v2.10/known-gaps.md`, the plan, the phase-1 history, the cleanup report, and `tests/unit/docs/v2.10.0-system-one-exclusion.test.ts`. `catalog.json` is not in the diff.
- **Reason**: A test file changed, so the diff is not prose-only. No UI, generated HTML, catalog payload, security boundary, or public API changed.
- **Ambiguity check**: The test file selects `run`.

### Feature inventory

| Feature | Source | Artifact | Real boundary | Expected | Observed | Evidence |
|---|---|---|---|---|---|---|
| System One exclusion | Phase 1 T001 | DF-v210-1 in `docs/v2/v2.10/known-gaps.md` | Vitest reads the gap file, the acceptance bar, and the five guarded sources | The required phrases, one heading, and no catalog token | 3 exclusion tests passed with the 8 model-acceptance tests | 11 tests passed |

Rendered surfaces: not applicable. The artifact is Markdown, not HTML, PDF, or a browser view.

Adversarial pass: the exclusion test fails if a second `##### DF-v210-` heading appears, if the acceptance bar gains `System One`, `Laya`, `Kev`, or `Jev`, or if the guarded sources gain `jev`, `laya`, `kev`, `nimble`, `typesafe`, or `system-one`. No failing proof was produced. A standalone `ADVERSARIAL-REPORT.md` was not added; this section is the record.

Implementation convergence: the product landing is DF-v210-1 with an unchanged catalog and an unchanged acceptance bar. No Convergence phase was appended. T012 remains the publication step, not a missing product requirement.

### Goal-vs-plan sufficiency

| Question | Answer | Evidence |
|---|---|---|
| What did implementing teach? | `docs/v2/v2.10/known-gaps.md` already existed as the v2.9 carry-forward, so the row was appended. | File header |
| What assumption was false? | None that changes the landing. The bar still has no System One text. The enumerator script is still absent. | Acceptance bar search; missing `scripts/enumerate_plan_queue.py` |
| What would a reader of the Goal miss? | None. A missing Jev, Laya, or Kev install is not a miss. | DF-v210-1 |
| What did the maintainer ask for outside the plan? | Finish the v2.10 plan, then release, clear merged branches and worktrees, and archive v2.10. Those follow publication. | This session |

`fix_rerun_cycles_used`: 0.

Model-prompting freshness: `scripts/check_model_prompting_freshness.py` is absent, and this repository has no `profiles-index.json` layer. Logged no-op. Verdict UNKNOWN because the script is not here, not because a roster was checked and found clean.

## Goal-vs-codebase review

**Goal restated**: Hosted Jev, Laya 0.3.20, and the Kev family are recorded as not admitted in one v2.10.0 known-gap row, and none of them becomes a catalog row, a runtime, an API client, or a download.

**What satisfies it**: DF-v210-1. The acceptance bar has no System One, Laya, Kev, or Jev text. The catalog and the four other guarded files have none of the forbidden tokens. No weight was downloaded and no vendor API was called.

**Gap**: A reader who opens only `docs/reference/model-acceptance.md` will not see this refusal. That delay is the definition of done. The suggested next step on DF-v210-1 is the record.

## Human/manual testing suggestions

Read DF-v210-1 and confirm Settings and the installer model list do not offer Jev, Laya, Kev, or Nimble as a new install. Do not call a decision API and do not load those weights.

## Full-suite testing and stabilization

```
npm test -- --reporter=dot
Test Files  4 failed | 552 passed | 3 skipped (559)
Tests  8 failed | 5935 passed | 12 skipped (5955)
Duration  90.94s
```

The 8 failures were `Test timed out in 5000ms` in worktree and golden-runner cases. Dedicated re-run with `--testTimeout=180000`:

```
Test Files  4 passed (4)
Tests  14 passed (14)
Duration  30.09s
```

Classification: environment. Those tests spend several seconds creating a worktree. Benchmark fixtures the suite rewrote were restored with `git checkout` and are not in this commit.

Phase 1 Vitest: 11 passed.

## Publication and integration

Branch `feat/v2.10.0-system-one-models` was pushed once. Pull request: https://github.com/bendourthe/Nexus-AI/pull/88 against `develop`.

Required check `ci-required` passed on the pull_request run `36438491018` (head `e61fd25d`) and the branch push run `36438420561`. The Submission Checklist gate passed on the rerun of run `36438491005`. Merged 2026-09-28T14:58:16Z. Merge commit `7a4b57c41313944c83d6a05408775a9ab66a4a04`.

The develop push of that merge started CI run `36440003074`, which completed with conclusion `success`. That rerun is the existing `ci.yml` push trigger. `mergeStateStatus` was `UNSTABLE` because the Windows installer rehearsal was still pending. That job is not a required check. `mergeable` was `MERGEABLE`.

## Worktree teardown

`git merge-base --is-ancestor feat/v2.10.0-system-one-models origin/develop` exited 0 and `git log origin/develop..feat/v2.10.0-system-one-models` was empty. `git status --porcelain` in the worktree was empty.

The `node_modules` junction was removed with `rmdir` so the main checkout's modules stayed in place. `git worktree remove` then printed nothing and the directory was absent. `git worktree list` shows only `C:/Users/bdour/Documents/Projects/Development/Nexus-AI`. The local branch was deleted. The remote branch delete follows this commit, because the pre-push hook refuses a push while the release edits are uncommitted.
