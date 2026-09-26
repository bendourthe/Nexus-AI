# Known gaps carried forward

**Status**: in-progress
**Last updated**: 2026-09-26

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
| CI-v251-1 | CI | v2.5.1 Phase 4 | `docs/v2/v2.5/plans/v2.5.1-adoption-packaged-verification-and-accessibility.md` | The pipeline comparison was not applied. There is no single aggregate required check and no `fast`/`full`/`platform`/`report`/`release` profiles. Linux run 36153544032 and macOS run 36153548528 succeeded as dispatch-only rehearsals. | Approve a profile migration separately. Do not rewrite `ci.yml` inside this plan without that approval. |

## Adjacent

NI-3 is resolved in `docs/archive/v2/v2.4/known-gaps.md` (2026-09-21). `MODEL_FAMILIES` in `core/registry/ModelCatalog` is the single family tuple, and `desktop/sidecar/src/protocol.ts` builds its Zod enum from that tuple. The v2.5.1 command-parity checker does not reopen NI-3. It also cannot see value-level enum drift, which is why Phase 2 was not allowed to claim NI-3 as its proving case.

## Closed in v2.5

| ID | Class | Source phase | Plan reference | Resolution |
| --- | --- | --- | --- | --- |
| MT-v251-1 | MT | v2.5.1 Phase 1 | `docs/v2/v2.5/plans/v2.5.1-adoption-packaged-verification-and-accessibility.md` | Desktop `eslint` reports 0 `jsx-a11y` warnings. The lint ceiling is 0. The splat viewer keeps a keyboard camera with two rule disables because that surface is a custom widget. |
| QG-v250-2 | QG | migration-durability Phase 1 | `docs/v2/v2.5/plans/v2.5.0-migration-durability.md` | Closed. Job `108108818115` (Test TypeScript, Node 22.x, run `36146482594`) passed `preMigrationSnapshot.test.ts`. On 2026-09-26 the published Node 24.13.0 prebuild loaded locally and that file passed 4 tests inside a green root suite (5913 passed, 12 skipped). The prebuild is not committed. Do not `npm rebuild`. |
| QG-v250-1 | QG | Phase 4 | `docs/v2/v2.5/plans/v2.5.0-adoption-diffusionstudio-editor.md` | The release executable served `nexus context --json` with exit 0 and an empty session object. `nexus media inspect C:/Windows/win.ini --json` exited 1 with `error.code` `forbidden` and did not return file bytes. |
| QG-v251-2 | QG | v2.5.1 Phase 3 | `docs/v2/v2.5/plans/v2.5.1-adoption-packaged-verification-and-accessibility.md` | Closed. Windows run 36274353659 built the shell without patching `tauri.conf.json` and the probe printed `{"ok":true,"digest":"8272dd28c0053177cd9dda48b72b12834211010c290b7ed10e018176984b81bf","findings":[]}`. The debug port is applied at launch from `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS`. `tauri-driver` was not used. |
| QG-v251-3 | QG | v2.5.1 Phase 4 | `docs/v2/v2.5/plans/v2.5.1-adoption-packaged-verification-and-accessibility.md` | At 1440px each pillar route showed its selector. The sidebar overflow is the collapse pill `sidebar-collapse-toggle`, which is drawn 8px outside the aside on purpose. The image findings are single-character labels (`W`, `H`, and a disclosure glyph) whose glyph width is under 16px. They are not clipped text. |
