# Docs cleanup report - Nexus - 2026-10-09

**Active version**: v2.12.0
**Mode**: audit
**Scope**: `docs/releases/v2/v2.12/` and `docs/v2/v2.12/`, Phase 6 evidence placement. No moves or deletions.

## Summary

| Category | Count |
|---|---|
| Cat 1 (delete) | 0 |
| Cat 2 (archive) | 0 |
| Cat 3 (stale-flag) | 0 |
| Cat 4 (active) | 21 |
| Total | 21 |

The owner inventory scanned 100 non-archive documentation files and selected 20 v2.12 files before this report was created. This report adds one self-classified Cat 4 file. Both owner commands exited 0. Reference counts come from the helper's supported outside-docs source scan and are not a claim of all possible references.

## Dispositions

| Path | Category | Heuristics | Destination | Notes |
|---|---|---|---|---|
| `docs/v2/v2.12/known-gaps.md` | Cat 4 | Active v2.12 release record; 6 scanned inbound references | Keep in place | Frozen at release close |
| `docs/v2/v2.12/plans/v2.12.0-adoption-kolibri-1.md` | Cat 4 | Active v2.12 release record; 1 scanned inbound references | Keep in place | Frozen at release close |
| `docs/v2/v2.12/plans/v2.12.0-outline-promotion-readiness.md` | Cat 4 | Active v2.12 release record; 12 scanned inbound references | Keep in place | Frozen at release close |
| `docs/v2/v2.12/development/outline-eval.md` | Cat 4 | Active v2.12 release record; 10 scanned inbound references | Keep in place | Frozen at release close |
| `docs/v2/v2.12/development/history/2026-10-08_v2.12.0-outline-promotion-readiness-phase-1.md` | Cat 4 | Active v2.12 release record; 0 scanned inbound references | Keep in place | Frozen at release close |
| `docs/v2/v2.12/comparisons/v2.12.0-comparison-kolibri-1.md` | Cat 4 | Active v2.12 release record; 0 scanned inbound references | Keep in place | Frozen at release close |
| `docs/releases/v2/v2.12/known-gaps.md` | Cat 4 | Active v2.12 release record; 3 scanned inbound references | Keep in place | Frozen at release close |
| `docs/releases/v2/v2.12/development/history/2026-10-09_outline-promotion-readiness-phase-2.md` | Cat 4 | Active v2.12 release record; 1 scanned inbound references | Keep in place | Frozen at release close |
| `docs/releases/v2/v2.12/development/history/2026-10-09_outline-promotion-readiness-phase-3.md` | Cat 4 | Active v2.12 release record; 0 scanned inbound references | Keep in place | Frozen at release close |
| `docs/releases/v2/v2.12/development/history/2026-10-09_outline-promotion-readiness-phase-4.md` | Cat 4 | Active v2.12 release record; 3 scanned inbound references | Keep in place | Frozen at release close |
| `docs/releases/v2/v2.12/development/history/2026-10-09_outline-promotion-readiness-phase-5.md` | Cat 4 | Active v2.12 release record; 6 scanned inbound references | Keep in place | Frozen at release close |
| `docs/releases/v2/v2.12/development/history/2026-10-09_outline-promotion-readiness-phase-6.md` | Cat 4 | Active v2.12 release record; 4 scanned inbound references | Keep in place | Frozen at release close |
| `docs/releases/v2/v2.12/development/evidence/phase-3-native-history.json` | Cat 4 | Active v2.12 release record; 0 scanned inbound references | Keep in place | Frozen at release close |
| `docs/releases/v2/v2.12/development/evidence/phase-4-compaction.json` | Cat 4 | Active v2.12 release record; 3 scanned inbound references | Keep in place | Frozen at release close |
| `docs/releases/v2/v2.12/development/evidence/phase-6-evaluation.json` | Cat 4 | Active v2.12 release record; 0 scanned inbound references | Keep in place | Frozen at release close |
| `docs/releases/v2/v2.12/development/evidence/phase-5-settings/browser.json` | Cat 4 | Active v2.12 release record; 3 scanned inbound references | Keep in place | Frozen at release close |
| `docs/releases/v2/v2.12/development/evidence/phase-5-settings/settings-320.png` | Cat 4 | Active v2.12 release record; 1 scanned inbound references | Keep in place | Binary evidence, inventory only |
| `docs/releases/v2/v2.12/development/evidence/phase-5-settings/settings-rendered.html` | Cat 4 | Active v2.12 release record; 2 scanned inbound references | Keep in place | Frozen at release close |
| `docs/releases/v2/v2.12/development/evidence/phase-5-settings/visual-allowlist.json` | Cat 4 | Active v2.12 release record; 1 scanned inbound references | Keep in place | Frozen at release close |
| `docs/releases/v2/v2.12/development/evidence/phase-5-settings/visual-report.json` | Cat 4 | Active v2.12 release record; 2 scanned inbound references | Keep in place | Frozen at release close |
| `docs/releases/v2/v2.12/docs-cleanup-report.md` | Cat 4 | Active release audit | Keep in place | This report |

## Layout inconsistencies

The approved plan, absorbed seed, comparison, carry-forward register, preregistered evaluation and Phase 1 history remain in the legacy tree. New phase histories and evidence use the canonical tree. The legacy carry-forward register and canonical new-dispositions ledger have distinct roles and are not duplicate artifacts. The final phase owns any approved placement migration with reference repair; this phase preserves the evaluated paths and creates no second copy of them.

## Cat 3 refresh queue

No Cat 3 item within this release-scoped audit. Living handbook refresh, existing tracker header drift, and broader documentation architecture remain Phase 7 duties; this report does not certify them.

## Lifespan contradictions

These selected records belong to the active, unreleased v2.12 cycle, so no post-close contradiction is asserted. Historical archived documents were excluded from this phase-scoped inventory and were not certified by this pass.

## Target tree preview

```text
docs/releases/v2/v2.12/
  known-gaps.md
  docs-cleanup-report.md
  development/history/
  development/evidence/
docs/v2/v2.12/
  plans/
  comparisons/
  development/outline-eval.md
  development/history/
  known-gaps.md
```

## Evidence and preservation

Commands from the continuation worktree:

- `python C:/Users/bdour/.agents/skills/docs-layout-refactor/scripts/audit-docs.py inventory --root docs --repo-root .`
- `python C:/Users/bdour/.agents/skills/docs-layout-refactor/scripts/audit-docs.py refgraph --root docs --repo-root .`

The complete owner outputs remain in ignored `.nexus-hub/phase6-docs-inventory-20261009T2300.jsonl` and `.nexus-hub/phase6-docs-refgraph-20261009T2300.json`. The earlier scoped-root probe found the same 20 files but could not resolve their version-layout fields; the docs-root run supplies those fields. No file moved or was deleted. Scratch helpers are already ignored; raw model diagnostics remain outside the repository. Zero ignore patterns were added.

## Self-classification

The owner link gate exited 0 with zero newly broken links and 3,770 pre-existing unresolved references unchanged. It compares the isolated preregistration tree (with unchanged queued v2.13 targets present) against the staged current tree. Command: `python C:/Users/bdour/.agents/skills/docs-layout-refactor/scripts/link-baseline.py diff --before .nexus-hub/phase6-links-before-20261009T2310.jsonl --after .nexus-hub/phase6-links-after-20261009T2310.jsonl`. Complete receipt: `.nexus-hub/phase6-links-diff-20261009T2310.json`. Existing unresolved references remain Phase 7 input; this pass claims no new breakage, not a clean historical link inventory.

Cat 4, active release audit. Preserve this record at release close with the other release evidence.
