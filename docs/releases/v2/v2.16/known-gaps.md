# Known Gaps - v2.16

**Project**: Nexus AI Studio
**Status**: finalized
**Last updated**: 2026-10-31
**Open items**: 0

## v2.16.0

### Summary

| Category | Open | Resolved |
|---|---|---|
| Not implemented (NI) | 0 | 0 |
| Deferred (DF) | 0 | 1 |
| Bugs / regressions (BG) | 0 | 0 |
| Warnings (WN) | 0 | 1 |
| Missing tests / coverage gaps (MT) | 0 | 0 |
| Quality-gate gaps (QG) | 0 | 0 |

### Open Items

#### DF-1 - Tailwind v4 `@theme inline` is source-level, not compiled - MIGRATED to v2.17.0

- **Source phase**: Phase 1 - Motion Foundation (A4-foundation)
- **Plan reference**: `docs/archive/v1/v1.17/plans/v1.17.0-adoption-ui-motion-identity.md` (sub-task 1.1)
- **Reason**: Motion tokens live in `:root` and are aliased in an `@theme inline` block in `desktop/src/styles/tokens.css`, matching the plan's Tailwind mapping. The desktop Vite pipeline still does not run Tailwind (pre-existing v1.0 gap: tokens are consumed as `var(--token)`). Browsers ignore the unknown `@theme` at-rule. The tokens therefore resolve in the shell as CSS custom properties, which is how every other token already works.
- **Suggested next step**: When a later cycle wires Tailwind v4 into `desktop/`, the existing `@theme inline` motion aliases should emit utilities with no second palette. Do not add `tailwindcss` in this plan (no new frontend dependency).

- **Migrated from**: v1.17.0#DF-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v1.17.0#DF-1; still owed: Optional candidate/watch; next: Carry the compilation boundary. Establish an actual required utility consumer before adding Tailwind; do not call the source aliases compiled.

#### DF-2 - Installer motion is not on the shared desktop hook - MIGRATED to v2.17.0

- **Source phase**: Phase 1 - Motion Foundation (A4-foundation)
- **Plan reference**: `docs/archive/v1/v1.17/plans/v1.17.0-adoption-ui-motion-identity.md` (Overview: shell-only cycle)
- **Reason**: This cycle is desktop-shell-only. The PyQt installer constellation and floating logo still use their own reduced-motion checks. Desktop centralization does not change installer behavior.
- **Suggested next step**: If a later installer pass wants one reduced-motion story across app and installer, port the same halt-not-slow contract; do not share the React hook.

- **Migrated from**: v1.17.0#DF-3 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v1.17.0#DF-3; still owed: Optional candidate/watch; next: Carry pending V9 plus review of the separate floating-logo path. React-hook reuse across PyQt is not an acceptance requirement; document halt parity if proved.

#### DF-3 - Chat pending is a batch wait, not live token streaming - MIGRATED to v2.17.0

- **Source phase**: Phase 2 - Agent-state orbs (A1)
- **Plan reference**: `docs/archive/v1/v1.17/plans/v1.17.0-adoption-ui-motion-identity.md` (sub-task 2.3: "where `isStreaming` is signalled")
- **Reason**: `ChatPage` still waits for the full `sendMessage` event batch, then patches the assistant bubble. There is no per-token `isStreaming` flag. Phase 2 treats `pending: true` + `activity: "chat-streaming"` as the streaming signal so the composing orb appears for the whole wait. Phase 3 drives the composer traveling beam from the same `pending` flag.
- **Suggested next step**: If a later cycle streams tokens into the bubble, keep the same activity until the `done` event and then clear `pending` (the traveling beam follows).

- **Migrated from**: v1.17.0#DF-6 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v1.17.0#DF-6; still owed: Required implementation/qualification; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede to v2.2.3#DF-21, preserving true incremental token delivery, cancellation, pending state, and transcript persistence obligations. The original motion cycle allowed batch pending; the later typed transport obligation is kept accountable at its later exact identity, not retroactively claimed implemented here.

#### DF-4 - On-device multi-effect GPU/battery cost is not proven here - MIGRATED to v2.17.0

- **Source phase**: Phase 5 - Motion coordination + polish (A4-completion)
- **Plan reference**: `docs/archive/v1/v1.17/plans/v1.17.0-adoption-ui-motion-identity.md` (sub-task 5.2)
- **Reason**: jsdom cannot create a WebGL context or measure GPU frame time. Unit tests prove offscreen pause, the instance cap of 3, `document.hidden` pause on metal, and one-motion gating. Live Tauri frame cost with a streaming composer, idle dock, and visible hero control is not proven here. Phase 6 did not capture an on-device trace either.
- **Suggested next step**: Operator visual pass in the Tauri shell during release QA. Record fps / battery if a regression is visible; do not treat absence of a local GPU trace as a pass.

- **Migrated from**: v1.17.0#DF-8 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v1.17.0#DF-8; still owed: Required qualification; next: Carry hardware observation. Run packaged multi-effect frame/battery QA; record host, effects, trace, and result.

#### DF-5 - gigatoken remains a watch item (N5) - MIGRATED to v2.17.0

- **Source phase**: Phase 6 - Architecture refactor, known-gaps, CI/CD
- **Plan reference**: `docs/archive/v1/v1.17/plans/v1.17.0-adoption-ui-motion-identity.md` (sub-task 6.2; comparison N5)
- **Reason**: gigatoken is Python-only against Nexus's JS `tiktoken` per-request path, targets a bulk corpus workload Nexus does not have, and has incomplete Windows testing against a Windows-first product with an OS-parity principle. N4 (tiktoken replacement) stays rejected. N5 is the hypothetical Python-side bulk-tokenization need; no such workload exists in the diffusion/ASR/TTS Python runtimes today.
- **Suggested next step**: Revisit only if a genuine Python-side bulk-tokenization need emerges AND gigatoken's Windows/ARM support matures. Do not add a Python tokenizer dependency on speculation.

- **Migrated from**: v1.17.0#DF-9 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v1.17.0#DF-9; still owed: Optional candidate/watch; next: Carry watch decision with those exact reopen conditions, or explicitly close the proposal as unnecessary; do not install a tokenizer to satisfy bookkeeping.

#### DF-6 - Shared text-only ChatInput is not mounted by ChatPage - MIGRATED to v2.17.0

- **Source phase**: Phase 6 - Architecture refactor, known-gaps, CI/CD
- **Plan reference**: `docs/archive/v1/v1.17/plans/v1.17.0-adoption-ui-motion-identity.md` (sub-task 6.1)
- **Reason**: ChatPage uses `MediaComposer` (attachments + streaming beam + metal Generate/Send). `ChatInput` still carries the Phase 4 metal ring and is unit-tested (`sharedChat.test.tsx`). It is the text-only twin, not a dead loader. Header now says RETAINED, NOT DEAD.
- **Suggested next step**: Delete only if the text-only send contract is retired. Do not metal a second composer on ChatPage.

- **Migrated from**: v1.17.0#DF-10 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v1.17.0#DF-10; still owed: Owner decision; next: Prove resolved as a retained-component decision with V9; preserve text-only contract rather than deleting it as dead code.

#### DF-7 - Live llama-server round-trip is not proven here - MIGRATED to v2.17.0

- **Source phase**: Phase 1 - Skill-native adoptions + llama.cpp recipe (LG-A5)
- **Plan reference**: `docs/archive/v1/v1.18/plans/v1.18.0-adoption-agent-harness-and-governance.md` (sub-task 1.2)
- **Reason**: The recipe, example manifest, and `validateLocalAdapterManifest` tests are in-repo. A live `GET /v1/models` plus a Nexus chat against a user-started llama-server was not run on this host. Support tier for that path is `internal-compatible` (not_observed != absent). Same class as v1.16 LSO.P5.A (macOS MLX smoke).
- **Suggested next step**: On a machine with llama.cpp installed, start llama-server on `127.0.0.1`, register the example manifest, set `nexus.llm.backend` to `llamacpp`, and record the smoke. Do not bundle the runtime.

- **Migrated from**: v1.18.0#DF-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v1.18.0#DF-1; still owed: Required implementation/qualification; next: Carry live-serving hold. Start a supported user-managed localhost server, register manifest, perform Nexus chat, and retain dated receipts.

#### DF-8 - Hub catalog presence is not CI-gated - MIGRATED to v2.17.0

- **Source phase**: Phase 1 - Skill-native adoptions (OW-B1, OI-A4-web)
- **Plan reference**: `docs/archive/v1/v1.18/plans/v1.18.0-adoption-agent-harness-and-governance.md` (sub-task 1.1)
- **Reason**: CI does not ship `~/.nexus-ai/catalog/`. The Phase 1 test asserts the mapping note and that `modules/coding/skills/catalog/` has no duplicate `agent-presets` / `browser-testing-with-devtools` / `morning-briefing` entries. Live Hub files were confirmed on the operator machine during implementation, not in CI.
- **Suggested next step**: Keep the builtin-catalog negative check. An optional operator step is `nexus skills sync` then list those two skills under `~/.nexus-ai/catalog/skills/`. Do not vendor Hub skills into this repo.

- **Migrated from**: v1.18.0#DF-2 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v1.18.0#DF-2; still owed: Historical limitation; next: Carry operator presence check: sync/list the named skills in the installed catalog, record version/root, and retain builtin negative check. Do not vendor Hub skill copies.

#### DF-9 - Deeper scaffold knobs remain off `HarnessProfile` (EM.P1.C remainder) - MIGRATED to v2.17.0

- **Source phase**: Phase 2 - Named per-family harness profiles (OI-A2)
- **Plan reference**: `docs/archive/v1/v1.18/plans/v1.18.0-adoption-agent-harness-and-governance.md` (sub-task 2.2); v1.12 EM.P1.C
- **Reason**: Named family profiles (`concise-loop`, `plan-first`, `structured-edit`, `minimal`) now exist as data and drive the three existing `PromptContext` knobs. Tool-exposure verbosity and retry / step granularity are still described in `docs/reference/low-cost-model-optimization.md` and are not fields on `HarnessProfile` / `PromptContext`.
- **Suggested next step**: After a live weak-model A/B (EM.P1.B), extend `PromptContext` only if the A/B shows those knobs move quality. Do not add a fourth prompt style without a `PromptBuilder` change.

- **Migrated from**: v1.18.0#DF-5 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v1.18.0#DF-5; still owed: Optional candidate/watch; next: Carry conditional implementation until live weak-model A/B demonstrates useful knobs; then add named fields and behavioral tests.

#### DF-10 - `gemma4:26b` MoE copy has no published active/total counts - MIGRATED to v2.17.0

- **Source phase**: Phase 3 - Catalog schema (LG-A3)
- **Plan reference**: `docs/archive/v1/v1.18/plans/v1.18.0-adoption-agent-harness-and-governance.md` (sub-task 3.1)
- **Reason**: The 26B entry describes MoE routing. No in-repo published active-parameter count was available, so `activeParams` / `totalParams` stay omitted (dense-schema default). MoE numbers are populated only on `deepseek-coder-v2:16b` (2.4B active / 16B total, already in that entry's copy).
- **Suggested next step**: When Google publishes a stable active-parameter figure for Gemma 4 26B, add both MoE fields together. Do not guess.

- **Migrated from**: v1.18.0#DF-7 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v1.18.0#DF-7; still owed: Optional candidate/watch; next: Carry external metadata hold. Add both fields only from a stable publisher figure with cited provenance.

#### DF-11 - ACP is HTTP JSON-RPC on the shared listener, not a stdio subprocess - MIGRATED to v2.17.0

- **Source phase**: Phase 5 - ACP agent surface (OI-A3)
- **Plan reference**: `docs/archive/v1/v1.18/plans/v1.18.0-adoption-agent-harness-and-governance.md` (sub-task 5.1 / 5.2)
- **Reason**: The open ACP spec commonly uses stdio. This cycle mounts JSON-RPC 2.0 at `POST /acp` on the v1.16 serving `LoopbackHttpServer` so there is one loopback bind and one bearer token (`nexus.serving.token`). `session/update` notifications are returned on `session/prompt` as `updates[]`, and also flushed as SSE when the client sends `Accept: text/event-stream`.
- **Suggested next step**: If an editor requires stdio ACP, add a thin stdio bridge that forwards to `POST /acp` rather than a second agent engine. Do not vendor Open Interpreter.

- **Migrated from**: v1.18.0#DF-10 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v1.18.0#DF-10; still owed: Optional candidate/watch; next: Carry optional stdio-bridge proposal until a concrete consuming editor requires it; if implemented, bridge to the existing authenticated engine.

#### DF-12 - Windows sandbox does not kernel-enforce filesystem or network - MIGRATED to v2.17.0

- **Source phase**: Phase 6 - OS process sandbox (OI-A1)
- **Plan reference**: `docs/archive/v1/v1.18/plans/v1.18.0-adoption-agent-harness-and-governance.md` (sub-task 6.4)
- **Reason**: Job objects plus a best-effort restricted token do confine process lifetime and resource caps. They do not implement a filesystem or network allow-list comparable to Seatbelt or Landlock. AppContainer was not applied (capability SIDs break typical coding CLIs). Mode on Windows is therefore `partial`, never `confined`. Writable-root and network-deny policy stay tool-layer (denylists, confirmation) on this OS. Matrix: `modules/coding/sandbox/windowsMatrix.ts`.
- **Suggested next step**: Revisit AppContainer or an equivalent FS/network restriction only if a coding-CLI-compatible capability set is proven. Do not report Windows as confined until filesystem and network are actually enforced.

- **Migrated from**: v1.18.0#DF-11 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v1.18.0#DF-11; still owed: Historical limitation; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede to v2.4.1#DF-7, preserving both security dimensions and the requirement for coding-CLI-compatible OS enforcement before changing the support claim. Partial is the honest current support tier. Kernel enforcement is required before any confined claim, not proof that the original partial-support decision was invalid.

#### DF-13 - Laguna-S-2.1 catalog entry stays gated (LG-A1) - MIGRATED to v2.17.0

- **Source phase**: Phase 7 - Known-gaps reconciliation (gated this cycle)
- **Plan reference**: `docs/archive/v1/v1.18/plans/v1.18.0-adoption-agent-harness-and-governance.md` (Deferred and Gated Items)
- **Reason**: EM.P3 (`extremeLowBit.ts` fail-closed at `999.0.0`) and EM.P4 (`patientTier.ts` disabled) stay closed. Phase 3 prepared schema and UD-label recognition only. No Laguna catalog row, and no independent benchmark.
- **Suggested next step**: After those gates open and a benchmark exists, add the entry in a serving-oriented cycle. Do not guess quant or VRAM numbers.

- **Migrated from**: v1.18.0#DF-12 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v1.18.0#DF-12; still owed: Optional candidate/watch; next: Carry model gate until the named low-bit/patient-tier gates and independent local benchmark are proven.

#### DF-14 - 1M-context budget policy is not built (LG-A4) - MIGRATED to v2.17.0

- **Source phase**: Phase 7 - Known-gaps reconciliation (gated this cycle)
- **Plan reference**: `docs/archive/v1/v1.18/plans/v1.18.0-adoption-agent-harness-and-governance.md` (Deferred and Gated Items)
- **Reason**: Depends on LG-A1. No context-window budget policy landed.
- **Suggested next step**: After LG-A1 ships, add a 1M-context budget policy in the same serving/catalog cycle. Do not add a dummy window size.

- **Migrated from**: v1.18.0#DF-13 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v1.18.0#DF-13; still owed: Optional candidate/watch; next: Carry dependent 1M-context policy proposal; name the model/runtime gate and prove usable budget behavior before advertising it.

#### DF-15 - Native-app computer-use driver is not built (OI-A4-native) - MIGRATED to v2.17.0

- **Source phase**: Phase 7 - Known-gaps reconciliation (gated this cycle)
- **Plan reference**: `docs/archive/v1/v1.18/plans/v1.18.0-adoption-agent-harness-and-governance.md` (Deferred and Gated Items)
- **Reason**: High effort, new local capability. Browser-half is skill-native (`browser-testing-with-devtools`). Native driver must be internal (no `trycua`), permission-tiered, and confirmation-gated.
- **Suggested next step**: A later cycle after the Hub browser-QA skill has proven the workflow. Do not vendor Open Interpreter or CUA runtimes.

- **Migrated from**: v1.18.0#DF-14 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v1.18.0#DF-14; still owed: Optional candidate/watch; next: Implement through a dedicated bounded native-driver plan, or retain an explicit conditional product decision. Browser tooling does not prove native support.

#### DF-16 - Harness selector shipped default stays off (EM.P1.B) - MIGRATED to v2.17.0

- **Source phase**: Phase 2 - Live harness activation; recorded in Phase 7
- **Plan reference**: `docs/archive/v1/v1.18/plans/v1.18.0-adoption-agent-harness-and-governance.md` (sub-task 2.1); v1.12 EM.P1.B
- **Reason**: `HARNESS_SELECTOR_SHIPPED_DEFAULT` remains `false`. No live weak-model A/B was run, so the no-degradation gate does not flip `nexus.coding.harnessSelector.enabled`.
- **Suggested next step**: Run `runHarnessAb` on a weak local model with the live driver; flip the default only on a measured net win.

- **Migrated from**: v1.18.0#DF-15 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v1.18.0#DF-15; still owed: Optional candidate/watch; next: Carry live no-degradation hold. Run the live weak-model golden split before changing default; record pass rate, duration, model, and driver. Default-off is deliberate. A live A/B is a prerequisite for a future default-on decision; do not infer enabling is mandatory merely to close a watch item.

#### DF-17 - LFM is pulled through Ollama's hf.co bridge, not the Hugging Face weights puller - MIGRATED to v2.17.0

- **Source phase**: Phase 1 - Catalog entry (A1 sourcing)
- **Plan reference**: `docs/archive/v1/v1.19/plans/v1.19.0-adoption-liquid-lfm-agentic.md` (sub-task 1.1)
- **Reason**: The official Ollama library does not carry LFM2.5-2.6B. The installer LLM path is Ollama; an HF-protocol GGUF would land under `~/.nexus/models/weights/<id>/` and would not run in Coding/Chat. Shipped `source.protocol` is `ollama` with `ollama://hf.co/LiquidAI/LFM2.5-2.6B-GGUF:Q4_K_M`. `weights.files[]` still records the real SHA-256 so invariants can require a non-placeholder pin. Community Ollama tags were rejected.
- **Suggested next step**: Do not switch this entry to `protocol: "huggingface"` unless an Ollama import path exists. If Liquid publishes an official Ollama library tag, re-point `source.url` and keep the pin.

- **Migrated from**: v1.19.0#DF-2 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v1.19.0#DF-2; still owed: Owner decision; next: Carry accepted sourcing boundary, or explicitly close alternative-puller proposal. An HF weights download alone is not Ollama serving; preserve digest/source invariants.

#### DF-18 - Catalog `origin` is the country `USA`, not the publisher name Liquid AI - MIGRATED to v2.17.0

- **Source phase**: Phase 1 - Catalog entry metadata
- **Plan reference**: `docs/archive/v1/v1.19/plans/v1.19.0-adoption-liquid-lfm-agentic.md` (sub-task 1.1)
- **Reason**: `origin` is a country (or "Community") chip. Publisher color comes from `family` `lfm2.5` -> `Liquid AI` in the installer constants map. Display name and description name Liquid AI.
- **Suggested next step**: Leave the schema as country. Do not overload `origin` with a vendor name.

- **Migrated from**: v1.19.0#DF-3 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v1.19.0#DF-3; still owed: Historical limitation; next: Prove resolved as documented schema semantics using existing catalog/installer metadata tests; do not change origin to publisher text.

#### DF-19 - LFM2.5-8B-A1B catalog row declined this cycle (win not demonstrated) - MIGRATED to v2.17.0

- **Source phase**: Phase 3 - 8B-A1B bake-off (A2)
- **Plan reference**: `docs/archive/v1/v1.19/plans/v1.19.0-adoption-liquid-lfm-agentic.md` (sub-task 3.1)
- **Reason**: Pre-committed rule requires a measured golden-task quality/GB win against `qwen2.5-coder:14b` and `deepseek-coder-v2:16b`. That three-model local run was not completed (8B-A1B GGUF not pulled; DeepSeek 16B not installed). `not_observed != absent`. No catalog row. Record: [development/2026-08-18_lfm25-8b-a1b-bake-off.md](../../../archive/v1/v1.19/development/2026-08-18_lfm25-8b-a1b-bake-off.md).
- **Suggested next step**: Re-open only with a dated pass_rate/vramGB table for all three local GGUFs on the same golden split. Do not add the row on vendor blog numbers.

- **Migrated from**: v1.19.0#DF-7 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v1.19.0#DF-7; still owed: Owner decision; next: Carry explicit 8B-A1B decline/watch. Reopen only with its original dated same-split three-model quality/VRAM table.

#### DF-20 - LFM2.5-VL (and other VL siblings) stay off the catalog - MIGRATED to v2.17.0

- **Source phase**: Phase 3 - P3 watchlist
- **Plan reference**: `docs/archive/v1/v1.19/plans/v1.19.0-adoption-liquid-lfm-agentic.md` (sub-task 3.2)
- **Reason**: Image Studio already has a multimodal path. A second VL family is catalog expansion, not the low-VRAM agentic gap this cycle closed.
- **Suggested next step**: Revisit under a vision-catalog plan (v1.19.2 modality schema or a later Image Studio cycle). Do not add a VL row from this watchlist alone.

- **Migrated from**: v1.19.0#DF-8 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v1.19.0#DF-8; still owed: Optional candidate/watch; next: Carry vision-catalog proposal with measured uncovered job requirement; no automatic catalog expansion.

#### DF-21 - Liquid PII-extract Nano is not wired into redactSecrets - MIGRATED to v2.17.0

- **Source phase**: Phase 3 - P3 watchlist
- **Plan reference**: `docs/archive/v1/v1.19/plans/v1.19.0-adoption-liquid-lfm-agentic.md` (sub-task 3.2)
- **Reason**: Task-specific Nano. Nexus already has `redactSecrets` / env scrubbing. No weights bundled (N2).
- **Suggested next step**: If a later observability cycle wants a local PII model as an aid to those scrubbers, evaluate it as an optional local tool, not a default catalog row.

- **Migrated from**: v1.19.0#DF-9 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v1.19.0#DF-9; still owed: Optional candidate/watch; next: Carry optional-model decision; evaluate false negatives and local runtime fit before integration.

#### DF-22 - 128K context is GGUF metadata plus a short-prompt generate, not a full-length fill - MIGRATED to v2.17.0

- **Source phase**: Phase 2 - context probe; recorded Phase 4
- **Plan reference**: `docs/archive/v1/v1.19/plans/v1.19.0-adoption-liquid-lfm-agentic.md` (sub-task 2.1)
- **Reason**: Local `api/show` reports `lfm2.context_length: 128000`. Generates with `num_ctx=40960` and `num_ctx=131072` succeeded on a short prompt. A 128K-token fill was not run. Catalog `contextWindow` is 128000.
- **Suggested next step**: Optionally probe a long fill on a machine that can hold KV at 128K. Do not lower the catalog figure without a failed generate.

- **Migrated from**: v1.19.0#DF-10 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v1.19.0#DF-10; still owed: Historical limitation; next: Carry full-fill proof gap. Run a dated long-context fill on adequate hardware; do not claim short-prompt success proves 128K occupancy.

#### DF-23 - Vendor LFM benchmarks must not appear in catalog copy until corroborated - MIGRATED to v2.17.0

- **Source phase**: Phase 1 - card copy; standing rule, recorded Phase 4
- **Plan reference**: `docs/archive/v1/v1.19/plans/v1.19.0-adoption-liquid-lfm-agentic.md` (Overview; Section 9)
- **Reason**: ToolSandbox / BFCLv4 / tok/s figures are vendor-reported. Installer invariants already reject those tokens in `whyRecommended`. No independent local score exists for 2.6B or 8B-A1B.
- **Suggested next step**: Cite a number in card copy only after a dated local or independently published reproduction. The 8B-A1B bake-off rule (DF-7) is the same bar.

- **Migrated from**: v1.19.0#DF-11 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v1.19.0#DF-11; still owed: Historical limitation; next: Carry standing invariant or explicitly close as policy rather than unfinished implementation; preserve the invariant tests and evidence bar.

#### DF-24 - Hub skill edits are authored but not yet merged or synced - MIGRATED to v2.17.0

- **Source phase**: Phase 1 - Skill-native wins (1.1-1.3)
- **Plan reference**: `docs/archive/v1/v1.19/plans/v1.19.1-adoption-agent-loop-and-guardrail-hardening.md` (sub-tasks 1.1-1.3, 1.5)
- **Reason**: Grounded-citation, persona-card, avatar-prep, and transcript-reasoning prose landed on Nexus-Hub branch `feat/v1.19.1-skill-native-wins` (commit `451e508f`) and passed `validate_skills.py --quality`. They are not on Hub `develop` / `main` and are not yet in a `nexus skills sync` catalog. CI in this repository cannot see Hub skill bodies; it asserts the Nexus-AI mapping note and the no-duplicate builtin check.
- **Suggested next step**: Merge the Hub branch, then `nexus skills sync --apply` so `~/.nexus-ai/catalog/skills/` carries the new sections. Do not vendor copies under `modules/coding/skills/catalog/`.

- **Migrated from**: v1.19.1#DF-2 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v1.19.1#DF-2; still owed: Required implementation/qualification; next: Carry external verification: establish merge ancestry, released version, and installed catalog bodies without vendoring copies.

#### DF-25 - Pass-state one-shot nudge means the no-action budget rarely trips in production - MIGRATED to v2.17.0

- **Source phase**: Phase 2 - Unified loop guards (2.2)
- **Plan reference**: `docs/archive/v1/v1.19/plans/v1.19.1-adoption-agent-loop-and-guardrail-hardening.md` (sub-task 2.2)
- **Reason**: AgentLoop records a no-action on the pass-state gate continue path. `_gateNudgeIssued` still fires only once, so a live run typically gets one nudge and then proceeds rather than three consecutive no-action turns. Unit tests trip the guard by setting `noActionBudget: 1`. Production default remains 3.
- **Suggested next step**: If live auto-mode "thinking loops" still burn iterations, count every no-tool turn (not only the gated continue) toward the budget, or lower the default after a dated measurement.

- **Migrated from**: v1.19.1#DF-4 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v1.19.1#DF-4; still owed: Optional candidate/watch; next: Implement counting every applicable no-tool turn, or retain measured decision. Add a production-default multi-turn regression proving the actual budget can trip. Original rule is conditional on measured live thinking-loop waste. Proposed production guard change needs explicit implementation acceptance and a default-budget regression, not a silent change in this no-production-edit triage phase.

#### DF-26 - Hermes harness A/B is fixture-only; no live Hermes generate this cycle - MIGRATED to v2.17.0

- **Source phase**: Phase 1 - Hermes harness profiles (1.5)
- **Plan reference**: `docs/archive/v1/v1.19/plans/v1.19.2-adoption-catalog-and-model-expansion.md` (sub-task 1.5)
- **Reason**: `HarnessSelectorAb` measures `hermes-agentic` as the panel arm on a golden split with a fixture rollout that scores `llama3-json` overlays as passes. A live `hermes3:8b` Ollama generate was not run on this host. Same posture as the LFM fixture A/B: `not_observed != absent`.
- **Suggested next step**: Re-run `runHarnessAb` against a pulled `hermes3:8b` on the same golden split and record pass_rate / duration. Do not claim a hosted eval.

- **Migrated from**: v1.19.2#DF-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v1.19.2#DF-1; still owed: Required implementation/qualification; next: Carry live Hermes golden-split measurement, recording actual local generates and timing rather than fixture scores.

#### DF-27 - Inkling-Small GGUF is catalogued text-only; native multimodal is unverified at this quant - MIGRATED to v2.17.0

- **Source phase**: Phase 1 - Inkling-Small patient-tier entry (1.6)
- **Plan reference**: `docs/archive/v1/v1.19/plans/v1.19.2-adoption-catalog-and-model-expansion.md` (sub-task 1.6)
- **Reason**: The native Inkling-Small checkpoint is text+image+audio. The curated GGUF (`unsloth/Inkling-Small-GGUF`, UD-IQ1_S, three shards) has no verified llama.cpp multimodal projector at implementation time. The row ships `modalities: ["text"]` with copy that names the gap. Adding image/audio would over-claim.
- **Suggested next step**: If a later llama.cpp / GGUF line grows a working projector, add those modalities only after a dated local load of an image and an audio clip. Keep the row out of `recommended.json`.

- **Migrated from**: v1.19.2#DF-2 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v1.19.2#DF-2; still owed: Optional candidate/watch; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede to v2.0.0#DF-13, preserving image and audio local-load proof before enabling modalities.

#### DF-28 - Patient-tier determinism assertion skips when no offload adapter is registered - MIGRATED to v2.17.0

- **Source phase**: Phase 1 - RAM-budget presets + determinism (1.7)
- **Plan reference**: `docs/archive/v1/v1.19/plans/v1.19.2-adoption-catalog-and-model-expansion.md` (sub-task 1.7)
- **Reason**: `runDeterminismAcrossBudget` is skip-if-absent (`NEXUS_PATIENT_TIER_ADAPTER` unset, or no injected `generate`). Nexus does not bundle the llama.cpp flash-MoE offload runtime; presets are copy only. CI therefore never proves byte-identical output on a real trillion-class MoE.
- **Suggested next step**: On a host with a registered adapter, run the two default budgets and keep the dated identical/mismatch record. Do not imply Nexus ships the offload runtime.

- **Migrated from**: v1.19.2#DF-4 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v1.19.2#DF-4; still owed: Required qualification; next: Carry adapter/hardware hold. Compare actual outputs at both budgets and retain dated identical/mismatch record.

#### DF-29 - A4 Docling layout engine deferred; OCR on-device QA incomplete - MIGRATED to v2.17.0

- **Source phase**: Phase 4 - Layout bake-off (4.1 / 4.2)
- **Plan reference**: `docs/archive/v1/v1.20/plans/v1.20.0-adoption-docling.md` (Phase 4); note `docs/archive/v1/v1.20/development/ocr-layout-bakeoff-2026-08.md`
- **Reason**: Decision is DEFER, not DECLINE and not DEFER-BUILD. RapidOCR default ONNX models were smoked on synthetic fixtures (wall-of-text tables). Nexus catalog RapidOCR is still blocked by placeholder SHA (LSO.P3.A / IRSC.P4.B). Unlimited-OCR was not run (torch absent in the probe interpreter despite an RTX 3080 Ti). Docling was not installed.
- **Suggested next step**: After catalog RapidOCR can install, and with torch in the Nexus OCR/diffusion venv, parse a real table PDF and a scan with RapidOCR vs Unlimited-OCR. Only then consider a local-only `docling-slim` extra. Do not merge torch into `runtimes/ocr/requirements.txt`.

- **Migrated from**: v1.20.0#DF-5 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v1.20.0#DF-5; still owed: Required qualification; optional candidate/watch for Docling; next: Carry installed-runtime and evidence prerequisites; prove real PDF/scan RapidOCR versus Unlimited-OCR, then explicitly decide optional Docling. Keep current OCR qualification and installable pinned weights as B-OCR-QUAL. Docling remains the separately deferred optional model/runtime decision, not automatically accepted by this proposal.

#### DF-30 - `runtimes/ocr/` not renamed to `runtimes/documents/` - MIGRATED to v2.17.0

- **Source phase**: Phase 5 - Architecture refactor (5.1)
- **Plan reference**: `docs/archive/v1/v1.20/plans/v1.20.0-adoption-docling.md` (sub-task 5.1)
- **Reason**: Office engines live under the OCR runtime, but renaming would touch CI, sidecar spawn paths, installer comments, tests, and every import in one change. The seam `core/documents` is already vscode-free and correctly named. A rename without a simultaneous reference sweep would break `test-python-runtimes`.
- **Suggested next step**: If a later cycle renames, do it as one commit that updates `runtimes/ocr/**`, `tests/python/ocr/**`, `.github/workflows/ci.yml`, sidecar runtime factory paths, and installer comments together.

- **Migrated from**: v1.20.0#DF-6 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v1.20.0#DF-6; still owed: Optional candidate/watch; next: Carry optional rename decision. If accepted, do an atomic runtime/test/CI/spawn/reference sweep; folder naming is not missing document parsing.

#### DF-31 - Native audio-token reasoning is not wired - MIGRATED to v2.17.0

- **Source phase**: Phase 1 - Audio attachment + transcribe-then-chat (1.2)
- **Plan reference**: `docs/archive/v2/v2.0/plans/v2.0.0-adoption-governed-autonomy-multimodal.md` (sub-task 1.2)
- **Reason**: The plan keeps native audio-token reasoning out of scope until a fitting local model exists. Transcribe-then-chat is the only audio path. Catalog `modalities` including `audio` only changes the composer tooltip.
- **Suggested next step**: When a local model that accepts audio tokens is catalogued, route clips as native audio instead of (or in addition to) labelled transcripts.

- **Migrated from**: v2.0.0#DF-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.0.0#DF-1; still owed: Optional candidate/watch; next: Carry model-dependent proposal. Prove model and serving audio input contract before routing native clips.

#### DF-32 - Playwright is an optional local install, not a lockfile pin - MIGRATED to v2.17.0

- **Source phase**: Phase 2 - Browser tool family (2.2)
- **Plan reference**: `docs/archive/v2/v2.0/plans/v2.0.0-adoption-governed-autonomy-multimodal.md` (sub-task 2.2)
- **Reason**: Adding Playwright to `package.json` would make `npm ci` in CI download Chromium. Tests use `InMemoryBrowser` and a fake loader. The documented pin is Playwright 1.55.x via `npx playwright@1.55.0 install chromium`.
- **Suggested next step**: If a nightly job can cache browsers, add `playwright` as an optionalDependency with that pin and keep CI on InMemory.

- **Migrated from**: v2.0.0#DF-6 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.0.0#DF-6; still owed: Optional candidate/watch; next: Carry optional local-browser install boundary. An actual nightly requirement must specify cached pinned browser and skip behavior before changing CI.

#### DF-33 - LongCat Avatar DiT inference is not vendored - MIGRATED to v2.17.0

- **Source phase**: Phase 3 - audio2video avatar mode (3.2)
- **Plan reference**: `docs/archive/v2/v2.0/plans/v2.0.0-adoption-governed-autonomy-multimodal.md` (sub-task 3.2)
- **Reason**: The required byte-level scan of an imported LongCat inference tree found no tree to import. Shipping un-scanned upstream `.py` would violate the precondition. CI and the adapter run the existing stub executor. Official INT8 shards are sha256-pinned in the catalog for a later scanned import.
- **Suggested next step**: Scan `meituan-longcat/LongCat-Video` (bucket-3 strip), then wire the INT8 loader behind `longcat_avatar.preflight` on a diffusion-pro host. Record GPU evidence; do not treat the stub as a live talking-head.

- **Migrated from**: v2.0.0#DF-8 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.0.0#DF-8; still owed: Required implementation/qualification; next: Implement scanned local inference loader in a dedicated runtime task, then prove real talking-head bytes on eligible GPU; no stub-as-live claim.

#### DF-34 - Continuation seam quality is unmeasured - MIGRATED to v2.17.0

- **Source phase**: Phase 3 - video continuation (3.1)
- **Plan reference**: `docs/archive/v2/v2.0/plans/v2.0.0-adoption-governed-autonomy-multimodal.md` (sub-task 3.1)
- **Reason**: Chaining UX and `continueFrom` payloads ship. No Wan 2.2 GPU run measured temporal seams between segments. Extra field `seamQuality` is `prototype-unmeasured`.
- **Suggested next step**: On a host with Wan 2.2 weights, generate a 3-segment clip and document visible seam artefacts before calling continuation production-quality.

- **Migrated from**: v2.0.0#DF-9 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.0.0#DF-9; still owed: Required qualification; next: Carry GPU quality hold. Generate three segments, retain outputs and measured/observed seam report.

#### DF-35 - Code-as-action sandbox and Query DSL are not built - MIGRATED to v2.17.0

- **Source phase**: Phase 4 - Code-as-action sandbox + Query DSL (4.3)
- **Plan reference**: `docs/archive/v2/v2.0/plans/v2.0.0-adoption-governed-autonomy-multimodal.md` (sub-task 4.3)
- **Reason**: `core/project/codeAsAction.ts` is a fail-closed kernel (opt-in, no fs, no network, no interpreter). Query DSL and a hardened isolate are not built. JSON tool calls remain the default.
- **Suggested next step**: Arm an isolate that evaluates `source` under the same fail-closed contract, then add Query DSL. Mutating operations must still pass PermissionTiers and ConfirmationGate.

- **Migrated from**: v2.0.0#DF-10 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.0.0#DF-10; still owed: Required implementation/qualification; next: Implement hardened isolate and Query DSL only through a security-scoped plan with permissions/confirmation and adversarial tests; kernel denial is not executable support.

#### DF-36 - Fast small-model command router is not built - MIGRATED to v2.17.0

- **Source phase**: Phase 4 - Fast small-model command router (4.4)
- **Plan reference**: `docs/archive/v2/v2.0/plans/v2.0.0-adoption-governed-autonomy-multimodal.md` (sub-task 4.4)
- **Reason**: `modules/coding/routing/commandRouter.ts` classifies a few short imperatives when `enabled` is true and abstains otherwise. It is not wired into AgentLoop. No before/after latency number exists. Callers still own ConfirmationGate at the normal tier.
- **Suggested next step**: Wire the opt-in classifier at a composition root, keep abstain-and-escalate, and record a latency number versus the full AgentLoop. Do not drop permission tiers.

- **Migrated from**: v2.0.0#DF-11 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.0.0#DF-11; still owed: Required implementation/qualification; next: Implement opt-in composition preserving abstain/escalation and normal confirmation; prove before/after latency plus same permission behavior.

#### DF-37 - VRM Chat presence pane is not built - MIGRATED to v2.17.0

- **Source phase**: Phase 4 - VRM avatar presence layer (4.7)
- **Plan reference**: `docs/archive/v2/v2.0/plans/v2.0.0-adoption-governed-autonomy-multimodal.md` (sub-task 4.7)
- **Reason**: The plan ships this only if Chat demand justifies it. No Chat demand was observed this cycle. Live2D stays rejected (proprietary Cubism Core). Depends on Phase 1.3 TTS timing for lip-sync.
- **Suggested next step**: If Chat users ask for a presence pane, add an optional three-vrm renderer, off by default, VRM only, local, with zero cost when disabled.

- **Migrated from**: v2.0.0#DF-12 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.0.0#DF-12; still owed: Optional candidate/watch; next: Carry demand-gated proposal; do not build renderer merely to close inventory. If accepted, prove no disabled cost and local VRM-only behavior.

#### DF-38 - Inkling-Small GGUF stays text-only (v1.19.2 DF-2) - MIGRATED to v2.17.0

- **Source phase**: Phase 5 - Known-gaps reconciliation (5.2); origin v1.19.2 task 1.6
- **Plan reference**: `docs/archive/v1/v1.19/plans/v1.19.2-adoption-catalog-and-model-expansion.md` (sub-task 1.6)
- **Reason**: Native Inkling-Small accepts text, image, and audio. The curated UD-IQ1_S GGUF has no verified llama.cpp multimodal projector. Catalog `modalities` is `["text"]`.
- **Suggested next step**: Add image/audio modalities only after a dated local load of an image and an audio clip on that GGUF. Keep the row out of `recommended.json`.

- **Migrated from**: v2.0.0#DF-13 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.0.0#DF-13; still owed: Optional candidate/watch; next: Carry accountable Inkling image/audio proof hold, incorporating v1.19.2#DF-2 obligations; both modalities need real local load before enabling.

#### DF-39 - Kimi K3 is not a catalog LLM entry - MIGRATED to v2.17.0

- **Source phase**: Phase 5 - Known-gaps reconciliation (5.2); origin kimi-k3-in-c K4
- **Plan reference**: `docs/archive/v2/v2.0/comparisons/v2.0.6-comparison-kimi-k3-in-c.md` (K4)
- **Reason**: v1.19.2 calibrated the patient tier. A Kimi K3 row waits on a GGUF in the Ollama-wrapped lineage. The C99 engine from kimi-k3-in-c stays rejected.
- **Suggested next step**: If an Ollama-served GGUF lands with a pin, add a patient-tier catalog row. Do not vendor the C engine or the 1.56 TB checkpoint.

- **Migrated from**: v2.0.0#DF-14 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.0.0#DF-14; still owed: Optional candidate/watch; next: Carry model watch with serving/pin/job acceptance before any catalog row.

#### DF-40 - DiffusionGemma is a watch item, not a catalog entry - MIGRATED to v2.17.0

- **Source phase**: Phase 1 - Unsloth Dynamic quant references + capability flags + watch item (1.4 / A4b)
- **Plan reference**: `docs/archive/v2/v2.1/plans/v2.1.0-adoption-open-local-ai-wave.md` (sub-task 1.4)
- **Comparison**: `docs/archive/v2/v2.1/comparisons/v2.1.0-comparison-open-local-ai-wave.md` Section 7 (DG1/DG4)
- **Reason**: Discrete-diffusion text generation at 26B-A4B needs llama.cpp PR #24423 mainlined into a shipped Ollama release, AND sub-16 GB quants published. Stock Ollama support is incomplete. Shipping it today would add a second installer-provisioned runtime for one experimental model.
- **Flip conditions** (both required):
  1. llama.cpp PR #24423 is mainlined into a shipped Ollama release.
  2. Sub-16 GB quants are published.
- **Suggested next step**: Re-open as a catalog entry only when both flip conditions hold. Gate `diffusion: true` and `codingEligible: false` so it never becomes a coding-harness default.

- **Migrated from**: v2.1.0#DF-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.1.0#DF-1; still owed: Optional candidate/watch; next: Carry both explicit external gates; record exact shipped serving version and artifact before reevaluation.

#### DF-41 - Live golden-task re-verification of Muse Glimmer and Nemotron Lightning was not run - MIGRATED to v2.17.0

- **Source phase**: Phase 1 - Local benchmark re-verification (1.5)
- **Plan reference**: `docs/archive/v2/v2.1/plans/v2.1.0-adoption-open-local-ai-wave.md` (sub-task 1.5)
- **Reason**: This cycle had no proven 24 GB-tier host with either model loaded. Catalog `localEval.status` is `not_run`. Vendor-reported SWE-Bench Verified 76.0 stays in `vendorReported` only. `recommended.json` was not changed.
- **Suggested next step**: On a 24 GB-tier machine, run `runCatalogModelEval` against Muse Glimmer K-Quant-17GB and Lightning Q4_K_M, persist the blocks, and only then propose a default-route change.

- **Migrated from**: v2.1.0#DF-2 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.1.0#DF-2; still owed: Required qualification; next: Carry live model evaluation hold. Run catalog golden tasks on correct tier; do not infer routing quality from vendor fields.

#### DF-42 - Live 20-job GPU restart soak is unproven - MIGRATED to v2.17.0

- **Source phase**: Phase 3 - Persistent generation job queue (3.2)
- **Plan reference**: `docs/archive/v2/v2.1/plans/v2.1.0-adoption-open-local-ai-wave.md` (sub-task 3.2)
- **Reason**: Interactive Image Studio / Video Lab clicks now enqueue `priority: "interactive"` and fire-and-forget `pumpOnce` (same GPU slot as batches). Restart recovery remains unit-tested (`running` -> `interrupted` -> `queued`, id-stable). A 20-job batch surviving a real app restart on a GPU host was not run. not_run != pass.
- **Suggested next step**: Soak a 20-job seed sweep across a sidecar restart on a diffusion-capable machine.

- **Migrated from**: v2.1.0#DF-7 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.1.0#DF-7; still owed: Required qualification; next: Carry 20-job soak with restart, stable IDs, recovery counts, and final real artifacts.

#### DF-43 - Muse Glimmer hf.co GGUF is gated vision:false - MIGRATED to v2.17.0

- **Source phase**: Phase 4 - Chat attachment ingestion + visual-token budgeting (4.1)
- **Plan reference**: `docs/archive/v2/v2.1/plans/v2.1.0-adoption-open-local-ai-wave.md` (sub-task 4.1)
- **Reason**: Native Muse is multimodal. The catalog pull is `ollama://hf.co/meta-models/Muse-Glimmer-30B-GGUF:...`. This cycle did not prove that GGUF ships mmproj. `vision` is false so Chat will not send image bytes to a text-only serving path.
- **Suggested next step**: After a local Ollama load of the K-Quant-17GB tag, check for a vision projector. If present, set `vision: true` and a visual-token budget. If absent, keep the gate and leave the native library tag as a follow-up.

- **Migrated from**: v2.1.0#DF-8 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.1.0#DF-8; still owed: Optional candidate/watch; next: Carry projector hold. Verify actual installed GGUF image inference before enabling vision and visual budget.

#### DF-44 - Live Unsloth QLoRA was not run on GPU - MIGRATED to v2.17.0

- **Source phase**: Phase 5 - QLoRA orchestration (5.4 / 5.5)
- **Plan reference**: `docs/archive/v2/v2.1/plans/v2.1.0-adoption-open-local-ai-wave.md` (sub-task 5.4)
- **Reason**: CI uses `stubTrainer` and `runtimes/tuning/train.py --stub`. `NEXUS_TUNING_LIVE=1` is documented. No 16 GB NVIDIA host ran a real `import unsloth` train this cycle. not_run != pass.
- **Suggested next step**: On a supported host, provision from Settings, run a tiny JSONL job with `NEXUS_TUNING_LIVE=1`, and record the wall-clock plus peak VRAM.

- **Migrated from**: v2.1.0#DF-13 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.1.0#DF-13; still owed: Required qualification; next: Carry live training hold. Provision supported host, run tiny real JSONL job, record time, VRAM, and artifacts.

#### DF-45 - Live GPU layer-streaming OOM rescue is unproven - MIGRATED to v2.17.0

- **Source phase**: Phase 6 - Diffusion VRAM-budget knobs (6.3)
- **Plan reference**: `docs/archive/v2/v2.1/plans/v2.1.0-adoption-open-local-ai-wave.md` (sub-task 6.3)
- **Reason**: Unit and Python tests cover validation plus a constrained-VRAM runner path that upgrades `insufficient_vram` to sequential CPU offload when streaming is on. No diffusion-capable host ran a real OOM-then-complete generation this cycle. not_run != pass.
- **Suggested next step**: On a 8-12 GB GPU, set a VRAM cap below the model minimum with layer streaming enabled and record whether the job completes.

- **Migrated from**: v2.1.0#DF-21 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.1.0#DF-21; still owed: Required qualification; next: Carry GPU hold. Reproduce below-minimum cap and actual completion with streaming/offload; retain typed failure if rescue fails.

#### MT-1 - host_detect.py platform probes stay below 80% line coverage - MIGRATED to v2.17.0

- **Source phase**: Phase 1 - Honest host RAM and disk fields
- **Plan reference**: `docs/archive/v2/v2.3/plans/v2.3.1-installer-field-repair.md` (1.1, 1.4)
- **Reason**: Full installer pytest measures `host_detect.py` at 40% lines. New Windows RAM routing, PowerShell fallback, and a live GlobalMemoryStatusEx success path on this Windows host are covered. Remaining misses are pre-existing OS-specific GPU/OS probes plus ctypes ImportError / missing-kernel32 / failed-API branches that this machine does not exercise.
- **Suggested next step**: Leave OS-specific GPU probes unless a later phase touches them. Add a mocked kernel32 failure test only if a frozen windowed build reports RAM-not-detected on a machine that has RAM.

- **Migrated from**: v2.3.1#MT-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.3.1#MT-1; still owed: Historical limitation; next: Carry measurement task. Run fresh focused coverage; add meaningful platform-probe tests for actual gaps rather than treating old percentage as current.

#### DF-46 - Hydrated Video Lab sessions do not restore Enhance eligibility - MIGRATED to v2.17.0

- **Source phase**: Phase 4 - Video Lab Enhance Experience
- **Plan reference**: `docs/archive/v2/v2.3/plans/v2.3.0-adoption-qwen-video2x-openworker.md` (T011, T013)
- **Reason**: Enhance requires a durable output id and SHA-256 from the generation completion event. Studio session turns persist a media path, not those identities, so remounting a saved clip shows the original video and download but not Enhance. not_observed != absent for a later persistence design.
- **Suggested next step**: Persist source output id and hash on studio turns, or recover them from the generation index by path/hash during hydrate, then prove Enhance returns after remount.

- **Migrated from**: v2.3.0#DF-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.3.0#DF-1; still owed: Required implementation/qualification; next: Implement durable identity persistence/recovery and remount regression; prove Enhance returns after hydration and still rejects invalid source.

#### DF-47 - Nexus-Hub security-audit workflow is not released - MIGRATED to v2.17.0

- **Source phase**: Phase 5 - Quality, Performance, and Packaging Evidence
- **Plan reference**: `docs/archive/v2/v2.3/plans/v2.3.0-adoption-qwen-video2x-openworker.md` (T015); `docs/archive/v2/v2.3/development/nexus-hub-security-audit-handoff.md`
- **Reason**: The useful OpenWorker delta is a Hub-owned security-audit workflow. Upstream status is v4.1.1 confirmed, implementation not started, not released. Nexus-AI must not consume a Hub version without that evidence and must not edit the sibling repository.
- **Suggested next step**: When a Hub release publishes scanner-coverage and independent rescan receipts, record the version here and decide whether Nexus-AI should consume it.

- **Migrated from**: v2.3.0#DF-2 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.3.0#DF-2; still owed: Required qualification; next: Carry external release proof hold. Verify receipts and exact consumed version before capability claim.

#### DF-48 - Real Video2X, GPU, and packaged detection remain unmeasured - MIGRATED to v2.17.0

- **Source phase**: Phase 5 - Quality, Performance, and Packaging Evidence
- **Plan reference**: `docs/archive/v2/v2.3/plans/v2.3.0-adoption-qwen-video2x-openworker.md` (T014, T015)
- **Reason**: The fake-backend harness proved fixture geometry, source preservation, and typed failures. Peak CPU/GPU/VRAM, real Video2X 6.4.0 wall time, and packaged-app executable detection are not observed. not_observed != absent.
- **Suggested next step**: Run `node scripts/bench-video-enhancement.mjs --backend real` on supported Windows/Linux hardware and a packaged Windows install that points at a user-installed Video2X 6.4.0 path.

- **Migrated from**: v2.3.0#DF-3 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.3.0#DF-3; still owed: Required qualification; next: Carry real benchmark and packaged detection acceptance with version/path, resources, outputs, and source preservation.

#### WN-1 - jsdom canvas and React act notices in Video Lab tests - MIGRATED to v2.17.0

- **Source phase**: Phase 4 - Video Lab Enhance Experience
- **Plan reference**: `docs/archive/v2/v2.3/plans/v2.3.0-adoption-qwen-video2x-openworker.md` (T013)
- **Reason**: Video Lab tests still emit `HTMLCanvasElement.getContext` and `act(...)` notices. They appeared in the passing Phase 2 desktop aggregate and in the Phase 4 focused run. They are not failed assertions.
- **Suggested next step**: Keep treating them as renderer-environment noise unless a test starts failing. Phase 6 compared a canvas stub and declined the churn.

- **Migrated from**: v2.3.0#WN-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.3.0#WN-1; still owed: Historical limitation; next: Carry explicit warning policy or implement dedicated harness cleanup after reproducing exact notices; do not silence arbitrary console errors.

#### DF-49 - Release-preconditions helper script is absent - MIGRATED to v2.17.0

- **Source phase**: Phase 6 - Architecture Refactor, Known-Gaps Reconciliation, and CI/CD
- **Plan reference**: `docs/archive/v2/v2.3/plans/v2.3.0-adoption-qwen-video2x-openworker.md` (T020)
- **Reason**: `python scripts/check_release_preconditions.py --branches --repo-settings` is the skill-required git-tree hygiene command. The file does not exist in this repository (same finding as v2.2.9 last-phase evidence). Hygiene was reported from `git branch` / `git remote` only. Report-only; no branch was deleted.
- **Suggested next step**: Add the helper in a later hygiene plan, or keep quoting raw git output at each last phase.

- **Migrated from**: v2.3.0#DF-4 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.3.0#DF-4; still owed: Required implementation/qualification; next: Prove resolved with V5, retaining unavailable external checks as unavailable.

#### QG-1 - Named repository-native CI profiles are not present - MIGRATED to v2.17.0

- **Source phase**: Phase 6 - Architecture Refactor, Known-Gaps Reconciliation, and CI/CD
- **Plan reference**: `docs/archive/v2/v2.3/plans/v2.3.0-adoption-qwen-video2x-openworker.md` (T021)
- **Reason**: cicd-architect requires five named profiles (`fast`, `full`, `platform`, `report`, `release`) as repository commands. This repo validates with `npm test`, `npm run test:shell`, `npm run lint`, `python -m pytest tests/python`, and installer `uv run pytest`. Those commands exist and are what CI invokes, but they are not the named five-profile surface. No pipeline file was changed because silence is not approval.
- **Suggested next step**: If a later plan owns CI, add thin npm aliases that call the existing commands without rewriting workflow topology.

- **Migrated from**: v2.3.0#QG-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.3.0#QG-1; still owed: Required implementation/qualification; next: Prove resolved with V4, citing actual five-profile CLI rather than implying all five npm aliases exist. Parent observed 16/16 profile/report tests passed and fast --list returned five commands on 2026-10-20. Proposed resolution is limited to the formerly absent five-profile CLI; this does not prove remote execution.

#### QG-2 - CI workflow lacks least-privilege permissions and an aggregate required check - MIGRATED to v2.17.0

- **Source phase**: Phase 6 - Architecture Refactor, Known-Gaps Reconciliation, and CI/CD
- **Plan reference**: `docs/archive/v2/v2.3/plans/v2.3.0-adoption-qwen-video2x-openworker.md` (T021)
- **Reason**: `.github/workflows/ci.yml` SHA-pins actions, uses npm/pip cache, concurrency cancellation, and 7-day artifacts, but has no workflow-level `permissions` block and no always-resolving aggregate required job. `pull_request.branches` is `main` only; develop integration relies on the `push` trigger. After PR 52 merged, the develop push reran the complete CI suite (observed finding against event separation). Differences were proposed and not applied.
- **Suggested next step**: Approve a least-privilege permissions block and an aggregate required job in a CI-owned phase, then add `develop` to pull_request branches if branch protection should see merge-result checks. Consider running Windows/macOS desktop vitest before a tag, because `shell-build.yml` keeps that matrix on `main` only.

- **Migrated from**: v2.3.0#QG-2 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.3.0#QG-2; still owed: Required implementation/qualification; next: Prove source defect resolved with workflow tests/profile verification; separately check actual branch-protection required context before claiming repository enforcement. Production workflow source now contains contents:read, PR develop and ci-required. Keep actual branch-protection enforcement separate and unverified; no permission or protection change is proposed.

#### BG-1 (resolved) - Windows and macOS Shell Build desktop vitest failed after the v2.3.0 tag - MIGRATED to v2.17.0

- **Source phase**: `/update release` (post-tag `main` Shell Build)
- **Plan reference**: `docs/archive/v2/v2.3/plans/v2.3.0-adoption-qwen-video2x-openworker.md` (Phase 2-3 adapter/lifecycle); run [33235387928](https://github.com/bendourthe/Nexus-AI/actions/runs/33235387928)
- **Reason**: `shell-build.yml` on `main` runs Windows/macOS/Ubuntu. Ubuntu succeeded. Windows reported 75 failed tests, concentrated in `video2x-adapter.test.ts` (47), `video-enhancement-media-lifecycle.test.ts` (15), `video-enhancement-media-adapter.test.ts` (5), `video-enhancement-integration.test.ts` (4), and `windows-video-process-host.test.ts` (3). Observed mismatches include `cpu_probe_failed` vs `probe_failed`, expected `process_failed` / `provenance_failed` / `quarantined` codes vs actual messages such as "Staging root is not a canonical private...", and related lifecycle identity checks. macOS failed the same suite class. Develop Shell Build is Ubuntu-only, so this was not observed before the tag. Recurred on `v2.3.1` at [33264834351](https://github.com/bendourthe/Nexus-AI/actions/runs/33264834351).
- **Resolved**: Intake now treats OS path aliases as the same identity as `realpath` when the leaf is a regular file. Do not retag `v2.3.0` or `v2.3.1`.

- **Migrated from**: v2.3.0#BG-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.3.0#BG-1; still owed: Required implementation/qualification; next: Prove resolved with V8 plus relevant Windows/macOS green regression evidence. Historical prose alone does not prove cross-platform pass.

#### MT-2 - VideoLabPage function coverage is below 80% on the focused run - MIGRATED to v2.17.0

- **Source phase**: Phase 4 - Video Lab Enhance Experience
- **Plan reference**: `docs/archive/v2/v2.3/plans/v2.3.0-adoption-qwen-video2x-openworker.md` (Phase 4 quality gate)
- **Reason**: Focused Phase 4 coverage measured `VideoLabPage.tsx` at 85.64% lines and 72.41% functions. Phase 6 aggregate coverage is 86.94% lines and 72.41% functions. The new Enhance paths are covered; remaining function gaps are pre-existing page helpers. Global desktop coverage is 87.39% lines / 83.66% functions.
- **Suggested next step**: Leave pre-existing page helpers unless a later UI pass touches them. Do not treat this function percentage as a missing Enhance test.

- **Migrated from**: v2.3.0#MT-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.3.0#MT-1; still owed: Historical limitation; next: Carry focused coverage measurement and meaningful uncovered-helper review; do not call existing Enhance paths untested from an old aggregate percentage.

#### DF-50 - Node SEA / externalBin bundling remains deferred - MIGRATED to v2.17.0

- **Source phase**: Carried into v2.2.3 Phase 1
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.3-glass-orbs-and-pillar-runtime.md` (Out of scope)
- **Reason**: The sidecar still uses the verified Node resolution chain rather than a Tauri `externalBin` or Node SEA artifact.
- **Suggested next step**: Revisit only in a packaging-focused cycle with clean-install validation for the replacement artifact.

- **Migrated from**: v2.2.3#DF-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.3#DF-1; still owed: Required implementation/qualification; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede to v2.2.9#DF-38, preserving self-contained Node ABI, architecture-correct native addon, clean-host launch, and repair fallback obligations.

#### DF-51 - Packaged clean-VM and Explorer-launch acceptance not executed - MIGRATED to v2.17.0

- **Source phase**: Carried into v2.2.3 Phase 1
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.3-glass-orbs-and-pillar-runtime.md` (Residual risks)
- **Reason**: Vitest proves the async adapter and route behavior, the debug Tauri build validates the scoped asset-protocol configuration, and the Phase 8 platform contract names the Windows artifact and acceptance gap. This cycle has not launched a packaged shell from Explorer, run a clean-VM install, or played a generated MP4 through a packaged asset URL. Packaged Chatbot first paint and packaged video playback are not proven here.
- **Suggested next step**: Launch the packaged application from Explorer on a clean Windows VM, confirm `/chatbot` renders without a console or blank pane, and play a generated MP4 from the scoped outputs directory.

- **Migrated from**: v2.2.3#DF-2 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.3#DF-2; still owed: Required qualification; next: Carry packaged acceptance hold with actual installer/artifact identity and clean-host proof of each leg.

#### DF-52 - Live-GPU image and video generation soaks not executed - MIGRATED to v2.17.0

- **Source phase**: Carried into v2.2.3 Phase 1
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.3-glass-orbs-and-pillar-runtime.md` (Residual risks, DF-4)
- **Reason**: Automated tests now prove that queue failures, empty image completes, empty video completes, and decode failures become written errors with no false media actions. Real SANA and LTX generation were not executed on a supported GPU, so successful bytes, runtime duration, and asset playback under live load remain unproven.
- **Suggested next step**: Run the existing image and video generation smoke on a supported GPU and capture successful output plus packaged playback evidence.

- **Migrated from**: v2.2.3#DF-4 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.3#DF-4; still owed: Required qualification; next: Carry live smoke hold; retain successful bytes, elapsed time and packaged playback evidence with stubs disabled.

#### DF-53 - CodingInput retains a separate composer implementation - MIGRATED to v2.17.0

- **Source phase**: Carried into v2.2.3 Phase 1
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.3-glass-orbs-and-pillar-runtime.md` (Phase 8.1)
- **Reason**: Phase 8 extracts the byte-identical composer surface, right-control, icon-cluster, document-chip, and remove-button styles into `composerSurfaceStyles.ts`. CodingInput still owns separate markup and behavior for slash-command discovery, audio state, and coding-only controls, so replacing both components with one renderer would broaden behavior rather than remove exact duplication.
- **Suggested next step**: Revisit a shared markup primitive only when the two composers' interaction contracts converge; keep the shared structural styles as the current deduplication boundary.

- **Migrated from**: v2.2.3#DF-14 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.3#DF-14; still owed: Owner decision; next: Carry deliberate composition boundary, or explicitly close broader unification proposal as unnecessary. Merge markup only when behavior converges.

#### DF-54 - Native file dialogs remain unavailable - MIGRATED to v2.17.0

- **Source phase**: Carried into v2.2.3 Phase 1
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.3-glass-orbs-and-pillar-runtime.md` (Phase 6.1, Phase 8.2)
- **Reason**: The repository has no Tauri dialog plugin. Phase 6 ships a validated workspace text field persisted under `nexus.coding.workspacePath`, while Settings data transfer also remains path-text based.
- **Suggested next step**: Add and capability-scope the dialog plugin in a dedicated cross-platform file-dialog task.

- **Migrated from**: v2.2.3#DF-16 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.3#DF-16; still owed: Required implementation/qualification; next: Implement bounded data-transfer open/save dialog task with capability scope and cross-platform tests; correct any stale global no-dialog claim. Preserve B-IMPORT-APPLY and B-DATA-DIALOGS separately; imported files remaining in import-staging do not fulfill full restore.

#### DF-55 - Settings tabs are not URL-addressable - MIGRATED to v2.17.0

- **Source phase**: Carried into v2.2.3 Phase 1
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.3-glass-orbs-and-pillar-runtime.md` (Phase 8.2)
- **Reason**: Resolved in v2.2.4 Phase 2. `SettingsPage` now reads `?tab=` via `useSearchParams` so `/settings?tab=models` opens Models even when Settings is already mounted.
- **Suggested next step**: Nested Settings routes remain optional; query-param tabs satisfy the deep-link contract.

- **Migrated from**: v2.2.3#DF-17 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.3#DF-17; still owed: Required implementation/qualification; next: Prove resolved with V1; query-param tabs satisfy deep-link behavior without requiring nested routes. Parent observed SettingsPage tests passing in the 30/30 focused desktop run on 2026-10-20. Propose resolving practical query-tab deep links; do not claim native packaged navigation was exercised.

#### DF-56 - Packaged macOS and Linux sidecar native-addon paths are not proven - MIGRATED to v2.17.0

- **Source phase**: Carried into v2.2.3 Phase 1
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.3-glass-orbs-and-pillar-runtime.md` (Phase 8.2)
- **Reason**: The Phase 8 parity contract and packaging tests show that macOS and Linux build scripts do not stage the desktop sidecar payload that Windows embeds. No macOS `.app` or Linux AppImage was executed in this session, so native-addon resolution on those targets is not proven here.
- **Suggested next step**: Stage the desktop sidecar payload in both Unix installer builds, then run packaged `--healthcheck` acceptance on each operating system and record the resolved addon path.

- **Migrated from**: v2.2.3#DF-18 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.3#DF-18; still owed: Required implementation/qualification; next: Carry staging implementation and macOS/Linux healthcheck proof, including exact addon path and architecture.

#### DF-57 - CREATE_NO_WINDOW parity is N/A on macOS and Linux - MIGRATED to v2.17.0

- **Source phase**: Carried into v2.2.3 Phase 1
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.3-glass-orbs-and-pillar-runtime.md` (Phase 8.4)
- **Reason**: The Phase 8 parity contract records the Windows creation flag as supported and macOS/Linux as not applicable. The Windows flag has no direct Unix counterpart; absence of an observed terminal window on other platforms is still not proven here.
- **Suggested next step**: Record platform-specific packaged-launch evidence and keep the Windows-only flag classified as N/A elsewhere.

- **Migrated from**: v2.2.3#DF-19 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.3#DF-19; still owed: Historical limitation; required qualification for Unix launch claim; next: Carry platform launch observation only, explicitly N/A for the Windows flag. Record no extra terminal on each packaged Unix launch.

#### DF-58 - Local Chatbot reply transport remains batched - MIGRATED to v2.17.0

- **Source phase**: v2.2.3 Phase 4
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.3-glass-orbs-and-pillar-runtime.md` (Phase 4)
- **Reason**: The sidecar chat protocol is request/response only and exposes no incremental token event channel. Phase 4 keeps the visible Composing orb until the complete reply arrives rather than simulating streaming.
- **Suggested next step**: Add a typed incremental chat event protocol and cancellation contract in a transport-focused cycle, then replace the single terminal response without changing transcript persistence.

- **Migrated from**: v2.2.3#DF-21 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.3#DF-21; still owed: Required implementation/qualification; next: Implement typed incremental event delivery, cancellation and turn-identity contract, preserving durable terminal transcript and visible pending behavior.

#### DF-59 - Workspace Hub hook scripts are not executed by the desktop sidecar - MIGRATED to v2.17.0

- **Source phase**: v2.2.3 Phase 8 reconciliation of Phase 6
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.3-glass-orbs-and-pillar-runtime.md` (Phase 6.3, Phase 8.2)
- **Reason**: Phase 6 wires a vscode-free HookBus lifecycle inside the sidecar, but it does not discover or execute arbitrary workspace Hub hook scripts whose existing host integration depends on VS Code. Treating those scripts as active would be a false capability claim.
- **Suggested next step**: Define a vscode-free hook discovery, permission, timeout, and result contract before enabling workspace hook scripts in desktop or scheduled sessions.

- **Migrated from**: v2.2.3#DF-22 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.3#DF-22; still owed: Required implementation/qualification; next: Implement only after a concrete vscode-free discovery, permission, timeout, environment and result contract; test malicious/failing hooks.

#### WN-2 - Pre-existing SIM117 in installer Complete test - MIGRATED to v2.17.0

- **Source phase**: v2.2.3 Phase 7 verification
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.3-glass-orbs-and-pillar-runtime.md` (7.4)
- **Reason**: Ruff reports a nested `with patch(...)` at `scripts/installer/tests/test_complete.py:13`. The line predates v2.2.3 and is outside the Phase 7 hunks; changing it would be unrelated cleanup. All Phase 7 source and newly changed test paths pass ruff, and every touched file passes `ruff format --check`.
- **Suggested next step**: Combine the two patch contexts during a dedicated installer test-cleanup task.

- **Migrated from**: v2.2.3#WN-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.3#WN-1; still owed: Required implementation/qualification; next: Prove resolved with V6; no unrelated broad lint cleanup required. Parent observed targeted Ruff SIM117 check passed on 2026-10-20. Propose resolving this exact lint occurrence, not the whole installer quality backlog.

#### WN-3 - Desktop DOM suites emit known renderer-environment warnings - MIGRATED to v2.17.0

- **Source phase**: v2.2.3 Phase 8 verification
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.3-glass-orbs-and-pillar-runtime.md` (Phase 8.5)
- **Reason**: The solo desktop suite passes all 1369 tests but emits existing React `act(...)` warnings and jsdom notices for unimplemented Canvas and media methods. These warnings do not indicate failed assertions and the affected harness code is outside the Phase 8 refactor.
- **Suggested next step**: Add targeted Canvas/media stubs and close remaining async React updates inside a dedicated desktop test-harness cleanup.

- **Migrated from**: v2.2.3#WN-2 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.3#WN-2; still owed: Historical limitation; next: Carry harness census and explicit tolerated-warning decision; coordinate exact notices with v2.3.0#WN-1 without suppressing unrelated failures.

#### DF-60 - Node SEA / externalBin bundling not implemented (resolution chain shipped instead) - MIGRATED to v2.17.0

Unchanged. Spawn now also sets `CREATE_NO_WINDOW` on Windows. The Node binary is still resolved from the installer chain, not a Tauri `externalBin`.

- **Migrated from**: v2.2.2#DF-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.2#DF-1; still owed: Required implementation/qualification; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede to v2.2.3#DF-1, preserving its onward v2.2.9#DF-38 packaging obligations.

#### DF-61 - Packaged-build acceptance legs not executed (clean-VM smoke) - MIGRATED to v2.17.0

A 2026-08-22 Complete-page healthcheck on this Windows host printed sidecar ok. That is not a clean-VM proof, and this coding session did not launch `nexus-shell.exe` from Explorer to confirm zero Node consoles after the flag change. Unit tests cover the flag helper.

- **Migrated from**: v2.2.2#DF-2 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.2#DF-2; still owed: Required qualification; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede to v2.2.3#DF-2, preserving clean-VM, no-system-Node, launch, first-paint and playback proof.

#### DF-62 - Live-GPU generation smoke written but not executed - MIGRATED to v2.17.0

Unchanged. Out of scope for v2.2.2.

- **Migrated from**: v2.2.2#DF-4 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.2#DF-4; still owed: Required qualification; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede to v2.2.3#DF-4, preserving actual successful image/video bytes and playback evidence.

#### DF-63 - CodingInput still has its own composer implementation - MIGRATED to v2.17.0

Unchanged as a shared primitive. v2.2.2 restyled CodingInput to the same in-field + / icon-send contract as MediaComposer (slash autocomplete stays). The duplicated surface style objects were not extracted.

- **Migrated from**: v2.2.2#DF-14 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.2#DF-14; still owed: Owner decision; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede to v2.2.3#DF-14, preserving deliberate shared-style boundary and any accepted convergence requirement.

#### DF-64 remaining - no native file dialog for data transfer - MIGRATED to v2.17.0

Unchanged. Settings > Data still takes a path string. Page padding now matches Models.

- **Migrated from**: v2.2.2#DF-16 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.2#DF-16; still owed: Required implementation/qualification; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede to v2.2.3#DF-16, preserving specific import/export native dialog acceptance. Preserve the carried full-restore import requirement from the v2.2.1 predecessor in addition to native file dialogs; the newer short copy does not waive it. Preserve B-IMPORT-APPLY and B-DATA-DIALOGS separately; imported files remaining in import-staging do not fulfill full restore.

#### DF-65 - Settings tabs are not URL-addressable - MIGRATED to v2.17.0

Unchanged. Out of scope.

- **Migrated from**: v2.2.2#DF-17 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.2#DF-17; still owed: Required implementation/qualification; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede to v2.2.3#DF-17 and run V1 before recording implementation closure.

#### DF-66 - Sidecar cwd + native addon on macOS .app and Linux AppImage - MIGRATED to v2.17.0

Unchanged. This session did not execute a macOS `.app` or Linux AppImage install (`not_observed != absent`).

- **Migrated from**: v2.2.2#DF-18 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.2#DF-18; still owed: Required implementation/qualification; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede to v2.2.3#DF-18, preserving both operating systems and packaged addon resolution.

#### DF-67 - CREATE_NO_WINDOW / hidden Node console not applicable on macOS or Linux - MIGRATED to v2.17.0

- **Source phase**: v2.2.2 Phase 1 / Phase 6.4
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.2-ready-shell-and-studio-chrome.md` (1.1, 6.4)
- **Reason**: `creation_flags(CREATE_NO_WINDOW)` is `cfg(windows)` only. macOS and Linux do not allocate a console for a GUI-parented Node child the way Windows console-subsystem `node.exe` does. Those platforms are N/A for this flag, not proven hidden.
- **Suggested next step**: Record a packaged macOS/Linux launch screenshot showing no extra terminal; do not copy the Windows flag there.

- **Migrated from**: v2.2.2#DF-19 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.2#DF-19; still owed: Historical limitation; required qualification for Unix launch claim; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede to v2.2.3#DF-19; preserve actual no-extra-terminal observation separately from N/A.

#### DF-68 - Node SEA / externalBin bundling not implemented (resolution chain shipped instead) - MIGRATED to v2.17.0

Unchanged. Spawn now sets cwd to the script directory and waits for liveness; the Node binary is still resolved from the installer chain, not a Tauri `externalBin`.

- **Migrated from**: v2.2.1#DF-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.1#DF-1; still owed: Required implementation/qualification; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede to v2.2.3#DF-1 with complete self-contained runtime and ABI obligations.

#### DF-69 - Packaged-build acceptance legs not executed (clean-VM smoke) - MIGRATED to v2.17.0

A 2026-08-22 rebuild of `nexus-shell.exe --healthcheck` on this Windows host printed `"sidecar":"ok"` with `catalogRows: 38` after two packaging fixes: copy `unsloth-pins.json` next to the bundle (import-time ENOENT), and fetch `better-sqlite3` for installer Node 22.11.0 (ABI 127) instead of the developer Node 24 (ABI 137). The Complete-page install of a freshly built `dist/NexusSetup.exe` is still the remaining live-install proof.

- **Migrated from**: v2.2.1#DF-2 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.1#DF-2; still owed: Required qualification; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede to v2.2.3#DF-2 with all original acceptance legs retained.

#### DF-70 - Live-GPU generation smoke written but not executed - MIGRATED to v2.17.0

Unchanged. Out of scope for v2.2.1.

- **Migrated from**: v2.2.1#DF-4 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.1#DF-4; still owed: Required qualification; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede to v2.2.3#DF-4 with real output and packaged playback proof retained.

#### DF-71 remaining - no native file dialog for data transfer - MIGRATED to v2.17.0

Unchanged. Settings > Data still takes a path string. Preview-and-stage import is not a full restore into final destinations.

- **Migrated from**: v2.2.1#DF-16 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.1#DF-16; still owed: Required implementation/qualification; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede to v2.2.3#DF-16; IPC implementation does not satisfy file picking. UNIQUE REQUIRED REMAINDER: this older body also says preview-and-stage import is not a full restore into final destinations. Current transferRuntime.ts:363-404 validates/writes under import-staging. Preserve B-IMPORT-APPLY in addition to B-DATA-DIALOGS; append the original obligation to any later accountable copy before superseding. Do not collapse solely as native-dialog work. Preserve B-IMPORT-APPLY and B-DATA-DIALOGS separately; imported files remaining in import-staging do not fulfill full restore.

#### DF-72 - Settings tabs are not URL-addressable - MIGRATED to v2.17.0

Unchanged. Out of scope.

- **Migrated from**: v2.2.1#DF-17 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.1#DF-17; still owed: Required implementation/qualification; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede to v2.2.3#DF-17 and verify V1.

#### DF-73 - Sidecar cwd + native addon on macOS .app and Linux AppImage - MIGRATED to v2.17.0

- **Source phase**: v2.2.1 Phase 1 / Phase 5.4
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.1-field-repair-and-chrome-completion.md` (5.4)
- **Reason**: Spawn cwd is `script.parent()` and Tauri maps the whole `sidecar/dist` tree, which is OS-agnostic in source. This session did not execute a macOS `.app` or Linux AppImage install, so those resource layouts are not proven here (`not_observed != absent`).
- **Suggested next step**: Run `--healthcheck` on a packaged macOS and Linux build and confirm `better_sqlite3.node` resolves from the script directory.

- **Migrated from**: v2.2.1#DF-18 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.1#DF-18; still owed: Required implementation/qualification; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede to v2.2.3#DF-18, retaining both platforms and resolved addon-path receipt.

#### DF-74 - Node SEA / externalBin bundling not implemented (resolution chain shipped instead) - MIGRATED to v2.17.0

- **Source phase**: Phase 1 - Sidecar Packaging and Runtime Wiring Repair (1.2)
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.0-runtime-repair-and-ux-overhaul.md` (sub-task 1.2)
- **Reason**: The plan prefers a Node SEA or Tauri `externalBin` next to the resources so the app is fully self-contained. This phase shipped the resolution chain (`NEXUS_NODE_PATH` -> `~/.nexus/runtime.json` `nodePath` -> per-OS provisioned path -> PATH `node`) plus a guaranteed installer runtime step (payload copy or pinned nodejs.org download, sha256-verified), which covers every installer-driven path. A machine whose app is installed WITHOUT the Nexus installer (raw NSIS bundle) and with no system Node still has no runtime.
- **Suggested next step**: Evaluate Tauri `externalBin` with the Node 22 binary at desktop build time in a later phase; if adopted, it becomes resolution source 2 and the download leg becomes repair-only.

- **Migrated from**: v2.2.0#DF-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.0#DF-1; still owed: Required implementation/qualification; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede to v2.2.3#DF-1, retaining onward v2.2.9#DF-38 standalone packaging acceptance.

#### DF-75 - Packaged-build acceptance legs not executed (clean-VM smoke) - MIGRATED to v2.17.0

- **Source phase**: Phase 1 (1.1 / 1.2 / 1.4 acceptance criteria)
- **Plan reference**: sub-tasks 1.1, 1.2, 1.4
- **Reason**: The 1.1/1.2/1.4 acceptance criteria include running a packaged NSIS build on a clean VM (resource-dir resolution, no-system-Node spawn, installer health-check verdict). This session validated the contracts statically (packaging assertion tests, Rust resolution-chain tests, stubbed healthcheck pytest) but did not produce and execute a full installer build.
- **Suggested next step**: On the next installer build (`build-windows.ps1` -> nexus-installer exe), run the install on a clean Windows VM/sandbox and confirm the Complete page reports `sidecar ok; catalogRows>0`. Phase 2's stability gate re-checks this on the reference machine.

- **Migrated from**: v2.2.0#DF-2 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.0#DF-2; still owed: Required qualification; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede to v2.2.3#DF-2, preserving installer Complete health and no-system-Node proof.

#### DF-76 - provisioner_dispatch chain remains dead code in the GUI flow - MIGRATED to v2.17.0

- **Source phase**: Phase 1 (discovered during 1.3)
- **Plan reference**: sub-task 1.3
- **Reason**: The live `InstallEngine.run` never consumed `provisioner_dispatch.chain_for` ("node", "ffmpeg", python-venv provisioners) - that is WHY no Node was ever provisioned in shipped installs. Phase 1 added a dedicated always-on runtime step rather than rewiring the whole dispatch chain (diffusion venv wheels provisioning is still not wired into the GUI flow; runtime.json records the venv only if present).
- **Suggested next step**: Either wire the dispatch chain into `InstallEngine.run` (diffusion venv + ffmpeg steps) or delete the dead chain in the final refactor phase; the diffusion venv step matters for Phase 2's generation smoke on hosts that never had v1.x installs.

- **Migrated from**: v2.2.0#DF-3 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.0#DF-3; still owed: Owner decision; required qualification for ffmpeg/runtime delivery; next: Implement explicit dead-chain retention/removal decision and verify ffmpeg path. Later runtime provisioning supersedes old missing-venv symptom, not all dispatch-code obligations.

#### DF-77 - Live-GPU generation smoke written but not executed - MIGRATED to v2.17.0

- **Source phase**: Phase 2 - Model Availability End to End (2.5)
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.0-runtime-repair-and-ux-overhaul.md` (sub-task 2.5)
- **Reason**: `scripts/smoke/live-gpu-generation.mjs` renders one real image (sana-1.6b-2k) and one short clip (ltx-video) through the built sidecar and the installed weights, gated behind `NEXUS_LIVE_GPU=1`. It was verified to skip cleanly (exit 2) without the gate, but the actual GPU run was NOT performed in this session - no live render has been proven end to end. The mocked integration test covers routing and the typed `runtime-unavailable` path only.
- **Suggested next step**: Run `NEXUS_LIVE_GPU=1 node scripts/smoke/live-gpu-generation.mjs` on the RTX 3080 host after the next install, and record the outcome here. This is the leg that closes Phase 2's stability gate for real.

- **Migrated from**: v2.2.0#DF-4 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.0#DF-4; still owed: Required qualification; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede to v2.2.3#DF-4, preserving gate-enabled real generation and actual bytes.

#### DF-78 - GPU telemetry reports no queue depth or active model - MIGRATED to v2.17.0

- **Source phase**: Phase 2 (2.4)
- **Plan reference**: sub-task 2.4
- **Reason**: `gpuRuntime.ts` builds `GpuTelemetrySource` with the default `activeJobProvider`, so `activeModelId` is null and `queuedJobs` is 0 in every sample. Real GPU/VRAM/device numbers are live, but the widget's "Idle vs model name" line and queue count are not yet fed by the scheduler. Wiring them means giving the sidecar handler access to the GpuScheduler snapshot, which is exactly what Phase 4's `ModelResidencyContext` introduces.
- **Suggested next step**: Feed the scheduler snapshot into `gpuTelemetrySource()` during Phase 4 (4.3), then assert a non-null `activeModelId` while a job runs.

- **Migrated from**: v2.2.0#DF-5 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.0#DF-5; still owed: Required implementation/qualification; next: Implement scheduler-backed provider and test non-null active model/real queue depth. App's separate occupancy feed does not fix the widget sample.

#### DF-79 - Ollama upgrade path reaches through to a private helper - MIGRATED to v2.17.0

- **Source phase**: Phase 2 (2.3)
- **Plan reference**: sub-task 2.3
- **Reason**: `ensure_ollama_supports()` calls `OllamaInstaller._ollama_version()` (a private method, flagged with `noqa: SLF001`) because there is no public version accessor. Correct behavior, slightly leaky boundary.
- **Suggested next step**: Promote `_ollama_version` to a public `installed_version()` during the Phase 8 refactor and drop the noqa.

- **Migrated from**: v2.2.0#DF-6 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.0#DF-6; still owed: Required implementation/qualification; next: Implement public accessor and update callers/tests, preserving API/CLI fallback behavior.

#### DF-80 [RESOLVED 2026-08-22, Phase 8] - Bundled hub snapshot is not produced by the release build yet - MIGRATED to v2.17.0

- **Source phase**: Phase 3 - Nexus-Hub Harness Provisioning (3.1)
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.0-runtime-repair-and-ux-overhaul.md` (sub-task 3.1)
- **Reason**: `scripts/installer/build/build-hub-snapshot.py` produces a checksummed `catalog.tar.gz` + `manifest.json`, the PyInstaller spec stages them when present (refusing a placeholder digest), and the provisioner extracts them. But no snapshot has been built and no build script calls the builder, so today's installer still falls back to the network sync. The OFFLINE-install guarantee is therefore implemented but not yet delivered.
- **Suggested next step**: Call `build-hub-snapshot.py` from `build-windows.ps1` (and the macOS/Linux build scripts) after a sync, so the release installer always carries a snapshot; then verify an offline install lands a populated catalog.

- **Migrated from**: v2.2.0#DF-7 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.0#DF-7; still owed: Required implementation/qualification; next: Prove resolved for absent build call site with V7. Carry guaranteed offline-delivery claim separately until actual artifact contents and offline install are observed. Build-callsite absence is source-fixed, but the offline artifact guarantee is not established. B-OFFLINE-ARTIFACT survives until build contents and offline install evidence exist.

#### DF-81 - Hub tar extraction uses a minimal in-house reader - MIGRATED to v2.17.0

- **Source phase**: Phase 3 (3.1)
- **Plan reference**: sub-task 3.1
- **Reason**: `extractHubSnapshot` implements a small ustar reader (with a tar-slip guard) rather than adding a tar dependency to the sidecar bundle. It handles the regular-file and directory entries a catalog snapshot contains, but not symlinks, long-name (GNU/PAX) headers, or sparse entries. A snapshot built by `build-hub-snapshot.py` never contains those; a hand-rolled archive could.
- **Suggested next step**: Either keep it and assert the constraint in the builder (reject symlinks/long names at pack time), or vendor a small tar implementation, during the Phase 8 refactor.

- **Migrated from**: v2.2.0#DF-8 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.0#DF-8; still owed: Required implementation/qualification; next: Implement compatible pack/extract contract, reject unsupported entries at build time or support them safely, and exercise real generated snapshots.

#### DF-82 [RESOLVED 2026-08-22, Phase 8] - The switch policy is wired to one submit surface, not four - MIGRATED to v2.17.0

- **Source phase**: Phase 4 - Smart Single-GPU Model Orchestration (4.3)
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.0-runtime-repair-and-ux-overhaul.md` (sub-task 4.3)
- **Reason**: sub-task 4.3 calls for integrating the policy into "the studios' and chat/coding submit paths". Only `ImageStudioPage.handleSubmit` is wired (classify, dialog, chip, resume-after-confirm). Video Lab, Local Chatbot, and the Agentic composer still submit without consulting the policy, so a submit from those surfaces cannot raise the confirm dialog.
- **Suggested next step**: Apply the same four-line gate to `VideoLabPage`, the chat composer, and the coding composer. The hook and dialog are surface-agnostic; the remaining work is per-surface wiring plus one test each.

- **Migrated from**: v2.2.0#DF-9 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.0#DF-9; still owed: Required implementation/qualification; next: Prove resolved with V3 and affected submit-flow behavioral verification; not only source-string matches. Parent observed occupancy tests within the 30/30 focused run. Propose resolving the four-submit wiring absence only; no real live concurrent-model switching was observed.

#### DF-83 [RESOLVED 2026-08-22, Phase 8] - The policy is not fed live residency or scheduler state - MIGRATED to v2.17.0

- **Source phase**: Phase 4 (4.1 / 4.3)
- **Plan reference**: sub-tasks 4.1, 4.3
- **Reason**: `ImageStudioPage` accepts `hostVramFreeGB` and `activeSchedulerJob` props, but `App.tsx` does not yet supply them, and `useModelResidency` starts with an empty resident list that nothing updates from the scheduler. In the shipped app the policy therefore sees "nothing loaded, VRAM unknown" and takes the no-incumbent path on every submit. The decision matrix is correct and fully tested; it is simply not being given real inputs yet. This is the same missing feed as DF-5 (telemetry carries no active model or queue depth).
- **Suggested next step**: Expose a `scheduler.snapshot` IPC (active job + queued) alongside the existing `gpu.sample`, feed `resident`/`freeVramGB`/`activeJob` from it in `App.tsx`, and assert an end-to-end confirm in a page test. Closing this also closes DF-5.

- **Migrated from**: v2.2.0#DF-10 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.0#DF-10; still owed: Required implementation/qualification; next: Prove resolved with V3 and end-to-end incumbent confirmation. Keep unrelated telemetry widget DF-5 open until its own provider is wired. Parent observed occupancy tests within the 30/30 focused run. The separate telemetry provider defect remains B-GPU-TELEMETRY; do not close it as a side effect.

#### DF-84 [RESOLVED 2026-08-22, Phase 8] - Cross-model orchestration is not wired to the real agent tools - MIGRATED to v2.17.0

- **Source phase**: Phase 4 (4.2)
- **Plan reference**: sub-task 4.2
- **Reason**: `runCrossModelRequest` implements hold -> classify -> run -> restore with the three failure modes, and is covered by tests against a mock runtime (which is what the sub-task's acceptance asks for). It is not yet called by the coding agent's image/video tools, so an actual agentic session cannot exercise it, and the Trace-panel progress lines it emits are not rendered anywhere.
- **Suggested next step**: Call it from the agent's image/video tool handlers, passing the session's current model as `agenticModelId`, and render `CrossModelProgress` in the coding Trace panel.

- **Migrated from**: v2.2.0#DF-11 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.0#DF-11; still owed: Required implementation/qualification; next: Implement actual tool composition and progress rendering or explicitly reconcile obsolete requirement. Do not close from prose/source-string tests. B-CROSSMODEL-COMPOSITION remains mandatory despite historical RESOLVED title: current production search has no runCrossModelRequest caller or CrossModelProgress renderer. Implement and exercise the production tool entrypoint plus progress renderer, or obtain an explicit change to that original contract; tests of the helper alone are insufficient.

#### DF-85 [RESOLVED 2026-08-22, Phase 8] - The chat rail is not yet the chat-first session history (5.2) - MIGRATED to v2.17.0

- **Source phase**: Phase 5 - Local Chatbot Rebuild (5.2)
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.0-runtime-repair-and-ux-overhaul.md` (sub-task 5.2)
- **Reason**: 5.2 asks for a rebuilt rail: composer-first empty state, a "New chat" primary action, recent chats at root, an optional Projects section, drag between root/projects/folders, and a collapsible rail. This phase delivered the storage, titling, persona, and composer work; `FolderTree` still renders its original "Create your first folder" empty state and the page still requires selecting a chat before the composer is usable. The user's specific complaint ("it only starts a chat when we create a folder") is therefore NOT yet fixed in the UI, even though the store has supported root-level chats all along.
- **Suggested next step**: Rework `FolderTree` into the session rail and make `ChatPage` render the composer with no active chat, creating a root chat on first send. The storage calls it needs (`createChat` with `folderId: null`, `listMessages`) are already wired and tested.

- **Migrated from**: v2.2.0#DF-12 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.0#DF-12; still owed: Required implementation/qualification; next: Prove resolved for folder prerequisite with V2 and actual first-send flow; reconcile optional full-rail specification explicitly rather than implying every structural request is proved. Parent observed chat-gaps/title tests within the 30/30 focused run. Propose resolving folder-required behavior only, with full rail design wording reconciled explicitly.

#### DF-86 [RESOLVED 2026-08-22, Phase 8] - Auto-titling is implemented end to end but not called on first send - MIGRATED to v2.17.0

- **Source phase**: Phase 5 (5.3)
- **Plan reference**: sub-task 5.3
- **Reason**: `chat.generateTitle` (sidecar), `fallbackTitle`/`sanitizeTitle`, the `userRenamed` pin, and the `renameChat({byUser})` split are all implemented and tested. The client-side trigger - set the fallback title on first send, request the generated one in the background, apply unless the user renamed - is not yet in `ChatPage.handleSubmit`, so chats created today still carry the title `FolderTree` gives them.
- **Suggested next step**: In `handleSubmit`, when the chat has no messages yet, set the fallback title immediately, then call `generateTitle` and apply the result via `renameChat(id, title)` (machine path, so it never sets `userRenamed`).

- **Migrated from**: v2.2.0#DF-13 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.0#DF-13; still owed: Required implementation/qualification; next: Prove resolved with V2, including user rename protection and title failure not failing send. Parent observed chat-gaps/title tests within the 30/30 focused run. Propose resolving missing first-send title call site; user rename and failure behavior require the cited covered cases.

#### DF-87 - CodingInput still has its own composer implementation - MIGRATED to v2.17.0

- **Source phase**: Phase 5 (5.4)
- **Plan reference**: sub-task 5.4 ("Update CodingInput to reuse the same base composer")
- **Reason**: `MediaComposer` was rebuilt as the single in-field surface used by Chat, Image Studio, and Video Lab. `CodingInput` keeps its own layout and its own duplicated `addBtnStyle`/`docChipStyle`/`removeBtnStyle` objects, because it carries the slash-command dropdown that the shared composer has no concept of.
- **Suggested next step**: Extract the surface (field + in-field controls) into a shared primitive that accepts an overlay slot, then have `CodingInput` supply its dropdown through that slot. Phase 6's ui-primitives work is the natural place.

- **Migrated from**: v2.2.0#DF-14 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.0#DF-14; still owed: Owner decision; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede to v2.2.3#DF-14, retaining explicit renderer-convergence decision rather than forcing behavior changes.

#### DF-88 - Token aliases added rather than call sites migrated - MIGRATED to v2.17.0

- **Source phase**: Phase 6 - Shell UI Modernization (6.4)
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.0-runtime-repair-and-ux-overhaul.md` (sub-task 6.4)
- **Reason**: `--border-1`, `--accent-primary`, `--accent-danger`, and `--accent-warning` were referenced in 71 places but never defined, so each usage fell through to whatever inline literal its author happened to write. They are now DEFINED as aliases of the canonical tokens, which fixes the rendering immediately. The plan also asked to migrate the 71 call sites and delete the aliases; that rename was deliberately not done inside a UI phase, where it would have been a large mechanical diff competing with real behaviour changes.
- **Suggested next step**: Sweep the call sites to the canonical names and delete the alias block during the Phase 8 refactor, with the existing token test as the guard.

- **Migrated from**: v2.2.0#DF-15 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.0#DF-15; still owed: Owner decision; next: Implement scoped mechanical call-site migration and delete aliases with token regression, or retain explicit canonical alias contract. Do not claim sweep happened.

#### DF-89 [PARTIALLY RESOLVED 2026-08-22, Phase 8] - Data transfer has no IPC surface or file dialogs yet - MIGRATED to v2.17.0

- **Source phase**: Phase 7 - Settings modernization and data transfer (7.4)
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.0-runtime-repair-and-ux-overhaul.md` (sub-task 7.4)
- **Reason**: `transferRuntime.ts` implements export and import end to end (manifest, per-category checksums, credentials excluded by default, atomic write, path-escape refusal, dry run, pre-import backup) and is covered by 15 tests. Settings > Data renders the category picker and calls a `DataSettingsClient`, but no `data.export` / `data.import` IPC methods exist and no save/open dialog is wired, so the page reports "the Nexus backend is not reachable" in the running app. The import apply path also stages files under `~/.nexus/import-staging` rather than moving them into place.
- **Resolution (Phase 8)**: `data.categories`, `data.export`, and `data.import` are declared, handled, and covered; Settings > Data now reaches the real runtime, exports to an editable path defaulting to a timestamped name, and offers Preview before Import.
- **Remaining**: no native file dialog. Adding one means a Tauri plugin plus a capability change, which is not a change to slip into a release build; the path fields cover the same ground without it. The import apply path still stages under `~/.nexus/import-staging` rather than merging into final destinations, so an import is a preview-and-stage, not yet a full restore.

- **Migrated from**: v2.2.0#DF-16 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.0#DF-16; still owed: Required implementation/qualification; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede to v2.2.3#DF-16, retaining specific native data-transfer dialog remainder without reopening delivered IPC. Original entry explicitly says import apply stages files rather than moving into place. Carry B-IMPORT-APPLY with full-restore destination, validation/backup, atomicity and recovery tests, alongside later native-dialog remainder. Preserve B-IMPORT-APPLY and B-DATA-DIALOGS separately; imported files remaining in import-staging do not fulfill full restore.

#### DF-90 - Settings tabs are still not URL-addressable - MIGRATED to v2.17.0

- **Source phase**: Phase 7 (7.2)
- **Plan reference**: sub-task 7.2
- **Reason**: 7.2 asks for a declarative tab registry with `/settings/:tab` routing, redirects, and lazy mounting. This phase added the Data tab to the existing hand-written button list and ternary chain instead. Deep links to a specific settings tab therefore still do not work, and `/profile` redirects to `/settings` rather than `/settings/profile`.
- **Suggested next step**: Convert the tab list to a registry with routing during the Phase 8 refactor; the tab bodies are already independent components.

- **Migrated from**: v2.2.0#DF-17 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.0#DF-17; still owed: Required implementation/qualification; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede to v2.2.3#DF-17 and prove V1; distinguish optional nested routes from required user behavior.

#### MT-3 - Studio backend-down banner not covered by a page-level test - MIGRATED to v2.17.0

- **Source phase**: Phase 2 (2.2)
- **Plan reference**: sub-task 2.2
- **Reason**: The classifier, the hook, and the settings pages are covered, but no test renders `ImageStudioPage` / `VideoLabPage` with a stubbed `sidecar_status` reporting `running: false` to assert the banner replaces the "No image models installed" button. The pages read the status through a Tauri command that is absent under Vitest (`ipc-unavailable` -> unknown -> not down), so this needs an injectable seam.
- **Suggested next step**: Add a `sidecarStatus` prop (or a context provider) to the studio pages in Phase 6's shell work and assert both branches.

- **Migrated from**: v2.2.0#MT-3 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.0#MT-3; still owed: Required implementation/qualification; next: Implement page-level backend-down/up tests through supported seam and verify banner versus no-model button branch.

#### MT-4 - Sidecar boot wiring (main.ts) covered only indirectly - MIGRATED to v2.17.0

- **Source phase**: Phase 1 (1.3)
- **Plan reference**: sub-task 1.3
- **Reason**: `applyRuntimeConfigEnv` is unit-tested, but the `main.ts` call site (applied before runtime construction, stderr log line) has no direct test - `main.ts` is the process entry and has no test harness today.
- **Suggested next step**: Cover via the Phase 2 sidecar-level integration test (spawn the built sidecar with a fixture `NEXUS_AI_HOME`/home and assert the boot log line).

- **Migrated from**: v2.2.0#MT-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.0#MT-1; still owed: Required implementation/qualification; next: Carry focused process integration task: spawn built sidecar against fixture runtime config/home, prove config applied before construction and expected log.

#### MT-5 - Complete-page health detail line untested - MIGRATED to v2.17.0

- **Source phase**: Phase 1 (1.4)
- **Plan reference**: sub-task 1.4
- **Reason**: The Complete page now renders `state.desktop_health_detail`; existing complete-page tests pass but none assert the new detail string.
- **Suggested next step**: Add a QLabel-text assertion to the complete-page pytest when Phase 7 reworks settings/pages tests, or fold into the installer UI test pass.

- **Migrated from**: v2.2.0#MT-2 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.0#MT-2; still owed: Required implementation/qualification; next: Implement injected desktop_health_detail QLabel assertion, including failed health text and no misleading success state.

#### DF-91 - Packaged v2.2.9 chrome and catalog surfaces are unproven - MIGRATED to v2.17.0

- **Source phase**: v2.2.9 Phases 1-6
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.9-field-chrome-catalog-and-generate.md` (Operator field checklist)
- **Reason**: The v2.2.9 UI changes (meta above the bubble, orb caption rotator, studio Chats copy, visual Context bar, typed generate errors in the UI, catalog name-row pills, Hub sync staging) are unit-proven across the desktop, root, installer, and python diffusion suites. The final unsigned Windows installer was rebuilt during release preparation and passed version, registry, and embedded-desktop-payload probes, but those probes do not observe the seven visual/operator behaviors. The 2026-08-25 screenshots predate every Phase 1-6 change. not_observed != absent.
- **Suggested next step**: Run the plan's operator field checklist items 1-7 against the rebuilt unsigned Windows installer (chrome/picker split, meta and titles after `Hi`, composing pill, studio history and Context, typed generate outcome, installer = Settings cards, Hub banner/sync).

- **Migrated from**: v2.2.9#DF-36 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.9#DF-36; still owed: Required qualification; next: Carry packaged qualification: run all seven checks from `docs/archive/v2/v2.2/plans/v2.2.9-field-chrome-catalog-and-generate.md` on the current installer, binding captures to its digest.

#### WN-4 - Root vitest run mutates the memory-tier benchmark fixture - MIGRATED to v2.17.0

- **Source phase**: v2.2.9 Phases 1-6 verification
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.9-field-chrome-catalog-and-generate.md` (Phase 7.7); commit `f7120ae`
- **Reason**: The root vitest suite rewrites timing fields in `tests/fixtures/memory-tier-benchmark-results/2026-05-26/results.json` on every run. Release preparation reproduced the timing-only drift during root coverage, desktop coverage, and the canonical package test run; the fixture was restored after verification. See commit `f7120ae`, `chore(tests): restore benchmark fixture mutated by root test run`, for the earlier occurrence.
- **Suggested next step**: Make the benchmark write its results to a temp directory instead of the tracked fixture, or gitignore the timing fields it mutates.

- **Migrated from**: v2.2.9#WN-8 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.9#WN-8; still owed: Required implementation; next: Prove resolved candidate with command A below and a before/after tracked-fixture hash. Concurrent implementation must be committed before recording closure.

#### WN-5 - Desktop suite 5000ms-timeout flakes under host load - MIGRATED to v2.17.0

- **Source phase**: v2.2.9 Phases 1-6 verification
- **Plan reference**: WN-2 class (`docs/archive/v2/v2.2/plans/v2.2.3-glass-orbs-and-pillar-runtime.md` Phase 8.5)
- **Reason**: Under host load, desktop tests intermittently exceed the 5000ms per-test timeout across unrelated files. Observed twice this cycle; quiet-machine reruns pass all 1603 tests across 182 files. These are environment-load timeouts of the WN-2 renderer-environment class, not failed assertions.
- **Suggested next step**: Rerun the desktop suite on a quiet machine before treating a timeout as a regression; consider raising the timeout for known-slow suites or isolating the desktop job in CI.

- **Migrated from**: v2.2.9#WN-9 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.9#WN-9; still owed: Required qualification; next: Carry test reliability: retain failing test names and timings from a loaded full-suite reproduction, then fix the identified waits/contention; verify a serial and normal full run. Avoid raising every timeout without a reproduction.

#### MT-6 - Per-phase line coverage was not measured this cycle - MIGRATED to v2.17.0

- **Source phase**: v2.2.9 Phases 1-6
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.9-field-chrome-catalog-and-generate.md` (phase stability gates)
- **Reason**: Desktop, root, installer, and Python suites passed at phase boundaries without coverage instrumentation. Aggregate root and desktop coverage passed during release preparation, but that final-state measurement cannot reconstruct the per-phase percentages the plan requested.
- **Suggested next step**: Require and record the applicable coverage command at each phase boundary in the next release plan so missing per-phase evidence cannot recur.

- **Migrated from**: v2.2.9#MT-4 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.9#MT-4; still owed: Historical limit; next: Carry historical evidence limit with an owner decision: either reproduce each pinned phase commit with coverage in isolation, or accept the unrecoverable historical omission and require coverage receipts on future phase boundaries. Current aggregate coverage cannot resolve it retroactively.

#### DF-92 - Typed diffusion error kinds are prose-only across the wire - MIGRATED to v2.17.0

- **Source phase**: v2.2.9 Phase 7 (Goal-vs-codebase review finding on Phase 4)
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.9-field-chrome-catalog-and-generate.md` (Phase 4.1)
- **Reason**: `RuntimeNotReady.kind` (`cuda-torch-missing` / `weights-missing` / `gpu-not-available`) is machine-readable inside Python, but `runtimes/diffusion/main.py` serializes only the message text, so TypeScript sees the classification as prose. The UI goal (operators can tell the cases apart) is met; downstream code cannot branch on kind.
- **Suggested next step**: If any consumer needs to branch on failure kind, add a `kind` field to the diffusion error envelope and thread it through `resultGuard`.

- **Migrated from**: v2.2.9#DF-37 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.9#DF-37; still owed: Optional candidate/watch; next: Implement if typed downstream classification is retained: add an error-kind field through runtime, sidecar, and result guard; prove with B. Otherwise record an explicit product decision that actionable prose is the complete contract.

#### DF-93 - Raw Tauri desktop bundles are not self-contained release artifacts - MIGRATED to v2.17.0

- **Source phase**: v2.2.9 release preparation
- **Plan reference**: release packaging audit; carried architectural gap DF-1 from v2.2.0
- **Reason**: `tauri.conf.json` packages the sidecar bundle but not Node. The desktop resolves Node through `NEXUS_NODE_PATH`, installer-written `~/.nexus/runtime.json`, the installer-provisioned path, then bare `node` on `PATH`; only the Python provisioning installer downloads checksummed Node 22.11.0 and writes the manifest. The sidecar's `better-sqlite3` targets Node ABI 127, so another system Node can spawn and then fail on the first SQLite open. The former universal macOS path also carried only one host-architecture native addon. Publishing those raw bundles would overstate standalone support, so v2.2.9 attaches only the complete Windows installer and three platform VSIXes.
- **Suggested next step**: Bundle a pinned per-target Node runtime through Tauri `externalBin` or resources, resolve it before installer/PATH fallbacks, build architecture-correct macOS artifacts, and pass clean-host sidecar health checks before restoring standalone desktop attachments.

- **Migrated from**: v2.2.9#DF-38 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.9#DF-38; still owed: Owner decision; next: Implement pinned per-target runtime packaging with clean-host qualification, or retain installer-only desktop publication explicitly. Requires per-target ABI and native-addon proof, not only a successful Tauri build.

#### MT-7 - Publisher map and Agentic-pill guard have no cross-language parity test - MIGRATED to v2.17.0

- **Source phase**: v2.2.9 Phase 7 (Goal-vs-codebase review finding on Phase 5)
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.9-field-chrome-catalog-and-generate.md` (Phase 5.1, WN-7 discipline)
- **Reason**: `FAMILY_TO_PUBLISHER` is duplicated verbatim (27 entries, currently byte-identical) in installer `constants.py` and desktop `modelPills.ts`, but no test asserts full-map parity; only the 6 fixture families are cross-checked. The Agentic pill guards are also not textually identical (the installer's `type` field carries tab keys, so its condition has extra arms); they agree on the fixture and real catalog shapes but are not provably equivalent for arbitrary inputs.
- **Suggested next step**: Generate one side's map from the other (or add a parity test that reads both files), and align the Agentic guard inputs so the two conditions are structurally identical.

- **Migrated from**: v2.2.9#MT-5 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.9#MT-5; still owed: Required implementation; next: Implement full-map and Agentic-predicate parity using real catalog shapes plus malformed/missing fields; prove with C. Existing six-family fixtures do not establish whole-map equivalence.

#### DF-94 - Agents folders are a local overlay, not sidecar schema - MIGRATED to v2.17.0

- **Source phase**: v2.2.8 Phase 2
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.8-working-local-studio.md` (Phase 2.1, folders optional)
- **Reason**: `coding.session.*` has no folder rows. FolderTree on Agents uses `localStorage` (`nexus.coding.explorerFolders`) so New folder is not a dead control. Sessions stay in sidecar `sessions.json`. Deleting an overlay folder reparents sessions instead of calling `coding.session.delete`. Folders do not roam with the sidecar store.
- **Suggested next step**: If Agents folders must survive a storage wipe the same way Chatbot folders do, add a sidecar folder table keyed by workspace, or document overlay-only as the product contract.

- **Migrated from**: v2.2.8#DF-33 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.8#DF-33; still owed: Owner decision; next: Carry product decision: accept/document overlay-only semantics, or implement workspace-keyed durable folders and test deletion reparenting, restart, and storage export. Do not call existing local persistence a roaming store.

#### DF-95 - Packaged Settings vs installer Models identity is unproven - MIGRATED to v2.17.0

- **Source phase**: v2.2.8 Phase 4
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.8-working-local-studio.md` (Phase 4 Stability Gate)
- **Reason**: A shared golden fixture dual-asserts installer `collapse_and_sort` and desktop `visibleModelsOnTab`. Compact cards and the Downloaded highlight are unit-proven. The 2026-08-25 field session did screenshot packaged Settings (screenshot 9) next to the installer (screenshot 8), but both showed the pre-v2.2.9 divergent cards; that divergence is what drove v2.2.9 Phase 5's shared card grammar (name-row pills, Embeddings tab first, Inkling-Small in both). Those screenshots predate the new grammar and cannot close this row. not_observed != absent.
- **Suggested next step**: On a rebuilt packaged build, open Settings > Models and the installer Models tab on the same host and confirm both render the v2.2.9 shared name-row pill grammar with Embeddings first and Inkling-Small present (DF-36 field checklist item 6), plus Chat order, family collapse, gray over-budget last, and Gemma 4 12B Downloaded when `ollama list` has `gemma4:12b`.

- **Migrated from**: v2.2.8#DF-34 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.8#DF-34; still owed: Required qualification; next: Carry packaged side-by-side qualification: current installer and Settings, same catalog/owned models/host, with tab order, collapse, over-budget partition, and Downloaded state recorded. Can share an execution with v2.2.9#DF-36 without dropping either identity.

#### DF-96 - Packaged Settings and installer Context chips are unproven - MIGRATED to v2.17.0

- **Source phase**: v2.2.7 Phase 1
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.7-context-meter-and-transcript-chrome.md` (Phase 1)
- **Reason**: Closed in v2.2.9 Phase 7. The 2026-08-25 field session screenshotted the packaged Settings > Models tab (screenshot 9, chips rendering) and the running installer Models tab (screenshot 8, `Context: 256k`-class pills). Historical row kept so v2.2.7 readers can follow the close; the chip grammar itself was superseded by the v2.2.9 Phase 5 shared name-row pills.
- **Suggested next step**: None. See v2.2.9 Resolved DF-28 (new-grammar verification travels with DF-34 and DF-36).

- **Migrated from**: v2.2.7#DF-28 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.7#DF-28; still owed: Required qualification; next: Prove resolved marker candidate by verifying those historical references and narrowly marking the historical chip-render obligation. Preserve new-grammar qualification at v2.2.8#DF-34 and v2.2.9#DF-36.

#### DF-97 - Live Ollama usage and thinking fields are unproven - MIGRATED to v2.17.0

- **Source phase**: v2.2.7 Phase 2
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.7-context-meter-and-transcript-chrome.md` (Phase 2)
- **Reason**: Unit fixtures persist `prompt_eval_count` / `eval_count` / `message.thinking` onto the chat done event and round-trip chat/studio/coding stores. A live Gemma 4 Ollama final chunk was not captured this phase. Coding agent turns estimate when the runner does not attach counters. The 2026-08-25 field session (v2.2.9 plan screenshot 2) shows `75 think + 96 out` rendering on a packaged reply, which is consistent with live usage persist but does not verify that the persisted row matches the final Ollama chunk, so this row stays open. not_observed != absent.
- **Suggested next step**: Send one Chatbot turn against a local Ollama Gemma 4 model and confirm the persisted assistant row matches the final chunk; if thinking is in `message.thinking`, confirm it counts toward used tokens.

- **Migrated from**: v2.2.7#DF-29 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.7#DF-29; still owed: Required qualification; next: Carry live provider qualification: capture a real final Ollama response and the resulting persisted assistant turn, compare counters and thinking text, and distinguish request-wide from message-attributed usage.

#### DF-98 - Packaged four-tab Context meter and 80% CTA are unproven - MIGRATED to v2.17.0

- **Source phase**: v2.2.7 Phase 3
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.7-context-meter-and-transcript-chrome.md` (Phase 3)
- **Reason**: Component tests cover 79% without CTA, 80% CTA creating a new Chatbot session without deleting the old tree row, hidden bar when no window or visual budget, and pickers under `composer-context-row` on Chat/Agents/Images/Videos. Partially observed 2026-08-25: the Context pill rendered on packaged Chatbot (v2.2.9 plan screenshot 1, which also drove the Phase 1 width rebalance), but the 80% CTA was not observed, and Images/Videos showed no meter because pre-v2.2.9 studio rows had no visual budget (added in v2.2.9 Phase 3). Partial observation is an annotation, not a close. not_observed != absent.
- **Suggested next step**: On a rebuilt packaged build, send Chatbot turns until the pill reaches 80%, accept Start a new session, confirm the old chat remains; confirm the Images/Videos Context pill now fills against `visualTokenBudget` and that peeking does not load weights (DF-36 field checklist item 4).

- **Migrated from**: v2.2.7#DF-30 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.7#DF-30; still owed: Required qualification; next: Carry packaged interaction qualification: cross 80%, start a new session while preserving the old one, inspect all four surfaces, and verify opening the picker does not load weights.

#### DF-99 - Packaged transcript date, time, and token chrome is unproven - MIGRATED to v2.17.0

- **Source phase**: v2.2.7 Phase 4
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.7-context-meter-and-transcript-chrome.md` (Phase 4)
- **Reason**: Closed in v2.2.9 Phase 7. The 2026-08-25 field session (v2.2.9 plan screenshot 2) shows the packaged Chatbot transcript rendering the clock and per-role token chrome this row asked for (`8:34 p.m.`, user `1 in`, assistant `75 think + 96 out`). Historical row kept so v2.2.7 readers can follow the close; the `N in` / em-dash copy this row verified was superseded by v2.2.9 Phase 1 full-word meta above the bubble.
- **Suggested next step**: None. See v2.2.9 Resolved DF-31 (new-copy verification travels with DF-36).

- **Migrated from**: v2.2.7#DF-31 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.7#DF-31; still owed: Required qualification; next: Prove resolved marker candidate for the historical transcript format after validating that reference. New full-word metadata and its four-pillar rendering remain v2.2.9#DF-36.

#### WN-6 - Context chip formatters are duplicated across TypeScript and Python - MIGRATED to v2.17.0

- **Source phase**: v2.2.7 Phase 1
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.7-context-meter-and-transcript-chrome.md` (T002)
- **Reason**: The desktop renderer cannot import the installer Python module. Matching tests lock `128k` and `32k / 8k` on both sides. Drift remains possible if one formatter is edited alone.
- **Suggested next step**: Keep the two test files in the same PR as any copy change, or generate Python copy from the TypeScript fixture in a later cleanup.

- **Migrated from**: v2.2.7#WN-7 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.7#WN-7; still owed: Optional candidate/watch; next: Prove the original drift-mitigation contract with C. If stronger generation/parity is required, supersede into v2.2.9#MT-5 with the context formatter cases explicitly retained; duplicated implementation alone is not a functional defect.

#### DF-100 - Packaged Explorer launch is unproven - MIGRATED to v2.17.0

- **Source phase**: carried from v2.2.5
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.6-session-memory-and-studio-history.md` (Phase 6.2)
- **Reason**: Closed in v2.2.8 Phase 6. Packaged Explorer launch was observed 2026-08-24 (v2.2.8 plan Review verdict). Historical row kept so v2.2.6 readers can follow the close.
- **Suggested next step**: None. See v2.2.8 Resolved DF-2.

- **Migrated from**: v2.2.6#DF-2 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.6#DF-2; still owed: Required qualification; next: Prove resolved marker candidate by verifying `docs/archive/v2/v2.2/plans/v2.2.8-working-local-studio.md` Review verdict and matching release artifact.

#### DF-101 - Live GPU image/video generate is unproven - MIGRATED to v2.17.0

- **Source phase**: carried from v2.2.5
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.6-session-memory-and-studio-history.md` (operator field checklist)
- **Reason**: Fail-closed envelopes and last-output follow-up are unit-proven. An operator GPU generate that paints a SANA image or a video clip was not recorded this session. Still open after the 2026-08-25 field session: screenshot 7 (v2.2.9 plan) recorded a packaged Image generate fail-closing with the combined `GPU or diffusion weights unavailable` string on a host showing 15 GB free NVIDIA VRAM; that observes fail-closed behavior, not a generate. v2.2.9 Phase 4 has since split that combined string into typed CUDA-missing vs weights-missing vs GPU-not-ready messages, so the operator will now see one of the typed strings instead.
- **Suggested next step**: Run one Image Studio generate and one Video Lab generate on a host with weights and CUDA-enabled diffusion Python, and record the PNG/MP4; or confirm the new typed CUDA/weights/GPU message in the UI (DF-36 field checklist item 5). The combined-only string is now a miss.

- **Migrated from**: v2.2.6#DF-4 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.6#DF-4; still owed: Required qualification; next: Carry remaining packaged UI qualification, retaining the historical artifact evidence as a partial. Observe image and video output, or the specific permitted typed failure in the current UI, without representing a failure as a successful generate.

#### DF-102 - Packaged session persist (quit/reopen) is unproven - MIGRATED to v2.17.0

- **Source phase**: v2.2.6 Phases 1-5
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.6-session-memory-and-studio-history.md` (Phase 6.2)
- **Reason**: Image/Video SQLite, Agents `sessions.json`, and Chatbot explorer DB round-trips are unit-proven. A packaged Explorer quit/reopen soak was not run. The 2026-08-25 field session (v2.2.9 plan) did not include a quit/reopen, so this row is unchanged. not_observed != absent.
- **Suggested next step**: Install the unsigned Windows build, take one turn in each pillar, quit, reopen, and record whether the same session hydrates.

- **Migrated from**: v2.2.6#DF-25 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.6#DF-25; still owed: Required qualification; next: Carry packaged persistence qualification: create a turn in each pillar, record IDs and outputs, quit the process, reopen, and compare hydrated sessions without test-injected stores.

#### DF-103 - Video remount cannot restore `continueFrom` - MIGRATED to v2.17.0

- **Source phase**: v2.2.6 Phase 3
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.6-session-memory-and-studio-history.md` (Phase 3)
- **Reason**: `continueFrom` needs `priorJobId`. The studio session schema stores `lastOutputRef` (mp4 path), not the job id. After remount, a follow-up is a new text2video. `lastFramePath` is that mp4 path; there is no frame extractor.
- **Suggested next step**: Persist `priorJobId` (or a generations-index job key) on the session row, or extract a last-frame PNG and document the quality limit.

- **Migrated from**: v2.2.6#DF-26 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.6#DF-26; still owed: Required implementation; next: Implement durable generation-job linkage and continuation restoration, including older rows and missing/deleted job cases; prove with D and a real runtime-boundary continuation flow.

#### DF-104 - Agents resume does not restore tool-call cards - MIGRATED to v2.17.0

- **Source phase**: v2.2.6 Phase 4
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.6-session-memory-and-studio-history.md` (Phase 4)
- **Reason**: Sidecar persist stores user prompt plus concatenated assistant token text. `toolCallHeader` / arg deltas / complete events are not written. Resume shows the transcript, not the tool cards from the live stream.
- **Suggested next step**: Persist a compact tool-card snapshot per turn, or accept text-only resume for this cycle.

- **Migrated from**: v2.2.6#DF-27 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.6#DF-27; still owed: Required implementation; next: Implement durable bounded tool-card snapshots and hydrate them through IPC/rendering, or obtain an explicit text-only-resume product decision. Prove with E; do not persist secrets/raw unbounded tool results.

#### DF-105 - Packaged Explorer launch is unproven - MIGRATED to v2.17.0

- **Source phase**: carried from v2.2.4
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.5-first-successful-generation.md` (Phase 6.2)
- **Reason**: Closed in v2.2.8 Phase 6. Packaged Explorer launch was observed 2026-08-24 (v2.2.8 plan Review verdict). Historical row kept so v2.2.5 readers can follow the close.
- **Suggested next step**: None. See v2.2.8 Resolved DF-2.

- **Migrated from**: v2.2.5#DF-2 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.5#DF-2; still owed: Required qualification; next: Prove resolved marker candidate using the same v2.2.8 historical evidence; retain both distinct source identities in the disposition record.

#### DF-106 - Live GPU image/video generate is unproven - MIGRATED to v2.17.0

- **Source phase**: v2.2.5 Phase 2
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.5-first-successful-generation.md` (Phase 2 field gate)
- **Reason**: Fail-closed envelopes are unit-proven. An operator GPU generate that paints a SANA image was not recorded this session.
- **Suggested next step**: Run one Image Studio generate on a host with weights and GPU, or confirm the typed runtime-not-ready string in the UI when GPU is absent.

- **Migrated from**: v2.2.5#DF-4 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.5#DF-4; still owed: Required qualification; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede into v2.2.6#DF-4 only with the SANA-specific or permitted typed-failure obligation preserved. Otherwise carry a SANA packaged observation.

#### DF-107 - Packaged Hub Update against a live git clone is not executed - MIGRATED to v2.17.0

- **Source phase**: v2.2.4 Phase 6 / 7
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.4-chatbot-first-and-runtime-honesty.md` (Phase 6 residual, Phase 7.2)
- **Reason**: Vitest and Rust prove `skills.sync` waits up to 10 minutes and Hub timeout copy. A packaged Windows build pulling a real Nexus-Hub clone over the network was not run. Still open after the 2026-08-25 field session: screenshot 10 (v2.2.9 plan) shows packaged Active matching GitHub latest `v3.21.0` (which closed DF-35), but no clone log was captured and the tag could have come from the pack-time snapshot, so the live git-clone Update path remains undistinguished. not_observed != absent; packaged Hub update over a live clone is unproven here.
- **Suggested next step**: Run Update now from a packaged shell with network, confirm the clone finishes, and capture log evidence.

- **Migrated from**: v2.2.4#DF-23 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.4#DF-23; still owed: Required qualification; next: Carry packaged/network qualification: run Update against a real clone, capture completion and clone/sync logs, preserve quarantine behavior, and bind evidence to current artifact. Requires an authorized live sync; none ran in this audit.

#### DF-108 - Unix installer complete-path snapshot write is not proven - MIGRATED to v2.17.0

- **Source phase**: v2.2.4 Phase 7
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.4-chatbot-first-and-runtime-honesty.md` (Phase 7.4)
- **Reason**: `write_selection_snapshot` lives on the shared Python `RuntimeProvisioner` used by the Windows-first installer. This repo has no separate macOS/Linux complete-path writer. Unix hosts that never run that engine do not get `~/.nexus/selected-models.json` from install. Do not claim cross-OS installer parity.
- **Suggested next step**: If a Unix GUI/script install path is added, call the same writer from that complete step and add a fixture test.

- **Migrated from**: v2.2.4#DF-24 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.4#DF-24; still owed: Optional candidate/watch; next: Carry macOS/Linux qualification: trace each shipping platform installer to this writer, add platform completion integration fixtures, and observe the resulting selected-models file on native hosts. Do not infer Unix parity from the Windows engine.

#### MT-8 - Packaged transcript gutters and pill glow are not observed - MIGRATED to v2.17.0

- **Source phase**: Phase 1 - Transcript Gutters and Thinking Pill
- **Impact**: The gutter is proven as one `paddingInline` on the list with no downstream inset, and list, row, and pending are all overflow-visible. jsdom does not lay out a packaged transcript, so whether the glow is uncropped at 100% and 150% zoom is not observed here.
- **Owner**: Operator, next packaged build
- **Next step**: Operator item 1. Supersedes v2.4.3 MT-3, which stated the same limit against the 12px inset this phase deleted.

- **Migrated from**: v2.4.4#MT-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.4#MT-1; still owed: Required qualification; next: Carry packaged visual qualification: measured list/row/pill bounds and captured glow at both zooms. This is the current explicit superseding identity for v2.4.3#MT-3.

#### MT-9 - Packaged hairline centering and title inset are not observed - MIGRATED to v2.17.0

- **Source phase**: Phase 2 - History Hairline, Title Inset, and Bulk Actions
- **Impact**: Tests pin one symmetric `marginBlock` on the rule, zero padding-top on the tree header, and a chat title as the first node after the selection rail. Pixel spacing in a packaged window is not observed here. Archive All and Delete All are proven against an in-memory client, including chats inside collapsed folders, but not against the real IPC store.
- **Owner**: Operator, next packaged build
- **Next step**: Operator item 2. Supersedes v2.4.3 MT-2.

- **Migrated from**: v2.4.4#MT-2 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.4#MT-2; still owed: Required qualification; next: Carry packaged/IPC qualification: measure hairline/title inset and exercise archive/delete-all including collapsed folders, with controlled disposable sessions. Preserve v2.4.3#MT-2's dialog-centering obligation when reconciling.

#### MT-10 - Packaged NVIDIA restyle identity is not observed - MIGRATED to v2.17.0

- **Source phase**: Phase 3 - Image Restyle Identity on the GPU
- **Impact**: Four contributors are fixed and each is pinned by a test: the parser accepts trailing punctuation, the send always resolves to img2img with the identity prompt or fails closed, strength 0 survives, the seed is forwarded, and a pipeline that echoes its source raises `unchanged-output`. Whether a real SANA/SDXL img2img at strength 0.85 produces black fur on this host is not observed here.
- **Owner**: Operator, next packaged build
- **Next step**: Operator item 3. Supersedes v2.4.3 MT-6; this is the third cycle to carry it.

- **Migrated from**: v2.4.4#MT-3 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.4#MT-3; still owed: Required qualification; next: Carry GPU visual qualification: capture input/output and request parameters, verify changed pixels and retained identity on a supported current pipeline, bound to model/runtime versions.

#### MT-11 - Live SANA import on the 0.36.0 pin is not observed - MIGRATED to v2.17.0

- **Source phase**: Phase 4 - SANA Family Diffusers Pin
- **Impact**: 0.36.0 was verified from published wheels to contain the SANA video pipeline modules and to export both class names, and to declare no torch or transformers upper bound. `from diffusers import SanaPipeline, SanaVideoPipeline` has not been executed in a provisioned venv, because Diffusers resolves pipelines lazily and the probe needs the full media runtime.
- **Owner**: Operator, next packaged build
- **Next step**: Operator item 4. Supersedes v2.4.3 MT-7.

- **Migrated from**: v2.4.4#MT-4 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.4#MT-4; still owed: Required qualification; next: Carry runtime qualification: execute both SanaPipeline and SanaVideoPipeline imports in the provisioned pinned environment. Preserve the older actual-clip-or-missing-file obligation separately when superseding v2.4.3#MT-7.

#### MT-12 - Packaged generation liveness is not observed - MIGRATED to v2.17.0

- **Source phase**: Phase 5 - Generation Liveness and Studio Captions
- **Impact**: The reader is proven to answer `health` while a job is inside its handler, heartbeats are proven to emit and stop, and a pending studio orb is proven unpaused. Whether the packaged freeze is fully explained by the blocked reader, or partly by GPU compositor starvation on a 16 GB laptop, is not established. No headroom value was changed, deliberately, because there is no evidence for choosing one.
- **Owner**: Operator, next packaged build
- **Next step**: Operator item 5. If the window still stalls with the reader unblocked, compositor VRAM is the remaining hypothesis and `workingMemReserveGB` becomes the next lever.

- **Migrated from**: v2.4.4#MT-5 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.4#MT-5; still owed: Required qualification; next: Carry live GPU/UI qualification: run a real job while interacting with the window and recording responsiveness/captions/terminal outcome; measure headroom before changing reserves.

#### MT-13 - Packaged Settings density is not observed - MIGRATED to v2.17.0

- **Source phase**: Phase 6 - Settings Models Density and Details
- **Impact**: Tests pin search inside the tab row container, a centered horizontal action row, no card min-height, split pill label/value colours, and Best for as bullets. Real-viewport card height and wrap behaviour at the packaged Settings width are not observed here.
- **Owner**: Operator, next packaged build
- **Next step**: Operator item 6. Supersedes v2.4.3 MT-4.

- **Migrated from**: v2.4.4#MT-6 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.4#MT-6; still owed: Required qualification; next: Carry current packaged density qualification. Can supersede older Settings pixel rows into one later identity only if all surviving viewport/wrap/color/card obligations are enumerated there.

#### QG-3 - Develop-targeted pull requests now run the full merge-result gate (resolved) - MIGRATED to v2.17.0

- **Resolved**: 2026-08-31 in Phase 7, with explicit operator approval.
- **Evidence**: Carried from v2.4.3 QG-5. Every substantive workflow filtered `pull_request` to `main`, so PR 58 (which targets `develop`) ran only commitlint: the push trigger tested the branch head, but the merge result was never tested. `develop` was added to the `pull_request.branches` filter of `ci.yml`, `shell-build.yml`, `installer-tests.yml`, `coverage-diff.yml`, and `pr-quality.yml`; no job logic changed. Confirmed by observation, not assertion: `gh pr checks 58` now reports 42 pass, 1 skipping (path-gated `init.ps1`), 0 fail on head `4b1771da`, against a pull request that previously ran one check.

- **Migrated from**: v2.4.4#QG-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.4#QG-1; still owed: Required qualification; next: Prove resolved marker candidate for develop merge-result coverage, verifying historical check evidence. Preserve current CI topology/protection concerns at v2.4.9#QG-2 and #QG-3.

#### MT-14 - Packaged installer two-column layout and Unsloth lock are not observed - MIGRATED to v2.17.0

- **Source phase**: Phase 1 - Installer Two-Column Layout and Unsloth Lock
- **Plan reference**: [v2.4.3-field-density-identity-and-runtime.md](../../../archive/v2/v2.4/plans/v2.4.3-field-density-identity-and-runtime.md) T001 / 1.1
- **Reason**: Pytest proves two-column widgets, Unsloth disabled when Incompatible, Compatible after NVIDIA 16384 on showEvent, Review 16 GB, and the renamed time label. A packaged wizard run on this host is not recorded here.
- **Suggested next step**: Last-phase operator item (Configuration two columns and Unsloth Compatible on this 16 GB NVIDIA host).

- **Migrated from**: v2.4.3#MT-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.3#MT-1; still owed: Required qualification; next: Carry current packaged wizard qualification, recording which old layout requirements were superseded by the committed wizard redesign, and proving compatible/incompatible selection behavior without inferring geometry headlessly.

#### MT-15 - Hairline pixels and delete-dialog centering are not proven in jsdom - MIGRATED to v2.17.0

- **Source phase**: Phase 2 - History Chrome, Selection, Titles, and Delete Overlay
- **Plan reference**: [v2.4.3-field-density-identity-and-runtime.md](../../../archive/v2/v2.4/plans/v2.4.3-field-density-identity-and-runtime.md) T007 / 2.1
- **Reason**: Tests assert the hairline node on `/images` (absent on Settings), New chat `onSelect`/`onOpenChat`, a pre-created Image title change, and `folder-tree-confirm-delete` as a child of `document.body`. jsdom does not layout a packaged window so the hairline's appearance and the dialog's visual center are not observed here.
- **Suggested next step**: Last-phase operator items (hairline under tabs; New chat selects empty; Image first prompt titles the row; delete dialog centered).

- **Migrated from**: v2.4.3#MT-2 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.3#MT-2; still owed: Required qualification; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede into v2.4.4#MT-2 only after attaching dialog-centering and new-session/title obligations to the destination; otherwise keep those as a specific remaining qualification.

#### MT-16 - Thinking-pill glow pixel containment is not proven in jsdom - MIGRATED to v2.17.0

- **Source phase**: Phase 3 - Thinking Pill Geometry
- **Plan reference**: [v2.4.3-field-density-identity-and-runtime.md](../../../archive/v2/v2.4/plans/v2.4.3-field-density-identity-and-runtime.md) T013 / 3.1
- **Reason**: Tests pin min-width to `Searching...`, a 12 px left inset, and overflow visible on the pill host and chat pending row. jsdom does not layout a packaged transcript, so glow pixels vs the pane edge are not observed here. v2.4.2 MT-1 remains the prior-cycle statement of the same limit.
- **Suggested next step**: Last-phase operator item (thinking pill glow at 100% and 150% zoom).

- **Migrated from**: v2.4.3#MT-3 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.3#MT-3; still owed: Required qualification; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede into v2.4.4#MT-1, retaining packaged glow containment at 100% and 150% as the owed proof. This is supersession, not a statement that pixels were observed.

#### MT-17 - Packaged Settings compact-card nowrap and icon colors are not observed - MIGRATED to v2.17.0

- **Source phase**: Phase 4 - Settings Models Compact Cards
- **Plan reference**: [v2.4.3-field-density-identity-and-runtime.md](../../../archive/v2/v2.4/plans/v2.4.3-field-density-identity-and-runtime.md) T016 / 4.1
- **Reason**: Tests pin a nowrap facts row without Company/License pills, pills inside Details, and green / red / blue action colors via inline style. A packaged Settings screenshot is not recorded here.
- **Suggested next step**: Last-phase operator item (Settings one facts line and icon colors).

- **Migrated from**: v2.4.3#MT-4 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.3#MT-4; still owed: Required qualification; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede into v2.4.4#MT-6 with still-applicable color/wrap requirements carried explicitly; document any later deliberate grammar replacement.

#### MT-18 - Packaged Agents picker order and empty-session default are not observed - MIGRATED to v2.17.0

- **Source phase**: Phase 5 - Shared Picker Rank and Default
- **Plan reference**: [v2.4.3-field-density-identity-and-runtime.md](../../../archive/v2/v2.4/plans/v2.4.3-field-density-identity-and-runtime.md) T020 / 5.1
- **Reason**: Tests prove `resolveDefaultId` prefers `gemma-4-12b-it-gguf` over a gpt-oss favorite, and QuickModelSwitcher lists Gemma before gpt-oss at 16 GB with recommendOrder. A packaged Agents screenshot on this host is not recorded here.
- **Suggested next step**: Last-phase operator item (Agents empty session defaults to Gemma 4 12B on this install).

- **Migrated from**: v2.4.3#MT-5 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.3#MT-5; still owed: Required qualification; next: Carry packaged picker qualification: fresh owned-model snapshot, empty Agents session, expected Gemma default and recommend order. Can share execution with v2.4.8#MT-5 without silently dropping this identity.

#### MT-19 - Packaged NVIDIA restyle identity is not observed - MIGRATED to v2.17.0

- **Source phase**: Phase 6 - Image Restyle Identity
- **Plan reference**: [v2.4.3-field-density-identity-and-runtime.md](../../../archive/v2/v2.4/plans/v2.4.3-field-density-identity-and-runtime.md) T024 / 6.1
- **Reason**: Tests prove restyle strength 0.7, identity prompt, no SAM2, and fail-closed without last output. A packaged NVIDIA before/after of "Make the puppy black" is not recorded here. v2.4.2 MT-3 remains the prior-cycle statement of the same limit.
- **Suggested next step**: Last-phase operator item (Make the puppy black restyles fur).

- **Migrated from**: v2.4.3#MT-6 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.3#MT-6; still owed: Required qualification; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede into v2.4.4#MT-3, preserving before/after puppy identity and actual recoloring as the acceptance test.

#### MT-20 - Packaged NVIDIA SANA-Video clip is not observed - MIGRATED to v2.17.0

- **Source phase**: Phase 7 - SANA-Video Layout and Executor
- **Plan reference**: [v2.4.3-field-density-identity-and-runtime.md](../../../archive/v2/v2.4/plans/v2.4.3-field-density-identity-and-runtime.md) T028 / 7.1
- **Reason**: Tests prove a complete SANA fixture loads SanaVideoPipeline with local_files_only and never WanPipeline, an incomplete tree names the missing path, catalog files include model_index.json plus scheduler/tokenizer/VAE, and 16 GB default video stays wan2.1-t2v-1.3b. A packaged NVIDIA generate of sana-video-2b-720p is not recorded here.
- **Suggested next step**: Last-phase operator item (opt-in SANA-Video either plays a clip or names a real missing file).

- **Migrated from**: v2.4.3#MT-7 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.3#MT-7; still owed: Required qualification; next: Carry the output obligation, or supersede into v2.4.4#MT-4 only if that exact output condition is added. Do not discharge generation with an import.

#### MT-21 - Thinking-pill pixel containment is not proven in jsdom layout - MIGRATED to v2.17.0

- **Source phase**: Phase 1 - Sidebar History Host and Shared Chrome
- **Plan reference**: [v2.4.2-field-ui-history-and-generation.md](../../../archive/v2/v2.4/plans/v2.4.2-field-ui-history-and-generation.md) T005 / 1.5
- **Reason**: jsdom does not layout. The Phase 1 test asserts overflow visible, sibling pill chrome (so `border-radius: 999px` is not on the canvas host), and `rectFullyInside` with mocked boxes. A real `getBoundingClientRect()` crop cannot be observed here.
- **Suggested next step**: Phase 7 operator item 1 (thinking pill at 100% and 150% zoom) is the layout proof.

- **Migrated from**: v2.4.2#MT-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.2#MT-1; still owed: Required qualification; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede into v2.4.4#MT-1 with both zoom levels and actual measured/captured containment retained.

#### MT-22 - Composer stick-to-bottom is proven on a mocked scroller, not a live pane - MIGRATED to v2.17.0

- **Source phase**: Phase 2 - Transcript Honesty
- **Plan reference**: [v2.4.2-field-ui-history-and-generation.md](../../../archive/v2/v2.4/plans/v2.4.2-field-ui-history-and-generation.md) T009 / 2.1
- **Reason**: `useStickToBottom` tests assign `scrollHeight` / `clientHeight` and assert `stickNow` sets `scrollTop`. They do not layout Chat, Agents, Image, or Video overflow panes with real content height after send.
- **Suggested next step**: Phase 7 operator send on each of the four tabs and confirm the new user turn is in view unless the user scrolled up.

- **Migrated from**: v2.4.2#MT-2 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.2#MT-2; still owed: Required qualification; next: Carry real pane interaction qualification: send in all four pillars, observe latest turn when at bottom, and preserve position when deliberately scrolled up.

#### MT-23 - Packaged img2img identity for "Make that puppy black" is not observed - MIGRATED to v2.17.0

- **Source phase**: Phase 3 - Image Follow-up Identity
- **Plan reference**: [v2.4.2-field-ui-history-and-generation.md](../../../archive/v2/v2.4/plans/v2.4.2-field-ui-history-and-generation.md) T016 / 3.1
- **Reason**: Automated tests prove img2img against last PNG bytes, strength 0.45, and no SAM2 for that phrase. A packaged NVIDIA run that the same puppy is recolored rather than resampled is not recorded here.
- **Suggested next step**: Phase 7 operator item: generate a puppy, send "Make that puppy black" with no attachment, capture before/after.

- **Migrated from**: v2.4.2#MT-3 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.2#MT-3; still owed: Required qualification; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede into v2.4.4#MT-3 with input/output identity and recoloring preserved. Do not claim the obsolete 0.45 path was field-proven.

#### MT-24 - Packaged empty-video fail-closed is not observed - MIGRATED to v2.17.0

- **Source phase**: Phase 4 - Video Fail-Closed Output
- **Plan reference**: [v2.4.2-field-ui-history-and-generation.md](../../../archive/v2/v2.4/plans/v2.4.2-field-ui-history-and-generation.md) T020 / 4.1
- **Reason**: Automated tests prove persist of the playable-clip error, Settings > Models on missing weights, and fail-closed when `resolveMp4Url` is empty. A packaged NVIDIA run that a first puppy-in-grass turn never paints an empty success bubble is not recorded here.
- **Suggested next step**: Phase 7 operator item: send a Video Lab prompt that cannot produce a clip (missing weights or empty path) and capture the written failure.

- **Migrated from**: v2.4.2#MT-4 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.2#MT-4; still owed: Required qualification; next: Carry packaged fail-closed qualification with a controlled missing-output case, then remount and verify written error remains; do not report an empty success bubble as success.

#### MT-25 - Settings Models density is not proven on a real viewport - MIGRATED to v2.17.0

- **Source phase**: Phase 5 - Settings Models Density
- **Plan reference**: [v2.4.2-field-ui-history-and-generation.md](../../../archive/v2/v2.4/plans/v2.4.2-field-ui-history-and-generation.md) T024 / 5.1
- **Reason**: Tests assert the catalog fingerprint is absent, chrome gap is `--space-1`, and card padding is `--space-2`. jsdom does not layout two downloaded cards against a packaged window height.
- **Suggested next step**: Phase 7 operator item 8 (Settings Models density).

- **Migrated from**: v2.4.2#MT-5 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.2#MT-5; still owed: Required qualification; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede into v2.4.4#MT-6 with actual viewport sizing and no unwanted wrapping/overflow preserved.

#### MT-26 - Live installer VRAM / Unsloth / VS Code merge is not observed - MIGRATED to v2.17.0

- **Source phase**: Phase 6 - Installer VRAM, Unsloth, and VS Code Merge
- **Plan reference**: [v2.4.2-field-ui-history-and-generation.md](../../../archive/v2/v2.4/plans/v2.4.2-field-ui-history-and-generation.md) T028 / 6.1
- **Reason**: Pytest pins 16384 and 15360 display as 16 GB, Unsloth Compatible/Incompatible before opt-in, and a 7-step route with the VS Code checkbox on Configuration. A packaged wizard run on this NVIDIA host is not recorded here.
- **Suggested next step**: Phase 7 operator item 9 (installer GPU line shows whole GB and Unsloth badge on the same page as VS Code).

- **Migrated from**: v2.4.2#MT-6 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.2#MT-6; still owed: Required qualification; next: Carry native packaged wizard qualification, preserving whole-GB GPU, compatibility badge, and extension option visibility even if their page placement was deliberately redesigned.

#### DF-109 - Reasoning disclosure is not observed with a thinking-capable local model - MIGRATED to v2.17.0

- **Source phase**: Phase 3 and Phase 8 human testing
- **Plan reference**: Phase 8.7 operator item 6
- **Reason**: Component and hydration tests prove collapsed-by-default disclosure, keyboard access, absence when no reasoning exists, and token tooltip detail. No local provider turn with separate reasoning content was run here.
- **Owner / next evidence**: Desktop operator. Use a catalog model that emits separate reasoning, confirm the disclosure expands without moving reasoning into the answer bubble, and capture collapsed and expanded states.

- **Migrated from**: v2.4.1#DF-3 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.1#DF-3; still owed: Required qualification; next: Carry live model/packaged qualification: use an installed reasoning-capable model and capture collapsed/expanded states without moving reasoning into answer text.

#### DF-110 - Archive, delete, reset, and restore are not observed across all four pillars - MIGRATED to v2.17.0

- **Source phase**: Phase 4 and Phase 8 human testing
- **Plan reference**: Phase 8.7 operator item 7
- **Reason**: Store, IPC, cancellation, late-event, and page-reset tests cover Chatbot, Agents, Images, and Videos. A packaged four-pillar operator matrix was not run.
- **Owner / next evidence**: Desktop operator. Complete checklist item 7 and record one session id per pillar plus the reset and restore result.

- **Migrated from**: v2.4.1#DF-4 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.1#DF-4; still owed: Required qualification; next: Carry real-boundary session matrix with disposable sessions, IDs, cancellation/late-event checks, restart, and restore outcomes across all four pillars.

#### DF-111 - Installer/Settings visual parity and live disk-meter change are not observed - MIGRATED to v2.17.0

- **Source phase**: Phase 5 and Phase 8 human testing
- **Plan reference**: Phase 8.7 operator item 8
- **Reason**: The prior packaged field run exposed Nomic as incorrectly required and incompatible rows above compatible rows. The replacement makes EmbeddingGemma 300M the required/default app-wide embedder and compatibility the first ordering partition in installer and Settings. Automated shared-policy tests pass; replacement visual parity and an observed free-space change after model install/remove are not recorded.
- **Owner / next evidence**: Release operator. Capture the same model in both surfaces, then install/remove it and record the disk meter before and after.

- **Migrated from**: v2.4.1#DF-5 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.1#DF-5; still owed: Required qualification; next: Carry packaged parity plus disk qualification; no model download/remove was authorized for this audit. Record current digest, same-model screenshots, free-space deltas, and cleanup.

#### DF-112 - Native folder pickers outside Windows are not observed - MIGRATED to v2.17.0

- **Source phase**: Phase 7
- **Plan reference**: Phase 8.7 operator item 9
- **Reason**: The Tauri command and frontend cancellation/stale-result behavior are automated. macOS and Linux picker behavior was not run on native hosts.
- **Owner / next evidence**: Platform operator. On macOS and Linux, select, cancel, and rapidly reopen the picker and record the resulting workspace chips.

- **Migrated from**: v2.4.1#DF-6 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.1#DF-6; still owed: Required qualification; next: Carry native OS qualification with workspace-chip and stale-result evidence on both platforms.

#### DF-113 - Windows multi-root OS sandbox confinement remains partial - MIGRATED to v2.17.0

- **Source phase**: Phase 6 and Phase 8 human testing
- **Plan reference**: Phase 8.7 operator item 9
- **Reason**: Canonical path guards and scoped tool tests allow both selected roots and deny outside paths. The Windows sandbox backend still does not kernel-enforce filesystem or network confinement, so the support tier remains partial even when the UI and path guard behave correctly.
- **Owner / next evidence**: Security owner. Keep the existing loud partial/unconfined status. A later sandbox phase must add kernel-enforced Windows filesystem and network boundaries before claiming confined support.

- **Migrated from**: v2.4.1#DF-7 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.1#DF-7; still owed: Optional candidate/watch; next: Carry security implementation: kernel filesystem/network boundary with adversarial outside-root/network tests, or explicit partial-support contract. Preserve the loud partial label meanwhile.

#### QG-4 - Indexed skill catalog paths remain absent from this checkout - MIGRATED to v2.17.0

- **Source phase**: Phase 8 architecture, known-gaps, docs layout, and CI reconciliation; generation-recovery Phase 7
- **Plan reference**: Phase 8.1-8.5 and generation-recovery T089-T093
- **Reason**: The plan-indexed `catalog/skills/...` paths and the repository `.agents/skills` bundle still do not contain `project-refactor`, `docs-layout-refactor`, `known-gaps-tracker`, `cicd-architect`, `verification-before-completion`, or `dev-progress-tracker`. This Phase 7 session loaded the user-level copies under `C:\Users\bdour\.agents\skills` and followed those procedures. The repo-local mapping is still missing.
- **Suggested next step**: Vendor or map the canonical skill files into the repository catalog before the next planning session, or update plan templates to the user-level install path.

- **Migrated from**: v2.4.1#QG-2 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.1#QG-2; still owed: Required implementation; next: Implement portable discovery/mapping or correct plan templates to an installed-path resolver; verify all named skills resolve without falsely claiming a vendored bundle exists.

#### QG-5 - Develop-targeted pull requests miss several merge-result workflows - MIGRATED to v2.17.0

- **Source phase**: Generation-recovery Phase 7 terminal CI comparison
- **Plan reference**: T093
- **Reason**: `ci.yml`, `installer-tests.yml`, `shell-build.yml`, `pr-quality.yml`, `coverage-diff.yml`, and `codeql.yml` limit `pull_request.branches` to `main`. Feature-branch `push` still runs `ci.yml` and path-gated installer tests, and `commitlint.yml` runs on any PR. There is no always-resolving aggregate required-check job, and `package.json` has no `fast` / `full` / `platform` / `report` / `release` profile scripts. Workflow files were not changed; silence is not approval.
- **Suggested next step**: After explicit approval, add `develop` to the listed `pull_request.branches` (or an aggregate gate job) in the smallest set of workflows that must validate the merge result. Record any remaining profile-script differences as environment-only.

- **Migrated from**: v2.4.1#QG-5 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.1#QG-5; still owed: Required qualification; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede into resolved v2.4.4#QG-1 for the branch-filter problem after historical evidence verification; keep aggregate/protection differences at v2.4.9#QG-2/#QG-3.

#### QG-6 - Model-prompting freshness helper is absent - MIGRATED to v2.17.0

- **Source phase**: Generation-recovery Phase 7 advisory governance check
- **Plan reference**: implement-phase 9.0 duty 8
- **Reason**: `python scripts/check_model_prompting_freshness.py --advisory` cannot run because the file is absent. The duty is advisory and does not block the phase.
- **Suggested next step**: Add the helper in a later tooling change, or keep the logged no-op.

- **Migrated from**: v2.4.1#QG-6 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.1#QG-6; still owed: Optional candidate/watch; next: Carry advisory tooling decision: add a local helper with explicit date/source contract and tests, or document the advisory no-op. No model guidance freshness was verified here.

#### DF-114 - Packaged Windows clean and repair installer behavior is not observed - MIGRATED to v2.17.0

- **Source phase**: Phase 1 and Phase 8 human testing
- **Plan reference**: Phase 8.7 operator items 1-3
- **Reason**: The prior packaged field run exposed imperceptible fixed-value motion, low percentage contrast, and hidden finalization work that left the bar at 73% while visible groups said Done. The replacement implements and tests a repeating liquid gradient, contrast capsule, and complete visible step mapping, and its frozen smoke passes. A clean/repair visual run of the replacement is not observed.
- **Owner / next evidence**: Release operator. Run checklist items 1-3 on a clean Windows Sandbox and an existing Nexus install, then attach screenshots and `nexus-install-nexus-desktop-log.txt`.

- **Migrated from**: v2.4.1#DF-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.1#DF-1; still owed: Required qualification; next: Carry packaged clean/repair qualification with screenshots and install log on an isolated clean host and existing installation.

#### DF-115 - Wan and SDXL are not re-smoked on the new Diffusers pin - MIGRATED to v2.17.0

- **Source phase**: Phase 4 - SANA Family Diffusers Pin
- **Impact**: The pin change touches every Image and Video model on the host, not only SANA. Nothing in the automated suites exercises a real pipeline load, so a regression in Wan or SDXL under 0.36.0 would not be caught locally.
- **Owner**: Operator, next packaged build
- **Next step**: Operator item 4, second half. This is the highest-blast-radius unobserved change in the cycle.

- **Migrated from**: v2.4.4#DF-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.4#DF-1; still owed: Required qualification; next: Carry GPU regression qualification: load/run Wan and SDXL using the current provisioned Diffusers environment, capture valid artifacts and versions, and distinguish it from a SANA import.

#### QG-7 - No end-to-end run against a real GPU job - MIGRATED to v2.17.0

- **Source**: this cycle, all rounds
- **Impact**: Every change is verified by typecheck, lint, build, unit tests and a rendered screenshot harness. NONE of it has been exercised against a live generation on the operator's hardware. Specifically, the capability caps have not been observed PREVENTING a real failure, only shown to produce the right option lists.
- **Owner**: Operator
- **Next step**: On Videos with Wan 2.1 selected, confirm the duration dropdown offers only 2-5 s and resolution only 480p, then generate one clip and check the bracketed time matches the wall clock. Then repeat one image generation and open the viewer.

- **Migrated from**: v2.4.9#QG-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.9#QG-1; still owed: Required qualification; next: Carry GPU/packaged qualification: selected Wan limits, actual clip and measured elapsed time, then actual image/viewer. Historical generic media generation does not prove these later controls.

#### NI-1 - The two model registries are not tested against each other - MIGRATED to v2.17.0

- **Source**: v2.4.9 Phase 1 (sub-task 1.1)
- **Plan reference**: [v2.4.9 plan](../../../archive/v2/v2.4/plans/v2.4.9-adoption-voicestudio-field-discipline.md), Phase 1; recorded as OQ-1 to OQ-4 in [docs/reference/model-acceptance.md](../../../archive/reference/model-acceptance.md)
- **Impact**: Building the job map surfaced a two-sided divergence nothing guards. Eight `core/registry/ModelCatalog.ts` format bindings have no installable `catalog.json` entry (`llama3.1:8b`, `llama3.2:3b`, `llama3.3:70b`, `qwen2.5:7b`, `qwen2.5-coder:7b`, `deepseek-coder:6.7b`, `hermes3:8b`, `hermes3:70b`) and five installable LLMs have no binding (`gemma4:e2b`, `gemma-4-12b-it-gguf`, `gemma4:26b`, `gemma4:31b`, `inkling-small`), three of which are the pre-ticked chat default on the cpu, 12/16 and 24 GB tiers. The sharp end is concrete rather than cosmetic: `inkling-small` has `family: "inkling"` and `agentic: true`, so `modules/coding/llm/parseAgentToolCalls.ts:23` falls through to `?? "gemma4-xml"` and parses its tool calls with a Gemma grammar. `ModelFamily` cannot even express `inkling`, so binding it needs a type change. `tests/unit/core/registry/ModelCatalog.test.ts` asserts sync against `core/registry/models.json` only, which is why both directions are invisible.
- **Reason not done in this cycle**: Phase 1's scope is two documents and an agent definition. Reconciling the registries is a code change to the coding runtime with its own decision (are the eight dead bindings or missing catalog entries?) and is not a field-discipline item.
- **Owner**: Unassigned
- **Exit condition**: A test asserts `catalog.json` LLM entries and `ModelCatalog.ts` bindings against each other, and each of the 13 divergent ids is either bound, removed, or recorded as deliberately unbound. Evaluable by running that test.
- **Suggested next step**: Decide the eight bindings' status first, since that decides whether the test asserts equality or a documented subset.

- **Migrated from**: v2.4.9#NI-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.9#NI-1; still owed: Required implementation; next: Implement explicit supported binding/subset contract and cross-registry test. The old wrong-Gemma case changed in v2.14, but that is not full parity or an evidence-based Inkling codec decision. Prove with G and update `docs/reference/model-acceptance.md`.

#### MT-27 - The standards judge was never dispatched through the agent registry - MIGRATED to v2.17.0

- **Source**: v2.4.9 Phase 1 (sub-task 1.4)
- **Plan reference**: [v2.4.9 plan](../../../archive/v2/v2.4/plans/v2.4.9-adoption-voicestudio-field-discipline.md), Phase 1 Verification Expectation
- **Impact**: `.claude/agents/nexus-standards-judge.md` was created mid-session, after the agent registry had loaded, so `nexus-standards-judge` was not a dispatchable agent type. The Verification Expectation was satisfied by handing the definition to a general-purpose agent and instructing it to adopt the file verbatim, which exercised the definition's CONTENT but not the harness's lookup of it. The frontmatter (`name`, `tools: Bash, Read, Grep, Glob`, `model: opus`) is therefore unverified: a malformed field, a rejected tool name, or a wrong `model` value would not have surfaced.
- **Owner**: Operator or next cycle
- **Exit condition**: In a session started after this commit, dispatch `nexus-standards-judge` by name against any pinned range and confirm it returns the verdict format with the declared tool scope. One invocation closes it.
- **Suggested next step**: Do it at the start of Phase 2, which needs a review anyway; the tool scope also gets exercised there because Phase 2's evidence rests on locally-run counts.

- **Migrated from**: v2.4.9#MT-11 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.9#MT-11; still owed: Required qualification; next: Carry harness qualification: start a fresh supported harness session, invoke that exact registered agent against a pinned range, and retain tool scope and verdict. A generic agent adopting the prompt is insufficient.

#### DF-116 - `prompt-*` budget checks still do not cover `.claude/` - MIGRATED to v2.17.0

- **Source**: v2.4.9 Phase 1 (sub-task 1.2), confirming pre-existing gap 10.N.H
- **Plan reference**: [v2.4.9 plan](../../../archive/v2/v2.4/plans/v2.4.9-adoption-voicestudio-field-discipline.md), Phase 1; required by AGENTS.md "## Claude Code addenda"
- **Impact**: AGENTS.md requires that adding a file under `.claude/agents/` be accompanied by confirming the `prompt-*` rule globs cover the new path. Confirmed they do not: `lib/checks/prompt-oversized.mjs:72-73` scopes to `modules/coding/chat/prompts/` and `modules/coding/skills/catalog/**/SKILL.md`. So `nexus-standards-judge.md` has no prompt-size budget, and neither do the four older `.claude/agents/` files. Two `modules/coding/skills/catalog` prompts already exceed the 800-token budget as warnings, so the check does find real drift where it is pointed.
- **Reason not done in this cycle**: Extending the glob is outside Phase 1's stated scope, and the extension is already tracked as 10.N.H under v0.9.0. Recording it here keeps the AGENTS.md obligation discharged without silently widening a check.
- **Owner**: Inherited from 10.N.H
- **Exit condition**: `check:prompts` reports a budget line for at least one `.claude/agents/` file, or 10.N.H is closed with a recorded decision that `.claude/` is deliberately exempt.
- **Suggested next step**: Fold into the Phase 5.5 terminal CI/CD reconciliation, where the check surface is being compared anyway.

- **Migrated from**: v2.4.9#DF-9 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.9#DF-9; still owed: Required implementation; next: Implement rule/path expansion plus negative/positive registration tests and run H. Cover every prompt-* rule whose appliesTo filter owns the same scope, not only oversized.

#### BG-2 - 216 stale relative links in the living `docs/DEVLOG.md` - MIGRATED to v2.17.0

- **Source**: v2.4.9 Phase 1 (sub-task 1.4 link verification)
- **Plan reference**: [v2.4.9 plan](../../../archive/v2/v2.4/plans/v2.4.9-adoption-voicestudio-field-discipline.md), Phase 1; surfaced incidentally while verifying this phase's own links
- **Impact**: A link check over `docs/DEVLOG.md` resolves 216 relative targets to files that do not exist. They are historical entries written before two renames: `src/` to `modules/coding/` (for example `../src/chat/PromptBuilder.ts`, `../src/guardrails/PermissionTiers.ts`) and `scripts/installer/pyqt/` to `scripts/installer/` (for example `../scripts/installer/pyqt/src/nexus_installer/constants.py`), plus the Gemma Code to Nexus product rename (`../src/panels/GemmaCodePanel.ts`). DEVLOG is a living document and its own index lines are how a reader navigates to the code a milestone changed, so the navigation is broken for every entry older than those renames. Nothing detects this: `check:docs-layout` validates directory shape, not link targets.
- **Reason not done in this cycle**: Phase 1 delivers two documents and an agent definition. Repairing 216 historical links is a mechanical but unbounded edit across the whole file, and rewriting historical entries to point at current paths is itself a decision (a milestone's links arguably should resolve to what existed then). All 55 relative links in this phase's own files were verified and resolve.
- **Owner**: Unassigned
- **Exit condition**: A committed link checker over the living docs roots reports zero unresolved relative targets, or DEVLOG's pre-rename entries carry a stated convention (a note that historical paths are as-written and not maintained) that the checker honours. Evaluable by running the checker.
- **Suggested next step**: Decide the convention before repairing anything, since it determines whether the fix is 216 rewrites or one documented exemption plus a checker.

- **Migrated from**: v2.4.9#BG-16 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.9#BG-16; still owed: Required implementation; next: Carry link-policy decision and fresh link audit. Prefer historical commit links or reviewed canonical remaps per entry; preserve the user's edits and never silently replace the file. Add the chosen living-doc link checker and prove zero unresolved targets or exact documented exemptions.

#### BG-3 - `npm audit (production deps)` is red, and `sharp` has no fix - MIGRATED to v2.17.0

- **Source**: v2.4.9 Phase 2 (sub-task 2.5, while selecting required checks)
- **Plan reference**: [v2.4.9 plan](../../../archive/v2/v2.4/plans/v2.4.9-adoption-voicestudio-field-discipline.md), Phase 2
- **Impact**: The `npm audit (production deps)` job has been failing on `develop` since `f8185e38`, and it is the ONLY failing job in that CI run. Reproduced locally: 8 production vulnerabilities (1 low, 2 moderate, 5 high). The blocking one is `sharp <=0.35.4-rc.0`, reached transitively through `@huggingface/transformers`, carrying inherited libvips advisories (CVE-2026-33327, CVE-2026-33328, CVE-2026-35590, CVE-2026-35591) and libheif advisories (GHSA-g89c-p67h-r497, GHSA-2jg2-4ch7-h545), with **no fix available**. `hono` and `protobufjs` findings do have fixes. Because the job is red, it could not be added to the branch protection required-check set applied in this phase, so the one production-dependency gate the repository has is also the one gate that is not enforced.
- **Reason not done in this cycle**: The Non-Goals table excludes remediating what the visibility work surfaces, and the decisive dependency has no upstream fix, so the remedy is an override, a replacement for `@huggingface/transformers`, or an accepted risk -- each a decision, not a patch.
- **Owner**: Unassigned
- **Exit condition**: `npm audit --omit=dev` exits zero, or the residual advisories are recorded as accepted with a dated review, and `npm audit (production deps)` joins the required-check set. Evaluable by running the command.
- **Suggested next step**: Run `npm audit fix` for `hono` and `protobufjs` first, since those are free, then decide `sharp` separately on its own merits.

- **Migrated from**: v2.4.9#BG-19 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.9#BG-19; still owed: Owner decision; next: Carry dependency/security review: execute I, reconcile current advisories with pinned versions and dated risk decisions, then inspect the required checks. A permissive package-name allowlist alone does not satisfy the dated-review/protection exit condition.

#### QG-8 - Two gating checks are not yet in the required-check set - MIGRATED to v2.17.0

- **Source**: v2.4.9 Phase 2 (sub-task 2.5)
- **Plan reference**: [v2.4.9 plan](../../../archive/v2/v2.4/plans/v2.4.9-adoption-voicestudio-field-discipline.md), Phase 2, D2
- **Impact**: D2 made `gitleaks` and `pip-audit (model runtimes)` gating at the workflow level, so a finding turns their run red. Neither is in the branch-protection required-check list applied in this phase, because neither has executed once and requiring a check that has never produced a run leaves it permanently pending and blocks every merge. Until they are added, a red run on either is visible but does not block a merge.
- **Owner**: Operator, at the integration pull request
- **Exit condition**: Both checks show one green run on the integration pull request, then both context names are added to the required list on `develop` and `main`. Evaluable by reading `gh api repos/:owner/:repo/branches/<b>/protection`.
- **Suggested next step**: Do it during 5.10, where the integration pull request produces the first runs anyway.

- **Migrated from**: v2.4.9#QG-2 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.9#QG-2; still owed: Required implementation; next: Carry remote policy verification: green current runs plus required-context protection on both develop and main. Use J; do not change protection or call visibility enforcement without the result.

#### QG-9 - Required checks are 17 individual contexts, not an aggregate gate - MIGRATED to v2.17.0

- **Source**: v2.4.9 Phase 2 (sub-task 2.5)
- **Plan reference**: [v2.4.9 plan](../../../archive/v2/v2.4/plans/v2.4.9-adoption-voicestudio-field-discipline.md), Phase 5.5 terminal CI/CD reconciliation
- **Impact**: Branch protection now lists 17 individual check contexts. The canonical CI/CD contract expects a single always-resolving aggregate required check instead. The difference is not cosmetic: three workflows are path-filtered on pull requests (`installer-tests.yml`, `installer-smoke.yml`, `shell-build.yml`), so they produce no check at all on a pull request outside their filter and **cannot be required individually without blocking every unrelated merge**. Those three are therefore unguarded by protection today. An aggregate job that always runs and resolves its dependencies' skip states is the pattern that closes this, and adding a required context also has to stay in step with any future job rename.
- **Reason not done in this cycle**: Authoring an aggregate gate is a pipeline-topology change, and the Non-Goals table excludes applying unreconciled canonical-contract fields. Phase 5.5 is where the comparison happens.
- **Owner**: Phase 5.5
- **Exit condition**: One required context that always resolves, covering the path-filtered workflows through their skip states. Evaluable by opening a pull request that touches no installer path and confirming the aggregate still resolves.
- **Suggested next step**: Compare against the contract in 5.5 before adding more individual contexts, so the list does not grow into something that has to be unwound.

- **Migrated from**: v2.4.9#QG-3 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.9#QG-3; still owed: Required implementation; next: Prove the source topology partial, then carry full-contract/protection verification. Inspect all required contexts and an unrelated-path PR; an aggregate that omits required external workflows does not establish complete coverage.

#### DF-117 - The feature inventory covers two README regions, not the whole file - MIGRATED to v2.17.0

- **Source**: v2.4.9 Phase 3 (sub-task 3.1, decision D3 part B)
- **Plan reference**: [v2.4.9 plan](../../../archive/v2/v2.4/plans/v2.4.9-adoption-voicestudio-field-discipline.md), Phase 3; contract in [docs/reference/feature-inventory.md](../../../archive/reference/feature-inventory.md)
- **Impact**: `check-feature-drift.mjs` enforces 29 names across `## The Four Pillars` and `## Featured Capabilities`. Features named elsewhere in `README.md` are outside the contract and can be deleted from the tree without CI noticing: `### CLI tools (already shipped)` (line 340), `## Quick Start (developer workflow)`, and `## Roadmap`. The bound is deliberate -- the regions must exclude the ~180-line changelog, whose prose names features and would otherwise produce false passes -- but the consequence is that "a CI run fails when a feature named in README.md no longer exists" is true for those two regions and not for the rest of the file.
- **Reason not done in this cycle**: Widening coverage means deciding, per additional region, what counts as a feature claim. `### CLI tools` lists commands rather than features and `## Roadmap` names things that deliberately do NOT exist yet, so a naive widening would turn the roadmap into a set of failing assertions.
- **Owner**: Unassigned
- **Exit condition**: Either an additional region is added to `REGIONS` in the checker with its own entries, or this document records the decision that the two regions are the whole contract and the others are prose. Evaluable by reading the checker's `REGIONS` map against the README's `## ` headings.
- **Suggested next step**: `### CLI tools (already shipped)` is the strongest candidate, since "already shipped" is exactly the claim this gate exists to keep honest.

- **Migrated from**: v2.4.9#DF-10 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.9#DF-10; still owed: Owner decision; next: Carry product/documentation decision: explicitly accept the two regions as the whole contract, or add a carefully parsed shipped-CLI region and entries/tests. Do not pull roadmap promises into implemented feature assertions.

#### NI-2 - Crash classes were not derived from data, because there is no data - MIGRATED to v2.17.0

- **Source**: v2.4.9 Phase 4 (sub-task 4.2)
- **Plan reference**: [v2.4.9 plan](../../../archive/v2/v2.4/plans/v2.4.9-adoption-voicestudio-field-discipline.md), Phase 4
- **Impact**: The plan bounds the classification work by sampling the 50 most recent issues. `gh issue list --state all --limit 100` returns **zero** issues for this repository, so there was nothing to cluster. The five classes in `scripts/crash-class-report.mjs` (`install-provision`, `model-load`, `gpu-handoff`, `generation-failure`, `data-persistence`) are derived instead from this repository's own recorded field failures across the v2.4.x cycles, each carrying its provenance in the source. They are a defensible first pass and they are **not** evidence about what users actually report. A class that never matches, or one that swallows everything, will only become visible once real reports exist; the per-class counts the report prints are what make that visible.
- **Reason not done in this cycle**: No input existed. Inventing five classes and calling them a sample would have been worse than saying so.
- **Owner**: Unassigned
- **Exit condition**: Re-derive the classes from at least 20 issues filed through the bug form, and record the sample. Clears on the same trigger as "first non-empty crash-class report".
- **Suggested next step**: Do both at once, once the form has collected reports; a re-derivation and a first real distribution are the same exercise.

- **Migrated from**: v2.4.9#NI-2 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.9#NI-2; still owed: Optional candidate/watch; next: Carry data-dependent qualification: read current issue population, retain a real sample when threshold exists, and re-derive classes. If fewer than 20, record exact observed count and keep pending; never manufacture reports.

#### DF-118 - The crash-class report is operator-run, not scheduled - MIGRATED to v2.17.0

- **Source**: v2.4.9 Phase 4 (sub-task 4.3)
- **Plan reference**: [v2.4.9 plan](../../../archive/v2/v2.4/plans/v2.4.9-adoption-voicestudio-field-discipline.md), Phase 4
- **Impact**: `scripts/crash-class-report.mjs` runs on an operator's machine against an authenticated `gh`. It is not wired into CI, so nothing produces a periodic failure-trend report; someone has to remember to run it. Wiring it would mean giving CI a token to read issues, which is a credential surface added for a report that nobody currently reads on a schedule, so the trade was declined rather than overlooked.
- **Reason not done in this cycle**: The report has no data yet (see NI-2), so scheduling it now would schedule an empty result.
- **Owner**: Unassigned
- **Exit condition**: Either a scheduled job publishes the report where someone reads it, or this gap records the decision that it stays operator-run. Evaluable by looking for the job.
- **Suggested next step**: Revisit alongside NI-2; a trend report is worth scheduling once there is a trend.

- **Migrated from**: v2.4.9#DF-11 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.9#DF-11; still owed: Owner decision; next: Carry owner decision alongside v2.4.9#NI-2: record operator-run as deliberate, or add a scheduled consumer with minimal permissions once real trend data exists. Do not create unused CI solely to tick the row.

#### BG-4 - `core/storage/StorageMigration.ts` outlived its own removal note - MIGRATED to v2.17.0

- **Source**: v2.4.9 Phase 5 (sub-task 5.1, architecture refactor)
- **Plan reference**: [v2.4.9 plan](../../../archive/v2/v2.4/plans/v2.4.9-adoption-voicestudio-field-discipline.md), Phase 5.1, which predicted this finding by name
- **Impact**: `core/storage/StorageMigration.ts:18` reads "Removed in v1.1.0." The file is still present, and so is `tests/unit/core/storage/StorageMigration.test.ts`, which still runs. Every remaining reference is a comment or doc string (`core/storage/paths.ts:6,31`, `core/diagnostics/DoctorReport.ts:95,217`); **nothing calls it**. So the repository carries a one-shot `~/.gemma-code/` to `~/.nexus/` migration that its own header says was removed four minor versions ago, plus a test suite asserting the behaviour of dead code. The name is also actively confusing: the v2.5.0 migration-durability plan had to add an explicit note telling implementers NOT to touch this file, because "StorageMigration" is exactly what a database-migration helper would be called.
- **Reason not done in this cycle**: Phase 5.1 is report-only by design, and deleting a migration path is a decision about users still on `~/.gemma-code/`, not a cleanup. Removing it needs someone to decide that no supported upgrade path still crosses it.
- **Owner**: Unassigned
- **Exit condition**: Either the file and its test are removed and the four referring comments updated, or the header's "Removed in v1.1.0" line is corrected to state that the code is retained deliberately and why. Evaluable by reading line 18 against the file's existence.
- **Suggested next step**: Settle it alongside the v2.5.0 migration work, where the naming collision will be in front of whoever is reading these modules anyway.

- **Migrated from**: v2.4.9#BG-20 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.9#BG-20; still owed: Owner decision; next: Implement truthful retention documentation, or owner-approved removal after supported-upgrade analysis. Header correction is the smallest sufficient option if retention is chosen; prove with K and reference inspection. Do not delete migration data paths opportunistically.

#### MT-28 - `video2x-adapter.test.ts` is flaky under full-suite load - MIGRATED to v2.17.0

- **Source**: this cycle, observed while re-establishing the test baseline
- **Impact**: One case in `desktop/tests/video2x-adapter.test.ts` fails intermittently in a FULL `vitest run` (2 of 3 runs) and passes every time the file runs alone. It imports nothing changed this cycle (`node:crypto`, `fs`, `path`, `SettingsStore`, a temp-dir helper), was last touched in v2.3.0, and uses real filesystem temp directories with timing-sensitive waits - consistent with temp-dir or scheduling contention on Windows under parallel load. It is therefore a pre-existing test-quality defect, not a regression, but it means the "36-failure baseline" for this host is really "36 plus an intermittent 37th".
- **Owner**: Open
- **Next step**: Identify the specific case (the JSON reporter shows the file but the run that captured names passed), then either isolate its temp dir per test or mark the file `sequential`.

- **Migrated from**: v2.4.8#MT-10 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.8#MT-10; still owed: Required qualification; next: Carry test reliability investigation, not an asserted current defect: capture failing case/timing under full-suite load, then remove uncontrolled waits or contention and verify full-load runs. Existing isolation invalidates blindly repeating the suggested temp-dir fix.

#### BG-5 - Two catalog video entries declare an incoherent frame budget - MIGRATED to v2.17.0

- **Source**: this cycle, MT-8's new catalog assertion
- **Impact**: `longcat-video-avatar-1.5` and `sana-video-2b-720p` both declare `maxVideoFrames: 8` with `maxVideoSeconds: 8` - one frame per second, which is not a video. The two Wan entries are coherent by contrast (121/5 is 24 fps, 81/5 is 16 fps), so the field is meaningful where it was filled in properly and a placeholder here. The capability map keeps conservative hand-set values for the two, and the test carries a named allowlist so a correction (or a new model with the same placeholder) fails loudly rather than passing.
- **Owner**: Open
- **Next step**: Establish the real frame limits for both checkpoints, correct `core/registry/catalog.json`, then delete the allowlist entry in `modelCapabilities.test.ts`.

- **Migrated from**: v2.4.8#BG-14 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.8#BG-14; still owed: Required implementation; next: Implement accurate semantics after first-party/runtime evidence: distinguish visual-token sampling from generation-frame limit if conflated, correct the two catalog fields or consuming interpretation, remove allowlist, prove L. Do not guess hardware frame limits from a 24fps default.

#### BG-6 - Three SANA ControlNet repos are gated, so they can be neither pinned nor downloaded - MIGRATED to v2.17.0

- **Source**: this cycle, BG-12's pin sweep
- **Impact**: `Efficient-Large-Model/SANA-ControlNet-{Canny,Depth,Pose}` return HTTP 401 on the model-info endpoint itself, not 404, so the repos exist but require Hugging Face credentials. Their three weight files are the last unpinned entries (3 of 107). The wider consequence is not the pin: if a user ever enables one of these ControlNets, the DOWNLOAD will 401 too. They are `type: controlnet` with no `task`, so they do not appear in the model picker and no user has hit this yet.
- **Owner**: Open
- **Next step**: Decide whether these belong in the catalog at all. Pinning them would require shipping or prompting for an HF token, which breaches the local-first, zero-credential posture; the honest alternatives are to drop the three entries or to mark them as requiring user-supplied credentials.

- **Migrated from**: v2.4.8#BG-15 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.8#BG-15; still owed: Owner decision; next: Carry catalog/security decision: remove unsupported auxiliaries with consumer checks, or explicitly credential-gate them under existing auth policy with real pins. Recheck vendor access before deciding; no network fetch or credential mutation was performed here.

#### MT-29 - Packaged token label is not observed - MIGRATED to v2.17.0

- **Source phase**: Phase 1 - Token split
- **Impact**: Tests pin the screenshot case (215 thinking bytes, 32 reply bytes, `eval_count: 72` -> 63 / 9) and the sum invariant. No packaged turn has been observed since.
- **Owner**: Operator, this cycle's installer rebuild
- **Next step**: Operator item 1 in `last-phase-evidence-v2.4.8-desktop-corrections.md`.

- **Migrated from**: v2.4.8#MT-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.8#MT-1; still owed: Required qualification; next: Carry current packaged token label qualification with the provenance contract, and record supersession of obsolete byte-proportional values. Match persisted request/message usage and tooltip to the observed turn.

#### MT-30 - Packaged composer dismissal and Persona chrome are not observed - MIGRATED to v2.17.0

- **Source phase**: Phase 2
- **Impact**: jsdom pointer and Escape events prove the hook; a real Tauri webview pointer has not.
- **Owner**: Operator, this cycle's installer rebuild
- **Next step**: Operator items 2-3.

- **Migrated from**: v2.4.8#MT-2 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.8#MT-2; still owed: Required qualification; next: Carry packaged interaction qualification: open/dismiss with pointer and Escape, verify focus and Persona display/selection without losing draft text.

#### MT-31 - Packaged Sessions title is not observed on all four pillars - MIGRATED to v2.17.0

- **Source phase**: Phase 3
- **Impact**: Tests pin copy and tokens on FolderTree and both studio panes; the packaged Agents pane title is asserted only through CodingPage copy.
- **Owner**: Operator, this cycle's installer rebuild
- **Next step**: Operator item 4.

- **Migrated from**: v2.4.8#MT-3 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.8#MT-3; still owed: Required qualification; next: Carry packaged four-route visual qualification and capture all titles in the same digest-bound run. Route presence alone cannot verify text rendering.

#### MT-32 - Packaged Settings card is not compared against the packaged installer picker side by side - MIGRATED to v2.17.0

- **Source phase**: Phase 4
- **Impact**: Parity is asserted on values (tab order, colors, pill order) and on structure, not on rendered pixels. Font family differs by platform (Qt `FONT_PRIMARY` vs. the app's `--font-sans` stack) and is not asserted.
- **Owner**: Operator, this cycle's installer rebuild
- **Next step**: Operator item 5.

- **Migrated from**: v2.4.8#MT-4 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.8#MT-4; still owed: Required qualification; next: Carry packaged side-by-side same-model comparison, including fonts, colors, pill order, and card layout on the actual host.

#### MT-33 - Packaged picker order and default are not observed after a fresh snapshot - MIGRATED to v2.17.0

- **Source phase**: Phase 5
- **Impact**: The desktop rule is proven against the stale on-disk snapshot; the installer's corrected writer is proven in pytest. The two have not been observed together on the operator host.
- **Owner**: Operator, this cycle's installer rebuild
- **Next step**: Operator items 6-7, then `type ~/.nexus/selected-models.json` to confirm `recommendedByTask.chat` and `.agentic` read `gemma-4-12b-it-gguf`.

- **Migrated from**: v2.4.8#MT-5 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.8#MT-5; still owed: Required qualification; next: Carry fresh-snapshot qualification: inspect generated recommendedByTask, open Chat/Agents empty sessions, and record order/defaults without overwriting user's real selection merely for evidence.

#### MT-34 - Packaged Phase 7 card cluster and collapsible groups are not observed - MIGRATED to v2.17.0

- **Source phase**: Phase 7 (added 2026-09-07)
- **Impact**: Tests pin size-then-action in the title row, the absence of star / checkmark / action row, the three headings with counts, collapse per tab, and disabled incompatible cards. None of it has rendered in the packaged desktop.
- **Owner**: Operator, this cycle's second installer rebuild
- **Next step**: Operator items 8-9 in `last-phase-evidence-v2.4.8-desktop-corrections.md`.

- **Migrated from**: v2.4.8#MT-6 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.8#MT-6; still owed: Required qualification; next: Carry packaged Settings qualification: group counts, per-tab collapse, disabled incompatible cards, size/action placement, and viewport behavior. Can absorb older density obligations only if explicitly carried.

#### MT-35 - Packaged Phase 8 surfaces are not observed - MIGRATED to v2.17.0

- **Source phase**: Phase 8 (added 2026-09-07)
- **Impact**: Tests pin the torch floor on three layers, the `loading` / `generating` stages, the `Loading model...` bubble state, the centered composer cluster, and the footer copy. No packaged install has yet reprovisioned the venv to torch 2.5.1 or generated a video on it.
- **Owner**: Operator, this cycle's third installer rebuild
- **Next step**: Operator items 10-15 in `last-phase-evidence-v2.4.8-desktop-corrections.md`.

- **Migrated from**: v2.4.8#MT-7 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.8#MT-7; still owed: Required qualification; next: Carry runtime plus packaged qualification: actual repaired environment versions, real video outcome, captions/loader/composer/footer observations, and logs bound to installer digest.

#### DF-119 - The stale torch 2.3.0 venv is repaired only by a reinstall or a Settings > Video Repair - MIGRATED to v2.17.0

- **Source phase**: Phase 8
- **Impact**: The desktop now reports the stale venv as repairable and offers Repair; the runtime refuses to generate with a typed message. Nothing upgrades the venv automatically. The wheel download is about 2.4 GB on Windows.
- **Owner**: Operator
- **Next step**: Re-run the rebuilt installer (the changed manifest fingerprint reprovisions) or press Repair in Settings > Video.

- **Migrated from**: v2.4.8#DF-5 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.8#DF-5; still owed: Owner decision; next: Carry owner/platform behavior decision: accept explicit repair with actionable UI, or design a consented upgrade flow. Do not silently launch a multi-gigabyte repair/download to satisfy this audit.

#### DF-120 - Settings no longer offers a way to set or clear a favorite model - MIGRATED to v2.17.0

- **Source phase**: Phase 7
- **Impact**: The star was the only Settings control for a favorite. Pickers still write a favorite on every model change and `resolveDefaultId` still honors it, so a favorite once set cannot be cleared from the UI.
- **Owner**: Next desktop cycle
- **Next step**: Decide whether favorites are dropped entirely (remove `writeFavorite` from the pickers) or get a small control on the picker itself.

- **Migrated from**: v2.4.8#DF-4 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.8#DF-4; still owed: Owner decision; next: Implement a small visible clear/reset preference action or adopt deliberate last-used semantics and remove misleading favorite contract. Prove M and affected page interaction; do not silently discard existing user preferences.

#### DF-121 - Uncommitted installer wizard-merge state rides in the rebuilt installer - MIGRATED to v2.17.0

- **Source phase**: Phase 6
- **Impact**: `develop` carries 30 modified and 6 untracked files (installer wizard merge rounds 1-3, recorded only in `docs/todos.md`). This plan neither staged nor reverted them; the rebuilt `NexusSetup.exe` includes them, as did the installer the operator already field-tested.
- **Owner**: Operator
- **Next step**: Decide whether the wizard merge becomes its own plan and commit, or is discarded, before v2.4.8 publishes.

- **Migrated from**: v2.4.8#DF-2 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.8#DF-2; still owed: Historical limit; next: Prove resolved historical source-publication candidate by comparing original wizard rounds to the merged commits and release artifact provenance. A current tracked source alone cannot establish which dirty bytes were in the old published installer. Preserve that historical limitation if exact provenance is unavailable.

#### DF-122 - Stale `recommendedByTask` on already-installed hosts is only masked, not rewritten - MIGRATED to v2.17.0

- **Source phase**: Phase 5
- **Impact**: The desktop rule keeps pickers and defaults correct against the stale snapshot; the file itself still says `chat: embeddinggemma` until the installer runs again. Settings downloads append to it without correcting it.
- **Owner**: Next desktop cycle
- **Next step**: Have the sidecar's `loadOrMigrate` drop a `recommendedByTask` entry whose model is not on the task's tab.

- **Migrated from**: v2.4.8#DF-3 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.8#DF-3; still owed: Required implementation; next: Implement validation against current per-task tab eligibility, atomically repair only invalid recommendation keys, preserve ordered/owned IDs and valid preferences, and prove N with a stale embeddinggemma chat recommendation fixture.

#### MT-36 - The reworked wizard is not observed in the packaged window - MIGRATED to v2.17.0

- **Source phase**: Phases 1-4
- **Impact**: Tests pin selection-scoped sizing across four consumers, the derived component resolver, the overlaid Browse button, the column-scoped Ollama URL, the hidden VS Code paragraph, one-line storage in the facts column, and the counter row. None of it has rendered in the packaged wizard, and Qt geometry does not resolve headlessly.
- **Owner**: Operator, this cycle's installer rebuild
- **Next step**: Operator items 1-5 in `last-phase-evidence-v2.4.7-wizard-density.md`.

- **Migrated from**: v2.4.7#MT-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.7#MT-1; still owed: Required qualification; next: Carry current packaged wizard qualification and explicitly reconcile superseded page/layout requirements; retain selection-scoped sizing, derivation, Browse/URL behavior, and review summary obligations.

#### DF-123 - Category labels are not coloured chips - MIGRATED to v2.17.0

- **Source phase**: Phase 4 - Review density and model summary
- **Impact**: Screenshot 4's mockup colours each category label. The counter row delivers the visual separation the operator asked for; recolouring the labels is cosmetic and carries a palette decision with no correctness content.
- **Owner**: Next installer cycle
- **Next step**: Decide a per-category palette, or accept the current neutral headings.

- **Migrated from**: v2.4.7#DF-2 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.7#DF-2; still owed: Owner decision; next: Carry explicit design decision: accept neutral labels, or choose category tokens and verify contrast plus packaged appearance. There is no correctness reason to invent a palette solely for closure.

#### MT-37 - Packaged payload fingerprint and maximized first show are not observed - MIGRATED to v2.17.0

- **Source phase**: Phase 1 - Packaged delivery and installer window
- **Impact**: Tests pin stale-bundle refusal, Settings fingerprint copy, and `present_installer_window` calling `showMaximized`. None of it has run in a frozen NexusSetup.exe on the operator host.
- **Owner**: Operator, this cycle's installer rebuild
- **Next step**: Phase 8 human items (1) and (5).

- **Migrated from**: v2.4.6#MT-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.6#MT-1; still owed: Required qualification; next: Carry packaged provenance/window qualification: inspect installed payload digest and first-show state; test copied stale payload separately under v2.4.6#WN-1.

#### MT-38 - Packaged Setup compactness is not observed - MIGRATED to v2.17.0

- **Source phase**: Phase 2 - Installer Setup compactness
- **Plan reference**: `docs/archive/v2/v2.4/plans/v2.4.6-field-delivery-density-and-session-identity.md` (sub-tasks 2.1-2.3)
- **Reason**: Qt tests pin two-column prereqs, a title-row Re-check icon, one-line GPU text, worker replacement, elision, and no trailing stretch. None of it has run in a frozen NexusSetup.exe on the operator host.
- **Suggested next step**: Phase 8 human item for Setup screenshot 1.

- **Migrated from**: v2.4.6#MT-2 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.6#MT-2; still owed: Required qualification; next: Carry packaged current Setup screenshot/geometry at supported widths with GPU one-liner, recheck behavior, worker replacement, and no unwanted trailing space.

#### MT-39 - Packaged Configuration, Review groups, and VS Code 1.136 VSIX load are not observed - MIGRATED to v2.17.0

- **Source phase**: Phase 3 - Configuration, VS Code host, and Review groups
- **Plan reference**: `docs/archive/v2/v2.4/plans/v2.4.6-field-delivery-density-and-session-identity.md` (sub-tasks 3.1-3.4)
- **Reason**: Tests pin Unsloth default-on when Compatible, 1.136 enabled and checked, absent Gemma/Video2X copy, and Review headings that keep juggernaut-xl-v9 under Image. None of it has run in a frozen NexusSetup.exe, and the VSIX has not been loaded in Microsoft VS Code 1.136.0 on the operator host.
- **Suggested next step**: Phase 8 human items for screenshots 2-4 and a `code --install-extension` on 1.136.

- **Migrated from**: v2.4.6#MT-3 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.6#MT-3; still owed: Required qualification; next: Carry host-compatibility qualification or explicitly supersede the obsolete host target with supported-version policy, preserving native-addon ABI/extension-load and packaged wizard obligations.

#### MT-40 - Packaged VS Code owned-agentic picker is not observed - MIGRATED to v2.17.0

- **Source phase**: Phase 4 - VS Code Agentic Model Surface
- **Plan reference**: `docs/archive/v2/v2.4/plans/v2.4.6-field-delivery-density-and-session-identity.md` (sub-tasks 4.1-4.4)
- **Reason**: Unit tests pin the AD-13 allowlist, empty-snapshot fail-closed, leftover installed ids absent, default `gemma-4-12b-it-gguf` when owned, and tool dispatch plus ConfirmationGate after a model switch. The command, status bar, and `/model` have not been clicked in a VSIX loaded on Microsoft VS Code 1.136.0.
- **Suggested next step**: Phase 8 human item: install the rebuilt VSIX, open Select Agentic Model, confirm leftover Ollama tags are absent.

- **Migrated from**: v2.4.6#MT-4 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.6#MT-4; still owed: Required qualification; next: Carry packaged VSIX qualification on a declared supported VS Code host with owned snapshot, leftover exclusion, default selection, model switch, tool dispatch, and ConfirmationGate.

#### MT-41 - Packaged Sessions History chrome is not observed - MIGRATED to v2.17.0

- **Source phase**: Phase 5 - Sessions History chrome and Session nouns
- **Plan reference**: `docs/archive/v2/v2.4/plans/v2.4.6-field-delivery-density-and-session-identity.md` (sub-tasks 5.1-5.4)
- **Reason**: Desktop tests pin the empty header, left-aligned create actions, `HISTORY_HAIRLINE_GAP` on both sides of the rule, Session copy, and the unchanged Chatbot tab label. None of it has run in a frozen desktop from this cycle's installer on the operator host.
- **Suggested next step**: Phase 8 human item (6): empty and filled Sessions History, centered hairline, Session copy, Chatbot tab unchanged.

- **Migrated from**: v2.4.6#MT-5 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.6#MT-5; still owed: Required qualification; next: Carry packaged empty and populated history qualification with centered hairline, left-aligned creation, and Session copy on all applicable surfaces.

#### MT-42 - Packaged Settings compact cards are not observed - MIGRATED to v2.17.0

- **Source phase**: Phase 6 - Settings model cards
- **Plan reference**: `docs/archive/v2/v2.4/plans/v2.4.6-field-delivery-density-and-session-identity.md` (sub-tasks 6.1-6.2)
- **Reason**: Desktop tests fail if Details, Best for, Why this one, `Also agentic`, `Backend model:`, or `ID:` return, and they pin the Gemma 4 12B three-line card plus a centered action row. None of it has run in a frozen desktop from this cycle's installer on the operator host.
- **Suggested next step**: Phase 8 human item (7): Settings Gemma card matches the three-line spec, no Details.

- **Migrated from**: v2.4.6#MT-6 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.6#MT-6; still owed: Required qualification; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede into v2.4.8#MT-6 only after recording current accepted card grammar and carrying compact/no-Details/no-duplicated-copy/viewport obligations. No historical packaged proof is implied.

#### MT-43 - Packaged four-tab runtime chrome is not observed - MIGRATED to v2.17.0

- **Source phase**: Phase 7 - Four-tab runtime chrome
- **Plan reference**: `docs/archive/v2/v2.4/plans/v2.4.6-field-delivery-density-and-session-identity.md` (sub-tasks 7.1-7.4)
- **Reason**: Desktop vitest pins leftover exclusion on Chat/Agents/Image/Video, Gemma 4 12B before LFM and gpt-oss among owned ids, RealVis default when owned, Stop replacing Send while streaming, Creating/Generating labels (orb state remains shaping), Advanced in `composer-advanced-slot`, and GPU not Idle at 0% while a job is active. None of it has run in a frozen desktop from this cycle's installer on the operator host.
- **Suggested next step**: Phase 8 human items for Chat tokens/Stop, Agents recommend order, Image RealVis plus captions, Video Generating, leftover absence, and GPU busy during a live turn.

- **Migrated from**: v2.4.6#MT-7 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.6#MT-7; still owed: Required qualification; next: Carry packaged live-turn matrix. Shared route smoke only proves mounting; use an actual running request for Stop/GPU busy and distinguish media generation from fail-closed behavior.

#### WN-7 - Mtime freshness cannot catch a freshly copied stale NSIS - MIGRATED to v2.17.0

- **Source phase**: Phase 1 - Packaged delivery and installer window
- **Impact**: Staging compares desktop source mtimes to the bundle mtime. Last week's tauri output left in `desktop/src-tauri/target` fails as intended. An old NSIS copied onto disk *after* source last changed gets a new timestamp and can still freeze.
- **Owner**: Phase 8 if field evidence shows a copied stale payload
- **Next step**: Prefer `cd desktop; npm run build:shell` immediately before `build-windows.ps1`. A source-tree stamp from `build:shell` would close the hole.

- **Migrated from**: v2.4.6#WN-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.6#WN-1; still owed: Required implementation; next: Implement source-content provenance emitted by build:shell and validated before staging; add a freshly copied stale-bundle reproduction. Prove O; hashing the copied bundle alone does not connect it to current source.

#### MT-44 - Packaged installer behavior is not observed - MIGRATED to v2.17.0

- **Source phase**: Phases 2-4
- **Impact**: Tests pin the probe across both stores and every failure mode, the Downloaded pill, first-load auto-selection that defers to user edits, two-column Review with per-model marks, a pending-only estimate, and the guard passing the exact field reproduction while still blocking a 500 GB new selection. None of it has run in the packaged wizard.
- **Owner**: Operator, this cycle's installer rebuild
- **Next step**: Operator items 1-4 in `last-phase-evidence-v2.4.5-installer-downloaded.md`.

- **Migrated from**: v2.4.5#MT-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.5#MT-1; still owed: Required qualification; next: Carry current frozen installer qualification on owned/downloaded models, recording existing-state versus new downloads and preserving user selections.

#### MT-45 - Ollama API detection path is not exercised against a live daemon - MIGRATED to v2.17.0

- **Source phase**: Phase 1 - Downloaded-model probe
- **Impact**: The `/api/tags` branch is covered by an injected fake and the disk-manifest fallback by real fixture files. A live Ollama returning its real payload shape has not been probed. A response shape change would silently fall back to the manifest path, which is correct but slower and would log a `probe_errors` line.
- **Owner**: Operator, next packaged run
- **Next step**: Operator item 4 (chat models detected with Ollama running, and again with it stopped).

- **Migrated from**: v2.4.5#MT-2 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.5#MT-2; still owed: Required qualification; next: Carry live API qualification: read actual /api/tags and compare installer detection, then exercise fallback in an isolated controlled environment. Do not interrupt the user's daemon for a test without scope confirmation.

#### WN-8 - Electron ABI for VS Code 1.136 is inferred from 1.134/1.135 - MIGRATED to v2.17.0

- **Source phase**: Phase 3 - Configuration, VS Code host, and Review groups
- **Plan reference**: `docs/archive/v2/v2.4/plans/v2.4.6-field-delivery-density-and-session-identity.md` (sub-task 3.2)
- **Reason**: vscode-versions listed 1.134.0 and 1.135.0 at Electron 42.8.1. 1.136.0 released 2026-09-02 and was not in that table at planning time. This phase kept the rebuild pin at 42.8.1 rather than claiming a new ABI.
- **Suggested next step**: Confirm `process.versions.electron` on the operator 1.136.0 host before Phase 8 VSIX rebuild; if it is not 42.8.1, rebuild `better-sqlite3` for that Electron.

- **Migrated from**: v2.4.6#WN-2 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.6#WN-2; still owed: Required qualification; next: Carry native-host qualification: read the running extension host's Electron/modules versions, compare to rebuild pin, and load the native dependency. Do not substitute CLI Node process.versions.

#### DF-124 - An already-installed Ollama still reads as "will be installed" - MIGRATED to v2.17.0

- **Source phase**: Phase 2 - Configuration scope
- **Impact**: `state.ollama_installed` could mark the row satisfied rather than pending. The installer step is already idempotent, so this is imprecise wording rather than wrong behavior.
- **Owner**: Next installer cycle
- **Next step**: Render a distinct "already present" state for a satisfied required component.

- **Migrated from**: v2.4.7#DF-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.7#DF-1; still owed: Required implementation; next: Prove superseded wording candidate with P and a current packaged Review check. If a pending mark still implies installation for satisfied Ollama, add explicit already-present state rather than declaring the wording fixed from absence alone.

#### DF-125 - The inferred reasoning / output split is not flagged in the tooltip - MIGRATED to v2.17.0

- **Source phase**: Phase 1
- **Impact**: When the provider gives only a total, the split is proportional and estimated while the total is exact. No protocol field carries "split inferred", so the tooltip states both numbers plainly.
- **Owner**: Next desktop cycle
- **Next step**: Add an optional `reasoningSplit: "provider" | "inferred"` to the `done` event and render `~` on inferred parts.

- **Migrated from**: v2.4.8#DF-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.8#DF-1; still owed: Required implementation; next: Prove resolved candidate for the original unlabelled-estimate defect with Q and event/store-to-render tests. Confirm no path labels proportional inference exact; do not require obsolete reasoningSplit spelling when the new provenance contract carries the fact.

#### WN-9 - jsdom cannot see CSS math functions, so width regressions are untestable in unit tests - MIGRATED to v2.17.0

- **Source**: this cycle, progress bar
- **Impact**: jsdom's `cssstyle` silently drops `min()` / `clamp()` from inline styles, so a `width: min(22rem, 100%)` is invisible to a test assertion. This is why the SECOND width regression (a `fit-content` parent leaking caption length back into the bar) passed the whole unit suite and was caught only by rendering the component and looking at it. Mitigated in the touched files by using `width` + `max-width` pairs instead of `min()`, but the blind spot remains repo-wide.
- **Owner**: Mitigated, not closed
- **Next step**: `desktop/tests/inlineStyleMathGuard.test.ts` now fails if `width` or `minWidth` uses `min()` / `max()` / `clamp()` in the three files whose geometry is asserted, and it self-retires (a test fails) if jsdom ever learns to parse them. `max-width` caps are deliberately exempt: a cap can only shrink an element, so it cannot produce the containing-block bug, and banning it would force less correct fixed values purely to satisfy the harness. The real fix is a browser-based visual check in CI, which this repo does not have.

- **Migrated from**: v2.4.9#WN-2 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.9#WN-2; still owed: Required qualification; next: Carry browser geometry/visual verification: add a real-layout overflow/width regression assertion at supported viewports, retain failing fixture and before/after captures, and use packaged testing for packaged claims. Existing guard is a mitigation, not a full browser gate.

#### DF-126 - Spoken replies start in 4 s, not the 2.0 s target - MIGRATED to v2.17.0

- **Source phase**: v2.14.0 Phase 2 (2026-10-16).
- **Plan reference**: v2.14.0 T010; gate V-1 in `docs/archives/v2/v2.14/development/gates.md`; results in `docs/archives/v2/v2.14/development/voice-latency-results.md`.
- **Reason**: after the streamed pipeline and its one rework iteration (Whisper cached, `think: false` on voice turns), median time to first audio on the medium fixture is 3,990 ms against the 2,000 ms gate (baseline 38,579 ms; short fixture 1,715 ms). The remaining time is transcription (about 1.3 s) plus the model finishing and synthesizing its first full sentence. The owner kept the streamed path rather than reverting it as the plan's cut-line would have (decision recorded in the results). Recorded here, not in the v2.14 ledger, because a gap opened during the v2.14 run cannot migrate at that minor's close.
- **Suggested next step**: measure a short spoken lead-in (the first clause, split at a comma, synthesized before the full sentence) and a smaller STT model for voice turns, each against V-1 with `scripts/measure-voice-latency.mjs --mode streamed`.

- **Migrated from**: v2.15.0#DF-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#DF-1; still owed: Required qualification; v2.14 gate V-1 and recorded streaming-retention exception.; next: Keep V-1 FAIL visible. H01 measures permitted latency improvements before another runtime is considered. The existing owner exception keeps streaming; it does not make 3,990 ms meet 2,000 ms or authorize a new passing claim.

#### DF-127 - PersonaPlex full-duplex voice is a v2.15+ candidate - MIGRATED to v2.17.0

- **Source phase**: v2.14.0 Phase 2 (2026-10-16).
- **Plan reference**: v2.14.0 T010 (V3 trigger FIRED); comparison `docs/archives/v2/v2.14/comparisons/v2.14.0-comparison-airllm-digup-mimic-personaplex.md`.
- **Reason**: the V3 trigger fired because V-1 was missed after Phase 2. v2.14 builds nothing for PersonaPlex, as planned.
- **Suggested next step**: plan it only with the comparison's preconditions: 24 GB tier only, the loopback bind and `torch.load` fixes, a `licenseNote`, and no Nexus memory or tools in that mode; re-measure V-1 first, since DF-1's levers may close the gap without it.

- **Migrated from**: v2.15.0#DF-2 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#DF-2; still owed: Optional candidate/watch; v2.14 V3 trigger explicitly built no PersonaPlex path.; next: Propose continued conditional watch after DF-1, preserving 24 GB-only trial, loopback, safe weight loading, license note and no-memory/tools conditions. No implementation of a fourth runtime is owed by this triage scope. Any carry still needs exact approved coverage.

#### WN-10 - Hosts without an NVIDIA or Apple GPU still get no voice runtime - MIGRATED to v2.17.0

- **Source phase**: v2.14.0 Phase 1 (2026-10-16), as v2.14 WN-6.
- **Plan reference**: v2.14.0 T001 provisioning delta.
- **Reason**: voice shares the provisioned media venv, but `scripts/installer/build/versions.lock.json` has only `win-x64-nvidia`, `linux-x64-nvidia` and `mac-arm64-apple` targets. A CPU-only host fails provisioning, so the audio runtime falls back to a bare `python` without the voice packages. Not a regression. Recorded here because a CPU target cannot be verified on the v2.14 reference host (NVIDIA GPU), and a gap opened during the v2.14 run cannot migrate at that minor's close.
- **Suggested next step**: add a CPU target (CPU torch wheels plus the same runtime requirements) and verify it on a CPU-only host or a GPU-hidden run.

- **Migrated from**: v2.15.0#WN-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#WN-1; still owed: Required implementation/qualification for voice on supported CPU-only tiers; a legacy CPU wheel list is not a provisioned target.; next: Keep A16 and H02. Add the exact CPU runtime target/interpreter path, prove isolated provisioning with GPU hidden, then exercise speech. New OS/platform expansion needs its own task.

#### WN-11 - The OCR runtime is not provisioned, and its OpenCV needs numpy 2 - MIGRATED to v2.17.0

- **Source phase**: v2.14.0 Phase 5 (2026-10-17), from the v2.14 WN-7 investigation.
- **Plan reference**: v2.14.0 T019 known-gaps reconciliation.
- **Reason**: `rapidocr-onnxruntime` appears only in the legacy `REQUIRED_WHEEL_PREFIXES` list; no verified provisioner installs it, so OCR works only where it was installed by hand. Installing it today pulls `opencv-python` 5.0.0.93, which requires `numpy>=2`, against the lock's `numpy==1.26.4`. The OCR runtime's interpreter likely defaults to a bare `python`, the same pattern as the voice bug fixed in v2.14.0 Phase 1. On the v2.14 reference host, where `rapidocr-onnxruntime` was installed by hand into the system Python, `tests/python/ocr/test_parse.py::TestEngineSelection::test_defaults_to_the_portable_engine` fails with `execution-failed` instead of `engine-unavailable` (also in the untouched main checkout, so not a v2.14 regression; CI has no RapidOCR and passes). Not proven here: which OCR features fail on a clean install.
- **Suggested next step**: provision OCR through the verified path with pinned `rapidocr-onnxruntime` and `opencv-python` versions compatible with the lock (or move the lock to numpy 2 after a media regression run), and point the OCR runtime at the provisioned interpreter.

- **Migrated from**: v2.15.0#WN-2 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#WN-2; still owed: Required clean-install OCR provisioning/interpreter integrity; installer owns runtime burden.; next: Keep A16. Freeze a compatible pinned OCR dependency set and route both hosts to the provisioned interpreter. Clean-runtime health/parse and media regressions must pass; avoid a global numpy upgrade.

#### WN-12 - The pinned-digest check cannot read a remote or containerized Ollama - MIGRATED to v2.17.0

- **Source phase**: v2.14.0 Phase 5 (2026-10-17), Tier 3 adversarial pass (finding 9).
- **Plan reference**: v2.14.0 T016; `core/registry/ollamaDigest.ts` `ollamaModelsDir`.
- **Reason**: the check reads Ollama's manifest from the sidecar's own `OLLAMA_MODELS` or home folder. When Ollama runs elsewhere (another machine, WSL, Docker, or a service with its own `OLLAMA_MODELS`), the manifest is unreadable, the check fails closed, and `lfm2.5:24b-a2b`, the only entry with a pinned digest, is removed on every install. Nexus is local-first, so the default setup is unaffected. Not proven here: which supported configurations point Nexus at a non-local Ollama.
- **Suggested next step**: when the Ollama base URL is not loopback, report the pull as unverifiable and let the user choose, instead of deleting it; or read the digest through an Ollama API if one exposes it.

- **Migrated from**: v2.15.0#WN-3 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#WN-3; still owed: Required safe/accurate verification at install boundary plus an unresolved topology-support decision.; next: Keep A05's distinction between inaccessible identity and proven mismatch. Owner must define supported service/WSL/container/remote topologies before changing trust semantics. Never silently accept an unreadable pinned model or delete content merely because a local manifest cannot be read.

#### WN-13 - A hung synthesis call keeps the voice runtime busy - MIGRATED to v2.17.0

- **Source phase**: v2.14.0 Phase 5 (2026-10-17), Tier 3 code-vs-plan convergence (item 3).
- **Plan reference**: v2.14.0 T005, T006; `runtimes/audio/engines.py` `iter_speak_segments`, `core/audio/AudioRuntimeClient.ts` `armIdle`.
- **Reason**: the 30 s per-segment bound is checked when a segment returns, because a synchronous Kokoro call cannot be interrupted inside its thread. The user-facing stall is bounded: after 30 s with no segment the client fails the stream and sends `speak.cancel`. But a call that never returns keeps the synthesis lane occupied, so later spoken replies queue behind it until the runtime restarts.
- **Suggested next step**: on a client idle timeout, restart the audio runtime process (the client already respawns it lazily), and add a test with a synthesis stub that never returns.

- **Migrated from**: v2.15.0#WN-4 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#WN-4; still owed: Required process recovery for shipped streamed voice; current timeout ends the request but can retain the blocked synthesis lane.; next: Keep A03 blocker. Terminate the owned hung child, settle all affected jobs once, and prove the next request runs in a fresh process. Lazy cancellation alone is not recovery.

#### WN-14 - Two low-severity hardening residuals from the adversarial pass - MIGRATED to v2.17.0

- **Source phase**: v2.14.0 Phase 5 (2026-10-17), Tier 3 adversarial pass (finding 10 and one suspicion).
- **Plan reference**: v2.14.0 T007 (`core/chat/speakable.ts`) and the DF-5 fix (`core/registry/NexusModelRegistry.ts`).
- **Reason**: (a) nested think blocks (`<think>a<think>b</think>c</think>d`) show and speak `c</think>d`. Depth tracking was not added, because a model whose template opens reasoning in the prompt and that also emits its own opener would then show nothing at all. (b) `install(spec)` with a spec that is not in the catalog skips the catalog's weights-path validation; production calls only `installById`, so reaching it needs a modified catalog.
- **Suggested next step**: strip a stray `</think>` from visible text when no reasoning block is open; validate `weights.files` paths inside `_installWeightsFiles` as well.

- **Migrated from**: v2.15.0#WN-5 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#WN-5; still owed: Required bounded hardening in shipped reasoning display and weight-file installation; two independent residuals.; next: Keep A04 and A05 separately. Stray tag suppression must preserve prompt-open reasoning behavior; full nested-reasoning semantics remain explicit if ambiguous. Reject unsafe custom-spec file paths before filesystem/network effects. One fix cannot close both halves.

#### DF-128 - The LFM2.5 24B-A2B admission rests on a reading of M-3 made after the results - MIGRATED to v2.17.0

- **Source phase**: v2.14.0 Phase 3 decision (2026-10-17), recorded by the Phase 5 Goal-vs-codebase review.
- **Plan reference**: v2.14.0 T014, T016; gate M-3 in `docs/archives/v2/v2.14/development/gates.md`; `docs/archives/v2/v2.14/development/lfm-ab-results.json`.
- **Reason**: M-3(b) needs equal golden-task completion, and the frozen text puts a difference inside the run-to-run spread under HOLD, which declines. The candidate completed 19/19/21 against the holder's 22/20/20 (means 19.67 and 20.67, overlapping ranges). The owner chose on 2026-10-17, after the results existed, to count overlapping ranges as equal, which turned HOLD into ADMIT; read literally, the frozen gate declines. `gates.md` calls a gate change after results invalid evidence. The entry is opt-in and changes no default, so no user gets it without choosing it.
- **Suggested next step**: decide keep or decline with new evidence rather than the reread: either the M5 two-cycle real-use check (v2.14 human testing item 7) or a fresh A/B frozen before it runs, with enough runs per arm to separate a one-task difference from the spread.

- **Migrated from**: v2.15.0#DF-3 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#DF-3; still owed: Owner decision plus required qualification for the current LFM admission claim; v2.14 M-3 and post-result interpretation.; next: Keep the exception and literal frozen HOLD interpretation. Owner chooses a new preregistered A/B or genuine M5 two-cycle observation before treating admission as independently proved. Do not reinterpret or rescore the retained data.

#### QG-10 - Spoken replies have no packaged-app evidence, and V-5 was never timed - MIGRATED to v2.17.0

- **Source phase**: v2.14.0 Phase 5 (2026-10-17), Goal-vs-codebase review.
- **Plan reference**: v2.14.0 "Delivery done" (packaged Windows behavioral evidence), T009, T010 Verification Expectation; gate V-5 (playback stops within 150 ms).
- **Reason**: every voice measurement drove the built sidecar over stdio with simulated playback; no run drove the installed app's window, microphone or speakers. V-5's PASS rests on the code path and a component test, not a timing. The packaged installer was rebuilt and smoke-tested in Phase 5, but that smoke does not exercise voice.
- **Suggested next step**: the owner's field test of the v2.14 human testing items 1 to 6 on the rebuilt installer, and a webview timing mark for barge-in-to-silence so V-5 can be measured; a packaged-window driver would also serve v2.14 WN-2.

- **Migrated from**: v2.15.0#QG-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#QG-1; still owed: Required packaged voice qualification and frozen V-5 timing.; next: Keep H01/H02 until installed microphone/playback behavior and barge-in-to-silence are measured against 150 ms. Code-path PASS is not timed speaker evidence.

#### DF-129 - Candidate runtime compatibility blocks scoring - MIGRATED to v2.17.0

- **Source phase**: Phase 2.
- **Plan reference**: T005; embedding-eval-results.json.
- **Reason**: Ollama 0.32.15 rejected embeddinggemma-2:270m with HTTP 412 and required a newer runtime. The preflight manifest is pinned at 9e1df58d197e80e5a6c12110efb67b38ba6c8e23790a5044e1cafe6bea34b8f4, 378346995 artifact bytes; installation did not complete. Positive candidate inference and paired quality are not proven here. No runtime/default/index was changed.
- **Suggested next step**: Qualify a compatible Ollama runtime without interrupting other sessions, then explicitly rerun the frozen evaluator to a new evidence file.

- **Migrated from**: v2.13.0#DF-1 on 2026-10-16 (reason: user-deferred)
- **Migration evidence**: left open by v2.13.0, the last plan of v2.13

- **Migrated from**: v2.14#DF-1 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: left open at the v2.14 close (v2.14.2 released 2026-10-19); needs an owner decision or evidence outside this run

- **Migrated from**: v2.15.0#DF-4 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#DF-4; still owed: Optional candidate/watch with runtime hold; v2.13 Phase 3 HOLD/RETAIN disposition.; next: Retain candidate inference as unproven. A separately controlled compatible runtime/preflight can reopen evaluation; no global Ollama upgrade or overwritten attempt. This is not missing implementation of an already admitted embedder.

#### DF-130 - Universal admission evidence is missing - MIGRATED to v2.17.0

- **Source phase**: Phase 2.
- **Plan reference**: T005 and conditional T007-T010; embedding-eval-results.json.
- **Reason**: Required hardware tiers, whole-runtime peak RAM, supported-context/precision behavior, controlled coding coexistence, process-level offline containment and authoritative distribution terms remain unproven. Every corresponding gate is HOLD; there is no model-admission approval or waived gate.
- **Suggested next step**: Gather each required gate under the frozen contract before proposing a default takeover. Retain the current default and alternative jobs; Phase 3 migration stays conditional. Plan tasks T008-T010 (migration design, identity enforcement, reversible rebuild) were moved out of the plan's task list on 2026-10-15 and are owned by this gap; restore them as tasks in the version that admits the model.

- **Migrated from**: v2.13.0#DF-2 on 2026-10-16 (reason: user-deferred)
- **Migration evidence**: left open by v2.13.0, the last plan of v2.13

- **Migrated from**: v2.14#DF-2 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: left open at the v2.14 close (v2.14.2 released 2026-10-19); needs an owner decision or evidence outside this run

- **Migrated from**: v2.15.0#DF-5 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#DF-5; still owed: Optional candidate/watch with admission and migration hold; conditional T008-T010 were explicitly skipped, not implemented.; next: Retain all hardware, distribution, offline containment and reindex gates. Only an admitting plan restores migration design/identity/reversible-rebuild tasks. A watch disposition must preserve `skipIsNotImplementation`, not certify those features.

#### WN-15 - Residual image-access hardening items from the adversarial review - MIGRATED to v2.17.0

- **Source phase**: Phase 7 Tier 3 deep pass (adversarial review).
- **Plan reference**: T018-T020; `image-command-contract.md`.
- **Reason**: (a) pre-existing: a holder of the app token can capture the Nexus window through `GET /nexus/screenshot` or `POST /nexus/capture` while an image is on screen, without an image grant; (b) before approval, `access` error codes reveal whether a turn has an owned PNG; (c) a link or junction on a parent of `~/.nexus/generations/exports` at first use is not detected (the leaf and later swaps are); (d) a render response is not bound to its request beyond id, size and a valid PNG, which relies on the renderer being the app's own window over its private IPC. Fixed in Phase 7 instead: unverified-name warning and request code in the ask, duplicate folding and per-caller caps, per-grant replay caches, one render per grant and 8 in total, full PNG chunk and CRC validation, generic errors, validated actions before hashing, collision-free and idempotent export names, hard-link refusal, and serialized Ask inbox writes.
- **Suggested next step**: decide whether capture routes should exclude image surfaces or require approval, and lstat every ancestor of the exports root at first use.

- **Migrated from**: v2.13.0#WN-3 on 2026-10-16 (reason: user-deferred)
- **Migration evidence**: left open by v2.13.0, the last plan of v2.13

- **Migrated from**: v2.14#WN-1 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: left open at the v2.14 close (v2.14.2 released 2026-10-19); needs an owner decision or evidence outside this run

- **Migrated from**: v2.15.0#WN-6 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#WN-6; still owed: Owner screenshot/image-grant policy plus required image-export/request-boundary hardening.; next: Keep O07 for capture policy and A07 for ancestor links, preapproval metadata/error exposure and exact render-response correlation. Preserve all four original concerns until individually proved or explicitly accepted.

#### WN-16 - The packaged desktop flows are not automated - MIGRATED to v2.17.0

- **Source phase**: Phases 5 and 6.
- **Plan reference**: Phase 5 and Phase 6 Verification Expectations; T016, T020.
- **Reason**: Restart is proven at the sidecar (real `sessions.db` and PNG, new store and ops), in the viewer (unmount and remount over the same state), and for pixels in headless Edge, the Chromium engine behind WebView2. Agent renders are proven at the authenticated route, the bridge and the renderer's claim/answer protocol, with the shared pixel path in the same engine. No harness drives the installed Tauri window through generate, edit, quit, relaunch and export, or carries an agent render request through the real shell into a live window.
- **Suggested next step**: Phase 7 human testing suggestions; a packaged-window driver if one is added later.

- **Migrated from**: v2.13.0#WN-1 on 2026-10-16 (reason: user-deferred)
- **Migration evidence**: left open by v2.13.0, the last plan of v2.13

Prior v2.12 and older registers remain authoritative. These new items resolve none of them.

- **Migrated from**: v2.14#WN-2 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: left open at the v2.14 close (v2.14.2 released 2026-10-19); needs an owner decision or evidence outside this run

- **Migrated from**: v2.15.0#WN-7 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#WN-7; still owed: Required installed-window qualification for delivered viewer/agent image-edit behavior.; next: Keep H06. Generate/edit/export, quit/relaunch and agent-render through the exact installed Tauri shell; retain payload identity and output pixels. Headless Edge and store reopen tests alone do not close it.

#### DF-131 - Live rewrite quality remains unmeasured after pilot format HOLD - MIGRATED to v2.17.0

- **Source phase**: v2.14.1 Phase 1, T002-T004.
- **Plan reference**: [local rewrite evaluation](../../../archives/v2/v2.14/plans/v2.14.1-adoption-humanizer-handwired.md), blocked-run continuation.
- **Reason**: The sole started pilot response completed but fenced its JSON. The frozen envelope rejects fences without repair or retry. Three pilot items and all sixteen held-out items are not run; no semantic, readability or language-quality verdict is available.
- **Owner**: Maintainer.
- **Suggested next step**: If another evaluation is wanted, separately preregister a revised experiment with retained ancestry and obtain qualified language review. Do not replay this experiment, infer a quality loss or admit Humanizer from this observation.

- **Migrated from**: v2.14#DF-5 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: left open at the v2.14 close (v2.14.2 released 2026-10-19); needs an owner decision or evidence outside this run

- **Migrated from**: v2.15.0#DF-8 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#DF-8; still owed: Optional candidate/watch with a frozen experimental limitation; v2.14.1 format HOLD.; next: Preserve the failed envelope and unrun items. Another experiment needs a new preregistration and qualified language review. Do not replay the old pilot or infer rewriting quality from its format failure.

#### DF-132 - Legacy history for OpenAI-compatible backends - MIGRATED to v2.17.0

- **Source phase**: Phase 3 - native tool history.
- **Plan reference**: [outline-promotion-readiness](../../../archives/v2/v2.12/plans/v2.12.0-outline-promotion-readiness.md), sub-task 3.1.
- **Reason**: The LM Studio and headless OpenAI clients convert coding history to the existing assistant-text plus user-role envelope format. Native Ollama history is proven locally on qwen3.5:9b and gemma4:12b; native round trips through other backends are not proven here.
- **Suggested next step**: Measure a live OpenAI-compatible native round trip and resume behavior before adding that backend's native message converter. Owner: the maintainer. Support tier: future for that native-history path.

- **Why still owed**: OpenAI-compatible backends still use the legacy history format, and native round trips through them are unproven.
- **Next step**: Record a live LM Studio native tool round trip and a resume, then add an 'openai' shape to toolHistory.toRequestMessages.
- **Migrated from**: v2.12#DF-v212-4 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

- **Migrated from**: v2.15.0#DF-9 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#DF-9; still owed: Optional future compatibility enhancement; v2.12 explicitly retained legacy OpenAI-compatible history.; next: Keep native OpenAI history unproven. A13 may add provider-correct conversion only after retained LM Studio round-trip/resume evidence. Legacy compatibility must continue; no live backend is assumed available here.

#### WN-17 - Media smoke proof needs separate packaging and installation evidence - MIGRATED to v2.17.0

- **Source phase**: Phase 7 - factual handbook review.
- **Plan reference**: [outline-promotion-readiness](../../../archives/v2/v2.12/plans/v2.12.0-outline-promotion-readiness.md), packaged installer qualification and final verification.
- **Reason**: The installed-media smoke harness records a supplied installer hash and exercises an installed sidecar; it does not install that candidate or establish installer-to-payload binding. Catalog-source reachability is a separate packaging check and is not invoked automatically by the Windows build. Generation-time artifact finalization checks are narrower than the smoke harness's decoded PNG and video probes. The corrected handbooks distinguish those evidence boundaries. Support tier: candidate for exact packaged installer/GPU qualification until the required operator evidence exists.
- **Suggested next step**: Retain catalog reachability output, installation of the exact candidate, installer-to-payload binding, and decoded PNG/video results together during packaged qualification. Assess deterministic binding and packaging-check enforcement when that path is implemented; do not certify an arbitrary existing installation from a supplied hash alone. Owner: the maintainer. Sources: `scripts/installer/build/smoke-installed-media.ps1`, `scripts/installer/build/build-windows.ps1`, and `scripts/installer/build/check-hf-catalog.py`.

- **Why still owed**: Installing the exact candidate, binding installer to payload, and the catalog reachability check are still missing; needs operator GPU hardware.
- **Next step**: In the next packaged qualification on an NVIDIA Windows host, run check-hf-catalog.py, install the exact NexusSetup.exe, then smoke-installed-media.ps1, keeping the outputs with the installer hash.
- **Migrated from**: v2.12#WN-v212-7 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

- **Migrated from**: v2.15.0#WN-10 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#WN-10; still owed: Required exact-install/GPU packaging qualification; supplied installer hash alone does not bind installed payload.; next: Keep H07 and the deterministic binding/preflight implementation in A16. Retain catalog reachability, artifact hash, install/payload provenance and decoded output together.

#### QG-11 - Terminal CI reconciliation requires explicit migration decisions - MIGRATED to v2.17.0

- **Source phase**: Phase 7 - terminal CI/CD comparison.
- **Plan reference**: [outline-promotion-readiness](../../../archives/v2/v2.12/plans/v2.12.0-outline-promotion-readiness.md), sub-task 7.5 and T025.
- **Reason**: The 23-field source/settings comparison has six PASS, eleven FAIL, three PARTIAL and three NOT PROVEN fields. Missing native report/release profiles, repeated feature-push/post-merge validation, incomplete pre-merge platform coverage, implicit permissions and inconsistent report publication are observable differences. On 2026-10-10 the maintainer approved, and Phase 7 applied, only the CI profile correctness patch and the action pin updates (four `actions/cache` references to v6.1.0 and the `scorecard.yml` `upload-sarif` commit pin); see the [pin evidence](../../../archives/v2/v2.12/development/evidence/phase-7-ci-action-pin-application.json). Those changes close none of the migration fields above. No permission, secret, required-check or settings change has been approved or applied. This is an incomplete gate, not an accepted bypass.
- **Suggested next step**: Retain [the comparison](../../../archives/v2/v2.12/development/phase-7-ci-comparison.md) and [input hashes/settings](../../../archives/v2/v2.12/development/evidence/phase-7-ci-inputs.json), prove remaining source/security fields, prepare exact incremental profile/event/reporting changes, and obtain each consequential CI/permission/settings approval before applying it. Re-gate locally and observe the approved integration topology. Owner: the maintainer. Existing canonical-profile carry-forward gaps remain open.

- **Why still owed**: None of the eleven FAIL fields is fixed; each needs a workflow, permission or settings change with its own approval.
- **Next step**: Draft an approval-ready proposal for field 15: explicit `permissions: contents: read` defaults for the 14 workflows, with job-level write grants listed.
- **Migrated from**: v2.12#QG-v212-1 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

- **Migrated from**: v2.15.0#QG-2 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#QG-2; still owed: Required CI contract reconciliation with specific consequential permission/settings decisions.; next: Keep A17. Recompute the 23 fields against current code/settings, propose exact changes and prove the approved topology. Do not reuse the stale old tally or treat broad migration approval as permission to change secrets/protection.

#### BG-7 - SANA ControlNet SHA-256 pins are still the all-zero placeholder. - MIGRATED to v2.17.0

The files were not fetched.

- **Archived record**: `docs/archive/v2/v2.4/known-gaps.md`

- **Why still owed**: The three SANA ControlNet entries still ship all-zero pins and stay exempt, so an install of them has no integrity check.
- **Next step**: Owner decides keep or drop: keep means rotate with `pin-hf-weights.py --from-dir` from an authenticated download or a public mirror; drop means remove the three rows. Either way, empty PLACEHOLDER_SHA_LEGACY_EXEMPT.
- **Migrated from**: v2.12#BG-2 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

- **Migrated from**: v2.15.0#BG-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#BG-1; still owed: Required artifact integrity if three SANA ControlNet entries remain catalog-supported.; next: Keep A14 pinning blocker or an explicit owner decision to remove the entries. Preserve accepted artifact/license constraints. No fake digest, unrestricted exemption, or unannounced feature removal.

#### DF-133 - MiniCPM tool tags are stripped by Ollama before Nexus can parse them. - MIGRATED to v2.17.0

- **Archived record**: `docs/archive/v2/v2.4/known-gaps.md`

- **Why still owed**: A runtime-boundary blocker that waits on an Ollama change; neither exit route is open on the current version.
- **Next step**: On an Ollama newer than 0.32.15, re-run the recorded echo prompt (`/api/generate`, `raw: true`) and check whether `<function` survives.
- **Migrated from**: v2.12#DF-1 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

- **Migrated from**: v2.15.0#DF-10 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#DF-10; still owed: Optional watch on an external runtime boundary; OQ-6 and the v2.4.10 raw-output evidence.; next: Preserve the exact MiniCPM re-probe trigger. Recheck actual returned tokens on a recorded runtime before proposing a parser; absent delimiters cannot be repaired by a parser test. Pair with WN-11.

#### WN-18 - The bundled MiniCPM template has no tools section. - MIGRATED to v2.17.0

That template is outside this repo.

- **Archived record**: `docs/archive/v2/v2.4/known-gaps.md`

- **Why still owed**: The recorded exit check still fails, though the Jinja template may already open the /api/chat route; not proven here.
- **Next step**: Send one /api/chat request with a `tools` array to the MiniCPM tag and check whether the tool definitions reach the prompt; fold the result into the DF-1 re-probe.
- **Migrated from**: v2.12#WN-2 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

- **Migrated from**: v2.15.0#WN-11 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#WN-11; still owed: Optional external-template watch coupled to MiniCPM runtime hold.; next: Propose conditional carry only with DF-10's concrete runtime re-probe and existing approval coverage. Test the actual installed Ollama template/tools request; no repository-only template claim suffices.

#### DF-134 - Live NVIDIA splat generate was not run. - MIGRATED to v2.17.0

- **Archived record**: `docs/archive/v2/v2.4/known-gaps.md`

- **Why still owed**: The feature ships and no live NVIDIA run is recorded.
- **Next step**: On a CUDA host with TripoSplat weights installed, run `node scripts/bench-gaussian-splat.mjs --real` and add the row to the splat baseline.
- **Migrated from**: v2.12#DF-v240-1 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

- **Migrated from**: v2.15.0#DF-11 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#DF-11; still owed: Required qualification of the shipped optional splat generation route; v2.4 real NVIDIA benchmark.; next: Keep H03 hardware blocker open until verified TripoSplat bytes are installed and a real CUDA generation/output is retained. Optional user selection does not make a claim of functioning generation self-proving.

#### DF-135 - TripoSplat weight file hashes were not downloaded. - MIGRATED to v2.17.0

`source.sha256` is the all-zero placeholder.

- **Archived record**: `docs/archive/v2/v2.4/known-gaps.md`

- **Why still owed**: The TripoSplat files are still unpinned, and the pin check cannot see the entry, so the gap is also invisible to it.
- **Next step**: Add a weights.files list for the TripoSplat files at revision 56a96e60, then run `pin-hf-weights.py --model triposplat`.
- **Migrated from**: v2.12#DF-v240-2 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

- **Migrated from**: v2.15.0#DF-12 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#DF-12; still owed: Required implementation/integrity for the retained TripoSplat catalog row.; next: Keep A14 blocker. Identify required files at the pinned revision, add the complete file list, pin authentic bytes and prove install verification. A source-directory URL and all-zero hash do not qualify.

#### DF-136 - Older version gap logs still contain operator and hardware items that were not re-tested. - MIGRATED to v2.17.0

- **Archived record**: `docs/archive/v1/` and `docs/archive/v2/v2.0` through `v2.3`

- **Why still owed**: Proposed for closure at v2.15.0 triage, not accepted by the owner (T010): A pointer to other ledgers, not a gap of its own; the v2.15.0 inventory and follow-up batches now track each of those items individually. Superseded by v2.15.0-followup-batches.md.
- **Next step**: Accept or reject the proposed closure recorded in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md`.
- **Migrated from**: v2.12#DF-v240-3 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

- **Migrated from**: v2.15.0#DF-13 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#DF-13; still owed: Historical umbrella pointer; v2.15.0 inventory now enumerates the original children.; next: Propose owner-accepted supersession by the exact 199-item follow-up inventory. Preserve every child and its current disposition; closing the pointer closes none of the 199 underlying obligations.

#### MT-46 - A real WebGL2 framebuffer was not captured. - MIGRATED to v2.17.0

- **Archived record**: `docs/archive/v2/v2.4/known-gaps.md`

- **Why still owed**: The feature ships and no real GPU framebuffer capture exists.
- **Next step**: On a GPU host, orbit a fixture splat in SplatViewerCanvas and save the canvas PNG and GL renderer string as evidence.
- **Migrated from**: v2.12#MT-v240-1 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

- **Migrated from**: v2.15.0#MT-2 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#MT-2; still owed: Required real-render qualification of the retained splat viewer claim.; next: Keep H04 until a real WebGL2 render/orbit produces inspected pixels and recorded renderer identity. Existing component fixtures are useful but not the missing framebuffer observation.

#### QG-12 - The full local suite was not run on the Electron `better-sqlite3` ABI. - MIGRATED to v2.17.0

CI Node 22 ran it on the merge.

- **Archived record**: `docs/archive/v2/v2.4/known-gaps.md`

- **Why still owed**: Proposed for closure at v2.15.0 triage, not accepted by the owner (T010): A one-session environment limit at v2.4.0 whose own next step is done on every merge.
- **Next step**: Accept or reject the proposed closure recorded in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md`.
- **Migrated from**: v2.12#QG-v240-1 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

- **Migrated from**: v2.15.0#QG-3 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#QG-3; still owed: Historical host/ABI qualification limit; Node CI does not prove Electron ABI compatibility.; next: Owner decides the original plan's true exit bar: close the plan-scoped host limitation if explicitly allowed, or retain a named Electron ABI qualification task. Do not relabel a Node full-suite pass as an Electron full-suite pass.

#### QG-13 - `develop` and `main` require only `ci-required`; `installer-required` is not a required context. - MIGRATED to v2.17.0

Narrowed in v2.11.0: the gate now accepts `success` only, so a skipped installer leg fails it. Still open: the maintainer adds `installer-required` to branch protection after the v2.11.0 merge (a repository setting, not a file).

- **Archived record**: `docs/archive/v2/v2.5/known-gaps.md`

- **Why still owed**: The workflow side is done and its preconditions are met, but the repository setting that makes installer-required a required check is not applied.
- **Next step**: Maintainer only (repository setting): record current protection for rollback, then add the installer-required context to develop and main required checks.
- **Migrated from**: v2.12#CI-v251-1 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010); recorded as a QG item because this ledger has no CI category

- **Migrated from**: v2.15.0#QG-4 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#QG-4; still owed: Required enforcement of an accepted installer check plus owner repository-protection authority.; next: Keep A17 and setting blocker O08. Fresh reads still require only `ci-required` on both branches. Snapshot rollback/settings, then apply only the exact approved required-context change and verify enforcement.

#### DF-137 - Chat search still matches titles only. - MIGRATED to v2.17.0

A hit is not labelled with the branch it belongs to.

- **Archived record**: `docs/archive/v2/v2.6/known-gaps.md`

- **Why still owed**: Search still matches titles only and a hit does not name its branch; the exit condition is not met.
- **Next step**: Add forkedFromChatId and the parent title to the search hit in ChatExplorerStore.search, asserted in desktop/tests/sidecar-node/chat-explorer-phase5.test.ts.
- **Migrated from**: v2.12#DF-v260-1 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

- **Migrated from**: v2.15.0#DF-14 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#DF-14; still owed: Required implementation of branch-aware search identity; v2.6 Chat surface contract and current search hit shape.; next: Keep A08 blocker. Return/display fork parent and branch identity, retain correct selection behavior and test parent deletion. Decide separately whether transcript-content search is an accepted requirement; title-search lineage alone does not implement content indexing.

#### QG-14 - The packaged offline probe was not re-run after adding Mermaid. - MIGRATED to v2.17.0

The v2.6.0 asset build is not that probe.

- **Archived record**: `docs/archive/v2/v2.6/known-gaps.md`

- **Why still owed**: Proposed resolved at low confidence at v2.15.0 triage, not accepted (T010): A packaged build with Mermaid passed the same offline judge with zero findings. Low confidence: the named script was not run, and the probe may not render a Mermaid diagram.
- **Next step**: Run `desktop/tests/packaged/offline.smoke.mjs` on the next packaged probe report and record `offline: PASS`.
- **Migrated from**: v2.12#QG-v260-1 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

- **Migrated from**: v2.15.0#QG-5 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#QG-5; still owed: Required packaged offline evidence covering Mermaid use after its addition.; next: Keep H09. Capture a current packaged report that actually renders Mermaid, then run the offline judge. A judge run on an unrelated report does not establish the missing feature/network observation.

#### DF-138 - User compaction is not written back to `chat_chat_messages`, so a restart reloads the pre-compact transcript. - MIGRATED to v2.17.0

- **Archived record**: `docs/archive/v2/v2.6/known-gaps.md`

- **Why still owed**: A compaction is still memory-only, so a restart reloads the pre-compact transcript.
- **Next step**: Add a ChatExplorerStore method that writes the snapshot and replacement chat_chat_messages rows in one transaction, called from compactActiveChat through a sidecar handler.
- **Migrated from**: v2.12#DF-v260-2 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

- **Migrated from**: v2.15.0#DF-15 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#DF-15; still owed: Required implementation of durable user compaction; v2.6 context-control behavior.; next: Keep A09 blocker. Persist snapshot and replacement transcript atomically through the store/sidecar, exercise restart and durable undo, and preserve branch/message ownership. In-memory `replaceTranscript` is insufficient.

#### DF-139 - The Qwen3.8 guard matches `id` and `source.url` only. - MIGRATED to v2.17.0

- **Archived record**: `docs/archive/v2/v2.6/known-gaps.md`

- **Why still owed**: Every residual bypass in the original record is still open, and no decision says catalog review covers them.
- **Next step**: Widen the guard to family, name and displayName and a `p` separator, with tests in `TestQwen38FamilyGuard`.
- **Migrated from**: v2.12#DF-v260-3 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

- **Migrated from**: v2.15.0#DF-16 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#DF-16; still owed: Required implementation of an accepted deny-by-default admission guard; v2.6 residual bypass list.; next: Keep A12 blocker. Match the documented identity/name/family/URL surfaces and separators while keeping ordinary Qwen3 8B legal. Real validator mutations must prove both refusals and allowed neighbors.

#### DF-140 - Qwen3.8-27B is not admitted. - MIGRATED to v2.17.0

- **Archived record**: `docs/archive/v2/v2.6/known-gaps.md`

- **Why still owed**: Proposed for closure at v2.15.0 triage, not accepted by the owner (T010): The decision and its reopen conditions live in the acceptance bar and are enforced by the invariant; nothing is owed until a trigger fires.
- **Next step**: Accept or reject the proposed closure recorded in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md`.
- **Migrated from**: v2.12#DF-v260-4 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

- **Migrated from**: v2.15.0#DF-17 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#DF-17; still owed: Optional candidate/watch with an existing decline; acceptance-bar allowlist remains empty.; next: Propose owner acceptance of closing the old adoption request while preserving the live denial and reopen conditions. This records an active decision; it admits no Qwen3.8 model and supplies no fresh vendor qualification.

#### DF-141 - No llama.cpp serving path. - MIGRATED to v2.17.0

- **Archived record**: `docs/archive/v2/v2.6/known-gaps.md`

- **Why still owed**: Catalog models that need mmproj or a draft model still cannot ship, and the runtime decision the exit condition requires has not been made.
- **Next step**: Write a runtime comparison (llama.cpp as a catalog serving path versus Ollama only) and record the decision as an ADR.
- **Migrated from**: v2.12#DF-v260-5 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

- **Migrated from**: v2.15.0#DF-18 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#DF-18; still owed: Owner architecture decision about a new managed serving path; existing local adapter is narrower.; next: Keep O03 decision separate from required shipped bugs. Compare a catalog-managed llama.cpp job with existing adapters/Ollama; implement nothing merely to make the optional proposal disappear.

#### DF-142 - The uncensored-LLM product question is unanswered. - MIGRATED to v2.17.0

- **Archived record**: `docs/archive/v2/v2.6/known-gaps.md`

- **Why still owed**: The exit condition is an explicit product decision, and none is recorded.
- **Next step**: Owner records a yes or no on uncensored LLM entries (STRATEGY.md line or ADR), then close against it.
- **Migrated from**: v2.12#DF-v260-6 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

- **Migrated from**: v2.15.0#DF-19 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#DF-19; still owed: Owner product decision; individual model declines do not settle general uncensored-LLM policy.; next: Keep O04. Record a concrete policy or explicit deferral under the same acceptance bar; do not infer a yes/no from this task or use a new model admission as a substitute.

#### WN-19 - Release-scoped Qwen3.8 mentions under `docs/archive/` stay as written. - MIGRATED to v2.17.0

- **Archived record**: `docs/archive/v2/v2.6/known-gaps.md`

- **Why still owed**: Proposed for closure at v2.15.0 triage, not accepted by the owner (T010): A permanent decision not to rewrite archived release text; nothing is owed and nothing can change it.
- **Next step**: Accept or reject the proposed closure recorded in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md`.
- **Migrated from**: v2.12#WN-v260-1 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

- **Migrated from**: v2.15.0#WN-12 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#WN-12; still owed: Historical preservation policy; old release prose intentionally stays unchanged.; next: Propose owner acceptance of closing this no-action historical item. Preserve archived wording; living admission records remain the current policy. Do not rewrite archives to clear the warning.

#### QG-15 - Narrowed in v2.11.0: `ci.yml` now defaults to `permissions: contents: read`, and `package.json` has `fast`, `full`, and `platform` profiles composed from existing commands. Still open: no `report` profile (it needs a summary writer that reads other profiles' output) and no `release` profile (publication belongs to semantic-release), and `ci.yml` still runs its own steps rather than calling the profiles. Owner: the maintainer. - MIGRATED to v2.17.0

- **Archived record**: `docs/archive/v2/v2.7/known-gaps.md`

- **Why still owed**: No working report or release profile, and CI runs inline steps; overlaps QG-v212-1 fields 2 and 3, which keeps this entry separate.
- **Next step**: Owner decides whether to fold this into v2.12.0#QG-v212-1; otherwise write the report summary writer, then (separate workflow approval) replace inline CI steps with profile calls.
- **Migrated from**: v2.12#QG-v270-2 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

- **Migrated from**: v2.15.0#QG-7 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#QG-7; still owed: Required remaining canonical profile/wiring contract, with stale absence language.; next: Narrow against current report/release implementations, then retain A17's release-profile/wiring/report-input obligations. Do not create another report runner or close pipeline gaps from `--list` output.

#### QG-16 - `docs/handbooks/html/atlas.html` scrolls sideways at 390 px (524 px wide) from a cause other than inline code, and CI does not run `npm run docs:handbooks:check`, which let `atlas.html` go stale until v2.11.0 regenerated it. Owner: the maintainer. Next step: find the wide element in the atlas, and add the handbook check to the `fast` profile and CI. - MIGRATED to v2.17.0

- **Archived record**: `docs/archive/v2/v2.11/development/v2.11.0-last-phase-evidence.md`

- **Why still owed**: The overflow is fixed, but the narrow atlas table still breaks words and no CI job or profile runs the handbook check.
- **Next step**: After the QG-v270-1 fix, add docs:handbooks:check to the fast profile (CI wiring needs workflow approval), and set a wrap rule for the atlas table.
- **Migrated from**: v2.12#QG-v211-1 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

- **Migrated from**: v2.15.0#QG-8 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#QG-8; still owed: Required handbook narrow-screen fidelity/check integration; original overflow partly fixed.; next: Keep A18 and A17's reviewed CI portion. Retain a narrow atlas capture with sensible word wrapping; add actual handbook check to the selected local profile and prove it catches drift. Do not claim horizontal overflow still reproduces without measuring.

#### QG-17 - The production audit allowlist gained `global-agent`, `roarr`, and `sprintf-js` (GHSA-hp3w-g68c-fv3c, no patched `sprintf-js` release). - MIGRATED to v2.17.0

All three load only from `onnxruntime-node/script/install.js`, its install-time binary download, never at runtime. Fixing them needs a semver-major `global-agent` under a parent that pins `^3.0.0`. Five other advisories in the same audit were fixed in range (`proxy-addr` 2.0.8, `undici` 7.30.0, `fast-uri` 3.1.8, `ip-address` 10.7.3, `source-map-js` 1.2.2). Owner: the maintainer. Next step: remove the three entries when `onnxruntime-node` moves to `global-agent` 4 or a patched `sprintf-js` ships.

- **Archived record**: `scripts/check-prod-audit.mjs`

- **Why still owed**: The removal trigger fired (global-agent 4), but the unused allowlist entries are still in the script.
- **Next step**: Remove the three entries and their comment, then rerun check-prod-audit.
- **Migrated from**: v2.12#QG-v211-2 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

- **Migrated from**: v2.15.0#QG-9 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#QG-9; still owed: Required retirement of obsolete explicit production-audit bypasses.; next: Keep A18. Remove the three stale exceptions, then retain a fresh actual production-audit result against the current lock. No new exception or lower severity threshold.

#### QG-18 - The three OS installers were not executed locally for the avatar plan. - MIGRATED to v2.17.0

The installer matrix workflow already exists.

- **Archived record**: `docs/archive/v2/v2.7/known-gaps.md`

- **Why still owed**: Proposed for closure at v2.15.0 triage, not accepted by the owner (T010): Plan-scoped, its own next step is in force, and the plan owed no installer run; running a real installer is tracked by v2.12.0#WN-v212-7 and CI-v251-1.
- **Next step**: Accept or reject the proposed closure recorded in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md`.
- **Migrated from**: v2.12#QG-v270-3 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

- **Migrated from**: v2.15.0#QG-10 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#QG-10; still owed: Historical avatar-plan installer scope plus qualification already owned elsewhere.; next: Propose narrow owner-accepted supersession only if the original plan owed no local three-OS install. Preserve H07 exact installed-candidate proof and QG-4 enforcement; do not certify three platforms from workflow existence.

#### DF-143 - The community Qwen-Image GGUF and Bespoke Nimble are not admitted. - MIGRATED to v2.17.0

No catalog row. The living-bar sentences waited.

- **Archived record**: `docs/archive/v2/v2.8/known-gaps.md`

- **Why still owed**: Proposed for closure at v2.15.0 triage, not accepted by the owner (T010): The decline is recorded and indexed; the owed living-bar sentence was superseded by the declined-models index. The v2.8 record states no reopen conditions, which the owner may want to add.
- **Next step**: Accept or reject the proposed closure recorded in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md`.
- **Migrated from**: v2.12#DF-v280-1 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

- **Migrated from**: v2.15.0#DF-20 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#DF-20; still owed: Historical declined adoption plus optional reopen watch; v2.8 decline and current exclusion tests/index.; next: Propose owner acceptance of closed-decline disposition, preserving reasons and any agreed reopen trigger in the living index. Do not add the declined names to a bar section whose tests forbid them.

#### DF-144 - CrisperWhisper 2.0 is not admitted. - MIGRATED to v2.17.0

The fetched page has no weights, license, or size. No catalog row.

- **Archived record**: `docs/archive/v2/v2.9/known-gaps.md`

- **Why still owed**: Proposed for closure at v2.15.0 triage, not accepted by the owner (T010): Recorded and indexed; the remaining doc step was superseded by the index. Nothing is owed unless weights, a license and a size are published.
- **Next step**: Accept or reject the proposed closure recorded in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md`.
- **Migrated from**: v2.12#DF-v290-1 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

- **Migrated from**: v2.15.0#DF-21 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#DF-21; still owed: Historical declined adoption plus publication watch; v2.9 record and current index/tests.; next: Propose owner acceptance of closure of the historical request, retaining its artifact/license/size trigger. No claim about today's external publication state is made without a new source check.

#### DF-145 - Hosted Jev, Laya 0.3.20, and Kev 0.8B, 4B, 9B, and 27B are not admitted. - MIGRATED to v2.17.0

No catalog row.

- **Archived record**: `docs/archive/v2/v2.10/known-gaps.md`

- **Why still owed**: Proposed for closure at v2.15.0 triage, not accepted by the owner (T010): The decline is in the living index with its reasons and a guard test enforces it; nothing is owed.
- **Next step**: Accept or reject the proposed closure recorded in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md`.
- **Migrated from**: v2.12#DF-v210-1 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

- **Migrated from**: v2.15.0#DF-22 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#DF-22; still owed: Historical declined hosted integration; v2.10 record and exclusion guard.; next: Propose owner acceptance of closure against the indexed decision and guard. Hosted Jev/Laya/Kev implementation is not owed by a completed local-first decline.

#### DF-146 - CLM-8B is not admitted, no catalog row. - MIGRATED to v2.17.0

Its README gives Apache-2.0 code and weights, two frozen Qwen3-8B encoders with 20M-parameter heads, ranking over a closed candidate set, and a serve path of vLLM plus `clm-serve` with no Windows instructions. It does not close DF-11. The v2.10 hosted and license grounds no longer apply to it; the runtime, single-GPU, and job-map grounds still do. The PageIndex package and PageIndex Cloud are not adopted: default models are hosted, local mode asks for an OpenAI key, and OCR and MCP are cloud-only. The local equivalent is PI-1 in the v2.11.0 plan. AIRI was re-checked through 0.12.0-beta.5 with no new adoption.

- **Archived record**: `docs/archive/v2/v2.11/comparisons/v2.11.0-comparison-pageindex-airi-clm.md`

- **Why still owed**: Proposed for closure at v2.15.0 triage, not accepted by the owner (T010): Recorded and indexed with the grounds that still apply, and enforced by a guard test; nothing is owed.
- **Next step**: Accept or reject the proposed closure recorded in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md`.
- **Migrated from**: v2.12#DF-v211-1 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

- **Migrated from**: v2.15.0#DF-23 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#DF-23; still owed: Historical declined CLM/PageIndex adoption; v2.11 corrected grounds, index and guard.; next: Propose owner acceptance of closure while preserving corrected runtime/job-map grounds and original evidence. This is neither a CLM implementation nor an admission result.

#### DF-147 - CPU OCR (RapidOCR, the portable default) costs about 6.8 s per text-dense page on this host: a 60-page PDF takes about 7 minutes on the first `document_outline` call, the same cost `parse_document` already pays. The GPU engine was not measured. The runtime also caps at 200 pages and reports `pageCount: 200`, hiding truncation past that. - MIGRATED to v2.17.0

- **Archived record**: `docs/archive/v2/v2.11/development/outline-feasibility.md`

- **Why still owed**: OCR cost is unchanged and the GPU engine is unmeasured; the page count still reports the capped value, though truncation is now marked.
- **Next step**: Return the PDF's total page count from runtimes/ocr beside the parsed count, and time a 100-page first outline on the GPU engine.
- **Migrated from**: v2.12#DF-v211-3 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

- **Migrated from**: v2.15.0#DF-25 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#DF-25; still owed: Required surviving generic OCR metadata and real-engine qualification; mixed historical outline timing.; next: Return trustworthy total and parsed page counts through runtimes/ocr and both surviving parse_document hosts; retain unknown granularity where page boundaries are unavailable. Prove capped/uncapped PDF behavior and qualify real GPU OCR throughput separately. Preserve old measurements; do not benchmark or restore retired document_outline.

#### WN-20 - No egress from the OCR child process is proven at socket level. - MIGRATED to v2.17.0

The test traps sockets in the Node process and scans first-party OCR sources for network imports; third-party OCR packages and first-run model downloads are not covered. Not proven here.

- **Archived record**: `tests/unit/modules/coding/documents/DocumentOutlineTools.test.ts`

- **Why still owed**: No process-level proof that the OCR child sends nothing out; third-party packages and first-run model downloads are uncovered.
- **Next step**: Run the OCR child under an OS-level network block during an outline parse and record the result as evidence.
- **Migrated from**: v2.12#WN-v211-6 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

- **Migrated from**: v2.15.0#WN-13 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#WN-13; still owed: Required process-level offline qualification of the retained OCR local-only claim.; next: Keep H08. A scoped OS containment run must show the real Python child can parse with installed weights and cannot open outbound sockets. Node mocks/source scans are insufficient.

#### WN-21 - Both agent loops now send `tools` natively to every model whose catalog format is not `none` (the extension already did). - MIGRATED to v2.17.0

A model Ollama reports without the `tools` capability may reject such a request. Not proven here: every chat model installed on this host declares `tools`.

- **Archived record**: `docs/archive/v2/v2.11/development/history/2026-10-03_v2.11.0-pageindex-airi-clm-phase-5.md`

- **Why still owed**: Nothing checks model capabilities before sending native tools, and the behavior with a model that lacks them is unproven.
- **Next step**: Read /api/show capabilities once per model and skip native tools when `tools` is missing, with a stubbed unit test.
- **Migrated from**: v2.12#WN-v211-4 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

- **Migrated from**: v2.15.0#WN-17 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#WN-17; still owed: Required robust native-tool request routing for supported installed models.; next: Keep A12. Read/corroborate actual model capability, define unknown/probe-failure fallback, and preserve functional tool access. A format binding alone is not a runtime capability assertion.

#### DF-148 - Aleph Alpha's Kolibri-1 (released 2026-10-03, Apache-2.0, 78B total and 3.46B active parameters, about 78 GB in FP8) is not admitted, no catalog row. - MIGRATED to v2.17.0

The smallest community GGUF (Q3_K_S, about 3.47 bits per weight) is roughly 34 GB by arithmetic, above the 24 GB top tier. Stock Ollama, llama.cpp, and LM Studio cannot load it; the official path needs vLLM with the vendor `aleph-alpha-inference` package. The trained context is 262,144 tokens; 1M is an extrapolation. It fails gates 3, 4, and 5 of the v2.3.0 admission record. Reopen conditions: BOTH a runtime condition (an official `ollama.com/library` tag, or Kolibri support merged into a released upstream llama.cpp) AND a size condition (a first-party Kolibri variant whose quantized weights plus KV cache at the tier's context fit 24 GB, or a raised top tier in `core/registry/recommended.json`). Meeting both reopens the acceptance bar; neither admits the model. Owner: the maintainer.

- **Archived record**: `docs/v2/v2.12/comparisons/v2.12.0-comparison-kolibri-1.md`

- **Why still owed**: Proposed for closure at v2.15.0 triage, not accepted by the owner (T010): Recorded with explicit reopen conditions and enforced by a guard test. The guard test reads the register entry, so the entry text must stay in place when closed.
- **Next step**: Accept or reject the proposed closure recorded in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md`.
- **Migrated from**: v2.12#DF-v212-1 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

- **Migrated from**: v2.15.0#DF-28 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#DF-28; still owed: Historical declined Kolibri adoption plus combined size/runtime reopen watch; seed guard and index.; next: Propose owner acceptance of closed-decline disposition, preserving exact original entry text, evidence and combined trigger. The original accepted task is to record/enforce the decline, not implement the model.

#### DF-149 - No catalog-wide check that every entry's declared size fits its tier; the Kolibri-1 decision keeps a per-model guard instead (decided at the seed plan's grill). - MIGRATED to v2.17.0

Source phase: v2.12.0 Phase 1. Plan reference: `docs/v2/v2.12/plans/v2.12.0-adoption-kolibri-1.md`, parked gaps. Owner: the maintainer. Next step: a plan that already edits `core/registry/catalog.json` measures how many current entries such a check would flag before adopting it. Measured in v2.14.0 Phase 5 over 41 entries ([script](../../../archives/v2/v2.14/development/evidence/measure-catalog-size-check.mjs)): a tier-default check flags 1 (`qwen3.5:4b` is a cpu agentic default yet declares `requiredVramGB` 4); a field-consistency check flags 9 (six `hideBelowVramGB` values below the declared need, several apparently deliberate for offload builds; two embedding models with `vramGB` 1 over `requiredVramGB` 0; `triposplat` with no `sizeGB`). Adoption stays an owner decision.

- **Archived record**: `docs/v2/v2.12/plans/v2.12.0-adoption-kolibri-1.md`

- **Why still owed**: The measurement is done; the owner's adopt-or-decline decision is not, and the measurement surfaced unresolved field inconsistencies.
- **Next step**: Owner decides from the v2.14 measurement: adopt the tier-default check after fixing the flagged entry, or record a decline.
- **Migrated from**: v2.12#DF-v212-2 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

- **Migrated from**: v2.15.0#DF-29 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#DF-29; still owed: Owner adoption decision for a catalog-wide invariant; v2.14 measurement found real exceptions.; next: Keep O06. Choose/justify the proposed invariant against the measured CPU/offload cases before adopting it. Do not impose a naive VRAM rule that breaks deliberate offload/default semantics.

#### DF-150 - No catalog field separates a vendor's trained context from its extrapolated maximum (comparison KOL-2). - MIGRATED to v2.17.0

Source phase: v2.12.0 Phase 1. Plan reference: `docs/v2/v2.12/plans/v2.12.0-adoption-kolibri-1.md`, parked gaps. Owner: the maintainer. Next step: reopen when a second model with an extrapolated context claim reaches review.

- **Archived record**: `docs/v2/v2.12/comparisons/v2.12.0-comparison-kolibri-1.md`

- **Why still owed**: A watch item with a trigger that only this entry and a plan carry; closing it would lose the watch.
- **Next step**: Move the trigger into model-acceptance.md as an open question, then close the entry against it.
- **Migrated from**: v2.12#DF-v212-3 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

- **Migrated from**: v2.15.0#DF-30 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#DF-30; still owed: Optional metadata watch whose trigger needs a durable living owner; seed KOL-2 scope.; next: Implement A15's living open-question transfer, then propose closure of this tracking entry against that exact retained trigger. Do not add a trained-context schema field before the second relevant model reaches review.

#### QG-19 - The completion checker's contract conflicts block every minor run here - MIGRATED to v2.17.0

- **Source phase**: v2.15.0 Phase 4 (2026-10-19), from the v2.14 run and the v2.15 run.
- **Plan reference**: v2.15.0 T015; [Nexus-Hub checker handoff](../../../archives/v2/v2.15/development/v2.15.0-nexus-hub-checker-handoff.md).
- **Reason**: the Nexus-Hub completion checker (v4.13.13, `completion_minor.py` sha256 `f1689e72b6f96835`) has contract conflicts that are not missing work in this repository and that this repository cannot fix: (1) `gaps.minor` reaches every ledger back to v0.7, and the 142 problems left in v0.7 and v1.0 to v1.3 can never parse, so `MINOR COMPLETE` is unreachable without a legacy cutoff; (2) `tests.evidence` rejects an honest count of pre-existing failures; (3) `release.changelog` expects `## [x.y.z]` while semantic-release writes `# [x.y.z](...)`; (4) a re-recorded run resets `start_head`, and a plan rename reads as tampering; (5) run-owned merged branches are kept as `recently-active`; (6) `record block` rejects a legitimate `approval-not-covered`; (7) a blocker-answer paste was not captured in the v2.14 run (it was captured in v2.15); (8) `minor_close.py archive` repairs Markdown links only; (9) record lookup from a linked worktree fails (`record block`, `migrate`); (10) `check-minor` hides predicate detail when blocked; (11) `check_handbooks.py` hashes working-copy CRLF bytes; (12) `validate_unicode_safety.py --fix` rewrites raw evidence; (13) small items (relative `load_ledgers` root, the approval page's gap and time wording); (14) `record answer --text` spends the round on a note; (15) the turn-end gate reads the plan from the main checkout and opens `no-progress` while a run waits on its own agents; (16) no tool migrates a gap from an older minor into the current one; (17) a task whose path a later phase deletes reads unmet after the merge, because the task-path log lacks `--full-history`. Each finding, with its evidence and a suggested fix, is in the handoff prompt.
- **Suggested next step**: give the handoff prompt to the agent maintaining Nexus-Hub, and record its answer (fixed, already fixed, or declined, with reasons) here; then re-run `check_plan_completion.py check-minor v2.15` and close the findings it resolves.

- **Migrated from**: v2.15.0#QG-11 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#QG-11; still owed: Required checker/record-contract qualification before declaring minor completion.; next: Keep plan T014/A19. Adopt only tested checker revisions, preserve historical pins and signed scope, rerun actual verdicts, and retain unresolved release mapping/absorbed-seed/legacy-scope/approval/evidence blockers. No fake release, arbitrary cutoff or signed JSON edit.

#### BG-8 - Automatic release preparation cannot push its version commit to protected main - MIGRATED to v2.17.0

- **Source phase**: v2.15.1 Phase 4 (T418), publication recovery observed on 2026-10-22; this defect was discovered after the frozen 262-identity triage approval.
- **Plan reference**: [Archive readiness, T418](../../../archives/v2/v2.15/plans/v2.15.1-archive-readiness.md#phase-4-integration-and-publication); [release recovery](../../../archives/v2/v2.15/development/v2.15.1-release-recovery.md).
- **Reason**: Automatic Semantic Release run 39814892000 selected v2.15.1 and prepared CHANGELOG.md, package.json and package-lock.json, but @semantic-release/git could not push its new commit to protected main: GH006 required ci-required validation that the newly generated commit did not have. The configured release commit also contains a skip-ci marker. The bounded current-release recovery prepares metadata through validated PRs and plans a human-attributed native annotated tag from the canonical checkout only after the exact main commit passes the installed release preconditions. That recovery is not a permanent repair of the automatic pipeline; no branch-protection bypass, status fabrication or relaxed gate is authorized.
- **Suggested next step**: Take the permanent release-architecture repair through separately reviewed workflow scope. Prove that prepared version commits receive the required protected-branch validation before an actual release/tag is created, reproduce the protected-main failure in an isolated fixture, and verify exactly one intended release with no direct-push or protection bypass. Preserve the existing CI events, permissions and required gates unless a separately authorized review changes them.
- **Evidence**: [Failure and bounded recovery](../../../archives/v2/v2.15/development/v2.15.1-release-recovery.md#failure), release run 39814892000; retained release-recovery packet and independently qualified native annotated-tag fixture. [Late automation proposal](../../../archives/v2/v2.15/development/v2.15.1-late-automation-proposal.md) records the separate OPEN follow-up. No permanent-fix result is claimed.
- **Placement basis**: Direct new future-version record subject to the separate owner-exception addendum. This is not an inherited or migrated member of the original 245-item disposition set.

#### BG-9 - Release notes extraction ignores configured double-hash changelog headings - MIGRATED to v2.17.0

- **Source phase**: v2.15.1 Phase 4 (T418), publication recovery observed on 2026-10-22; this defect was discovered after the frozen 262-identity triage approval.
- **Plan reference**: [Archive readiness, T418](../../../archives/v2/v2.15/plans/v2.15.1-archive-readiness.md#phase-4-integration-and-publication); [release recovery](../../../archives/v2/v2.15/development/v2.15.1-release-recovery.md).
- **Reason**: The tagged release workflow extracts notes only when a line begins with # [<version>], while the configured analyzer/notes/changelog preparation emitted ## [2.15.1](...) for the actual prepared patch. Running the existing AWK expression against that generated CHANGELOG emits no notes, even though the matching release section has content. The separately authorized current-release body repair must be verified against the actual semantic-release notes; it does not change or permanently fix the extractor. Prepared metadata and a repaired body do not by themselves prove tagged builds, assets or release readiness.
- **Suggested next step**: Make a separately reviewed narrow workflow repair that selects exactly the requested version at the configured changelog heading levels and stops at the next release section. Exercise single-hash and double-hash linked headings, matching and nonmatching versions, missing or duplicate sections, and empty notes; verify the resulting actual GitHub release body matches the intended semantic-release notes without changing workflow events, permissions, jobs or required gates.
- **Evidence**: [Extractor reproduction](../../../archives/v2/v2.15/development/v2.15.1-late-automation-proposal.md#extractor-reproduction) records the actual existing .github/workflows/release.yml expression producing no output from the prepared CHANGELOG.md v2.15.1 double-hash heading. Actual current-release body repair and its verification remain pending. No permanent-fix result is claimed.
- **Placement basis**: Direct new future-version record subject to the separate owner-exception addendum. This is not an inherited or migrated member of the original 245-item disposition set.

#### DF-151 - Bolt 74B-A9B not measured for the 24 GB MoE worker job - MIGRATED to v2.17.0

- **Source phase**: v2.16.0 Phase 1, T003 (planned follow-on record, not an implementation of the 24 GB trial).
- **Plan reference**: [v2.16.0 model trial](plans/v2.16.0-adoption-humanizer-handwired-nemotron-deepseek.md), T003.
- **Reason**: The seeding comparison records the official `nemotron-3.5-bolt:74b-a9b` artifact at 25 GB with vision, tools, and thinking. Its candidate seat is the 24 GB MoE worker job held by `nemotron-lightning:30b-a3b`. The reference host has 16 GB VRAM, so the required paired golden-task A/B cannot be measured here. No model admission or capability claim is made.
- **Owner**: Maintainer with a 24 GB host.
- **Suggested next step**: Run the v2.14-style A/B on a 24 GB host, recording RAM spill and the parser recovering tool calls. On a measured win, move the job and mark `nemotron-lightning:30b-a3b` a removal candidate.
- **Scope disposition**: The owner-approved plan deliberately records this follow-on; the full-run approval carries it forward without pretending the missing hardware trial ran. The plan's provisional DF-1 maps to DF-151 because inherited DF-1 already exists.

#### DF-152 - Full-decline delivery skips an installer rebuild - RESOLVED 2026-10-25

- **Source phase**: v2.16.0 Phase 1, T003 (conditional delivery disposition).
- **Plan reference**: [v2.16.0 model trial](plans/v2.16.0-adoption-humanizer-handwired-nemotron-deepseek.md), T003, T013, T025, T026.
- **Reason**: The owner's 2026-10-21 decision requires no tag and no installer rebuild when all E4B slots are declined; the records ride the next code release. T008 still lands the tested CPU runner option, so the decline branch includes evaluation tooling, not only documentation. This is an explicit conditional delivery rule, not evidence that an installer was rebuilt.
- **Owner**: Maintainer.
- **Suggested next step**: Close as not applicable if Phase 4 admits E4B and complete the required installer rebuild. On full decline, record that this delivery exception was applied; do not create a release merely to satisfy the generic completion checker.
- **Scope disposition**: The plan's provisional DF-2 maps to DF-152 because inherited DF-2 already exists. Preserve every inherited item and the owner's no-tag rule.

- **Resolution**: Applied the approved full-decline delivery exception: PR138 merged at b82b9747 with all 58 checks and all three post-merge workflows passing. No v2.16.0 release tag or installer release was created. Existing CI performed a current-version installer rehearsal; it did not admit E4B or change any default. [Integration evidence](development/v2.16.0-integration.json).

### Resolved

| ID | Title | Resolved in | Notes |
|---|---|---|---|

#### WN-22 - Node 24 golden CLI shutdown aborts on the reference Windows host - RESOLVED 2026-10-29

- **Source phase**: Pre-existing CLI/runtime boundary, observed during v2.16.0 Phase 3 verification.
- **Plan reference**: [v2.16.0 model trial](plans/v2.16.0-adoption-humanizer-handwired-nemotron-deepseek.md), T011; [Phase 3 evidence](development/v2.16.0-phase3-evidence.md).
- **Reason**: The controlled real CLI completes its golden task and forwards the expected options under Node 24.13.0, but both unchanged baseline options and num_gpu: 0 then abort at shutdown with exit 3221226505 and the UV_HANDLE_CLOSING libuv assertion. This is not caused by the new sampler key. The same spawned CLI and all six option cases pass under the installer's pinned Node 22.11.0. No Node 24 process-exit success is claimed.
- **Owner**: Maintainer, CLI/runtime compatibility.
- **Suggested next step**: Reproduce the baseline on Node 24 Windows, qualify native shutdown and active HTTP handle cleanup, and fix or narrow the supported runtime contract in separately reviewed scope. Preserve the Node 22 passing proof and the original Node 24 observations; do not hide the failed process exit.

- **Resolution**: The separately owner-approved natural-shutdown and metrics-finally repair passed twelve actual-file option cases and ten failure/drain cases on Node 22.11.0 and Node 24.13.0, plus a meaningful child-process regression and the fresh root coverage gate (6491 pass, 12 skip). Original failures remain preserved. Resolved in verified local source; closing integration is still pending. [Repair evidence](development/v2.16.0-cli-shutdown-repair.md).
