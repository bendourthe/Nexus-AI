# Known Gaps - v2.14

**Project**: Nexus
**Status**: in-progress
**Last updated**: 2026-10-16
**Open items**: 13

## v2.14.0

### Summary

| Category | Open | Resolved |
|---|---|---|
| Not implemented (NI) | 0 | 0 |
| Deferred (DF) | 5 | 0 |
| Bugs / regressions (BG) | 0 | 0 |
| Warnings (WN) | 7 | 0 |
| Missing tests / coverage gaps (MT) | 0 | 0 |
| Quality-gate gaps (QG) | 1 | 0 |

### Open Items

#### DF-1 - Candidate runtime compatibility blocks scoring

- **Source phase**: Phase 2.
- **Plan reference**: T005; embedding-eval-results.json.
- **Reason**: Ollama 0.32.15 rejected embeddinggemma-2:270m with HTTP 412 and required a newer runtime. The preflight manifest is pinned at 9e1df58d197e80e5a6c12110efb67b38ba6c8e23790a5044e1cafe6bea34b8f4, 378346995 artifact bytes; installation did not complete. Positive candidate inference and paired quality are not proven here. No runtime/default/index was changed.
- **Suggested next step**: Qualify a compatible Ollama runtime without interrupting other sessions, then explicitly rerun the frozen evaluator to a new evidence file.

- **Migrated from**: v2.13.0#DF-1 on 2026-10-16 (reason: user-deferred)
- **Migration evidence**: left open by v2.13.0, the last plan of v2.13

#### DF-2 - Universal admission evidence is missing

- **Source phase**: Phase 2.
- **Plan reference**: T005 and conditional T007-T010; embedding-eval-results.json.
- **Reason**: Required hardware tiers, whole-runtime peak RAM, supported-context/precision behavior, controlled coding coexistence, process-level offline containment and authoritative distribution terms remain unproven. Every corresponding gate is HOLD; there is no model-admission approval or waived gate.
- **Suggested next step**: Gather each required gate under the frozen contract before proposing a default takeover. Retain the current default and alternative jobs; Phase 3 migration stays conditional. Plan tasks T008-T010 (migration design, identity enforcement, reversible rebuild) were moved out of the plan's task list on 2026-10-15 and are owned by this gap; restore them as tasks in the version that admits the model.

- **Migrated from**: v2.13.0#DF-2 on 2026-10-16 (reason: user-deferred)
- **Migration evidence**: left open by v2.13.0, the last plan of v2.13

#### DF-3 - Saved generated images outlive their session

- **Source phase**: Phase 5.
- **Plan reference**: T015; `desktop/sidecar/src/studio/generatedImages.ts`.
- **Reason**: Phase 5 writes each generated Image Studio PNG to `~/.nexus/generations/images/<sha256>.png` so its turn can be reopened and edited. Deleting a session removes its turns and recipes, but not these files, because the plan requires shared original media to be preserved and one file can back several turns. A user who deletes a session may expect its images gone from disk.
- **Suggested next step**: Decide the retention rule with the owner, then add reference-counted cleanup through the session deletion owner (`StudioSessionStore`), covering folder deletion too.

- **Migrated from**: v2.13.0#DF-3 on 2026-10-16 (reason: user-deferred)
- **Migration evidence**: left open by v2.13.0, the last plan of v2.13

#### DF-4 - An approved agent can replace the user's redo history

- **Source phase**: Phase 7 Tier 3 deep pass (adversarial review).
- **Plan reference**: T018; `core/image/ImageEditRecipe.ts` `reduceImageEditRecipe`.
- **Reason**: an approved agent may undo to the start and then commit a new edit, which drops the redo branch, including the user's own earlier edits. This is ordinary undo semantics and the original image is never touched; the Ask inbox text now says so. No checkpoint restores the history as it was when the grant was issued.
- **Suggested next step**: decide with the owner whether agents may branch below the cursor at grant time, or whether the recipe is checkpointed at grant issue so the user can restore it.

- **Migrated from**: v2.13.0#DF-4 on 2026-10-16 (reason: user-deferred)
- **Migration evidence**: left open by v2.13.0, the last plan of v2.13

#### WN-1 - Residual image-access hardening items from the adversarial review

- **Source phase**: Phase 7 Tier 3 deep pass (adversarial review).
- **Plan reference**: T018-T020; `image-command-contract.md`.
- **Reason**: (a) pre-existing: a holder of the app token can capture the Nexus window through `GET /nexus/screenshot` or `POST /nexus/capture` while an image is on screen, without an image grant; (b) before approval, `access` error codes reveal whether a turn has an owned PNG; (c) a link or junction on a parent of `~/.nexus/generations/exports` at first use is not detected (the leaf and later swaps are); (d) a render response is not bound to its request beyond id, size and a valid PNG, which relies on the renderer being the app's own window over its private IPC. Fixed in Phase 7 instead: unverified-name warning and request code in the ask, duplicate folding and per-caller caps, per-grant replay caches, one render per grant and 8 in total, full PNG chunk and CRC validation, generic errors, validated actions before hashing, collision-free and idempotent export names, hard-link refusal, and serialized Ask inbox writes.
- **Suggested next step**: decide whether capture routes should exclude image surfaces or require approval, and lstat every ancestor of the exports root at first use.

- **Migrated from**: v2.13.0#WN-3 on 2026-10-16 (reason: user-deferred)
- **Migration evidence**: left open by v2.13.0, the last plan of v2.13

#### WN-2 - The packaged desktop flows are not automated

- **Source phase**: Phases 5 and 6.
- **Plan reference**: Phase 5 and Phase 6 Verification Expectations; T016, T020.
- **Reason**: Restart is proven at the sidecar (real `sessions.db` and PNG, new store and ops), in the viewer (unmount and remount over the same state), and for pixels in headless Edge, the Chromium engine behind WebView2. Agent renders are proven at the authenticated route, the bridge and the renderer's claim/answer protocol, with the shared pixel path in the same engine. No harness drives the installed Tauri window through generate, edit, quit, relaunch and export, or carries an agent render request through the real shell into a live window.
- **Suggested next step**: Phase 7 human testing suggestions; a packaged-window driver if one is added later.

- **Migrated from**: v2.13.0#WN-1 on 2026-10-16 (reason: user-deferred)
- **Migration evidence**: left open by v2.13.0, the last plan of v2.13

#### WN-3 - Skill tests leave empty folders in the source catalog

- **Source phase**: Phase 7 architecture refactor scan.
- **Plan reference**: T022.
- **Reason**: `modules/coding/skills/catalog/__none__` and `__nonexistent_user__` are created inside the source tree by `tests/unit/skills/SkillLoader.test.ts`, `tests/unit/skills/fuse.test.ts`, `tests/unit/orchestration/FusionAgent.test.ts`, `tests/integration/commands/skill-execution.test.ts` and `tests/integration/orchestration/PanelFusion.test.ts`. They are empty and untracked, and also exist in the main checkout, so they predate this plan.
- **Suggested next step**: point those tests at a temporary catalog root and remove the two folders.

- **Migrated from**: v2.13.0#WN-2 on 2026-10-16 (reason: user-deferred)
- **Migration evidence**: left open by v2.13.0, the last plan of v2.13

#### WN-4 - Seven pre-existing high-severity CodeQL alerts reached main with v2.12.0

- **Source phase**: v2.13 release (PR #102, 2026-10-16).
- **Plan reference**: v2.13 T031 and `/update release`; not introduced by v2.13.
- **Reason**: comparing `develop` with `main` (last released at v2.11.0), CodeQL reported 23 new alerts, 7 high: `js/insecure-temporary-file` and `js/file-system-race` at `tests/smoke/document-outline-smoke.test.ts` lines 162, 324 and 325 (v2.11 Phase 5 and v2.12 work), and `js/incomplete-multi-character-sanitization` at `scripts/handbook-renderer.mjs:7` (v2.12 Phase 7). CodeQL is not a required check on `main`. Exposure is low: the smoke test is opt-in and local and writes with exclusive create, and the regex only builds heading slugs from the repository's own Markdown. The PR threads were answered and resolved; the alerts stay open.
- **Suggested next step**: write the smoke test's report and results under a private `mkdtemp` directory, replace the tag-stripping regex with a loop until no change (or strip with the Markdown parser), then dismiss or close the alerts.

#### WN-5 - The v2.12.0 tag has no GitHub Release or installers

- **Source phase**: v2.13 release (2026-10-16).
- **Plan reference**: v2.13 run blocker 1 (approval NLY2GTF2).
- **Reason**: tag `v2.12.0` (`7bbf224f`) was pushed, but `release.yml` failed in "Verify release source" because its depth-1 checkout lacked the embedding-eval baseline commit `90b95f24`. Tag and dispatched runs use `release.yml` as of the tagged commit, so that tag cannot build. The owner chose to fix `release.yml` and ship v2.12.1 rather than move a pushed tag. The v2.13 completion checker's `release.github` predicate is bound to v2.12.0 and stays unmet.
- **Suggested next step**: none required beyond v2.12.1; optionally publish a notes-only v2.12.0 Release that points to v2.12.1.

#### QG-1 - Two tests time out under full-suite load at vitest's 5 s default

- **Source phase**: Phase 4 (root suite, 2026-10-14) and Phase 5 (desktop suite, 2026-10-15).
- **Plan reference**: Phase 7 T030.
- **Reason**: `tests/integration/golden/golden-runner-end-to-end.test.ts` (dry path) and `desktop/tests/video2x-adapter.test.ts` ("bounds a hanging source hash with the run-local deadline") pass alone (about 2.5 s and 3 of 3 runs) and time out only beside parallel workers. The golden file's own comment gives this cause for its sibling block, which already has a 30 s timeout. Neither test was changed by this plan.
- **Suggested next step**: In Phase 7, give each the same explicit timeout its sibling uses, with the measured duration as the reason, then re-run both full suites.

Prior v2.12 and older registers remain authoritative. These new items resolve none of them.

- **Update (2026-10-16)**: the root half is resolved: the golden-runner dry path and four other git- and process-heavy root tests run about 2.5 s alone and now carry measured 30 s timeouts; the root suite passed (579 files, 6277 tests). The Video2X test is not slow: it runs in 31 ms alone and passed in eight concurrent copies of its file, yet in one full desktop run it still timed out at 30 s, so it hangs rather than runs long. Fake timers freeze `performance.now`, which rules out the adapter's clock. In v2.13 the test was changed to race the source-hash start against the run result, so a run that settles early now fails at once with its result instead of hanging; the next full desktop run passed (254 files, 2328 tests). The underlying cause is not proven here. Next: when the test fails again, read the run result its new assertion prints; if it never recurs across several full desktop runs, close this gap with those runs as evidence.

- **Migrated from**: v2.13.0#QG-1 on 2026-10-16 (reason: user-deferred)
- **Migration evidence**: left open by v2.13.0, the last plan of v2.13

#### DF-5 - In-app model install cannot fetch multi-file Hugging Face models

- **Source phase**: Phase 1 (2026-10-16).
- **Plan reference**: T001 provisioning delta (session history `v2.14.0-phase1.md`, Plan delta).
- **Reason**: `models.install` in the sidecar goes through `NexusModelRegistry._installHttp` (`core/registry/NexusModelRegistry.ts:364-385`), which downloads only `source.url`, verifies it against `source.sha256` (all zeros for the voice models, so `Downloader.ts:169-173` throws `DigestMismatch`), writes to `blobs/<sha>` rather than `weights/<id>`, and ignores `weights.files`. Phase 1 fixed the installer path (`HFWeightsPuller`, which honors `weights.files` and per-file sha256), but the runtime's own error text still tells users to "Install ... from Settings > Models", which cannot succeed for `kokoro-82m` or `faster-whisper-large-v3`.
- **Suggested next step**: Route Hugging Face `weights.files` entries in `NexusModelRegistry` through the same per-file pinned download the installer uses, writing to `~/.nexus/models/weights/<id>/`, or point the runtime error text at the installer until that lands.

#### WN-6 - Hosts without an NVIDIA or Apple GPU still get no voice runtime

- **Source phase**: Phase 1 (2026-10-16).
- **Plan reference**: T001 provisioning delta.
- **Reason**: voice now shares the provisioned media venv, and a voice-only selection now requests it, but `scripts/installer/build/versions.lock.json` has only `win-x64-nvidia`, `linux-x64-nvidia` and `mac-arm64-apple` targets. A CPU-only host fails provisioning as before, so the audio runtime falls back to a bare `python` without the voice packages. This is unchanged from before Phase 1, not a regression.
- **Suggested next step**: Add a CPU target (CPU torch wheels plus the same runtime requirements) so the CPU-capable Whisper and Kokoro models provision on every tier the recommended defaults claim.

#### WN-7 - The provisioned venv's numpy differs from its lock

- **Source phase**: Phase 1 (2026-10-16).
- **Plan reference**: T001 provisioning delta.
- **Reason**: the lock pins `numpy==1.26.4`, but the provisioned venv on the reference host reports numpy 2.5.3, so some later install upgraded it outside the provisioner. Phase 1's voice packages did not change it (pip dry-run and before/after import check). Image, video and voice all import correctly with 2.5.3 here, so the effect is drift, not a failure.
- **Suggested next step**: Find which component upgrades numpy (a later runtime extra or a repair path) and either pin it through the provisioner or move the lock to the version actually in use.

### Resolved

| ID | Title | Resolved in | Notes |
|---|---|---|---|
