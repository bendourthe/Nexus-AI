# v2.6.0 last-phase evidence

**Date**: 2026-09-26
**Branch**: `feat/v2.6.0-adoption`
**Plans**: `docs/v2/v2.6/plans/v2.6.0-adoption-chat-surface.md` and `docs/v2/v2.6/plans/v2.6.0-adoption-qwen38-27b.md`

## Architecture refactor

Scoped scan of `desktop/src/shared/chat`, `desktop/src/shared/security`, `desktop/src/shared/studio`, `core/chat`, and `docs/v2/v2.6`. Empty directories: none. The command printed `EMPTY_SCAN_DONE` and no paths.

`MessageBubble.tsx` still composes children. It imports `BranchControl` and `MermaidDiagram` and renders them as elements. The diagram and branch logic are not inlined in the bubble body.

No files were moved. The v2.6 tree already has `plans/`, `comparisons/`, and `development/`.

## Known-gaps reconciliation

Open file for this version: `docs/v2/v2.6/known-gaps.md` (status in-progress). Archived known-gaps files were read for NI-2 and NI-3 only.

- NI-2 stays resolved (`docs/archive/v2/v2.4/known-gaps.md`, 2026-09-21). `rg` for `^def _check_.*_entry` in `catalog_invariants.py` printed `entry_def_count=0`. This cycle did not add a `_check_*_entry` function.
- NI-3 stays resolved in that same file. Neither plan reopened it. No Chat feature was dropped. STRATEGY.md section 4 confirms Chat pillar rank 2 on 2026-09-26.
- New rows: `DF-v260-1`, `QG-v260-1`, `DF-v260-2`, `DF-v260-3`, `DF-v260-4`, `DF-v260-5`, `DF-v260-6`, `WN-v260-1`.
- `CI-v251-1` stays open. Re-checked 2026-09-26.

Carried v2.4 rows in the v2.6 file were not marked resolved.

## Living docs architecture

Present:

- `docs/handbooks/markdown/atlas.md` and `docs/handbooks/html/atlas.html`
- `docs/handbooks/technical/` (`installer-runtime.md`, `media-runtime.md`, `transcript-and-workspaces.md`) with matching files under `docs/handbooks/html/technical/`
- `docs/decisions/README.md`
- `docs/DEVLOG.md`, `docs/todos.md`

`docs/README.md` was not found at that path in this check. `docs/testing/` and `docs/validation/` were not created.

No handbook section documents the Qwen3.8 catalog guard or the Chat pillar bar. That is a finding. No handbook was created to close it.

## Git-tree hygiene

Command: `python scripts/check_release_preconditions.py --branches --repo-settings`

```
[branches]
current=feat/v2.6.0-adoption
head=721ad91c12e3
protected_checkout=no
working_tree=dirty
origin=https://github.com/bendourthe/Nexus-AI.git
upstream=(none)
local_count=16
merged_into_head_count=10

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

`working_tree=dirty` is the untracked `docs/v2/v2.10/` tree, which this cycle did not add and did not stage. Nothing was deleted.

## CI/CD coverage

Provider: GitHub Actions (`.github/workflows/`).

Observed:

- Aggregate required check: `ci.yml` job `ci-required` (`name: ci-required`). Branch protection on `develop`, re-read 2026-09-26 with `gh api repos/bendourthe/Nexus-AI/branches/develop/protection`, returns `contexts: ["ci-required"]` and `strict: false`. The 2026-09-15 note of 16 separate required checks is stale.
- `check-command-parity` is a needed job of `ci-required` and runs `node scripts/check-command-parity.mjs`.
- `installer-tests.yml` path-filters `core/registry/catalog.json` on push and pull_request.
- `scripts/installer/build/check-catalog.py` calls `validate_catalog` and exits non-zero on problems.
- `scripts/installer/build/nexus-installer.spec` calls `validate_catalog` and `raise SystemExit` on problems.
- `installer-build.yml` builds `NexusSetup.exe` via `scripts/installer/build/build-windows.ps1`, which runs `pyinstaller build/nexus-installer.spec`. `installer-linux.yml` and `installer-macos.yml` exist and are called from `installer-matrix.yml`. A line-by-line proof that the Linux and macOS scripts invoke the same spec was not re-read in this pass; the Windows path was.
- `Installer tests` is not a required context. Adding it was not applied. That remains `CI-v251-1`.

New chat commands `chat.explorer.forkChat`, `chat.explorer.setActiveLeaf`, `chat.compact`, and `chat.compact.undo` are in `IPC_METHODS` and `configs/command-capabilities.json`. `export_diagram` is a Tauri command. It is not in the sidecar map, because a map row without an IPC method fails parity. The grant is `dialog:allow-save`.

Mermaid is a workspace dependency. The packaged offline probe was not re-run (`QG-v260-1`).

No workflow file was edited.

## Tier 3 deep pass

`references/deep-pass.md` is not in this repository or in the local functional-verification skill copy that was searched. The pass below is the plan verification commands re-run in this session, not a claim that the missing runbook was executed.

Observed:

- Shipped catalog pattern scan: `MATCHES []`.
- `qwen3.8:27b` matches. `qwen3:8b` and `Qwen/Qwen3-8B` do not.
- Guard message: `qwen3.8:27b: Qwen3.8 family is not admitted. See docs/reference/model-acceptance.md`.
- Spare list for `qwen3:8b`: `SPARE []`.
- Catalog invariant file: `60 passed` (measured earlier this session).
- `check-catalog.py`: `OK (40 models)`, exit 0.
- Qwen commits `bc637dc3^..721ad91c` have an empty diff for `core/registry` and `desktop`.
- Combined `origin/develop...HEAD` does change `desktop/` (31 files, the chat-surface plan). `core/registry/` was not in that stat.
- MessageBubble composes `BranchControl` and `MermaidDiagram`.

Findings left open, already owned in `docs/v2/v2.6/known-gaps.md`: `DF-v260-1`, `QG-v260-1`, `DF-v260-2`, `DF-v260-3`, `DF-v260-4`, `DF-v260-5`, `DF-v260-6`.

## Goal-vs-codebase review

### Chat surface

Goal restated: close conversation forking, Mermaid rendering with versioning and export, a context-pressure readout, and user-initiated compaction, without widening the artifact sanitiser or putting existing history at risk.

| # | Criterion | Result |
|---|---|---|
| 1 | Chat pillar bar, including default-visibility rules | Met. `docs/reference/chat-surface-bar.md`. Linked from `AGENTS.md` and `CONTRIBUTING.md`. |
| 2 | A thread branches and both branches survive a restart | Met for `ChatHistoryStore` and `ChatExplorerStore`. Tests reopen the database. |
| 3 | Legacy database reads; newer schema is refused | Met. `NewerSchemaError` and the legacy read test. |
| 4 | Mermaid fence renders; `FORBIDDEN_TAGS` unchanged | Met. Shared module list is `style,iframe,object,embed,link,meta,base`. Readable-label test uses an injected SVG, not a live Mermaid layout in jsdom. |
| 5 | Attack corpus stripped | Met in `desktop/tests/artifactGuards.test.tsx`. |
| 6 | SVG and PNG export; no network attempt; no general `fs` write | Met for the sanitiser and the dialog command. Packaged offline probe not re-run (`QG-v260-1`). SVG namespace `http://www.w3.org/2000/svg` remains. Other `http` URLs are stripped. |
| 7 | `known + unaccounted = total` | Met in `core/chat/contextAccounting.ts` and `tests/unit/chat/contextPressure.test.ts`. |
| 8 | User compaction preserves recent turns, rejects a streaming turn, and is reversible | Met in memory. Not met across an app restart (`DF-v260-2`). |

M5: forking, diagrams, export, and compaction are maintainer-observed. Review date: the v2.8.0 close, and not later than 2026-11-26 if that release has not shipped.

### Qwen3.8

Observable definition of done, checked against files and this session's commands:

| Item | Result |
|---|---|
| Family section names Flash-Next, 27B, and Qwen3-8B | Met. `docs/reference/model-acceptance.md` |
| Contested job is the 24 GB coding fallback held by `qwen3-coder:30b` | Met |
| Two-path reopening trigger; neither path admits by itself | Met |
| Guard covers catalog admission only | Met |
| v2.3.0 record scoped to Flash-Next; decision unchanged | Met |
| Living-document mentions qualified | Met for the four files named in Phase 1. Archives left alone (`WN-v260-1`) |
| Pattern matches the four spellings and spares Qwen3-8B and the qwen3.5 / coder / embedding ids | Met by the unit tests and this session's `SAMPLES` print |
| Failure names `model-acceptance.md`; allowlist empty | Met. Quoted message above |
| Catalog invariant tests pass, including the shipped-catalog scan | Met. `60 passed`. Scan `MATCHES []` |
| Evidence file distinguishes not-observed from passed | Met. This file |
| Known-gaps file carries v2.4 rows and the residuals | Met |
| `core/registry/` and `desktop/` unchanged | Met for the Qwen commits (empty diff). Not met for `origin/develop...HEAD`, because the chat-surface plan on this same branch edits `desktop/`. Catalog JSON was not in that desktop stat. |

No handbook line was added. That is the finding from sub-task 3.1, left as a finding.

## Human/manual testing suggestions

- Keyboard-only and screen-reader pass on Branch from here, the diagram, the version buttons, the context readout, and Compact thread.
- Export a diagram to SVG and PNG and open both in an external viewer. Confirm the SVG has no remote image.
- Branch a real thread of at least four turns, restart the app, and confirm the active branch is the one that was open.
- Read the Qwen3.8 family section cold and answer which artifact is which, and what the 27B would have to beat.

## Full-suite testing and stabilization

Desktop suite, measured 2026-09-26: `npm test --prefix desktop` reported `Test Files  1 failed | 242 passed (243)` and `Tests  1 failed | 2218 passed | 1 skipped (2220)` in 195.17s. The failure was `sidecar-handlers.test.ts` expecting `NotImplementedError` for `chat.compact` and the other new methods, which are implemented and rejected an empty payload with `ZodError`. Those four methods were added to the implemented allowlist. Re-run: `tests/sidecar-handlers.test.ts` 26 passed. The full suite was not re-run after that one-file fix.

Catalog invariant file, this session: `60 passed in 0.14s`.

`check-catalog.py`, this session: exit 0, `OK (40 models)`.

Command parity, earlier this session after the compaction commands: `command-parity: PASS commands 145, exempt 26, findings 0`.

## Publication and integration

Not done in this file's first draft. The branch has not been pushed. Required check on `develop` is `ci-required`.
