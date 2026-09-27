# Known gaps carried forward

**Status**: in-progress
**Last updated**: 2026-09-26

v2.5 moved to `docs/archive/v2/v2.5/`. The rows below were not closed. They are not fixed. The archived files remain the detailed record.

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
| CI-v251-1 | `develop` and `main` now require only `ci-required`. The installer matrix workflow has not finished a run yet. | `docs/archive/v2/v2.5/known-gaps.md` |
| DF-v260-1 | Chat search still matches titles only. A hit is not labelled with the branch it belongs to. Exit: a search hit from a branched chat includes that chat's title. Source phase: chat surface Phase 2. Plan: `docs/v2/v2.6/plans/v2.6.0-adoption-chat-surface.md`. Reason: the organizer marker landed; title search was not part of the fork write path. Next: extend `ChatExplorerStore.search` when thread search is in scope. | this file |
| QG-v260-1 | The packaged offline probe was not re-run after adding Mermaid. Exit: `desktop/tests/packaged/offline.smoke.mjs` prints `offline: PASS` on a probe report from a build that includes this dependency. Source phase: chat surface Phase 3. Plan: `docs/v2/v2.6/plans/v2.6.0-adoption-chat-surface.md`. Reason: the probe needs a packaged window capture, which this session did not produce. The component imports the npm package `mermaid` and contains no URL. Next: run the packaged smoke on the next installer build. | this file |
| DF-v260-2 | A user compaction updates the open Chat page and can be undone there. It is not written back to `chat_chat_messages`, so a restart reloads the pre-compact transcript. Exit: compacting a chat and reopening the app shows the compacted transcript, and undo still restores the snapshot. Source phase: chat surface Phase 5. Plan: `docs/v2/v2.6/plans/v2.6.0-adoption-chat-surface.md`. Reason: the explorer store has no replace-transcript method. Next: persist the snapshot and the replacement rows in the same transaction. | this file |

Record the installer-matrix run id on `CI-v251-1` when that workflow finishes, then move the row to a closed section.
