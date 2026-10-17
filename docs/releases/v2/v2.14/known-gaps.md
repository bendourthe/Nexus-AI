# Known Gaps - v2.14

**Project**: Nexus
**Status**: in-progress
**Last updated**: 2026-10-17
**Open items**: 6

## v2.14.0

### Summary

| Category | Open | Resolved |
|---|---|---|
| Not implemented (NI) | 0 | 0 |
| Deferred (DF) | 4 | 1 |
| Bugs / regressions (BG) | 0 | 0 |
| Warnings (WN) | 2 | 5 |
| Missing tests / coverage gaps (MT) | 0 | 0 |
| Quality-gate gaps (QG) | 0 | 1 |

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

Prior v2.12 and older registers remain authoritative. These new items resolve none of them.

### Resolved

| ID | Title | Resolved in | Notes |
|---|---|---|---|
| DF-5 | In-app model install cannot fetch multi-file Hugging Face models | v2.14.0 Phase 5 | `NexusModelRegistry` now installs every `weights.files` entry into `weights/<id>/` at the pinned revision, each file checked against its own sha256, writes the `.nexus-model-id` marker, refuses placeholder digests, and removes the folder with the model. `tests/unit/core/registry/weightsFilesInstall.test.ts` (6 tests), including the real Kokoro entry's pinned URL |
| WN-3 | Skill tests leave empty folders in the source catalog | v2.14.0 Phase 5 | The five tests use `tests/helpers/noUserSkills.ts` (a path under the OS temp folder); both folders removed. A re-run of the five files left `modules/coding/skills/catalog/` without them |
| WN-4 | Seven pre-existing high-severity CodeQL alerts | v2.14.0 Phase 5 (code) | The smoke test writes its default report and results into a private `mkdtemp` folder; `scripts/handbook-renderer.mjs` strips tags until the text stops changing. Rendered handbooks are byte-identical apart from line endings. The alerts themselves close when CodeQL re-scans the merged tree |
| WN-5 | The v2.12.0 tag has no GitHub Release or installers | Superseded by v2.12.1 | `gh release view v2.12.1`: published 2026-10-16 with 5 assets. No notes-only v2.12.0 Release was made |
| WN-6 | Hosts without an NVIDIA or Apple GPU get no voice runtime | Moved to v2.15 (WN-1) | Still open: a CPU target cannot be verified on this GPU host, and a gap opened in this run cannot migrate at the minor close |
| WN-7 | The provisioned venv's numpy differs from its lock | v2.14.0 Phase 5 (cause found) | No Nexus provisioner changes numpy. On 2026-10-01 a `rapidocr-onnxruntime` install, which no provisioner performs, pulled `opencv-python` 5.0.0.93 (needs `numpy>=2`), upgrading numpy to 2.5.3. The lock stays correct for what Nexus installs; the OCR provisioning gap and its numpy conflict are v2.15 WN-2 |
| QG-1 | Two tests time out under full-suite load | v2.14.0 | Root half fixed in v2.13 with measured timeouts. The Video2X test passed in three full desktop runs in this cycle, meeting the gap's own closing rule |
