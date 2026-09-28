# Known gaps carried forward

**Status**: archived with v2.8.0 on 2026-09-27. Open rows are carried in `docs/v2/v2.9/known-gaps.md`.
**Last updated**: 2026-09-27

v2.7 moved to `docs/archive/v2/v2.7/`. v2.7.0 is published. The rows below were not closed. They are not fixed. The archived file remains the detailed record. DF-8 stays open in `docs/archive/v2/v2.0/known-gaps.md` because the avatar plan did not import a LongCat inference tree.

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

## v2.8.0

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

The carry-forward table above stays open. Those rows are not items introduced by this plan. `docs/reference/model-acceptance.md` has no v2.7.0 exclusion subsection, so the Qwen-Image and Nimble refusal is this wait row and not a second write in the acceptance bar. `docs/archive/v2/v2.7/known-gaps.md` was not edited.

#### Deferred

##### DF-v280-1 - Qwen-Image GGUF and Bespoke Nimble are not admitted

- **Source phase**: Phase 1 - Qwen-Image and Nimble exclusion note
- **Plan reference**: `docs/v2/v2.8/plans/v2.8.0-adoption-qwen-image-nimble.md` (T001)
- **Reason**: `abenzerps/Qwen-Image-2.1-Uncensored-GGUF` is not an image-tier candidate. The Qwen Research License on official `Qwen/Qwen-Image-2.1` is non-commercial (research and evaluation only). The card's Q4_K_M file is 4.60 GB and its recommended Int8 text encoder is 9.35 GB. The documented loader is ComfyUI-GGUF, and `runtimes/diffusion/pipelines/real_execute.py` `_load_text_pipe` does not load GGUF. Uncensored photoreal is already held by `juggernaut-xl-v9` and `realvisxl-v5`. Official `QwenImage21Pipeline` stays out of this cycle. Bespoke Nimble and `bespokelabs/Bespoke-Nimble-9B` are not a chat or agent model. The scorer returns one token per flat enum or boolean field and cannot emit tool-call arguments. The GitHub repository has no license file. Serving it needs MLX or CUDA transformers, not Ollama. It does not close DF-11 (fast small-model command router) in `docs/archive/v2/v2.0/known-gaps.md`. The plan named `docs/v2/v2.0/known-gaps.md`; that file now lives at the archive path, and the row is still open. The living-bar sentences waited so they would not collide with the v2.7.0 edit. not admitted, no catalog row.
- **Suggested next step**: Add those two sentences beside the v2.7.0 exclusion text when that text exists in the acceptance bar.
