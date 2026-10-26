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
