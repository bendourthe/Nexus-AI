# Known gaps carried forward

**Status**: in-progress
**Last updated**: 2026-09-23

Version directories through v2.4 moved to `docs/archive/`. The items below were not closed. They are not fixed. The archived files remain the detailed record.

| ID | Why it is still open | Archived record |
| --- | --- | --- |
| BG-2 | SANA ControlNet SHA-256 pins are still the all-zero placeholder. The files were not fetched. | `docs/archive/v2/v2.4/known-gaps.md` |
| DF-1 | MiniCPM tool tags are stripped by Ollama before Nexus can parse them. | `docs/archive/v2/v2.4/known-gaps.md` |
| WN-2 | The bundled MiniCPM template has no tools section. That template is outside this repo. | `docs/archive/v2/v2.4/known-gaps.md` |
| DF-v240-1 | Live NVIDIA splat generate was not run. | `docs/archive/v2/v2.4/known-gaps.md` |
| DF-v240-2 | TripoSplat weight file hashes were not downloaded. `source.sha256` is the all-zero placeholder. | `docs/archive/v2/v2.4/known-gaps.md` |
| DF-v240-3 | Older version gap logs still contain operator and hardware items that were not re-tested. | `docs/archive/v1/` and `docs/archive/v2/v2.0` through `v2.3` |
| MT-v240-1 | A real WebGL2 framebuffer was not captured. | `docs/archive/v2/v2.4/known-gaps.md` |
| QG-v240-1 | The full local suite was not run on the Electron `better-sqlite3` ABI. CI Node 22 ran it on the merge. | `docs/archive/v2/v2.4/known-gaps.md` |

v2.5 plans in this directory are not started by the v2.4.11 tag.

## v2.5.0

| ID | Class | Source phase | Plan reference | Reason | Suggested next step |
| --- | --- | --- | --- | --- | --- |
| DF-v250-1 | DF | Phase 4 | `docs/v2/v2.5/plans/v2.5.0-adoption-diffusionstudio-editor.md` | `nexus screenshot` and `nexus capture` were left out on purpose. They would expose whatever is on screen, which is a different disclosure class from structured state. | A later plan should decide, with an operator, whether a loopback capture route is acceptable and what it is allowed to see. |
| QG-v250-1 | QG | Phase 4 | `docs/v2/v2.5/plans/v2.5.0-adoption-diffusionstudio-editor.md` | `http://127.0.0.1:11500/nexus/context` was not reachable (`Unable to connect to the remote server`), so the live sidecar round trip was not observed. Route tests passed against an in-process stub. | Start the desktop with Local API server enabled and run `nexus context --json`, then `nexus media inspect` on a path outside the workspace roots. |
| QG-v250-2 | QG | migration-durability Phase 1 | `docs/v2/v2.5/plans/v2.5.0-migration-durability.md` | `tests/unit/core/storage/preMigrationSnapshot.test.ts` did not run. `better-sqlite3` is ABI 146 and this Node is ABI 137 (v24.13.0). | Run that file on a Node whose ABI matches the installed native module. Do not rebuild the module to chase the mismatch. |
