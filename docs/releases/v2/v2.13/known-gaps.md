# Known Gaps - v2.13

**Project**: Nexus
**Status**: finalized
**Last updated**: 2026-10-16
**Open items**: 0

## v2.13.0

### Summary

| Category | Open | Resolved |
|---|---|---|
| Not implemented (NI) | 0 | 0 |
| Deferred (DF) | 0 | 0 |
| Bugs / regressions (BG) | 0 | 0 |
| Warnings (WN) | 0 | 0 |
| Missing tests / coverage gaps (MT) | 0 | 0 |
| Quality-gate gaps (QG) | 0 | 0 |

### Open Items

#### Deferred

##### DF-1 - Candidate runtime compatibility blocks scoring - MIGRATED to v2.14.0
- **Source phase**: Phase 2.
- **Plan reference**: T005; embedding-eval-results.json.
- **Reason**: Ollama 0.32.15 rejected embeddinggemma-2:270m with HTTP 412 and required a newer runtime. The preflight manifest is pinned at 9e1df58d197e80e5a6c12110efb67b38ba6c8e23790a5044e1cafe6bea34b8f4, 378346995 artifact bytes; installation did not complete. Positive candidate inference and paired quality are not proven here. No runtime/default/index was changed.
- **Suggested next step**: Qualify a compatible Ollama runtime without interrupting other sessions, then explicitly rerun the frozen evaluator to a new evidence file.

##### DF-2 - Universal admission evidence is missing - MIGRATED to v2.14.0
- **Source phase**: Phase 2.
- **Plan reference**: T005 and conditional T007-T010; embedding-eval-results.json.
- **Reason**: Required hardware tiers, whole-runtime peak RAM, supported-context/precision behavior, controlled coding coexistence, process-level offline containment and authoritative distribution terms remain unproven. Every corresponding gate is HOLD; there is no model-admission approval or waived gate.
- **Suggested next step**: Gather each required gate under the frozen contract before proposing a default takeover. Retain the current default and alternative jobs; Phase 3 migration stays conditional. Plan tasks T008-T010 (migration design, identity enforcement, reversible rebuild) were moved out of the plan's task list on 2026-10-15 and are owned by this gap; restore them as tasks in the version that admits the model.

##### DF-3 - Saved generated images outlive their session - MIGRATED to v2.14.0
- **Source phase**: Phase 5.
- **Plan reference**: T015; `desktop/sidecar/src/studio/generatedImages.ts`.
- **Reason**: Phase 5 writes each generated Image Studio PNG to `~/.nexus/generations/images/<sha256>.png` so its turn can be reopened and edited. Deleting a session removes its turns and recipes, but not these files, because the plan requires shared original media to be preserved and one file can back several turns. A user who deletes a session may expect its images gone from disk.
- **Suggested next step**: Decide the retention rule with the owner, then add reference-counted cleanup through the session deletion owner (`StudioSessionStore`), covering folder deletion too.

##### DF-4 - An approved agent can replace the user's redo history - MIGRATED to v2.14.0
- **Source phase**: Phase 7 Tier 3 deep pass (adversarial review).
- **Plan reference**: T018; `core/image/ImageEditRecipe.ts` `reduceImageEditRecipe`.
- **Reason**: an approved agent may undo to the start and then commit a new edit, which drops the redo branch, including the user's own earlier edits. This is ordinary undo semantics and the original image is never touched; the Ask inbox text now says so. No checkpoint restores the history as it was when the grant was issued.
- **Suggested next step**: decide with the owner whether agents may branch below the cursor at grant time, or whether the recipe is checkpointed at grant issue so the user can restore it.

#### Warnings

##### WN-3 - Residual image-access hardening items from the adversarial review - MIGRATED to v2.14.0
- **Source phase**: Phase 7 Tier 3 deep pass (adversarial review).
- **Plan reference**: T018-T020; `image-command-contract.md`.
- **Reason**: (a) pre-existing: a holder of the app token can capture the Nexus window through `GET /nexus/screenshot` or `POST /nexus/capture` while an image is on screen, without an image grant; (b) before approval, `access` error codes reveal whether a turn has an owned PNG; (c) a link or junction on a parent of `~/.nexus/generations/exports` at first use is not detected (the leaf and later swaps are); (d) a render response is not bound to its request beyond id, size and a valid PNG, which relies on the renderer being the app's own window over its private IPC. Fixed in Phase 7 instead: unverified-name warning and request code in the ask, duplicate folding and per-caller caps, per-grant replay caches, one render per grant and 8 in total, full PNG chunk and CRC validation, generic errors, validated actions before hashing, collision-free and idempotent export names, hard-link refusal, and serialized Ask inbox writes.
- **Suggested next step**: decide whether capture routes should exclude image surfaces or require approval, and lstat every ancestor of the exports root at first use.



##### WN-1 - The packaged desktop flows are not automated - MIGRATED to v2.14.0
- **Source phase**: Phases 5 and 6.
- **Plan reference**: Phase 5 and Phase 6 Verification Expectations; T016, T020.
- **Reason**: Restart is proven at the sidecar (real `sessions.db` and PNG, new store and ops), in the viewer (unmount and remount over the same state), and for pixels in headless Edge, the Chromium engine behind WebView2. Agent renders are proven at the authenticated route, the bridge and the renderer's claim/answer protocol, with the shared pixel path in the same engine. No harness drives the installed Tauri window through generate, edit, quit, relaunch and export, or carries an agent render request through the real shell into a live window.
- **Suggested next step**: Phase 7 human testing suggestions; a packaged-window driver if one is added later.

##### WN-2 - Skill tests leave empty folders in the source catalog - MIGRATED to v2.14.0
- **Source phase**: Phase 7 architecture refactor scan.
- **Plan reference**: T022.
- **Reason**: `modules/coding/skills/catalog/__none__` and `__nonexistent_user__` are created inside the source tree by `tests/unit/skills/SkillLoader.test.ts`, `tests/unit/skills/fuse.test.ts`, `tests/unit/orchestration/FusionAgent.test.ts`, `tests/integration/commands/skill-execution.test.ts` and `tests/integration/orchestration/PanelFusion.test.ts`. They are empty and untracked, and also exist in the main checkout, so they predate this plan.
- **Suggested next step**: point those tests at a temporary catalog root and remove the two folders.

#### Quality-gate gaps

##### QG-1 - Two tests time out under full-suite load at vitest's 5 s default - MIGRATED to v2.14.0
- **Source phase**: Phase 4 (root suite, 2026-10-14) and Phase 5 (desktop suite, 2026-10-15).
- **Plan reference**: Phase 7 T030.
- **Reason**: `tests/integration/golden/golden-runner-end-to-end.test.ts` (dry path) and `desktop/tests/video2x-adapter.test.ts` ("bounds a hanging source hash with the run-local deadline") pass alone (about 2.5 s and 3 of 3 runs) and time out only beside parallel workers. The golden file's own comment gives this cause for its sibling block, which already has a 30 s timeout. Neither test was changed by this plan.
- **Suggested next step**: In Phase 7, give each the same explicit timeout its sibling uses, with the measured duration as the reason, then re-run both full suites.

Prior v2.12 and older registers remain authoritative. These new items resolve none of them.

### Resolved

| ID | Title | Resolved in | Notes |
|---|---|---|---|
