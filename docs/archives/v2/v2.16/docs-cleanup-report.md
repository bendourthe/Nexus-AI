# Documentation Cleanup Audit

Date: 2026-10-25.
Mode: audit only.
Scope: v2.16 model-trial artifacts and the reference/tracker paths changed by this plan.

`audit-docs.py inventory --root docs/releases/v2/v2.16 --repo-root . --max-bytes 1048576` scanned 20 files at the Phase 1 checkpoint. The inherited archive-receipt sources in this release tree remain outside implementation cleanup.

| Surface | Lifespan disposition | Action |
|---|---|---|
| Model gates, probe/evaluation evidence, preflight and phase history | Active release work | Keep under `docs/releases/v2/v2.16/`; archive only through approved minor close. |
| `docs/reference/declined-models.md` | Living reference | Keep at its stable purpose path. |
| `docs/DEVLOG.md` and `docs/todos.md` | Living project records | Apply only this plan's milestone updates. |
| Inherited ledger and earlier archive-refresh evidence | Existing accountable work | Preserve all content and identifiers; no broad cleanup. |

No moves or deletions are proposed. No retired documentation wrapper directory is introduced. The repository docs-layout gate passes. The pre-change link baseline has 3,774 unresolved historical references; newly introduced Phase 1 references and anchors resolve. Historical link debt is not silently repaired by this audit.

Phase 2 adds release-scoped registry/license observations and stable raw regression fixtures. The fixtures remain under tests so later archive moves cannot break test discovery. Raw bytes must not be reformatted. No model weights, scratch installers, new cache pattern, move, or deletion is introduced. The fixture test and public compatibility consumer pass; new links point to existing local records and primary source URLs.

Phase 3 adds two CLI observation records, not-run evaluation data, and the CPU runner evidence/history. All remain release-scoped. Narrow raw-fixture attributes preserve hashes; no raw data is reformatted. No move, deletion, dependency installation in the repository, or unrelated shutdown refactor is proposed.

Phase 4 adds a living E4B decision row and release-scoped non-admission evidence/history. Both slots retain their baseline holder and no distributed registry changes. No move, deletion, new dependency, runtime installation, or installer artifact is introduced. The active ledger continues to record inherited obligations and the observed Node 24 warning.

Phase 5 retains the scoped architecture scan, full ledger glob inventory, final evidence, validation summary and history in this release tree. The enduring golden CLI reference documents the CPU option. No move, deletion, new wrapper directory, model weight or build output is admitted. Handbook dependencies and six outputs remain unchanged; full receipt and source checks pass. Publication is blocked by the native controller lookup and no archive or cleanup is claimed.

Integration addendum: PR138 and all three post-merge workflows passed. Final local closeout records are prepared under chore/close-v2.16. No documentation move or archive is claimed. The existing Windows CI installer rehearsal is distinguished from the intentionally absent v2.16.0 installer release. DF-152 is resolved by its applied delivery exception; 249 open records remain.
