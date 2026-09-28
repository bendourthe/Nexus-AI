# Known gaps carried forward

**Status**: in-progress
**Last updated**: 2026-09-27

## v2.7.0

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

Phase 1 of `v2.7.0-adoption-avatar-install-gate` added no gap. Phase 2 wrote the Empero exclusion in `docs/reference/model-acceptance.md` because the Qwen3.8 family section was already there, so the wait-row fallback was not used. The carry-forward table above is unchanged. DF-8 (no sampled LongCat clip) stays in `docs/archive/v2/v2.0/known-gaps.md`.

v2.6 moved to `docs/archive/v2/v2.6/`. v2.6.0 is published, and the asset build attached the VSIX files, `NexusSetup.exe`, and `SHA256SUMS.txt`. The rows below were not closed. They are not fixed. The archived file remains the detailed record.

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
| CI-v251-1 | `develop` and `main` require only `ci-required`. `Installer tests` is not a required context. | `docs/archive/v2/v2.5/known-gaps.md` |
| DF-v260-1 | Chat search still matches titles only. A hit is not labelled with the branch it belongs to. | `docs/archive/v2/v2.6/known-gaps.md` |
| QG-v260-1 | The packaged offline probe was not re-run after adding Mermaid. The v2.6.0 asset build is not that probe. | `docs/archive/v2/v2.6/known-gaps.md` |
| DF-v260-2 | User compaction is not written back to `chat_chat_messages`, so a restart reloads the pre-compact transcript. | `docs/archive/v2/v2.6/known-gaps.md` |
| DF-v260-3 | The Qwen3.8 guard matches `id` and `source.url` only. | `docs/archive/v2/v2.6/known-gaps.md` |
| DF-v260-4 | Qwen3.8-27B is not admitted. | `docs/archive/v2/v2.6/known-gaps.md` |
| DF-v260-5 | No llama.cpp serving path. | `docs/archive/v2/v2.6/known-gaps.md` |
| DF-v260-6 | The uncensored-LLM product question is unanswered. | `docs/archive/v2/v2.6/known-gaps.md` |
| WN-v260-1 | Release-scoped Qwen3.8 mentions under `docs/archive/` stay as written. | `docs/archive/v2/v2.6/known-gaps.md` |
