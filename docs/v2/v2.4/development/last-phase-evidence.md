# v2.4.0 last-phase evidence

**Plan**: [v2.4.0-adoption-unsloth-qwen38-gaussian-splatting.md](../plans/v2.4.0-adoption-unsloth-qwen38-gaussian-splatting.md)
**Date**: 2026-09-22
**HEAD at the local gate**: `520a6e77` on `feat/v2.4.0-phase-1-splat-contract`

## Architecture refactor

No files were moved. A tree-wide rename from `docs/v2/` to `docs/releases/` was not applied. The scan that was run:

```text
glob docs/**/known-gaps.md -> 30 files
docs/handbooks/ present (markdown, html, technical companions)
docs/decisions/README.md present
```

Empty directories and duplicate splat modules were not deleted. The splat code lives in `core/image/`, `desktop/src/modules/image/`, and `desktop/sidecar/src/image/`. That split matches the existing core / desktop / sidecar boundary.

## Known-gaps reconciliation

Glob `docs/**/known-gaps.md` returned 30 files, including `docs/v2/v2.4/known-gaps.md` and the v1, v2.0-v2.3, and archive copies. No `docs/releases/**/known-gaps.md` file was found.

This pass added `## v2.4.0` with DF-v240-1, DF-v240-2, DF-v240-3, MT-v240-1, and QG-v240-1. It did not mark v2.4.10 BG-2, DF-1, or WN-2 resolved. Those still depend on unpublished ControlNet hashes and on Ollama stripping MiniCPM tool tags. Older gap files stay in progress (DF-v240-3).

## Living docs architecture

`docs/handbooks/README.md` says markdown is authoritative and names `npm run docs:handbooks:check`. Present paths include `docs/handbooks/markdown/atlas.md`, `docs/handbooks/markdown/generation-recovery.md`, technical companions, and matching files under `docs/handbooks/html/`. `docs/decisions/README.md` exists. `docs/DEVLOG.md` and `docs/v2/v2.4/known-gaps.md` exist. `docs/testing/` and `docs/validation/` were not created.

The handbook check command was not re-run in this pass. HTML freshness against the new splat pages is not proven here.

## Git-tree hygiene

Command: `python scripts/check_release_preconditions.py --branches --repo-settings`

```text
[branches]
current=feat/v2.4.0-phase-1-splat-contract
head=520a6e77ee43
protected_checkout=no
working_tree=clean
origin=https://github.com/bendourthe/Nexus-AI.git
upstream=origin/feat/v2.4.0-phase-1-splat-contract
local_count=11
merged_into_head_count=5

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

Nothing was deleted.

## CI/CD coverage

The active CI is GitHub Actions. `.github/workflows/ci.yml` triggers on push (ignoring `dependabot/**`) and on pull requests to `main` and `develop`. Concurrency group `ci-${{ github.workflow }}-${{ github.head_ref || github.ref }}` cancels in progress. Desktop tests run via `npm run test:shell` on Node 22. `shell-build.yml` runs desktop lint, typecheck, and coverage.

New tests sit in existing globs (`desktop/tests/**`, `tests/unit/**`). No workflow file was edited. A field-by-field rewrite of permissions, action pins, and caches was not applied. That decline is QG-v240-1's neighbor: the pipeline already runs the new tests, and a topology change was not this phase's deliverable.

Installer parity: the repository has one Python installer. No second installer was compared. Catalog invariants for `triposplat` reported `triposplat: no invariant problems`.

## Tier 3 deep pass

Scoped runs, not the whole-plan suite:

- `desktop/tests/gaussian-splat-runtime.test.ts`: 5 passed
- `desktop/tests/tripoSplatAdapter.test.ts`: 2 passed
- `desktop/tests/SplatPreviewPanel.test.tsx`: 5 passed
- `tests/unit/core/image/SplatGenerate.test.ts`: 3 passed
- catalog, packaging, and model-acceptance: 61 passed
- `node scripts/bench-gaussian-splat.mjs`: fake mode `validation: pass`; `--real` `not proven here`

A cross-phase browser orbit of a generated splat was not run. MT-v240-1 records that.

## Goal-vs-codebase review

**Goal**: Image Studio can orbit a local Gaussian splat or PLY beside a 2D generation without a network call, optionally create that splat on NVIDIA hardware through a cancellable local job that never replaces the source image, and tell the user that unseen geometry is synthesized. Unsloth Qwen3.8-Flash-Next stays out of the catalogs. No 3D AI Studio path is introduced.

**Present**:

- Local decode and a WebGL2 canvas reject remote URLs (`core/image/GaussianSplat.ts`, `SplatViewerCanvas.tsx`).
- Image Studio has a 3D preview button and the honesty sentence (`SplatPreviewPanel.tsx`).
- Generate is a child job on `GenerationQueue`, with CUDA preflight before the scheduler (`SplatGenerate.ts`, `splatGenerateQueue.ts`).
- The source PNG is compared before and after promotion (`GaussianSplatRuntime.ts`).
- TripoSplat is opt-in, not in `recommended.json`, and the adapter uses `shell: false`.
- Catalog tests still exclude `qwen3.8-flash-next`.

**Miss, recorded rather than passed**:

- A supported NVIDIA host generating a real splat is not proven (DF-v240-1).
- Weight hashes are absent on purpose (DF-v240-2).
- A real GPU canvas screenshot is not proven (MT-v240-1).

## Human/manual testing suggestions

These were not performed here.

1. Open a local `.splat` on a machine with WebGL2, orbit it, and save a PNG.
2. Read the honesty sentence in the 3D preview panel.
3. On an NVIDIA CUDA host with weights installed, generate from a finished image and confirm the PNG bytes do not change.
4. On macOS or a machine without CUDA, confirm generate does not start and the reason is visible.
5. Cancel a running generate and confirm the staged splat is removed.
6. Confirm no request is sent to 3daistudio.com during view or generate.

## Full-suite testing and stabilization

Desktop `npx tsc --noEmit` exited 0 after the adapter landed. The scoped Vitest commands above passed. `npm test` at the repository root was not run. QG-v240-1 records the `better-sqlite3` ABI mismatch (module 146, this Node wants 137). The SQLite queue test `tests/unit/core/generations/splatGenerateQueue.test.ts` is in the tree for CI and did not execute locally.

## Publication and integration

Not done in the commit that adds this file. The branch is local-only relative to the commits after `f8673be8`. Required checks are not quoted because they have not been re-run on this HEAD. `/update release` stays blocked until this branch is merged to `develop` and those checks are green.
