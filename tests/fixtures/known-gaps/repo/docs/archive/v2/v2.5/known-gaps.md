# Known gaps carried forward

**Status**: in-progress

Version directories through v2.4 moved to `docs/archive/`.

| ID | Why it is still open | Archived record |
| --- | --- | --- |
| BG-2 | SANA ControlNet pins are still the all-zero placeholder. The files were not fetched. | `docs/archive/v2/v2.4/known-gaps.md` |
| DF-v240-3 | Older version gap logs still contain operator items. | `docs/archive/v1/` and `docs/archive/v2/v2.0` through `v2.3` |

## v2.5.0

| ID | Class | Source phase | Reason | Suggested next step |
| --- | --- | --- | --- | --- |
| CI-v251-1 | CI | v2.5.1 Phase 4 | The installer leg is not a required context. | Record the matrix run id. |

## Closed in v2.5

| ID | Class | Resolution |
| --- | --- | --- |
| QG-v250-1 | QG | The release executable served `nexus context --json` with exit 0. |
