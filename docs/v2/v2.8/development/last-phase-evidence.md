# Last-phase evidence - v2.8.0 Qwen-Image and Nimble exclusion

**Plan**: `docs/v2/v2.8/plans/v2.8.0-adoption-qwen-image-nimble.md`
**Branch**: `feat/v2.8.0-qwen-image-nimble`
**Worktree**: `C:\Users\bdour\Documents\Projects\Development\Nexus-AI-v2.8.0-qwen-image-nimble`
**Phase 1 commit**: `40c86b7097d2b53fea6cca0123507c7284ba802b`
**Date**: 2026-09-27

## Architecture refactor

Empty-directory scan (Python `os.walk`, skipping `node_modules`, `.git`, `dist`, `coverage`, `target`, and dot directories):

```
EMPTY_COUNT 0
NONE
```

No files moved. The plan allows a quoted empty scan to complete this duty, and a repo-wide move still needs its own confirmation. Layout stays `docs/v2/v2.8/`.

`npm run check:docs-layout`:

```
check-docs-layout: canonical layout OK (no docs/versions|docs/archive/versions wrappers)
```

## Known-gaps reconciliation

DF-v280-1 is still the only v2.8.0 exclusion row. It names `abenzerps/Qwen-Image-2.1-Uncensored-GGUF` and Bespoke Nimble, says why each is not admitted, and ends with `not admitted, no catalog row`. It was not copied into `docs/reference/model-acceptance.md`.

DF-11 stays open. Heading in `docs/archive/v2/v2.0/known-gaps.md`: `##### DF-11 - Fast small-model command router is not built`. This plan does not edit that file and does not adopt Nimble.

In-progress known-gaps files found by reading each `**Status**` line (canonical `docs/releases/**/known-gaps.md` glob matches nothing in this repo):

- `docs/archive/v1/v1.19/known-gaps.md`
- `docs/archive/v1/v1.20/known-gaps.md`
- `docs/archive/v1/v1.5/known-gaps.md`
- `docs/archive/v1/v1.8/known-gaps.md`
- `docs/archive/v2/v2.0/known-gaps.md` (holds DF-11)
- `docs/archive/v2/v2.3/known-gaps.md`
- `docs/archive/v2/v2.4/known-gaps.md`
- `docs/archive/v2/v2.5/known-gaps.md`
- `docs/v2/v2.8/known-gaps.md`

Those older files stay as they are. This exclusion note does not close them. `docs/v2/v2.0/known-gaps.md` is not a live path; the row lives under `docs/archive/v2/v2.0/`.

## Living docs architecture

Present and unchanged by this plan:

- `docs/handbooks/markdown/atlas.md`
- `docs/handbooks/markdown/generation-recovery.md`
- `docs/handbooks/technical/installer-runtime.md`
- `docs/handbooks/technical/media-runtime.md`
- `docs/handbooks/technical/transcript-and-workspaces.md`
- matching files under `docs/handbooks/html/`
- `docs/decisions/README.md`
- `docs/README.md`
- `docs/DEVLOG.md`
- `docs/todos.md` (living tracker; not edited)

`docs/testing/` and `docs/validation/` were not created.

`npm run docs:handbooks:check` exited with the generator's stale report:

```
generate-handbooks: 5 generated file(s) are missing or stale
  - docs\handbooks\html\atlas.html
  - docs\handbooks\html\generation-recovery.html
  - docs\handbooks\html\technical\installer-runtime.html
  - docs\handbooks\html\technical\media-runtime.html
  - docs\handbooks\html\technical\transcript-and-workspaces.html
```

The checker hashes the working-tree Markdown bytes (`scripts/generate-handbooks.mjs`). On this Windows checkout those bytes are CRLF while the committed HTML was generated from LF. That is the existing carry-forward `QG-v270-1`. This plan did not edit handbook Markdown, so the HTML was not regenerated.

## Git-tree hygiene

```
python scripts/check_release_preconditions.py --branches --repo-settings
```

```
[branches]
current=feat/v2.8.0-qwen-image-nimble
head=40c86b7097d2
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

**DETECT**: GitHub Actions. Active workflow `.github/workflows/ci.yml` plus sibling workflows (`installer-matrix.yml`, `release.yml`, and others). Not "none detected".

**COMPARE** against the fields named by the plan, from the current `ci.yml` text:

| Field | Evidence | Result |
|---|---|---|
| Profiles | `package.json` scripts include `test`, `lint`, `build`, `check`. There is no `fast`, `full`, `platform`, `report`, or `release` script. | Pre-existing. Already `QG-v270-2`. Not rewritten. |
| Event separation | `push` with `branches-ignore: ["dependabot/**"]` and `pull_request` on `main` and `develop`. | Present |
| Runner selection | `ubuntu-latest` on `lint-ts`, `test-ts`, and `ci-required`. | Present |
| Aggregate required check | Job `ci-required` at line 689, `if: always()`, needs the job list including `test-ts`. | Present |
| Permissions | No workflow-level `permissions` block. Job `ci-required` sets `contents: read` at line 714. | Pre-existing. Already `QG-v270-2`. Not rewritten. |
| Immutable actions | `actions/checkout` pinned to `93cb6efe18208431cddfb8368fd83d5badbf9bfd`. | Present |
| Caching | `actions/setup-node` with `cache: "npm"`. | Present |
| Concurrency | `cancel-in-progress: true` at line 25. | Present |
| Path scoping | Pull request to `develop` is in the branch list so the merge result is tested. This phase adds no new path outside `tests/unit/`. | Covered by `npm run test` |
| Artifact retention | `audit-runtimes` uses `retention-days: 30`. | Present on that job |
| Structured reports | `test-ts` runs `npm run test -- --reporter=verbose --coverage`. | Present |
| Deployment boundaries | Release publishing stays in `release.yml`, not this docs change. | Unchanged |
| Failure recovery | Not changed. A red required check reopens the phase. | Unchanged |
| Installer parity | `scripts/check_installer_parity.py` is absent. Installer workflows exist. This plan changes no installer payload. | No-op for this diff. Execution gap remains `QG-v270-3`. |

**PROPOSE**: No pipeline edit. The new assertion is already inside `tests/unit/`, which `test-ts` runs. Rewriting permissions or adding profile scripts is the suggestion already stored on `QG-v270-2`, not a deliverable of this exclusion note.

**APPROVAL**: No pipeline change was applied.

**RECORD**: Declined differences stay `QG-v270-2` and `QG-v270-3`. Owner: the next plan that actually changes CI or an installer. Next step: do not treat this note as that change.

## Tier 3 deep pass

### Tier 3 blast-radius verdict

- **Verdict**: run
- **Diff evidence**: `docs/v2/v2.8/known-gaps.md` (prose row), `tests/unit/docs/v2.4.9-model-acceptance.test.ts` (new assertion), plus plan checkboxes, DEVLOG, and session history. `core/registry/catalog.json` is not in the diff.
- **Reason**: The diff is not prose-only, because a test file changed. That is enough to leave `no-op`. None of the five product triggers (UI, generated HTML, catalog payload, security boundary, public API) changed.
- **Ambiguity check**: The test file makes the classification `run`.

### Feature inventory

| Feature | Source phase or task | Artifact and path | Real boundary | Representative input | Observable result | Environment | Evidence status |
|---|---|---|---|---|---|---|---|
| Qwen-Image and Nimble refusal | Phase 1 T001 | known-gap row `docs/v2/v2.8/known-gaps.md` DF-v280-1 | Read the file; Vitest reads it | The committed row | Both names and `not admitted, no catalog row`; bar has no new subsection | Node v24.13.0, Windows | passed |
| Catalog unchanged | Phase 1 stability gate | `core/registry/catalog.json`, `recommended.json` | Parse ids | needles `qwen-image`, `abenzerps`, `nimble`, `bespoke` | `hits NONE` on 40 catalog ids; recommended hits `NONE` | Python 3.12 | passed |

### Exercise

```
npx vitest run tests/unit/docs/v2.4.9-model-acceptance.test.ts --reporter=dot
Test Files  1 passed (1)
Tests  7 passed (7)
```

Rendered surfaces: not applicable. The artifact is Markdown, not a browser UI or generated HTML shipped as the feature.

Adversarial pass: the attack surface is the gap file and the two JSON catalogs. Checks run: catalog id scan (no hits), recommended text scan (no hits), acceptance-bar `Select-String` for the artifact names (no hits), and the Vitest assertion that fails if a heading or those strings appear in the bar. No failing proof. `docs/archive/v2/v2.7/known-gaps.md` is not in the phase diff.

Implementation convergence: Phase 1's required home is DF-v280-1. No catalog id, runtime, or download was added. No convergence phase was appended. T012 (publication) is still this phase's own next step, not missing product work.

### Goal-vs-plan sufficiency

| Question | Answer | Evidence | Change needed now | Owner |
|---|---|---|---|---|
| What did implementing teach that the plan did not know? | `docs/v2/v2.8/known-gaps.md` already existed as a carry-forward register, so the row was appended. | File header before the edit | None. The row is in place. | this phase |
| What did the plan assume that turned out false? | It named DF-11 at `docs/v2/v2.0/known-gaps.md`. The live file is `docs/archive/v2/v2.0/known-gaps.md`. | DF-11 heading quoted above | None. The row cites the archive path. | this phase |
| What would a reader of the Goal expect that no phase delivered? | None found. The Goal is a readable refusal and an unchanged catalog. A missing Qwen-Image pipeline is not a miss. | DF-v280-1 and catalog scan | None | n/a |
| What did the maintainer ask for that no task line captured? | Full implementation, then release and cleanup of merged branches and worktrees. Those are the driver and `/update release`, not a missing product task. | User request | Publication is T012 | this phase |

`fix_rerun_cycles_used`: 0. No deep-pass finding required a tree change.

## Goal-vs-codebase review

**Goal restated**: The community Qwen-Image-2.1 GGUF and Bespoke Nimble are recorded as not admitted, in the living acceptance bar when that file already holds the v2.7.0 exclusion text, otherwise as one v2.8.0 known-gap row, and neither becomes a catalog row, a runtime, or a download.

**What satisfies it**:

- The acceptance bar has no v2.7.0 exclusion subsection, so the home is DF-v280-1.
- The row names both artifacts, states the license, size, loader, and tool-call reasons from the plan, and says `not admitted, no catalog row`.
- Catalog scan: 40 ids, hits `NONE` for `qwen-image`, `abenzerps`, `nimble`, and `bespoke`.
- `recommended.json` has none of those strings.
- No edit to `runtimes/diffusion/pipelines/real_execute.py`.

**Gap**: The living bar still does not contain the two sentences. That is the planned wait, recorded as the suggested next step on DF-v280-1, not an unrecorded miss. A missing image pipeline for the GGUF is not a miss.

## Human/manual testing suggestions

Read `docs/v2/v2.8/known-gaps.md` section `DF-v280-1` and confirm Settings and the installer model list do not offer the Qwen-Image GGUF or Bespoke Nimble. Do not generate an image with that GGUF and do not run Nimble.

## Full-suite testing and stabilization

```
npm test -- --reporter=dot
Test Files  4 failed | 551 passed | 3 skipped (558)
Tests  8 failed | 5924 passed | 19 skipped (5951)
Duration  90.35s
```

The 8 failures were `Test timed out in 5000ms` in worktree-isolation, swarm-orchestration, worktree-read-rooting, and one golden-runner case. Dedicated re-run with `configs/vitest.config.ts` and `--testTimeout=180000`:

```
Test Files  4 passed (4)
Tests  14 passed (14)
Duration  29.78s
```

Those tests spend about 6 to 7 seconds creating a worktree. Under the full suite they miss the 5 second default. They pass when run alone. Classification: environment, not a product regression. Benchmark fixture files the suite rewrote were restored with `git checkout` and are not part of this commit.

Phase 1 Vitest re-run after the phase docs: 7 passed.

`npm run lint` (`eslint src modules`) exited 0 with no findings. The changed test file is outside that scope.

## Publication and integration

Not started in this section's first write. T012 pushes this branch once, opens the pull request against `develop`, and waits for required checks. The merge SHA is added when that result exists.

## Worktree teardown

Not started. The worktree stays until the merge is green.
