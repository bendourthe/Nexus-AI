# Known gaps carried forward

**Status**: archived with v2.7.0 on 2026-09-27. Open rows are carried in `docs/v2/v2.10/known-gaps.md`.
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
| Quality-gate gaps (QG) | 3 | 0 |

### Open Items

Phase 1 of `v2.7.0-adoption-avatar-install-gate` added no product gap. Phase 2 wrote the Empero exclusion in `docs/reference/model-acceptance.md` because the Qwen3.8 family section was already there, so the wait-row fallback was not used. DF-8 stays open in `docs/archive/v2/v2.0/known-gaps.md` because this plan did not import a LongCat inference tree. The carry-forward rows below stay open; they are not defects introduced by this plan.

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

#### Quality-Gate Gaps

##### QG-v270-1 - Handbook byte check fails on a CRLF working tree

- **Source phase**: Phase 3 - Living docs architecture
- **Plan reference**: `docs/v2/v2.7/plans/v2.7.0-adoption-avatar-install-gate.md` (T010)
- **Reason**: `npm run docs:handbooks:check` exits 1 here because `git ls-files --eol` shows index LF and working tree CRLF for the handbook HTML. This plan did not edit handbook Markdown. Regenerating on this checkout would fight `core.autocrlf` and would not change the committed LF bytes.
- **Suggested next step**: Compare generated HTML to the git index blobs, or run the check on an LF checkout.

##### QG-v270-2 - Named CI profiles and workflow permissions were not added

- **Source phase**: Phase 3 - Terminal CI/CD reconciliation
- **Plan reference**: `docs/v2/v2.7/plans/v2.7.0-adoption-avatar-install-gate.md` (T012)
- **Reason**: GitHub Actions is the provider. `ci-required` already always resolves and is the only required check on `main` and `develop`. `package.json` has no `fast`, `full`, `platform`, `report`, or `release` scripts. `ci.yml` has no workflow-level `permissions` block. This plan's tests already run in `test-ts` and desktop Vitest. The workflow was not rewritten.
- **Suggested next step**: A CI-owned change can add the five profile scripts and a workflow `permissions` block after checking which jobs need more than `contents: read`.

##### QG-v270-3 - Cross-OS installer executables were not run locally

- **Source phase**: Phase 3 - Terminal CI/CD reconciliation
- **Plan reference**: `docs/v2/v2.7/plans/v2.7.0-adoption-avatar-install-gate.md` (T012)
- **Reason**: `.github/workflows/installer-matrix.yml` already calls the Windows, Linux, and macOS installer workflows and aggregates them as `installer-required`. This plan changes no installer payload. The three OS installers were not executed on this machine.
- **Suggested next step**: Keep the installer matrix on installer-touching pulls. Do not treat this avatar plan as an installer change.

