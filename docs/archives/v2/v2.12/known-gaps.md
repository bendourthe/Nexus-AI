# Known Gaps - v2.12

**Project**: Nexus
**Status**: finalized
**Finalization**: 2026-10-19 by v2.15.0: every open item migrated to [the v2.15 ledger](../../../releases/v2/v2.15/known-gaps.md).
**Open items**: 0
**Last updated**: 2026-10-15

The former carry-forward register is preserved below under `v2.12 Carry-forward register`; release-specific entries remain under `v2.12.0`. These section identities distinguish both original records of DF-v212-4. Consolidation changes their location, not their status or migration authority.

## v2.12.0

### Summary

| Category | Open | Resolved |
|---|---|---|
| Not implemented (NI) | 0 | 0 |
| Deferred (DF) | 0 | 3 |
| Bugs / regressions (BG) | 0 | 0 |
| Warnings (WN) | 0 | 4 |
| Missing tests / coverage gaps (MT) | 0 | 0 |
| Quality-gate gaps (QG) | 0 | 1 |

### Open Items

#### Deferred

##### DF-v212-4 - Legacy history for OpenAI-compatible backends - MIGRATED to v2.15.0

- **Source phase**: Phase 3 - native tool history.
- **Plan reference**: [outline-promotion-readiness](plans/v2.12.0-outline-promotion-readiness.md), sub-task 3.1.
- **Reason**: The LM Studio and headless OpenAI clients convert coding history to the existing assistant-text plus user-role envelope format. Native Ollama history is proven locally on qwen3.5:9b and gemma4:12b; native round trips through other backends are not proven here.
- **Suggested next step**: Measure a live OpenAI-compatible native round trip and resume behavior before adding that backend's native message converter. Owner: the maintainer. Support tier: future for that native-history path.

#### Warnings

##### WN-v212-5 - Historical evaluation diagnostic and timing limits - MIGRATED to v2.15.0

- **Source phase**: Phase 6 - evaluation results, sub-task 6.3.
- **Plan reference**: [outline-promotion-readiness](plans/v2.12.0-outline-promotion-readiness.md), sub-tasks 6.3 and 6.4.
- **Reason**: Both completed scored runs used a logger that omitted returned session errors. There are 51 error finishes with empty tails whose specific causes cannot be reconstructed; another 41 error-status rows finish at max-iterations. Only page caps 50 and 200 were prewarmed, so the original reports' claim that every question time excludes OCR is too broad. Counts, exact coverage and frozen scoring were validated; reporting was corrected after inference without modifying or rescoring the artifacts. Support tier: internal-compatible experimental path, candidate for promotion.
- **Suggested next step**: Preserve these limits in Phase 7 and the v2.13 removal/narrowing review. Use the corrected error capture and qualified timings for any separately authorized future diagnostic run; do not infer the missing historical causes or schedule repeats after futility. Owner: the maintainer. [Results](development/outline-eval.md), [metadata](development/evidence/phase-6-evaluation.json).

##### WN-v212-6 - Outline retention is not bounded by session or idle expiry - MIGRATED to v2.15.0

- **Source phase**: Phase 7 - factual handbook review.
- **Plan reference**: [outline-promotion-readiness](plans/v2.12.0-outline-promotion-readiness.md), handbook refresh and final verification.
- **Reason**: The structure cache has a 50 MiB cap, but the summary store has no eviction cap. Text snapshots have lazy ten-minute idle expiry, while screened text persists for the tool instance's lifetime. Desktop and ACP reuse outline tools across sessions with identical workspace roots, including read authorization and call/output counters. Strict session isolation and ten-minute memory erasure are not implemented. The handbook now states these limits. Support tier: internal-compatible, experimental and off by default.
- **Suggested next step**: Review cache bounds, tool-scope lifetime and session reset requirements alongside the planned removal/narrowing decision. Preserve these limits until changed behavior has real-boundary evidence. Owner: the maintainer. Sources: `core/documents/OutlineCache.ts`, `core/documents/OutlineSummaries.ts`, `modules/coding/documents/DocumentOutlineTools.ts`, `modules/coding/runtime/headlessTools.ts`, `desktop/sidecar/src/coding/headlessAgentRunner.ts`, and `desktop/sidecar/src/acp/AcpAgent.ts`.

##### WN-v212-7 - Media smoke proof needs separate packaging and installation evidence - MIGRATED to v2.15.0

- **Source phase**: Phase 7 - factual handbook review.
- **Plan reference**: [outline-promotion-readiness](plans/v2.12.0-outline-promotion-readiness.md), packaged installer qualification and final verification.
- **Reason**: The installed-media smoke harness records a supplied installer hash and exercises an installed sidecar; it does not install that candidate or establish installer-to-payload binding. Catalog-source reachability is a separate packaging check and is not invoked automatically by the Windows build. Generation-time artifact finalization checks are narrower than the smoke harness's decoded PNG and video probes. The corrected handbooks distinguish those evidence boundaries. Support tier: candidate for exact packaged installer/GPU qualification until the required operator evidence exists.
- **Suggested next step**: Retain catalog reachability output, installation of the exact candidate, installer-to-payload binding, and decoded PNG/video results together during packaged qualification. Assess deterministic binding and packaging-check enforcement when that path is implemented; do not certify an arbitrary existing installation from a supplied hash alone. Owner: the maintainer. Sources: `scripts/installer/build/smoke-installed-media.ps1`, `scripts/installer/build/build-windows.ps1`, and `scripts/installer/build/check-hf-catalog.py`.

#### Quality-gate gaps

##### QG-v212-1 - Terminal CI reconciliation requires explicit migration decisions - MIGRATED to v2.15.0

- **Source phase**: Phase 7 - terminal CI/CD comparison.
- **Plan reference**: [outline-promotion-readiness](plans/v2.12.0-outline-promotion-readiness.md), sub-task 7.5 and T025.
- **Reason**: The 23-field source/settings comparison has six PASS, eleven FAIL, three PARTIAL and three NOT PROVEN fields. Missing native report/release profiles, repeated feature-push/post-merge validation, incomplete pre-merge platform coverage, implicit permissions and inconsistent report publication are observable differences. On 2026-10-10 the maintainer approved, and Phase 7 applied, only the CI profile correctness patch and the action pin updates (four `actions/cache` references to v6.1.0 and the `scorecard.yml` `upload-sarif` commit pin); see the [pin evidence](development/evidence/phase-7-ci-action-pin-application.json). Those changes close none of the migration fields above. No permission, secret, required-check or settings change has been approved or applied. This is an incomplete gate, not an accepted bypass.
- **Suggested next step**: Retain [the comparison](development/phase-7-ci-comparison.md) and [input hashes/settings](development/evidence/phase-7-ci-inputs.json), prove remaining source/security fields, prepare exact incremental profile/event/reporting changes, and obtain each consequential CI/permission/settings approval before applying it. Re-gate locally and observe the approved integration topology. Owner: the maintainer. Existing canonical-profile carry-forward gaps remain open.

### Resolved

| ID | Title | Resolution and evidence |
|---|---|---|
| WN-v211-5 | Native calls recorded as legacy user envelopes | Resolved in v2.12.0 Phase 3 for native Ollama calls. Both models completed three real reads with native assistant calls and tool-role results; persistence/resume keeps its legacy format intentionally. [History](development/history/2026-10-09_outline-promotion-readiness-phase-3.md), [evidence](development/evidence/phase-3-native-history.json). OpenAI-compatible native history remains DF-v212-4. |
| DF-v211-4 | Missing desktop outline Settings controls | Resolved in Phase 5 with experimental, off-by-default switches, saved-preference preservation under environment overrides, and observed keyboard/toggle/reload behavior. [History](development/history/2026-10-09_outline-promotion-readiness-phase-5.md), [evidence](development/evidence/phase-5-settings/browser.json). Answer-quality promotion remains separate. |
| DF-v211-5 | `AGENTS.md` names moved paths | Resolved 2026-10-15 outside the plan. The Module Authorship Contract and Tool Catalogue sections of [AGENTS.md](../../../../AGENTS.md) now name `modules/coding/llm/`, `modules/coding/llm/types.ts`, `modules/coding/config/settings.ts`, and `modules/coding/chat/PromptBuilder.ts`, matching the `configs/dependency-cruiser.cjs` Ollama-boundary rule. The remaining `src/` paths in those sections were checked and still exist. |

## v2.12 Carry-forward register

**Status**: finalized 2026-10-19 by v2.15.0. Every entry below is resolved, superseded or migrated; the remaining work lives in [the v2.15 ledger](../../../releases/v2/v2.15/known-gaps.md) and the [follow-up batch list](../../../releases/v2/v2.15/development/v2.15.0-followup-batches.md). Do not add entries here.
**Last updated**: 2026-10-09

v2.11 moved to `docs/archive/v2/v2.11/`. v2.11.0 is published. The rows below were open when carried forward; subsequent resolutions are stated explicitly. The archived file for each row remains the detailed record. DF-11 stays open in `docs/archive/v2/v2.0/known-gaps.md`. New phase dispositions are recorded in the [canonical v2.12 ledger](known-gaps.md).

### DF-v212-4 - OpenAI-compatible clients retain assistant-text and user-role envelope history. - CLOSED 2026-10-19

Native round trips through those backends are not proven here. Owner: the maintainer.

- **Archived record**: [Canonical Phase 3 record](known-gaps.md)
- **Superseded by**: docs/archives/v2/v2.12/known-gaps.md DF-v212-4

### BG-2 - SANA ControlNet SHA-256 pins are still the all-zero placeholder. - MIGRATED to v2.15.0

The files were not fetched.

- **Archived record**: `docs/archive/v2/v2.4/known-gaps.md`

### DF-1 - MiniCPM tool tags are stripped by Ollama before Nexus can parse them. - MIGRATED to v2.15.0

- **Archived record**: `docs/archive/v2/v2.4/known-gaps.md`

### WN-2 - The bundled MiniCPM template has no tools section. - MIGRATED to v2.15.0

That template is outside this repo.

- **Archived record**: `docs/archive/v2/v2.4/known-gaps.md`

### DF-v240-1 - Live NVIDIA splat generate was not run. - MIGRATED to v2.15.0

- **Archived record**: `docs/archive/v2/v2.4/known-gaps.md`

### DF-v240-2 - TripoSplat weight file hashes were not downloaded. - MIGRATED to v2.15.0

`source.sha256` is the all-zero placeholder.

- **Archived record**: `docs/archive/v2/v2.4/known-gaps.md`

### DF-v240-3 - Older version gap logs still contain operator and hardware items that were not re-tested. - MIGRATED to v2.15.0

- **Archived record**: `docs/archive/v1/` and `docs/archive/v2/v2.0` through `v2.3`

### MT-v240-1 - A real WebGL2 framebuffer was not captured. - MIGRATED to v2.15.0

- **Archived record**: `docs/archive/v2/v2.4/known-gaps.md`

### QG-v240-1 - The full local suite was not run on the Electron `better-sqlite3` ABI. - MIGRATED to v2.15.0

CI Node 22 ran it on the merge.

- **Archived record**: `docs/archive/v2/v2.4/known-gaps.md`

### CI-v251-1 - `develop` and `main` require only `ci-required`; `installer-required` is not a required context. - MIGRATED to v2.15.0

Narrowed in v2.11.0: the gate now accepts `success` only, so a skipped installer leg fails it. Still open: the maintainer adds `installer-required` to branch protection after the v2.11.0 merge (a repository setting, not a file).

- **Archived record**: `docs/archive/v2/v2.5/known-gaps.md`

### DF-v260-1 - Chat search still matches titles only. - MIGRATED to v2.15.0

A hit is not labelled with the branch it belongs to.

- **Archived record**: `docs/archive/v2/v2.6/known-gaps.md`

### QG-v260-1 - The packaged offline probe was not re-run after adding Mermaid. - MIGRATED to v2.15.0

The v2.6.0 asset build is not that probe.

- **Archived record**: `docs/archive/v2/v2.6/known-gaps.md`

### DF-v260-2 - User compaction is not written back to `chat_chat_messages`, so a restart reloads the pre-compact transcript. - MIGRATED to v2.15.0

- **Archived record**: `docs/archive/v2/v2.6/known-gaps.md`

### DF-v260-3 - The Qwen3.8 guard matches `id` and `source.url` only. - MIGRATED to v2.15.0

- **Archived record**: `docs/archive/v2/v2.6/known-gaps.md`

### DF-v260-4 - Qwen3.8-27B is not admitted. - MIGRATED to v2.15.0

- **Archived record**: `docs/archive/v2/v2.6/known-gaps.md`

### DF-v260-5 - No llama.cpp serving path. - MIGRATED to v2.15.0

- **Archived record**: `docs/archive/v2/v2.6/known-gaps.md`

### DF-v260-6 - The uncensored-LLM product question is unanswered. - MIGRATED to v2.15.0

- **Archived record**: `docs/archive/v2/v2.6/known-gaps.md`

### WN-v260-1 - Release-scoped Qwen3.8 mentions under `docs/archive/` stay as written. - MIGRATED to v2.15.0

- **Archived record**: `docs/archive/v2/v2.6/known-gaps.md`

### QG-v270-1 - The handbook HTML check fails on a CRLF working tree. - MIGRATED to v2.15.0

The index bytes are LF.

- **Archived record**: `docs/archive/v2/v2.7/known-gaps.md`

### QG-v270-2 - Narrowed in v2.11.0: `ci.yml` now defaults to `permissions: contents: read`, and `package.json` has `fast`, `full`, and `platform` profiles composed from existing commands. Still open: no `report` profile (it needs a summary writer that reads other profiles' output) and no `release` profile (publication belongs to semantic-release), and `ci.yml` still runs its own steps rather than calling the profiles. Owner: the maintainer. - MIGRATED to v2.15.0

- **Archived record**: `docs/archive/v2/v2.7/known-gaps.md`

### QG-v211-1 - `docs/handbooks/html/atlas.html` scrolls sideways at 390 px (524 px wide) from a cause other than inline code, and CI does not run `npm run docs:handbooks:check`, which let `atlas.html` go stale until v2.11.0 regenerated it. Owner: the maintainer. Next step: find the wide element in the atlas, and add the handbook check to the `fast` profile and CI. - MIGRATED to v2.15.0

- **Archived record**: `docs/archive/v2/v2.11/development/v2.11.0-last-phase-evidence.md`

### QG-v211-2 - The production audit allowlist gained `global-agent`, `roarr`, and `sprintf-js` (GHSA-hp3w-g68c-fv3c, no patched `sprintf-js` release). - MIGRATED to v2.15.0

All three load only from `onnxruntime-node/script/install.js`, its install-time binary download, never at runtime. Fixing them needs a semver-major `global-agent` under a parent that pins `^3.0.0`. Five other advisories in the same audit were fixed in range (`proxy-addr` 2.0.8, `undici` 7.30.0, `fast-uri` 3.1.8, `ip-address` 10.7.3, `source-map-js` 1.2.2). Owner: the maintainer. Next step: remove the three entries when `onnxruntime-node` moves to `global-agent` 4 or a patched `sprintf-js` ships.

- **Archived record**: `scripts/check-prod-audit.mjs`

### QG-v270-3 - The three OS installers were not executed locally for the avatar plan. - MIGRATED to v2.15.0

The installer matrix workflow already exists.

- **Archived record**: `docs/archive/v2/v2.7/known-gaps.md`

### DF-v280-1 - The community Qwen-Image GGUF and Bespoke Nimble are not admitted. - MIGRATED to v2.15.0

No catalog row. The living-bar sentences waited.

- **Archived record**: `docs/archive/v2/v2.8/known-gaps.md`

### DF-v290-1 - CrisperWhisper 2.0 is not admitted. - MIGRATED to v2.15.0

The fetched page has no weights, license, or size. No catalog row.

- **Archived record**: `docs/archive/v2/v2.9/known-gaps.md`

### DF-v210-1 - Hosted Jev, Laya 0.3.20, and Kev 0.8B, 4B, 9B, and 27B are not admitted. - MIGRATED to v2.15.0

No catalog row.

- **Archived record**: `docs/archive/v2/v2.10/known-gaps.md`

### DF-v211-1 - CLM-8B is not admitted, no catalog row. - MIGRATED to v2.15.0

Its README gives Apache-2.0 code and weights, two frozen Qwen3-8B encoders with 20M-parameter heads, ranking over a closed candidate set, and a serve path of vLLM plus `clm-serve` with no Windows instructions. It does not close DF-11. The v2.10 hosted and license grounds no longer apply to it; the runtime, single-GPU, and job-map grounds still do. The PageIndex package and PageIndex Cloud are not adopted: default models are hosted, local mode asks for an OpenAI key, and OCR and MCP are cloud-only. The local equivalent is PI-1 in the v2.11.0 plan. AIRI was re-checked through 0.12.0-beta.5 with no new adoption.

- **Archived record**: `docs/archive/v2/v2.11/comparisons/v2.11.0-comparison-pageindex-airi-clm.md`

### DF-v211-2 - The outline tools remain experimental and off by default. - MIGRATED to v2.15.0

The v2.12 Phase 6 frozen rule yields futility: expanded C cross-section scores are Qwen 0/20 and Gemma 4/20. Recommend removal or narrowing at the v2.13.0 review, with no repeats. Owner: the maintainer. M5 still requires a session-history or DEVLOG entry citing a workspace document hash and the answer obtained; absent that entry, remove the tools and settings keys at review.

- **Archived record**: [Measured result](development/outline-eval.md), original: `docs/archive/v2/v2.11/development/outline-eval.md`

### DF-v211-3 - CPU OCR (RapidOCR, the portable default) costs about 6.8 s per text-dense page on this host: a 60-page PDF takes about 7 minutes on the first `document_outline` call, the same cost `parse_document` already pays. The GPU engine was not measured. The runtime also caps at 200 pages and reports `pageCount: 200`, hiding truncation past that. - MIGRATED to v2.15.0

- **Archived record**: `docs/archive/v2/v2.11/development/outline-feasibility.md`

### DF-v211-7 - The missing mechanisms were implemented in v2.12 Phases 2-4: per-turn remaining-room budgets, native Ollama tool-role history and shared result compaction. - MIGRATED to v2.15.0

Phase 6 observed those paths, but the anchor A errors/no-answer including timeouts are Qwen 13 versus nine previously (target at most four), Gemma 15 versus 16 (target at most eight). Answer quality is not solved. Owner: the maintainer. Retain the measured miss and diagnostic limits in the v2.13 removal/narrowing review; do not schedule repeats after the frozen futility result.

- **Archived record**: [Measured result](development/outline-eval.md), [mechanism evidence](development/history/2026-10-09_outline-promotion-readiness-phase-4.md)

### DF-v211-6 - The outline tools refuse PPTX and XLSX, though the OCR runtime reads both (`runtimes/ocr/documents.py`). - MIGRATED to v2.15.0

Supporting them needs two new document kinds in the shared core and a determinism measurement of their extraction engines before outlines may be cached. Owner: the maintainer. Next step: add the kinds with ephemeral (uncached) outlines, then measure.

- **Archived record**: `docs/archive/v2/v2.11/development/v2.11.0-last-phase-evidence.md`

### WN-v211-6 - No egress from the OCR child process is proven at socket level. - MIGRATED to v2.15.0

The test traps sockets in the Node process and scans first-party OCR sources for network imports; third-party OCR packages and first-run model downloads are not covered. Not proven here.

- **Archived record**: `tests/unit/modules/coding/documents/DocumentOutlineTools.test.ts`

### WN-v211-7 - When a parser returns markdown (the GPU OCR engine), per-page data is dropped, so `pagesParsed` reads 1 and sections carry no page range. - MIGRATED to v2.15.0

The CPU default and DOCX return pages and are unaffected; the GPU engine was not run here.

- **Archived record**: `modules/coding/documents/DocumentOutlineTools.ts` (`createExtractor`)

### DF-v211-5 - `AGENTS.md` names paths that moved: `src/llm/` and `src/llm/types.ts` (now `modules/coding/llm/`), `src/config/settings.ts` (now `modules/coding/config/settings.ts`), and `src/chat/PromptBuilder.ts` (now `modules/coding/chat/PromptBuilder.ts`). The plan records them rather than editing the directive in this release. - RESOLVED 2026-10-19

- **Archived record**: `AGENTS.md` lines 209-243
- **Resolution**: AGENTS.md names the current paths and none of the moved ones. Evidence: see `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md`.

### DF-v211-4 - Resolved in v2.12 Phase 5: desktop Settings exposes experimental, off-by-default outline and summaries controls, including authoritative status and environment-owned preferences. This closes the missing-control gap without promoting answer quality (DF-v211-2). - RESOLVED 2026-10-19

- **Archived record**: [Verified history](development/history/2026-10-09_outline-promotion-readiness-phase-5.md)
- **Resolution**: Desktop Settings has the outline and summaries controls, off by default, and their tests pass. Evidence: see `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md`.

### WN-v211-1 - The OCR runtime's `parse` result carries no engine version, so the outline cache key uses the engine id, the device, and a fixed version label. - MIGRATED to v2.15.0

An engine upgrade does not invalidate cached outlines by itself; the per-node anchor check refuses any slice from changed text, so the failure is safe but costs a rebuild.

- **Archived record**: `docs/archive/v2/v2.11/development/history/2026-10-02_v2.11.0-pageindex-airi-clm-phase-3.md`

### WN-v211-2 - The ACP control-surface path builds the outline tools without a model client, so node summaries are off there. - MIGRATED to v2.15.0

The desktop coding runner and the VS Code extension have them.

- **Archived record**: `docs/archive/v2/v2.11/development/history/2026-10-02_v2.11.0-pageindex-airi-clm-phase-4.md`

### WN-v211-4 - Both agent loops now send `tools` natively to every model whose catalog format is not `none` (the extension already did). - MIGRATED to v2.15.0

A model Ollama reports without the `tools` capability may reject such a request. Not proven here: every chat model installed on this host declares `tools`.

- **Archived record**: `docs/archive/v2/v2.11/development/history/2026-10-03_v2.11.0-pageindex-airi-clm-phase-5.md`

### WN-v211-5 - Resolved in v2.12.0 Phase 3 for native Ollama calls: both models completed three real reads with assistant calls and matching tool-role results. - RESOLVED 2026-10-19

Persistence intentionally keeps the legacy resumed prompt. Other backend native history remains DF-v212-4.

- **Archived record**: [Resolution and evidence](known-gaps.md), original record: `docs/archive/v2/v2.11/development/history/2026-10-03_v2.11.0-pageindex-airi-clm-phase-5.md`
- **Resolution**: Native Ollama history sends assistant calls with matching tool-role results; the non-Ollama part is owned by v2.12.0#DF-v212-4. Evidence: see `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md`.

### WN-v211-3 - The summary path's loopback check reuses `isLoopbackEndpoint`: an exact host match that rejects look-alike hosts, `0.0.0.0`, and IPv4-mapped addresses, but does not resolve DNS for `localhost` or refuse an HTTP redirect from the model server. - MIGRATED to v2.15.0

- **Archived record**: `docs/archive/v2/v2.11/development/history/2026-10-02_v2.11.0-pageindex-airi-clm-phase-4.md`

### DF-v212-1 - Aleph Alpha's Kolibri-1 (released 2026-10-03, Apache-2.0, 78B total and 3.46B active parameters, about 78 GB in FP8) is not admitted, no catalog row. - MIGRATED to v2.15.0

The smallest community GGUF (Q3_K_S, about 3.47 bits per weight) is roughly 34 GB by arithmetic, above the 24 GB top tier. Stock Ollama, llama.cpp, and LM Studio cannot load it; the official path needs vLLM with the vendor `aleph-alpha-inference` package. The trained context is 262,144 tokens; 1M is an extrapolation. It fails gates 3, 4, and 5 of the v2.3.0 admission record. Reopen conditions: BOTH a runtime condition (an official `ollama.com/library` tag, or Kolibri support merged into a released upstream llama.cpp) AND a size condition (a first-party Kolibri variant whose quantized weights plus KV cache at the tier's context fit 24 GB, or a raised top tier in `core/registry/recommended.json`). Meeting both reopens the acceptance bar; neither admits the model. Owner: the maintainer.

- **Archived record**: `docs/v2/v2.12/comparisons/v2.12.0-comparison-kolibri-1.md`

### DF-v212-2 - No catalog-wide check that every entry's declared size fits its tier; the Kolibri-1 decision keeps a per-model guard instead (decided at the seed plan's grill). - MIGRATED to v2.15.0

Source phase: v2.12.0 Phase 1. Plan reference: `docs/v2/v2.12/plans/v2.12.0-adoption-kolibri-1.md`, parked gaps. Owner: the maintainer. Next step: a plan that already edits `core/registry/catalog.json` measures how many current entries such a check would flag before adopting it. Measured in v2.14.0 Phase 5 over 41 entries ([script](../v2.14/development/evidence/measure-catalog-size-check.mjs)): a tier-default check flags 1 (`qwen3.5:4b` is a cpu agentic default yet declares `requiredVramGB` 4); a field-consistency check flags 9 (six `hideBelowVramGB` values below the declared need, several apparently deliberate for offload builds; two embedding models with `vramGB` 1 over `requiredVramGB` 0; `triposplat` with no `sizeGB`). Adoption stays an owner decision.

- **Archived record**: `docs/v2/v2.12/plans/v2.12.0-adoption-kolibri-1.md`

### DF-v212-3 - No catalog field separates a vendor's trained context from its extrapolated maximum (comparison KOL-2). - MIGRATED to v2.15.0

Source phase: v2.12.0 Phase 1. Plan reference: `docs/v2/v2.12/plans/v2.12.0-adoption-kolibri-1.md`, parked gaps. Owner: the maintainer. Next step: reopen when a second model with an extrapolated context claim reaches review.

- **Archived record**: `docs/v2/v2.12/comparisons/v2.12.0-comparison-kolibri-1.md`
