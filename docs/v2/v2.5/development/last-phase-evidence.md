# Closeout evidence for the v2.5.0 and v2.5.1 work on this branch

Quoted from the local tree on `feat/v2.5.0-adoption-diffusionstudio-editor` before the branch push.

## CI/CD coverage

`node scripts/check-command-parity.mjs` printed:

```
command-parity: PASS commands 141, exempt 26, findings 0
```

`node scripts/check-release-assets.mjs` printed:

```
release-assets: PASS parity 3 artifacts
```

`.github/workflows/ci.yml` runs both checks with no path filter. `.github/workflows/semantic-release.yml` runs the artifact parity check before `npx semantic-release`. Both jobs passed on the integration pull requests before merge.

## Known-gaps reconciliation

Open rows in `docs/v2/v2.5/known-gaps.md` for this work:

- `DF-v250-1` screenshot and capture stay deferred.
- `QG-v250-1` live sidecar context was not observed.
- `QG-v250-2` migration snapshot tests did not load `better-sqlite3` (ABI 146 vs Node ABI 137).
- `MT-v251-1` closed. Desktop eslint reports 0 jsx-a11y warnings and the ceiling is 0.
- `QG-v251-2` packaged Tauri window was not launched.

Archived v2.4 gaps were not closed by these plans.

NI-3 stays resolved. The archive records that resolution on 2026-09-21, and `desktop/sidecar/src/protocol.ts` still imports `MODEL_FAMILIES` from `core/registry/ModelCatalog`. Command parity does not detect a duplicated enum, so this plan does not treat NI-3 as closed by Phase 2.

Other `docs/**/known-gaps.md` files whose status is still `in-progress` (`docs/archive/v2/v2.0`, `v2.3`, `v2.4`, and `docs/archive/v1/v1.5`, `v1.19`, `v1.20`) were not changed. Nothing observed in this cycle closes their rows.

## Architecture refactor

Scoped to the paths these plans added. No files were moved.

`npx depcruise --config configs/dependency-cruiser.cjs src core modules --output-type err` printed:

```
x 17 dependency violations (0 errors, 17 warnings). 484 modules, 1667 dependencies cruised.
```

The warnings are pre-existing `no-orphans` hits plus two `no-circular` pairs (`modules/coding/browser/headless.ts` and `core/memory/MemoryHub.ts`). `core/cli/jsonCli.ts` is in the orphan list because the cruise roots are `src`, `core`, and `modules`, while its importer is `desktop/sidecar/src/controlSurface/jsonCliRoutes.ts`. That is a cruise-scope miss, not an unused file.

## Living docs architecture

`npm run check:docs-layout` printed:

```
check-docs-layout: canonical layout OK (no docs/versions|docs/archive/versions wrappers)
```

`docs/testing/` and `docs/validation/` were not created.

## Git-tree hygiene

`python scripts/check_release_preconditions.py --branches --repo-settings` printed:

```
[branches]
current=develop
head=2b4ed3b606c4
protected_checkout=yes
working_tree=clean
origin=https://github.com/bendourthe/Nexus-AI.git
upstream=origin/develop
local_count=14
merged_into_head_count=8

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

No branch was deleted.

## Human and manual testing

Class (a) is already asserted by the packaged smoke selectors (`chat-page`, `coding-page`, `image-model-select`, `video-lab-page`). These stay manual:

- Class (b): run one GPU image generation and one GPU video generation on the host that has the weights.
- Class (c): look at the four pillar routes and judge spacing, contrast, and motion. jsdom cannot evaluate those.
- Class (d): install `NexusSetup.exe` on a clean Windows machine and confirm the sidecar handshake.
- Keyboard-only and a screen reader over chatbot, agents, images, and videos. The axe baseline was taken under jsdom, which has no layout engine.

## Tier 3 deep pass

This section is the start of the deep-pass record. It is not a finished Tier 3 result.

- Revision under review: `2b4ed3b606c429b776c7a0a7825e0fd224d14251` on `develop`. Integration base for the original publication was `develop` at the PR 69 merge, then `main` at `58b03ed2`.
- Blast-radius verdict: `run`. The diff changes CLI output, desktop UI, persistence snapshots, and release workflows.
- Feature inventory, per-feature exercises, rendered-surface delegates, adversarial-verifier, and implementation-convergence are `NOT COVERED` in this session. Owner: the functional-verification deep pass. Next step: walk `references/deep-pass.md` steps 3 through 8 against the plan artifacts and quote each exercise.
- `fix_rerun_cycles_used`: 0. No deep-pass fix has been applied.
- Environments that bound the evidence: Windows host, Node v24.13.0 ABI 137, sidecar port 11500 not listening, no packaged Tauri window launched.

## Goal-vs-codebase review

The editor-plan goal (an agent can install Nexus, read one reference tree, load one skill, and drive plus observe through `nexus`) is met in source by `docs/reference/cli/`, `modules/coding/skills/catalog/nexus/SKILL.md`, and `nexus context`, `nexus logs`, and `nexus media inspect`. The live sidecar round trip is `QG-v250-1`.

The migration-durability goal (a failed migration leaves the original, writes a snapshot, and refuses the next open) is implemented in `core/storage/preMigrationSnapshot.ts` and `ChatHistoryStore`. The byte-identical proof was not run. See `QG-v250-2`.

The v2.5.1 goal (machine-checked packaged verification and a first accessibility gate) is met for jsx-a11y, the axe triple baseline, command parity, and the artifact-name list. The packaged window launch is `QG-v251-2`.

## Publication and integration

Pull request 69 merged to `develop` at `c92bdfb15b2ab587b5810fe019bac9d3894a0198`. Pull request 71 merged the CodeQL fixes. Pull request 70 merged to `main` at `58b03ed225c25c27472003f83b6423215fc7c966`. Semantic-release published `v2.5.0` at `da07e4bd9a2330e5c7ede2406607fc01289f1201`. The release page has the three platform VSIX files, `NexusSetup.exe`, and `SHA256SUMS.txt`: https://github.com/bendourthe/Nexus-AI/releases/tag/v2.5.0. `develop` was fast-forwarded to that same commit. There is no separate `v2.5.1` tag, because the commit range since `v2.4.11` includes `feat` commits and semantic-release computed one minor.
