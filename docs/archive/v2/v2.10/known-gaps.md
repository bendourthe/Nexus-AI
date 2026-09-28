# Known gaps carried forward

**Status**: archived with v2.10.0 on 2026-09-28. Open rows are carried in `docs/v2/v2.11/known-gaps.md`.
**Last updated**: 2026-09-28

v2.9 moved to `docs/archive/v2/v2.9/`. v2.9.0 is published. The rows below were not closed. They are not fixed. The archived file remains the detailed record. DF-11 stays open in `docs/archive/v2/v2.0/known-gaps.md`.

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
| QG-v270-1 | The handbook HTML check fails on a CRLF working tree. The index bytes are LF. | `docs/archive/v2/v2.7/known-gaps.md` |
| QG-v270-2 | `package.json` has no fast/full/platform/report/release scripts, and `ci.yml` has no workflow-level permissions block. | `docs/archive/v2/v2.7/known-gaps.md` |
| QG-v270-3 | The three OS installers were not executed locally for the avatar plan. The installer matrix workflow already exists. | `docs/archive/v2/v2.7/known-gaps.md` |
| DF-v280-1 | The community Qwen-Image GGUF and Bespoke Nimble are not admitted. No catalog row. The living-bar sentences waited. | `docs/archive/v2/v2.8/known-gaps.md` |
| DF-v290-1 | CrisperWhisper 2.0 is not admitted. The fetched page has no weights, license, or size. No catalog row. | `docs/archive/v2/v2.9/known-gaps.md` |

## v2.10.0

### Summary

| Category | Open | Resolved |
|---|---|---|
| Not implemented (NI) | 0 | 0 |
| Deferred (DF) | 1 | 0 |
| Bugs / regressions (BG) | 0 | 0 |
| Warnings (WN) | 0 | 0 |
| Missing tests / coverage gaps (MT) | 0 | 0 |
| Quality-gate gaps (QG) | 0 | 0 |

### Open Items

The carry-forward table above stays open. Those rows were not introduced by this plan. DF-v210-1 is the only System One exclusion row. `docs/reference/model-acceptance.md` was not edited.

#### Deferred

##### DF-v210-1 - Hosted Jev, Laya, and Kev are not admitted

- **Class**: DF
- **Source phase**: Phase 1
- **Plan reference**: `docs/v2/v2.10/plans/v2.10.0-adoption-system-one-models.md`
- **Reason**: Hosted Jev is not a Nexus backend. A System One call would send state off the machine. Laya 0.3.20 is Apache-2.0, documents a Windows install, and is about 322M to 421M, and it is still not a catalog model: it needs a PyTorch download from Hugging Face, the base checkpoints lose to a majority-class baseline until a fine-tune, and it does not replace `PromptInjectionScanner` or close DF-11. Kev 0.8B, 4B, 9B, and 27B are not catalog models. The README serve path is CUDA, ROCm, or MLX, and the Modal deploy script is out of bounds. The Nimble refusal stays in `docs/archive/v2/v2.8/plans/v2.8.0-adoption-qwen-image-nimble.md`. not admitted, no catalog row.
- **Suggested next step**: Leave the row in place. Do not copy it into `docs/reference/model-acceptance.md` until the v2.8.0 and v2.9.0 plans have finished their own edits of that file, and do not add a job-map holder when that copy happens.
