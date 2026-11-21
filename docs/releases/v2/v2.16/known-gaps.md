# Known Gaps - v2.16

**Project**: Nexus AI Studio
**Status**: in-progress
**Last updated**: 2026-11-21
**Open items**: 0

The [archived v2.16.0 ledger](../../../archives/v2/v2.16/known-gaps.md) retains its approved conditional closeout. This active file records the subsequent v2.16.1 release work. All 384 inherited obligations remain OPEN in the [v2.17 ledger](../v2.17/known-gaps.md), with their original bodies, provenance and individually preserved requirements. No inherited item is closed by this patch record. Required integration and publication work remains tracked by unchecked T009-T011 in the [release plan](plans/v2.16.1-release-completion.md).

## v2.16.1

### Summary

| Category | Open | Resolved |
|---|---|---|
| Not implemented (NI) | 0 | 0 |
| Deferred (DF) | 0 | 0 |
| Bugs / regressions (BG) | 0 | 2 |
| Warnings (WN) | 0 | 0 |
| Missing tests / coverage gaps (MT) | 0 | 0 |
| Quality-gate gaps (QG) | 0 | 0 |

### Open Items

No newly unresolved patch defect after local validation. Model admission remains HOLD under the plan's explicit non-admission outcome. Its quality run remains unrun, with a documented reopen condition. Hosted merge-result checks, final version preparation, published/downloaded artifacts, Windows installer acceptance and Linux/macOS package validation are required unfinished plan tasks, not waived gates.

#### Bugs / Regressions

##### BG-10 - Hidden release heading truncates selected notes - RESOLVED 2026-11-02

- **Source phase**: v2.16.1 Phase 3, independent adversarial verification.
- **Plan reference**: [Release completion](plans/v2.16.1-release-completion.md), T005 and T008.
- **Reason**: The actual note-extraction CLI treated a version heading inside an HTML comment as a release boundary, returned exit 0 and omitted following real changes from the selected release.
- **Suggested next step**: Retain the real CLI regression and exact selected-body comparison through integration and release packaging.
- **Resolution**: The extractor ignores hidden headings, preserves complete selected notes and rejects unfinished selected comments before overwriting output. The original reproduction passes in the independent 26-case CLI retest. The final root suite passes 6,528 tests with 12 existing skips. [Evidence](development/v2.16.1-final-validation.md), [independent report](development/v2.16.1-adversarial-report.md).

##### BG-11 - Literal comment marker in code spans is misparsed - RESOLVED 2026-11-02

- **Source phase**: v2.16.1 Phase 3, independent adversarial verification of BG-10's correction.
- **Plan reference**: [Release completion](plans/v2.16.1-release-completion.md), T005 and T008.
- **Reason**: The first comment-aware correction treated literal comment markers in inline code as unfinished HTML comments. Actual CLI observations covered single-backtick, multiple-backtick and soft-line-break code spans. Installed Markdown consumers confirmed the multiline inputs are literal code.
- **Suggested next step**: Retain the inline-code and paragraph/release-boundary guards when changing extraction behavior.
- **Resolution**: Matching code spans protect literal comment markers, including across soft line breaks, while real block/release boundaries stop unmatched spans. All observed routes pass exact CLI output/status comparisons. Eleven regression cases were added across both defects; the final focused run passes 32 tests and the corrected-source full root run passes. [Evidence](development/v2.16.1-final-validation.md), [independent report](development/v2.16.1-adversarial-report.md).

### Resolved

| ID | Title | Resolved in | Notes |
|---|---|---|---|
| BG-10 | Hidden release heading truncates selected notes | Phase 3 | Actual CLI reproduction and final root coverage pass |
| BG-11 | Literal comment marker in code spans is misparsed | Phase 3 | Single-line/multiline and stopping-boundary regressions pass |

### Retained Obligations

The global inventory found eight ledgers requiring inspection, zero parse errors and 384 OPEN records, all in v2.17 before this patch file was added. Existing CI differences remain owned by v2.17 QG-2/QG-9 and their complete historical requirements. Current source and protection observations are linked in [the CI receipt](development/v2.16.1-ci-gate-observation.json); local observations do not close hosted integration requirements. Existing warnings and bounded platform coverage remain explicit in [the validation record](development/v2.16.1-final-validation.md). The full v2.17 implementation/release and the requested subsequent full codebase/UI/behavior review remain required.

## v2.16.2

### Summary

| Category | Open | Resolved |
|---|---|---|
| Not implemented (NI) | 0 | 0 |
| Deferred (DF) | 0 | 0 |
| Bugs / regressions (BG) | 0 | 1 |
| Warnings (WN) | 0 | 0 |
| Missing tests / coverage gaps (MT) | 0 | 0 |
| Quality-gate gaps (QG) | 0 | 1 |

### Open Items

None.

### Resolved Items

#### Bugs / Regressions

##### BG-1 - Installed desktop app cannot start on a PC without the VC++ Redistributable

- **Source phase**: v2.16.2 Phase 4, T020 (QG-1 Windows Sandbox run, 2026-11-20).
- **Plan reference**: [v2.16.2 plan](plans/v2.16.2-adoption-specialist-models-desktop-creative-tools.md), owner decision D2 and gate B7; evidence in [the QG-1 Sandbox evidence](development/v2.16.2-qg1-sandbox-evidence.md).
- **Reason**: `nexus-shell.exe` imports `VCRUNTIME140.dll` and `VCRUNTIME140_1.dll`. A clean Windows (the Sandbox) has neither, so the installed app exits `0xC0000135` and never opens. Commit `f223770d` (2026-10-08) moved npm `@tauri-apps/cli` to 2.12, which no longer sets `STATIC_VCRUNTIME`; the locked Rust `tauri-build` 2.6.3 reads only that variable, so static linking stopped. Releases v2.12.0 through v2.16.1 include the change. The build host and hosted runners already have the redistributable, so no earlier check saw it.
- **Owner**: v2.16.2 run (this change).
- **Suggested next step**: Keep the `installed-crt-linkage` smoke stage when upgrading Tauri; when `tauri-build` is upgraded to a version that reads `build.windows.staticVCRuntime`, the `build.rs` override can be removed.
- **Resolution**: `241da375` sets `STATIC_VCRUNTIME=true` for MSVC targets in `desktop/src-tauri/build.rs` and adds the `installed-crt-linkage` stage to the hosted `-InstallDesktop` smoke. CI run 44918087312 passed that stage, and the installer it built passed the clean Sandbox run with no redistributable present. [Evidence](development/v2.16.2-qg1-sandbox-evidence.md).

#### Quality-Gate Gaps

##### QG-1 - Frozen installer proof in a disposable Windows Sandbox not yet observed

- **Source phase**: v2.16.2 Phase 4, T020 (owner decision D2).
- **Plan reference**: [v2.16.2 plan](plans/v2.16.2-adoption-specialist-models-desktop-creative-tools.md), Final-phase Scope Bindings and gate B7.
- **Reason**: D2 requires rerunning B3-B6 against the app installed from this candidate's frozen Windows installer inside a disposable Windows Sandbox or VM. Windows Sandbox is not enabled on the build host; enabling it needs an administrator command and a reboot, which the maintainer chose to do on 2026-11-10. Installing on the maintainer's account is prohibited.
- **Owner**: Maintainer (enable Windows Sandbox), then the v2.16.2 run.
- **Suggested next step**: Run `Enable-WindowsOptionalFeature -Online -FeatureName Containers-DisposableClientVM` in an administrator PowerShell, reboot, then run the packaged check against the installed app inside Sandbox. This gate blocks the v2.16.2 release; it is not deferred.
- **Resolution**: Windows Sandbox was enabled on 2026-11-20. The frozen installer from CI run 44918087312 (`241da375`, SHA-256 `60a39414...`) installed in a clean Sandbox; the installed health check passed, the packaged image-edit check passed with no judge findings, and both defect controls failed as required (B3-B6). The first clean run found BG-1, fixed in the same change. [Evidence](development/v2.16.2-qg1-sandbox-evidence.md), [receipts](development/v2.16.2-qg1-sandbox-receipts.json).

### Resolved

| ID | Title | Resolved in | Notes |
|---|---|---|---|
| BG-1 | Installed desktop app cannot start on a PC without the VC++ Redistributable | Phase 4 stabilization (`241da375`) | Static runtime and an installed-import smoke stage; clean Sandbox passes |
| QG-1 | Frozen installer proof in a disposable Windows Sandbox | Phase 4 stabilization | B3-B6 pass on the installed frozen app |

### Recorded Observations

These do not block the plan Goal; each is outside this plan's scope or an inherited behavior, and each names its owner.

| Item | Observation | Owner and next step |
|---|---|---|
| Observation 1 | `docs/archive/` (legacy) and `docs/archives/` (canonical) coexist; `audit-docs.py canonicalize-layout` stops with `destination exists` | v2.16 closeout: migrate the legacy tree with `docs-layout-refactor` in its own reviewed change |
| Observation 2 | The desktop injects a skill body with its literal `$ARGUMENTS` placeholder (the extension substitutes it); the model still sees the user's message | Desktop coding runtime: substitute arguments as the extension does |
| Observation 3 | The composer hint "Built-in commands only. Install the Nexus-Hub harness" still shows while bundled built-in skills are offered | Desktop composer copy |
| Observation 4 | `desktop/tests/webview/image-edit-pixels.mjs` exits 2 with a relative `--out`; it works with an absolute folder | Test tooling: resolve `--out` to an absolute path |
| Observation 5 | Packaged defect controls cover lost persistence and source mutation; refused write, hung app and cross-profile requests are covered at the judge and helper level only | Packaged check: add packaged controls when a cheap injection point exists |
| Observation 6 | With `qwen3.5:9b`, the desktop agent emitted `<|tool>{...}<tool|>` tool calls that no registered parser accepted, so no tool ran; `gpt-oss:20b` ran the same skill correctly | Coding LLM tool-call formats (`modules/coding/llm/ToolCallFormat.ts`) |
| Observation 7 | The desktop coding runtime never sets `num_ctx`, so a session gets the Ollama server's default window; on Ollama 0.32.15 that is 4096 tokens, which a tool-using session overflows (`n_tokens = 4095, truncated = 1`). B2 passed only against a temporary server started with `OLLAMA_CONTEXT_LENGTH=16384` | Desktop coding runtime: request a window sized to the model, or tell the user to raise `OLLAMA_CONTEXT_LENGTH` |
| Observation 8 | On a fresh PC the installer runs the desktop first-run health check before it provisions Node, so it logs `Desktop health check FAILED: fail: sidecar spawn failed: program not found (node)` and warns the user, then provisions Node 22.11.0; the installed app passes an independent `--healthcheck` afterwards ([QG-1 evidence](development/v2.16.2-qg1-sandbox-evidence.md)) | Installer (`scripts/installer`): run the desktop health check after the runtime step, or pass it the provisioned Node path |
| Observation 9 | Hosted builds now use Rust 1.100, whose Cargo layout change makes the locked `tauri-build` 2.6.3 copy the sidecar into the wrong build-tree folder; the non-required packaged window smoke on PR #166 failed with `sidecar\dist\main.js missing`. v2.16.2 was released over it by maintainer decision on 2026-11-21 | Carried as [v2.17 BG-11](../v2.17/known-gaps.md): upgrade `tauri-build` to 2.7.x and rerun the packaged smoke and the Sandbox proof |
