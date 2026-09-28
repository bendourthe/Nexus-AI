# v2.7.0 last-phase evidence

**Plan**: [v2.7.0-adoption-avatar-install-gate.md](../plans/v2.7.0-adoption-avatar-install-gate.md)
**Revision**: `993ab92d` plus the Phase 3 working tree (confirm-reset test and this file)
**Integration base**: `origin/develop` at `a9d51f0c`

## Architecture refactor

Propose-only. No file was moved.

Empty-directory scan (excluding `node_modules`, `.git`, `out`, `dist`, `target`, `coverage`, `.venv`):

```text
.vscode-test\inspect-user\User
desktop\src-tauri\.ruff_cache\0.15.11
modules\coding\skills\catalog\__nonexistent_user__
modules\coding\skills\catalog\__none__
```

Those are a local VS Code test profile, a ruff cache, and skill-catalog sentinel names. They were not deleted.

`docs/v2/v2.7/` holds the plan, the comparison, `known-gaps.md`, session history, and this evidence file. No duplicate plan was relocated. Docs layout was not migrated to `docs/releases/` in this phase; the repository's living version tree is `docs/v2/v2.7/`, which is where this plan already lives.

## Known-gaps reconciliation

Glob `docs/**/known-gaps.md` found the v2.7 file plus archived ledgers. `docs/v2/v2.6/known-gaps.md` is not on this branch; the archived copy is `docs/archive/v2/v2.6/known-gaps.md` with status archived and rows carried here.

Disposition for this plan:

- Phase 1 added no product gap.
- Phase 2 wrote `### Empero 35B-A3B distill` because `## Qwen3.8 family` is already in `docs/reference/model-acceptance.md`. The wait row was not used. That subsection is still accurate.
- DF-8 in `docs/archive/v2/v2.0/known-gaps.md` stays open. This plan did not import a LongCat inference tree. The row still says the adapter runs the stub executor.

Carry-forward rows in `docs/v2/v2.7/known-gaps.md` (BG-2, DF-1, WN-2, the v2.4, v2.5, and v2.6 ids) stay open. They are outside this plan. Files whose status line is still `in-progress` in the archive (including v2.0, v2.3, v2.4, v2.5, and several v1 files) were not closed from here. Closing them would rewrite history this plan does not own.

New rows from this phase: QG-v270-1, QG-v270-2, QG-v270-3.

## Living docs architecture

Present:

- `docs/handbooks/markdown/` (atlas and generation recovery), `docs/handbooks/html/`, `docs/handbooks/technical/`
- `docs/decisions/README.md` pointing at `docs/adr/`
- `docs/README.md`, `docs/DEVLOG.md`, `docs/todos.md`

`docs/testing/` and `docs/validation/` were not created.

Command:

```text
npm run docs:handbooks:check
```

Exit 1. Five HTML files were reported stale. `git ls-files --eol` for `docs/handbooks/html/atlas.html` and `docs/handbooks/markdown/atlas.md` is `i/lf w/crlf`. The check compares working-tree bytes to an LF render. This plan did not edit those Markdown sources, so the HTML was not regenerated. Recorded as QG-v270-1.

## Git-tree hygiene

Command:

```text
python scripts/check_release_preconditions.py --branches --repo-settings
```

```text
[branches]
current=feat/v2.7.0-adoption-avatar-install-gate
head=993ab92d91c7
protected_checkout=no
working_tree=dirty
origin=https://github.com/bendourthe/Nexus-AI.git
upstream=(none)
local_count=19
merged_into_head_count=13

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

The dirty tree at scan time was `docs/index.md` and untracked `docs/v2/v2.10/`, which are not part of this plan, plus the Phase 3 files written after `993ab92d`. No branch was deleted.

`delete_branch_on_merge` is false. Enabling it is `gh repo edit --delete-branch-on-merge`. Not run.

Required checks observed with `gh api`:

- `develop`: `["ci-required"]`
- `main`: `["ci-required"]`

## CI/CD coverage

Provider: GitHub Actions (`.github/workflows/*.yml`). Not "none detected".

| Field | Evidence | Result |
|---|---|---|
| Repository-native profiles | `package.json` has `test`, `lint`, `build`, `test:shell`, `docs:handbooks:check`. It has no scripts named `fast`, `full`, `platform`, `report`, or `release`. | Difference. Not applied. QG-v270-2 |
| Event separation | `ci.yml` runs on push (except `dependabot/**`) and on pull requests to `main` and `develop`. | Present |
| Runner selection | `ubuntu-latest` for the aggregate and the TypeScript jobs. | Present |
| Always-resolving aggregate | `ci-required` has `if: always()` and fails unless each needed job is `success` or `skipped`. Branch protection on `main` and `develop` requires only `ci-required`. | Present |
| Permissions | No workflow-level `permissions` block. `ci-required` sets `contents: read`. | Difference. Not applied. QG-v270-2 |
| Immutable action references | `actions/checkout`, `actions/setup-node`, and `actions/upload-artifact` are pinned to commit SHAs with version comments. | Present |
| Caching | `actions/setup-node` uses `cache: npm`. | Present |
| Concurrency | `ci.yml` `concurrency` group cancels in progress. | Present |
| Path scoping | Desktop Vitest runs inside `test-ts` on Node 22 with no new path. This plan added no workflow path. | Covered |
| Artifact retention | Coverage and build artifacts set `retention-days` (7, 14, or 30). | Present |
| Structured reports | `test-ts` uploads `coverage/`. | Present |
| Deployment boundaries | This plan does not deploy. Installer builds stay in their own workflows. | No change |
| Failure recovery | `ci-required` fails closed on any result other than success or skipped. | Present |
| Installer parity | `.github/workflows/installer-matrix.yml` calls Windows, Linux, and macOS workflows and aggregates `installer-required`. Local execution of those installers was not run. | QG-v270-3 |

This plan's tests stay on existing jobs: root Vitest (`tests/unit/core/video/avatarGate.test.ts`, `tests/unit/docs/v2.4.9-model-acceptance.test.ts`) and desktop Vitest (`desktop/tests/VideoLabPage.test.tsx` via `npm run test:shell` on Node 22). No workflow file was edited.

## Tier 3 deep pass

### Tier 3 blast-radius verdict

- **Verdict**: run
- **Diff evidence**: `core/video/avatarGate.ts`, `desktop/src/modules/video/VideoLabPage.tsx`, `desktop/src/modules/video/VideoPromptForm.tsx`, `desktop/tests/VideoLabPage.test.tsx`, `docs/reference/model-acceptance.md`
- **Positive triggers**: user-facing Video Lab behavior and output text changed; the acceptance bar (a living contract) changed
- **Ambiguity check**: not ambiguous

Feature inventory (2 features, 2 exercised, 0 uncovered by the named commands):

| Feature | Source | Boundary | Observed |
|---|---|---|---|
| Avatar offer and install refusal | Phase 1, T001-T004 | `VideoLabPage` via Vitest | 34 page tests passed, including missing weights, registry submit, below-tier photo, non-registry sources, and confirm reset. Avatar gate unit tests: 13 passed |
| Empero distill exclusion | Phase 2, T006 | `docs/reference/model-acceptance.md` | Doc test 6 passed. Catalog invariant pytest 60 passed. No `empero` or `Qwen3.8-35B-A3B` catalog id |

### Functional exercise - avatar install gate

- **Revision**: Phase 3 tree
- **Command**: `npx vitest run tests/VideoLabPage.test.tsx` from `desktop/`
- **Expected**: missing weights refuse with no `image2video` or `audio2video`; registry row plus a checked confirm submits `audio2video`; below-tier photo stays `image2video` with no install sentence; a disappearing row clears the confirm control
- **Observed**: the file's 34 tests passed, including `clears a checked confirm when the official avatar row disappears`
- **Comparison**: matches
- **NOT COVERED**: packaged Tauri window and `scripts/detect_visual_defects.py` (the page is a React component, not a static HTML handbook). Browser-testing, accessibility-engineering, and hallmark-design were not run as separate passes. Rendered-surface delegates are not applicable to the jsdom component test the plan named.

### Functional exercise - distill note

- **Command**: `npx vitest run tests/unit/docs/v2.4.9-model-acceptance.test.ts` and `uv run pytest tests/test_catalog_invariants.py` from `scripts/installer`
- **Observed**: vitest 6 passed. pytest 60 passed. Subsection states the distill is not the 27B and ends "Not admitted, no catalog row."
- **Comparison**: matches

Adversarial review by [adversarial reviewer](aaf1349f-b6ac-464e-9899-f3109c031590): verdict `no_defect` on the nine named failure modes. The missing page test for the offer drop was then added and passed (`fix_rerun_cycles_used`: 1).

Implementation convergence: Phases 1 and 2 match the plan. No `## Phase 4: Convergence` section was appended, because that skill leaves the plan unchanged when nothing is missing. Phase 3 duties are this file.

Goal-vs-plan sufficiency:

| Question | Answer | Evidence | Change needed now |
|---|---|---|---|
| What did implementing teach that the plan did not know? | The below-tier photo assertion needs the composer thumbnail before submit, or the turn is text-to-video. | First test run received `text2video` | Fixed in the Phase 1 test before that commit |
| What did the plan assume that turned out false? | Nothing that changed a later phase. The Qwen3.8 family section was present, so the subsection path was correct. | `docs/reference/model-acceptance.md` | None |
| What would a reader of the Goal expect that no phase delivered? | A sampled talking-head clip. The Goal says installing and confirming does not produce one while DF-8 is open. | Plan Goal and DF-8 | None |
| What did the maintainer ask for that no task captured? | The full plan, known-gap triage, release, and v2.7 archive. Release and archive are the handoff after integration, not a missing Phase 1 or 2 task. | User goal | After the pull request is green |

`fix_rerun_cycles_used`: 1. Fix: page test that clears the confirm when the avatar row disappears. Rerun passed.

Gate disposition: the five phase gates for the avatar behavior passed on the named Vitest commands. QG-v270-1, QG-v270-2, and QG-v270-3 are recorded and do not block the avatar behavior. Full-suite counts are in the next section.

## Goal-vs-codebase review

**Goal restated**: On a diffusion-pro host, talking-head video is offered only when the official LongCat Avatar 1.5 weights are installed. A capable host without those weights can still attach a photo and audio, and is told to install the weights instead of being routed into an ordinary image-to-video job. Installing the weights and confirming does not by itself produce a sampled talking-head while DF-8 is open. The Empero Qwen3.8-35B-A3B distill is recorded as not admitted, either in the acceptance bar or in a v2.7.0 known-gap row, and never as a catalog row.

Artifacts that satisfy it:

- `avatarOffered`, `officialAvatarInstalled`, and `avatarInstallRefusal` in `core/video/avatarGate.ts`
- `hardwareAllowsAvatar` versus `offered` in `desktop/src/modules/video/VideoLabPage.tsx`
- The form prop comment in `desktop/src/modules/video/VideoPromptForm.tsx` and `avatarAvailable={offered}`
- `### Empero 35B-A3B distill` in `docs/reference/model-acceptance.md`
- Tests named in the Tier 3 section

Gap: a confirmed `audio2video` submit can still hit the stub. That is DF-8, and it is the expected result. A green Video Lab test is not evidence that a talking-head clip was sampled.

## Human/manual testing suggestions

On a diffusion-pro machine without the avatar weights, Video Lab should not offer talking-head, and a photo plus audio should not start an image-to-video job. After the official weights are installed, the confirm switch should appear, and a confirmed submit should be attempted locally. Do not judge lip-sync quality. That is DF-8, and the adapter may still be a stub.

## Full-suite testing and stabilization

Root Vitest, `npx vitest run --config configs/vitest.config.ts --reporter=dot`, exit 0:

```text
Test Files  555 passed | 3 skipped (558)
Tests  5938 passed | 12 skipped (5950)
Duration  119.31s
```

Desktop Vitest, `npx vitest run --reporter=dot` from `desktop/`, exit 1 under the same window as the root suite:

```text
Test Files  2 failed | 241 passed (243)
Tests  6 failed | 2218 passed | 1 skipped (2225)
Duration  254.92s
```

The six failures were timeout and cancellation races in `tests/video2x-adapter.test.ts` (4) and `tests/windows-video-process-host.test.ts` (2). Neither file is touched by this plan. Isolated re-run, exit 0:

```text
Test Files  2 passed (2)
Tests  89 passed | 1 skipped (90)
Duration  12.52s
```

Phase-scoped commands: avatar gate 13 passed, Video Lab page 34 passed, model-acceptance doc test 6 passed, catalog invariants 60 passed.

Desktop eslint on the Phase 1 source files exited 0 before the Phase 1 commit. The Phase 3 addition is the confirm-reset test in `desktop/tests/VideoLabPage.test.tsx`.

## Publication and integration

Not started in this revision. The branch is local. Required check expected on the integration pull request: `ci-required`.
