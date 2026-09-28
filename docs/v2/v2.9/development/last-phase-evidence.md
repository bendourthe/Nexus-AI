# Last-phase evidence - v2.9.0 CrisperWhisper exclusion

**Plan**: `docs/v2/v2.9/plans/v2.9.0-adoption-crisperwhisper.md`
**Branch**: `feat/v2.9.0-crisperwhisper`
**Worktree**: `C:\Users\bdour\Documents\Projects\Development\Nexus-AI-v2.9.0-crisperwhisper`
**Phase 1 commit**: `d5cf4bf6`
**Date**: 2026-09-27

## Architecture refactor

Empty-directory scan (Python `os.walk`, skipping `node_modules`, `.git`, `dist`, `coverage`, `target`, and dot directories):

```
EMPTY_COUNT 0
NONE
```

No files moved. A quoted empty scan completes this duty. Layout stays `docs/v2/v2.9/` for the live plan. v2.8 is already at `docs/archive/v2/v2.8/`.

`npm run check:docs-layout`:

```
check-docs-layout: canonical layout OK (no docs/versions|docs/archive/versions wrappers)
```

## Known-gaps reconciliation

DF-v290-1 is the v2.9.0 exclusion row. It says CrisperWhisper 2.0 is not admitted, the fetched page has no weights, license, or size, the scores are vendor-reported, Pro ranks above the open name, word timestamps are a Faster-Whisper gap, and `not admitted, no catalog row`. It was not copied into `docs/reference/model-acceptance.md`. `runtimes/audio/engines.py` was not edited.

In-progress known-gaps files, from each `**Status**` line (canonical `docs/releases/**/known-gaps.md` matches nothing):

- `docs/archive/v1/v1.19/known-gaps.md`
- `docs/archive/v1/v1.20/known-gaps.md`
- `docs/archive/v1/v1.5/known-gaps.md`
- `docs/archive/v1/v1.8/known-gaps.md`
- `docs/archive/v2/v2.0/known-gaps.md`
- `docs/archive/v2/v2.3/known-gaps.md`
- `docs/archive/v2/v2.4/known-gaps.md`
- `docs/archive/v2/v2.5/known-gaps.md`
- `docs/v2/v2.9/known-gaps.md`

`docs/archive/v2/v2.6`, `v2.7`, and `v2.8` are archived. Those older open files stay as they are. This note does not close them.

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

```
[branches]
current=feat/v2.9.0-crisperwhisper
head=d5cf4bf6499f
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

**COMPARE**: Unchanged from the v2.8.0 reconciliation. `ci-required` is the aggregate required check. `test-ts` runs `npm run test`. Actions are pinned to commit SHAs. Concurrency uses `cancel-in-progress: true`. There is no workflow-level `permissions` block and no `fast` / `full` / `platform` / `report` / `release` scripts. Those differences stay `QG-v270-2`. `scripts/check_installer_parity.py` is absent. This plan changes no installer. That execution gap stays `QG-v270-3`.

**PROPOSE / APPROVAL**: No pipeline edit. The new assertion is already inside `tests/unit/`.

## Tier 3 deep pass

### Tier 3 blast-radius verdict

- **Verdict**: run
- **Diff evidence**: `docs/v2/v2.9/known-gaps.md` and `tests/unit/docs/v2.4.9-model-acceptance.test.ts`. `catalog.json` and `runtimes/audio/engines.py` are not in the diff.
- **Reason**: A test file changed, so the diff is not prose-only. No UI, generated HTML, catalog payload, security boundary, or public API changed.
- **Ambiguity check**: The test file selects `run`.

### Feature inventory

| Feature | Source | Artifact | Real boundary | Expected | Observed | Evidence |
|---|---|---|---|---|---|---|
| CrisperWhisper refusal | Phase 1 T001 | DF-v290-1 in `docs/v2/v2.9/known-gaps.md` | Read the file; Vitest reads it | The sentence and `not admitted, no catalog row` | The row contains the sentence. The bar has no CrisperWhisper heading. | 8 tests passed |

Rendered surfaces: not applicable. The artifact is Markdown.

Adversarial pass: the test fails if the bar gains a CrisperWhisper heading or if a catalog id contains `crisper` or `nyra`. No failing proof. `docs/archive/v2/v2.8/known-gaps.md` was not edited by this plan.

Implementation convergence: the required home is DF-v290-1. No convergence phase was appended. T012 is this phase's publication step.

### Goal-vs-plan sufficiency

| Question | Answer | Evidence |
|---|---|---|
| What did implementing teach? | `docs/v2/v2.9/known-gaps.md` already existed as the v2.8 carry-forward, so the row was appended. | File header |
| What assumption was false? | None that changes the landing. The bar still lacks the v2.8.0 sentences. | Acceptance bar search |
| What would a reader of the Goal miss? | None. A missing verbatim speech model is not a miss. | DF-v290-1 |
| What did the maintainer ask for outside the plan? | Archive v2.8 first, then release, cleanup, and archive v2.9. Those are the driver. | This session |

`fix_rerun_cycles_used`: 0.

## Goal-vs-codebase review

**Goal restated**: CrisperWhisper 2.0 is recorded as not admitted, in the living acceptance bar when the v2.8.0 exclusion sentences are already there, otherwise as one v2.9.0 known-gap row, and it never becomes a catalog row, a runtime fork, or a download.

**What satisfies it**: DF-v290-1. The bar has no CrisperWhisper text. Catalog ids contain neither `crisper` nor `nyra`. `runtimes/audio/engines.py` is unchanged.

**Gap**: The living bar still does not contain the sentence. That is the planned wait, recorded as the suggested next step on DF-v290-1.

## Human/manual testing suggestions

Read DF-v290-1 and confirm Settings and the installer model list do not offer CrisperWhisper. Do not transcribe audio with that model.

## Full-suite testing and stabilization

```
npm test -- --reporter=dot
Test Files  4 failed | 551 passed | 3 skipped (558)
Tests  8 failed | 5925 passed | 19 skipped (5952)
Duration  88.15s
```

The 8 failures were `Test timed out in 5000ms` in the same worktree and golden-runner cases as v2.8.0. Dedicated re-run with `configs/vitest.config.ts` and `--testTimeout=180000`:

```
Test Files  4 passed (4)
Tests  14 passed (14)
Duration  29.92s
```

Classification: environment. Those tests spend about 6 to 8 seconds creating a worktree. Benchmark fixtures the suite rewrote were restored and are not in this commit.

Phase 1 Vitest: 8 passed. `npm run lint` (`eslint src modules`) is outside the changed test file; the pre-push hook enforces it on push.

## Publication and integration

Not started in this section's first write. T012 pushes this branch once and opens the pull request against `develop`.

## Worktree teardown

Not started. The worktree stays until the merge is green.
