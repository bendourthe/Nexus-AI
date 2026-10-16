# Known Gaps - v2.13

**Project**: Nexus
**Status**: in-progress
**Last updated**: 2026-10-15

## v2.13.0

### Summary

| Category | Open | Resolved |
|---|---|---|
| Not implemented (NI) | 0 | 0 |
| Deferred (DF) | 3 | 0 |
| Bugs / regressions (BG) | 0 | 0 |
| Warnings (WN) | 1 | 0 |
| Missing tests / coverage gaps (MT) | 0 | 0 |
| Quality-gate gaps (QG) | 1 | 0 |

### Open Items

#### Deferred

##### DF-1 - Candidate runtime compatibility blocks scoring
- **Source phase**: Phase 2.
- **Plan reference**: T005; embedding-eval-results.json.
- **Reason**: Ollama 0.32.15 rejected embeddinggemma-2:270m with HTTP 412 and required a newer runtime. The preflight manifest is pinned at 9e1df58d197e80e5a6c12110efb67b38ba6c8e23790a5044e1cafe6bea34b8f4, 378346995 artifact bytes; installation did not complete. Positive candidate inference and paired quality are not proven here. No runtime/default/index was changed.
- **Suggested next step**: Qualify a compatible Ollama runtime without interrupting other sessions, then explicitly rerun the frozen evaluator to a new evidence file.

##### DF-2 - Universal admission evidence is missing
- **Source phase**: Phase 2.
- **Plan reference**: T005 and conditional T007-T010; embedding-eval-results.json.
- **Reason**: Required hardware tiers, whole-runtime peak RAM, supported-context/precision behavior, controlled coding coexistence, process-level offline containment and authoritative distribution terms remain unproven. Every corresponding gate is HOLD; there is no model-admission approval or waived gate.
- **Suggested next step**: Gather each required gate under the frozen contract before proposing a default takeover. Retain the current default and alternative jobs; Phase 3 migration stays conditional. Plan tasks T008-T010 (migration design, identity enforcement, reversible rebuild) were moved out of the plan's task list on 2026-10-15 and are owned by this gap; restore them as tasks in the version that admits the model.

##### DF-3 - Saved generated images outlive their session
- **Source phase**: Phase 5.
- **Plan reference**: T015; `desktop/sidecar/src/studio/generatedImages.ts`.
- **Reason**: Phase 5 writes each generated Image Studio PNG to `~/.nexus/generations/images/<sha256>.png` so its turn can be reopened and edited. Deleting a session removes its turns and recipes, but not these files, because the plan requires shared original media to be preserved and one file can back several turns. A user who deletes a session may expect its images gone from disk.
- **Suggested next step**: Decide the retention rule with the owner, then add reference-counted cleanup through the session deletion owner (`StudioSessionStore`), covering folder deletion too.

#### Warnings

##### WN-1 - The packaged desktop restart flow is not automated
- **Source phase**: Phase 5.
- **Plan reference**: Phase 5 Verification Expectation; T016.
- **Reason**: Restart is proven at the sidecar (real `sessions.db` and PNG, new store and ops), in the viewer (unmount and remount over the same state), and for pixels in headless Edge, the Chromium engine behind WebView2. No harness drives the installed Tauri window through generate, edit, quit, relaunch and export.
- **Suggested next step**: Phase 7 human testing suggestions; a packaged-window driver if one is added later.

#### Quality-gate gaps

##### QG-1 - Two tests time out under full-suite load at vitest's 5 s default
- **Source phase**: Phase 4 (root suite, 2026-10-14) and Phase 5 (desktop suite, 2026-10-15).
- **Plan reference**: Phase 7 T030.
- **Reason**: `tests/integration/golden/golden-runner-end-to-end.test.ts` (dry path) and `desktop/tests/video2x-adapter.test.ts` ("bounds a hanging source hash with the run-local deadline") pass alone (about 2.5 s and 3 of 3 runs) and time out only beside parallel workers. The golden file's own comment gives this cause for its sibling block, which already has a 30 s timeout. Neither test was changed by this plan.
- **Suggested next step**: In Phase 7, give each the same explicit timeout its sibling uses, with the measured duration as the reason, then re-run both full suites.

Prior v2.12 and older registers remain authoritative. These new items resolve none of them.

### Resolved

| ID | Title | Resolved in | Notes |
|---|---|---|---|
