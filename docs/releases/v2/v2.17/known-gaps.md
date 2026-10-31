# Known Gaps - v2.17

**Project**: Nexus AI Studio
**Status**: in-progress
**Last updated**: 2026-10-31
**Open items**: 384

## v2.17.0

### Summary

| Category | Open | Resolved |
|---|---|---|
| Not implemented (NI) | 14 | 0 |
| Deferred (DF) | 264 | 0 |
| Bugs / regressions (BG) | 10 | 0 |
| Warnings (WN) | 25 | 0 |
| Missing tests / coverage gaps (MT) | 52 | 0 |
| Quality-gate gaps (QG) | 19 | 0 |

### Open Items

#### DF-1 - Tailwind v4 `@theme inline` is source-level, not compiled

- **Source phase**: Phase 1 - Motion Foundation (A4-foundation)
- **Plan reference**: `docs/archive/v1/v1.17/plans/v1.17.0-adoption-ui-motion-identity.md` (sub-task 1.1)
- **Reason**: Motion tokens live in `:root` and are aliased in an `@theme inline` block in `desktop/src/styles/tokens.css`, matching the plan's Tailwind mapping. The desktop Vite pipeline still does not run Tailwind (pre-existing v1.0 gap: tokens are consumed as `var(--token)`). Browsers ignore the unknown `@theme` at-rule. The tokens therefore resolve in the shell as CSS custom properties, which is how every other token already works.
- **Suggested next step**: When a later cycle wires Tailwind v4 into `desktop/`, the existing `@theme inline` motion aliases should emit utilities with no second palette. Do not add `tailwindcss` in this plan (no new frontend dependency).

- **Migrated from**: v1.17.0#DF-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v1.17.0#DF-1; still owed: Optional candidate/watch; next: Carry the compilation boundary. Establish an actual required utility consumer before adding Tailwind; do not call the source aliases compiled.

- **Migrated from**: v2.16#DF-1 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-2 - Installer motion is not on the shared desktop hook

- **Source phase**: Phase 1 - Motion Foundation (A4-foundation)
- **Plan reference**: `docs/archive/v1/v1.17/plans/v1.17.0-adoption-ui-motion-identity.md` (Overview: shell-only cycle)
- **Reason**: This cycle is desktop-shell-only. The PyQt installer constellation and floating logo still use their own reduced-motion checks. Desktop centralization does not change installer behavior.
- **Suggested next step**: If a later installer pass wants one reduced-motion story across app and installer, port the same halt-not-slow contract; do not share the React hook.

- **Migrated from**: v1.17.0#DF-3 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v1.17.0#DF-3; still owed: Optional candidate/watch; next: Carry pending V9 plus review of the separate floating-logo path. React-hook reuse across PyQt is not an acceptance requirement; document halt parity if proved.

- **Migrated from**: v2.16#DF-2 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-3 - Chat pending is a batch wait, not live token streaming

- **Source phase**: Phase 2 - Agent-state orbs (A1)
- **Plan reference**: `docs/archive/v1/v1.17/plans/v1.17.0-adoption-ui-motion-identity.md` (sub-task 2.3: "where `isStreaming` is signalled")
- **Reason**: `ChatPage` still waits for the full `sendMessage` event batch, then patches the assistant bubble. There is no per-token `isStreaming` flag. Phase 2 treats `pending: true` + `activity: "chat-streaming"` as the streaming signal so the composing orb appears for the whole wait. Phase 3 drives the composer traveling beam from the same `pending` flag.
- **Suggested next step**: If a later cycle streams tokens into the bubble, keep the same activity until the `done` event and then clear `pending` (the traveling beam follows).

- **Migrated from**: v1.17.0#DF-6 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v1.17.0#DF-6; still owed: Required implementation/qualification; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede to v2.2.3#DF-21, preserving true incremental token delivery, cancellation, pending state, and transcript persistence obligations. The original motion cycle allowed batch pending; the later typed transport obligation is kept accountable at its later exact identity, not retroactively claimed implemented here.

- **Migrated from**: v2.16#DF-3 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-4 - On-device multi-effect GPU/battery cost is not proven here

- **Source phase**: Phase 5 - Motion coordination + polish (A4-completion)
- **Plan reference**: `docs/archive/v1/v1.17/plans/v1.17.0-adoption-ui-motion-identity.md` (sub-task 5.2)
- **Reason**: jsdom cannot create a WebGL context or measure GPU frame time. Unit tests prove offscreen pause, the instance cap of 3, `document.hidden` pause on metal, and one-motion gating. Live Tauri frame cost with a streaming composer, idle dock, and visible hero control is not proven here. Phase 6 did not capture an on-device trace either.
- **Suggested next step**: Operator visual pass in the Tauri shell during release QA. Record fps / battery if a regression is visible; do not treat absence of a local GPU trace as a pass.

- **Migrated from**: v1.17.0#DF-8 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v1.17.0#DF-8; still owed: Required qualification; next: Carry hardware observation. Run packaged multi-effect frame/battery QA; record host, effects, trace, and result.

- **Migrated from**: v2.16#DF-4 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-5 - gigatoken remains a watch item (N5)

- **Source phase**: Phase 6 - Architecture refactor, known-gaps, CI/CD
- **Plan reference**: `docs/archive/v1/v1.17/plans/v1.17.0-adoption-ui-motion-identity.md` (sub-task 6.2; comparison N5)
- **Reason**: gigatoken is Python-only against Nexus's JS `tiktoken` per-request path, targets a bulk corpus workload Nexus does not have, and has incomplete Windows testing against a Windows-first product with an OS-parity principle. N4 (tiktoken replacement) stays rejected. N5 is the hypothetical Python-side bulk-tokenization need; no such workload exists in the diffusion/ASR/TTS Python runtimes today.
- **Suggested next step**: Revisit only if a genuine Python-side bulk-tokenization need emerges AND gigatoken's Windows/ARM support matures. Do not add a Python tokenizer dependency on speculation.

- **Migrated from**: v1.17.0#DF-9 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v1.17.0#DF-9; still owed: Optional candidate/watch; next: Carry watch decision with those exact reopen conditions, or explicitly close the proposal as unnecessary; do not install a tokenizer to satisfy bookkeeping.

- **Migrated from**: v2.16#DF-5 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-6 - Shared text-only ChatInput is not mounted by ChatPage

- **Source phase**: Phase 6 - Architecture refactor, known-gaps, CI/CD
- **Plan reference**: `docs/archive/v1/v1.17/plans/v1.17.0-adoption-ui-motion-identity.md` (sub-task 6.1)
- **Reason**: ChatPage uses `MediaComposer` (attachments + streaming beam + metal Generate/Send). `ChatInput` still carries the Phase 4 metal ring and is unit-tested (`sharedChat.test.tsx`). It is the text-only twin, not a dead loader. Header now says RETAINED, NOT DEAD.
- **Suggested next step**: Delete only if the text-only send contract is retired. Do not metal a second composer on ChatPage.

- **Migrated from**: v1.17.0#DF-10 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v1.17.0#DF-10; still owed: Owner decision; next: Prove resolved as a retained-component decision with V9; preserve text-only contract rather than deleting it as dead code.

- **Migrated from**: v2.16#DF-6 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-7 - Live llama-server round-trip is not proven here

- **Source phase**: Phase 1 - Skill-native adoptions + llama.cpp recipe (LG-A5)
- **Plan reference**: `docs/archive/v1/v1.18/plans/v1.18.0-adoption-agent-harness-and-governance.md` (sub-task 1.2)
- **Reason**: The recipe, example manifest, and `validateLocalAdapterManifest` tests are in-repo. A live `GET /v1/models` plus a Nexus chat against a user-started llama-server was not run on this host. Support tier for that path is `internal-compatible` (not_observed != absent). Same class as v1.16 LSO.P5.A (macOS MLX smoke).
- **Suggested next step**: On a machine with llama.cpp installed, start llama-server on `127.0.0.1`, register the example manifest, set `nexus.llm.backend` to `llamacpp`, and record the smoke. Do not bundle the runtime.

- **Migrated from**: v1.18.0#DF-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v1.18.0#DF-1; still owed: Required implementation/qualification; next: Carry live-serving hold. Start a supported user-managed localhost server, register manifest, perform Nexus chat, and retain dated receipts.

- **Migrated from**: v2.16#DF-7 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-8 - Hub catalog presence is not CI-gated

- **Source phase**: Phase 1 - Skill-native adoptions (OW-B1, OI-A4-web)
- **Plan reference**: `docs/archive/v1/v1.18/plans/v1.18.0-adoption-agent-harness-and-governance.md` (sub-task 1.1)
- **Reason**: CI does not ship `~/.nexus-ai/catalog/`. The Phase 1 test asserts the mapping note and that `modules/coding/skills/catalog/` has no duplicate `agent-presets` / `browser-testing-with-devtools` / `morning-briefing` entries. Live Hub files were confirmed on the operator machine during implementation, not in CI.
- **Suggested next step**: Keep the builtin-catalog negative check. An optional operator step is `nexus skills sync` then list those two skills under `~/.nexus-ai/catalog/skills/`. Do not vendor Hub skills into this repo.

- **Migrated from**: v1.18.0#DF-2 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v1.18.0#DF-2; still owed: Historical limitation; next: Carry operator presence check: sync/list the named skills in the installed catalog, record version/root, and retain builtin negative check. Do not vendor Hub skill copies.

- **Migrated from**: v2.16#DF-8 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-9 - Deeper scaffold knobs remain off `HarnessProfile` (EM.P1.C remainder)

- **Source phase**: Phase 2 - Named per-family harness profiles (OI-A2)
- **Plan reference**: `docs/archive/v1/v1.18/plans/v1.18.0-adoption-agent-harness-and-governance.md` (sub-task 2.2); v1.12 EM.P1.C
- **Reason**: Named family profiles (`concise-loop`, `plan-first`, `structured-edit`, `minimal`) now exist as data and drive the three existing `PromptContext` knobs. Tool-exposure verbosity and retry / step granularity are still described in `docs/reference/low-cost-model-optimization.md` and are not fields on `HarnessProfile` / `PromptContext`.
- **Suggested next step**: After a live weak-model A/B (EM.P1.B), extend `PromptContext` only if the A/B shows those knobs move quality. Do not add a fourth prompt style without a `PromptBuilder` change.

- **Migrated from**: v1.18.0#DF-5 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v1.18.0#DF-5; still owed: Optional candidate/watch; next: Carry conditional implementation until live weak-model A/B demonstrates useful knobs; then add named fields and behavioral tests.

- **Migrated from**: v2.16#DF-9 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-10 - `gemma4:26b` MoE copy has no published active/total counts

- **Source phase**: Phase 3 - Catalog schema (LG-A3)
- **Plan reference**: `docs/archive/v1/v1.18/plans/v1.18.0-adoption-agent-harness-and-governance.md` (sub-task 3.1)
- **Reason**: The 26B entry describes MoE routing. No in-repo published active-parameter count was available, so `activeParams` / `totalParams` stay omitted (dense-schema default). MoE numbers are populated only on `deepseek-coder-v2:16b` (2.4B active / 16B total, already in that entry's copy).
- **Suggested next step**: When Google publishes a stable active-parameter figure for Gemma 4 26B, add both MoE fields together. Do not guess.

- **Migrated from**: v1.18.0#DF-7 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v1.18.0#DF-7; still owed: Optional candidate/watch; next: Carry external metadata hold. Add both fields only from a stable publisher figure with cited provenance.

- **Migrated from**: v2.16#DF-10 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-11 - ACP is HTTP JSON-RPC on the shared listener, not a stdio subprocess

- **Source phase**: Phase 5 - ACP agent surface (OI-A3)
- **Plan reference**: `docs/archive/v1/v1.18/plans/v1.18.0-adoption-agent-harness-and-governance.md` (sub-task 5.1 / 5.2)
- **Reason**: The open ACP spec commonly uses stdio. This cycle mounts JSON-RPC 2.0 at `POST /acp` on the v1.16 serving `LoopbackHttpServer` so there is one loopback bind and one bearer token (`nexus.serving.token`). `session/update` notifications are returned on `session/prompt` as `updates[]`, and also flushed as SSE when the client sends `Accept: text/event-stream`.
- **Suggested next step**: If an editor requires stdio ACP, add a thin stdio bridge that forwards to `POST /acp` rather than a second agent engine. Do not vendor Open Interpreter.

- **Migrated from**: v1.18.0#DF-10 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v1.18.0#DF-10; still owed: Optional candidate/watch; next: Carry optional stdio-bridge proposal until a concrete consuming editor requires it; if implemented, bridge to the existing authenticated engine.

- **Migrated from**: v2.16#DF-11 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-12 - Windows sandbox does not kernel-enforce filesystem or network

- **Source phase**: Phase 6 - OS process sandbox (OI-A1)
- **Plan reference**: `docs/archive/v1/v1.18/plans/v1.18.0-adoption-agent-harness-and-governance.md` (sub-task 6.4)
- **Reason**: Job objects plus a best-effort restricted token do confine process lifetime and resource caps. They do not implement a filesystem or network allow-list comparable to Seatbelt or Landlock. AppContainer was not applied (capability SIDs break typical coding CLIs). Mode on Windows is therefore `partial`, never `confined`. Writable-root and network-deny policy stay tool-layer (denylists, confirmation) on this OS. Matrix: `modules/coding/sandbox/windowsMatrix.ts`.
- **Suggested next step**: Revisit AppContainer or an equivalent FS/network restriction only if a coding-CLI-compatible capability set is proven. Do not report Windows as confined until filesystem and network are actually enforced.

- **Migrated from**: v1.18.0#DF-11 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v1.18.0#DF-11; still owed: Historical limitation; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede to v2.4.1#DF-7, preserving both security dimensions and the requirement for coding-CLI-compatible OS enforcement before changing the support claim. Partial is the honest current support tier. Kernel enforcement is required before any confined claim, not proof that the original partial-support decision was invalid.

- **Migrated from**: v2.16#DF-12 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-13 - Laguna-S-2.1 catalog entry stays gated (LG-A1)

- **Source phase**: Phase 7 - Known-gaps reconciliation (gated this cycle)
- **Plan reference**: `docs/archive/v1/v1.18/plans/v1.18.0-adoption-agent-harness-and-governance.md` (Deferred and Gated Items)
- **Reason**: EM.P3 (`extremeLowBit.ts` fail-closed at `999.0.0`) and EM.P4 (`patientTier.ts` disabled) stay closed. Phase 3 prepared schema and UD-label recognition only. No Laguna catalog row, and no independent benchmark.
- **Suggested next step**: After those gates open and a benchmark exists, add the entry in a serving-oriented cycle. Do not guess quant or VRAM numbers.

- **Migrated from**: v1.18.0#DF-12 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v1.18.0#DF-12; still owed: Optional candidate/watch; next: Carry model gate until the named low-bit/patient-tier gates and independent local benchmark are proven.

- **Migrated from**: v2.16#DF-13 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-14 - 1M-context budget policy is not built (LG-A4)

- **Source phase**: Phase 7 - Known-gaps reconciliation (gated this cycle)
- **Plan reference**: `docs/archive/v1/v1.18/plans/v1.18.0-adoption-agent-harness-and-governance.md` (Deferred and Gated Items)
- **Reason**: Depends on LG-A1. No context-window budget policy landed.
- **Suggested next step**: After LG-A1 ships, add a 1M-context budget policy in the same serving/catalog cycle. Do not add a dummy window size.

- **Migrated from**: v1.18.0#DF-13 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v1.18.0#DF-13; still owed: Optional candidate/watch; next: Carry dependent 1M-context policy proposal; name the model/runtime gate and prove usable budget behavior before advertising it.

- **Migrated from**: v2.16#DF-14 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-15 - Native-app computer-use driver is not built (OI-A4-native)

- **Source phase**: Phase 7 - Known-gaps reconciliation (gated this cycle)
- **Plan reference**: `docs/archive/v1/v1.18/plans/v1.18.0-adoption-agent-harness-and-governance.md` (Deferred and Gated Items)
- **Reason**: High effort, new local capability. Browser-half is skill-native (`browser-testing-with-devtools`). Native driver must be internal (no `trycua`), permission-tiered, and confirmation-gated.
- **Suggested next step**: A later cycle after the Hub browser-QA skill has proven the workflow. Do not vendor Open Interpreter or CUA runtimes.

- **Migrated from**: v1.18.0#DF-14 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v1.18.0#DF-14; still owed: Optional candidate/watch; next: Implement through a dedicated bounded native-driver plan, or retain an explicit conditional product decision. Browser tooling does not prove native support.

- **Migrated from**: v2.16#DF-15 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-16 - Harness selector shipped default stays off (EM.P1.B)

- **Source phase**: Phase 2 - Live harness activation; recorded in Phase 7
- **Plan reference**: `docs/archive/v1/v1.18/plans/v1.18.0-adoption-agent-harness-and-governance.md` (sub-task 2.1); v1.12 EM.P1.B
- **Reason**: `HARNESS_SELECTOR_SHIPPED_DEFAULT` remains `false`. No live weak-model A/B was run, so the no-degradation gate does not flip `nexus.coding.harnessSelector.enabled`.
- **Suggested next step**: Run `runHarnessAb` on a weak local model with the live driver; flip the default only on a measured net win.

- **Migrated from**: v1.18.0#DF-15 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v1.18.0#DF-15; still owed: Optional candidate/watch; next: Carry live no-degradation hold. Run the live weak-model golden split before changing default; record pass rate, duration, model, and driver. Default-off is deliberate. A live A/B is a prerequisite for a future default-on decision; do not infer enabling is mandatory merely to close a watch item.

- **Migrated from**: v2.16#DF-16 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-17 - LFM is pulled through Ollama's hf.co bridge, not the Hugging Face weights puller

- **Source phase**: Phase 1 - Catalog entry (A1 sourcing)
- **Plan reference**: `docs/archive/v1/v1.19/plans/v1.19.0-adoption-liquid-lfm-agentic.md` (sub-task 1.1)
- **Reason**: The official Ollama library does not carry LFM2.5-2.6B. The installer LLM path is Ollama; an HF-protocol GGUF would land under `~/.nexus/models/weights/<id>/` and would not run in Coding/Chat. Shipped `source.protocol` is `ollama` with `ollama://hf.co/LiquidAI/LFM2.5-2.6B-GGUF:Q4_K_M`. `weights.files[]` still records the real SHA-256 so invariants can require a non-placeholder pin. Community Ollama tags were rejected.
- **Suggested next step**: Do not switch this entry to `protocol: "huggingface"` unless an Ollama import path exists. If Liquid publishes an official Ollama library tag, re-point `source.url` and keep the pin.

- **Migrated from**: v1.19.0#DF-2 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v1.19.0#DF-2; still owed: Owner decision; next: Carry accepted sourcing boundary, or explicitly close alternative-puller proposal. An HF weights download alone is not Ollama serving; preserve digest/source invariants.

- **Migrated from**: v2.16#DF-17 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-18 - Catalog `origin` is the country `USA`, not the publisher name Liquid AI

- **Source phase**: Phase 1 - Catalog entry metadata
- **Plan reference**: `docs/archive/v1/v1.19/plans/v1.19.0-adoption-liquid-lfm-agentic.md` (sub-task 1.1)
- **Reason**: `origin` is a country (or "Community") chip. Publisher color comes from `family` `lfm2.5` -> `Liquid AI` in the installer constants map. Display name and description name Liquid AI.
- **Suggested next step**: Leave the schema as country. Do not overload `origin` with a vendor name.

- **Migrated from**: v1.19.0#DF-3 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v1.19.0#DF-3; still owed: Historical limitation; next: Prove resolved as documented schema semantics using existing catalog/installer metadata tests; do not change origin to publisher text.

- **Migrated from**: v2.16#DF-18 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-19 - LFM2.5-8B-A1B catalog row declined this cycle (win not demonstrated)

- **Source phase**: Phase 3 - 8B-A1B bake-off (A2)
- **Plan reference**: `docs/archive/v1/v1.19/plans/v1.19.0-adoption-liquid-lfm-agentic.md` (sub-task 3.1)
- **Reason**: Pre-committed rule requires a measured golden-task quality/GB win against `qwen2.5-coder:14b` and `deepseek-coder-v2:16b`. That three-model local run was not completed (8B-A1B GGUF not pulled; DeepSeek 16B not installed). `not_observed != absent`. No catalog row. Record: [development/2026-08-18_lfm25-8b-a1b-bake-off.md](../../../archive/v1/v1.19/development/2026-08-18_lfm25-8b-a1b-bake-off.md).
- **Suggested next step**: Re-open only with a dated pass_rate/vramGB table for all three local GGUFs on the same golden split. Do not add the row on vendor blog numbers.

- **Migrated from**: v1.19.0#DF-7 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v1.19.0#DF-7; still owed: Owner decision; next: Carry explicit 8B-A1B decline/watch. Reopen only with its original dated same-split three-model quality/VRAM table.

- **Migrated from**: v2.16#DF-19 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-20 - LFM2.5-VL (and other VL siblings) stay off the catalog

- **Source phase**: Phase 3 - P3 watchlist
- **Plan reference**: `docs/archive/v1/v1.19/plans/v1.19.0-adoption-liquid-lfm-agentic.md` (sub-task 3.2)
- **Reason**: Image Studio already has a multimodal path. A second VL family is catalog expansion, not the low-VRAM agentic gap this cycle closed.
- **Suggested next step**: Revisit under a vision-catalog plan (v1.19.2 modality schema or a later Image Studio cycle). Do not add a VL row from this watchlist alone.

- **Migrated from**: v1.19.0#DF-8 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v1.19.0#DF-8; still owed: Optional candidate/watch; next: Carry vision-catalog proposal with measured uncovered job requirement; no automatic catalog expansion.

- **Migrated from**: v2.16#DF-20 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-21 - Liquid PII-extract Nano is not wired into redactSecrets

- **Source phase**: Phase 3 - P3 watchlist
- **Plan reference**: `docs/archive/v1/v1.19/plans/v1.19.0-adoption-liquid-lfm-agentic.md` (sub-task 3.2)
- **Reason**: Task-specific Nano. Nexus already has `redactSecrets` / env scrubbing. No weights bundled (N2).
- **Suggested next step**: If a later observability cycle wants a local PII model as an aid to those scrubbers, evaluate it as an optional local tool, not a default catalog row.

- **Migrated from**: v1.19.0#DF-9 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v1.19.0#DF-9; still owed: Optional candidate/watch; next: Carry optional-model decision; evaluate false negatives and local runtime fit before integration.

- **Migrated from**: v2.16#DF-21 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-22 - 128K context is GGUF metadata plus a short-prompt generate, not a full-length fill

- **Source phase**: Phase 2 - context probe; recorded Phase 4
- **Plan reference**: `docs/archive/v1/v1.19/plans/v1.19.0-adoption-liquid-lfm-agentic.md` (sub-task 2.1)
- **Reason**: Local `api/show` reports `lfm2.context_length: 128000`. Generates with `num_ctx=40960` and `num_ctx=131072` succeeded on a short prompt. A 128K-token fill was not run. Catalog `contextWindow` is 128000.
- **Suggested next step**: Optionally probe a long fill on a machine that can hold KV at 128K. Do not lower the catalog figure without a failed generate.

- **Migrated from**: v1.19.0#DF-10 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v1.19.0#DF-10; still owed: Historical limitation; next: Carry full-fill proof gap. Run a dated long-context fill on adequate hardware; do not claim short-prompt success proves 128K occupancy.

- **Migrated from**: v2.16#DF-22 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-23 - Vendor LFM benchmarks must not appear in catalog copy until corroborated

- **Source phase**: Phase 1 - card copy; standing rule, recorded Phase 4
- **Plan reference**: `docs/archive/v1/v1.19/plans/v1.19.0-adoption-liquid-lfm-agentic.md` (Overview; Section 9)
- **Reason**: ToolSandbox / BFCLv4 / tok/s figures are vendor-reported. Installer invariants already reject those tokens in `whyRecommended`. No independent local score exists for 2.6B or 8B-A1B.
- **Suggested next step**: Cite a number in card copy only after a dated local or independently published reproduction. The 8B-A1B bake-off rule (DF-7) is the same bar.

- **Migrated from**: v1.19.0#DF-11 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v1.19.0#DF-11; still owed: Historical limitation; next: Carry standing invariant or explicitly close as policy rather than unfinished implementation; preserve the invariant tests and evidence bar.

- **Migrated from**: v2.16#DF-23 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-24 - Hub skill edits are authored but not yet merged or synced

- **Source phase**: Phase 1 - Skill-native wins (1.1-1.3)
- **Plan reference**: `docs/archive/v1/v1.19/plans/v1.19.1-adoption-agent-loop-and-guardrail-hardening.md` (sub-tasks 1.1-1.3, 1.5)
- **Reason**: Grounded-citation, persona-card, avatar-prep, and transcript-reasoning prose landed on Nexus-Hub branch `feat/v1.19.1-skill-native-wins` (commit `451e508f`) and passed `validate_skills.py --quality`. They are not on Hub `develop` / `main` and are not yet in a `nexus skills sync` catalog. CI in this repository cannot see Hub skill bodies; it asserts the Nexus-AI mapping note and the no-duplicate builtin check.
- **Suggested next step**: Merge the Hub branch, then `nexus skills sync --apply` so `~/.nexus-ai/catalog/skills/` carries the new sections. Do not vendor copies under `modules/coding/skills/catalog/`.

- **Migrated from**: v1.19.1#DF-2 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v1.19.1#DF-2; still owed: Required implementation/qualification; next: Carry external verification: establish merge ancestry, released version, and installed catalog bodies without vendoring copies.

- **Migrated from**: v2.16#DF-24 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-25 - Pass-state one-shot nudge means the no-action budget rarely trips in production

- **Source phase**: Phase 2 - Unified loop guards (2.2)
- **Plan reference**: `docs/archive/v1/v1.19/plans/v1.19.1-adoption-agent-loop-and-guardrail-hardening.md` (sub-task 2.2)
- **Reason**: AgentLoop records a no-action on the pass-state gate continue path. `_gateNudgeIssued` still fires only once, so a live run typically gets one nudge and then proceeds rather than three consecutive no-action turns. Unit tests trip the guard by setting `noActionBudget: 1`. Production default remains 3.
- **Suggested next step**: If live auto-mode "thinking loops" still burn iterations, count every no-tool turn (not only the gated continue) toward the budget, or lower the default after a dated measurement.

- **Migrated from**: v1.19.1#DF-4 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v1.19.1#DF-4; still owed: Optional candidate/watch; next: Implement counting every applicable no-tool turn, or retain measured decision. Add a production-default multi-turn regression proving the actual budget can trip. Original rule is conditional on measured live thinking-loop waste. Proposed production guard change needs explicit implementation acceptance and a default-budget regression, not a silent change in this no-production-edit triage phase.

- **Migrated from**: v2.16#DF-25 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-26 - Hermes harness A/B is fixture-only; no live Hermes generate this cycle

- **Source phase**: Phase 1 - Hermes harness profiles (1.5)
- **Plan reference**: `docs/archive/v1/v1.19/plans/v1.19.2-adoption-catalog-and-model-expansion.md` (sub-task 1.5)
- **Reason**: `HarnessSelectorAb` measures `hermes-agentic` as the panel arm on a golden split with a fixture rollout that scores `llama3-json` overlays as passes. A live `hermes3:8b` Ollama generate was not run on this host. Same posture as the LFM fixture A/B: `not_observed != absent`.
- **Suggested next step**: Re-run `runHarnessAb` against a pulled `hermes3:8b` on the same golden split and record pass_rate / duration. Do not claim a hosted eval.

- **Migrated from**: v1.19.2#DF-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v1.19.2#DF-1; still owed: Required implementation/qualification; next: Carry live Hermes golden-split measurement, recording actual local generates and timing rather than fixture scores.

- **Migrated from**: v2.16#DF-26 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-27 - Inkling-Small GGUF is catalogued text-only; native multimodal is unverified at this quant

- **Source phase**: Phase 1 - Inkling-Small patient-tier entry (1.6)
- **Plan reference**: `docs/archive/v1/v1.19/plans/v1.19.2-adoption-catalog-and-model-expansion.md` (sub-task 1.6)
- **Reason**: The native Inkling-Small checkpoint is text+image+audio. The curated GGUF (`unsloth/Inkling-Small-GGUF`, UD-IQ1_S, three shards) has no verified llama.cpp multimodal projector at implementation time. The row ships `modalities: ["text"]` with copy that names the gap. Adding image/audio would over-claim.
- **Suggested next step**: If a later llama.cpp / GGUF line grows a working projector, add those modalities only after a dated local load of an image and an audio clip. Keep the row out of `recommended.json`.

- **Migrated from**: v1.19.2#DF-2 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v1.19.2#DF-2; still owed: Optional candidate/watch; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede to v2.0.0#DF-13, preserving image and audio local-load proof before enabling modalities.

- **Migrated from**: v2.16#DF-27 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-28 - Patient-tier determinism assertion skips when no offload adapter is registered

- **Source phase**: Phase 1 - RAM-budget presets + determinism (1.7)
- **Plan reference**: `docs/archive/v1/v1.19/plans/v1.19.2-adoption-catalog-and-model-expansion.md` (sub-task 1.7)
- **Reason**: `runDeterminismAcrossBudget` is skip-if-absent (`NEXUS_PATIENT_TIER_ADAPTER` unset, or no injected `generate`). Nexus does not bundle the llama.cpp flash-MoE offload runtime; presets are copy only. CI therefore never proves byte-identical output on a real trillion-class MoE.
- **Suggested next step**: On a host with a registered adapter, run the two default budgets and keep the dated identical/mismatch record. Do not imply Nexus ships the offload runtime.

- **Migrated from**: v1.19.2#DF-4 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v1.19.2#DF-4; still owed: Required qualification; next: Carry adapter/hardware hold. Compare actual outputs at both budgets and retain dated identical/mismatch record.

- **Migrated from**: v2.16#DF-28 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-29 - A4 Docling layout engine deferred; OCR on-device QA incomplete

- **Source phase**: Phase 4 - Layout bake-off (4.1 / 4.2)
- **Plan reference**: `docs/archive/v1/v1.20/plans/v1.20.0-adoption-docling.md` (Phase 4); note `docs/archive/v1/v1.20/development/ocr-layout-bakeoff-2026-08.md`
- **Reason**: Decision is DEFER, not DECLINE and not DEFER-BUILD. RapidOCR default ONNX models were smoked on synthetic fixtures (wall-of-text tables). Nexus catalog RapidOCR is still blocked by placeholder SHA (LSO.P3.A / IRSC.P4.B). Unlimited-OCR was not run (torch absent in the probe interpreter despite an RTX 3080 Ti). Docling was not installed.
- **Suggested next step**: After catalog RapidOCR can install, and with torch in the Nexus OCR/diffusion venv, parse a real table PDF and a scan with RapidOCR vs Unlimited-OCR. Only then consider a local-only `docling-slim` extra. Do not merge torch into `runtimes/ocr/requirements.txt`.

- **Migrated from**: v1.20.0#DF-5 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v1.20.0#DF-5; still owed: Required qualification; optional candidate/watch for Docling; next: Carry installed-runtime and evidence prerequisites; prove real PDF/scan RapidOCR versus Unlimited-OCR, then explicitly decide optional Docling. Keep current OCR qualification and installable pinned weights as B-OCR-QUAL. Docling remains the separately deferred optional model/runtime decision, not automatically accepted by this proposal.

- **Migrated from**: v2.16#DF-29 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-30 - `runtimes/ocr/` not renamed to `runtimes/documents/`

- **Source phase**: Phase 5 - Architecture refactor (5.1)
- **Plan reference**: `docs/archive/v1/v1.20/plans/v1.20.0-adoption-docling.md` (sub-task 5.1)
- **Reason**: Office engines live under the OCR runtime, but renaming would touch CI, sidecar spawn paths, installer comments, tests, and every import in one change. The seam `core/documents` is already vscode-free and correctly named. A rename without a simultaneous reference sweep would break `test-python-runtimes`.
- **Suggested next step**: If a later cycle renames, do it as one commit that updates `runtimes/ocr/**`, `tests/python/ocr/**`, `.github/workflows/ci.yml`, sidecar runtime factory paths, and installer comments together.

- **Migrated from**: v1.20.0#DF-6 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v1.20.0#DF-6; still owed: Optional candidate/watch; next: Carry optional rename decision. If accepted, do an atomic runtime/test/CI/spawn/reference sweep; folder naming is not missing document parsing.

- **Migrated from**: v2.16#DF-30 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-31 - Native audio-token reasoning is not wired

- **Source phase**: Phase 1 - Audio attachment + transcribe-then-chat (1.2)
- **Plan reference**: `docs/archive/v2/v2.0/plans/v2.0.0-adoption-governed-autonomy-multimodal.md` (sub-task 1.2)
- **Reason**: The plan keeps native audio-token reasoning out of scope until a fitting local model exists. Transcribe-then-chat is the only audio path. Catalog `modalities` including `audio` only changes the composer tooltip.
- **Suggested next step**: When a local model that accepts audio tokens is catalogued, route clips as native audio instead of (or in addition to) labelled transcripts.

- **Migrated from**: v2.0.0#DF-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.0.0#DF-1; still owed: Optional candidate/watch; next: Carry model-dependent proposal. Prove model and serving audio input contract before routing native clips.

- **Migrated from**: v2.16#DF-31 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-32 - Playwright is an optional local install, not a lockfile pin

- **Source phase**: Phase 2 - Browser tool family (2.2)
- **Plan reference**: `docs/archive/v2/v2.0/plans/v2.0.0-adoption-governed-autonomy-multimodal.md` (sub-task 2.2)
- **Reason**: Adding Playwright to `package.json` would make `npm ci` in CI download Chromium. Tests use `InMemoryBrowser` and a fake loader. The documented pin is Playwright 1.55.x via `npx playwright@1.55.0 install chromium`.
- **Suggested next step**: If a nightly job can cache browsers, add `playwright` as an optionalDependency with that pin and keep CI on InMemory.

- **Migrated from**: v2.0.0#DF-6 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.0.0#DF-6; still owed: Optional candidate/watch; next: Carry optional local-browser install boundary. An actual nightly requirement must specify cached pinned browser and skip behavior before changing CI.

- **Migrated from**: v2.16#DF-32 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-33 - LongCat Avatar DiT inference is not vendored

- **Source phase**: Phase 3 - audio2video avatar mode (3.2)
- **Plan reference**: `docs/archive/v2/v2.0/plans/v2.0.0-adoption-governed-autonomy-multimodal.md` (sub-task 3.2)
- **Reason**: The required byte-level scan of an imported LongCat inference tree found no tree to import. Shipping un-scanned upstream `.py` would violate the precondition. CI and the adapter run the existing stub executor. Official INT8 shards are sha256-pinned in the catalog for a later scanned import.
- **Suggested next step**: Scan `meituan-longcat/LongCat-Video` (bucket-3 strip), then wire the INT8 loader behind `longcat_avatar.preflight` on a diffusion-pro host. Record GPU evidence; do not treat the stub as a live talking-head.

- **Migrated from**: v2.0.0#DF-8 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.0.0#DF-8; still owed: Required implementation/qualification; next: Implement scanned local inference loader in a dedicated runtime task, then prove real talking-head bytes on eligible GPU; no stub-as-live claim.

- **Migrated from**: v2.16#DF-33 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-34 - Continuation seam quality is unmeasured

- **Source phase**: Phase 3 - video continuation (3.1)
- **Plan reference**: `docs/archive/v2/v2.0/plans/v2.0.0-adoption-governed-autonomy-multimodal.md` (sub-task 3.1)
- **Reason**: Chaining UX and `continueFrom` payloads ship. No Wan 2.2 GPU run measured temporal seams between segments. Extra field `seamQuality` is `prototype-unmeasured`.
- **Suggested next step**: On a host with Wan 2.2 weights, generate a 3-segment clip and document visible seam artefacts before calling continuation production-quality.

- **Migrated from**: v2.0.0#DF-9 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.0.0#DF-9; still owed: Required qualification; next: Carry GPU quality hold. Generate three segments, retain outputs and measured/observed seam report.

- **Migrated from**: v2.16#DF-34 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-35 - Code-as-action sandbox and Query DSL are not built

- **Source phase**: Phase 4 - Code-as-action sandbox + Query DSL (4.3)
- **Plan reference**: `docs/archive/v2/v2.0/plans/v2.0.0-adoption-governed-autonomy-multimodal.md` (sub-task 4.3)
- **Reason**: `core/project/codeAsAction.ts` is a fail-closed kernel (opt-in, no fs, no network, no interpreter). Query DSL and a hardened isolate are not built. JSON tool calls remain the default.
- **Suggested next step**: Arm an isolate that evaluates `source` under the same fail-closed contract, then add Query DSL. Mutating operations must still pass PermissionTiers and ConfirmationGate.

- **Migrated from**: v2.0.0#DF-10 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.0.0#DF-10; still owed: Required implementation/qualification; next: Implement hardened isolate and Query DSL only through a security-scoped plan with permissions/confirmation and adversarial tests; kernel denial is not executable support.

- **Migrated from**: v2.16#DF-35 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-36 - Fast small-model command router is not built

- **Source phase**: Phase 4 - Fast small-model command router (4.4)
- **Plan reference**: `docs/archive/v2/v2.0/plans/v2.0.0-adoption-governed-autonomy-multimodal.md` (sub-task 4.4)
- **Reason**: `modules/coding/routing/commandRouter.ts` classifies a few short imperatives when `enabled` is true and abstains otherwise. It is not wired into AgentLoop. No before/after latency number exists. Callers still own ConfirmationGate at the normal tier.
- **Suggested next step**: Wire the opt-in classifier at a composition root, keep abstain-and-escalate, and record a latency number versus the full AgentLoop. Do not drop permission tiers.

- **Migrated from**: v2.0.0#DF-11 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.0.0#DF-11; still owed: Required implementation/qualification; next: Implement opt-in composition preserving abstain/escalation and normal confirmation; prove before/after latency plus same permission behavior.

- **Migrated from**: v2.16#DF-36 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-37 - VRM Chat presence pane is not built

- **Source phase**: Phase 4 - VRM avatar presence layer (4.7)
- **Plan reference**: `docs/archive/v2/v2.0/plans/v2.0.0-adoption-governed-autonomy-multimodal.md` (sub-task 4.7)
- **Reason**: The plan ships this only if Chat demand justifies it. No Chat demand was observed this cycle. Live2D stays rejected (proprietary Cubism Core). Depends on Phase 1.3 TTS timing for lip-sync.
- **Suggested next step**: If Chat users ask for a presence pane, add an optional three-vrm renderer, off by default, VRM only, local, with zero cost when disabled.

- **Migrated from**: v2.0.0#DF-12 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.0.0#DF-12; still owed: Optional candidate/watch; next: Carry demand-gated proposal; do not build renderer merely to close inventory. If accepted, prove no disabled cost and local VRM-only behavior.

- **Migrated from**: v2.16#DF-37 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-38 - Inkling-Small GGUF stays text-only (v1.19.2 DF-2)

- **Source phase**: Phase 5 - Known-gaps reconciliation (5.2); origin v1.19.2 task 1.6
- **Plan reference**: `docs/archive/v1/v1.19/plans/v1.19.2-adoption-catalog-and-model-expansion.md` (sub-task 1.6)
- **Reason**: Native Inkling-Small accepts text, image, and audio. The curated UD-IQ1_S GGUF has no verified llama.cpp multimodal projector. Catalog `modalities` is `["text"]`.
- **Suggested next step**: Add image/audio modalities only after a dated local load of an image and an audio clip on that GGUF. Keep the row out of `recommended.json`.

- **Migrated from**: v2.0.0#DF-13 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.0.0#DF-13; still owed: Optional candidate/watch; next: Carry accountable Inkling image/audio proof hold, incorporating v1.19.2#DF-2 obligations; both modalities need real local load before enabling.

- **Migrated from**: v2.16#DF-38 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-39 - Kimi K3 is not a catalog LLM entry

- **Source phase**: Phase 5 - Known-gaps reconciliation (5.2); origin kimi-k3-in-c K4
- **Plan reference**: `docs/archive/v2/v2.0/comparisons/v2.0.6-comparison-kimi-k3-in-c.md` (K4)
- **Reason**: v1.19.2 calibrated the patient tier. A Kimi K3 row waits on a GGUF in the Ollama-wrapped lineage. The C99 engine from kimi-k3-in-c stays rejected.
- **Suggested next step**: If an Ollama-served GGUF lands with a pin, add a patient-tier catalog row. Do not vendor the C engine or the 1.56 TB checkpoint.

- **Migrated from**: v2.0.0#DF-14 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.0.0#DF-14; still owed: Optional candidate/watch; next: Carry model watch with serving/pin/job acceptance before any catalog row.

- **Migrated from**: v2.16#DF-39 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-40 - DiffusionGemma is a watch item, not a catalog entry

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

- **Migrated from**: v2.16#DF-40 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-41 - Live golden-task re-verification of Muse Glimmer and Nemotron Lightning was not run

- **Source phase**: Phase 1 - Local benchmark re-verification (1.5)
- **Plan reference**: `docs/archive/v2/v2.1/plans/v2.1.0-adoption-open-local-ai-wave.md` (sub-task 1.5)
- **Reason**: This cycle had no proven 24 GB-tier host with either model loaded. Catalog `localEval.status` is `not_run`. Vendor-reported SWE-Bench Verified 76.0 stays in `vendorReported` only. `recommended.json` was not changed.
- **Suggested next step**: On a 24 GB-tier machine, run `runCatalogModelEval` against Muse Glimmer K-Quant-17GB and Lightning Q4_K_M, persist the blocks, and only then propose a default-route change.

- **Migrated from**: v2.1.0#DF-2 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.1.0#DF-2; still owed: Required qualification; next: Carry live model evaluation hold. Run catalog golden tasks on correct tier; do not infer routing quality from vendor fields.

- **Migrated from**: v2.16#DF-41 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-42 - Live 20-job GPU restart soak is unproven

- **Source phase**: Phase 3 - Persistent generation job queue (3.2)
- **Plan reference**: `docs/archive/v2/v2.1/plans/v2.1.0-adoption-open-local-ai-wave.md` (sub-task 3.2)
- **Reason**: Interactive Image Studio / Video Lab clicks now enqueue `priority: "interactive"` and fire-and-forget `pumpOnce` (same GPU slot as batches). Restart recovery remains unit-tested (`running` -> `interrupted` -> `queued`, id-stable). A 20-job batch surviving a real app restart on a GPU host was not run. not_run != pass.
- **Suggested next step**: Soak a 20-job seed sweep across a sidecar restart on a diffusion-capable machine.

- **Migrated from**: v2.1.0#DF-7 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.1.0#DF-7; still owed: Required qualification; next: Carry 20-job soak with restart, stable IDs, recovery counts, and final real artifacts.

- **Migrated from**: v2.16#DF-42 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-43 - Muse Glimmer hf.co GGUF is gated vision:false

- **Source phase**: Phase 4 - Chat attachment ingestion + visual-token budgeting (4.1)
- **Plan reference**: `docs/archive/v2/v2.1/plans/v2.1.0-adoption-open-local-ai-wave.md` (sub-task 4.1)
- **Reason**: Native Muse is multimodal. The catalog pull is `ollama://hf.co/meta-models/Muse-Glimmer-30B-GGUF:...`. This cycle did not prove that GGUF ships mmproj. `vision` is false so Chat will not send image bytes to a text-only serving path.
- **Suggested next step**: After a local Ollama load of the K-Quant-17GB tag, check for a vision projector. If present, set `vision: true` and a visual-token budget. If absent, keep the gate and leave the native library tag as a follow-up.

- **Migrated from**: v2.1.0#DF-8 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.1.0#DF-8; still owed: Optional candidate/watch; next: Carry projector hold. Verify actual installed GGUF image inference before enabling vision and visual budget.

- **Migrated from**: v2.16#DF-43 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-44 - Live Unsloth QLoRA was not run on GPU

- **Source phase**: Phase 5 - QLoRA orchestration (5.4 / 5.5)
- **Plan reference**: `docs/archive/v2/v2.1/plans/v2.1.0-adoption-open-local-ai-wave.md` (sub-task 5.4)
- **Reason**: CI uses `stubTrainer` and `runtimes/tuning/train.py --stub`. `NEXUS_TUNING_LIVE=1` is documented. No 16 GB NVIDIA host ran a real `import unsloth` train this cycle. not_run != pass.
- **Suggested next step**: On a supported host, provision from Settings, run a tiny JSONL job with `NEXUS_TUNING_LIVE=1`, and record the wall-clock plus peak VRAM.

- **Migrated from**: v2.1.0#DF-13 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.1.0#DF-13; still owed: Required qualification; next: Carry live training hold. Provision supported host, run tiny real JSONL job, record time, VRAM, and artifacts.

- **Migrated from**: v2.16#DF-44 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-45 - Live GPU layer-streaming OOM rescue is unproven

- **Source phase**: Phase 6 - Diffusion VRAM-budget knobs (6.3)
- **Plan reference**: `docs/archive/v2/v2.1/plans/v2.1.0-adoption-open-local-ai-wave.md` (sub-task 6.3)
- **Reason**: Unit and Python tests cover validation plus a constrained-VRAM runner path that upgrades `insufficient_vram` to sequential CPU offload when streaming is on. No diffusion-capable host ran a real OOM-then-complete generation this cycle. not_run != pass.
- **Suggested next step**: On a 8-12 GB GPU, set a VRAM cap below the model minimum with layer streaming enabled and record whether the job completes.

- **Migrated from**: v2.1.0#DF-21 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.1.0#DF-21; still owed: Required qualification; next: Carry GPU hold. Reproduce below-minimum cap and actual completion with streaming/offload; retain typed failure if rescue fails.

- **Migrated from**: v2.16#DF-45 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### MT-1 - host_detect.py platform probes stay below 80% line coverage

- **Source phase**: Phase 1 - Honest host RAM and disk fields
- **Plan reference**: `docs/archive/v2/v2.3/plans/v2.3.1-installer-field-repair.md` (1.1, 1.4)
- **Reason**: Full installer pytest measures `host_detect.py` at 40% lines. New Windows RAM routing, PowerShell fallback, and a live GlobalMemoryStatusEx success path on this Windows host are covered. Remaining misses are pre-existing OS-specific GPU/OS probes plus ctypes ImportError / missing-kernel32 / failed-API branches that this machine does not exercise.
- **Suggested next step**: Leave OS-specific GPU probes unless a later phase touches them. Add a mocked kernel32 failure test only if a frozen windowed build reports RAM-not-detected on a machine that has RAM.

- **Migrated from**: v2.3.1#MT-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.3.1#MT-1; still owed: Historical limitation; next: Carry measurement task. Run fresh focused coverage; add meaningful platform-probe tests for actual gaps rather than treating old percentage as current.

- **Migrated from**: v2.16#MT-1 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-46 - Hydrated Video Lab sessions do not restore Enhance eligibility

- **Source phase**: Phase 4 - Video Lab Enhance Experience
- **Plan reference**: `docs/archive/v2/v2.3/plans/v2.3.0-adoption-qwen-video2x-openworker.md` (T011, T013)
- **Reason**: Enhance requires a durable output id and SHA-256 from the generation completion event. Studio session turns persist a media path, not those identities, so remounting a saved clip shows the original video and download but not Enhance. not_observed != absent for a later persistence design.
- **Suggested next step**: Persist source output id and hash on studio turns, or recover them from the generation index by path/hash during hydrate, then prove Enhance returns after remount.

- **Migrated from**: v2.3.0#DF-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.3.0#DF-1; still owed: Required implementation/qualification; next: Implement durable identity persistence/recovery and remount regression; prove Enhance returns after hydration and still rejects invalid source.

- **Migrated from**: v2.16#DF-46 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-47 - Nexus-Hub security-audit workflow is not released

- **Source phase**: Phase 5 - Quality, Performance, and Packaging Evidence
- **Plan reference**: `docs/archive/v2/v2.3/plans/v2.3.0-adoption-qwen-video2x-openworker.md` (T015); `docs/archive/v2/v2.3/development/nexus-hub-security-audit-handoff.md`
- **Reason**: The useful OpenWorker delta is a Hub-owned security-audit workflow. Upstream status is v4.1.1 confirmed, implementation not started, not released. Nexus-AI must not consume a Hub version without that evidence and must not edit the sibling repository.
- **Suggested next step**: When a Hub release publishes scanner-coverage and independent rescan receipts, record the version here and decide whether Nexus-AI should consume it.

- **Migrated from**: v2.3.0#DF-2 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.3.0#DF-2; still owed: Required qualification; next: Carry external release proof hold. Verify receipts and exact consumed version before capability claim.

- **Migrated from**: v2.16#DF-47 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-48 - Real Video2X, GPU, and packaged detection remain unmeasured

- **Source phase**: Phase 5 - Quality, Performance, and Packaging Evidence
- **Plan reference**: `docs/archive/v2/v2.3/plans/v2.3.0-adoption-qwen-video2x-openworker.md` (T014, T015)
- **Reason**: The fake-backend harness proved fixture geometry, source preservation, and typed failures. Peak CPU/GPU/VRAM, real Video2X 6.4.0 wall time, and packaged-app executable detection are not observed. not_observed != absent.
- **Suggested next step**: Run `node scripts/bench-video-enhancement.mjs --backend real` on supported Windows/Linux hardware and a packaged Windows install that points at a user-installed Video2X 6.4.0 path.

- **Migrated from**: v2.3.0#DF-3 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.3.0#DF-3; still owed: Required qualification; next: Carry real benchmark and packaged detection acceptance with version/path, resources, outputs, and source preservation.

- **Migrated from**: v2.16#DF-48 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### WN-1 - jsdom canvas and React act notices in Video Lab tests

- **Source phase**: Phase 4 - Video Lab Enhance Experience
- **Plan reference**: `docs/archive/v2/v2.3/plans/v2.3.0-adoption-qwen-video2x-openworker.md` (T013)
- **Reason**: Video Lab tests still emit `HTMLCanvasElement.getContext` and `act(...)` notices. They appeared in the passing Phase 2 desktop aggregate and in the Phase 4 focused run. They are not failed assertions.
- **Suggested next step**: Keep treating them as renderer-environment noise unless a test starts failing. Phase 6 compared a canvas stub and declined the churn.

- **Migrated from**: v2.3.0#WN-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.3.0#WN-1; still owed: Historical limitation; next: Carry explicit warning policy or implement dedicated harness cleanup after reproducing exact notices; do not silence arbitrary console errors.

- **Migrated from**: v2.16#WN-1 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-49 - Release-preconditions helper script is absent

- **Source phase**: Phase 6 - Architecture Refactor, Known-Gaps Reconciliation, and CI/CD
- **Plan reference**: `docs/archive/v2/v2.3/plans/v2.3.0-adoption-qwen-video2x-openworker.md` (T020)
- **Reason**: `python scripts/check_release_preconditions.py --branches --repo-settings` is the skill-required git-tree hygiene command. The file does not exist in this repository (same finding as v2.2.9 last-phase evidence). Hygiene was reported from `git branch` / `git remote` only. Report-only; no branch was deleted.
- **Suggested next step**: Add the helper in a later hygiene plan, or keep quoting raw git output at each last phase.

- **Migrated from**: v2.3.0#DF-4 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.3.0#DF-4; still owed: Required implementation/qualification; next: Prove resolved with V5, retaining unavailable external checks as unavailable.

- **Migrated from**: v2.16#DF-49 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### QG-1 - Named repository-native CI profiles are not present

- **Source phase**: Phase 6 - Architecture Refactor, Known-Gaps Reconciliation, and CI/CD
- **Plan reference**: `docs/archive/v2/v2.3/plans/v2.3.0-adoption-qwen-video2x-openworker.md` (T021)
- **Reason**: cicd-architect requires five named profiles (`fast`, `full`, `platform`, `report`, `release`) as repository commands. This repo validates with `npm test`, `npm run test:shell`, `npm run lint`, `python -m pytest tests/python`, and installer `uv run pytest`. Those commands exist and are what CI invokes, but they are not the named five-profile surface. No pipeline file was changed because silence is not approval.
- **Suggested next step**: If a later plan owns CI, add thin npm aliases that call the existing commands without rewriting workflow topology.

- **Migrated from**: v2.3.0#QG-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.3.0#QG-1; still owed: Required implementation/qualification; next: Prove resolved with V4, citing actual five-profile CLI rather than implying all five npm aliases exist. Parent observed 16/16 profile/report tests passed and fast --list returned five commands on 2026-10-20. Proposed resolution is limited to the formerly absent five-profile CLI; this does not prove remote execution.

- **Migrated from**: v2.16#QG-1 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### QG-2 - CI workflow lacks least-privilege permissions and an aggregate required check

- **Source phase**: Phase 6 - Architecture Refactor, Known-Gaps Reconciliation, and CI/CD
- **Plan reference**: `docs/archive/v2/v2.3/plans/v2.3.0-adoption-qwen-video2x-openworker.md` (T021)
- **Reason**: `.github/workflows/ci.yml` SHA-pins actions, uses npm/pip cache, concurrency cancellation, and 7-day artifacts, but has no workflow-level `permissions` block and no always-resolving aggregate required job. `pull_request.branches` is `main` only; develop integration relies on the `push` trigger. After PR 52 merged, the develop push reran the complete CI suite (observed finding against event separation). Differences were proposed and not applied.
- **Suggested next step**: Approve a least-privilege permissions block and an aggregate required job in a CI-owned phase, then add `develop` to pull_request branches if branch protection should see merge-result checks. Consider running Windows/macOS desktop vitest before a tag, because `shell-build.yml` keeps that matrix on `main` only.

- **Migrated from**: v2.3.0#QG-2 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.3.0#QG-2; still owed: Required implementation/qualification; next: Prove source defect resolved with workflow tests/profile verification; separately check actual branch-protection required context before claiming repository enforcement. Production workflow source now contains contents:read, PR develop and ci-required. Keep actual branch-protection enforcement separate and unverified; no permission or protection change is proposed.

- **Migrated from**: v2.16#QG-2 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### BG-1 (resolved) - Windows and macOS Shell Build desktop vitest failed after the v2.3.0 tag

- **Source phase**: `/update release` (post-tag `main` Shell Build)
- **Plan reference**: `docs/archive/v2/v2.3/plans/v2.3.0-adoption-qwen-video2x-openworker.md` (Phase 2-3 adapter/lifecycle); run [33235387928](https://github.com/bendourthe/Nexus-AI/actions/runs/33235387928)
- **Reason**: `shell-build.yml` on `main` runs Windows/macOS/Ubuntu. Ubuntu succeeded. Windows reported 75 failed tests, concentrated in `video2x-adapter.test.ts` (47), `video-enhancement-media-lifecycle.test.ts` (15), `video-enhancement-media-adapter.test.ts` (5), `video-enhancement-integration.test.ts` (4), and `windows-video-process-host.test.ts` (3). Observed mismatches include `cpu_probe_failed` vs `probe_failed`, expected `process_failed` / `provenance_failed` / `quarantined` codes vs actual messages such as "Staging root is not a canonical private...", and related lifecycle identity checks. macOS failed the same suite class. Develop Shell Build is Ubuntu-only, so this was not observed before the tag. Recurred on `v2.3.1` at [33264834351](https://github.com/bendourthe/Nexus-AI/actions/runs/33264834351).
- **Resolved**: Intake now treats OS path aliases as the same identity as `realpath` when the leaf is a regular file. Do not retag `v2.3.0` or `v2.3.1`.

- **Migrated from**: v2.3.0#BG-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.3.0#BG-1; still owed: Required implementation/qualification; next: Prove resolved with V8 plus relevant Windows/macOS green regression evidence. Historical prose alone does not prove cross-platform pass.

- **Migrated from**: v2.16#BG-1 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### MT-2 - VideoLabPage function coverage is below 80% on the focused run

- **Source phase**: Phase 4 - Video Lab Enhance Experience
- **Plan reference**: `docs/archive/v2/v2.3/plans/v2.3.0-adoption-qwen-video2x-openworker.md` (Phase 4 quality gate)
- **Reason**: Focused Phase 4 coverage measured `VideoLabPage.tsx` at 85.64% lines and 72.41% functions. Phase 6 aggregate coverage is 86.94% lines and 72.41% functions. The new Enhance paths are covered; remaining function gaps are pre-existing page helpers. Global desktop coverage is 87.39% lines / 83.66% functions.
- **Suggested next step**: Leave pre-existing page helpers unless a later UI pass touches them. Do not treat this function percentage as a missing Enhance test.

- **Migrated from**: v2.3.0#MT-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.3.0#MT-1; still owed: Historical limitation; next: Carry focused coverage measurement and meaningful uncovered-helper review; do not call existing Enhance paths untested from an old aggregate percentage.

- **Migrated from**: v2.16#MT-2 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-50 - Node SEA / externalBin bundling remains deferred

- **Source phase**: Carried into v2.2.3 Phase 1
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.3-glass-orbs-and-pillar-runtime.md` (Out of scope)
- **Reason**: The sidecar still uses the verified Node resolution chain rather than a Tauri `externalBin` or Node SEA artifact.
- **Suggested next step**: Revisit only in a packaging-focused cycle with clean-install validation for the replacement artifact.

- **Migrated from**: v2.2.3#DF-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.3#DF-1; still owed: Required implementation/qualification; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede to v2.2.9#DF-38, preserving self-contained Node ABI, architecture-correct native addon, clean-host launch, and repair fallback obligations.

- **Migrated from**: v2.16#DF-50 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-51 - Packaged clean-VM and Explorer-launch acceptance not executed

- **Source phase**: Carried into v2.2.3 Phase 1
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.3-glass-orbs-and-pillar-runtime.md` (Residual risks)
- **Reason**: Vitest proves the async adapter and route behavior, the debug Tauri build validates the scoped asset-protocol configuration, and the Phase 8 platform contract names the Windows artifact and acceptance gap. This cycle has not launched a packaged shell from Explorer, run a clean-VM install, or played a generated MP4 through a packaged asset URL. Packaged Chatbot first paint and packaged video playback are not proven here.
- **Suggested next step**: Launch the packaged application from Explorer on a clean Windows VM, confirm `/chatbot` renders without a console or blank pane, and play a generated MP4 from the scoped outputs directory.

- **Migrated from**: v2.2.3#DF-2 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.3#DF-2; still owed: Required qualification; next: Carry packaged acceptance hold with actual installer/artifact identity and clean-host proof of each leg.

- **Migrated from**: v2.16#DF-51 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-52 - Live-GPU image and video generation soaks not executed

- **Source phase**: Carried into v2.2.3 Phase 1
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.3-glass-orbs-and-pillar-runtime.md` (Residual risks, DF-4)
- **Reason**: Automated tests now prove that queue failures, empty image completes, empty video completes, and decode failures become written errors with no false media actions. Real SANA and LTX generation were not executed on a supported GPU, so successful bytes, runtime duration, and asset playback under live load remain unproven.
- **Suggested next step**: Run the existing image and video generation smoke on a supported GPU and capture successful output plus packaged playback evidence.

- **Migrated from**: v2.2.3#DF-4 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.3#DF-4; still owed: Required qualification; next: Carry live smoke hold; retain successful bytes, elapsed time and packaged playback evidence with stubs disabled.

- **Migrated from**: v2.16#DF-52 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-53 - CodingInput retains a separate composer implementation

- **Source phase**: Carried into v2.2.3 Phase 1
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.3-glass-orbs-and-pillar-runtime.md` (Phase 8.1)
- **Reason**: Phase 8 extracts the byte-identical composer surface, right-control, icon-cluster, document-chip, and remove-button styles into `composerSurfaceStyles.ts`. CodingInput still owns separate markup and behavior for slash-command discovery, audio state, and coding-only controls, so replacing both components with one renderer would broaden behavior rather than remove exact duplication.
- **Suggested next step**: Revisit a shared markup primitive only when the two composers' interaction contracts converge; keep the shared structural styles as the current deduplication boundary.

- **Migrated from**: v2.2.3#DF-14 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.3#DF-14; still owed: Owner decision; next: Carry deliberate composition boundary, or explicitly close broader unification proposal as unnecessary. Merge markup only when behavior converges.

- **Migrated from**: v2.16#DF-53 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-54 - Native file dialogs remain unavailable

- **Source phase**: Carried into v2.2.3 Phase 1
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.3-glass-orbs-and-pillar-runtime.md` (Phase 6.1, Phase 8.2)
- **Reason**: The repository has no Tauri dialog plugin. Phase 6 ships a validated workspace text field persisted under `nexus.coding.workspacePath`, while Settings data transfer also remains path-text based.
- **Suggested next step**: Add and capability-scope the dialog plugin in a dedicated cross-platform file-dialog task.

- **Migrated from**: v2.2.3#DF-16 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.3#DF-16; still owed: Required implementation/qualification; next: Implement bounded data-transfer open/save dialog task with capability scope and cross-platform tests; correct any stale global no-dialog claim. Preserve B-IMPORT-APPLY and B-DATA-DIALOGS separately; imported files remaining in import-staging do not fulfill full restore.

- **Migrated from**: v2.16#DF-54 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-55 - Settings tabs are not URL-addressable

- **Source phase**: Carried into v2.2.3 Phase 1
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.3-glass-orbs-and-pillar-runtime.md` (Phase 8.2)
- **Reason**: Resolved in v2.2.4 Phase 2. `SettingsPage` now reads `?tab=` via `useSearchParams` so `/settings?tab=models` opens Models even when Settings is already mounted.
- **Suggested next step**: Nested Settings routes remain optional; query-param tabs satisfy the deep-link contract.

- **Migrated from**: v2.2.3#DF-17 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.3#DF-17; still owed: Required implementation/qualification; next: Prove resolved with V1; query-param tabs satisfy deep-link behavior without requiring nested routes. Parent observed SettingsPage tests passing in the 30/30 focused desktop run on 2026-10-20. Propose resolving practical query-tab deep links; do not claim native packaged navigation was exercised.

- **Migrated from**: v2.16#DF-55 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-56 - Packaged macOS and Linux sidecar native-addon paths are not proven

- **Source phase**: Carried into v2.2.3 Phase 1
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.3-glass-orbs-and-pillar-runtime.md` (Phase 8.2)
- **Reason**: The Phase 8 parity contract and packaging tests show that macOS and Linux build scripts do not stage the desktop sidecar payload that Windows embeds. No macOS `.app` or Linux AppImage was executed in this session, so native-addon resolution on those targets is not proven here.
- **Suggested next step**: Stage the desktop sidecar payload in both Unix installer builds, then run packaged `--healthcheck` acceptance on each operating system and record the resolved addon path.

- **Migrated from**: v2.2.3#DF-18 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.3#DF-18; still owed: Required implementation/qualification; next: Carry staging implementation and macOS/Linux healthcheck proof, including exact addon path and architecture.

- **Migrated from**: v2.16#DF-56 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-57 - CREATE_NO_WINDOW parity is N/A on macOS and Linux

- **Source phase**: Carried into v2.2.3 Phase 1
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.3-glass-orbs-and-pillar-runtime.md` (Phase 8.4)
- **Reason**: The Phase 8 parity contract records the Windows creation flag as supported and macOS/Linux as not applicable. The Windows flag has no direct Unix counterpart; absence of an observed terminal window on other platforms is still not proven here.
- **Suggested next step**: Record platform-specific packaged-launch evidence and keep the Windows-only flag classified as N/A elsewhere.

- **Migrated from**: v2.2.3#DF-19 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.3#DF-19; still owed: Historical limitation; required qualification for Unix launch claim; next: Carry platform launch observation only, explicitly N/A for the Windows flag. Record no extra terminal on each packaged Unix launch.

- **Migrated from**: v2.16#DF-57 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-58 - Local Chatbot reply transport remains batched

- **Source phase**: v2.2.3 Phase 4
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.3-glass-orbs-and-pillar-runtime.md` (Phase 4)
- **Reason**: The sidecar chat protocol is request/response only and exposes no incremental token event channel. Phase 4 keeps the visible Composing orb until the complete reply arrives rather than simulating streaming.
- **Suggested next step**: Add a typed incremental chat event protocol and cancellation contract in a transport-focused cycle, then replace the single terminal response without changing transcript persistence.

- **Migrated from**: v2.2.3#DF-21 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.3#DF-21; still owed: Required implementation/qualification; next: Implement typed incremental event delivery, cancellation and turn-identity contract, preserving durable terminal transcript and visible pending behavior.

- **Migrated from**: v2.16#DF-58 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-59 - Workspace Hub hook scripts are not executed by the desktop sidecar

- **Source phase**: v2.2.3 Phase 8 reconciliation of Phase 6
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.3-glass-orbs-and-pillar-runtime.md` (Phase 6.3, Phase 8.2)
- **Reason**: Phase 6 wires a vscode-free HookBus lifecycle inside the sidecar, but it does not discover or execute arbitrary workspace Hub hook scripts whose existing host integration depends on VS Code. Treating those scripts as active would be a false capability claim.
- **Suggested next step**: Define a vscode-free hook discovery, permission, timeout, and result contract before enabling workspace hook scripts in desktop or scheduled sessions.

- **Migrated from**: v2.2.3#DF-22 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.3#DF-22; still owed: Required implementation/qualification; next: Implement only after a concrete vscode-free discovery, permission, timeout, environment and result contract; test malicious/failing hooks.

- **Migrated from**: v2.16#DF-59 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### WN-2 - Pre-existing SIM117 in installer Complete test

- **Source phase**: v2.2.3 Phase 7 verification
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.3-glass-orbs-and-pillar-runtime.md` (7.4)
- **Reason**: Ruff reports a nested `with patch(...)` at `scripts/installer/tests/test_complete.py:13`. The line predates v2.2.3 and is outside the Phase 7 hunks; changing it would be unrelated cleanup. All Phase 7 source and newly changed test paths pass ruff, and every touched file passes `ruff format --check`.
- **Suggested next step**: Combine the two patch contexts during a dedicated installer test-cleanup task.

- **Migrated from**: v2.2.3#WN-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.3#WN-1; still owed: Required implementation/qualification; next: Prove resolved with V6; no unrelated broad lint cleanup required. Parent observed targeted Ruff SIM117 check passed on 2026-10-20. Propose resolving this exact lint occurrence, not the whole installer quality backlog.

- **Migrated from**: v2.16#WN-2 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### WN-3 - Desktop DOM suites emit known renderer-environment warnings

- **Source phase**: v2.2.3 Phase 8 verification
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.3-glass-orbs-and-pillar-runtime.md` (Phase 8.5)
- **Reason**: The solo desktop suite passes all 1369 tests but emits existing React `act(...)` warnings and jsdom notices for unimplemented Canvas and media methods. These warnings do not indicate failed assertions and the affected harness code is outside the Phase 8 refactor.
- **Suggested next step**: Add targeted Canvas/media stubs and close remaining async React updates inside a dedicated desktop test-harness cleanup.

- **Migrated from**: v2.2.3#WN-2 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.3#WN-2; still owed: Historical limitation; next: Carry harness census and explicit tolerated-warning decision; coordinate exact notices with v2.3.0#WN-1 without suppressing unrelated failures.

- **Migrated from**: v2.16#WN-3 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-60 - Node SEA / externalBin bundling not implemented (resolution chain shipped instead)

Unchanged. Spawn now also sets `CREATE_NO_WINDOW` on Windows. The Node binary is still resolved from the installer chain, not a Tauri `externalBin`.

- **Migrated from**: v2.2.2#DF-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.2#DF-1; still owed: Required implementation/qualification; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede to v2.2.3#DF-1, preserving its onward v2.2.9#DF-38 packaging obligations.

- **Migrated from**: v2.16#DF-60 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-61 - Packaged-build acceptance legs not executed (clean-VM smoke)

A 2026-08-22 Complete-page healthcheck on this Windows host printed sidecar ok. That is not a clean-VM proof, and this coding session did not launch `nexus-shell.exe` from Explorer to confirm zero Node consoles after the flag change. Unit tests cover the flag helper.

- **Migrated from**: v2.2.2#DF-2 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.2#DF-2; still owed: Required qualification; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede to v2.2.3#DF-2, preserving clean-VM, no-system-Node, launch, first-paint and playback proof.

- **Migrated from**: v2.16#DF-61 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-62 - Live-GPU generation smoke written but not executed

Unchanged. Out of scope for v2.2.2.

- **Migrated from**: v2.2.2#DF-4 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.2#DF-4; still owed: Required qualification; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede to v2.2.3#DF-4, preserving actual successful image/video bytes and playback evidence.

- **Migrated from**: v2.16#DF-62 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-63 - CodingInput still has its own composer implementation

Unchanged as a shared primitive. v2.2.2 restyled CodingInput to the same in-field + / icon-send contract as MediaComposer (slash autocomplete stays). The duplicated surface style objects were not extracted.

- **Migrated from**: v2.2.2#DF-14 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.2#DF-14; still owed: Owner decision; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede to v2.2.3#DF-14, preserving deliberate shared-style boundary and any accepted convergence requirement.

- **Migrated from**: v2.16#DF-63 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-64 remaining - no native file dialog for data transfer

Unchanged. Settings > Data still takes a path string. Page padding now matches Models.

- **Migrated from**: v2.2.2#DF-16 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.2#DF-16; still owed: Required implementation/qualification; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede to v2.2.3#DF-16, preserving specific import/export native dialog acceptance. Preserve the carried full-restore import requirement from the v2.2.1 predecessor in addition to native file dialogs; the newer short copy does not waive it. Preserve B-IMPORT-APPLY and B-DATA-DIALOGS separately; imported files remaining in import-staging do not fulfill full restore.

- **Migrated from**: v2.16#DF-64 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-65 - Settings tabs are not URL-addressable

Unchanged. Out of scope.

- **Migrated from**: v2.2.2#DF-17 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.2#DF-17; still owed: Required implementation/qualification; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede to v2.2.3#DF-17 and run V1 before recording implementation closure.

- **Migrated from**: v2.16#DF-65 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-66 - Sidecar cwd + native addon on macOS .app and Linux AppImage

Unchanged. This session did not execute a macOS `.app` or Linux AppImage install (`not_observed != absent`).

- **Migrated from**: v2.2.2#DF-18 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.2#DF-18; still owed: Required implementation/qualification; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede to v2.2.3#DF-18, preserving both operating systems and packaged addon resolution.

- **Migrated from**: v2.16#DF-66 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-67 - CREATE_NO_WINDOW / hidden Node console not applicable on macOS or Linux

- **Source phase**: v2.2.2 Phase 1 / Phase 6.4
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.2-ready-shell-and-studio-chrome.md` (1.1, 6.4)
- **Reason**: `creation_flags(CREATE_NO_WINDOW)` is `cfg(windows)` only. macOS and Linux do not allocate a console for a GUI-parented Node child the way Windows console-subsystem `node.exe` does. Those platforms are N/A for this flag, not proven hidden.
- **Suggested next step**: Record a packaged macOS/Linux launch screenshot showing no extra terminal; do not copy the Windows flag there.

- **Migrated from**: v2.2.2#DF-19 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.2#DF-19; still owed: Historical limitation; required qualification for Unix launch claim; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede to v2.2.3#DF-19; preserve actual no-extra-terminal observation separately from N/A.

- **Migrated from**: v2.16#DF-67 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-68 - Node SEA / externalBin bundling not implemented (resolution chain shipped instead)

Unchanged. Spawn now sets cwd to the script directory and waits for liveness; the Node binary is still resolved from the installer chain, not a Tauri `externalBin`.

- **Migrated from**: v2.2.1#DF-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.1#DF-1; still owed: Required implementation/qualification; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede to v2.2.3#DF-1 with complete self-contained runtime and ABI obligations.

- **Migrated from**: v2.16#DF-68 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-69 - Packaged-build acceptance legs not executed (clean-VM smoke)

A 2026-08-22 rebuild of `nexus-shell.exe --healthcheck` on this Windows host printed `"sidecar":"ok"` with `catalogRows: 38` after two packaging fixes: copy `unsloth-pins.json` next to the bundle (import-time ENOENT), and fetch `better-sqlite3` for installer Node 22.11.0 (ABI 127) instead of the developer Node 24 (ABI 137). The Complete-page install of a freshly built `dist/NexusSetup.exe` is still the remaining live-install proof.

- **Migrated from**: v2.2.1#DF-2 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.1#DF-2; still owed: Required qualification; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede to v2.2.3#DF-2 with all original acceptance legs retained.

- **Migrated from**: v2.16#DF-69 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-70 - Live-GPU generation smoke written but not executed

Unchanged. Out of scope for v2.2.1.

- **Migrated from**: v2.2.1#DF-4 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.1#DF-4; still owed: Required qualification; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede to v2.2.3#DF-4 with real output and packaged playback proof retained.

- **Migrated from**: v2.16#DF-70 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-71 remaining - no native file dialog for data transfer

Unchanged. Settings > Data still takes a path string. Preview-and-stage import is not a full restore into final destinations.

- **Migrated from**: v2.2.1#DF-16 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.1#DF-16; still owed: Required implementation/qualification; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede to v2.2.3#DF-16; IPC implementation does not satisfy file picking. UNIQUE REQUIRED REMAINDER: this older body also says preview-and-stage import is not a full restore into final destinations. Current transferRuntime.ts:363-404 validates/writes under import-staging. Preserve B-IMPORT-APPLY in addition to B-DATA-DIALOGS; append the original obligation to any later accountable copy before superseding. Do not collapse solely as native-dialog work. Preserve B-IMPORT-APPLY and B-DATA-DIALOGS separately; imported files remaining in import-staging do not fulfill full restore.

- **Migrated from**: v2.16#DF-71 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-72 - Settings tabs are not URL-addressable

Unchanged. Out of scope.

- **Migrated from**: v2.2.1#DF-17 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.1#DF-17; still owed: Required implementation/qualification; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede to v2.2.3#DF-17 and verify V1.

- **Migrated from**: v2.16#DF-72 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-73 - Sidecar cwd + native addon on macOS .app and Linux AppImage

- **Source phase**: v2.2.1 Phase 1 / Phase 5.4
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.1-field-repair-and-chrome-completion.md` (5.4)
- **Reason**: Spawn cwd is `script.parent()` and Tauri maps the whole `sidecar/dist` tree, which is OS-agnostic in source. This session did not execute a macOS `.app` or Linux AppImage install, so those resource layouts are not proven here (`not_observed != absent`).
- **Suggested next step**: Run `--healthcheck` on a packaged macOS and Linux build and confirm `better_sqlite3.node` resolves from the script directory.

- **Migrated from**: v2.2.1#DF-18 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.1#DF-18; still owed: Required implementation/qualification; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede to v2.2.3#DF-18, retaining both platforms and resolved addon-path receipt.

- **Migrated from**: v2.16#DF-73 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-74 - Node SEA / externalBin bundling not implemented (resolution chain shipped instead)

- **Source phase**: Phase 1 - Sidecar Packaging and Runtime Wiring Repair (1.2)
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.0-runtime-repair-and-ux-overhaul.md` (sub-task 1.2)
- **Reason**: The plan prefers a Node SEA or Tauri `externalBin` next to the resources so the app is fully self-contained. This phase shipped the resolution chain (`NEXUS_NODE_PATH` -> `~/.nexus/runtime.json` `nodePath` -> per-OS provisioned path -> PATH `node`) plus a guaranteed installer runtime step (payload copy or pinned nodejs.org download, sha256-verified), which covers every installer-driven path. A machine whose app is installed WITHOUT the Nexus installer (raw NSIS bundle) and with no system Node still has no runtime.
- **Suggested next step**: Evaluate Tauri `externalBin` with the Node 22 binary at desktop build time in a later phase; if adopted, it becomes resolution source 2 and the download leg becomes repair-only.

- **Migrated from**: v2.2.0#DF-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.0#DF-1; still owed: Required implementation/qualification; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede to v2.2.3#DF-1, retaining onward v2.2.9#DF-38 standalone packaging acceptance.

- **Migrated from**: v2.16#DF-74 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-75 - Packaged-build acceptance legs not executed (clean-VM smoke)

- **Source phase**: Phase 1 (1.1 / 1.2 / 1.4 acceptance criteria)
- **Plan reference**: sub-tasks 1.1, 1.2, 1.4
- **Reason**: The 1.1/1.2/1.4 acceptance criteria include running a packaged NSIS build on a clean VM (resource-dir resolution, no-system-Node spawn, installer health-check verdict). This session validated the contracts statically (packaging assertion tests, Rust resolution-chain tests, stubbed healthcheck pytest) but did not produce and execute a full installer build.
- **Suggested next step**: On the next installer build (`build-windows.ps1` -> nexus-installer exe), run the install on a clean Windows VM/sandbox and confirm the Complete page reports `sidecar ok; catalogRows>0`. Phase 2's stability gate re-checks this on the reference machine.

- **Migrated from**: v2.2.0#DF-2 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.0#DF-2; still owed: Required qualification; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede to v2.2.3#DF-2, preserving installer Complete health and no-system-Node proof.

- **Migrated from**: v2.16#DF-75 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-76 - provisioner_dispatch chain remains dead code in the GUI flow

- **Source phase**: Phase 1 (discovered during 1.3)
- **Plan reference**: sub-task 1.3
- **Reason**: The live `InstallEngine.run` never consumed `provisioner_dispatch.chain_for` ("node", "ffmpeg", python-venv provisioners) - that is WHY no Node was ever provisioned in shipped installs. Phase 1 added a dedicated always-on runtime step rather than rewiring the whole dispatch chain (diffusion venv wheels provisioning is still not wired into the GUI flow; runtime.json records the venv only if present).
- **Suggested next step**: Either wire the dispatch chain into `InstallEngine.run` (diffusion venv + ffmpeg steps) or delete the dead chain in the final refactor phase; the diffusion venv step matters for Phase 2's generation smoke on hosts that never had v1.x installs.

- **Migrated from**: v2.2.0#DF-3 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.0#DF-3; still owed: Owner decision; required qualification for ffmpeg/runtime delivery; next: Implement explicit dead-chain retention/removal decision and verify ffmpeg path. Later runtime provisioning supersedes old missing-venv symptom, not all dispatch-code obligations.

- **Migrated from**: v2.16#DF-76 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-77 - Live-GPU generation smoke written but not executed

- **Source phase**: Phase 2 - Model Availability End to End (2.5)
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.0-runtime-repair-and-ux-overhaul.md` (sub-task 2.5)
- **Reason**: `scripts/smoke/live-gpu-generation.mjs` renders one real image (sana-1.6b-2k) and one short clip (ltx-video) through the built sidecar and the installed weights, gated behind `NEXUS_LIVE_GPU=1`. It was verified to skip cleanly (exit 2) without the gate, but the actual GPU run was NOT performed in this session - no live render has been proven end to end. The mocked integration test covers routing and the typed `runtime-unavailable` path only.
- **Suggested next step**: Run `NEXUS_LIVE_GPU=1 node scripts/smoke/live-gpu-generation.mjs` on the RTX 3080 host after the next install, and record the outcome here. This is the leg that closes Phase 2's stability gate for real.

- **Migrated from**: v2.2.0#DF-4 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.0#DF-4; still owed: Required qualification; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede to v2.2.3#DF-4, preserving gate-enabled real generation and actual bytes.

- **Migrated from**: v2.16#DF-77 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-78 - GPU telemetry reports no queue depth or active model

- **Source phase**: Phase 2 (2.4)
- **Plan reference**: sub-task 2.4
- **Reason**: `gpuRuntime.ts` builds `GpuTelemetrySource` with the default `activeJobProvider`, so `activeModelId` is null and `queuedJobs` is 0 in every sample. Real GPU/VRAM/device numbers are live, but the widget's "Idle vs model name" line and queue count are not yet fed by the scheduler. Wiring them means giving the sidecar handler access to the GpuScheduler snapshot, which is exactly what Phase 4's `ModelResidencyContext` introduces.
- **Suggested next step**: Feed the scheduler snapshot into `gpuTelemetrySource()` during Phase 4 (4.3), then assert a non-null `activeModelId` while a job runs.

- **Migrated from**: v2.2.0#DF-5 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.0#DF-5; still owed: Required implementation/qualification; next: Implement scheduler-backed provider and test non-null active model/real queue depth. App's separate occupancy feed does not fix the widget sample.

- **Migrated from**: v2.16#DF-78 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-79 - Ollama upgrade path reaches through to a private helper

- **Source phase**: Phase 2 (2.3)
- **Plan reference**: sub-task 2.3
- **Reason**: `ensure_ollama_supports()` calls `OllamaInstaller._ollama_version()` (a private method, flagged with `noqa: SLF001`) because there is no public version accessor. Correct behavior, slightly leaky boundary.
- **Suggested next step**: Promote `_ollama_version` to a public `installed_version()` during the Phase 8 refactor and drop the noqa.

- **Migrated from**: v2.2.0#DF-6 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.0#DF-6; still owed: Required implementation/qualification; next: Implement public accessor and update callers/tests, preserving API/CLI fallback behavior.

- **Migrated from**: v2.16#DF-79 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-80 [RESOLVED 2026-08-22, Phase 8] - Bundled hub snapshot is not produced by the release build yet

- **Source phase**: Phase 3 - Nexus-Hub Harness Provisioning (3.1)
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.0-runtime-repair-and-ux-overhaul.md` (sub-task 3.1)
- **Reason**: `scripts/installer/build/build-hub-snapshot.py` produces a checksummed `catalog.tar.gz` + `manifest.json`, the PyInstaller spec stages them when present (refusing a placeholder digest), and the provisioner extracts them. But no snapshot has been built and no build script calls the builder, so today's installer still falls back to the network sync. The OFFLINE-install guarantee is therefore implemented but not yet delivered.
- **Suggested next step**: Call `build-hub-snapshot.py` from `build-windows.ps1` (and the macOS/Linux build scripts) after a sync, so the release installer always carries a snapshot; then verify an offline install lands a populated catalog.

- **Migrated from**: v2.2.0#DF-7 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.0#DF-7; still owed: Required implementation/qualification; next: Prove resolved for absent build call site with V7. Carry guaranteed offline-delivery claim separately until actual artifact contents and offline install are observed. Build-callsite absence is source-fixed, but the offline artifact guarantee is not established. B-OFFLINE-ARTIFACT survives until build contents and offline install evidence exist.

- **Migrated from**: v2.16#DF-80 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-81 - Hub tar extraction uses a minimal in-house reader

- **Source phase**: Phase 3 (3.1)
- **Plan reference**: sub-task 3.1
- **Reason**: `extractHubSnapshot` implements a small ustar reader (with a tar-slip guard) rather than adding a tar dependency to the sidecar bundle. It handles the regular-file and directory entries a catalog snapshot contains, but not symlinks, long-name (GNU/PAX) headers, or sparse entries. A snapshot built by `build-hub-snapshot.py` never contains those; a hand-rolled archive could.
- **Suggested next step**: Either keep it and assert the constraint in the builder (reject symlinks/long names at pack time), or vendor a small tar implementation, during the Phase 8 refactor.

- **Migrated from**: v2.2.0#DF-8 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.0#DF-8; still owed: Required implementation/qualification; next: Implement compatible pack/extract contract, reject unsupported entries at build time or support them safely, and exercise real generated snapshots.

- **Migrated from**: v2.16#DF-81 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-82 [RESOLVED 2026-08-22, Phase 8] - The switch policy is wired to one submit surface, not four

- **Source phase**: Phase 4 - Smart Single-GPU Model Orchestration (4.3)
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.0-runtime-repair-and-ux-overhaul.md` (sub-task 4.3)
- **Reason**: sub-task 4.3 calls for integrating the policy into "the studios' and chat/coding submit paths". Only `ImageStudioPage.handleSubmit` is wired (classify, dialog, chip, resume-after-confirm). Video Lab, Local Chatbot, and the Agentic composer still submit without consulting the policy, so a submit from those surfaces cannot raise the confirm dialog.
- **Suggested next step**: Apply the same four-line gate to `VideoLabPage`, the chat composer, and the coding composer. The hook and dialog are surface-agnostic; the remaining work is per-surface wiring plus one test each.

- **Migrated from**: v2.2.0#DF-9 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.0#DF-9; still owed: Required implementation/qualification; next: Prove resolved with V3 and affected submit-flow behavioral verification; not only source-string matches. Parent observed occupancy tests within the 30/30 focused run. Propose resolving the four-submit wiring absence only; no real live concurrent-model switching was observed.

- **Migrated from**: v2.16#DF-82 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-83 [RESOLVED 2026-08-22, Phase 8] - The policy is not fed live residency or scheduler state

- **Source phase**: Phase 4 (4.1 / 4.3)
- **Plan reference**: sub-tasks 4.1, 4.3
- **Reason**: `ImageStudioPage` accepts `hostVramFreeGB` and `activeSchedulerJob` props, but `App.tsx` does not yet supply them, and `useModelResidency` starts with an empty resident list that nothing updates from the scheduler. In the shipped app the policy therefore sees "nothing loaded, VRAM unknown" and takes the no-incumbent path on every submit. The decision matrix is correct and fully tested; it is simply not being given real inputs yet. This is the same missing feed as DF-5 (telemetry carries no active model or queue depth).
- **Suggested next step**: Expose a `scheduler.snapshot` IPC (active job + queued) alongside the existing `gpu.sample`, feed `resident`/`freeVramGB`/`activeJob` from it in `App.tsx`, and assert an end-to-end confirm in a page test. Closing this also closes DF-5.

- **Migrated from**: v2.2.0#DF-10 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.0#DF-10; still owed: Required implementation/qualification; next: Prove resolved with V3 and end-to-end incumbent confirmation. Keep unrelated telemetry widget DF-5 open until its own provider is wired. Parent observed occupancy tests within the 30/30 focused run. The separate telemetry provider defect remains B-GPU-TELEMETRY; do not close it as a side effect.

- **Migrated from**: v2.16#DF-83 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-84 [RESOLVED 2026-08-22, Phase 8] - Cross-model orchestration is not wired to the real agent tools

- **Source phase**: Phase 4 (4.2)
- **Plan reference**: sub-task 4.2
- **Reason**: `runCrossModelRequest` implements hold -> classify -> run -> restore with the three failure modes, and is covered by tests against a mock runtime (which is what the sub-task's acceptance asks for). It is not yet called by the coding agent's image/video tools, so an actual agentic session cannot exercise it, and the Trace-panel progress lines it emits are not rendered anywhere.
- **Suggested next step**: Call it from the agent's image/video tool handlers, passing the session's current model as `agenticModelId`, and render `CrossModelProgress` in the coding Trace panel.

- **Migrated from**: v2.2.0#DF-11 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.0#DF-11; still owed: Required implementation/qualification; next: Implement actual tool composition and progress rendering or explicitly reconcile obsolete requirement. Do not close from prose/source-string tests. B-CROSSMODEL-COMPOSITION remains mandatory despite historical RESOLVED title: current production search has no runCrossModelRequest caller or CrossModelProgress renderer. Implement and exercise the production tool entrypoint plus progress renderer, or obtain an explicit change to that original contract; tests of the helper alone are insufficient.

- **Migrated from**: v2.16#DF-84 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-85 [RESOLVED 2026-08-22, Phase 8] - The chat rail is not yet the chat-first session history (5.2)

- **Source phase**: Phase 5 - Local Chatbot Rebuild (5.2)
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.0-runtime-repair-and-ux-overhaul.md` (sub-task 5.2)
- **Reason**: 5.2 asks for a rebuilt rail: composer-first empty state, a "New chat" primary action, recent chats at root, an optional Projects section, drag between root/projects/folders, and a collapsible rail. This phase delivered the storage, titling, persona, and composer work; `FolderTree` still renders its original "Create your first folder" empty state and the page still requires selecting a chat before the composer is usable. The user's specific complaint ("it only starts a chat when we create a folder") is therefore NOT yet fixed in the UI, even though the store has supported root-level chats all along.
- **Suggested next step**: Rework `FolderTree` into the session rail and make `ChatPage` render the composer with no active chat, creating a root chat on first send. The storage calls it needs (`createChat` with `folderId: null`, `listMessages`) are already wired and tested.

- **Migrated from**: v2.2.0#DF-12 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.0#DF-12; still owed: Required implementation/qualification; next: Prove resolved for folder prerequisite with V2 and actual first-send flow; reconcile optional full-rail specification explicitly rather than implying every structural request is proved. Parent observed chat-gaps/title tests within the 30/30 focused run. Propose resolving folder-required behavior only, with full rail design wording reconciled explicitly.

- **Migrated from**: v2.16#DF-85 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-86 [RESOLVED 2026-08-22, Phase 8] - Auto-titling is implemented end to end but not called on first send

- **Source phase**: Phase 5 (5.3)
- **Plan reference**: sub-task 5.3
- **Reason**: `chat.generateTitle` (sidecar), `fallbackTitle`/`sanitizeTitle`, the `userRenamed` pin, and the `renameChat({byUser})` split are all implemented and tested. The client-side trigger - set the fallback title on first send, request the generated one in the background, apply unless the user renamed - is not yet in `ChatPage.handleSubmit`, so chats created today still carry the title `FolderTree` gives them.
- **Suggested next step**: In `handleSubmit`, when the chat has no messages yet, set the fallback title immediately, then call `generateTitle` and apply the result via `renameChat(id, title)` (machine path, so it never sets `userRenamed`).

- **Migrated from**: v2.2.0#DF-13 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.0#DF-13; still owed: Required implementation/qualification; next: Prove resolved with V2, including user rename protection and title failure not failing send. Parent observed chat-gaps/title tests within the 30/30 focused run. Propose resolving missing first-send title call site; user rename and failure behavior require the cited covered cases.

- **Migrated from**: v2.16#DF-86 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-87 - CodingInput still has its own composer implementation

- **Source phase**: Phase 5 (5.4)
- **Plan reference**: sub-task 5.4 ("Update CodingInput to reuse the same base composer")
- **Reason**: `MediaComposer` was rebuilt as the single in-field surface used by Chat, Image Studio, and Video Lab. `CodingInput` keeps its own layout and its own duplicated `addBtnStyle`/`docChipStyle`/`removeBtnStyle` objects, because it carries the slash-command dropdown that the shared composer has no concept of.
- **Suggested next step**: Extract the surface (field + in-field controls) into a shared primitive that accepts an overlay slot, then have `CodingInput` supply its dropdown through that slot. Phase 6's ui-primitives work is the natural place.

- **Migrated from**: v2.2.0#DF-14 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.0#DF-14; still owed: Owner decision; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede to v2.2.3#DF-14, retaining explicit renderer-convergence decision rather than forcing behavior changes.

- **Migrated from**: v2.16#DF-87 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-88 - Token aliases added rather than call sites migrated

- **Source phase**: Phase 6 - Shell UI Modernization (6.4)
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.0-runtime-repair-and-ux-overhaul.md` (sub-task 6.4)
- **Reason**: `--border-1`, `--accent-primary`, `--accent-danger`, and `--accent-warning` were referenced in 71 places but never defined, so each usage fell through to whatever inline literal its author happened to write. They are now DEFINED as aliases of the canonical tokens, which fixes the rendering immediately. The plan also asked to migrate the 71 call sites and delete the aliases; that rename was deliberately not done inside a UI phase, where it would have been a large mechanical diff competing with real behaviour changes.
- **Suggested next step**: Sweep the call sites to the canonical names and delete the alias block during the Phase 8 refactor, with the existing token test as the guard.

- **Migrated from**: v2.2.0#DF-15 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.0#DF-15; still owed: Owner decision; next: Implement scoped mechanical call-site migration and delete aliases with token regression, or retain explicit canonical alias contract. Do not claim sweep happened.

- **Migrated from**: v2.16#DF-88 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-89 [PARTIALLY RESOLVED 2026-08-22, Phase 8] - Data transfer has no IPC surface or file dialogs yet

- **Source phase**: Phase 7 - Settings modernization and data transfer (7.4)
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.0-runtime-repair-and-ux-overhaul.md` (sub-task 7.4)
- **Reason**: `transferRuntime.ts` implements export and import end to end (manifest, per-category checksums, credentials excluded by default, atomic write, path-escape refusal, dry run, pre-import backup) and is covered by 15 tests. Settings > Data renders the category picker and calls a `DataSettingsClient`, but no `data.export` / `data.import` IPC methods exist and no save/open dialog is wired, so the page reports "the Nexus backend is not reachable" in the running app. The import apply path also stages files under `~/.nexus/import-staging` rather than moving them into place.
- **Resolution (Phase 8)**: `data.categories`, `data.export`, and `data.import` are declared, handled, and covered; Settings > Data now reaches the real runtime, exports to an editable path defaulting to a timestamped name, and offers Preview before Import.
- **Remaining**: no native file dialog. Adding one means a Tauri plugin plus a capability change, which is not a change to slip into a release build; the path fields cover the same ground without it. The import apply path still stages under `~/.nexus/import-staging` rather than merging into final destinations, so an import is a preview-and-stage, not yet a full restore.

- **Migrated from**: v2.2.0#DF-16 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.0#DF-16; still owed: Required implementation/qualification; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede to v2.2.3#DF-16, retaining specific native data-transfer dialog remainder without reopening delivered IPC. Original entry explicitly says import apply stages files rather than moving into place. Carry B-IMPORT-APPLY with full-restore destination, validation/backup, atomicity and recovery tests, alongside later native-dialog remainder. Preserve B-IMPORT-APPLY and B-DATA-DIALOGS separately; imported files remaining in import-staging do not fulfill full restore.

- **Migrated from**: v2.16#DF-89 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-90 - Settings tabs are still not URL-addressable

- **Source phase**: Phase 7 (7.2)
- **Plan reference**: sub-task 7.2
- **Reason**: 7.2 asks for a declarative tab registry with `/settings/:tab` routing, redirects, and lazy mounting. This phase added the Data tab to the existing hand-written button list and ternary chain instead. Deep links to a specific settings tab therefore still do not work, and `/profile` redirects to `/settings` rather than `/settings/profile`.
- **Suggested next step**: Convert the tab list to a registry with routing during the Phase 8 refactor; the tab bodies are already independent components.

- **Migrated from**: v2.2.0#DF-17 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.0#DF-17; still owed: Required implementation/qualification; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede to v2.2.3#DF-17 and prove V1; distinguish optional nested routes from required user behavior.

- **Migrated from**: v2.16#DF-90 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### MT-3 - Studio backend-down banner not covered by a page-level test

- **Source phase**: Phase 2 (2.2)
- **Plan reference**: sub-task 2.2
- **Reason**: The classifier, the hook, and the settings pages are covered, but no test renders `ImageStudioPage` / `VideoLabPage` with a stubbed `sidecar_status` reporting `running: false` to assert the banner replaces the "No image models installed" button. The pages read the status through a Tauri command that is absent under Vitest (`ipc-unavailable` -> unknown -> not down), so this needs an injectable seam.
- **Suggested next step**: Add a `sidecarStatus` prop (or a context provider) to the studio pages in Phase 6's shell work and assert both branches.

- **Migrated from**: v2.2.0#MT-3 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.0#MT-3; still owed: Required implementation/qualification; next: Implement page-level backend-down/up tests through supported seam and verify banner versus no-model button branch.

- **Migrated from**: v2.16#MT-3 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### MT-4 - Sidecar boot wiring (main.ts) covered only indirectly

- **Source phase**: Phase 1 (1.3)
- **Plan reference**: sub-task 1.3
- **Reason**: `applyRuntimeConfigEnv` is unit-tested, but the `main.ts` call site (applied before runtime construction, stderr log line) has no direct test - `main.ts` is the process entry and has no test harness today.
- **Suggested next step**: Cover via the Phase 2 sidecar-level integration test (spawn the built sidecar with a fixture `NEXUS_AI_HOME`/home and assert the boot log line).

- **Migrated from**: v2.2.0#MT-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.0#MT-1; still owed: Required implementation/qualification; next: Carry focused process integration task: spawn built sidecar against fixture runtime config/home, prove config applied before construction and expected log.

- **Migrated from**: v2.16#MT-4 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### MT-5 - Complete-page health detail line untested

- **Source phase**: Phase 1 (1.4)
- **Plan reference**: sub-task 1.4
- **Reason**: The Complete page now renders `state.desktop_health_detail`; existing complete-page tests pass but none assert the new detail string.
- **Suggested next step**: Add a QLabel-text assertion to the complete-page pytest when Phase 7 reworks settings/pages tests, or fold into the installer UI test pass.

- **Migrated from**: v2.2.0#MT-2 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.0#MT-2; still owed: Required implementation/qualification; next: Implement injected desktop_health_detail QLabel assertion, including failed health text and no misleading success state.

- **Migrated from**: v2.16#MT-5 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-91 - Packaged v2.2.9 chrome and catalog surfaces are unproven

- **Source phase**: v2.2.9 Phases 1-6
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.9-field-chrome-catalog-and-generate.md` (Operator field checklist)
- **Reason**: The v2.2.9 UI changes (meta above the bubble, orb caption rotator, studio Chats copy, visual Context bar, typed generate errors in the UI, catalog name-row pills, Hub sync staging) are unit-proven across the desktop, root, installer, and python diffusion suites. The final unsigned Windows installer was rebuilt during release preparation and passed version, registry, and embedded-desktop-payload probes, but those probes do not observe the seven visual/operator behaviors. The 2026-08-25 screenshots predate every Phase 1-6 change. not_observed != absent.
- **Suggested next step**: Run the plan's operator field checklist items 1-7 against the rebuilt unsigned Windows installer (chrome/picker split, meta and titles after `Hi`, composing pill, studio history and Context, typed generate outcome, installer = Settings cards, Hub banner/sync).

- **Migrated from**: v2.2.9#DF-36 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.9#DF-36; still owed: Required qualification; next: Carry packaged qualification: run all seven checks from `docs/archive/v2/v2.2/plans/v2.2.9-field-chrome-catalog-and-generate.md` on the current installer, binding captures to its digest.

- **Migrated from**: v2.16#DF-91 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### WN-4 - Root vitest run mutates the memory-tier benchmark fixture

- **Source phase**: v2.2.9 Phases 1-6 verification
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.9-field-chrome-catalog-and-generate.md` (Phase 7.7); commit `f7120ae`
- **Reason**: The root vitest suite rewrites timing fields in `tests/fixtures/memory-tier-benchmark-results/2026-05-26/results.json` on every run. Release preparation reproduced the timing-only drift during root coverage, desktop coverage, and the canonical package test run; the fixture was restored after verification. See commit `f7120ae`, `chore(tests): restore benchmark fixture mutated by root test run`, for the earlier occurrence.
- **Suggested next step**: Make the benchmark write its results to a temp directory instead of the tracked fixture, or gitignore the timing fields it mutates.

- **Migrated from**: v2.2.9#WN-8 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.9#WN-8; still owed: Required implementation; next: Prove resolved candidate with command A below and a before/after tracked-fixture hash. Concurrent implementation must be committed before recording closure.

- **Migrated from**: v2.16#WN-4 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### WN-5 - Desktop suite 5000ms-timeout flakes under host load

- **Source phase**: v2.2.9 Phases 1-6 verification
- **Plan reference**: WN-2 class (`docs/archive/v2/v2.2/plans/v2.2.3-glass-orbs-and-pillar-runtime.md` Phase 8.5)
- **Reason**: Under host load, desktop tests intermittently exceed the 5000ms per-test timeout across unrelated files. Observed twice this cycle; quiet-machine reruns pass all 1603 tests across 182 files. These are environment-load timeouts of the WN-2 renderer-environment class, not failed assertions.
- **Suggested next step**: Rerun the desktop suite on a quiet machine before treating a timeout as a regression; consider raising the timeout for known-slow suites or isolating the desktop job in CI.

- **Migrated from**: v2.2.9#WN-9 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.9#WN-9; still owed: Required qualification; next: Carry test reliability: retain failing test names and timings from a loaded full-suite reproduction, then fix the identified waits/contention; verify a serial and normal full run. Avoid raising every timeout without a reproduction.

- **Migrated from**: v2.16#WN-5 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### MT-6 - Per-phase line coverage was not measured this cycle

- **Source phase**: v2.2.9 Phases 1-6
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.9-field-chrome-catalog-and-generate.md` (phase stability gates)
- **Reason**: Desktop, root, installer, and Python suites passed at phase boundaries without coverage instrumentation. Aggregate root and desktop coverage passed during release preparation, but that final-state measurement cannot reconstruct the per-phase percentages the plan requested.
- **Suggested next step**: Require and record the applicable coverage command at each phase boundary in the next release plan so missing per-phase evidence cannot recur.

- **Migrated from**: v2.2.9#MT-4 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.9#MT-4; still owed: Historical limit; next: Carry historical evidence limit with an owner decision: either reproduce each pinned phase commit with coverage in isolation, or accept the unrecoverable historical omission and require coverage receipts on future phase boundaries. Current aggregate coverage cannot resolve it retroactively.

- **Migrated from**: v2.16#MT-6 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-92 - Typed diffusion error kinds are prose-only across the wire

- **Source phase**: v2.2.9 Phase 7 (Goal-vs-codebase review finding on Phase 4)
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.9-field-chrome-catalog-and-generate.md` (Phase 4.1)
- **Reason**: `RuntimeNotReady.kind` (`cuda-torch-missing` / `weights-missing` / `gpu-not-available`) is machine-readable inside Python, but `runtimes/diffusion/main.py` serializes only the message text, so TypeScript sees the classification as prose. The UI goal (operators can tell the cases apart) is met; downstream code cannot branch on kind.
- **Suggested next step**: If any consumer needs to branch on failure kind, add a `kind` field to the diffusion error envelope and thread it through `resultGuard`.

- **Migrated from**: v2.2.9#DF-37 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.9#DF-37; still owed: Optional candidate/watch; next: Implement if typed downstream classification is retained: add an error-kind field through runtime, sidecar, and result guard; prove with B. Otherwise record an explicit product decision that actionable prose is the complete contract.

- **Migrated from**: v2.16#DF-92 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-93 - Raw Tauri desktop bundles are not self-contained release artifacts

- **Source phase**: v2.2.9 release preparation
- **Plan reference**: release packaging audit; carried architectural gap DF-1 from v2.2.0
- **Reason**: `tauri.conf.json` packages the sidecar bundle but not Node. The desktop resolves Node through `NEXUS_NODE_PATH`, installer-written `~/.nexus/runtime.json`, the installer-provisioned path, then bare `node` on `PATH`; only the Python provisioning installer downloads checksummed Node 22.11.0 and writes the manifest. The sidecar's `better-sqlite3` targets Node ABI 127, so another system Node can spawn and then fail on the first SQLite open. The former universal macOS path also carried only one host-architecture native addon. Publishing those raw bundles would overstate standalone support, so v2.2.9 attaches only the complete Windows installer and three platform VSIXes.
- **Suggested next step**: Bundle a pinned per-target Node runtime through Tauri `externalBin` or resources, resolve it before installer/PATH fallbacks, build architecture-correct macOS artifacts, and pass clean-host sidecar health checks before restoring standalone desktop attachments.

- **Migrated from**: v2.2.9#DF-38 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.9#DF-38; still owed: Owner decision; next: Implement pinned per-target runtime packaging with clean-host qualification, or retain installer-only desktop publication explicitly. Requires per-target ABI and native-addon proof, not only a successful Tauri build.

- **Migrated from**: v2.16#DF-93 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### MT-7 - Publisher map and Agentic-pill guard have no cross-language parity test

- **Source phase**: v2.2.9 Phase 7 (Goal-vs-codebase review finding on Phase 5)
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.9-field-chrome-catalog-and-generate.md` (Phase 5.1, WN-7 discipline)
- **Reason**: `FAMILY_TO_PUBLISHER` is duplicated verbatim (27 entries, currently byte-identical) in installer `constants.py` and desktop `modelPills.ts`, but no test asserts full-map parity; only the 6 fixture families are cross-checked. The Agentic pill guards are also not textually identical (the installer's `type` field carries tab keys, so its condition has extra arms); they agree on the fixture and real catalog shapes but are not provably equivalent for arbitrary inputs.
- **Suggested next step**: Generate one side's map from the other (or add a parity test that reads both files), and align the Agentic guard inputs so the two conditions are structurally identical.

- **Migrated from**: v2.2.9#MT-5 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.9#MT-5; still owed: Required implementation; next: Implement full-map and Agentic-predicate parity using real catalog shapes plus malformed/missing fields; prove with C. Existing six-family fixtures do not establish whole-map equivalence.

- **Migrated from**: v2.16#MT-7 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-94 - Agents folders are a local overlay, not sidecar schema

- **Source phase**: v2.2.8 Phase 2
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.8-working-local-studio.md` (Phase 2.1, folders optional)
- **Reason**: `coding.session.*` has no folder rows. FolderTree on Agents uses `localStorage` (`nexus.coding.explorerFolders`) so New folder is not a dead control. Sessions stay in sidecar `sessions.json`. Deleting an overlay folder reparents sessions instead of calling `coding.session.delete`. Folders do not roam with the sidecar store.
- **Suggested next step**: If Agents folders must survive a storage wipe the same way Chatbot folders do, add a sidecar folder table keyed by workspace, or document overlay-only as the product contract.

- **Migrated from**: v2.2.8#DF-33 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.8#DF-33; still owed: Owner decision; next: Carry product decision: accept/document overlay-only semantics, or implement workspace-keyed durable folders and test deletion reparenting, restart, and storage export. Do not call existing local persistence a roaming store.

- **Migrated from**: v2.16#DF-94 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-95 - Packaged Settings vs installer Models identity is unproven

- **Source phase**: v2.2.8 Phase 4
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.8-working-local-studio.md` (Phase 4 Stability Gate)
- **Reason**: A shared golden fixture dual-asserts installer `collapse_and_sort` and desktop `visibleModelsOnTab`. Compact cards and the Downloaded highlight are unit-proven. The 2026-08-25 field session did screenshot packaged Settings (screenshot 9) next to the installer (screenshot 8), but both showed the pre-v2.2.9 divergent cards; that divergence is what drove v2.2.9 Phase 5's shared card grammar (name-row pills, Embeddings tab first, Inkling-Small in both). Those screenshots predate the new grammar and cannot close this row. not_observed != absent.
- **Suggested next step**: On a rebuilt packaged build, open Settings > Models and the installer Models tab on the same host and confirm both render the v2.2.9 shared name-row pill grammar with Embeddings first and Inkling-Small present (DF-36 field checklist item 6), plus Chat order, family collapse, gray over-budget last, and Gemma 4 12B Downloaded when `ollama list` has `gemma4:12b`.

- **Migrated from**: v2.2.8#DF-34 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.8#DF-34; still owed: Required qualification; next: Carry packaged side-by-side qualification: current installer and Settings, same catalog/owned models/host, with tab order, collapse, over-budget partition, and Downloaded state recorded. Can share an execution with v2.2.9#DF-36 without dropping either identity.

- **Migrated from**: v2.16#DF-95 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-96 - Packaged Settings and installer Context chips are unproven

- **Source phase**: v2.2.7 Phase 1
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.7-context-meter-and-transcript-chrome.md` (Phase 1)
- **Reason**: Closed in v2.2.9 Phase 7. The 2026-08-25 field session screenshotted the packaged Settings > Models tab (screenshot 9, chips rendering) and the running installer Models tab (screenshot 8, `Context: 256k`-class pills). Historical row kept so v2.2.7 readers can follow the close; the chip grammar itself was superseded by the v2.2.9 Phase 5 shared name-row pills.
- **Suggested next step**: None. See v2.2.9 Resolved DF-28 (new-grammar verification travels with DF-34 and DF-36).

- **Migrated from**: v2.2.7#DF-28 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.7#DF-28; still owed: Required qualification; next: Prove resolved marker candidate by verifying those historical references and narrowly marking the historical chip-render obligation. Preserve new-grammar qualification at v2.2.8#DF-34 and v2.2.9#DF-36.

- **Migrated from**: v2.16#DF-96 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-97 - Live Ollama usage and thinking fields are unproven

- **Source phase**: v2.2.7 Phase 2
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.7-context-meter-and-transcript-chrome.md` (Phase 2)
- **Reason**: Unit fixtures persist `prompt_eval_count` / `eval_count` / `message.thinking` onto the chat done event and round-trip chat/studio/coding stores. A live Gemma 4 Ollama final chunk was not captured this phase. Coding agent turns estimate when the runner does not attach counters. The 2026-08-25 field session (v2.2.9 plan screenshot 2) shows `75 think + 96 out` rendering on a packaged reply, which is consistent with live usage persist but does not verify that the persisted row matches the final Ollama chunk, so this row stays open. not_observed != absent.
- **Suggested next step**: Send one Chatbot turn against a local Ollama Gemma 4 model and confirm the persisted assistant row matches the final chunk; if thinking is in `message.thinking`, confirm it counts toward used tokens.

- **Migrated from**: v2.2.7#DF-29 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.7#DF-29; still owed: Required qualification; next: Carry live provider qualification: capture a real final Ollama response and the resulting persisted assistant turn, compare counters and thinking text, and distinguish request-wide from message-attributed usage.

- **Migrated from**: v2.16#DF-97 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-98 - Packaged four-tab Context meter and 80% CTA are unproven

- **Source phase**: v2.2.7 Phase 3
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.7-context-meter-and-transcript-chrome.md` (Phase 3)
- **Reason**: Component tests cover 79% without CTA, 80% CTA creating a new Chatbot session without deleting the old tree row, hidden bar when no window or visual budget, and pickers under `composer-context-row` on Chat/Agents/Images/Videos. Partially observed 2026-08-25: the Context pill rendered on packaged Chatbot (v2.2.9 plan screenshot 1, which also drove the Phase 1 width rebalance), but the 80% CTA was not observed, and Images/Videos showed no meter because pre-v2.2.9 studio rows had no visual budget (added in v2.2.9 Phase 3). Partial observation is an annotation, not a close. not_observed != absent.
- **Suggested next step**: On a rebuilt packaged build, send Chatbot turns until the pill reaches 80%, accept Start a new session, confirm the old chat remains; confirm the Images/Videos Context pill now fills against `visualTokenBudget` and that peeking does not load weights (DF-36 field checklist item 4).

- **Migrated from**: v2.2.7#DF-30 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.7#DF-30; still owed: Required qualification; next: Carry packaged interaction qualification: cross 80%, start a new session while preserving the old one, inspect all four surfaces, and verify opening the picker does not load weights.

- **Migrated from**: v2.16#DF-98 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-99 - Packaged transcript date, time, and token chrome is unproven

- **Source phase**: v2.2.7 Phase 4
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.7-context-meter-and-transcript-chrome.md` (Phase 4)
- **Reason**: Closed in v2.2.9 Phase 7. The 2026-08-25 field session (v2.2.9 plan screenshot 2) shows the packaged Chatbot transcript rendering the clock and per-role token chrome this row asked for (`8:34 p.m.`, user `1 in`, assistant `75 think + 96 out`). Historical row kept so v2.2.7 readers can follow the close; the `N in` / em-dash copy this row verified was superseded by v2.2.9 Phase 1 full-word meta above the bubble.
- **Suggested next step**: None. See v2.2.9 Resolved DF-31 (new-copy verification travels with DF-36).

- **Migrated from**: v2.2.7#DF-31 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.7#DF-31; still owed: Required qualification; next: Prove resolved marker candidate for the historical transcript format after validating that reference. New full-word metadata and its four-pillar rendering remain v2.2.9#DF-36.

- **Migrated from**: v2.16#DF-99 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### WN-6 - Context chip formatters are duplicated across TypeScript and Python

- **Source phase**: v2.2.7 Phase 1
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.7-context-meter-and-transcript-chrome.md` (T002)
- **Reason**: The desktop renderer cannot import the installer Python module. Matching tests lock `128k` and `32k / 8k` on both sides. Drift remains possible if one formatter is edited alone.
- **Suggested next step**: Keep the two test files in the same PR as any copy change, or generate Python copy from the TypeScript fixture in a later cleanup.

- **Migrated from**: v2.2.7#WN-7 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.7#WN-7; still owed: Optional candidate/watch; next: Prove the original drift-mitigation contract with C. If stronger generation/parity is required, supersede into v2.2.9#MT-5 with the context formatter cases explicitly retained; duplicated implementation alone is not a functional defect.

- **Migrated from**: v2.16#WN-6 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-100 - Packaged Explorer launch is unproven

- **Source phase**: carried from v2.2.5
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.6-session-memory-and-studio-history.md` (Phase 6.2)
- **Reason**: Closed in v2.2.8 Phase 6. Packaged Explorer launch was observed 2026-08-24 (v2.2.8 plan Review verdict). Historical row kept so v2.2.6 readers can follow the close.
- **Suggested next step**: None. See v2.2.8 Resolved DF-2.

- **Migrated from**: v2.2.6#DF-2 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.6#DF-2; still owed: Required qualification; next: Prove resolved marker candidate by verifying `docs/archive/v2/v2.2/plans/v2.2.8-working-local-studio.md` Review verdict and matching release artifact.

- **Migrated from**: v2.16#DF-100 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-101 - Live GPU image/video generate is unproven

- **Source phase**: carried from v2.2.5
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.6-session-memory-and-studio-history.md` (operator field checklist)
- **Reason**: Fail-closed envelopes and last-output follow-up are unit-proven. An operator GPU generate that paints a SANA image or a video clip was not recorded this session. Still open after the 2026-08-25 field session: screenshot 7 (v2.2.9 plan) recorded a packaged Image generate fail-closing with the combined `GPU or diffusion weights unavailable` string on a host showing 15 GB free NVIDIA VRAM; that observes fail-closed behavior, not a generate. v2.2.9 Phase 4 has since split that combined string into typed CUDA-missing vs weights-missing vs GPU-not-ready messages, so the operator will now see one of the typed strings instead.
- **Suggested next step**: Run one Image Studio generate and one Video Lab generate on a host with weights and CUDA-enabled diffusion Python, and record the PNG/MP4; or confirm the new typed CUDA/weights/GPU message in the UI (DF-36 field checklist item 5). The combined-only string is now a miss.

- **Migrated from**: v2.2.6#DF-4 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.6#DF-4; still owed: Required qualification; next: Carry remaining packaged UI qualification, retaining the historical artifact evidence as a partial. Observe image and video output, or the specific permitted typed failure in the current UI, without representing a failure as a successful generate.

- **Migrated from**: v2.16#DF-101 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-102 - Packaged session persist (quit/reopen) is unproven

- **Source phase**: v2.2.6 Phases 1-5
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.6-session-memory-and-studio-history.md` (Phase 6.2)
- **Reason**: Image/Video SQLite, Agents `sessions.json`, and Chatbot explorer DB round-trips are unit-proven. A packaged Explorer quit/reopen soak was not run. The 2026-08-25 field session (v2.2.9 plan) did not include a quit/reopen, so this row is unchanged. not_observed != absent.
- **Suggested next step**: Install the unsigned Windows build, take one turn in each pillar, quit, reopen, and record whether the same session hydrates.

- **Migrated from**: v2.2.6#DF-25 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.6#DF-25; still owed: Required qualification; next: Carry packaged persistence qualification: create a turn in each pillar, record IDs and outputs, quit the process, reopen, and compare hydrated sessions without test-injected stores.

- **Migrated from**: v2.16#DF-102 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-103 - Video remount cannot restore `continueFrom`

- **Source phase**: v2.2.6 Phase 3
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.6-session-memory-and-studio-history.md` (Phase 3)
- **Reason**: `continueFrom` needs `priorJobId`. The studio session schema stores `lastOutputRef` (mp4 path), not the job id. After remount, a follow-up is a new text2video. `lastFramePath` is that mp4 path; there is no frame extractor.
- **Suggested next step**: Persist `priorJobId` (or a generations-index job key) on the session row, or extract a last-frame PNG and document the quality limit.

- **Migrated from**: v2.2.6#DF-26 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.6#DF-26; still owed: Required implementation; next: Implement durable generation-job linkage and continuation restoration, including older rows and missing/deleted job cases; prove with D and a real runtime-boundary continuation flow.

- **Migrated from**: v2.16#DF-103 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-104 - Agents resume does not restore tool-call cards

- **Source phase**: v2.2.6 Phase 4
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.6-session-memory-and-studio-history.md` (Phase 4)
- **Reason**: Sidecar persist stores user prompt plus concatenated assistant token text. `toolCallHeader` / arg deltas / complete events are not written. Resume shows the transcript, not the tool cards from the live stream.
- **Suggested next step**: Persist a compact tool-card snapshot per turn, or accept text-only resume for this cycle.

- **Migrated from**: v2.2.6#DF-27 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.6#DF-27; still owed: Required implementation; next: Implement durable bounded tool-card snapshots and hydrate them through IPC/rendering, or obtain an explicit text-only-resume product decision. Prove with E; do not persist secrets/raw unbounded tool results.

- **Migrated from**: v2.16#DF-104 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-105 - Packaged Explorer launch is unproven

- **Source phase**: carried from v2.2.4
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.5-first-successful-generation.md` (Phase 6.2)
- **Reason**: Closed in v2.2.8 Phase 6. Packaged Explorer launch was observed 2026-08-24 (v2.2.8 plan Review verdict). Historical row kept so v2.2.5 readers can follow the close.
- **Suggested next step**: None. See v2.2.8 Resolved DF-2.

- **Migrated from**: v2.2.5#DF-2 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.5#DF-2; still owed: Required qualification; next: Prove resolved marker candidate using the same v2.2.8 historical evidence; retain both distinct source identities in the disposition record.

- **Migrated from**: v2.16#DF-105 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-106 - Live GPU image/video generate is unproven

- **Source phase**: v2.2.5 Phase 2
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.5-first-successful-generation.md` (Phase 2 field gate)
- **Reason**: Fail-closed envelopes are unit-proven. An operator GPU generate that paints a SANA image was not recorded this session.
- **Suggested next step**: Run one Image Studio generate on a host with weights and GPU, or confirm the typed runtime-not-ready string in the UI when GPU is absent.

- **Migrated from**: v2.2.5#DF-4 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.5#DF-4; still owed: Required qualification; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede into v2.2.6#DF-4 only with the SANA-specific or permitted typed-failure obligation preserved. Otherwise carry a SANA packaged observation.

- **Migrated from**: v2.16#DF-106 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-107 - Packaged Hub Update against a live git clone is not executed

- **Source phase**: v2.2.4 Phase 6 / 7
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.4-chatbot-first-and-runtime-honesty.md` (Phase 6 residual, Phase 7.2)
- **Reason**: Vitest and Rust prove `skills.sync` waits up to 10 minutes and Hub timeout copy. A packaged Windows build pulling a real Nexus-Hub clone over the network was not run. Still open after the 2026-08-25 field session: screenshot 10 (v2.2.9 plan) shows packaged Active matching GitHub latest `v3.21.0` (which closed DF-35), but no clone log was captured and the tag could have come from the pack-time snapshot, so the live git-clone Update path remains undistinguished. not_observed != absent; packaged Hub update over a live clone is unproven here.
- **Suggested next step**: Run Update now from a packaged shell with network, confirm the clone finishes, and capture log evidence.

- **Migrated from**: v2.2.4#DF-23 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.4#DF-23; still owed: Required qualification; next: Carry packaged/network qualification: run Update against a real clone, capture completion and clone/sync logs, preserve quarantine behavior, and bind evidence to current artifact. Requires an authorized live sync; none ran in this audit.

- **Migrated from**: v2.16#DF-107 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-108 - Unix installer complete-path snapshot write is not proven

- **Source phase**: v2.2.4 Phase 7
- **Plan reference**: `docs/archive/v2/v2.2/plans/v2.2.4-chatbot-first-and-runtime-honesty.md` (Phase 7.4)
- **Reason**: `write_selection_snapshot` lives on the shared Python `RuntimeProvisioner` used by the Windows-first installer. This repo has no separate macOS/Linux complete-path writer. Unix hosts that never run that engine do not get `~/.nexus/selected-models.json` from install. Do not claim cross-OS installer parity.
- **Suggested next step**: If a Unix GUI/script install path is added, call the same writer from that complete step and add a fixture test.

- **Migrated from**: v2.2.4#DF-24 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.2.4#DF-24; still owed: Optional candidate/watch; next: Carry macOS/Linux qualification: trace each shipping platform installer to this writer, add platform completion integration fixtures, and observe the resulting selected-models file on native hosts. Do not infer Unix parity from the Windows engine.

- **Migrated from**: v2.16#DF-108 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### MT-8 - Packaged transcript gutters and pill glow are not observed

- **Source phase**: Phase 1 - Transcript Gutters and Thinking Pill
- **Impact**: The gutter is proven as one `paddingInline` on the list with no downstream inset, and list, row, and pending are all overflow-visible. jsdom does not lay out a packaged transcript, so whether the glow is uncropped at 100% and 150% zoom is not observed here.
- **Owner**: Operator, next packaged build
- **Next step**: Operator item 1. Supersedes v2.4.3 MT-3, which stated the same limit against the 12px inset this phase deleted.

- **Migrated from**: v2.4.4#MT-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.4#MT-1; still owed: Required qualification; next: Carry packaged visual qualification: measured list/row/pill bounds and captured glow at both zooms. This is the current explicit superseding identity for v2.4.3#MT-3.

- **Migrated from**: v2.16#MT-8 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### MT-9 - Packaged hairline centering and title inset are not observed

- **Source phase**: Phase 2 - History Hairline, Title Inset, and Bulk Actions
- **Impact**: Tests pin one symmetric `marginBlock` on the rule, zero padding-top on the tree header, and a chat title as the first node after the selection rail. Pixel spacing in a packaged window is not observed here. Archive All and Delete All are proven against an in-memory client, including chats inside collapsed folders, but not against the real IPC store.
- **Owner**: Operator, next packaged build
- **Next step**: Operator item 2. Supersedes v2.4.3 MT-2.

- **Migrated from**: v2.4.4#MT-2 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.4#MT-2; still owed: Required qualification; next: Carry packaged/IPC qualification: measure hairline/title inset and exercise archive/delete-all including collapsed folders, with controlled disposable sessions. Preserve v2.4.3#MT-2's dialog-centering obligation when reconciling.

- **Migrated from**: v2.16#MT-9 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### MT-10 - Packaged NVIDIA restyle identity is not observed

- **Source phase**: Phase 3 - Image Restyle Identity on the GPU
- **Impact**: Four contributors are fixed and each is pinned by a test: the parser accepts trailing punctuation, the send always resolves to img2img with the identity prompt or fails closed, strength 0 survives, the seed is forwarded, and a pipeline that echoes its source raises `unchanged-output`. Whether a real SANA/SDXL img2img at strength 0.85 produces black fur on this host is not observed here.
- **Owner**: Operator, next packaged build
- **Next step**: Operator item 3. Supersedes v2.4.3 MT-6; this is the third cycle to carry it.

- **Migrated from**: v2.4.4#MT-3 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.4#MT-3; still owed: Required qualification; next: Carry GPU visual qualification: capture input/output and request parameters, verify changed pixels and retained identity on a supported current pipeline, bound to model/runtime versions.

- **Migrated from**: v2.16#MT-10 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### MT-11 - Live SANA import on the 0.36.0 pin is not observed

- **Source phase**: Phase 4 - SANA Family Diffusers Pin
- **Impact**: 0.36.0 was verified from published wheels to contain the SANA video pipeline modules and to export both class names, and to declare no torch or transformers upper bound. `from diffusers import SanaPipeline, SanaVideoPipeline` has not been executed in a provisioned venv, because Diffusers resolves pipelines lazily and the probe needs the full media runtime.
- **Owner**: Operator, next packaged build
- **Next step**: Operator item 4. Supersedes v2.4.3 MT-7.

- **Migrated from**: v2.4.4#MT-4 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.4#MT-4; still owed: Required qualification; next: Carry runtime qualification: execute both SanaPipeline and SanaVideoPipeline imports in the provisioned pinned environment. Preserve the older actual-clip-or-missing-file obligation separately when superseding v2.4.3#MT-7.

- **Migrated from**: v2.16#MT-11 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### MT-12 - Packaged generation liveness is not observed

- **Source phase**: Phase 5 - Generation Liveness and Studio Captions
- **Impact**: The reader is proven to answer `health` while a job is inside its handler, heartbeats are proven to emit and stop, and a pending studio orb is proven unpaused. Whether the packaged freeze is fully explained by the blocked reader, or partly by GPU compositor starvation on a 16 GB laptop, is not established. No headroom value was changed, deliberately, because there is no evidence for choosing one.
- **Owner**: Operator, next packaged build
- **Next step**: Operator item 5. If the window still stalls with the reader unblocked, compositor VRAM is the remaining hypothesis and `workingMemReserveGB` becomes the next lever.

- **Migrated from**: v2.4.4#MT-5 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.4#MT-5; still owed: Required qualification; next: Carry live GPU/UI qualification: run a real job while interacting with the window and recording responsiveness/captions/terminal outcome; measure headroom before changing reserves.

- **Migrated from**: v2.16#MT-12 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### MT-13 - Packaged Settings density is not observed

- **Source phase**: Phase 6 - Settings Models Density and Details
- **Impact**: Tests pin search inside the tab row container, a centered horizontal action row, no card min-height, split pill label/value colours, and Best for as bullets. Real-viewport card height and wrap behaviour at the packaged Settings width are not observed here.
- **Owner**: Operator, next packaged build
- **Next step**: Operator item 6. Supersedes v2.4.3 MT-4.

- **Migrated from**: v2.4.4#MT-6 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.4#MT-6; still owed: Required qualification; next: Carry current packaged density qualification. Can supersede older Settings pixel rows into one later identity only if all surviving viewport/wrap/color/card obligations are enumerated there.

- **Migrated from**: v2.16#MT-13 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### QG-3 - Develop-targeted pull requests now run the full merge-result gate (resolved)

- **Resolved**: 2026-08-31 in Phase 7, with explicit operator approval.
- **Evidence**: Carried from v2.4.3 QG-5. Every substantive workflow filtered `pull_request` to `main`, so PR 58 (which targets `develop`) ran only commitlint: the push trigger tested the branch head, but the merge result was never tested. `develop` was added to the `pull_request.branches` filter of `ci.yml`, `shell-build.yml`, `installer-tests.yml`, `coverage-diff.yml`, and `pr-quality.yml`; no job logic changed. Confirmed by observation, not assertion: `gh pr checks 58` now reports 42 pass, 1 skipping (path-gated `init.ps1`), 0 fail on head `4b1771da`, against a pull request that previously ran one check.

- **Migrated from**: v2.4.4#QG-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.4#QG-1; still owed: Required qualification; next: Prove resolved marker candidate for develop merge-result coverage, verifying historical check evidence. Preserve current CI topology/protection concerns at v2.4.9#QG-2 and #QG-3.

- **Migrated from**: v2.16#QG-3 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### MT-14 - Packaged installer two-column layout and Unsloth lock are not observed

- **Source phase**: Phase 1 - Installer Two-Column Layout and Unsloth Lock
- **Plan reference**: [v2.4.3-field-density-identity-and-runtime.md](../../../archive/v2/v2.4/plans/v2.4.3-field-density-identity-and-runtime.md) T001 / 1.1
- **Reason**: Pytest proves two-column widgets, Unsloth disabled when Incompatible, Compatible after NVIDIA 16384 on showEvent, Review 16 GB, and the renamed time label. A packaged wizard run on this host is not recorded here.
- **Suggested next step**: Last-phase operator item (Configuration two columns and Unsloth Compatible on this 16 GB NVIDIA host).

- **Migrated from**: v2.4.3#MT-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.3#MT-1; still owed: Required qualification; next: Carry current packaged wizard qualification, recording which old layout requirements were superseded by the committed wizard redesign, and proving compatible/incompatible selection behavior without inferring geometry headlessly.

- **Migrated from**: v2.16#MT-14 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### MT-15 - Hairline pixels and delete-dialog centering are not proven in jsdom

- **Source phase**: Phase 2 - History Chrome, Selection, Titles, and Delete Overlay
- **Plan reference**: [v2.4.3-field-density-identity-and-runtime.md](../../../archive/v2/v2.4/plans/v2.4.3-field-density-identity-and-runtime.md) T007 / 2.1
- **Reason**: Tests assert the hairline node on `/images` (absent on Settings), New chat `onSelect`/`onOpenChat`, a pre-created Image title change, and `folder-tree-confirm-delete` as a child of `document.body`. jsdom does not layout a packaged window so the hairline's appearance and the dialog's visual center are not observed here.
- **Suggested next step**: Last-phase operator items (hairline under tabs; New chat selects empty; Image first prompt titles the row; delete dialog centered).

- **Migrated from**: v2.4.3#MT-2 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.3#MT-2; still owed: Required qualification; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede into v2.4.4#MT-2 only after attaching dialog-centering and new-session/title obligations to the destination; otherwise keep those as a specific remaining qualification.

- **Migrated from**: v2.16#MT-15 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### MT-16 - Thinking-pill glow pixel containment is not proven in jsdom

- **Source phase**: Phase 3 - Thinking Pill Geometry
- **Plan reference**: [v2.4.3-field-density-identity-and-runtime.md](../../../archive/v2/v2.4/plans/v2.4.3-field-density-identity-and-runtime.md) T013 / 3.1
- **Reason**: Tests pin min-width to `Searching...`, a 12 px left inset, and overflow visible on the pill host and chat pending row. jsdom does not layout a packaged transcript, so glow pixels vs the pane edge are not observed here. v2.4.2 MT-1 remains the prior-cycle statement of the same limit.
- **Suggested next step**: Last-phase operator item (thinking pill glow at 100% and 150% zoom).

- **Migrated from**: v2.4.3#MT-3 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.3#MT-3; still owed: Required qualification; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede into v2.4.4#MT-1, retaining packaged glow containment at 100% and 150% as the owed proof. This is supersession, not a statement that pixels were observed.

- **Migrated from**: v2.16#MT-16 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### MT-17 - Packaged Settings compact-card nowrap and icon colors are not observed

- **Source phase**: Phase 4 - Settings Models Compact Cards
- **Plan reference**: [v2.4.3-field-density-identity-and-runtime.md](../../../archive/v2/v2.4/plans/v2.4.3-field-density-identity-and-runtime.md) T016 / 4.1
- **Reason**: Tests pin a nowrap facts row without Company/License pills, pills inside Details, and green / red / blue action colors via inline style. A packaged Settings screenshot is not recorded here.
- **Suggested next step**: Last-phase operator item (Settings one facts line and icon colors).

- **Migrated from**: v2.4.3#MT-4 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.3#MT-4; still owed: Required qualification; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede into v2.4.4#MT-6 with still-applicable color/wrap requirements carried explicitly; document any later deliberate grammar replacement.

- **Migrated from**: v2.16#MT-17 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### MT-18 - Packaged Agents picker order and empty-session default are not observed

- **Source phase**: Phase 5 - Shared Picker Rank and Default
- **Plan reference**: [v2.4.3-field-density-identity-and-runtime.md](../../../archive/v2/v2.4/plans/v2.4.3-field-density-identity-and-runtime.md) T020 / 5.1
- **Reason**: Tests prove `resolveDefaultId` prefers `gemma-4-12b-it-gguf` over a gpt-oss favorite, and QuickModelSwitcher lists Gemma before gpt-oss at 16 GB with recommendOrder. A packaged Agents screenshot on this host is not recorded here.
- **Suggested next step**: Last-phase operator item (Agents empty session defaults to Gemma 4 12B on this install).

- **Migrated from**: v2.4.3#MT-5 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.3#MT-5; still owed: Required qualification; next: Carry packaged picker qualification: fresh owned-model snapshot, empty Agents session, expected Gemma default and recommend order. Can share execution with v2.4.8#MT-5 without silently dropping this identity.

- **Migrated from**: v2.16#MT-18 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### MT-19 - Packaged NVIDIA restyle identity is not observed

- **Source phase**: Phase 6 - Image Restyle Identity
- **Plan reference**: [v2.4.3-field-density-identity-and-runtime.md](../../../archive/v2/v2.4/plans/v2.4.3-field-density-identity-and-runtime.md) T024 / 6.1
- **Reason**: Tests prove restyle strength 0.7, identity prompt, no SAM2, and fail-closed without last output. A packaged NVIDIA before/after of "Make the puppy black" is not recorded here. v2.4.2 MT-3 remains the prior-cycle statement of the same limit.
- **Suggested next step**: Last-phase operator item (Make the puppy black restyles fur).

- **Migrated from**: v2.4.3#MT-6 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.3#MT-6; still owed: Required qualification; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede into v2.4.4#MT-3, preserving before/after puppy identity and actual recoloring as the acceptance test.

- **Migrated from**: v2.16#MT-19 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### MT-20 - Packaged NVIDIA SANA-Video clip is not observed

- **Source phase**: Phase 7 - SANA-Video Layout and Executor
- **Plan reference**: [v2.4.3-field-density-identity-and-runtime.md](../../../archive/v2/v2.4/plans/v2.4.3-field-density-identity-and-runtime.md) T028 / 7.1
- **Reason**: Tests prove a complete SANA fixture loads SanaVideoPipeline with local_files_only and never WanPipeline, an incomplete tree names the missing path, catalog files include model_index.json plus scheduler/tokenizer/VAE, and 16 GB default video stays wan2.1-t2v-1.3b. A packaged NVIDIA generate of sana-video-2b-720p is not recorded here.
- **Suggested next step**: Last-phase operator item (opt-in SANA-Video either plays a clip or names a real missing file).

- **Migrated from**: v2.4.3#MT-7 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.3#MT-7; still owed: Required qualification; next: Carry the output obligation, or supersede into v2.4.4#MT-4 only if that exact output condition is added. Do not discharge generation with an import.

- **Migrated from**: v2.16#MT-20 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### MT-21 - Thinking-pill pixel containment is not proven in jsdom layout

- **Source phase**: Phase 1 - Sidebar History Host and Shared Chrome
- **Plan reference**: [v2.4.2-field-ui-history-and-generation.md](../../../archive/v2/v2.4/plans/v2.4.2-field-ui-history-and-generation.md) T005 / 1.5
- **Reason**: jsdom does not layout. The Phase 1 test asserts overflow visible, sibling pill chrome (so `border-radius: 999px` is not on the canvas host), and `rectFullyInside` with mocked boxes. A real `getBoundingClientRect()` crop cannot be observed here.
- **Suggested next step**: Phase 7 operator item 1 (thinking pill at 100% and 150% zoom) is the layout proof.

- **Migrated from**: v2.4.2#MT-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.2#MT-1; still owed: Required qualification; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede into v2.4.4#MT-1 with both zoom levels and actual measured/captured containment retained.

- **Migrated from**: v2.16#MT-21 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### MT-22 - Composer stick-to-bottom is proven on a mocked scroller, not a live pane

- **Source phase**: Phase 2 - Transcript Honesty
- **Plan reference**: [v2.4.2-field-ui-history-and-generation.md](../../../archive/v2/v2.4/plans/v2.4.2-field-ui-history-and-generation.md) T009 / 2.1
- **Reason**: `useStickToBottom` tests assign `scrollHeight` / `clientHeight` and assert `stickNow` sets `scrollTop`. They do not layout Chat, Agents, Image, or Video overflow panes with real content height after send.
- **Suggested next step**: Phase 7 operator send on each of the four tabs and confirm the new user turn is in view unless the user scrolled up.

- **Migrated from**: v2.4.2#MT-2 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.2#MT-2; still owed: Required qualification; next: Carry real pane interaction qualification: send in all four pillars, observe latest turn when at bottom, and preserve position when deliberately scrolled up.

- **Migrated from**: v2.16#MT-22 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### MT-23 - Packaged img2img identity for "Make that puppy black" is not observed

- **Source phase**: Phase 3 - Image Follow-up Identity
- **Plan reference**: [v2.4.2-field-ui-history-and-generation.md](../../../archive/v2/v2.4/plans/v2.4.2-field-ui-history-and-generation.md) T016 / 3.1
- **Reason**: Automated tests prove img2img against last PNG bytes, strength 0.45, and no SAM2 for that phrase. A packaged NVIDIA run that the same puppy is recolored rather than resampled is not recorded here.
- **Suggested next step**: Phase 7 operator item: generate a puppy, send "Make that puppy black" with no attachment, capture before/after.

- **Migrated from**: v2.4.2#MT-3 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.2#MT-3; still owed: Required qualification; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede into v2.4.4#MT-3 with input/output identity and recoloring preserved. Do not claim the obsolete 0.45 path was field-proven.

- **Migrated from**: v2.16#MT-23 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### MT-24 - Packaged empty-video fail-closed is not observed

- **Source phase**: Phase 4 - Video Fail-Closed Output
- **Plan reference**: [v2.4.2-field-ui-history-and-generation.md](../../../archive/v2/v2.4/plans/v2.4.2-field-ui-history-and-generation.md) T020 / 4.1
- **Reason**: Automated tests prove persist of the playable-clip error, Settings > Models on missing weights, and fail-closed when `resolveMp4Url` is empty. A packaged NVIDIA run that a first puppy-in-grass turn never paints an empty success bubble is not recorded here.
- **Suggested next step**: Phase 7 operator item: send a Video Lab prompt that cannot produce a clip (missing weights or empty path) and capture the written failure.

- **Migrated from**: v2.4.2#MT-4 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.2#MT-4; still owed: Required qualification; next: Carry packaged fail-closed qualification with a controlled missing-output case, then remount and verify written error remains; do not report an empty success bubble as success.

- **Migrated from**: v2.16#MT-24 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### MT-25 - Settings Models density is not proven on a real viewport

- **Source phase**: Phase 5 - Settings Models Density
- **Plan reference**: [v2.4.2-field-ui-history-and-generation.md](../../../archive/v2/v2.4/plans/v2.4.2-field-ui-history-and-generation.md) T024 / 5.1
- **Reason**: Tests assert the catalog fingerprint is absent, chrome gap is `--space-1`, and card padding is `--space-2`. jsdom does not layout two downloaded cards against a packaged window height.
- **Suggested next step**: Phase 7 operator item 8 (Settings Models density).

- **Migrated from**: v2.4.2#MT-5 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.2#MT-5; still owed: Required qualification; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede into v2.4.4#MT-6 with actual viewport sizing and no unwanted wrapping/overflow preserved.

- **Migrated from**: v2.16#MT-25 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### MT-26 - Live installer VRAM / Unsloth / VS Code merge is not observed

- **Source phase**: Phase 6 - Installer VRAM, Unsloth, and VS Code Merge
- **Plan reference**: [v2.4.2-field-ui-history-and-generation.md](../../../archive/v2/v2.4/plans/v2.4.2-field-ui-history-and-generation.md) T028 / 6.1
- **Reason**: Pytest pins 16384 and 15360 display as 16 GB, Unsloth Compatible/Incompatible before opt-in, and a 7-step route with the VS Code checkbox on Configuration. A packaged wizard run on this NVIDIA host is not recorded here.
- **Suggested next step**: Phase 7 operator item 9 (installer GPU line shows whole GB and Unsloth badge on the same page as VS Code).

- **Migrated from**: v2.4.2#MT-6 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.2#MT-6; still owed: Required qualification; next: Carry native packaged wizard qualification, preserving whole-GB GPU, compatibility badge, and extension option visibility even if their page placement was deliberately redesigned.

- **Migrated from**: v2.16#MT-26 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-109 - Reasoning disclosure is not observed with a thinking-capable local model

- **Source phase**: Phase 3 and Phase 8 human testing
- **Plan reference**: Phase 8.7 operator item 6
- **Reason**: Component and hydration tests prove collapsed-by-default disclosure, keyboard access, absence when no reasoning exists, and token tooltip detail. No local provider turn with separate reasoning content was run here.
- **Owner / next evidence**: Desktop operator. Use a catalog model that emits separate reasoning, confirm the disclosure expands without moving reasoning into the answer bubble, and capture collapsed and expanded states.

- **Migrated from**: v2.4.1#DF-3 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.1#DF-3; still owed: Required qualification; next: Carry live model/packaged qualification: use an installed reasoning-capable model and capture collapsed/expanded states without moving reasoning into answer text.

- **Migrated from**: v2.16#DF-109 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-110 - Archive, delete, reset, and restore are not observed across all four pillars

- **Source phase**: Phase 4 and Phase 8 human testing
- **Plan reference**: Phase 8.7 operator item 7
- **Reason**: Store, IPC, cancellation, late-event, and page-reset tests cover Chatbot, Agents, Images, and Videos. A packaged four-pillar operator matrix was not run.
- **Owner / next evidence**: Desktop operator. Complete checklist item 7 and record one session id per pillar plus the reset and restore result.

- **Migrated from**: v2.4.1#DF-4 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.1#DF-4; still owed: Required qualification; next: Carry real-boundary session matrix with disposable sessions, IDs, cancellation/late-event checks, restart, and restore outcomes across all four pillars.

- **Migrated from**: v2.16#DF-110 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-111 - Installer/Settings visual parity and live disk-meter change are not observed

- **Source phase**: Phase 5 and Phase 8 human testing
- **Plan reference**: Phase 8.7 operator item 8
- **Reason**: The prior packaged field run exposed Nomic as incorrectly required and incompatible rows above compatible rows. The replacement makes EmbeddingGemma 300M the required/default app-wide embedder and compatibility the first ordering partition in installer and Settings. Automated shared-policy tests pass; replacement visual parity and an observed free-space change after model install/remove are not recorded.
- **Owner / next evidence**: Release operator. Capture the same model in both surfaces, then install/remove it and record the disk meter before and after.

- **Migrated from**: v2.4.1#DF-5 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.1#DF-5; still owed: Required qualification; next: Carry packaged parity plus disk qualification; no model download/remove was authorized for this audit. Record current digest, same-model screenshots, free-space deltas, and cleanup.

- **Migrated from**: v2.16#DF-111 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-112 - Native folder pickers outside Windows are not observed

- **Source phase**: Phase 7
- **Plan reference**: Phase 8.7 operator item 9
- **Reason**: The Tauri command and frontend cancellation/stale-result behavior are automated. macOS and Linux picker behavior was not run on native hosts.
- **Owner / next evidence**: Platform operator. On macOS and Linux, select, cancel, and rapidly reopen the picker and record the resulting workspace chips.

- **Migrated from**: v2.4.1#DF-6 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.1#DF-6; still owed: Required qualification; next: Carry native OS qualification with workspace-chip and stale-result evidence on both platforms.

- **Migrated from**: v2.16#DF-112 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-113 - Windows multi-root OS sandbox confinement remains partial

- **Source phase**: Phase 6 and Phase 8 human testing
- **Plan reference**: Phase 8.7 operator item 9
- **Reason**: Canonical path guards and scoped tool tests allow both selected roots and deny outside paths. The Windows sandbox backend still does not kernel-enforce filesystem or network confinement, so the support tier remains partial even when the UI and path guard behave correctly.
- **Owner / next evidence**: Security owner. Keep the existing loud partial/unconfined status. A later sandbox phase must add kernel-enforced Windows filesystem and network boundaries before claiming confined support.

- **Migrated from**: v2.4.1#DF-7 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.1#DF-7; still owed: Optional candidate/watch; next: Carry security implementation: kernel filesystem/network boundary with adversarial outside-root/network tests, or explicit partial-support contract. Preserve the loud partial label meanwhile.

- **Migrated from**: v2.16#DF-113 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### QG-4 - Indexed skill catalog paths remain absent from this checkout

- **Source phase**: Phase 8 architecture, known-gaps, docs layout, and CI reconciliation; generation-recovery Phase 7
- **Plan reference**: Phase 8.1-8.5 and generation-recovery T089-T093
- **Reason**: The plan-indexed `catalog/skills/...` paths and the repository `.agents/skills` bundle still do not contain `project-refactor`, `docs-layout-refactor`, `known-gaps-tracker`, `cicd-architect`, `verification-before-completion`, or `dev-progress-tracker`. This Phase 7 session loaded the user-level copies under `C:\Users\bdour\.agents\skills` and followed those procedures. The repo-local mapping is still missing.
- **Suggested next step**: Vendor or map the canonical skill files into the repository catalog before the next planning session, or update plan templates to the user-level install path.

- **Migrated from**: v2.4.1#QG-2 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.1#QG-2; still owed: Required implementation; next: Implement portable discovery/mapping or correct plan templates to an installed-path resolver; verify all named skills resolve without falsely claiming a vendored bundle exists.

- **Migrated from**: v2.16#QG-4 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### QG-5 - Develop-targeted pull requests miss several merge-result workflows

- **Source phase**: Generation-recovery Phase 7 terminal CI comparison
- **Plan reference**: T093
- **Reason**: `ci.yml`, `installer-tests.yml`, `shell-build.yml`, `pr-quality.yml`, `coverage-diff.yml`, and `codeql.yml` limit `pull_request.branches` to `main`. Feature-branch `push` still runs `ci.yml` and path-gated installer tests, and `commitlint.yml` runs on any PR. There is no always-resolving aggregate required-check job, and `package.json` has no `fast` / `full` / `platform` / `report` / `release` profile scripts. Workflow files were not changed; silence is not approval.
- **Suggested next step**: After explicit approval, add `develop` to the listed `pull_request.branches` (or an aggregate gate job) in the smallest set of workflows that must validate the merge result. Record any remaining profile-script differences as environment-only.

- **Migrated from**: v2.4.1#QG-5 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.1#QG-5; still owed: Required qualification; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede into resolved v2.4.4#QG-1 for the branch-filter problem after historical evidence verification; keep aggregate/protection differences at v2.4.9#QG-2/#QG-3.

- **Migrated from**: v2.16#QG-5 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### QG-6 - Model-prompting freshness helper is absent

- **Source phase**: Generation-recovery Phase 7 advisory governance check
- **Plan reference**: implement-phase 9.0 duty 8
- **Reason**: `python scripts/check_model_prompting_freshness.py --advisory` cannot run because the file is absent. The duty is advisory and does not block the phase.
- **Suggested next step**: Add the helper in a later tooling change, or keep the logged no-op.

- **Migrated from**: v2.4.1#QG-6 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.1#QG-6; still owed: Optional candidate/watch; next: Carry advisory tooling decision: add a local helper with explicit date/source contract and tests, or document the advisory no-op. No model guidance freshness was verified here.

- **Migrated from**: v2.16#QG-6 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-114 - Packaged Windows clean and repair installer behavior is not observed

- **Source phase**: Phase 1 and Phase 8 human testing
- **Plan reference**: Phase 8.7 operator items 1-3
- **Reason**: The prior packaged field run exposed imperceptible fixed-value motion, low percentage contrast, and hidden finalization work that left the bar at 73% while visible groups said Done. The replacement implements and tests a repeating liquid gradient, contrast capsule, and complete visible step mapping, and its frozen smoke passes. A clean/repair visual run of the replacement is not observed.
- **Owner / next evidence**: Release operator. Run checklist items 1-3 on a clean Windows Sandbox and an existing Nexus install, then attach screenshots and `nexus-install-nexus-desktop-log.txt`.

- **Migrated from**: v2.4.1#DF-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.1#DF-1; still owed: Required qualification; next: Carry packaged clean/repair qualification with screenshots and install log on an isolated clean host and existing installation.

- **Migrated from**: v2.16#DF-114 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-115 - Wan and SDXL are not re-smoked on the new Diffusers pin

- **Source phase**: Phase 4 - SANA Family Diffusers Pin
- **Impact**: The pin change touches every Image and Video model on the host, not only SANA. Nothing in the automated suites exercises a real pipeline load, so a regression in Wan or SDXL under 0.36.0 would not be caught locally.
- **Owner**: Operator, next packaged build
- **Next step**: Operator item 4, second half. This is the highest-blast-radius unobserved change in the cycle.

- **Migrated from**: v2.4.4#DF-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.4#DF-1; still owed: Required qualification; next: Carry GPU regression qualification: load/run Wan and SDXL using the current provisioned Diffusers environment, capture valid artifacts and versions, and distinguish it from a SANA import.

- **Migrated from**: v2.16#DF-115 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### QG-7 - No end-to-end run against a real GPU job

- **Source**: this cycle, all rounds
- **Impact**: Every change is verified by typecheck, lint, build, unit tests and a rendered screenshot harness. NONE of it has been exercised against a live generation on the operator's hardware. Specifically, the capability caps have not been observed PREVENTING a real failure, only shown to produce the right option lists.
- **Owner**: Operator
- **Next step**: On Videos with Wan 2.1 selected, confirm the duration dropdown offers only 2-5 s and resolution only 480p, then generate one clip and check the bracketed time matches the wall clock. Then repeat one image generation and open the viewer.

- **Migrated from**: v2.4.9#QG-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.9#QG-1; still owed: Required qualification; next: Carry GPU/packaged qualification: selected Wan limits, actual clip and measured elapsed time, then actual image/viewer. Historical generic media generation does not prove these later controls.

- **Migrated from**: v2.16#QG-7 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### NI-1 - The two model registries are not tested against each other

- **Source**: v2.4.9 Phase 1 (sub-task 1.1)
- **Plan reference**: [v2.4.9 plan](../../../archive/v2/v2.4/plans/v2.4.9-adoption-voicestudio-field-discipline.md), Phase 1; recorded as OQ-1 to OQ-4 in [docs/reference/model-acceptance.md](../../../archive/reference/model-acceptance.md)
- **Impact**: Building the job map surfaced a two-sided divergence nothing guards. Eight `core/registry/ModelCatalog.ts` format bindings have no installable `catalog.json` entry (`llama3.1:8b`, `llama3.2:3b`, `llama3.3:70b`, `qwen2.5:7b`, `qwen2.5-coder:7b`, `deepseek-coder:6.7b`, `hermes3:8b`, `hermes3:70b`) and five installable LLMs have no binding (`gemma4:e2b`, `gemma-4-12b-it-gguf`, `gemma4:26b`, `gemma4:31b`, `inkling-small`), three of which are the pre-ticked chat default on the cpu, 12/16 and 24 GB tiers. The sharp end is concrete rather than cosmetic: `inkling-small` has `family: "inkling"` and `agentic: true`, so `modules/coding/llm/parseAgentToolCalls.ts:23` falls through to `?? "gemma4-xml"` and parses its tool calls with a Gemma grammar. `ModelFamily` cannot even express `inkling`, so binding it needs a type change. `tests/unit/core/registry/ModelCatalog.test.ts` asserts sync against `core/registry/models.json` only, which is why both directions are invisible.
- **Reason not done in this cycle**: Phase 1's scope is two documents and an agent definition. Reconciling the registries is a code change to the coding runtime with its own decision (are the eight dead bindings or missing catalog entries?) and is not a field-discipline item.
- **Owner**: Unassigned
- **Exit condition**: A test asserts `catalog.json` LLM entries and `ModelCatalog.ts` bindings against each other, and each of the 13 divergent ids is either bound, removed, or recorded as deliberately unbound. Evaluable by running that test.
- **Suggested next step**: Decide the eight bindings' status first, since that decides whether the test asserts equality or a documented subset.

- **Migrated from**: v2.4.9#NI-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.9#NI-1; still owed: Required implementation; next: Implement explicit supported binding/subset contract and cross-registry test. The old wrong-Gemma case changed in v2.14, but that is not full parity or an evidence-based Inkling codec decision. Prove with G and update `docs/reference/model-acceptance.md`.

- **Migrated from**: v2.16#NI-1 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### MT-27 - The standards judge was never dispatched through the agent registry

- **Source**: v2.4.9 Phase 1 (sub-task 1.4)
- **Plan reference**: [v2.4.9 plan](../../../archive/v2/v2.4/plans/v2.4.9-adoption-voicestudio-field-discipline.md), Phase 1 Verification Expectation
- **Impact**: `.claude/agents/nexus-standards-judge.md` was created mid-session, after the agent registry had loaded, so `nexus-standards-judge` was not a dispatchable agent type. The Verification Expectation was satisfied by handing the definition to a general-purpose agent and instructing it to adopt the file verbatim, which exercised the definition's CONTENT but not the harness's lookup of it. The frontmatter (`name`, `tools: Bash, Read, Grep, Glob`, `model: opus`) is therefore unverified: a malformed field, a rejected tool name, or a wrong `model` value would not have surfaced.
- **Owner**: Operator or next cycle
- **Exit condition**: In a session started after this commit, dispatch `nexus-standards-judge` by name against any pinned range and confirm it returns the verdict format with the declared tool scope. One invocation closes it.
- **Suggested next step**: Do it at the start of Phase 2, which needs a review anyway; the tool scope also gets exercised there because Phase 2's evidence rests on locally-run counts.

- **Migrated from**: v2.4.9#MT-11 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.9#MT-11; still owed: Required qualification; next: Carry harness qualification: start a fresh supported harness session, invoke that exact registered agent against a pinned range, and retain tool scope and verdict. A generic agent adopting the prompt is insufficient.

- **Migrated from**: v2.16#MT-27 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-116 - `prompt-*` budget checks still do not cover `.claude/`

- **Source**: v2.4.9 Phase 1 (sub-task 1.2), confirming pre-existing gap 10.N.H
- **Plan reference**: [v2.4.9 plan](../../../archive/v2/v2.4/plans/v2.4.9-adoption-voicestudio-field-discipline.md), Phase 1; required by AGENTS.md "## Claude Code addenda"
- **Impact**: AGENTS.md requires that adding a file under `.claude/agents/` be accompanied by confirming the `prompt-*` rule globs cover the new path. Confirmed they do not: `lib/checks/prompt-oversized.mjs:72-73` scopes to `modules/coding/chat/prompts/` and `modules/coding/skills/catalog/**/SKILL.md`. So `nexus-standards-judge.md` has no prompt-size budget, and neither do the four older `.claude/agents/` files. Two `modules/coding/skills/catalog` prompts already exceed the 800-token budget as warnings, so the check does find real drift where it is pointed.
- **Reason not done in this cycle**: Extending the glob is outside Phase 1's stated scope, and the extension is already tracked as 10.N.H under v0.9.0. Recording it here keeps the AGENTS.md obligation discharged without silently widening a check.
- **Owner**: Inherited from 10.N.H
- **Exit condition**: `check:prompts` reports a budget line for at least one `.claude/agents/` file, or 10.N.H is closed with a recorded decision that `.claude/` is deliberately exempt.
- **Suggested next step**: Fold into the Phase 5.5 terminal CI/CD reconciliation, where the check surface is being compared anyway.

- **Migrated from**: v2.4.9#DF-9 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.9#DF-9; still owed: Required implementation; next: Implement rule/path expansion plus negative/positive registration tests and run H. Cover every prompt-* rule whose appliesTo filter owns the same scope, not only oversized.

- **Migrated from**: v2.16#DF-116 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### BG-2 - 216 stale relative links in the living `docs/DEVLOG.md`

- **Source**: v2.4.9 Phase 1 (sub-task 1.4 link verification)
- **Plan reference**: [v2.4.9 plan](../../../archive/v2/v2.4/plans/v2.4.9-adoption-voicestudio-field-discipline.md), Phase 1; surfaced incidentally while verifying this phase's own links
- **Impact**: A link check over `docs/DEVLOG.md` resolves 216 relative targets to files that do not exist. They are historical entries written before two renames: `src/` to `modules/coding/` (for example `../src/chat/PromptBuilder.ts`, `../src/guardrails/PermissionTiers.ts`) and `scripts/installer/pyqt/` to `scripts/installer/` (for example `../scripts/installer/pyqt/src/nexus_installer/constants.py`), plus the Gemma Code to Nexus product rename (`../src/panels/GemmaCodePanel.ts`). DEVLOG is a living document and its own index lines are how a reader navigates to the code a milestone changed, so the navigation is broken for every entry older than those renames. Nothing detects this: `check:docs-layout` validates directory shape, not link targets.
- **Reason not done in this cycle**: Phase 1 delivers two documents and an agent definition. Repairing 216 historical links is a mechanical but unbounded edit across the whole file, and rewriting historical entries to point at current paths is itself a decision (a milestone's links arguably should resolve to what existed then). All 55 relative links in this phase's own files were verified and resolve.
- **Owner**: Unassigned
- **Exit condition**: A committed link checker over the living docs roots reports zero unresolved relative targets, or DEVLOG's pre-rename entries carry a stated convention (a note that historical paths are as-written and not maintained) that the checker honours. Evaluable by running the checker.
- **Suggested next step**: Decide the convention before repairing anything, since it determines whether the fix is 216 rewrites or one documented exemption plus a checker.

- **Migrated from**: v2.4.9#BG-16 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.9#BG-16; still owed: Required implementation; next: Carry link-policy decision and fresh link audit. Prefer historical commit links or reviewed canonical remaps per entry; preserve the user's edits and never silently replace the file. Add the chosen living-doc link checker and prove zero unresolved targets or exact documented exemptions.

- **Migrated from**: v2.16#BG-2 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### BG-3 - `npm audit (production deps)` is red, and `sharp` has no fix

- **Source**: v2.4.9 Phase 2 (sub-task 2.5, while selecting required checks)
- **Plan reference**: [v2.4.9 plan](../../../archive/v2/v2.4/plans/v2.4.9-adoption-voicestudio-field-discipline.md), Phase 2
- **Impact**: The `npm audit (production deps)` job has been failing on `develop` since `f8185e38`, and it is the ONLY failing job in that CI run. Reproduced locally: 8 production vulnerabilities (1 low, 2 moderate, 5 high). The blocking one is `sharp <=0.35.4-rc.0`, reached transitively through `@huggingface/transformers`, carrying inherited libvips advisories (CVE-2026-33327, CVE-2026-33328, CVE-2026-35590, CVE-2026-35591) and libheif advisories (GHSA-g89c-p67h-r497, GHSA-2jg2-4ch7-h545), with **no fix available**. `hono` and `protobufjs` findings do have fixes. Because the job is red, it could not be added to the branch protection required-check set applied in this phase, so the one production-dependency gate the repository has is also the one gate that is not enforced.
- **Reason not done in this cycle**: The Non-Goals table excludes remediating what the visibility work surfaces, and the decisive dependency has no upstream fix, so the remedy is an override, a replacement for `@huggingface/transformers`, or an accepted risk -- each a decision, not a patch.
- **Owner**: Unassigned
- **Exit condition**: `npm audit --omit=dev` exits zero, or the residual advisories are recorded as accepted with a dated review, and `npm audit (production deps)` joins the required-check set. Evaluable by running the command.
- **Suggested next step**: Run `npm audit fix` for `hono` and `protobufjs` first, since those are free, then decide `sharp` separately on its own merits.

- **Migrated from**: v2.4.9#BG-19 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.9#BG-19; still owed: Owner decision; next: Carry dependency/security review: execute I, reconcile current advisories with pinned versions and dated risk decisions, then inspect the required checks. A permissive package-name allowlist alone does not satisfy the dated-review/protection exit condition.

- **Migrated from**: v2.16#BG-3 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### QG-8 - Two gating checks are not yet in the required-check set

- **Source**: v2.4.9 Phase 2 (sub-task 2.5)
- **Plan reference**: [v2.4.9 plan](../../../archive/v2/v2.4/plans/v2.4.9-adoption-voicestudio-field-discipline.md), Phase 2, D2
- **Impact**: D2 made `gitleaks` and `pip-audit (model runtimes)` gating at the workflow level, so a finding turns their run red. Neither is in the branch-protection required-check list applied in this phase, because neither has executed once and requiring a check that has never produced a run leaves it permanently pending and blocks every merge. Until they are added, a red run on either is visible but does not block a merge.
- **Owner**: Operator, at the integration pull request
- **Exit condition**: Both checks show one green run on the integration pull request, then both context names are added to the required list on `develop` and `main`. Evaluable by reading `gh api repos/:owner/:repo/branches/<b>/protection`.
- **Suggested next step**: Do it during 5.10, where the integration pull request produces the first runs anyway.

- **Migrated from**: v2.4.9#QG-2 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.9#QG-2; still owed: Required implementation; next: Carry remote policy verification: green current runs plus required-context protection on both develop and main. Use J; do not change protection or call visibility enforcement without the result.

- **Migrated from**: v2.16#QG-8 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### QG-9 - Required checks are 17 individual contexts, not an aggregate gate

- **Source**: v2.4.9 Phase 2 (sub-task 2.5)
- **Plan reference**: [v2.4.9 plan](../../../archive/v2/v2.4/plans/v2.4.9-adoption-voicestudio-field-discipline.md), Phase 5.5 terminal CI/CD reconciliation
- **Impact**: Branch protection now lists 17 individual check contexts. The canonical CI/CD contract expects a single always-resolving aggregate required check instead. The difference is not cosmetic: three workflows are path-filtered on pull requests (`installer-tests.yml`, `installer-smoke.yml`, `shell-build.yml`), so they produce no check at all on a pull request outside their filter and **cannot be required individually without blocking every unrelated merge**. Those three are therefore unguarded by protection today. An aggregate job that always runs and resolves its dependencies' skip states is the pattern that closes this, and adding a required context also has to stay in step with any future job rename.
- **Reason not done in this cycle**: Authoring an aggregate gate is a pipeline-topology change, and the Non-Goals table excludes applying unreconciled canonical-contract fields. Phase 5.5 is where the comparison happens.
- **Owner**: Phase 5.5
- **Exit condition**: One required context that always resolves, covering the path-filtered workflows through their skip states. Evaluable by opening a pull request that touches no installer path and confirming the aggregate still resolves.
- **Suggested next step**: Compare against the contract in 5.5 before adding more individual contexts, so the list does not grow into something that has to be unwound.

- **Migrated from**: v2.4.9#QG-3 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.9#QG-3; still owed: Required implementation; next: Prove the source topology partial, then carry full-contract/protection verification. Inspect all required contexts and an unrelated-path PR; an aggregate that omits required external workflows does not establish complete coverage.

- **Migrated from**: v2.16#QG-9 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-117 - The feature inventory covers two README regions, not the whole file

- **Source**: v2.4.9 Phase 3 (sub-task 3.1, decision D3 part B)
- **Plan reference**: [v2.4.9 plan](../../../archive/v2/v2.4/plans/v2.4.9-adoption-voicestudio-field-discipline.md), Phase 3; contract in [docs/reference/feature-inventory.md](../../../archive/reference/feature-inventory.md)
- **Impact**: `check-feature-drift.mjs` enforces 29 names across `## The Four Pillars` and `## Featured Capabilities`. Features named elsewhere in `README.md` are outside the contract and can be deleted from the tree without CI noticing: `### CLI tools (already shipped)` (line 340), `## Quick Start (developer workflow)`, and `## Roadmap`. The bound is deliberate -- the regions must exclude the ~180-line changelog, whose prose names features and would otherwise produce false passes -- but the consequence is that "a CI run fails when a feature named in README.md no longer exists" is true for those two regions and not for the rest of the file.
- **Reason not done in this cycle**: Widening coverage means deciding, per additional region, what counts as a feature claim. `### CLI tools` lists commands rather than features and `## Roadmap` names things that deliberately do NOT exist yet, so a naive widening would turn the roadmap into a set of failing assertions.
- **Owner**: Unassigned
- **Exit condition**: Either an additional region is added to `REGIONS` in the checker with its own entries, or this document records the decision that the two regions are the whole contract and the others are prose. Evaluable by reading the checker's `REGIONS` map against the README's `## ` headings.
- **Suggested next step**: `### CLI tools (already shipped)` is the strongest candidate, since "already shipped" is exactly the claim this gate exists to keep honest.

- **Migrated from**: v2.4.9#DF-10 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.9#DF-10; still owed: Owner decision; next: Carry product/documentation decision: explicitly accept the two regions as the whole contract, or add a carefully parsed shipped-CLI region and entries/tests. Do not pull roadmap promises into implemented feature assertions.

- **Migrated from**: v2.16#DF-117 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### NI-2 - Crash classes were not derived from data, because there is no data

- **Source**: v2.4.9 Phase 4 (sub-task 4.2)
- **Plan reference**: [v2.4.9 plan](../../../archive/v2/v2.4/plans/v2.4.9-adoption-voicestudio-field-discipline.md), Phase 4
- **Impact**: The plan bounds the classification work by sampling the 50 most recent issues. `gh issue list --state all --limit 100` returns **zero** issues for this repository, so there was nothing to cluster. The five classes in `scripts/crash-class-report.mjs` (`install-provision`, `model-load`, `gpu-handoff`, `generation-failure`, `data-persistence`) are derived instead from this repository's own recorded field failures across the v2.4.x cycles, each carrying its provenance in the source. They are a defensible first pass and they are **not** evidence about what users actually report. A class that never matches, or one that swallows everything, will only become visible once real reports exist; the per-class counts the report prints are what make that visible.
- **Reason not done in this cycle**: No input existed. Inventing five classes and calling them a sample would have been worse than saying so.
- **Owner**: Unassigned
- **Exit condition**: Re-derive the classes from at least 20 issues filed through the bug form, and record the sample. Clears on the same trigger as "first non-empty crash-class report".
- **Suggested next step**: Do both at once, once the form has collected reports; a re-derivation and a first real distribution are the same exercise.

- **Migrated from**: v2.4.9#NI-2 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.9#NI-2; still owed: Optional candidate/watch; next: Carry data-dependent qualification: read current issue population, retain a real sample when threshold exists, and re-derive classes. If fewer than 20, record exact observed count and keep pending; never manufacture reports.

- **Migrated from**: v2.16#NI-2 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-118 - The crash-class report is operator-run, not scheduled

- **Source**: v2.4.9 Phase 4 (sub-task 4.3)
- **Plan reference**: [v2.4.9 plan](../../../archive/v2/v2.4/plans/v2.4.9-adoption-voicestudio-field-discipline.md), Phase 4
- **Impact**: `scripts/crash-class-report.mjs` runs on an operator's machine against an authenticated `gh`. It is not wired into CI, so nothing produces a periodic failure-trend report; someone has to remember to run it. Wiring it would mean giving CI a token to read issues, which is a credential surface added for a report that nobody currently reads on a schedule, so the trade was declined rather than overlooked.
- **Reason not done in this cycle**: The report has no data yet (see NI-2), so scheduling it now would schedule an empty result.
- **Owner**: Unassigned
- **Exit condition**: Either a scheduled job publishes the report where someone reads it, or this gap records the decision that it stays operator-run. Evaluable by looking for the job.
- **Suggested next step**: Revisit alongside NI-2; a trend report is worth scheduling once there is a trend.

- **Migrated from**: v2.4.9#DF-11 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.9#DF-11; still owed: Owner decision; next: Carry owner decision alongside v2.4.9#NI-2: record operator-run as deliberate, or add a scheduled consumer with minimal permissions once real trend data exists. Do not create unused CI solely to tick the row.

- **Migrated from**: v2.16#DF-118 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### BG-4 - `core/storage/StorageMigration.ts` outlived its own removal note

- **Source**: v2.4.9 Phase 5 (sub-task 5.1, architecture refactor)
- **Plan reference**: [v2.4.9 plan](../../../archive/v2/v2.4/plans/v2.4.9-adoption-voicestudio-field-discipline.md), Phase 5.1, which predicted this finding by name
- **Impact**: `core/storage/StorageMigration.ts:18` reads "Removed in v1.1.0." The file is still present, and so is `tests/unit/core/storage/StorageMigration.test.ts`, which still runs. Every remaining reference is a comment or doc string (`core/storage/paths.ts:6,31`, `core/diagnostics/DoctorReport.ts:95,217`); **nothing calls it**. So the repository carries a one-shot `~/.gemma-code/` to `~/.nexus/` migration that its own header says was removed four minor versions ago, plus a test suite asserting the behaviour of dead code. The name is also actively confusing: the v2.5.0 migration-durability plan had to add an explicit note telling implementers NOT to touch this file, because "StorageMigration" is exactly what a database-migration helper would be called.
- **Reason not done in this cycle**: Phase 5.1 is report-only by design, and deleting a migration path is a decision about users still on `~/.gemma-code/`, not a cleanup. Removing it needs someone to decide that no supported upgrade path still crosses it.
- **Owner**: Unassigned
- **Exit condition**: Either the file and its test are removed and the four referring comments updated, or the header's "Removed in v1.1.0" line is corrected to state that the code is retained deliberately and why. Evaluable by reading line 18 against the file's existence.
- **Suggested next step**: Settle it alongside the v2.5.0 migration work, where the naming collision will be in front of whoever is reading these modules anyway.

- **Migrated from**: v2.4.9#BG-20 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.9#BG-20; still owed: Owner decision; next: Implement truthful retention documentation, or owner-approved removal after supported-upgrade analysis. Header correction is the smallest sufficient option if retention is chosen; prove with K and reference inspection. Do not delete migration data paths opportunistically.

- **Migrated from**: v2.16#BG-4 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### MT-28 - `video2x-adapter.test.ts` is flaky under full-suite load

- **Source**: this cycle, observed while re-establishing the test baseline
- **Impact**: One case in `desktop/tests/video2x-adapter.test.ts` fails intermittently in a FULL `vitest run` (2 of 3 runs) and passes every time the file runs alone. It imports nothing changed this cycle (`node:crypto`, `fs`, `path`, `SettingsStore`, a temp-dir helper), was last touched in v2.3.0, and uses real filesystem temp directories with timing-sensitive waits - consistent with temp-dir or scheduling contention on Windows under parallel load. It is therefore a pre-existing test-quality defect, not a regression, but it means the "36-failure baseline" for this host is really "36 plus an intermittent 37th".
- **Owner**: Open
- **Next step**: Identify the specific case (the JSON reporter shows the file but the run that captured names passed), then either isolate its temp dir per test or mark the file `sequential`.

- **Migrated from**: v2.4.8#MT-10 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.8#MT-10; still owed: Required qualification; next: Carry test reliability investigation, not an asserted current defect: capture failing case/timing under full-suite load, then remove uncontrolled waits or contention and verify full-load runs. Existing isolation invalidates blindly repeating the suggested temp-dir fix.

- **Migrated from**: v2.16#MT-28 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### BG-5 - Two catalog video entries declare an incoherent frame budget

- **Source**: this cycle, MT-8's new catalog assertion
- **Impact**: `longcat-video-avatar-1.5` and `sana-video-2b-720p` both declare `maxVideoFrames: 8` with `maxVideoSeconds: 8` - one frame per second, which is not a video. The two Wan entries are coherent by contrast (121/5 is 24 fps, 81/5 is 16 fps), so the field is meaningful where it was filled in properly and a placeholder here. The capability map keeps conservative hand-set values for the two, and the test carries a named allowlist so a correction (or a new model with the same placeholder) fails loudly rather than passing.
- **Owner**: Open
- **Next step**: Establish the real frame limits for both checkpoints, correct `core/registry/catalog.json`, then delete the allowlist entry in `modelCapabilities.test.ts`.

- **Migrated from**: v2.4.8#BG-14 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.8#BG-14; still owed: Required implementation; next: Implement accurate semantics after first-party/runtime evidence: distinguish visual-token sampling from generation-frame limit if conflated, correct the two catalog fields or consuming interpretation, remove allowlist, prove L. Do not guess hardware frame limits from a 24fps default.

- **Migrated from**: v2.16#BG-5 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### BG-6 - Three SANA ControlNet repos are gated, so they can be neither pinned nor downloaded

- **Source**: this cycle, BG-12's pin sweep
- **Impact**: `Efficient-Large-Model/SANA-ControlNet-{Canny,Depth,Pose}` return HTTP 401 on the model-info endpoint itself, not 404, so the repos exist but require Hugging Face credentials. Their three weight files are the last unpinned entries (3 of 107). The wider consequence is not the pin: if a user ever enables one of these ControlNets, the DOWNLOAD will 401 too. They are `type: controlnet` with no `task`, so they do not appear in the model picker and no user has hit this yet.
- **Owner**: Open
- **Next step**: Decide whether these belong in the catalog at all. Pinning them would require shipping or prompting for an HF token, which breaches the local-first, zero-credential posture; the honest alternatives are to drop the three entries or to mark them as requiring user-supplied credentials.

- **Migrated from**: v2.4.8#BG-15 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.8#BG-15; still owed: Owner decision; next: Carry catalog/security decision: remove unsupported auxiliaries with consumer checks, or explicitly credential-gate them under existing auth policy with real pins. Recheck vendor access before deciding; no network fetch or credential mutation was performed here.

- **Migrated from**: v2.16#BG-6 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### MT-29 - Packaged token label is not observed

- **Source phase**: Phase 1 - Token split
- **Impact**: Tests pin the screenshot case (215 thinking bytes, 32 reply bytes, `eval_count: 72` -> 63 / 9) and the sum invariant. No packaged turn has been observed since.
- **Owner**: Operator, this cycle's installer rebuild
- **Next step**: Operator item 1 in `last-phase-evidence-v2.4.8-desktop-corrections.md`.

- **Migrated from**: v2.4.8#MT-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.8#MT-1; still owed: Required qualification; next: Carry current packaged token label qualification with the provenance contract, and record supersession of obsolete byte-proportional values. Match persisted request/message usage and tooltip to the observed turn.

- **Migrated from**: v2.16#MT-29 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### MT-30 - Packaged composer dismissal and Persona chrome are not observed

- **Source phase**: Phase 2
- **Impact**: jsdom pointer and Escape events prove the hook; a real Tauri webview pointer has not.
- **Owner**: Operator, this cycle's installer rebuild
- **Next step**: Operator items 2-3.

- **Migrated from**: v2.4.8#MT-2 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.8#MT-2; still owed: Required qualification; next: Carry packaged interaction qualification: open/dismiss with pointer and Escape, verify focus and Persona display/selection without losing draft text.

- **Migrated from**: v2.16#MT-30 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### MT-31 - Packaged Sessions title is not observed on all four pillars

- **Source phase**: Phase 3
- **Impact**: Tests pin copy and tokens on FolderTree and both studio panes; the packaged Agents pane title is asserted only through CodingPage copy.
- **Owner**: Operator, this cycle's installer rebuild
- **Next step**: Operator item 4.

- **Migrated from**: v2.4.8#MT-3 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.8#MT-3; still owed: Required qualification; next: Carry packaged four-route visual qualification and capture all titles in the same digest-bound run. Route presence alone cannot verify text rendering.

- **Migrated from**: v2.16#MT-31 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### MT-32 - Packaged Settings card is not compared against the packaged installer picker side by side

- **Source phase**: Phase 4
- **Impact**: Parity is asserted on values (tab order, colors, pill order) and on structure, not on rendered pixels. Font family differs by platform (Qt `FONT_PRIMARY` vs. the app's `--font-sans` stack) and is not asserted.
- **Owner**: Operator, this cycle's installer rebuild
- **Next step**: Operator item 5.

- **Migrated from**: v2.4.8#MT-4 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.8#MT-4; still owed: Required qualification; next: Carry packaged side-by-side same-model comparison, including fonts, colors, pill order, and card layout on the actual host.

- **Migrated from**: v2.16#MT-32 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### MT-33 - Packaged picker order and default are not observed after a fresh snapshot

- **Source phase**: Phase 5
- **Impact**: The desktop rule is proven against the stale on-disk snapshot; the installer's corrected writer is proven in pytest. The two have not been observed together on the operator host.
- **Owner**: Operator, this cycle's installer rebuild
- **Next step**: Operator items 6-7, then `type ~/.nexus/selected-models.json` to confirm `recommendedByTask.chat` and `.agentic` read `gemma-4-12b-it-gguf`.

- **Migrated from**: v2.4.8#MT-5 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.8#MT-5; still owed: Required qualification; next: Carry fresh-snapshot qualification: inspect generated recommendedByTask, open Chat/Agents empty sessions, and record order/defaults without overwriting user's real selection merely for evidence.

- **Migrated from**: v2.16#MT-33 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### MT-34 - Packaged Phase 7 card cluster and collapsible groups are not observed

- **Source phase**: Phase 7 (added 2026-09-07)
- **Impact**: Tests pin size-then-action in the title row, the absence of star / checkmark / action row, the three headings with counts, collapse per tab, and disabled incompatible cards. None of it has rendered in the packaged desktop.
- **Owner**: Operator, this cycle's second installer rebuild
- **Next step**: Operator items 8-9 in `last-phase-evidence-v2.4.8-desktop-corrections.md`.

- **Migrated from**: v2.4.8#MT-6 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.8#MT-6; still owed: Required qualification; next: Carry packaged Settings qualification: group counts, per-tab collapse, disabled incompatible cards, size/action placement, and viewport behavior. Can absorb older density obligations only if explicitly carried.

- **Migrated from**: v2.16#MT-34 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### MT-35 - Packaged Phase 8 surfaces are not observed

- **Source phase**: Phase 8 (added 2026-09-07)
- **Impact**: Tests pin the torch floor on three layers, the `loading` / `generating` stages, the `Loading model...` bubble state, the centered composer cluster, and the footer copy. No packaged install has yet reprovisioned the venv to torch 2.5.1 or generated a video on it.
- **Owner**: Operator, this cycle's third installer rebuild
- **Next step**: Operator items 10-15 in `last-phase-evidence-v2.4.8-desktop-corrections.md`.

- **Migrated from**: v2.4.8#MT-7 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.8#MT-7; still owed: Required qualification; next: Carry runtime plus packaged qualification: actual repaired environment versions, real video outcome, captions/loader/composer/footer observations, and logs bound to installer digest.

- **Migrated from**: v2.16#MT-35 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-119 - The stale torch 2.3.0 venv is repaired only by a reinstall or a Settings > Video Repair

- **Source phase**: Phase 8
- **Impact**: The desktop now reports the stale venv as repairable and offers Repair; the runtime refuses to generate with a typed message. Nothing upgrades the venv automatically. The wheel download is about 2.4 GB on Windows.
- **Owner**: Operator
- **Next step**: Re-run the rebuilt installer (the changed manifest fingerprint reprovisions) or press Repair in Settings > Video.

- **Migrated from**: v2.4.8#DF-5 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.8#DF-5; still owed: Owner decision; next: Carry owner/platform behavior decision: accept explicit repair with actionable UI, or design a consented upgrade flow. Do not silently launch a multi-gigabyte repair/download to satisfy this audit.

- **Migrated from**: v2.16#DF-119 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-120 - Settings no longer offers a way to set or clear a favorite model

- **Source phase**: Phase 7
- **Impact**: The star was the only Settings control for a favorite. Pickers still write a favorite on every model change and `resolveDefaultId` still honors it, so a favorite once set cannot be cleared from the UI.
- **Owner**: Next desktop cycle
- **Next step**: Decide whether favorites are dropped entirely (remove `writeFavorite` from the pickers) or get a small control on the picker itself.

- **Migrated from**: v2.4.8#DF-4 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.8#DF-4; still owed: Owner decision; next: Implement a small visible clear/reset preference action or adopt deliberate last-used semantics and remove misleading favorite contract. Prove M and affected page interaction; do not silently discard existing user preferences.

- **Migrated from**: v2.16#DF-120 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-121 - Uncommitted installer wizard-merge state rides in the rebuilt installer

- **Source phase**: Phase 6
- **Impact**: `develop` carries 30 modified and 6 untracked files (installer wizard merge rounds 1-3, recorded only in `docs/todos.md`). This plan neither staged nor reverted them; the rebuilt `NexusSetup.exe` includes them, as did the installer the operator already field-tested.
- **Owner**: Operator
- **Next step**: Decide whether the wizard merge becomes its own plan and commit, or is discarded, before v2.4.8 publishes.

- **Migrated from**: v2.4.8#DF-2 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.8#DF-2; still owed: Historical limit; next: Prove resolved historical source-publication candidate by comparing original wizard rounds to the merged commits and release artifact provenance. A current tracked source alone cannot establish which dirty bytes were in the old published installer. Preserve that historical limitation if exact provenance is unavailable.

- **Migrated from**: v2.16#DF-121 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-122 - Stale `recommendedByTask` on already-installed hosts is only masked, not rewritten

- **Source phase**: Phase 5
- **Impact**: The desktop rule keeps pickers and defaults correct against the stale snapshot; the file itself still says `chat: embeddinggemma` until the installer runs again. Settings downloads append to it without correcting it.
- **Owner**: Next desktop cycle
- **Next step**: Have the sidecar's `loadOrMigrate` drop a `recommendedByTask` entry whose model is not on the task's tab.

- **Migrated from**: v2.4.8#DF-3 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.8#DF-3; still owed: Required implementation; next: Implement validation against current per-task tab eligibility, atomically repair only invalid recommendation keys, preserve ordered/owned IDs and valid preferences, and prove N with a stale embeddinggemma chat recommendation fixture.

- **Migrated from**: v2.16#DF-122 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### MT-36 - The reworked wizard is not observed in the packaged window

- **Source phase**: Phases 1-4
- **Impact**: Tests pin selection-scoped sizing across four consumers, the derived component resolver, the overlaid Browse button, the column-scoped Ollama URL, the hidden VS Code paragraph, one-line storage in the facts column, and the counter row. None of it has rendered in the packaged wizard, and Qt geometry does not resolve headlessly.
- **Owner**: Operator, this cycle's installer rebuild
- **Next step**: Operator items 1-5 in `last-phase-evidence-v2.4.7-wizard-density.md`.

- **Migrated from**: v2.4.7#MT-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.7#MT-1; still owed: Required qualification; next: Carry current packaged wizard qualification and explicitly reconcile superseded page/layout requirements; retain selection-scoped sizing, derivation, Browse/URL behavior, and review summary obligations.

- **Migrated from**: v2.16#MT-36 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-123 - Category labels are not coloured chips

- **Source phase**: Phase 4 - Review density and model summary
- **Impact**: Screenshot 4's mockup colours each category label. The counter row delivers the visual separation the operator asked for; recolouring the labels is cosmetic and carries a palette decision with no correctness content.
- **Owner**: Next installer cycle
- **Next step**: Decide a per-category palette, or accept the current neutral headings.

- **Migrated from**: v2.4.7#DF-2 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.7#DF-2; still owed: Owner decision; next: Carry explicit design decision: accept neutral labels, or choose category tokens and verify contrast plus packaged appearance. There is no correctness reason to invent a palette solely for closure.

- **Migrated from**: v2.16#DF-123 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### MT-37 - Packaged payload fingerprint and maximized first show are not observed

- **Source phase**: Phase 1 - Packaged delivery and installer window
- **Impact**: Tests pin stale-bundle refusal, Settings fingerprint copy, and `present_installer_window` calling `showMaximized`. None of it has run in a frozen NexusSetup.exe on the operator host.
- **Owner**: Operator, this cycle's installer rebuild
- **Next step**: Phase 8 human items (1) and (5).

- **Migrated from**: v2.4.6#MT-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.6#MT-1; still owed: Required qualification; next: Carry packaged provenance/window qualification: inspect installed payload digest and first-show state; test copied stale payload separately under v2.4.6#WN-1.

- **Migrated from**: v2.16#MT-37 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### MT-38 - Packaged Setup compactness is not observed

- **Source phase**: Phase 2 - Installer Setup compactness
- **Plan reference**: `docs/archive/v2/v2.4/plans/v2.4.6-field-delivery-density-and-session-identity.md` (sub-tasks 2.1-2.3)
- **Reason**: Qt tests pin two-column prereqs, a title-row Re-check icon, one-line GPU text, worker replacement, elision, and no trailing stretch. None of it has run in a frozen NexusSetup.exe on the operator host.
- **Suggested next step**: Phase 8 human item for Setup screenshot 1.

- **Migrated from**: v2.4.6#MT-2 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.6#MT-2; still owed: Required qualification; next: Carry packaged current Setup screenshot/geometry at supported widths with GPU one-liner, recheck behavior, worker replacement, and no unwanted trailing space.

- **Migrated from**: v2.16#MT-38 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### MT-39 - Packaged Configuration, Review groups, and VS Code 1.136 VSIX load are not observed

- **Source phase**: Phase 3 - Configuration, VS Code host, and Review groups
- **Plan reference**: `docs/archive/v2/v2.4/plans/v2.4.6-field-delivery-density-and-session-identity.md` (sub-tasks 3.1-3.4)
- **Reason**: Tests pin Unsloth default-on when Compatible, 1.136 enabled and checked, absent Gemma/Video2X copy, and Review headings that keep juggernaut-xl-v9 under Image. None of it has run in a frozen NexusSetup.exe, and the VSIX has not been loaded in Microsoft VS Code 1.136.0 on the operator host.
- **Suggested next step**: Phase 8 human items for screenshots 2-4 and a `code --install-extension` on 1.136.

- **Migrated from**: v2.4.6#MT-3 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.6#MT-3; still owed: Required qualification; next: Carry host-compatibility qualification or explicitly supersede the obsolete host target with supported-version policy, preserving native-addon ABI/extension-load and packaged wizard obligations.

- **Migrated from**: v2.16#MT-39 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### MT-40 - Packaged VS Code owned-agentic picker is not observed

- **Source phase**: Phase 4 - VS Code Agentic Model Surface
- **Plan reference**: `docs/archive/v2/v2.4/plans/v2.4.6-field-delivery-density-and-session-identity.md` (sub-tasks 4.1-4.4)
- **Reason**: Unit tests pin the AD-13 allowlist, empty-snapshot fail-closed, leftover installed ids absent, default `gemma-4-12b-it-gguf` when owned, and tool dispatch plus ConfirmationGate after a model switch. The command, status bar, and `/model` have not been clicked in a VSIX loaded on Microsoft VS Code 1.136.0.
- **Suggested next step**: Phase 8 human item: install the rebuilt VSIX, open Select Agentic Model, confirm leftover Ollama tags are absent.

- **Migrated from**: v2.4.6#MT-4 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.6#MT-4; still owed: Required qualification; next: Carry packaged VSIX qualification on a declared supported VS Code host with owned snapshot, leftover exclusion, default selection, model switch, tool dispatch, and ConfirmationGate.

- **Migrated from**: v2.16#MT-40 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### MT-41 - Packaged Sessions History chrome is not observed

- **Source phase**: Phase 5 - Sessions History chrome and Session nouns
- **Plan reference**: `docs/archive/v2/v2.4/plans/v2.4.6-field-delivery-density-and-session-identity.md` (sub-tasks 5.1-5.4)
- **Reason**: Desktop tests pin the empty header, left-aligned create actions, `HISTORY_HAIRLINE_GAP` on both sides of the rule, Session copy, and the unchanged Chatbot tab label. None of it has run in a frozen desktop from this cycle's installer on the operator host.
- **Suggested next step**: Phase 8 human item (6): empty and filled Sessions History, centered hairline, Session copy, Chatbot tab unchanged.

- **Migrated from**: v2.4.6#MT-5 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.6#MT-5; still owed: Required qualification; next: Carry packaged empty and populated history qualification with centered hairline, left-aligned creation, and Session copy on all applicable surfaces.

- **Migrated from**: v2.16#MT-41 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### MT-42 - Packaged Settings compact cards are not observed

- **Source phase**: Phase 6 - Settings model cards
- **Plan reference**: `docs/archive/v2/v2.4/plans/v2.4.6-field-delivery-density-and-session-identity.md` (sub-tasks 6.1-6.2)
- **Reason**: Desktop tests fail if Details, Best for, Why this one, `Also agentic`, `Backend model:`, or `ID:` return, and they pin the Gemma 4 12B three-line card plus a centered action row. None of it has run in a frozen desktop from this cycle's installer on the operator host.
- **Suggested next step**: Phase 8 human item (7): Settings Gemma card matches the three-line spec, no Details.

- **Migrated from**: v2.4.6#MT-6 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.6#MT-6; still owed: Required qualification; next: Keep this identity separately open; do not apply the proposed supersession without a complete unique-requirement comparison. Supersede into v2.4.8#MT-6 only after recording current accepted card grammar and carrying compact/no-Details/no-duplicated-copy/viewport obligations. No historical packaged proof is implied.

- **Migrated from**: v2.16#MT-42 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### MT-43 - Packaged four-tab runtime chrome is not observed

- **Source phase**: Phase 7 - Four-tab runtime chrome
- **Plan reference**: `docs/archive/v2/v2.4/plans/v2.4.6-field-delivery-density-and-session-identity.md` (sub-tasks 7.1-7.4)
- **Reason**: Desktop vitest pins leftover exclusion on Chat/Agents/Image/Video, Gemma 4 12B before LFM and gpt-oss among owned ids, RealVis default when owned, Stop replacing Send while streaming, Creating/Generating labels (orb state remains shaping), Advanced in `composer-advanced-slot`, and GPU not Idle at 0% while a job is active. None of it has run in a frozen desktop from this cycle's installer on the operator host.
- **Suggested next step**: Phase 8 human items for Chat tokens/Stop, Agents recommend order, Image RealVis plus captions, Video Generating, leftover absence, and GPU busy during a live turn.

- **Migrated from**: v2.4.6#MT-7 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.6#MT-7; still owed: Required qualification; next: Carry packaged live-turn matrix. Shared route smoke only proves mounting; use an actual running request for Stop/GPU busy and distinguish media generation from fail-closed behavior.

- **Migrated from**: v2.16#MT-43 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### WN-7 - Mtime freshness cannot catch a freshly copied stale NSIS

- **Source phase**: Phase 1 - Packaged delivery and installer window
- **Impact**: Staging compares desktop source mtimes to the bundle mtime. Last week's tauri output left in `desktop/src-tauri/target` fails as intended. An old NSIS copied onto disk *after* source last changed gets a new timestamp and can still freeze.
- **Owner**: Phase 8 if field evidence shows a copied stale payload
- **Next step**: Prefer `cd desktop; npm run build:shell` immediately before `build-windows.ps1`. A source-tree stamp from `build:shell` would close the hole.

- **Migrated from**: v2.4.6#WN-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.6#WN-1; still owed: Required implementation; next: Implement source-content provenance emitted by build:shell and validated before staging; add a freshly copied stale-bundle reproduction. Prove O; hashing the copied bundle alone does not connect it to current source.

- **Migrated from**: v2.16#WN-7 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### MT-44 - Packaged installer behavior is not observed

- **Source phase**: Phases 2-4
- **Impact**: Tests pin the probe across both stores and every failure mode, the Downloaded pill, first-load auto-selection that defers to user edits, two-column Review with per-model marks, a pending-only estimate, and the guard passing the exact field reproduction while still blocking a 500 GB new selection. None of it has run in the packaged wizard.
- **Owner**: Operator, this cycle's installer rebuild
- **Next step**: Operator items 1-4 in `last-phase-evidence-v2.4.5-installer-downloaded.md`.

- **Migrated from**: v2.4.5#MT-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.5#MT-1; still owed: Required qualification; next: Carry current frozen installer qualification on owned/downloaded models, recording existing-state versus new downloads and preserving user selections.

- **Migrated from**: v2.16#MT-44 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### MT-45 - Ollama API detection path is not exercised against a live daemon

- **Source phase**: Phase 1 - Downloaded-model probe
- **Impact**: The `/api/tags` branch is covered by an injected fake and the disk-manifest fallback by real fixture files. A live Ollama returning its real payload shape has not been probed. A response shape change would silently fall back to the manifest path, which is correct but slower and would log a `probe_errors` line.
- **Owner**: Operator, next packaged run
- **Next step**: Operator item 4 (chat models detected with Ollama running, and again with it stopped).

- **Migrated from**: v2.4.5#MT-2 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.5#MT-2; still owed: Required qualification; next: Carry live API qualification: read actual /api/tags and compare installer detection, then exercise fallback in an isolated controlled environment. Do not interrupt the user's daemon for a test without scope confirmation.

- **Migrated from**: v2.16#MT-45 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### WN-8 - Electron ABI for VS Code 1.136 is inferred from 1.134/1.135

- **Source phase**: Phase 3 - Configuration, VS Code host, and Review groups
- **Plan reference**: `docs/archive/v2/v2.4/plans/v2.4.6-field-delivery-density-and-session-identity.md` (sub-task 3.2)
- **Reason**: vscode-versions listed 1.134.0 and 1.135.0 at Electron 42.8.1. 1.136.0 released 2026-09-02 and was not in that table at planning time. This phase kept the rebuild pin at 42.8.1 rather than claiming a new ABI.
- **Suggested next step**: Confirm `process.versions.electron` on the operator 1.136.0 host before Phase 8 VSIX rebuild; if it is not 42.8.1, rebuild `better-sqlite3` for that Electron.

- **Migrated from**: v2.4.6#WN-2 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.6#WN-2; still owed: Required qualification; next: Carry native-host qualification: read the running extension host's Electron/modules versions, compare to rebuild pin, and load the native dependency. Do not substitute CLI Node process.versions.

- **Migrated from**: v2.16#WN-8 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-124 - An already-installed Ollama still reads as "will be installed"

- **Source phase**: Phase 2 - Configuration scope
- **Impact**: `state.ollama_installed` could mark the row satisfied rather than pending. The installer step is already idempotent, so this is imprecise wording rather than wrong behavior.
- **Owner**: Next installer cycle
- **Next step**: Render a distinct "already present" state for a satisfied required component.

- **Migrated from**: v2.4.7#DF-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.7#DF-1; still owed: Required implementation; next: Prove superseded wording candidate with P and a current packaged Review check. If a pending mark still implies installation for satisfied Ollama, add explicit already-present state rather than declaring the wording fixed from absence alone.

- **Migrated from**: v2.16#DF-124 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-125 - The inferred reasoning / output split is not flagged in the tooltip

- **Source phase**: Phase 1
- **Impact**: When the provider gives only a total, the split is proportional and estimated while the total is exact. No protocol field carries "split inferred", so the tooltip states both numbers plainly.
- **Owner**: Next desktop cycle
- **Next step**: Add an optional `reasoningSplit: "provider" | "inferred"` to the `done` event and render `~` on inferred parts.

- **Migrated from**: v2.4.8#DF-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.8#DF-1; still owed: Required implementation; next: Prove resolved candidate for the original unlabelled-estimate defect with Q and event/store-to-render tests. Confirm no path labels proportional inference exact; do not require obsolete reasoningSplit spelling when the new provenance contract carries the fact.

- **Migrated from**: v2.16#DF-125 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### WN-9 - jsdom cannot see CSS math functions, so width regressions are untestable in unit tests

- **Source**: this cycle, progress bar
- **Impact**: jsdom's `cssstyle` silently drops `min()` / `clamp()` from inline styles, so a `width: min(22rem, 100%)` is invisible to a test assertion. This is why the SECOND width regression (a `fit-content` parent leaking caption length back into the bar) passed the whole unit suite and was caught only by rendering the component and looking at it. Mitigated in the touched files by using `width` + `max-width` pairs instead of `min()`, but the blind spot remains repo-wide.
- **Owner**: Mitigated, not closed
- **Next step**: `desktop/tests/inlineStyleMathGuard.test.ts` now fails if `width` or `minWidth` uses `min()` / `max()` / `clamp()` in the three files whose geometry is asserted, and it self-retires (a test fails) if jsdom ever learns to parse them. `max-width` caps are deliberately exempt: a cap can only shrink an element, so it cannot produce the containing-block bug, and banning it would force less correct fixed values purely to satisfy the harness. The real fix is a browser-based visual check in CI, which this repo does not have.

- **Migrated from**: v2.4.9#WN-2 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.4.9#WN-2; still owed: Required qualification; next: Carry browser geometry/visual verification: add a real-layout overflow/width regression assertion at supported viewports, retain failing fixture and before/after captures, and use packaged testing for packaged claims. Existing guard is a mitigation, not a full browser gate.

- **Migrated from**: v2.16#WN-9 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-126 - Spoken replies start in 4 s, not the 2.0 s target

- **Source phase**: v2.14.0 Phase 2 (2026-10-16).
- **Plan reference**: v2.14.0 T010; gate V-1 in `docs/archives/v2/v2.14/development/gates.md`; results in `docs/archives/v2/v2.14/development/voice-latency-results.md`.
- **Reason**: after the streamed pipeline and its one rework iteration (Whisper cached, `think: false` on voice turns), median time to first audio on the medium fixture is 3,990 ms against the 2,000 ms gate (baseline 38,579 ms; short fixture 1,715 ms). The remaining time is transcription (about 1.3 s) plus the model finishing and synthesizing its first full sentence. The owner kept the streamed path rather than reverting it as the plan's cut-line would have (decision recorded in the results). Recorded here, not in the v2.14 ledger, because a gap opened during the v2.14 run cannot migrate at that minor's close.
- **Suggested next step**: measure a short spoken lead-in (the first clause, split at a comma, synthesized before the full sentence) and a smaller STT model for voice turns, each against V-1 with `scripts/measure-voice-latency.mjs --mode streamed`.

- **Migrated from**: v2.15.0#DF-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#DF-1; still owed: Required qualification; v2.14 gate V-1 and recorded streaming-retention exception.; next: Keep V-1 FAIL visible. H01 measures permitted latency improvements before another runtime is considered. The existing owner exception keeps streaming; it does not make 3,990 ms meet 2,000 ms or authorize a new passing claim.

- **Migrated from**: v2.16#DF-126 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-127 - PersonaPlex full-duplex voice is a v2.15+ candidate

- **Source phase**: v2.14.0 Phase 2 (2026-10-16).
- **Plan reference**: v2.14.0 T010 (V3 trigger FIRED); comparison `docs/archives/v2/v2.14/comparisons/v2.14.0-comparison-airllm-digup-mimic-personaplex.md`.
- **Reason**: the V3 trigger fired because V-1 was missed after Phase 2. v2.14 builds nothing for PersonaPlex, as planned.
- **Suggested next step**: plan it only with the comparison's preconditions: 24 GB tier only, the loopback bind and `torch.load` fixes, a `licenseNote`, and no Nexus memory or tools in that mode; re-measure V-1 first, since DF-1's levers may close the gap without it.

- **Migrated from**: v2.15.0#DF-2 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#DF-2; still owed: Optional candidate/watch; v2.14 V3 trigger explicitly built no PersonaPlex path.; next: Propose continued conditional watch after DF-1, preserving 24 GB-only trial, loopback, safe weight loading, license note and no-memory/tools conditions. No implementation of a fourth runtime is owed by this triage scope. Any carry still needs exact approved coverage.

- **Migrated from**: v2.16#DF-127 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### WN-10 - Hosts without an NVIDIA or Apple GPU still get no voice runtime

- **Source phase**: v2.14.0 Phase 1 (2026-10-16), as v2.14 WN-6.
- **Plan reference**: v2.14.0 T001 provisioning delta.
- **Reason**: voice shares the provisioned media venv, but `scripts/installer/build/versions.lock.json` has only `win-x64-nvidia`, `linux-x64-nvidia` and `mac-arm64-apple` targets. A CPU-only host fails provisioning, so the audio runtime falls back to a bare `python` without the voice packages. Not a regression. Recorded here because a CPU target cannot be verified on the v2.14 reference host (NVIDIA GPU), and a gap opened during the v2.14 run cannot migrate at that minor's close.
- **Suggested next step**: add a CPU target (CPU torch wheels plus the same runtime requirements) and verify it on a CPU-only host or a GPU-hidden run.

- **Migrated from**: v2.15.0#WN-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#WN-1; still owed: Required implementation/qualification for voice on supported CPU-only tiers; a legacy CPU wheel list is not a provisioned target.; next: Keep A16 and H02. Add the exact CPU runtime target/interpreter path, prove isolated provisioning with GPU hidden, then exercise speech. New OS/platform expansion needs its own task.

- **Migrated from**: v2.16#WN-10 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### WN-11 - The OCR runtime is not provisioned, and its OpenCV needs numpy 2

- **Source phase**: v2.14.0 Phase 5 (2026-10-17), from the v2.14 WN-7 investigation.
- **Plan reference**: v2.14.0 T019 known-gaps reconciliation.
- **Reason**: `rapidocr-onnxruntime` appears only in the legacy `REQUIRED_WHEEL_PREFIXES` list; no verified provisioner installs it, so OCR works only where it was installed by hand. Installing it today pulls `opencv-python` 5.0.0.93, which requires `numpy>=2`, against the lock's `numpy==1.26.4`. The OCR runtime's interpreter likely defaults to a bare `python`, the same pattern as the voice bug fixed in v2.14.0 Phase 1. On the v2.14 reference host, where `rapidocr-onnxruntime` was installed by hand into the system Python, `tests/python/ocr/test_parse.py::TestEngineSelection::test_defaults_to_the_portable_engine` fails with `execution-failed` instead of `engine-unavailable` (also in the untouched main checkout, so not a v2.14 regression; CI has no RapidOCR and passes). Not proven here: which OCR features fail on a clean install.
- **Suggested next step**: provision OCR through the verified path with pinned `rapidocr-onnxruntime` and `opencv-python` versions compatible with the lock (or move the lock to numpy 2 after a media regression run), and point the OCR runtime at the provisioned interpreter.

- **Migrated from**: v2.15.0#WN-2 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#WN-2; still owed: Required clean-install OCR provisioning/interpreter integrity; installer owns runtime burden.; next: Keep A16. Freeze a compatible pinned OCR dependency set and route both hosts to the provisioned interpreter. Clean-runtime health/parse and media regressions must pass; avoid a global numpy upgrade.

- **Migrated from**: v2.16#WN-11 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### WN-12 - The pinned-digest check cannot read a remote or containerized Ollama

- **Source phase**: v2.14.0 Phase 5 (2026-10-17), Tier 3 adversarial pass (finding 9).
- **Plan reference**: v2.14.0 T016; `core/registry/ollamaDigest.ts` `ollamaModelsDir`.
- **Reason**: the check reads Ollama's manifest from the sidecar's own `OLLAMA_MODELS` or home folder. When Ollama runs elsewhere (another machine, WSL, Docker, or a service with its own `OLLAMA_MODELS`), the manifest is unreadable, the check fails closed, and `lfm2.5:24b-a2b`, the only entry with a pinned digest, is removed on every install. Nexus is local-first, so the default setup is unaffected. Not proven here: which supported configurations point Nexus at a non-local Ollama.
- **Suggested next step**: when the Ollama base URL is not loopback, report the pull as unverifiable and let the user choose, instead of deleting it; or read the digest through an Ollama API if one exposes it.

- **Migrated from**: v2.15.0#WN-3 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#WN-3; still owed: Required safe/accurate verification at install boundary plus an unresolved topology-support decision.; next: Keep A05's distinction between inaccessible identity and proven mismatch. Owner must define supported service/WSL/container/remote topologies before changing trust semantics. Never silently accept an unreadable pinned model or delete content merely because a local manifest cannot be read.

- **Migrated from**: v2.16#WN-12 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### WN-13 - A hung synthesis call keeps the voice runtime busy

- **Source phase**: v2.14.0 Phase 5 (2026-10-17), Tier 3 code-vs-plan convergence (item 3).
- **Plan reference**: v2.14.0 T005, T006; `runtimes/audio/engines.py` `iter_speak_segments`, `core/audio/AudioRuntimeClient.ts` `armIdle`.
- **Reason**: the 30 s per-segment bound is checked when a segment returns, because a synchronous Kokoro call cannot be interrupted inside its thread. The user-facing stall is bounded: after 30 s with no segment the client fails the stream and sends `speak.cancel`. But a call that never returns keeps the synthesis lane occupied, so later spoken replies queue behind it until the runtime restarts.
- **Suggested next step**: on a client idle timeout, restart the audio runtime process (the client already respawns it lazily), and add a test with a synthesis stub that never returns.

- **Migrated from**: v2.15.0#WN-4 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#WN-4; still owed: Required process recovery for shipped streamed voice; current timeout ends the request but can retain the blocked synthesis lane.; next: Keep A03 blocker. Terminate the owned hung child, settle all affected jobs once, and prove the next request runs in a fresh process. Lazy cancellation alone is not recovery.

- **Migrated from**: v2.16#WN-13 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### WN-14 - Two low-severity hardening residuals from the adversarial pass

- **Source phase**: v2.14.0 Phase 5 (2026-10-17), Tier 3 adversarial pass (finding 10 and one suspicion).
- **Plan reference**: v2.14.0 T007 (`core/chat/speakable.ts`) and the DF-5 fix (`core/registry/NexusModelRegistry.ts`).
- **Reason**: (a) nested think blocks (`<think>a<think>b</think>c</think>d`) show and speak `c</think>d`. Depth tracking was not added, because a model whose template opens reasoning in the prompt and that also emits its own opener would then show nothing at all. (b) `install(spec)` with a spec that is not in the catalog skips the catalog's weights-path validation; production calls only `installById`, so reaching it needs a modified catalog.
- **Suggested next step**: strip a stray `</think>` from visible text when no reasoning block is open; validate `weights.files` paths inside `_installWeightsFiles` as well.

- **Migrated from**: v2.15.0#WN-5 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#WN-5; still owed: Required bounded hardening in shipped reasoning display and weight-file installation; two independent residuals.; next: Keep A04 and A05 separately. Stray tag suppression must preserve prompt-open reasoning behavior; full nested-reasoning semantics remain explicit if ambiguous. Reject unsafe custom-spec file paths before filesystem/network effects. One fix cannot close both halves.

- **Migrated from**: v2.16#WN-14 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-128 - The LFM2.5 24B-A2B admission rests on a reading of M-3 made after the results

- **Source phase**: v2.14.0 Phase 3 decision (2026-10-17), recorded by the Phase 5 Goal-vs-codebase review.
- **Plan reference**: v2.14.0 T014, T016; gate M-3 in `docs/archives/v2/v2.14/development/gates.md`; `docs/archives/v2/v2.14/development/lfm-ab-results.json`.
- **Reason**: M-3(b) needs equal golden-task completion, and the frozen text puts a difference inside the run-to-run spread under HOLD, which declines. The candidate completed 19/19/21 against the holder's 22/20/20 (means 19.67 and 20.67, overlapping ranges). The owner chose on 2026-10-17, after the results existed, to count overlapping ranges as equal, which turned HOLD into ADMIT; read literally, the frozen gate declines. `gates.md` calls a gate change after results invalid evidence. The entry is opt-in and changes no default, so no user gets it without choosing it.
- **Suggested next step**: decide keep or decline with new evidence rather than the reread: either the M5 two-cycle real-use check (v2.14 human testing item 7) or a fresh A/B frozen before it runs, with enough runs per arm to separate a one-task difference from the spread.

- **Migrated from**: v2.15.0#DF-3 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#DF-3; still owed: Owner decision plus required qualification for the current LFM admission claim; v2.14 M-3 and post-result interpretation.; next: Keep the exception and literal frozen HOLD interpretation. Owner chooses a new preregistered A/B or genuine M5 two-cycle observation before treating admission as independently proved. Do not reinterpret or rescore the retained data.

- **Migrated from**: v2.16#DF-128 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### QG-10 - Spoken replies have no packaged-app evidence, and V-5 was never timed

- **Source phase**: v2.14.0 Phase 5 (2026-10-17), Goal-vs-codebase review.
- **Plan reference**: v2.14.0 "Delivery done" (packaged Windows behavioral evidence), T009, T010 Verification Expectation; gate V-5 (playback stops within 150 ms).
- **Reason**: every voice measurement drove the built sidecar over stdio with simulated playback; no run drove the installed app's window, microphone or speakers. V-5's PASS rests on the code path and a component test, not a timing. The packaged installer was rebuilt and smoke-tested in Phase 5, but that smoke does not exercise voice.
- **Suggested next step**: the owner's field test of the v2.14 human testing items 1 to 6 on the rebuilt installer, and a webview timing mark for barge-in-to-silence so V-5 can be measured; a packaged-window driver would also serve v2.14 WN-2.

- **Migrated from**: v2.15.0#QG-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#QG-1; still owed: Required packaged voice qualification and frozen V-5 timing.; next: Keep H01/H02 until installed microphone/playback behavior and barge-in-to-silence are measured against 150 ms. Code-path PASS is not timed speaker evidence.

- **Migrated from**: v2.16#QG-10 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-129 - Candidate runtime compatibility blocks scoring

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

- **Migrated from**: v2.16#DF-129 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-130 - Universal admission evidence is missing

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

- **Migrated from**: v2.16#DF-130 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### WN-15 - Residual image-access hardening items from the adversarial review

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

- **Migrated from**: v2.16#WN-15 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### WN-16 - The packaged desktop flows are not automated

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

- **Migrated from**: v2.16#WN-16 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-131 - Live rewrite quality remains unmeasured after pilot format HOLD

- **Source phase**: v2.14.1 Phase 1, T002-T004.
- **Plan reference**: [local rewrite evaluation](../../../archives/v2/v2.14/plans/v2.14.1-adoption-humanizer-handwired.md), blocked-run continuation.
- **Reason**: The sole started pilot response completed but fenced its JSON. The frozen envelope rejects fences without repair or retry. Three pilot items and all sixteen held-out items are not run; no semantic, readability or language-quality verdict is available.
- **Owner**: Maintainer.
- **Suggested next step**: If another evaluation is wanted, separately preregister a revised experiment with retained ancestry and obtain qualified language review. Do not replay this experiment, infer a quality loss or admit Humanizer from this observation.

- **Migrated from**: v2.14#DF-5 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: left open at the v2.14 close (v2.14.2 released 2026-10-19); needs an owner decision or evidence outside this run

- **Migrated from**: v2.15.0#DF-8 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#DF-8; still owed: Optional candidate/watch with a frozen experimental limitation; v2.14.1 format HOLD.; next: Preserve the failed envelope and unrun items. Another experiment needs a new preregistration and qualified language review. Do not replay the old pilot or infer rewriting quality from its format failure.

- **Migrated from**: v2.16#DF-131 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-132 - Legacy history for OpenAI-compatible backends

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

- **Migrated from**: v2.16#DF-132 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### WN-17 - Media smoke proof needs separate packaging and installation evidence

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

- **Migrated from**: v2.16#WN-17 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### QG-11 - Terminal CI reconciliation requires explicit migration decisions

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

- **Migrated from**: v2.16#QG-11 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### BG-7 - SANA ControlNet SHA-256 pins are still the all-zero placeholder.

The files were not fetched.

- **Archived record**: `docs/archive/v2/v2.4/known-gaps.md`

- **Why still owed**: The three SANA ControlNet entries still ship all-zero pins and stay exempt, so an install of them has no integrity check.
- **Next step**: Owner decides keep or drop: keep means rotate with `pin-hf-weights.py --from-dir` from an authenticated download or a public mirror; drop means remove the three rows. Either way, empty PLACEHOLDER_SHA_LEGACY_EXEMPT.
- **Migrated from**: v2.12#BG-2 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

- **Migrated from**: v2.15.0#BG-1 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#BG-1; still owed: Required artifact integrity if three SANA ControlNet entries remain catalog-supported.; next: Keep A14 pinning blocker or an explicit owner decision to remove the entries. Preserve accepted artifact/license constraints. No fake digest, unrestricted exemption, or unannounced feature removal.

- **Migrated from**: v2.16#BG-7 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-133 - MiniCPM tool tags are stripped by Ollama before Nexus can parse them.

- **Archived record**: `docs/archive/v2/v2.4/known-gaps.md`

- **Why still owed**: A runtime-boundary blocker that waits on an Ollama change; neither exit route is open on the current version.
- **Next step**: On an Ollama newer than 0.32.15, re-run the recorded echo prompt (`/api/generate`, `raw: true`) and check whether `<function` survives.
- **Migrated from**: v2.12#DF-1 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

- **Migrated from**: v2.15.0#DF-10 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#DF-10; still owed: Optional watch on an external runtime boundary; OQ-6 and the v2.4.10 raw-output evidence.; next: Preserve the exact MiniCPM re-probe trigger. Recheck actual returned tokens on a recorded runtime before proposing a parser; absent delimiters cannot be repaired by a parser test. Pair with WN-11.

- **Migrated from**: v2.16#DF-133 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### WN-18 - The bundled MiniCPM template has no tools section.

That template is outside this repo.

- **Archived record**: `docs/archive/v2/v2.4/known-gaps.md`

- **Why still owed**: The recorded exit check still fails, though the Jinja template may already open the /api/chat route; not proven here.
- **Next step**: Send one /api/chat request with a `tools` array to the MiniCPM tag and check whether the tool definitions reach the prompt; fold the result into the DF-1 re-probe.
- **Migrated from**: v2.12#WN-2 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

- **Migrated from**: v2.15.0#WN-11 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#WN-11; still owed: Optional external-template watch coupled to MiniCPM runtime hold.; next: Propose conditional carry only with DF-10's concrete runtime re-probe and existing approval coverage. Test the actual installed Ollama template/tools request; no repository-only template claim suffices.

- **Migrated from**: v2.16#WN-18 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-134 - Live NVIDIA splat generate was not run.

- **Archived record**: `docs/archive/v2/v2.4/known-gaps.md`

- **Why still owed**: The feature ships and no live NVIDIA run is recorded.
- **Next step**: On a CUDA host with TripoSplat weights installed, run `node scripts/bench-gaussian-splat.mjs --real` and add the row to the splat baseline.
- **Migrated from**: v2.12#DF-v240-1 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

- **Migrated from**: v2.15.0#DF-11 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#DF-11; still owed: Required qualification of the shipped optional splat generation route; v2.4 real NVIDIA benchmark.; next: Keep H03 hardware blocker open until verified TripoSplat bytes are installed and a real CUDA generation/output is retained. Optional user selection does not make a claim of functioning generation self-proving.

- **Migrated from**: v2.16#DF-134 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-135 - TripoSplat weight file hashes were not downloaded.

`source.sha256` is the all-zero placeholder.

- **Archived record**: `docs/archive/v2/v2.4/known-gaps.md`

- **Why still owed**: The TripoSplat files are still unpinned, and the pin check cannot see the entry, so the gap is also invisible to it.
- **Next step**: Add a weights.files list for the TripoSplat files at revision 56a96e60, then run `pin-hf-weights.py --model triposplat`.
- **Migrated from**: v2.12#DF-v240-2 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

- **Migrated from**: v2.15.0#DF-12 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#DF-12; still owed: Required implementation/integrity for the retained TripoSplat catalog row.; next: Keep A14 blocker. Identify required files at the pinned revision, add the complete file list, pin authentic bytes and prove install verification. A source-directory URL and all-zero hash do not qualify.

- **Migrated from**: v2.16#DF-135 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-136 - Older version gap logs still contain operator and hardware items that were not re-tested.

- **Archived record**: `docs/archive/v1/` and `docs/archive/v2/v2.0` through `v2.3`

- **Why still owed**: Proposed for closure at v2.15.0 triage, not accepted by the owner (T010): A pointer to other ledgers, not a gap of its own; the v2.15.0 inventory and follow-up batches now track each of those items individually. Superseded by v2.15.0-followup-batches.md.
- **Next step**: Accept or reject the proposed closure recorded in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md`.
- **Migrated from**: v2.12#DF-v240-3 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

- **Migrated from**: v2.15.0#DF-13 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#DF-13; still owed: Historical umbrella pointer; v2.15.0 inventory now enumerates the original children.; next: Propose owner-accepted supersession by the exact 199-item follow-up inventory. Preserve every child and its current disposition; closing the pointer closes none of the 199 underlying obligations.

- **Migrated from**: v2.16#DF-136 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### MT-46 - A real WebGL2 framebuffer was not captured.

- **Archived record**: `docs/archive/v2/v2.4/known-gaps.md`

- **Why still owed**: The feature ships and no real GPU framebuffer capture exists.
- **Next step**: On a GPU host, orbit a fixture splat in SplatViewerCanvas and save the canvas PNG and GL renderer string as evidence.
- **Migrated from**: v2.12#MT-v240-1 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

- **Migrated from**: v2.15.0#MT-2 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#MT-2; still owed: Required real-render qualification of the retained splat viewer claim.; next: Keep H04 until a real WebGL2 render/orbit produces inspected pixels and recorded renderer identity. Existing component fixtures are useful but not the missing framebuffer observation.

- **Migrated from**: v2.16#MT-46 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### QG-12 - The full local suite was not run on the Electron `better-sqlite3` ABI.

CI Node 22 ran it on the merge.

- **Archived record**: `docs/archive/v2/v2.4/known-gaps.md`

- **Why still owed**: Proposed for closure at v2.15.0 triage, not accepted by the owner (T010): A one-session environment limit at v2.4.0 whose own next step is done on every merge.
- **Next step**: Accept or reject the proposed closure recorded in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md`.
- **Migrated from**: v2.12#QG-v240-1 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

- **Migrated from**: v2.15.0#QG-3 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#QG-3; still owed: Historical host/ABI qualification limit; Node CI does not prove Electron ABI compatibility.; next: Owner decides the original plan's true exit bar: close the plan-scoped host limitation if explicitly allowed, or retain a named Electron ABI qualification task. Do not relabel a Node full-suite pass as an Electron full-suite pass.

- **Migrated from**: v2.16#QG-12 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### QG-13 - `develop` and `main` require only `ci-required`; `installer-required` is not a required context.

Narrowed in v2.11.0: the gate now accepts `success` only, so a skipped installer leg fails it. Still open: the maintainer adds `installer-required` to branch protection after the v2.11.0 merge (a repository setting, not a file).

- **Archived record**: `docs/archive/v2/v2.5/known-gaps.md`

- **Why still owed**: The workflow side is done and its preconditions are met, but the repository setting that makes installer-required a required check is not applied.
- **Next step**: Maintainer only (repository setting): record current protection for rollback, then add the installer-required context to develop and main required checks.
- **Migrated from**: v2.12#CI-v251-1 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010); recorded as a QG item because this ledger has no CI category

- **Migrated from**: v2.15.0#QG-4 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#QG-4; still owed: Required enforcement of an accepted installer check plus owner repository-protection authority.; next: Keep A17 and setting blocker O08. Fresh reads still require only `ci-required` on both branches. Snapshot rollback/settings, then apply only the exact approved required-context change and verify enforcement.

- **Migrated from**: v2.16#QG-13 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-137 - Chat search still matches titles only.

A hit is not labelled with the branch it belongs to.

- **Archived record**: `docs/archive/v2/v2.6/known-gaps.md`

- **Why still owed**: Search still matches titles only and a hit does not name its branch; the exit condition is not met.
- **Next step**: Add forkedFromChatId and the parent title to the search hit in ChatExplorerStore.search, asserted in desktop/tests/sidecar-node/chat-explorer-phase5.test.ts.
- **Migrated from**: v2.12#DF-v260-1 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

- **Migrated from**: v2.15.0#DF-14 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#DF-14; still owed: Required implementation of branch-aware search identity; v2.6 Chat surface contract and current search hit shape.; next: Keep A08 blocker. Return/display fork parent and branch identity, retain correct selection behavior and test parent deletion. Decide separately whether transcript-content search is an accepted requirement; title-search lineage alone does not implement content indexing.

- **Migrated from**: v2.16#DF-137 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### QG-14 - The packaged offline probe was not re-run after adding Mermaid.

The v2.6.0 asset build is not that probe.

- **Archived record**: `docs/archive/v2/v2.6/known-gaps.md`

- **Why still owed**: Proposed resolved at low confidence at v2.15.0 triage, not accepted (T010): A packaged build with Mermaid passed the same offline judge with zero findings. Low confidence: the named script was not run, and the probe may not render a Mermaid diagram.
- **Next step**: Run `desktop/tests/packaged/offline.smoke.mjs` on the next packaged probe report and record `offline: PASS`.
- **Migrated from**: v2.12#QG-v260-1 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

- **Migrated from**: v2.15.0#QG-5 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#QG-5; still owed: Required packaged offline evidence covering Mermaid use after its addition.; next: Keep H09. Capture a current packaged report that actually renders Mermaid, then run the offline judge. A judge run on an unrelated report does not establish the missing feature/network observation.

- **Migrated from**: v2.16#QG-14 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-138 - User compaction is not written back to `chat_chat_messages`, so a restart reloads the pre-compact transcript.

- **Archived record**: `docs/archive/v2/v2.6/known-gaps.md`

- **Why still owed**: A compaction is still memory-only, so a restart reloads the pre-compact transcript.
- **Next step**: Add a ChatExplorerStore method that writes the snapshot and replacement chat_chat_messages rows in one transaction, called from compactActiveChat through a sidecar handler.
- **Migrated from**: v2.12#DF-v260-2 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

- **Migrated from**: v2.15.0#DF-15 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#DF-15; still owed: Required implementation of durable user compaction; v2.6 context-control behavior.; next: Keep A09 blocker. Persist snapshot and replacement transcript atomically through the store/sidecar, exercise restart and durable undo, and preserve branch/message ownership. In-memory `replaceTranscript` is insufficient.

- **Migrated from**: v2.16#DF-138 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-139 - The Qwen3.8 guard matches `id` and `source.url` only.

- **Archived record**: `docs/archive/v2/v2.6/known-gaps.md`

- **Why still owed**: Every residual bypass in the original record is still open, and no decision says catalog review covers them.
- **Next step**: Widen the guard to family, name and displayName and a `p` separator, with tests in `TestQwen38FamilyGuard`.
- **Migrated from**: v2.12#DF-v260-3 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

- **Migrated from**: v2.15.0#DF-16 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#DF-16; still owed: Required implementation of an accepted deny-by-default admission guard; v2.6 residual bypass list.; next: Keep A12 blocker. Match the documented identity/name/family/URL surfaces and separators while keeping ordinary Qwen3 8B legal. Real validator mutations must prove both refusals and allowed neighbors.

- **Migrated from**: v2.16#DF-139 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-140 - Qwen3.8-27B is not admitted.

- **Archived record**: `docs/archive/v2/v2.6/known-gaps.md`

- **Why still owed**: Proposed for closure at v2.15.0 triage, not accepted by the owner (T010): The decision and its reopen conditions live in the acceptance bar and are enforced by the invariant; nothing is owed until a trigger fires.
- **Next step**: Accept or reject the proposed closure recorded in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md`.
- **Migrated from**: v2.12#DF-v260-4 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

- **Migrated from**: v2.15.0#DF-17 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#DF-17; still owed: Optional candidate/watch with an existing decline; acceptance-bar allowlist remains empty.; next: Propose owner acceptance of closing the old adoption request while preserving the live denial and reopen conditions. This records an active decision; it admits no Qwen3.8 model and supplies no fresh vendor qualification.

- **Migrated from**: v2.16#DF-140 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-141 - No llama.cpp serving path.

- **Archived record**: `docs/archive/v2/v2.6/known-gaps.md`

- **Why still owed**: Catalog models that need mmproj or a draft model still cannot ship, and the runtime decision the exit condition requires has not been made.
- **Next step**: Write a runtime comparison (llama.cpp as a catalog serving path versus Ollama only) and record the decision as an ADR.
- **Migrated from**: v2.12#DF-v260-5 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

- **Migrated from**: v2.15.0#DF-18 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#DF-18; still owed: Owner architecture decision about a new managed serving path; existing local adapter is narrower.; next: Keep O03 decision separate from required shipped bugs. Compare a catalog-managed llama.cpp job with existing adapters/Ollama; implement nothing merely to make the optional proposal disappear.

- **Migrated from**: v2.16#DF-141 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-142 - The uncensored-LLM product question is unanswered.

- **Archived record**: `docs/archive/v2/v2.6/known-gaps.md`

- **Why still owed**: The exit condition is an explicit product decision, and none is recorded.
- **Next step**: Owner records a yes or no on uncensored LLM entries (STRATEGY.md line or ADR), then close against it.
- **Migrated from**: v2.12#DF-v260-6 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

- **Migrated from**: v2.15.0#DF-19 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#DF-19; still owed: Owner product decision; individual model declines do not settle general uncensored-LLM policy.; next: Keep O04. Record a concrete policy or explicit deferral under the same acceptance bar; do not infer a yes/no from this task or use a new model admission as a substitute.

- **Migrated from**: v2.16#DF-142 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### WN-19 - Release-scoped Qwen3.8 mentions under `docs/archive/` stay as written.

- **Archived record**: `docs/archive/v2/v2.6/known-gaps.md`

- **Why still owed**: Proposed for closure at v2.15.0 triage, not accepted by the owner (T010): A permanent decision not to rewrite archived release text; nothing is owed and nothing can change it.
- **Next step**: Accept or reject the proposed closure recorded in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md`.
- **Migrated from**: v2.12#WN-v260-1 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

- **Migrated from**: v2.15.0#WN-12 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#WN-12; still owed: Historical preservation policy; old release prose intentionally stays unchanged.; next: Propose owner acceptance of closing this no-action historical item. Preserve archived wording; living admission records remain the current policy. Do not rewrite archives to clear the warning.

- **Migrated from**: v2.16#WN-19 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### QG-15 - Narrowed in v2.11.0: `ci.yml` now defaults to `permissions: contents: read`, and `package.json` has `fast`, `full`, and `platform` profiles composed from existing commands. Still open: no `report` profile (it needs a summary writer that reads other profiles' output) and no `release` profile (publication belongs to semantic-release), and `ci.yml` still runs its own steps rather than calling the profiles. Owner: the maintainer.

- **Archived record**: `docs/archive/v2/v2.7/known-gaps.md`

- **Why still owed**: No working report or release profile, and CI runs inline steps; overlaps QG-v212-1 fields 2 and 3, which keeps this entry separate.
- **Next step**: Owner decides whether to fold this into v2.12.0#QG-v212-1; otherwise write the report summary writer, then (separate workflow approval) replace inline CI steps with profile calls.
- **Migrated from**: v2.12#QG-v270-2 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

- **Migrated from**: v2.15.0#QG-7 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#QG-7; still owed: Required remaining canonical profile/wiring contract, with stale absence language.; next: Narrow against current report/release implementations, then retain A17's release-profile/wiring/report-input obligations. Do not create another report runner or close pipeline gaps from `--list` output.

- **Migrated from**: v2.16#QG-15 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### QG-16 - `docs/handbooks/html/atlas.html` scrolls sideways at 390 px (524 px wide) from a cause other than inline code, and CI does not run `npm run docs:handbooks:check`, which let `atlas.html` go stale until v2.11.0 regenerated it. Owner: the maintainer. Next step: find the wide element in the atlas, and add the handbook check to the `fast` profile and CI.

- **Archived record**: `docs/archive/v2/v2.11/development/v2.11.0-last-phase-evidence.md`

- **Why still owed**: The overflow is fixed, but the narrow atlas table still breaks words and no CI job or profile runs the handbook check.
- **Next step**: After the QG-v270-1 fix, add docs:handbooks:check to the fast profile (CI wiring needs workflow approval), and set a wrap rule for the atlas table.
- **Migrated from**: v2.12#QG-v211-1 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

- **Migrated from**: v2.15.0#QG-8 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#QG-8; still owed: Required handbook narrow-screen fidelity/check integration; original overflow partly fixed.; next: Keep A18 and A17's reviewed CI portion. Retain a narrow atlas capture with sensible word wrapping; add actual handbook check to the selected local profile and prove it catches drift. Do not claim horizontal overflow still reproduces without measuring.

- **Migrated from**: v2.16#QG-16 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### QG-17 - The production audit allowlist gained `global-agent`, `roarr`, and `sprintf-js` (GHSA-hp3w-g68c-fv3c, no patched `sprintf-js` release).

All three load only from `onnxruntime-node/script/install.js`, its install-time binary download, never at runtime. Fixing them needs a semver-major `global-agent` under a parent that pins `^3.0.0`. Five other advisories in the same audit were fixed in range (`proxy-addr` 2.0.8, `undici` 7.30.0, `fast-uri` 3.1.8, `ip-address` 10.7.3, `source-map-js` 1.2.2). Owner: the maintainer. Next step: remove the three entries when `onnxruntime-node` moves to `global-agent` 4 or a patched `sprintf-js` ships.

- **Archived record**: `scripts/check-prod-audit.mjs`

- **Why still owed**: The removal trigger fired (global-agent 4), but the unused allowlist entries are still in the script.
- **Next step**: Remove the three entries and their comment, then rerun check-prod-audit.
- **Migrated from**: v2.12#QG-v211-2 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

- **Migrated from**: v2.15.0#QG-9 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#QG-9; still owed: Required retirement of obsolete explicit production-audit bypasses.; next: Keep A18. Remove the three stale exceptions, then retain a fresh actual production-audit result against the current lock. No new exception or lower severity threshold.

- **Migrated from**: v2.16#QG-17 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### QG-18 - The three OS installers were not executed locally for the avatar plan.

The installer matrix workflow already exists.

- **Archived record**: `docs/archive/v2/v2.7/known-gaps.md`

- **Why still owed**: Proposed for closure at v2.15.0 triage, not accepted by the owner (T010): Plan-scoped, its own next step is in force, and the plan owed no installer run; running a real installer is tracked by v2.12.0#WN-v212-7 and CI-v251-1.
- **Next step**: Accept or reject the proposed closure recorded in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md`.
- **Migrated from**: v2.12#QG-v270-3 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

- **Migrated from**: v2.15.0#QG-10 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#QG-10; still owed: Historical avatar-plan installer scope plus qualification already owned elsewhere.; next: Propose narrow owner-accepted supersession only if the original plan owed no local three-OS install. Preserve H07 exact installed-candidate proof and QG-4 enforcement; do not certify three platforms from workflow existence.

- **Migrated from**: v2.16#QG-18 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-143 - The community Qwen-Image GGUF and Bespoke Nimble are not admitted.

No catalog row. The living-bar sentences waited.

- **Archived record**: `docs/archive/v2/v2.8/known-gaps.md`

- **Why still owed**: Proposed for closure at v2.15.0 triage, not accepted by the owner (T010): The decline is recorded and indexed; the owed living-bar sentence was superseded by the declined-models index. The v2.8 record states no reopen conditions, which the owner may want to add.
- **Next step**: Accept or reject the proposed closure recorded in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md`.
- **Migrated from**: v2.12#DF-v280-1 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

- **Migrated from**: v2.15.0#DF-20 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#DF-20; still owed: Historical declined adoption plus optional reopen watch; v2.8 decline and current exclusion tests/index.; next: Propose owner acceptance of closed-decline disposition, preserving reasons and any agreed reopen trigger in the living index. Do not add the declined names to a bar section whose tests forbid them.

- **Migrated from**: v2.16#DF-143 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-144 - CrisperWhisper 2.0 is not admitted.

The fetched page has no weights, license, or size. No catalog row.

- **Archived record**: `docs/archive/v2/v2.9/known-gaps.md`

- **Why still owed**: Proposed for closure at v2.15.0 triage, not accepted by the owner (T010): Recorded and indexed; the remaining doc step was superseded by the index. Nothing is owed unless weights, a license and a size are published.
- **Next step**: Accept or reject the proposed closure recorded in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md`.
- **Migrated from**: v2.12#DF-v290-1 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

- **Migrated from**: v2.15.0#DF-21 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#DF-21; still owed: Historical declined adoption plus publication watch; v2.9 record and current index/tests.; next: Propose owner acceptance of closure of the historical request, retaining its artifact/license/size trigger. No claim about today's external publication state is made without a new source check.

- **Migrated from**: v2.16#DF-144 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-145 - Hosted Jev, Laya 0.3.20, and Kev 0.8B, 4B, 9B, and 27B are not admitted.

No catalog row.

- **Archived record**: `docs/archive/v2/v2.10/known-gaps.md`

- **Why still owed**: Proposed for closure at v2.15.0 triage, not accepted by the owner (T010): The decline is in the living index with its reasons and a guard test enforces it; nothing is owed.
- **Next step**: Accept or reject the proposed closure recorded in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md`.
- **Migrated from**: v2.12#DF-v210-1 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

- **Migrated from**: v2.15.0#DF-22 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#DF-22; still owed: Historical declined hosted integration; v2.10 record and exclusion guard.; next: Propose owner acceptance of closure against the indexed decision and guard. Hosted Jev/Laya/Kev implementation is not owed by a completed local-first decline.

- **Migrated from**: v2.16#DF-145 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-146 - CLM-8B is not admitted, no catalog row.

Its README gives Apache-2.0 code and weights, two frozen Qwen3-8B encoders with 20M-parameter heads, ranking over a closed candidate set, and a serve path of vLLM plus `clm-serve` with no Windows instructions. It does not close DF-11. The v2.10 hosted and license grounds no longer apply to it; the runtime, single-GPU, and job-map grounds still do. The PageIndex package and PageIndex Cloud are not adopted: default models are hosted, local mode asks for an OpenAI key, and OCR and MCP are cloud-only. The local equivalent is PI-1 in the v2.11.0 plan. AIRI was re-checked through 0.12.0-beta.5 with no new adoption.

- **Archived record**: `docs/archive/v2/v2.11/comparisons/v2.11.0-comparison-pageindex-airi-clm.md`

- **Why still owed**: Proposed for closure at v2.15.0 triage, not accepted by the owner (T010): Recorded and indexed with the grounds that still apply, and enforced by a guard test; nothing is owed.
- **Next step**: Accept or reject the proposed closure recorded in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md`.
- **Migrated from**: v2.12#DF-v211-1 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

- **Migrated from**: v2.15.0#DF-23 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#DF-23; still owed: Historical declined CLM/PageIndex adoption; v2.11 corrected grounds, index and guard.; next: Propose owner acceptance of closure while preserving corrected runtime/job-map grounds and original evidence. This is neither a CLM implementation nor an admission result.

- **Migrated from**: v2.16#DF-146 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-147 - CPU OCR (RapidOCR, the portable default) costs about 6.8 s per text-dense page on this host: a 60-page PDF takes about 7 minutes on the first `document_outline` call, the same cost `parse_document` already pays. The GPU engine was not measured. The runtime also caps at 200 pages and reports `pageCount: 200`, hiding truncation past that.

- **Archived record**: `docs/archive/v2/v2.11/development/outline-feasibility.md`

- **Why still owed**: OCR cost is unchanged and the GPU engine is unmeasured; the page count still reports the capped value, though truncation is now marked.
- **Next step**: Return the PDF's total page count from runtimes/ocr beside the parsed count, and time a 100-page first outline on the GPU engine.
- **Migrated from**: v2.12#DF-v211-3 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

- **Migrated from**: v2.15.0#DF-25 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#DF-25; still owed: Required surviving generic OCR metadata and real-engine qualification; mixed historical outline timing.; next: Return trustworthy total and parsed page counts through runtimes/ocr and both surviving parse_document hosts; retain unknown granularity where page boundaries are unavailable. Prove capped/uncapped PDF behavior and qualify real GPU OCR throughput separately. Preserve old measurements; do not benchmark or restore retired document_outline.

- **Migrated from**: v2.16#DF-147 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### WN-20 - No egress from the OCR child process is proven at socket level.

The test traps sockets in the Node process and scans first-party OCR sources for network imports; third-party OCR packages and first-run model downloads are not covered. Not proven here.

- **Archived record**: `tests/unit/modules/coding/documents/DocumentOutlineTools.test.ts`

- **Why still owed**: No process-level proof that the OCR child sends nothing out; third-party packages and first-run model downloads are uncovered.
- **Next step**: Run the OCR child under an OS-level network block during an outline parse and record the result as evidence.
- **Migrated from**: v2.12#WN-v211-6 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

- **Migrated from**: v2.15.0#WN-13 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#WN-13; still owed: Required process-level offline qualification of the retained OCR local-only claim.; next: Keep H08. A scoped OS containment run must show the real Python child can parse with installed weights and cannot open outbound sockets. Node mocks/source scans are insufficient.

- **Migrated from**: v2.16#WN-20 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### WN-21 - Both agent loops now send `tools` natively to every model whose catalog format is not `none` (the extension already did).

A model Ollama reports without the `tools` capability may reject such a request. Not proven here: every chat model installed on this host declares `tools`.

- **Archived record**: `docs/archive/v2/v2.11/development/history/2026-10-03_v2.11.0-pageindex-airi-clm-phase-5.md`

- **Why still owed**: Nothing checks model capabilities before sending native tools, and the behavior with a model that lacks them is unproven.
- **Next step**: Read /api/show capabilities once per model and skip native tools when `tools` is missing, with a stubbed unit test.
- **Migrated from**: v2.12#WN-v211-4 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

- **Migrated from**: v2.15.0#WN-17 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#WN-17; still owed: Required robust native-tool request routing for supported installed models.; next: Keep A12. Read/corroborate actual model capability, define unknown/probe-failure fallback, and preserve functional tool access. A format binding alone is not a runtime capability assertion.

- **Migrated from**: v2.16#WN-21 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-148 - Aleph Alpha's Kolibri-1 (released 2026-10-03, Apache-2.0, 78B total and 3.46B active parameters, about 78 GB in FP8) is not admitted, no catalog row.

The smallest community GGUF (Q3_K_S, about 3.47 bits per weight) is roughly 34 GB by arithmetic, above the 24 GB top tier. Stock Ollama, llama.cpp, and LM Studio cannot load it; the official path needs vLLM with the vendor `aleph-alpha-inference` package. The trained context is 262,144 tokens; 1M is an extrapolation. It fails gates 3, 4, and 5 of the v2.3.0 admission record. Reopen conditions: BOTH a runtime condition (an official `ollama.com/library` tag, or Kolibri support merged into a released upstream llama.cpp) AND a size condition (a first-party Kolibri variant whose quantized weights plus KV cache at the tier's context fit 24 GB, or a raised top tier in `core/registry/recommended.json`). Meeting both reopens the acceptance bar; neither admits the model. Owner: the maintainer.

- **Archived record**: `docs/v2/v2.12/comparisons/v2.12.0-comparison-kolibri-1.md`

- **Why still owed**: Proposed for closure at v2.15.0 triage, not accepted by the owner (T010): Recorded with explicit reopen conditions and enforced by a guard test. The guard test reads the register entry, so the entry text must stay in place when closed.
- **Next step**: Accept or reject the proposed closure recorded in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md`.
- **Migrated from**: v2.12#DF-v212-1 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

- **Migrated from**: v2.15.0#DF-28 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#DF-28; still owed: Historical declined Kolibri adoption plus combined size/runtime reopen watch; seed guard and index.; next: Propose owner acceptance of closed-decline disposition, preserving exact original entry text, evidence and combined trigger. The original accepted task is to record/enforce the decline, not implement the model.

- **Migrated from**: v2.16#DF-148 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-149 - No catalog-wide check that every entry's declared size fits its tier; the Kolibri-1 decision keeps a per-model guard instead (decided at the seed plan's grill).

Source phase: v2.12.0 Phase 1. Plan reference: `docs/v2/v2.12/plans/v2.12.0-adoption-kolibri-1.md`, parked gaps. Owner: the maintainer. Next step: a plan that already edits `core/registry/catalog.json` measures how many current entries such a check would flag before adopting it. Measured in v2.14.0 Phase 5 over 41 entries ([script](../../../archives/v2/v2.14/development/evidence/measure-catalog-size-check.mjs)): a tier-default check flags 1 (`qwen3.5:4b` is a cpu agentic default yet declares `requiredVramGB` 4); a field-consistency check flags 9 (six `hideBelowVramGB` values below the declared need, several apparently deliberate for offload builds; two embedding models with `vramGB` 1 over `requiredVramGB` 0; `triposplat` with no `sizeGB`). Adoption stays an owner decision.

- **Archived record**: `docs/v2/v2.12/plans/v2.12.0-adoption-kolibri-1.md`

- **Why still owed**: The measurement is done; the owner's adopt-or-decline decision is not, and the measurement surfaced unresolved field inconsistencies.
- **Next step**: Owner decides from the v2.14 measurement: adopt the tier-default check after fixing the flagged entry, or record a decline.
- **Migrated from**: v2.12#DF-v212-2 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

- **Migrated from**: v2.15.0#DF-29 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#DF-29; still owed: Owner adoption decision for a catalog-wide invariant; v2.14 measurement found real exceptions.; next: Keep O06. Choose/justify the proposed invariant against the measured CPU/offload cases before adopting it. Do not impose a naive VRAM rule that breaks deliberate offload/default semantics.

- **Migrated from**: v2.16#DF-149 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-150 - No catalog field separates a vendor's trained context from its extrapolated maximum (comparison KOL-2).

Source phase: v2.12.0 Phase 1. Plan reference: `docs/v2/v2.12/plans/v2.12.0-adoption-kolibri-1.md`, parked gaps. Owner: the maintainer. Next step: reopen when a second model with an extrapolated context claim reaches review.

- **Archived record**: `docs/v2/v2.12/comparisons/v2.12.0-comparison-kolibri-1.md`

- **Why still owed**: A watch item with a trigger that only this entry and a plan carry; closing it would lose the watch.
- **Next step**: Move the trigger into model-acceptance.md as an open question, then close the entry against it.
- **Migrated from**: v2.12#DF-v212-3 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

- **Migrated from**: v2.15.0#DF-30 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#DF-30; still owed: Optional metadata watch whose trigger needs a durable living owner; seed KOL-2 scope.; next: Implement A15's living open-question transfer, then propose closure of this tracking entry against that exact retained trigger. Do not add a trained-context schema field before the second relevant model reaches review.

- **Migrated from**: v2.16#DF-150 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### QG-19 - The completion checker's contract conflicts block every minor run here

- **Source phase**: v2.15.0 Phase 4 (2026-10-19), from the v2.14 run and the v2.15 run.
- **Plan reference**: v2.15.0 T015; [Nexus-Hub checker handoff](../../../archives/v2/v2.15/development/v2.15.0-nexus-hub-checker-handoff.md).
- **Reason**: the Nexus-Hub completion checker (v4.13.13, `completion_minor.py` sha256 `f1689e72b6f96835`) has contract conflicts that are not missing work in this repository and that this repository cannot fix: (1) `gaps.minor` reaches every ledger back to v0.7, and the 142 problems left in v0.7 and v1.0 to v1.3 can never parse, so `MINOR COMPLETE` is unreachable without a legacy cutoff; (2) `tests.evidence` rejects an honest count of pre-existing failures; (3) `release.changelog` expects `## [x.y.z]` while semantic-release writes `# [x.y.z](...)`; (4) a re-recorded run resets `start_head`, and a plan rename reads as tampering; (5) run-owned merged branches are kept as `recently-active`; (6) `record block` rejects a legitimate `approval-not-covered`; (7) a blocker-answer paste was not captured in the v2.14 run (it was captured in v2.15); (8) `minor_close.py archive` repairs Markdown links only; (9) record lookup from a linked worktree fails (`record block`, `migrate`); (10) `check-minor` hides predicate detail when blocked; (11) `check_handbooks.py` hashes working-copy CRLF bytes; (12) `validate_unicode_safety.py --fix` rewrites raw evidence; (13) small items (relative `load_ledgers` root, the approval page's gap and time wording); (14) `record answer --text` spends the round on a note; (15) the turn-end gate reads the plan from the main checkout and opens `no-progress` while a run waits on its own agents; (16) no tool migrates a gap from an older minor into the current one; (17) a task whose path a later phase deletes reads unmet after the merge, because the task-path log lacks `--full-history`. Each finding, with its evidence and a suggested fix, is in the handoff prompt.
- **Suggested next step**: give the handoff prompt to the agent maintaining Nexus-Hub, and record its answer (fixed, already fixed, or declined, with reasons) here; then re-run `check_plan_completion.py check-minor v2.15` and close the findings it resolves.

- **Migrated from**: v2.15.0#QG-11 on 2026-10-21 (reason: user-deferred)
- **Migration evidence**: v2.15.1 recorded triage; source v2.15.0#QG-11; still owed: Required checker/record-contract qualification before declaring minor completion.; next: Keep plan T014/A19. Adopt only tested checker revisions, preserve historical pins and signed scope, rerun actual verdicts, and retain unresolved release mapping/absorbed-seed/legacy-scope/approval/evidence blockers. No fake release, arbitrary cutoff or signed JSON edit.

- **Migrated from**: v2.16#QG-19 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### BG-8 - Automatic release preparation cannot push its version commit to protected main

- **Source phase**: v2.15.1 Phase 4 (T418), publication recovery observed on 2026-10-22; this defect was discovered after the frozen 262-identity triage approval.
- **Plan reference**: [Archive readiness, T418](../../../archives/v2/v2.15/plans/v2.15.1-archive-readiness.md#phase-4-integration-and-publication); [release recovery](../../../archives/v2/v2.15/development/v2.15.1-release-recovery.md).
- **Reason**: Automatic Semantic Release run 39814892000 selected v2.15.1 and prepared CHANGELOG.md, package.json and package-lock.json, but @semantic-release/git could not push its new commit to protected main: GH006 required ci-required validation that the newly generated commit did not have. The configured release commit also contains a skip-ci marker. The bounded current-release recovery prepares metadata through validated PRs and plans a human-attributed native annotated tag from the canonical checkout only after the exact main commit passes the installed release preconditions. That recovery is not a permanent repair of the automatic pipeline; no branch-protection bypass, status fabrication or relaxed gate is authorized.
- **Suggested next step**: Take the permanent release-architecture repair through separately reviewed workflow scope. Prove that prepared version commits receive the required protected-branch validation before an actual release/tag is created, reproduce the protected-main failure in an isolated fixture, and verify exactly one intended release with no direct-push or protection bypass. Preserve the existing CI events, permissions and required gates unless a separately authorized review changes them.
- **Evidence**: [Failure and bounded recovery](../../../archives/v2/v2.15/development/v2.15.1-release-recovery.md#failure), release run 39814892000; retained release-recovery packet and independently qualified native annotated-tag fixture. [Late automation proposal](../../../archives/v2/v2.15/development/v2.15.1-late-automation-proposal.md) records the separate OPEN follow-up. No permanent-fix result is claimed.
- **Placement basis**: Direct new future-version record subject to the separate owner-exception addendum. This is not an inherited or migrated member of the original 245-item disposition set.

- **Migrated from**: v2.16#BG-8 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### BG-9 - Release notes extraction ignores configured double-hash changelog headings

- **Source phase**: v2.15.1 Phase 4 (T418), publication recovery observed on 2026-10-22; this defect was discovered after the frozen 262-identity triage approval.
- **Plan reference**: [Archive readiness, T418](../../../archives/v2/v2.15/plans/v2.15.1-archive-readiness.md#phase-4-integration-and-publication); [release recovery](../../../archives/v2/v2.15/development/v2.15.1-release-recovery.md).
- **Reason**: The tagged release workflow extracts notes only when a line begins with # [<version>], while the configured analyzer/notes/changelog preparation emitted ## [2.15.1](../v2.16/...) for the actual prepared patch. Running the existing AWK expression against that generated CHANGELOG emits no notes, even though the matching release section has content. The separately authorized current-release body repair must be verified against the actual semantic-release notes; it does not change or permanently fix the extractor. Prepared metadata and a repaired body do not by themselves prove tagged builds, assets or release readiness.
- **Suggested next step**: Make a separately reviewed narrow workflow repair that selects exactly the requested version at the configured changelog heading levels and stops at the next release section. Exercise single-hash and double-hash linked headings, matching and nonmatching versions, missing or duplicate sections, and empty notes; verify the resulting actual GitHub release body matches the intended semantic-release notes without changing workflow events, permissions, jobs or required gates.
- **Evidence**: [Extractor reproduction](../../../archives/v2/v2.15/development/v2.15.1-late-automation-proposal.md#extractor-reproduction) records the actual existing .github/workflows/release.yml expression producing no output from the prepared CHANGELOG.md v2.15.1 double-hash heading. Actual current-release body repair and its verification remain pending. No permanent-fix result is claimed.
- **Placement basis**: Direct new future-version record subject to the separate owner-exception addendum. This is not an inherited or migrated member of the original 245-item disposition set.

- **Migrated from**: v2.16#BG-9 on 2026-10-29 (reason: user-deferred)
- **Migration evidence**: The frozen v2.16 approval lists this inherited obligation for carry to v2.17; retain its complete original body and provenance.

#### DF-151 - 1.P1.A -- Tauri runtime smoke not executed on this host (DF, P1)

- **Source phase**: Phase 1 (1.1, 1.8)
- **Plan reference**: [phase-01-shell-foundation.md](../../../archive/v1/v1.0/plans/phase-01-shell-foundation.md) sub-task 1.1 acceptance ("`npm run dev:shell` opens a window") and 1.8 acceptance ("integration test that boots the shell with WebDriver / Playwright").
- **Reason**: The implementing session ran on a Windows 11 host without an interactive desktop session. `cargo check` / `cargo clippy` / `cargo test` were not exercised locally because the Rust toolchain install was not in scope of this session; the Tauri shell relies on the new `shell-build.yml` GitHub Actions matrix (windows-latest / macos-latest / ubuntu-latest) to validate the Rust core. Vitest + lint + typecheck all passed on this host (52/52, 99.11% lines, 100% functions).
- **Suggested next step**: First green CI run on the `shell-build.yml` workflow validates 1.1's acceptance criterion across all three OS legs; if any leg fails, fold the diagnosis into Phase 2 (the next cycle entry, which already touches the desktop workspace for the rebrand sweep). A live `npm run dev:shell` smoke (window opens, ping IPC roundtrips) is also expected to be captured by the operator in `docs/versions/v1/v1.0.0/operator-actions.md` once that file is opened at Phase 11.

- **Migrated from**: v1.0#DF-1-P1-A on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-152 - 1.P2.B -- Tailwind v4 wiring deferred (DF, P2)

- **Source phase**: Phase 1 (1.2)
- **Plan reference**: [phase-01-shell-foundation.md](../../../archive/v1/v1.0/plans/phase-01-shell-foundation.md) sub-task 1.2 ("Apply tokens via Tailwind CSS v4 configured to consume CSS variables").
- **Reason**: Tokens are codified in `desktop/src/styles/tokens.css` and consumed directly via `var(--token)` in every component. Tailwind v4's `@theme inline` directive would re-expose the same vars as utility classes, but plumbing Tailwind v4 also requires PostCSS configuration that we do not need until Phase 2 (rebrand sweep) when the build pipeline is otherwise touched. Shipping Tailwind in Phase 1 would have added a build step with zero behavioural change.
- **Suggested next step**: Phase 2.X (carve `core/` from `src/`) folds in a Tailwind v4 step alongside the build-pipeline rebrand; until then, components read tokens directly. The `<StyleguidePage>` already inspects every token visually so the verification path stays intact.

- **Migrated from**: v1.0#DF-1-P2-B on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### NI-3 - 1.P2.C -- Lucide React icon usage stops at module-default icons (NI, P2)

- **Source phase**: Phase 1 (1.3)
- **Plan reference**: [phase-01-shell-foundation.md](../../../archive/v1/v1.0/plans/phase-01-shell-foundation.md) sub-task 1.3 ("color-coded icons (Chatbot / Agentic AI / Images / Videos)").
- **Reason**: The Sidebar maps each module to a single Lucide icon (MessageSquare / Code2 / Image / Film). The mockup hints at custom glyphs for each pillar; we hold the visual identity work for Phase 2 brand sweep so the rebrand and the icon refresh land together and we do not churn the icon set twice.
- **Suggested next step**: Phase 2 rebrand sweep includes finalizing the Lucide icon shortlist or commissioning custom SVGs.

- **Migrated from**: v1.0#NI-1-P2-C on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-153 - 1.P2.D -- Tauri integration / E2E test pending (DF, MT, P2)

- **Source phase**: Phase 1 (1.8)
- **Plan reference**: [phase-01-shell-foundation.md](../../../archive/v1/v1.0/plans/phase-01-shell-foundation.md) sub-task 1.8 ("integration test that boots the shell with WebDriver / Playwright (if Tauri-compatible)").
- **Reason**: Phase 1 ships unit tests at 99.11% lines / 100% functions / 87.21% branches across `desktop/src/` and the Node sidecar (well above the 80% gate). An end-to-end Tauri-driver test that actually spawns the native window + sidecar requires `tauri-driver` and a display server (`xvfb`/`Xvnc` on Linux, headed runs on macOS / Windows). That harness has its own setup cost; we ship the unit + sidecar coverage now and add the Tauri-driver smoke in a follow-on without delaying Phase 2.
- **Suggested next step**: Land `tauri-driver` + a single "open window + ping IPC + close" Playwright/WebDriver smoke in the `shell-build.yml` CI job, scheduled as the first task of Phase 2 testing-and-stabilization.

- **Migrated from**: v1.0#DF-1-P2-D on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-154 - 2.P1.G -- Storage-path call-site rename deferred (DF, P1)

- **Source phase**: Phase 2 (2.2)
- **Plan reference**: [phase-02-rebrand-and-core-extraction.md](../../../archive/v1/v1.0/plans/phase-02-rebrand-and-core-extraction.md) sub-task 2.2 ("Search for every literal of the old path in `src/`, `tests/`, `scripts/`, `docs/`").
- **Reason**: The migration module (`core/storage/StorageMigration.ts`) and the canonical-path helper (`core/storage/paths.ts`) land in Phase 2.2. The 9 homedir-based call sites in `src/` (`MemoryFiles.ts`, `SkillLoader.ts`, `SkillMetrics.ts`, `CurationLoop.ts`, `WorkflowDetector.ts`, `McpManager.ts`, `ImprovementHook.ts`, `TraceFile.ts`, `PlanArchive.ts`, `quickLabels.ts`) plus the 4 workspace-local sites (`webCache.ts`, `MemoryHealthCheck.ts`, `OutputRedirector.ts`, `dbPermissions.ts`) still read/write `~/.gemma-code/` and `<workspace>/.gemma-code/`. POSIX symlink (created by the migration) keeps `~/.gemma-code/` working on macOS / Linux; on Windows the legacy directory is preserved alongside the new one. The mechanical rename cascades into ~14 test files; doing it atomically with the migration was deemed higher-risk than two separate landings.
- **Suggested next step**: A follow-up Phase 2.2.1 commit replaces every call site with `nexusHome()` / `path.join(workspaceRoot, ".nexus")`, updates the affected tests, and removes the legacy `.gemma-code` paths from `src/utils/secretPaths.ts`. Verify by `grep -r "\.gemma-code" src/ tests/ scripts/` returning zero hits outside `docs/v0.X.0/development/history/`.

- **Migrated from**: v1.0#DF-2-P1-G on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-155 - 2.P1.H -- Settings package.json deprecationMessage incomplete (DF, P1)

- **Source phase**: Phase 2 (2.1)
- **Plan reference**: [phase-02-rebrand-and-core-extraction.md](../../../archive/v1/v1.0/plans/phase-02-rebrand-and-core-extraction.md) sub-task 2.1.
- **Reason**: The `SettingsCompat` shim resolves every legacy `gemma-code.*` key to its canonical `nexus.*` counterpart with a runtime deprecation log. The canonical `nexus.*` schema entries were added to `package.json` for the load-bearing keys (`ollamaUrl`, `modelName`, `editMode`, `memoryEnabled`, etc.) but the older `gemma-code.*` schema entries are mostly NOT tagged with `deprecationMessage`. VS Code therefore renders the legacy keys as ordinary settings in the Settings UI; users see them but get no in-UI deprecation hint. The runtime log catches misconfigured callers regardless.
- **Suggested next step**: A scripted pass that walks `SETTINGS_KEY_MAP` and injects `"deprecationMessage": "Use \`<newKey>\` instead. Removed in v1.1.0."` into every legacy entry in `package.json contributes.configuration.properties`. Verify with the existing `SettingsCompat.test.ts` and a snapshot of `package.json`.

- **Migrated from**: v1.0#DF-2-P1-H on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-156 - 2.P2.I -- Wholesale physical move of `src/` -> `modules/coding/` deferred (DF, P2)

- **Source phase**: Phase 2 (2.3)
- **Plan reference**: [phase-02-rebrand-and-core-extraction.md](../../../archive/v1/v1.0/plans/phase-02-rebrand-and-core-extraction.md) sub-task 2.3 ("Move `src/llm/` -> `core/llm/`; `src/storage/` -> `core/memory/`; `src/tools/` -> `modules/coding/tools/`...").
- **Reason**: Phase 2.3 establishes the canonical `core/` + `modules/coding/` directory layout, the dep-cruiser boundary rules, and the new `tsconfig` `rootDirs`. The shared-core surfaces (Phase 2.6) and the storage migration (Phase 2.2) live under `core/`. However, the 189 files currently under `src/` are NOT yet moved into `modules/coding/<sub-tree>/` because the cascading import-path rewrite across 517 test files is mechanical but high-volume, and doing it inside the same commit as the rebrand sweep would have made review and rollback substantially harder. The boundary rule is enforced for any NEW code added to `core/` or `modules/`.
- **Suggested next step**: Phase 2.3.1 (follow-on commit) performs the wholesale move with `git mv`, runs a single find/replace pass over the import paths, and re-runs the full test suite. Acceptance: `npm test` stays green, `npm run check-architecture` stays green, every import in `modules/coding/` resolves from `core/` or `modules/coding/<sibling>/`.

- **Migrated from**: v1.0#DF-2-P2-I on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-157 - 2.P1.J -- VS Code extension manifest IDs not renamed (DF, P1)

- **Source phase**: Phase 2 (2.7)
- **Plan reference**: [phase-02-rebrand-and-core-extraction.md](../../../archive/v1/v1.0/plans/phase-02-rebrand-and-core-extraction.md) sub-task 2.7 ("grep for `GemmaCode` and `gemmaCode` returns 0 results in `src/`...").
- **Reason**: Code identifiers `GemmaCodePanel` / `GemmaRuntime` were renamed to `NexusCodingPanel` / `NexusCodingRuntime`. The VS Code extension manifest in `package.json` still uses `gemma-code-sidebar` (viewContainer id), `gemma-code.<command>` (command ids), and `gemma-code.chatView` / `.memoryPanel` / `.traceDashboard` (view ids). Renaming these is a breaking change for any user who has personal keybindings bound to `gemma-code.<command>`; ride a major VS Code extension version bump (v1.1.0) so the breaking-change story is bundled with the npm package re-publish.
- **Suggested next step**: Phase 11 release-gate task: rename every `gemma-code.*` view / command id to `nexus.coding.*`, bump the extension manifest version, update keybinding-customization docs, and re-publish under `nexus-coding` on the VS Code Marketplace.

- **Migrated from**: v1.0#DF-2-P1-J on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-158 - 2.P2.K -- VS Code extension npm package name not renamed (DF, P2)

- **Source phase**: Phase 2 (rebrand)
- **Plan reference**: pivot-brief Section 7.
- **Reason**: `package.json` `"name": "gemma-code"` and `"publisher": "gemma-code"` are unchanged. Renaming these forks the published VSIX -- a user installed from `gemma-code` Marketplace listing cannot transparently migrate to a `nexus-coding` listing without a manual update flow. Defer to the same v1.1.0 release that flips the VS Code extension manifest IDs (item J).
- **Suggested next step**: Tie this rename to the v1.1.0 cycle so both happen in a single Marketplace re-publish.

- **Migrated from**: v1.0#DF-2-P2-K on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-159 - 2.P3.L -- Pre-existing test failures on Windows (DF, BG, P3)

- **Source phase**: Phase 2 (2.9 test run)
- **Plan reference**: [phase-02-rebrand-and-core-extraction.md](../../../archive/v1/v1.0/plans/phase-02-rebrand-and-core-extraction.md) sub-task 2.9 acceptance ("Run the test suite, fix all failures").
- **Reason**: After Phase 2 changes land, 5 tests still fail under `npm test`: 4 in `tests/unit/agents/SubAgentManager.characterization.test.ts` (snapshot files stored with LF in git but checked out with CRLF on Windows; the prompt builder emits LF), and 1 in `tests/unit/workflow-discipline.test.ts` (the Phase 1 `.github/workflows/shell-build.yml` references `dtolnay/rust-toolchain@stable` and `actions/cache@v4` without 40-char SHA pinning). Neither is caused by Phase 2: a `git stash`-and-rerun shows the same failures before any Phase 2 commit. The 2683 / 5-fail / 5-skip count is held at the same level as pre-Phase-2 baseline.
- **Suggested next step**: Two separate follow-ups. (1) Add a `.gitattributes` rule normalising `tests/snapshots/specialists/*.txt` to LF, or change the test to compare normalised strings (`actual.replace(/\r\n/g, "\n")`). (2) SHA-pin the two GitHub Actions references in `shell-build.yml` to specific commits with version-tag comments, matching the rest of `.github/workflows/`.

- **Migrated from**: v1.0#DF-2-P3-L on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-160 - 3.P1.M -- NexusCodingRuntime not wired into the sidecar session manager (DF, P1)

- **Source phase**: Phase 3 (3.1)
- **Plan reference**: [phase-03-coding-module.md](../../../archive/v1/v1.0/plans/phase-03-coding-module.md) sub-task 3.1 ("instantiate `NexusCodingRuntime` once per process and route IPC calls into it").
- **Reason**: The full `NexusCodingRuntime` (AgentLoop + ToolRegistry + ChatController) still lives under `src/` during the one-cycle compat window; the sidecar workspace cannot import from `../../src/` cleanly without the shared-core build step that lands in Phase 5. Phase 3 ships an in-memory `CodingSessionManager` against a stable IPC surface so the desktop UI, frontend tests, and the protocol union are all exercised end-to-end. The Phase 3 acceptance "an end-to-end fix-the-failing-test task succeeds against each of the three model backends" therefore runs against the placeholder responder rather than a live engine.
- **Suggested next step**: Phase 5 introduces the shared-core build and Phase 3 follow-on swaps the placeholder responder in `desktop/sidecar/src/coding/sessionManager.ts` for a real `NexusCodingRuntime` instance. The IPC contract does not change; only the body of `sendMessage` does.

- **Migrated from**: v1.0#DF-3-P1-M on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-161 - 3.P1.N -- Streaming IPC notifications still envelope-only (DF, P1)

- **Source phase**: Phase 3 (3.1)
- **Plan reference**: [phase-03-coding-module.md](../../../archive/v1/v1.0/plans/phase-03-coding-module.md) sub-task 3.1 ("streams agent output as `coding.session.event` notifications").
- **Reason**: The Phase 1 JSON-RPC transport is request/response only -- the sidecar lacks a server-initiated notification channel (no second pipe, no SSE, no WebSocket). Phase 3 ships the full event union (`token` / `toolCallHeader` / `toolCallArgDelta` / `toolCallComplete` / `done`) but returns the events in the response envelope from `coding.session.sendMessage`. The desktop frontend already reduces the event array via the `toolCallCard` reducer, so the rendering path is identical for the streamed and batched variants.
- **Suggested next step**: Phase 5 (where the IPC surface is broadened anyway for the model browser) adds a Tauri `tauri::Channel` for notifications; the sidecar emits one frame per event, the response shrinks to `{sessionId}`, and the frontend swaps the event reducer onto a channel listener.

- **Migrated from**: v1.0#DF-3-P1-N on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-162 - 3.P1.O -- Thin VS Code adapter still hosts the engine in-process (DF, P1)

- **Source phase**: Phase 3 (3.3)
- **Plan reference**: [phase-03-coding-module.md](../../../archive/v1/v1.0/plans/phase-03-coding-module.md) sub-task 3.3 ("The extension at `src/extension.ts` becomes a ~200-line adapter that...").
- **Reason**: `src/extension.ts` is 445 lines today and wires the full in-process engine. Phase 3 ships `src/desktop/daemonDiscovery.ts` (with unit tests covering proxy / extension-only / opt-in / error branches) so the activation code path that decides between proxying and falling back is in place; the actual rewrite of the activator + panel hosts is a contained refactor that lands as a Phase 3 follow-on once the daemon socket layer (item N) is ready to carry the proxy traffic.
- **Suggested next step**: Phase 3 follow-on commit: extract `extension.ts` activation into a smaller `activateProxy()` / `activateExtensionOnly()` branch behind `discoverDesktopDaemon()`; thin the panel hosts (`NexusCodingPanel`, `MemoryPanel`, `TraceDashboardPanel`) to webview shells that forward `postMessage` calls into the IPC client.

- **Migrated from**: v1.0#DF-3-P1-O on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-163 - 3.P1.P -- Legacy curator-cadence fallback still present in AgentLoop (DF, P1)

- **Source phase**: Phase 3 (3.4)
- **Plan reference**: [phase-03-coding-module.md](../../../archive/v1/v1.0/plans/phase-03-coding-module.md) sub-task 3.4 ("Once the scheduler is wired and integration-tested, delete the legacy curator-cadence fallback in `modules/coding/tools/AgentLoop.ts._runOneIteration`").
- **Reason**: The Phase 3 scheduler bootstrap (`desktop/sidecar/src/runtime/idleScheduler.ts`) is wired with synthetic curator + reflect workers and verified by the 30-minute integration test. The legacy post-N-edits dispatch in `src/tools/AgentLoop.ts._runOneIteration` is left in place because the engine is still hosted by the VS Code extension during the compat window, and deleting it now would regress the v0.22.x extension-only mode that item O still relies on. The new scheduler path becomes the only entry point once the engine moves into `modules/coding/`.
- **Suggested next step**: Bundle with the AgentLoop relocation: delete the curator-cadence fallback, add a Settings UI toggle at `nexus.curator.enabled` (default `true`), and a regression test that asserts the scheduler is the sole curator entry point.

- **Migrated from**: v1.0#DF-3-P1-P on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-164 - 3.P1.Q -- Memory / Trace / Sessions panels backed by placeholder data (DF, P1)

- **Source phase**: Phase 3 (3.5)
- **Plan reference**: [phase-03-coding-module.md](../../../archive/v1/v1.0/plans/phase-03-coding-module.md) sub-task 3.5 ("Each panel consumes data via the IPC protocol... Reuse the existing `MemoryPanel` host-side handlers").
- **Reason**: The desktop panels (`MemoryPanel`, `TraceDashboardPanel`, `SessionListPanel`) ship in `desktop/src/modules/coding/panels/` and render the full data shape they will see in production (four memory layers + `anticipated` + `proposedSkills`; trace events with redacted secret paths; session summaries). The sidecar handlers (`coding.memory.snapshot`, `coding.trace.subscribe`, `coding.sessions.list`) return deterministic placeholder payloads in `desktop/sidecar/src/coding/panelData.ts`. The wiring to live `MemoryHub` / `TelemetryBus` waits on the same engine relocation that items M and P depend on.
- **Suggested next step**: When `MemoryHub` is imported by the sidecar, replace `memorySnapshot()` and `traceSubscribe()` with adapter functions that call into the hub and bus. Reuse the existing `redactSecrets()` utility unchanged; widen its pattern set as the security review surfaces additional secret formats.

- **Migrated from**: v1.0#DF-3-P1-Q on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-165 - 3.P2.R -- Slash-command parity test against VS Code reference deferred (DF, MT, P2)

- **Source phase**: Phase 3 (3.6)
- **Plan reference**: [phase-03-coding-module.md](../../../archive/v1/v1.0/plans/phase-03-coding-module.md) sub-task 3.6 acceptance ("an integration test runs each of the 12 most-used slash commands... and asserts identical outputs against the VS Code reference").
- **Reason**: The desktop chat input now autocompletes the twelve canonical slash commands (`/plan`, `/clear`, `/commit`, `/review-pr`, `/curate`, `/trace`, `/thinking-mode`, `/skill-metrics`, `/memory`, `/verify`, `/research`, `/help`) and unit tests cover the catalog + filter behaviour. The end-to-end equivalence test (run each command in the desktop module and in the VS Code reference, assert byte-identical outputs) requires the live `SlashCommandRouter` import path which is blocked on items M / O. A capture-and-diff harness is straightforward to add once those land.
- **Suggested next step**: Add `tests/integration/slashCommandParity.test.ts` once the desktop runtime imports `SlashCommandRouter` from `modules/coding/chat/`. The harness drives both code paths against a fixed model mock and asserts equality on the rendered `RenderedTurn` from `toolCallCard.applyEvents`.

- **Migrated from**: v1.0#DF-3-P2-R on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-166 - 3.P2.S -- Frontend / sidecar model catalogs duplicated until shared-core build (DF, P2)

- **Source phase**: Phase 3 (3.2)
- **Plan reference**: [phase-03-coding-module.md](../../../archive/v1/v1.0/plans/phase-03-coding-module.md) sub-task 3.2 ("add the model to `core/registry/models.json`").
- **Reason**: The canonical model definitions live in `core/registry/models.json` and `core/registry/ModelCatalog.ts`. The sidecar workspace (`desktop/sidecar/src/coding/models.ts`) and the desktop frontend (`desktop/src/modules/coding/models.ts`) each inline a TypeScript mirror because Node16 module resolution cannot reach across to `../../../core/` without a published-package build step. A parity test (`desktop/tests/coding-models.test.ts`) keeps the two copies aligned, and the root catalog test asserts the TS file matches `models.json`.
- **Suggested next step**: Phase 5 introduces the shared-core build (TypeScript project references or a small published `@nexus/core` workspace package). Once that lands, delete the two mirrors and import the canonical catalog directly.

- **Migrated from**: v1.0#DF-3-P2-S on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-167 - 3.P2.T -- Golden-task validation against live Ollama backends deferred to operator action (DF, MT, P2)

- **Source phase**: Phase 3 (3.2, 3.7)
- **Plan reference**: [phase-03-coding-module.md](../../../archive/v1/v1.0/plans/phase-03-coding-module.md) sub-task 3.2 acceptance ("a golden-task run against each of `gemma4:e4b`, `llama3.1:8b`, `qwen2.5-coder:7b` produces the same `read_file` -> `apply_edit` trajectory").
- **Reason**: The prompt-format strategies and tool-call extractors are unit-tested with canned inputs covering every wire format. A live golden-task run requires three resident Ollama models on the host (~22 GB total) and is therefore operator-driven, in line with the v0.9.0 P3 pattern that rolled forward into v1.0.0 as item set 10.N.live-bench.
- **Suggested next step**: Operator captures the trajectory of `nexus-check golden --model <id>` for each of the three model ids in `docs/versions/v1/v1.0.0/operator-actions.md`. The fixture is committed back under `tests/golden/v1.0.0/multi-llm/` for future regression checks.

- **Migrated from**: v1.0#DF-3-P2-T on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-168 - 3.P2.U -- Tauri channel notifications: Tauri-side wiring blocked on Phase 5 IPC widening (DF, P2)

- **Source phase**: Phase 3 (3.1)
- **Plan reference**: [phase-03-coding-module.md](../../../archive/v1/v1.0/plans/phase-03-coding-module.md) sub-task 3.1 (event streaming).
- **Reason**: The `desktop/src-tauri/src/sidecar.rs` core currently exposes a single `ipc_call` command (request/response). Adding a `tauri::Channel<CodingSessionEventT>` requires touching the Rust side and re-running the matrix build, which is bundled with the Phase 5 ModelRegistry IPC widening to avoid two cargo-rebuild touches in adjacent phases.
- **Suggested next step**: Track alongside item N; one Rust-side commit covers both.

- **Migrated from**: v1.0#DF-3-P2-U on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### NI-4 - 4.P1.V -- HTML5 drag-drop instead of `@dnd-kit/core` for the folder tree (NI, P1)

- **Source phase**: Phase 4 (4.3)
- **Plan reference**: [phase-04-chat-module.md](../../../archive/v1/v1.0/plans/phase-04-chat-module.md) sub-task 4.3 ("Use `@dnd-kit/core` for drag-drop").
- **Reason**: The `<FolderTree>` ships drag-drop via the native HTML5 `dragstart` / `dragover` / `drop` events instead of `@dnd-kit/core`. The plan called for `@dnd-kit/core` explicitly; native dnd was chosen to avoid (a) a new third-party dependency in the v1.0.0 cycle, (b) the `@dnd-kit` testing-utility setup cost, and (c) one extra cold-start cost in the Vite bundle. Native HTML5 dnd is sufficient for folder-into-folder and chat-into-folder moves; the FolderTree refuses cycles at the store layer. The component is structured so the dnd surface is contained in a few handlers and a follow-on swap to `@dnd-kit/core` does not need to reshape the FolderTree internals -- it only re-implements the four `handleDragStart` / `handleDragOver` / `handleDrop` / `dragSourceRef` paths.
- **Suggested next step**: When a future phase adds another drag-drop surface (Image Studio canvas in Phase 6 or Video Lab timeline in Phase 7), evaluate `@dnd-kit/core` against the in-place HTML5 path; if the new surface needs it, swap the FolderTree implementation in the same commit so the dependency cost is amortised.

- **Migrated from**: v1.0#NI-4-P1-V on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-169 - 4.P1.W -- ChatExplorerStore not wired into the sidecar IPC layer (DF, P1)

- **Source phase**: Phase 4 (4.1, 4.5)
- **Plan reference**: [phase-04-chat-module.md](../../../archive/v1/v1.0/plans/phase-04-chat-module.md) sub-tasks 4.1 (store) and 4.5 (top-bar search).
- **Reason**: The SQLite-backed `ChatExplorerStore` lives under `modules/chat/storage/` at the repository root (where `better-sqlite3` is already a dependency) and has its own 41 unit + integration tests. The desktop frontend consumes the same surface through an in-memory `InMemoryChatExplorerClient` under `desktop/src/modules/chat/`, which mirrors the public API (`createFolder`, `renameFolder`, `moveFolder`, `deleteFolder`, `createChat`, `renameChat`, `moveChat`, `deleteChat`, `listTree`, `search`, `ancestors`). The sidecar IPC layer does not yet bridge the two; a chat created in the desktop UI is not persisted to disk across restarts. This mirrors the Phase 3 placeholder pattern (items 3.P1.M, 3.P1.N, 3.P1.Q) and is gated on the same shared-core build that closes those follow-ons.
- **Suggested next step**: A Phase 4 follow-on (or fold into the Phase 5 IPC widening alongside items 3.P1.N / 3.P2.S) adds `chat.explorer.listTree`, `chat.explorer.createFolder`, etc. methods to `desktop/sidecar/src/protocol.ts`, an adapter in `desktop/sidecar/src/chat/explorerManager.ts` that delegates to the root `ChatExplorerStore`, and a sidecar-backed client in `desktop/src/modules/chat/sidecarChatExplorerClient.ts`. The frontend swap is one line per `<ChatPage>` / `<TopBar>` consumer.

- **Migrated from**: v1.0#DF-4-P1-W on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-170 - 4.P1.X -- MemoryHub scope filter is in-memory only (DF, P1)

- **Source phase**: Phase 4 (4.2)
- **Plan reference**: [phase-04-chat-module.md](../../../archive/v1/v1.0/plans/phase-04-chat-module.md) sub-task 4.2 ("The graph memory entity table also gains a `scope_id` column").
- **Reason**: The `InMemoryMemoryHub` now supports `scopeId` tagging across every layer (working / episodic / semantic / graph) and the `ChatScopedMemory` bridge translates a chat's folder ancestry into the visible scope chain. The SQLite-backed layers (MemoryStore, EpisodicMemory, GraphMemory in `src/storage/`) still don't carry a `scope_id` column on their entity / event tables. Adding the column is a migration plus a few query updates, but the engine is still hosted by the VS Code extension during the one-cycle compat window (Phase 3 known-gap 3.P1.M) and migrating the columns now would require co-ordinating with the Phase 2 storage-path migration that still has untouched call sites (item 2.P1.G).
- **Suggested next step**: Bundle with the Phase 5 ModelRegistry SQLite work: add `scope_id TEXT NULL` columns to `memory_entries`, `episodic_events`, and `graph_edges`; gate retrieval on `WHERE scope_id IS NULL OR scope_id IN (?, ?, ...)`; backfill existing rows as `NULL` (legacy unscoped). The `ChatScopedMemory` bridge does not change.

- **Migrated from**: v1.0#DF-4-P1-X on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-171 - 4.P2.Y -- Local memory search adapter not yet wired to MemoryHub (DF, P2)

- **Source phase**: Phase 4 (4.5)
- **Plan reference**: [phase-04-chat-module.md](../../../archive/v1/v1.0/plans/phase-04-chat-module.md) sub-task 4.5 ("call ... `MemoryHub.retrieve(query, {scopeId: null, limit: 10})`").
- **Reason**: The `<TopBar>` accepts a `memoryAdapter` prop (typed as `MemorySearchAdapter`) and tests cover the Memories group via an injected mock. The default `<Dashboard>` does not yet pass an adapter -- the Memories group is hidden in production because the desktop frontend cannot reach `MemoryHub` without the shared-core build (same blocker as 4.P1.W / 3.P1.N). The search input still works for folders + chats from the chat explorer client.
- **Suggested next step**: Once the sidecar exposes `memory.retrieve(query)` and the desktop client lives under `desktop/src/lib/memorySearch.ts`, wire it into the `<Dashboard memoryAdapter={memorySearch}>` prop. The TopBar component does not change.

- **Migrated from**: v1.0#DF-4-P2-Y on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-172 - 4.P2.Z -- ChatPage messages are in-memory only (DF, P2)

- **Source phase**: Phase 4 (4.4)
- **Plan reference**: [phase-04-chat-module.md](../../../archive/v1/v1.0/plans/phase-04-chat-module.md) sub-task 4.4 ("Memory hub is wired with the folder's `contextScopeId`").
- **Reason**: The `<ChatPage>` stores chat messages in a per-instance `Map<string, ChatMessage[]>` so the UI surface (`<MessageList>`, breadcrumb, model selector, tools toggle) is exercised end-to-end without a sidecar round-trip. Once the IPC widening lands (items 3.P1.M / 4.P1.W), the assistant response will come from the Coding-module-style streaming-event handler instead of the local echo stub. The shared chat shell does not change; only the `handleSubmit` body in ChatPage.
- **Suggested next step**: Replace the echo in `ChatPage.handleSubmit` with an `ipc.call("coding.session.sendMessage", { sessionId, message })` once the chat module gets its own `chat.session.*` surface (or shares the Coding surface with a `module` discriminator).

- **Migrated from**: v1.0#DF-4-P2-Z on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-173 - 4.P2.AA -- TopBar empty-state badge on Dashboard bell still hard-coded (DF, P2)

- **Source phase**: Phase 4 (4.5)
- **Plan reference**: Pivot-brief Section 3.2.
- **Reason**: The `<TopBar extraButtons>` slot renders the Dashboard's notification bell with a red-dot badge. The badge visibility is currently always-on (hard-coded markup) because no notification source exists yet; the previous Phase 1 implementation behaved identically. Genuine notifications surface in Phase 8 (telemetry) and Phase 10 (skills sync diffs).
- **Suggested next step**: Phase 8 introduces a `notificationStream` prop on the Dashboard that drives the badge visibility; the TopBar already accepts `extraButtons` so the badge gating happens at the call site, no TopBar changes needed.

- **Migrated from**: v1.0#DF-4-P2-AA on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### NI-5 - 5.P2.CC -- Catalog SHA-256 digests for HTTP-sourced models are placeholders (NI, P2)

- **Source phase**: Phase 5 (5.3)
- **Plan reference**: [phase-05-model-registry.md](../../../archive/v1/v1.0/plans/phase-05-model-registry.md) sub-task 5.3 ("source: {protocol: 'ollama' | 'huggingface' | 'url', url, sha256}").
- **Reason**: `core/registry/catalog.json` carries every Phase 6 image entry (SDXL Turbo, SDXL 1.0, Flux Schnell, SD 1.5) and Phase 7 video entry (LTX-Video, SVD) with `source.sha256: "0".repeat(64)` as a placeholder. The `Downloader` will reject any actual fetch against these specs (`DigestMismatch`), which is the safe failure mode -- but a user clicking "Install" today gets a digest-mismatch error rather than a verified download. Ollama-sourced entries delegate digest verification to `ollama pull` and are unaffected.
- **Suggested next step**: Phase 6 (image studio) and Phase 7 (video lab) capture the canonical SHA-256 for each weights file from the hosting site (HuggingFace's `lfs.sha256` field or a manual `shasum -a 256` over the downloaded file) and replace the placeholder digests. A small `core/registry/catalog-digests.test.ts` is added at the same time that asserts every non-ollama entry has a non-zero digest.

- **Migrated from**: v1.0#NI-5-P2-CC on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-174 - 5.P2.DD -- StreamingPipeline keep-alive resolver hand-wiring is operator-driven (DF, P2)

- **Source phase**: Phase 5 (5.6)
- **Plan reference**: [phase-05-model-registry.md](../../../archive/v1/v1.0/plans/phase-05-model-registry.md) sub-task 5.6 ("inject the `keepAliveFor(modelId)` resolver into the streaming pipeline via the existing `KeepAliveResolver` callback in `StreamingPipeline`").
- **Reason**: `core/registry/ModelPinRegistry` exposes `resolver()` -> `(model) => keepAliveFor(model)`, and `desktop/sidecar/src/runtime/codingBootstrap.ts` builds the `keepAliveResolver`. The actual hand-off into `src/chat/StreamingPipeline.ts`'s constructor argument is still operator-controlled by `src/panels/ChatPanelBootstrap.ts`, which lives under the VS Code-bound code path and continues to consume the legacy `src/storage/ModelPinRegistry.ts` (now a re-export). Once the engine relocates into `modules/coding/` (Phase 2.P2.I / 3.P1.M), the sidecar will own `StreamingPipeline` construction and pass `boot.keepAliveResolver` directly; until then, both code paths see the same underlying registry instance because the legacy module re-exports the core class.
- **Suggested next step**: Bundle with the engine relocation (Phase 5 follow-on or Phase 6): construct `StreamingPipeline` in the sidecar's session manager and pass `bootstrap.keepAliveResolver` as the `resolveKeepAlive` argument. The VS Code adapter (item 3.P1.O) then no longer needs to thread its own resolver through.

- **Migrated from**: v1.0#DF-5-P2-DD on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-175 - 5.P2.EE -- Settings UI per-model "Keep loaded in VRAM" checkbox not yet bound (DF, P2)

- **Source phase**: Phase 5 (5.6)
- **Plan reference**: [phase-05-model-registry.md](../../../archive/v1/v1.0/plans/phase-05-model-registry.md) sub-task 5.6 ("Add a Settings UI checkbox per installed LLM: 'Keep loaded in VRAM' toggles the pin.").
- **Reason**: The `ModelsClient` interface accepts optional `pin` / `isPinned` methods, and `ModelsSettings` renders a "Pin" action on installed entries when the client wires them. The default mock client in `desktop/src/pages/settings/mockModelsClient.ts` does not implement them yet (because the IPC bridge in 5.P1.BB is also stubbed). Once the sidecar client lands, a one-line `pin: (id, pinned) => ipc.call("models.pin", { id, pinned })` finishes the wiring; the UI side already exists.
- **Suggested next step**: Same Phase 5 follow-on that wires 5.P1.BB also adds `models.pin` (calls `bootstrap.modelPins.setPinned(id, pinned)`) and `models.isPinned` IPC methods, plus the matching `sidecarModelsClient` implementation. Replace the "Pin" button with a checkbox in the Installed section once both ends are live.

- **Migrated from**: v1.0#DF-5-P2-EE on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-176 - 5.P3.FF -- Pre-existing test failures unchanged on Windows (DF, BG, P3)

- **Source phase**: Phase 5 (5.7 test run)
- **Plan reference**: [phase-05-model-registry.md](../../../archive/v1/v1.0/plans/phase-05-model-registry.md) sub-task 5.7 ("Run the test suite, fix all failures, iterate").
- **Reason**: The full `npm test` run still shows 5 failures unchanged from Phase 2's recording in item 2.P3.L (4x `SubAgentManager.characterization.test.ts` CRLF/LF snapshot mismatches; 1x `workflow-discipline.test.ts` SHA-pin check against the Phase 1 `shell-build.yml` workflow). All Phase 5 tests (115 / 115) pass; the failure set is identical to a pre-Phase-5 stash-and-rerun.
- **Suggested next step**: No new action. Tracked exhaustively under item 2.P3.L; this entry exists so the Phase 5 audit trail reflects the same baseline.

- **Migrated from**: v1.0#DF-5-P3-FF on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-177 - 6.P1.GG -- Diffusion runtime ships with stub executors (no live PyTorch) (DF, P1)

- **Source phase**: Phase 6 (6.2, 6.3, 6.4)
- **Plan reference**: [phase-06-image-studio.md](../../../archive/v1/v1.0/plans/phase-06-image-studio.md) sub-tasks 6.2 ("StableDiffusionXLPipeline"), 6.3 ("img2img / inpaint / outpaint pipelines"), 6.4 ("LoRA + ControlNet (pose / depth / canny)").
- **Reason**: Each pipeline's `register(handlers)` selects between `base.stub_execute(mode)` and a real diffusers-backed executor via `base.select_executor`. The implementing session ran on a Windows 11 host without CUDA / `torch` / `diffusers` available, so the stub executor is the active path. The runner orchestration (param validation -> smart-offload decision via `device.choose_offload` -> execution -> PIL-free PNG workflow embed) is exercised end-to-end by 12 pytest tests; the stub returns a deterministic 1x1 PNG with full workflow metadata embedded so the JSON-RPC contract and the round-trip test still verify the wiring. The 30-second SDXL Turbo 1024x1024 timing target in the phase stability gate is an operator action.
- **Suggested next step**: Operator captures a real-host run in `docs/versions/v1/v1.0.0/operator-actions.md`: `pip install -r runtimes/diffusion/requirements.txt`, drop a real diffusers-backed `_execute(ctx)` into each pipeline module (replacing `base.stub_execute(mode)`), and record SDXL Turbo / SDXL 1.0 / img2img / inpaint / outpaint timings on the RTX 4070 baseline rig.

- **Migrated from**: v1.0#DF-6-P1-GG on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-178 - 6.P1.HH -- Tauri Rust core does not yet spawn the Python sidecar (DF, P1)

- **Source phase**: Phase 6 (6.1)
- **Plan reference**: [phase-06-image-studio.md](../../../archive/v1/v1.0/plans/phase-06-image-studio.md) sub-task 6.1 ("The Tauri Rust core spawns the Python sidecar at app launch alongside the Node sidecar").
- **Reason**: `desktop/src-tauri/src/sidecar.rs` spawns the Node sidecar only. The Python runtime contract is wired end-to-end through Node (`desktop/sidecar/src/diffusion/runtimeClient.ts` ships both `InMemoryDiffusionRuntime` for CI and `ChildProcessDiffusionRuntime` for production), but the production handler binds to the in-memory client until the Rust core can also spawn `python -m runtimes.diffusion.main` and Node can be told where to reach it. The Phase 6.1 unit + integration tests exercise the IPC contract through the in-memory client (job IDs, payload forwarding, error surfacing, event queueing).
- **Suggested next step**: Bundle with the Phase 9 installer rework: the installer provisions the Python venv at `~/.nexus/runtimes/diffusion/.venv/`, the Rust core then spawns it the same way it spawns Node (`Sidecar::spawn_python`), and the Node sidecar swaps `InMemoryDiffusionRuntime` for `ChildProcessDiffusionRuntime` pointing at the spawned process. The IPC contract does not change.

- **Migrated from**: v1.0#DF-6-P1-HH on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-179 - 6.P1.II -- Real ControlNet preprocessors are stubbed in CI (DF, P1)

- **Source phase**: Phase 6 (6.4)
- **Plan reference**: [phase-06-image-studio.md](../../../archive/v1/v1.0/plans/phase-06-image-studio.md) sub-task 6.4 ("Preprocessors: pose via controlnet_aux.OpenposeDetector, depth via controlnet_aux.MidasDetector, canny via OpenCV's Canny").
- **Reason**: `runtimes/diffusion/preprocessors/{canny,pose,depth}.py` each try to import the real backend lazily and fall back to a tagged byte string (`b"canny-stub:<bytes>"`, etc.) when the import fails. CI runs the fallback path; the real path is only exercised on a host where `cv2` (canny) or `controlnet_aux` (pose / depth) is installed.
- **Suggested next step**: Same operator-actions follow-on as 6.P1.GG: install `controlnet-aux` + `opencv-python` in the runtime venv, replace `b"<x>-stub:"` returns with the real annotator output, capture a sample of pose / depth / canny conditioning preview PNGs in `docs/versions/v1/v1.0.0/operator-actions.md`.

- **Migrated from**: v1.0#DF-6-P1-II on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### NI-6 - 6.P2.JJ -- Image Studio UI uses a hard-coded model / LoRA / ControlNet list (NI, P2)

- **Source phase**: Phase 6 (6.5)
- **Plan reference**: [phase-06-image-studio.md](../../../archive/v1/v1.0/plans/phase-06-image-studio.md) sub-task 6.5 ("Model dropdown, ... collapsible Advanced for LoRAs and ControlNet").
- **Reason**: `desktop/src/modules/image/ImageStudioPage.tsx` ships `DEFAULT_MODELS`, `DEFAULT_LORAS`, `DEFAULT_CONTROLNETS` as inline constants. The proper source is the `ModelRegistry` (`type: "image"`, `type: "lora"`, etc.) which is reachable from the desktop frontend via the same `models.list` IPC that 5.P1.BB still gates on. Once that IPC bridge lands, the dropdowns subscribe to the catalog. Until then, the user sees the four headline checkpoints (SDXL Turbo, SDXL 1.0 Base, SD 1.5, FLUX.1 Schnell) and a synthetic LoRA / ControlNet shortlist for UX testing.
- **Suggested next step**: When the Phase 5 follow-on that closes 5.P1.BB lands, pass `ipc.call("models.list", { type: "image" })` results into ImageStudioPage as a `models` prop (or expose a `useModelCatalog` hook). The form does not change.

- **Migrated from**: v1.0#NI-6-P2-JJ on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-180 - 6.P2.KK -- Tauri Channel for diffusion progress events not yet wired (DF, P2)

- **Source phase**: Phase 6 (6.2, 6.5)
- **Plan reference**: [phase-06-image-studio.md](../../../archive/v1/v1.0/plans/phase-06-image-studio.md) sub-task 6.2 ("streams `diffusion.job.progress` events"), sub-task 6.5 ("Generate button shows a progress bar and the live latent preview").
- **Reason**: The ImageStudioPage polls `diffusion.job.drainEvents(jobId)` every 100 ms while a job is running. Polling is correct and bounded (drain is cheap, every event is consumed at most once) but suboptimal versus a server-initiated notification channel. The same blocker keeps `coding.session.event` and `chat.session.event` on polling (item 3.P1.N). The Phase 5 follow-on that introduces `tauri::Channel` covers all three at once.
- **Suggested next step**: When the channel lands (item 3.P2.U), add a `diffusion.job.events` channel; Node forwards every event line from the Python sidecar to the channel; the ImageStudioPage swaps the polling loop for a channel listener.

- **Migrated from**: v1.0#DF-6-P2-KK on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### MT-47 - 6.P2.LL -- Coverage on `desktop/src/modules/image/diffusionClient.ts` is partial (MT, P2)

- **Source phase**: Phase 6 (6.7)
- **Plan reference**: [phase-06-image-studio.md](../../../archive/v1/v1.0/plans/phase-06-image-studio.md) sub-task 6.7 ("coverage gate at lines >= 80, functions >= 80").
- **Reason**: The new `diffusion-ipcClient.test.ts` covers the seven production paths through `createIpcDiffusionClient` and the unwrap helper. The remaining uncovered lines are the lazy `import("@tauri-apps/api/core")` branch inside `desktop/src/lib/ipc.ts` (only reachable when `__TAURI_INTERNALS__` is set, which jsdom does not simulate). Coverage overall is 94.24% lines / 80.75% functions / 85.65% branches, comfortably above the gate; the `image/` directory specifically is at 86.52% lines and 46.77% functions because the InMemoryDiffusionClient class members are bound paths that vitest considers separate functions.
- **Suggested next step**: Acceptable as-is for Phase 6. If the function-coverage threshold for `image/` becomes a concern, add a tiny test that constructs an `InMemoryDiffusionClient` and calls every method directly (no UI). Bundled into the same Phase 8 polish pass as 6.P2.KK.

- **Migrated from**: v1.0#MT-6-P2-LL on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-181 - 7.P1.MM -- Video pipelines ship with stub executors (no live PyTorch + imageio) (DF, P1)

- **Source phase**: Phase 7 (7.1)
- **Plan reference**: [phase-07-video-lab.md](../../../archive/v1/v1.0/plans/phase-07-video-lab.md) sub-task 7.1 (LTX-Video / SVD / CogVideoX text2video + image2video pipelines).
- **Reason**: Each video pipeline (`video_text2video`, `video_image2video`) registers a `VideoPipelineRunner` whose executor defaults to `video_base.stub_execute(method)`. The runner orchestration (param validation -> video-upgraded offload decision via `device.choose_offload` + `_upgrade_for_video` -> `vram_scope` -> execution -> workflow JSON build) is exercised end-to-end by 39 pytest tests; the stub returns one deterministic 1x1 JPEG thumbnail per generated second and no real MP4, so the JSON-RPC contract + thumbnail-strip UI flow + workflow-JSON shape are verified in CI without a CUDA / `diffusers` / `imageio` install. The Phase 7 stability gate's <= 5-minute LTX-Video 4 s @ 24 fps timing is an operator action.
- **Suggested next step**: Operator captures a real-host run in `docs/versions/v1/v1.0.0/operator-actions.md`: `pip install -r runtimes/diffusion/requirements.txt` (adding `imageio[ffmpeg]` to the requirements), drop a real diffusers-backed `_execute(ctx)` into each video pipeline module (replacing `video_base.stub_execute(method)`), and record LTX-Video / SVD / CogVideoX 5B / CogVideoX 2B timings on the RTX 4070 baseline rig.

- **Migrated from**: v1.0#DF-7-P1-MM on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-182 - 7.P1.NN -- ffmpeg / ffprobe assumed on $PATH; installer-bundled binaries land in Phase 9 (DF, P1)

- **Source phase**: Phase 7 (7.3)
- **Plan reference**: [phase-07-video-lab.md](../../../archive/v1/v1.0/plans/phase-07-video-lab.md) sub-task 7.3 ("Bundled ffmpeg / ffprobe come from the installer (Phase 9)").
- **Reason**: `core/video/WorkflowMetadata.ts` resolves ffmpeg + ffprobe via an injected `FfmpegContext { ffmpegPath, ffprobePath, spawnFn? }`. The sidecar default (`DEFAULT_FFMPEG_CONTEXT`) reads `NEXUS_FFMPEG_PATH` / `NEXUS_FFPROBE_PATH` env vars and falls back to the generic `ffmpeg` / `ffprobe` names on `$PATH`. On a fresh Windows / macOS / Linux host with no ffmpeg installed, `diffusion.video.workflow.extract` (and the on-host executor's MP4 writer) will fail with `ENOENT`. The unit-test suite injects a stub `spawnFn` so the IPC contract + extract / round-trip path are verified without a system ffmpeg.
- **Suggested next step**: Phase 9 installer drops `ffmpeg.exe` / `ffprobe.exe` into `~/.nexus/runtimes/ffmpeg/` and sets `NEXUS_FFMPEG_PATH` / `NEXUS_FFPROBE_PATH` in the Nexus desktop process environment. Adopted via the existing injection seam; no production code change in `core/video/`.

- **Migrated from**: v1.0#DF-7-P1-NN on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-183 - 7.P1.OO -- Tauri Rust core does not yet spawn the Python sidecar for video (DF, P1)

- **Source phase**: Phase 7 (7.1)
- **Plan reference**: [phase-07-video-lab.md](../../../archive/v1/v1.0/plans/phase-07-video-lab.md) sub-task 7.1 (Python sidecar hosts both image + video pipelines).
- **Reason**: This is the same blocker tracked as `6.P1.HH` for image diffusion -- the Tauri Rust core still spawns only the Node sidecar, and the Node-side handler binds to `InMemoryDiffusionRuntime` until the Rust core can also launch `python -m runtimes.diffusion.main` and Node can be told where to reach it. Phase 7's video runtime piggybacks on the same sidecar process, so once the Python spawn lands in Phase 9 (installer), `ChildProcessDiffusionRuntime` carries both image and video traffic without further wiring. The Phase 7 unit + integration tests exercise the IPC contract through the in-memory client.
- **Suggested next step**: Bundled into the same Phase 9 follow-on tracked by `6.P1.HH`. No separate work required for video.

- **Migrated from**: v1.0#DF-7-P1-OO on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### NI-7 - 7.P2.PP -- Video Lab UI uses a hard-coded model list (NI, P2)

- **Source phase**: Phase 7 (7.2)
- **Plan reference**: [phase-07-video-lab.md](../../../archive/v1/v1.0/plans/phase-07-video-lab.md) sub-task 7.2 ("Model dropdown filtered to video models").
- **Reason**: `desktop/src/modules/video/VideoLabPage.tsx` ships `DEFAULT_VIDEO_MODELS` as an inline constant (LTX-Video + CogVideoX 5B / 2B for text2video, SVD + CogVideoX-I2V for image2video). The proper source is the `ModelRegistry` (`type: "video"`) reachable via the `models.list` IPC that `5.P1.BB` still gates on. Once that bridge lands, the dropdowns subscribe to the catalog filtered by `type: "video"` + `mode`. Until then, the user sees the five planned video checkpoints for UX testing.
- **Suggested next step**: When the Phase 5 follow-on that closes `5.P1.BB` lands, pass `ipc.call("models.list", { type: "video" })` results into VideoLabPage as a `models` prop (or expose a `useVideoModelCatalog` hook). The form does not change.

- **Migrated from**: v1.0#NI-7-P2-PP on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-184 - 7.P2.QQ -- MP4 source-of-truth resolution for the previewer is a placeholder (DF, P2)

- **Source phase**: Phase 7 (7.2)
- **Plan reference**: [phase-07-video-lab.md](../../../archive/v1/v1.0/plans/phase-07-video-lab.md) sub-task 7.2 ("timeline previewer scrubber (HTML5 video element) for completed clips").
- **Reason**: `VideoLabPage` accepts a `resolveMp4Url(mp4Path: string) => string` prop that maps the sidecar's local-disk MP4 path into a URL the HTML5 `<video>` element can play. The default identity mapping ("path-as-URL") works inside Tauri once the `fs` allow-list grants read access to `~/.nexus/outputs/videos/`, but the Tauri config has not been updated to whitelist that directory yet. Until then, real playback in a packaged Tauri build will fail; tests inject a stub resolver (`(path) => "mock://" + path`) so the UI surface is exercised.
- **Suggested next step**: Phase 9 installer adds `~/.nexus/outputs/videos/` to the Tauri allow-list. The default `resolveMp4Url` then wraps the path with `convertFileSrc()` from `@tauri-apps/api/core` to translate it into a `tauri://localhost/<id>` URL the webview can play.

- **Migrated from**: v1.0#DF-7-P2-QQ on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### NI-8 - 7.P2.RR -- Save As / Use Last Frame as Image actions not yet wired (NI, P2)

- **Source phase**: Phase 7 (7.2)
- **Plan reference**: [phase-07-video-lab.md](../../../archive/v1/v1.0/plans/phase-07-video-lab.md) sub-task 7.2 ("Output context menu: Open, Save As..., Copy Workflow (workflow embedded in the MP4 via ffmpeg metadata), Use Last Frame as Image (sends to Image Studio)").
- **Reason**: The Video Lab gallery context-menu actions ship with the first two surfaces from the plan: "Open" (loads into the timeline previewer) and "Copy Workflow" (forwards extracted JSON to the clipboard adapter). "Save As..." requires a Tauri dialog handler (`dialog.save()`) plus a sidecar `video.save` IPC that copies the local MP4 to the user-chosen target, and "Use Last Frame as Image" requires either a follow-on ffmpeg call (`ffmpeg -ss <end> -frames:v 1 -f image2`) or harvesting the trailing JPEG preview from the progress stream. Both depend on plumbing not present in the Phase 7 surface.
- **Suggested next step**: Phase 8 polish pass adds a `video.export.lastFrame` IPC backed by the Python sidecar (calls into the existing pipeline output to read the final frame as a PIL image -> PNG -> base64), and wires "Save As..." through the existing Tauri `dialog` plugin. The UI buttons land in the same commit.

- **Migrated from**: v1.0#NI-7-P2-RR on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-185 - 7.P2.SS -- Tauri Channel for video progress events not yet wired (DF, P2)

- **Source phase**: Phase 7 (7.2)
- **Plan reference**: [phase-07-video-lab.md](../../../archive/v1/v1.0/plans/phase-07-video-lab.md) sub-task 7.2 ("thumbnail strip updates").
- **Reason**: Same blocker as image diffusion (`6.P2.KK`): the VideoLabPage polls `diffusion.job.drainEvents(jobId)` every 100 ms instead of subscribing to a server-initiated `tauri::Channel`. The polling is correct and bounded (drain is cheap, every event is consumed at most once) but suboptimal. The Phase 5 follow-on that introduces the channel for `coding.session.event` (item `3.P1.N` / `3.P2.U`) and `diffusion.job.progress` covers video at the same time.
- **Suggested next step**: When the channel lands, add a `diffusion.video.job.events` channel (or share the existing `diffusion.job.events` from `6.P2.KK`); Node forwards every event line from the Python sidecar to the channel; the VideoLabPage swaps the polling loop for a channel listener.

- **Migrated from**: v1.0#DF-7-P2-SS on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-186 - 7.P3.TT -- Operator acceptance on real GPU rig deferred (DF, MT, P3)

- **Source phase**: Phase 7 (7.5)
- **Plan reference**: [phase-07-video-lab.md](../../../archive/v1/v1.0/plans/phase-07-video-lab.md) sub-task 7.5 acceptance ("operator-driven acceptance on a real GPU rig... (RTX 4070: LTX-Video 4 s @ 24 fps @ 480p in <= 5 min; SVD image+prompt to 4 s clip in <= 4 min; CogVideoX opt-in works)").
- **Reason**: The Phase 7 stability gate (<= 5 minutes for a 4-second LTX-Video clip on a 12 GB RTX 4070) requires three resident video models on the host (~31 GB total: LTX-Video 12 GB + SVD 9 GB + CogVideoX 5B 10 GB) and is therefore operator-driven, in line with the v0.9.0 P3 pattern that rolled forward into v1.0.0 as item set `10.N.live-bench`. The Python orchestration is fully unit-tested with stubs.
- **Suggested next step**: Operator captures the timings in `docs/versions/v1/v1.0.0/operator-actions.md` once the live-PyTorch wiring lands (item `7.P1.MM`). Fixture clips committed back under `tests/golden/v1.0.0/video/` for regression checks.

- **Migrated from**: v1.0#DF-7-P3-TT on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-187 - 8.P1.UU -- Sidecar-side `nvidia-smi` long-lived stream not yet spawned (DF, P1)

- **Source phase**: Phase 8 (8.2)
- **Plan reference**: [phase-08-gpu-scheduler-and-telemetry.md](../../../archive/v1/v1.0/plans/phase-08-gpu-scheduler-and-telemetry.md) sub-task 8.2 ("On Windows + Linux, shell out to `nvidia-smi --query-gpu=... --format=csv,noheader,nounits` (cached child process re-used via long-lived `nvidia-smi -lms 500` stream)").
- **Reason**: `core/telemetry/GpuTelemetrySource.ts` exposes a pluggable `GpuQueryFn`; the implementation uses CPU fallback by default when no host-platform query is wired. The actual `nvidia-smi -lms 500` long-lived child-process driver (Windows / Linux) and the `system_profiler` one-shot + Metal Performance Shaders fallback (macOS) parse-existing fixtures via `parseNvidiaSmiCsv` / `parseAppleSystemProfiler` in unit tests, but the platform spawning glue that drives those fixtures from the real `nvidia-smi` binary on the host sidecar process is deferred. The widget therefore still renders the deterministic mock stream from `desktop/src/lib/telemetryMock.ts` on developer machines.
- **Suggested next step**: Phase 9 installer ships an installer-bundled `nvidia-smi` invocation; Node sidecar at the same time gets a `telemetry.subscribe` IPC that wraps `core/telemetry/GpuTelemetrySource.ts` with a `ChildProcessGpuQuery` (long-lived stream on Win / Linux, polling on macOS). The desktop `App.tsx` swaps the mock for the real Tauri-channel-backed stream.

- **Migrated from**: v1.0#DF-8-P1-UU on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-188 - 8.P1.VV -- GpuScheduler not yet integrated with the four pillar runtimes (DF, P1)

- **Source phase**: Phase 8 (8.1)
- **Plan reference**: [phase-08-gpu-scheduler-and-telemetry.md](../../../archive/v1/v1.0/plans/phase-08-gpu-scheduler-and-telemetry.md) sub-task 8.1 ("Module integration: Coding's `AgentLoop` does NOT go through the scheduler for tool calls (those are CPU); only the streaming-LLM-token-generation call enqueues a job. Image / Video pipelines route every generation through the scheduler.").
- **Reason**: `GpuScheduler` ships as a shared-core service with full unit + integration coverage (FIFO, foreground bump, VRAM gating, cancel, telemetry envelopes -- 16 unit + 3 integration tests; 99% lines / 100% functions). The wiring at the call sites is deferred: `StreamingPipeline` (Coding token generation), `runtimes/diffusion/pipelines/base.py` (Image), and `runtimes/diffusion/pipelines/video_base.py` (Video) still serialize jobs through the sidecar request loop. The Phase 7 known-gap `7.P1.OO` (Tauri Rust core does not yet spawn the Python sidecar) is the upstream blocker for the diffusion-side wiring.
- **Suggested next step**: Phase 9 installer follow-on adds a `nexus.gpu.scheduler` IPC surface that the Node sidecar instantiates once per process; the Coding `StreamingPipeline` enqueues its single token-generation call, and the Python sidecar exposes a `scheduler.enqueue` JSON-RPC that the Rust core forwards into the same TS-side `GpuScheduler` instance via a thin proxy. Acceptance: the multi-module integration test in `tests/integration/gpu-scheduler-multi-module.test.ts` is replayed end-to-end against the live processes.

- **Migrated from**: v1.0#DF-8-P1-VV on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### NI-9 - 8.P2.WW -- Settings UI "Hardware" page does not yet surface DiffusionTier override (NI, P2)

- **Source phase**: Phase 8 (8.4)
- **Plan reference**: [phase-08-gpu-scheduler-and-telemetry.md](../../../archive/v1/v1.0/plans/phase-08-gpu-scheduler-and-telemetry.md) sub-task 8.4 ("The tier display surfaces in Settings -> Hardware with a 'your GPU classifies as ...' readout and an 'override to ...' dropdown").
- **Reason**: `core/config/DiffusionTier.ts` ships the four-tier classification, the per-tier image + video defaults, and `resolveDiffusionTier(vramGB, override)` that fuses an auto-detected tier with an optional user override. The Settings UI surface (a "Hardware" page in `desktop/src/pages/settings/`) is not yet built; Settings currently exposes only the Models sub-page (Phase 5). Auto-detection from `GpuTelemetrySource` is also pending the live telemetry wiring (`8.P1.UU`).
- **Suggested next step**: Phase 9 polish pass adds `desktop/src/pages/settings/HardwareSettings.tsx` with a tier readout (driven by `classifyDiffusionTier(lastSample.totalVramGB)`) and an "override to" dropdown that writes `nexus.diffusion.tierOverride` via `SettingsStore`. The Image Studio and Video Lab forms read the resolved tier for default form values.

- **Migrated from**: v1.0#NI-8-P2-WW on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-189 - 8.P2.XX -- DiffusionTier defaults not yet read by Image Studio / Video Lab forms (DF, P2)

- **Source phase**: Phase 8 (8.4)
- **Plan reference**: [phase-08-gpu-scheduler-and-telemetry.md](../../../archive/v1/v1.0/plans/phase-08-gpu-scheduler-and-telemetry.md) sub-task 8.4 ("Default form values in Image Studio + Video Lab are derived from the tier").
- **Reason**: The `DIFFUSION_TIER_CONFIGS` table ships with per-tier `image` (width / height / steps / sampler / model / allowControlNet / allowControlNetStacking / allowLoRA) and `video` (model / clipSeconds / fps / dimensions / enabled) defaults, plus a `parallelJobs` flag for the pro tier. The Image Studio (`desktop/src/modules/image/ImagePromptForm.tsx`) and Video Lab (`desktop/src/modules/video/VideoPromptForm.tsx`) forms still use the Phase 6 / 7 hard-coded initial values. Tying them together depends on the Settings Hardware page (`8.P2.WW`) and the live telemetry wiring (`8.P1.UU`) so the tier resolution does not change under the user's feet.
- **Suggested next step**: Phase 9 polish pass: once `8.P2.WW` lands, both forms accept a `defaultsFor: DiffusionTierConfig` prop with the resolved tier as the initial state. Acceptance: a `diffusion-mid` host opens Image Studio to 1024x1024 SDXL Turbo defaults; a `diffusion-low` host opens to 512x512 SD 1.5 with video disabled.

- **Migrated from**: v1.0#DF-8-P2-XX on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### WN-22 - 8.P2.YY -- TelemetryBus event union does not yet model `job.cancelled` (WN, P2)

- **Source phase**: Phase 8 (8.1)
- **Plan reference**: [phase-08-gpu-scheduler-and-telemetry.md](../../../archive/v1/v1.0/plans/phase-08-gpu-scheduler-and-telemetry.md) sub-task 8.1 ("The scheduler publishes `scheduler.job.queued`, `scheduler.job.started`, `scheduler.job.completed`, `scheduler.job.cancelled` events on the `TelemetryBus`.").
- **Reason**: `core/telemetry/TelemetryBus.ts` declares a closed `TelemetryEventKind` union (`job.queued | job.started | job.completed | job.failed | ...`) without an explicit `job.cancelled` kind. `GpuScheduler` publishes cancellation events using the `job.failed` kind with a `schedulerEvent: "job.cancelled"` payload discriminator -- subscribers that filter by payload-side discriminator see the right thing, but kind-filtered subscribers lump cancelled with failed. The union is shared across pillars, so widening it warrants its own coordinated commit.
- **Suggested next step**: Phase 9 polish pass: widen `TelemetryEventKind` with `job.cancelled` and update `GpuScheduler._publish` to use the dedicated kind instead of the `job.failed` overload. Subscribers that already inspect `payload.schedulerEvent` stay correct.

- **Migrated from**: v1.0#WN-8-P2-YY on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-190 - 9.P1.ZZ -- Installer payload-fetch script not yet implemented (DF, P1)

- **Source phase**: Phase 9 (9.1-9.6)
- **Plan reference**: [phase-09-installer.md](../../../archive/v1/v1.0/plans/phase-09-installer.md) sub-tasks 9.2-9.6 (CUDA, Python wheels, Node, Ollama, ffmpeg, DevAI-Hub baseline payload hydration).
- **Reason**: Phase 9 lands the wizard-side provisioners (`cuda_provisioner.py`, `diffusion_venv_provisioner.py`, `node_provisioner.py`, `devai_hub_provisioner.py`) plus the architecture doc, the NSIS template, and the CI workflow stubs. The build-time payload-fetch script (`scripts/installer/build/fetch-payload.py`) that downloads the CUDA runtime, Python embeddable, wheels, Node 22 portable, Ollama setup, ffmpeg, and the DevAI-Hub tarball into `build/payload/` is not yet written; the CI workflow placeholder calls into it as a `Write-Host TODO` step. Without this script, `installer-build.yml` cannot produce a real `Nexus-1.0.0-Setup.exe` -- only the NSIS skeleton + wizard exe.
- **Suggested next step**: A Phase 9 follow-on commit lands `scripts/installer/build/fetch-payload.py` (parameterized by `versions.lock.json`), wires it into `installer-build.yml`, and produces a first artifact build under workflow_dispatch.

- **Migrated from**: v1.0#DF-9-P1-ZZ on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-191 - 9.P1.AAA -- Ollama / DevAI-Hub baseline pinned SHAs are placeholder zeros (DF, P1)

- **Source phase**: Phase 9 (9.6)
- **Plan reference**: [phase-09-installer.md](../../../archive/v1/v1.0/plans/phase-09-installer.md) sub-task 9.6 ("the pinned tag is recorded in `scripts/installer/devai-hub-baseline.json` as `{tag, sha, contentHash}`").
- **Reason**: `scripts/installer/devai-hub-baseline.json` (Phase 9.6) lands the manifest skeleton with placeholder `0...` SHA-256 + commit SHA values, because pinning a real DevAI-Hub tag requires choosing the canonical v1.0.0-baseline tag in the upstream repo first. The provisioner's hash guard accepts a fully-zeroed `contentHash` as "skip verification" so dev builds still extract. Until the real tag is cut, the bundled tarball cannot be verified end-to-end. Likewise `OLLAMA_WINDOWS_SHA256` / `OLLAMA_LINUX_SCRIPT_SHA256` in `engine/ollama_installer.py` remain at the v0.x placeholder and need rotation to the v1.0.0 release.
- **Suggested next step**: Phase 11 release hardening: cut `DevAI-Hub@v1.0.0-baseline`, fill the SHA-256 + commit SHA in `scripts/installer/devai-hub-baseline.json`, rotate the two Ollama SHAs from the pinned upstream release, and add a CI assertion that the manifest content_hash matches `sha256sum payload/devai-hub-baseline.tar.gz`.

- **Migrated from**: v1.0#DF-9-P1-AAA on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-192 - 9.P2.BBB -- Tauri icon assets are functional placeholders (DF, P2)

- **Source phase**: Phase 9 (CI-blocker fix)
- **Plan reference**: [phase-09-installer.md](../../../archive/v1/v1.0/plans/phase-09-installer.md) Phase 9 (collateral CI fix; the missing icons were blocking `shell-build.yml`).
- **Reason**: Phase 9 unblocks the `shell-build.yml` cargo-check leg by generating a procedurally-rendered icon set under `desktop/src-tauri/icons/` (`32x32.png`, `128x128.png`, `128x128@2x.png`, `icon.icns`, `icon.ico`, plus the Square*Logo.png Windows Store tile set). The icons are a teal-on-charcoal rounded square with the letter "N" -- placeholder branding sufficient for dev / CI builds but not the final v1.0.0 art. `scripts/desktop/generate-icons.py` is the reproducible source.
- **Suggested next step**: Phase 11 release hardening: replace the procedurally-rendered icons with the final designer-authored source asset. Re-run `scripts/desktop/generate-icons.py` or export from the design tool to the same filenames.

- **Migrated from**: v1.0#DF-9-P2-BBB on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-193 - 9.P1.CCC -- NSIS outer installer not yet built end-to-end (DF, P1)

- **Source phase**: Phase 9 (9.7)
- **Plan reference**: [phase-09-installer.md](../../../archive/v1/v1.0/plans/phase-09-installer.md) sub-task 9.7 ("the NSIS outer installer writes the standard Windows registry entries...").
- **Reason**: `scripts/installer/build/nsis/nexus-setup.nsi` lands as the canonical NSIS template covering registry entries, Start Menu / Desktop shortcuts, `.nexus-workflow.json` association, `nexus://` URL handler, and the data-preservation uninstaller. The template is not yet compiled into a real `Nexus-1.0.0-Setup.exe` because the upstream payload fetch (`9.P1.ZZ`) is not wired and PyInstaller-freezing the wizard requires a Windows runner with the full payload. The template is reviewed but not exercised by CI yet.
- **Suggested next step**: Phase 9 follow-on: once `9.P1.ZZ` lands, run `installer-build.yml` (workflow_dispatch) and confirm `makensis` produces a binary, the binary installs silently on a Windows 11 VM, and the data-preservation prompt fires on uninstall.

- **Migrated from**: v1.0#DF-9-P1-CCC on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### NI-10 - 9.P2.DDD -- Recommended-models picker not yet wired into the wizard step flow (NI, P2)

- **Source phase**: Phase 9 (9.5)
- **Plan reference**: [phase-09-installer.md](../../../archive/v1/v1.0/plans/phase-09-installer.md) sub-task 9.5 ("Implement the model picker page in the wizard at `scripts/installer/pyqt/src/nexus_installer/pages/models.py`").
- **Reason**: Phase 9.5 lands the new `pages/recommended_models.py` page with the Light / Recommended / Full preset bundles, per-model checkboxes, the advanced catalog tab, the total + estimated-time footer, and the "Skip download" affordance. The wizard's central step controller (`window.py`) still maps the "Model Selection" step to the older `pages/model_selection.py` (Gemma 4 variant picker). The new page is not yet inserted into the step list because the `InstallerState` needs a small schema extension to carry the multi-model selection (it currently has a single `selected_model: str`), and the installing-step engine needs to iterate the new list of models. The new page is exercised in isolation by `tests/test_recommended_models.py`.
- **Suggested next step**: Phase 9 follow-on commit extends `InstallerState` with `selected_models: list[str]` + `skip_models: bool`, rewires `window.py` to use `RecommendedModelsPage` at the existing "Model Selection" step, and updates the installing-step engine to iterate the list. Existing `pages/model_selection.py` can stay as a fallback for the legacy single-model VS-Code-extension flow until the Phase 10 sync removes it.

- **Migrated from**: v1.0#NI-9-P2-DDD on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-194 - 9.P2.EEE -- macOS + Linux installer outer shells deferred to v1.0.1 / v1.0.2 (DF, P2)

- **Source phase**: Phase 9 (9.8)
- **Plan reference**: [phase-09-installer.md](../../../archive/v1/v1.0/plans/phase-09-installer.md) sub-task 9.8 ("macOS + Linux installers (one phase behind, scoped to v1.0.1+)").
- **Reason**: Phase 9.8 documents the DMG + AppImage scope, wires `.github/workflows/installer-macos.yml` and `.github/workflows/installer-linux.yml` as workflow_dispatch placeholders, and confirms the cross-platform PyQt wizard already supports both targets (only the outer-shell packaging differs). Apple Developer ID + notarization, AppImage assembly, and the macOS / Linux smoke checklists are deferred to dedicated v1.0.1 (macOS) and v1.0.2 (Linux) release cycles so the v1.0.0 surface stays Windows-first.
- **Suggested next step**: v1.0.1 opens with `installer-macos.yml` swapped from workflow_dispatch to push: tags + the smoke checklist runs on a CI macOS VM. v1.0.2 does the same for AppImage.

- **Migrated from**: v1.0#DF-9-P2-EEE on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### MT-48 - 10.P1.FFF -- DevAIHubSyncer production network/git helpers covered by smoke only (MT, P1)

- **Source phase**: Phase 10 (10.2)
- **Plan reference**: [phase-10-devai-hub-sync.md](../../../archive/v1/v1.0/plans/phase-10-devai-hub-sync.md) sub-task 10.2 (`integration test against a local git fixture verifies clone + diff + apply; offline test verifies the tarball fallback`).
- **Reason**: `core/skills/DevAIHubSyncer.ts` ships dependency-injected `SyncDependencies` (resolveLatestTag / sparseClone / tarballFetch / hasGit). The fixture-based integration tests cover the entire core pipeline (manifest, diff, scan, apply, tarball fallback) end-to-end with 100% logic coverage, but the production `defaultResolveLatestTag` (HTTPS to api.github.com), `defaultSparseClone` (spawnSync git), and `defaultTarballFetch` (HTTPS + tar) helpers are exercised by smoke tests only -- no real GitHub fetch, no real `git clone --sparse`. Coverage on `DevAIHubSyncer.ts` lands at 68.69% lines as a result; remainder is exclusively the production helpers. Functional / fixture-driven path is 100% covered.
- **Suggested next step**: Phase 11 release gate runs `nexus skills sync --tag <pinned>` against the real `bendourthe/DevAI-Hub` upstream on a clean Windows VM; the RTM smoke captures clone latency, tarball-fallback when `git` is unavailable, and verifies the resulting `~/.nexus/skills/devai-hub/<tag>/manifest.json`. Failures from that live smoke fold back into v1.1.0 as a recorded `[v1.0.0:10.P1.FFF]` carryover.

- **Migrated from**: v1.0#MT-10-P1-FFF on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-195 - 10.P1.GGG -- SkillLoader hot-reload not yet driven by the active-tag pointer (DF, P1)

- **Source phase**: Phase 10 (10.4)
- **Plan reference**: [phase-10-devai-hub-sync.md](../../../archive/v1/v1.0/plans/phase-10-devai-hub-sync.md) sub-task 10.4 ("the daemon's `SkillLoader.reload()` picks up the new content").
- **Reason**: The Phase 10 surface lands the `~/.nexus/skills/devai-hub/ACTIVE` pointer + the `nexus skills sync --apply` rotation, the `SkillsSettings` UI surfaces the "Sync now" button, and the in-process `SkillCatalog` is namespaced + diverged-aware. What is *not* wired in v1.0.0 is the cross-process IPC notification: the desktop sidecar's existing `SkillLoader` (`src/skills/SkillLoader.ts`) still reads `~/.gemma-code/skills/` at session start. The active-tag pointer is written by the syncer but no fs.watch on `ACTIVE` yet exists to push a reload IPC into the sidecar.
- **Suggested next step**: v1.0.0 RTM (Phase 11) wires `fs.watch(activeTagPointerPath(...), ...)` into the sidecar bootstrap so a successful `--apply` triggers `SkillLoader.reload()` automatically. Until then the operator restarts the app after `nexus skills sync --apply` (one-line `~/.nexus/restart-required` flag is already surfaced by the SkillsSettings UI). Falls back cleanly because the namespacing surface ensures a freshly-loaded catalog does not collide with the previous tag.

- **Migrated from**: v1.0#DF-10-P1-GGG on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-196 - 10.P1.HHH -- IdleTimeScheduler weekly auto-sync not yet wired (DF, P1)

- **Source phase**: Phase 10 (10.4)
- **Plan reference**: [phase-10-devai-hub-sync.md](../../../archive/v1/v1.0/plans/phase-10-devai-hub-sync.md) sub-task 10.4 ("an 'Auto-sync weekly' toggle (default OFF) that schedules an idle-time sync via `IdleTimeScheduler` (registered as a `Worker` in Phase 3.4)").
- **Reason**: The SkillsSettings page renders the toggle and persists its state via the `setAutoSyncEnabled` client method. The actual `IdleTimeScheduler` worker registration (`devai-hub-sync`, 7-day cadence) is gated on the SkillLoader hot-reload IPC (`10.P1.GGG`) -- registering the worker before the reload pathway exists would surface a successful sync that the running daemon ignores until the next process restart.
- **Suggested next step**: Land together with `10.P1.GGG` in Phase 11. Worker body is a thin shell over `new DevAIHubSyncer().sync({ apply: true })`; the SettingsStore key `nexus.skills.autoSync.devai-hub` is already reserved by the UI client.

- **Migrated from**: v1.0#DF-10-P1-HHH on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### NI-11 - 10.P2.III -- `nexus skills install` / `remove` are stubs (NI, P2)

- **Source phase**: Phase 10 (10.2)
- **Plan reference**: [phase-10-devai-hub-sync.md](../../../archive/v1/v1.0/plans/phase-10-devai-hub-sync.md) sub-task 10.2 (CLI surface includes `nexus skills install <ns>/<name> [--from <url>]` and `nexus skills remove <ns>/<name>`).
- **Reason**: The two subcommands print a message that points the operator at copying SKILL.md files into `~/.nexus/skills/user/` (install) or deleting them directly (remove). Both rely on path-validation + permission-tier guards that are not yet ported into the `nexus` binary; shipping a half-implemented install path would surface a tool that can `--from <arbitrary URL>` arbitrary content into `~/.nexus/skills/user/` without first running the prompt-injection scanner -- a path-traversal / RCE risk. The DevAI-Hub sync pathway (the path that DOES run the scanner) is the v1.0.0 install surface.
- **Suggested next step**: v1.0.1 lands `nexus skills install <ns>/<name>` with: (a) `--from <url>` only accepts `https://` URLs whose host matches a documented allowlist; (b) downloaded content is unconditionally run through `PromptInjectionScanner` before being written to disk; (c) the destination dir is path-clamped to `~/.nexus/skills/user/`.

- **Migrated from**: v1.0#NI-10-P2-III on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-197 - 10.P2.JJJ -- `nexus.skills.preferUpstream` setting not yet read by slash-command autocomplete (DF, P2)

- **Source phase**: Phase 10 (10.6)
- **Plan reference**: [phase-10-devai-hub-sync.md](../../../archive/v1/v1.0/plans/phase-10-devai-hub-sync.md) sub-task 10.6 ("A setting `nexus.skills.preferUpstream` (default `false`) decides which one is suggested as the default in slash-command autocomplete").
- **Reason**: The `SkillsSettingsClient.setDivergedPreference()` IPC entry-point and the "Use as default" button are wired in Phase 10.4, and the `diverged` flag on `SkillRecord` is computed on `list()`. The Coding-module slash-command autocomplete still reads from the legacy in-process `SkillLoader`, which is namespace-agnostic. Plumbing the `preferUpstream` setting into the autocomplete requires the SkillLoader hot-reload work in `10.P1.GGG`.
- **Suggested next step**: Bundled with `10.P1.GGG`. The setting key `nexus.skills.preferUpstream` is already reserved by the SettingsStore in Phase 2.7 (carrying a `false` default per-spec).

- **Migrated from**: v1.0#DF-10-P2-JJJ on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-198 - 10.P2.KKK -- Skill-context attribution into AgentLoop tool-call spans not yet wired (DF, P2)

- **Source phase**: Phase 10 (10.5)
- **Plan reference**: [phase-10-devai-hub-sync.md](../../../archive/v1/v1.0/plans/phase-10-devai-hub-sync.md) sub-task 10.5 ("when a tool call originates from a skill, the trace record includes `skill: {id, namespace, provenance}`").
- **Reason**: Phase 10.5 lands the `Tracer.setCurrentSkill(...)` / `currentSkill` surface plus the automatic `skill.*` attribute fold-in on every `tool_call` / `sub_agent` span. The call-site in `src/tools/AgentLoop.ts` that knows *which* skill is currently expanding into tool calls still consults the legacy `SkillLoader` which is not provenance-aware (the namespaced `SkillCatalog` is exposed via core but the Coding-module loader adapter has not been written yet -- tracked as v1.0.0 known-gap code `MV`). Tracer-side support is 100% covered; the missing wiring is "AgentLoop calls `tracer.setCurrentSkill(...)` at slash-command entry and clears it on exit".
- **Suggested next step**: Bundled with the SkillLoader adapter (Phase 11 / `MV`-class gap). The Tracer side is ready: the moment the AgentLoop knows it is executing on behalf of a skill, one line (`this._tracer.setCurrentSkill(skillContext)`) drives the entire provenance pipeline.

- **Migrated from**: v1.0#DF-10-P2-KKK on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-199 - 11.P1.LLL -- VS Code extension thin-adapter rewrite deferred to v1.1.0 (DF, P1)

- **Source phase**: Phase 11 (11.4 CHANGELOG, 11.7 distribution)
- **Plan reference**: [phase-11-hardening-and-release.md](../../../archive/v1/v1.0/plans/phase-11-hardening-and-release.md) sub-task 11.7; [distribution.md](../../../archive/v1/v1.0/distribution.md) Section 2; pivot-brief Section 7.
- **Reason**: The Marketplace listing under `gemma-code` publisher remains the v1.0.0 distribution surface; the listing description gets a v1.0.0 update so users know about the desktop product, but the breaking-change rewrite to `nexus-coding` (publisher + manifest IDs + thin-adapter delegate-to-daemon) is bundled into a single v1.1.0 Marketplace re-publish. v1.0.0 ships the daemon-discovery hook (`desktop/src/desktop/daemonDiscovery.ts`) so the activation branch is in place; the actual `extension.ts` rewrite waits on the shared-core build.
- **Suggested next step**: v1.1.0 cycle: bundle the rewrite of `src/extension.ts` (currently 445 lines, target ~200) with the `package.json` rename to `nexus-coding` and the manifest-ID rewrite (`gemma-code-sidebar` -> `nexus-coding-sidebar`, `gemma-code.<cmd>` -> `nexus.coding.<cmd>`). Re-publish under the new Marketplace listing with a transition note in the old listing's description.

- **Migrated from**: v1.0#DF-11-P1-LLL on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-200 - 11.P1.MMM -- Authenticode signing pending operator-procured EV certificate (DF, P1)

- **Source phase**: Phase 11 (11.3)
- **Plan reference**: [phase-11-hardening-and-release.md](../../../archive/v1/v1.0/plans/phase-11-hardening-and-release.md) sub-task 11.3; [release-signing.md](../../../archive/v1/v1.0/release-signing.md) Section 1; [operator-actions.md](../../../archive/v1/v1.0/operator-actions.md) OA-01.
- **Reason**: The signing workflow is documented end-to-end. Procuring the EV Code Signing certificate + HSM is operator-driven (5-10 business day lead time at most CAs; FIPS 140-2 Level 2 HSM device required). The CI workflow (`installer-build.yml`) is wired to run `signtool sign /tr /td sha256 /fd sha256 /sha1 $env:WINDOWS_SIGNING_THUMBPRINT /a` on the tag-push path; the secrets `WINDOWS_SIGNING_THUMBPRINT` + `WINDOWS_SIGNING_PIN` are not yet populated.
- **Suggested next step**: Operator action OA-01 procures the certificate, populates the secrets, and runs the workflow against the `v1.0.0` tag. Until OA-01 lands, the v1.0.0 installer ships unsigned and SmartScreen warns "Unknown publisher" on first install.

- **Migrated from**: v1.0#DF-11-P1-MMM on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-201 - 11.P2.NNN -- macOS notarization workflow not yet exercised (DF, P2)

- **Source phase**: Phase 11 (11.3)
- **Plan reference**: [release-signing.md](../../../archive/v1/v1.0/release-signing.md) Section 2; [operator-actions.md](../../../archive/v1/v1.0/operator-actions.md) OA-11.
- **Reason**: The notarization runbook is committed at `release-signing.md` Section 2 with the full `codesign --options runtime --timestamp` + `xcrun notarytool submit --wait` + `xcrun stapler staple` workflow + the required entitlements (`allow-jit`, `allow-unsigned-executable-memory`, `disable-library-validation`) for the PyTorch / Node sidecars. macOS DMG packaging itself is out of scope for v1.0.0 per Phase 9.8 + known-gap 9.P2.EEE.
- **Suggested next step**: v1.0.1 opens with Apple Developer Program enrollment + Developer ID Application/Installer cert procurement + `installer-macos.yml` swap from workflow_dispatch to push:tags + first DMG build through the documented workflow. Operator action OA-11.

- **Migrated from**: v1.0#DF-11-P2-NNN on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-202 - 11.P2.OOO -- Direct-download landing page deferred to v1.0.1 (DF, P2)

- **Source phase**: Phase 11 (11.7)
- **Plan reference**: [distribution.md](../../../archive/v1/v1.0/distribution.md) Section 3; [operator-actions.md](../../../archive/v1/v1.0/operator-actions.md) OA-05.
- **Reason**: The GitHub Release URL (`https://github.com/bendourthe/Nexus-AI/releases/tag/v1.0.0`) is the canonical v1.0.0 distribution surface. A dedicated landing site (`nexus.bendourthe.com/download` or equivalent) with platform-aware CTAs is logged explicitly so the work is not lost; out of scope for v1.0.0.
- **Suggested next step**: v1.0.1 cycle: stand up the landing page (DNS, static site host, copy from `release-notes.md`). Operator action OA-05.

- **Migrated from**: v1.0#DF-11-P2-OOO on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-203 - 11.P2.PPP -- semantic-release configuration not yet driven by the v1.0.0 tag (DF, P2)

- **Source phase**: Phase 11 (11.5)
- **Plan reference**: [phase-11-hardening-and-release.md](../../../archive/v1/v1.0/plans/phase-11-hardening-and-release.md) sub-task 11.5 ("semantic-release dry-run produces the expected artifacts").
- **Reason**: `.releaserc.json` is configured for the existing `0.X.Y` cadence that produced `0.30.0` and `0.30.1`. The v1.0.0 manual annotated tag bypasses semantic-release; future post-v1.0.0 commits will resume the semantic-release cadence at `1.0.1`, `1.1.0`, etc. The first-tag-after-v1.0.0 push has not been exercised; the v1.0.0 CHANGELOG entry written by Phase 11.4 will need to coexist with semantic-release's generated entries on subsequent releases.
- **Suggested next step**: v1.0.1 cycle (or the first feature PR after v1.0.0): verify semantic-release dry-run against `1.0.0` -> `1.0.1` correctly appends a new entry above the v1.0.0 block in CHANGELOG.md without overwriting it. If not, add a `@semantic-release/changelog` `changelogTitle` override.

- **Migrated from**: v1.0#DF-11-P2-PPP on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-204 - 11.P1.QQQ -- v0.9.0 known-gaps file flipped to finalized (DF, P1)

- **Source phase**: Phase 11 (11.8)
- **Plan reference**: [phase-11-hardening-and-release.md](../../../archive/v1/v1.0/plans/phase-11-hardening-and-release.md) sub-task 11.8 ("flip the v0.9.0 file to `finalized`").
- **Reason**: The v0.9.0 known-gaps file (`docs/archive/versions/v0/v0.9.0/known-gaps.md`) was marked `in-progress` with a note that it would flip to `finalized` at v1.0.0 cycle close. Phase 11.8 executes the flip mirroring the v0.8.0 -> v0.9.0 transition pattern.
- **Suggested next step**: Resolved in Phase 11.8 -- see `## 2. Resolved` below for the entry recording the flip.

---

- **Migrated from**: v1.0#DF-11-P1-QQQ on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-205 - 1.1.P1.A -- TypeScript project-references wiring deferred (DF, P1)

- **Source phase**: Phase 1 (1.1)
- **Plan reference**: [phase-01-shared-core-and-carryforward-closure.md](../../../archive/v1/v1.1/plans/phase-01-shared-core-and-carryforward-closure.md) sub-task 1.1 ("Land the TypeScript project-references infrastructure ... `tsc -b` from the repo root builds `core/`, `src/`, and `desktop/sidecar/` in dependency order").
- **Reason**: The decision document at [docs/versions/v1/v1.1.0/development/decisions/shared-core-build.md](../../../archive/v1/v1.1/development/decisions/shared-core-build.md) records option (a) -- project references with `composite: true` on `core/` -- as the chosen strategy. The actual wiring (new `core/tsconfig.json`, `references` arrays in the root and `desktop/tsconfig.json`, switching `npm run build` to `tsc -b`) was not landed in the Phase 1 commit because it interacts with the sub-task 1.4 wholesale `src/` -> `modules/coding/` move: the root tsconfig's `include` set currently emits `core/` into `out/core` AND `core/tsconfig.json` with `composite: true, outDir: "../out/core"` would emit to the same location, producing a double-emit conflict until either the root tsconfig is narrowed to `src/` only (which requires 1.4 to land first so the `modules/coding/` reference is the canonical entry point) or the build script is split into `build:core` + `build:src` chains. Doing it in the wrong order would either break `npm run build` on day one or leave a broken intermediate state that other phases would have to step around.
- **Suggested next step**: Land 1.1's wiring as the first commit cluster of the 1.4 follow-up (the wholesale `src/` move). The pre-req sequence is: (a) narrow root `tsconfig.json` `include` to only the moved `modules/coding/**/*` and `src/extension.ts` (if it still exists post-move), (b) add `core/tsconfig.json` with `composite: true`, (c) add `references: [{ "path": "./core" }]` to the root and to `desktop/tsconfig.json`, (d) rename `npm run build` to invoke `tsc -b`, (e) verify `npm run check-architecture` still passes against the new reference graph.

- **Migrated from**: v1.1#DF-1-1-P1-A on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-206 - 1.4.P1.B -- src/ -> modules/coding/ wholesale move partially closed; 12 sub-trees remain deferred (DF, P1)

- **Source phase**: Phase 1 (1.4)
- **Plan reference**: [phase-01-shared-core-and-carryforward-closure.md](../../../archive/v1/v1.1/plans/phase-01-shared-core-and-carryforward-closure.md) sub-task 1.4 ("Perform the wholesale move with `git mv`: `src/llm/` -> `core/llm/` (already exists -- merge) ... [13 source sub-tree moves listed]"); closes v1.0.0 carryforward 2.P2.I.
- **Reason**: The wholesale move is a ~190-source-file + 500+ test-import operation that cannot be validated in a single session without per-step CI runs. Each `git mv` cluster (a single sub-tree, e.g. `src/agents/` -> `modules/coding/agents/`) needs its own `npm test` + `npm run check-architecture` pass before the next sub-tree moves, otherwise compounding import-rewrite errors are hard to bisect. Phase 3 (this commit) lands the codemod infrastructure ([scripts/dev/rewrite-imports.mjs](../../../scripts/dev/rewrite-imports.mjs), see 3.P1.A) plus the first leaf-tree migration -- `src/utils/` -> `modules/coding/utils/` -- so the remaining sub-tree moves now become near-pure renames driven by the same script. The 12 remaining sub-trees stay open because each subsequent move benefits from its own commit + CI run, both for review readability and to keep the import-rewrite blast radius bounded per phase.
- **Status table (per sub-tree)**:
  | Sub-tree | Status | Closed in | Notes |
  |---|---|---|---|
  | `src/utils/` -> `modules/coding/utils/` | Closed | Phase 3 (this commit) | 6 files moved; 65 importers rewritten by codemod. |
  | `src/config/` -> `modules/coding/config/` | Open | -- | 9 files; candidate for Phase 4 (low coupling). |
  | `src/llm/` -> merge into `core/llm/` | Open | -- | 5 files; coordinate with `core/llm/{PromptFormat,ToolCallFormat}.ts` already in place. |
  | `src/observability/` -> `modules/coding/observability/` | Open | -- | 3 files; candidate for Phase 4. |
  | `src/orchestration/` -> `modules/coding/orchestration/` | Open | -- | 2 files; candidate for Phase 4. |
  | `src/guardrails/` -> `modules/coding/guardrails/` | Open | -- | 2 files. |
  | `src/mcp/` -> `modules/coding/mcp/` | Open | -- | small. |
  | `src/commands/` -> `modules/coding/commands/` | Open | -- | small. |
  | `src/agents/` -> `modules/coding/agents/` | Open | -- | medium. |
  | `src/chat/` -> `modules/coding/chat/` | Open | -- | medium; depends on `src/storage/`. |
  | `src/evaluation/` -> `modules/coding/evaluation/` | Open | -- | medium; check `generate-golden-tasks.mjs` output path. |
  | `src/skills/` -> `modules/coding/skills/` | Open | -- | medium; keep coding-side loader adapter under `modules/coding/skills/`. |
  | `src/runtime/` -> `modules/coding/runtime/` | Open | -- | unlocks 1.10.P1.F (NexusCodingRuntime sidecar wiring). |
  | `src/storage/` -> merge into `core/storage/` | Open | -- | heaviest; many consumers. |
  | `src/tools/` -> `modules/coding/tools/` | Open | -- | heaviest leaf; many consumers. |
  | `src/panels/` -> `modules/coding/panels/` | Open | -- | webview side; touches manifest paths. |
  | `src/extension.ts` -> `modules/coding/extension.ts` | Open | -- | Last move; flips `main` in package.json. |
- **Suggested next step**: Pick a Phase 4 candidate from the table above (suggest `src/config/` next: 9 files, leaf-shaped). Drive the next move with `node scripts/dev/rewrite-imports.mjs --moves <phase-4-manifest.json>` after `git mv`-ing the sub-tree. Land each move as its own commit + CI run. `src/extension.ts` is last; it triggers the manifest `main` field flip and unlocks the Phase 10 thin-adapter rewrite.

- **Migrated from**: v1.1#DF-1-4-P1-B on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-207 - 1.10.P1.F -- NexusCodingRuntime wiring into sidecar sessionManager deferred (DF, P1)

- **Source phase**: Phase 1 (1.10)
- **Plan reference**: [phase-01-shared-core-and-carryforward-closure.md](../../../archive/v1/v1.1/plans/phase-01-shared-core-and-carryforward-closure.md) sub-task 1.10 ("Replace the placeholder `sendMessage` body in `desktop/sidecar/src/coding/sessionManager.ts` with: instantiate `NexusCodingRuntime` once per session ..."); closes v1.0.0 carryforward 3.P1.M.
- **Reason**: `NexusCodingRuntime` is defined in `src/runtime/NexusCodingRuntime.ts`, which moves into `modules/coding/runtime/` as part of 1.4. Wiring it into the sidecar before the move would create an `import "../../../src/runtime/NexusCodingRuntime"` from `desktop/sidecar/`, which is exactly the brittle relative-path pattern 1.1 is designed to eliminate.
- **Suggested next step**: Land after 1.4 in "Phase 1b"; the wiring is one constructor call + one event-stream pump.

- **Migrated from**: v1.1#DF-1-10-P1-F on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-208 - 1.11.P1.G -- Tailwind v4 wiring deferred (DF, P2)

- **Source phase**: Phase 1 (1.11)
- **Plan reference**: [phase-01-shared-core-and-carryforward-closure.md](../../../archive/v1/v1.1/plans/phase-01-shared-core-and-carryforward-closure.md) sub-task 1.11 ("Add Tailwind v4 to `desktop/package.json` ..."); v1.0.0 carryforward 1.P2.B.
- **Reason**: The desktop workspace currently consumes CSS variables directly (`var(--token)`). Adding Tailwind v4 + PostCSS would re-expose the same variables as utility classes, but the build-pipeline change interacts with Phase 11 (the Nexus VS Code extension) since its webview also consumes these tokens. Doing it in Phase 1 would force a re-run of every visual-regression snapshot for net-zero behavioural change.
- **Suggested next step**: Fold into Phase 11 (Nexus VS Code extension) when the webview build pipeline is otherwise touched.

- **Migrated from**: v1.1#DF-1-11-P1-G on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### MT-49 - 1.12.P2.H -- Phase 1 regression test for curator IdleTimeScheduler exclusivity deferred (MT, P2)

- **Source phase**: Phase 1 (1.7)
- **Plan reference**: [phase-01-shared-core-and-carryforward-closure.md](../../../archive/v1/v1.1/plans/phase-01-shared-core-and-carryforward-closure.md) sub-task 1.7 acceptance ("Add a regression test ... that asserts no curator runs occur outside `IdleTimeScheduler` invocations.").
- **Reason**: The Phase 1 commit removed the `_runOneIteration` curator block; an explicit regression test asserting "AgentLoop never dispatches a `curator-worker` sub-agent regardless of `curatorWorkerEnabled`" was not added because the field was made dead (`void options?.curatorWorkerEnabled`) and the existing test suite has no test that fires the curator from AgentLoop. The risk of regression therefore stems from a future re-introduction of the block, which a code review would catch.
- **Suggested next step**: Add `tests/integration/curator-scheduler-only-entry.test.ts` in "Phase 1b" with two cases: (a) construct AgentLoop with `curatorWorkerEnabled: true`, run 100 turns, assert `subAgentManager.run` is never called with `type: "curator-worker"`; (b) instantiate an `IdleTimeScheduler`, register a curator task gated by `nexus.curator.enabled`, advance the fake clock, assert it fires.

- **Migrated from**: v1.1#MT-1-12-P2-H on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-209 - 1.12.P2.I -- Operator action items inherited from v1.0.0 (DF, P2)

- **Source phase**: Phase 1 (carryforward)
- **Plan reference**: [docs/versions/v1/v1.0.0/operator-actions.md](../../../archive/v1/v1.0/operator-actions.md) OA-01 through OA-12; the v1.1.0 cycle plan defers their resolution to Phase 15 (release hardening).
- **Reason**: 12 operator-driven items (Authenticode signing, macOS notarization, AppImage assembly, DevAI-Hub baseline SHA rotation, final brand icons, live golden-task replay, GPU bench, live DevAI-Hub sync smoke, RTM smoke checklists, plus four others) require external infrastructure that is operator-procured (EV certs) or hardware-bound (RTX 4070 rig). Phase 1 inherits them as carryforward.
- **Suggested next step**: They surface in Phase 15's stability gate. No code change required in Phase 1.

- **Migrated from**: v1.1#DF-1-12-P2-I on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-210 - 4.3.P1.J -- HookBus emit sites partially wired (DF, P1)

- **Source phase**: Phase 4 (4.3)
- **Plan reference**: [phase-04-memory-provenance-and-hooks.md](../../../archive/v1/v1.1/plans/phase-04-memory-provenance-and-hooks.md) sub-task 4.3 ("Find the equivalents in [modules/coding/](../../../../src) (post-Phase-1.4 layout): ... emit `lifecycle.session.start` ... `lifecycle.session.stop` ... `lifecycle.user.prompt` ... `lifecycle.tool.pre` + `.post` (or `.failed`) ... `lifecycle.subagent.start` / `.stop` ... `lifecycle.context.preCompact` ... `SessionStore.close(...)` -> emit `lifecycle.session.end`").
- **Reason**: Phase 4 wired the five highest-blast-radius emit sites end-to-end (`AgentLoop.run` -> `lifecycle.session.start`/`.stop`; `_runToolCall` -> `lifecycle.tool.pre`/`.post`/`.failed`; `AgentLoop.spawnSubAgent` -> `lifecycle.subagent.start`/`.stop`). Four sites stay deferred because each touches a surface that has not been centralized in `core/` yet and would force a Phase 1.4 sub-tree move as a pre-req: (1) `lifecycle.user.prompt` lives in `ChatController.handleUserMessage` whose move into `modules/coding/` is still tracked under 1.4.P1.B; (2) `lifecycle.context.preCompact` ties into `Tracer.snapshot()` / `ContextCompactor.compact()` which spans two modules; (3) `lifecycle.session.end` requires a `SessionStore.close()` hook the sidecar's session manager does not yet expose (a Phase 1.10 dependency, see 1.10.P1.F); (4) `lifecycle.skill.entry` is intentionally deferred to Phase 8 per the plan's own note ("The `lifecycle.skill.entry` event is fired from Phase 8's `AgentLoop.setCurrentSkill(...)`").
- **Suggested next step**: Cluster the four remaining emit sites into a Phase 1b follow-up commit alongside the `src/runtime/` -> `modules/coding/runtime/` move (which unblocks (3)). For (2), thread the HookBus into `Tracer.snapshot()` via a constructor injection; the existing `_compactor.setTraceContext` call site is the natural anchor. For (4), wait for Phase 8.

- **Migrated from**: v1.1#DF-4-3-P1-J on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### NI-12 - 4.1.P2.K -- v1.0.0 fixture SQLite database generated in-test rather than checked in (NI, P2)

- **Source phase**: Phase 4 (4.1)
- **Plan reference**: [phase-04-memory-provenance-and-hooks.md](../../../archive/v1/v1.1/plans/phase-04-memory-provenance-and-hooks.md) sub-task 4.1 prompt ("Write a fixture test that loads a v1.0.0 snapshot DB (commit a small one under `tests/fixtures/v1.0.0/memory.sqlite`) ...").
- **Reason**: The fixture is generated programmatically inside [tests/unit/storage/MemoryStore.provenance.test.ts](../../../tests/unit/storage/MemoryStore.provenance.test.ts) via `seedV1Db()` rather than checked in as a binary. The acceptance criterion ("migration runs idempotently and a fixture-based test loads a v1.0.0 database and verifies the new column is NULL-backfilled") is satisfied; the deviation is to avoid binary churn in git (the same approach the existing `MemoryStore.migration.test.ts` already uses for the v0.4.0 -> v0.5.0 migration).
- **Suggested next step**: Keep the in-test generator unless a multi-version fixture matrix becomes valuable; at that point, codify the schemas under `tests/fixtures/<version>/seed.ts` and have each test import the appropriate seeder.

- **Migrated from**: v1.1#NI-4-1-P2-K on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-211 - 5.1.P1.M -- LocalEmbedder runs against the deterministic hash fallback in CI (DF, P1)

- **Source phase**: Phase 5 (5.1)
- **Plan reference**: [phase-05-hybrid-retrieval-and-local-embedder.md](../../../archive/v1/v1.1/plans/phase-05-hybrid-retrieval-and-local-embedder.md) sub-task 5.1 ("Add `@xenova/transformers` to `package.json` dependencies. Add `core/memory/LocalEmbedder.ts` with `class LocalEmbedder { async embed(text: string): Promise<Float32Array> }` ... The installer (Phase 14) packs the weights so production hosts never hit the Hub.").
- **Reason**: `@xenova/transformers` is the binary-heavy ONNX runtime (`onnxruntime-node` transitive, plus the ~80 MB `all-MiniLM-L6-v2` weights downloaded on first use). The Phase 5 commit adds it as an `optionalDependencies` entry (so `npm ci` does not require it on CI hosts that lack the native build toolchain) and the `LocalEmbedder` class lazy-loads it via a guarded dynamic `import()`. When the import fails, the class transparently switches to a deterministic 384-dim hash sketch (`hashEmbed` in [core/memory/LocalEmbedder.ts](../../../core/memory/LocalEmbedder.ts)). The sketch is contractually identical (384-dim, deterministic, L2-normalized, batch-callable) so the rest of the pipeline -- `DenseIndex`, `HybridRetriever`, `WarmRebuildWorker` -- can be exercised end-to-end without the runtime payload, but it is NOT a substitute for real semantic embeddings in production. The unit tests (`tests/unit/core/memory/LocalEmbedder.test.ts`) run against the fallback by passing `forceFallback: true`, so CI assertions cover the fallback path verbatim; the real ONNX pipeline is exercised manually on the operator's GPU rig under OA-09 and again as part of Phase 14's installer payload smoke.
- **Suggested next step**: When the cross-OS installer lands in Phase 14, add an integration test that runs against the bundled weights at `~/.nexus/runtimes/embedder/all-MiniLM-L6-v2/` and asserts: (a) `backend === "transformers"` after first use; (b) deterministic vector for "hello world" matches a fixture; (c) cosine similarity between semantically-similar sentence pairs is materially higher than the hash sketch produces. The test gates the v1.1.0 RTM by depending on the installer's weight payload, so it cannot run earlier than Phase 14.

- **Migrated from**: v1.1#DF-5-1-P1-M on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-212 - 5.5.P1.N -- `src/storage/UnifiedMemoryRetriever` not yet migrated; delegation happens at the `MemoryHub` level instead (DF, P1)

- **Source phase**: Phase 5 (5.5)
- **Plan reference**: [phase-05-hybrid-retrieval-and-local-embedder.md](../../../archive/v1/v1.1/plans/phase-05-hybrid-retrieval-and-local-embedder.md) sub-task 5.5 ("Replace the substring path in `UnifiedMemoryRetriever` with a delegating call to `HybridRetriever`. Keep the substring path as a fast-path-fallback for very small corpora (<100 entries) where BM25 is overkill.").
- **Reason**: `src/storage/UnifiedMemoryRetriever` is a 312-line legacy class whose retrieval path is not substring-based: it dispatches per-layer token budgets, fuses a hybrid HNSW + FTS5 + recency ranking via the v0.9.0 Phase 2.2 `MemoryStore.retrieveHybrid`, and falls back to the v0.7.0 keyword + cosine merge on the legacy route. The literal substring path the plan describes lives in `core/memory/MemoryHub.ts::InMemoryMemoryHub.retrieve` -- the four-layer in-memory facade that pillars (Chat, Image, Video) consume during Phase 2-5 before the SQLite stack is wired in. Phase 5 wires the new `HybridRetriever` into that hub (with the documented `<100`-entry substring fast-path fallback gated by `nexus.memory.hybridMinCorpus`) so the user-visible semantics of "substring on tiny corpora, hybrid on real ones" are satisfied; the deeper migration of `src/storage/UnifiedMemoryRetriever` will fold into the Phase 6/9 work where `MemoryStore` itself gains the BM25 / dense indexes alongside its existing HNSW path. The deviation note: the plan over-simplified the existing retriever's role; the corrected interpretation is that the hybrid path lands in the `MemoryHub` first (where it has consumers today) and migrates into the SQLite-backed `UnifiedMemoryRetriever` second.
- **Suggested next step**: In Phase 6 (memory CLI + decay) or Phase 9 (consolidation), add a `MemoryStore`-backed adapter that builds `Bm25Index` + `DenseIndex` from the persistent rows on startup and wires them into a `HybridRetriever` consumed by `UnifiedMemoryRetriever.retrieve(query)` for the semantic layer's budget. The substring path stays as a fast-path fallback for corpora <100 entries via `nexus.memory.hybridMinCorpus`.

- **Migrated from**: v1.1#DF-5-5-P1-N on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-213 - 5.6.P2.O -- IdleTimeScheduler binding for `memory.warm-rebuild` not yet wired in the sidecar (DF, P2)

- **Source phase**: Phase 5 (5.6)
- **Plan reference**: [phase-05-hybrid-retrieval-and-local-embedder.md](../../../archive/v1/v1.1/plans/phase-05-hybrid-retrieval-and-local-embedder.md) sub-task 5.6 ("Add an `IdleTimeScheduler` worker `memory.warm-rebuild` that on first launch (or when the indexes are detected as stale -- a hash-of-row-count mismatch) reads all `memory_entries` rows and embeds them in batches of 32.").
- **Reason**: The worker code (`core/memory/WarmRebuildWorker.ts::warmRebuild` plus `createWarmRebuildTask`) ships with full unit-test coverage (11 tests including the 10,000-row latency budget). The `createWarmRebuildTask` helper returns the exact `{id, idleThresholdMs, cadenceMs, run()}` shape that `IdleTimeScheduler.register` expects, but the actual `scheduler.register(createWarmRebuildTask(...))` call site in `desktop/sidecar/` has not been wired because it needs (a) a `MemoryStore`-backed `WarmRebuildSource` implementation (currently the worker only knows about an in-memory rows array; see 5.5.P1.N for the related migration story) and (b) a singleton `LocalEmbedder` injected at sidecar boot. Both prerequisites cluster naturally with the Phase 6 CLI work (which adds the persistent-memory adapters anyway) or the Phase 10 thin-adapter rewrite (which is where the sidecar's `IdleTimeScheduler` is materialized).
- **Suggested next step**: In Phase 6, build the `MemoryStoreWarmRebuildSource` (wraps `MemoryStore.iterateAllRows()`, hashes row count + last-updated timestamp into `fingerprint()`), instantiate one shared `LocalEmbedder` per sidecar (`LocalEmbedder.fromInstallPath()`), and register the task on the existing `IdleTimeScheduler` instance. Acceptance: a fresh-from-defaults sidecar fires the warm-rebuild within ~5 s of becoming idle, surfaces progress via `lifecycle.notification`, and the Memory panel reflects the rebuild status.

- **Migrated from**: v1.1#DF-5-6-P2-O on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-214 - 6.1.P2.P -- SQLite-backed `memory_audit_log` table not yet wired; CLI consumes captured JSONL snapshots (DF, P2)

- **Source phase**: Phase 6 (6.1)
- **Plan reference**: [phase-06-memory-cli-decay-and-slash-commands.md](../../../archive/v1/v1.1/plans/phase-06-memory-cli-decay-and-slash-commands.md) sub-task 6.1 ("Reads from `memory_entries` + `memory_audit_log` (a new lightweight log table written on every read/write/delete; add to the Phase 4 migration).").
- **Reason**: Phase 6 ships the audit log as an in-memory `InMemoryAuditLog` plus a pure formatter (`formatAuditTable` / `formatAuditJsonl`) and threads the log through the slash-command handlers so `/recall` / `/remember` / `/forget` already write audit rows. The persistence boundary -- a SQLite-backed `MemoryAuditLog` implementation against a new `memory_audit_log` table in the v1.1.0 Phase 4 migration -- was not landed because Phase 4's `_runMigrations()` block already bumped `MEMORY_SCHEMA_VERSION` to 3 for the provenance + scope_id columns, and adding the audit table without a coordinated migration version bump would split the schema upgrade across two commits with no clean rollback. Phase 6's CLI surface therefore reads from a captured JSONL snapshot via `--source <path.jsonl>`; the sidecar wires the in-memory log directly into the slash-command handlers (no JSONL hop) so the production path is fully exercised end-to-end without the persistence layer.
- **Suggested next step**: In Phase 7 or 8, bump `MEMORY_SCHEMA_VERSION` to 4 and add the `memory_audit_log` table (columns mirror `MemoryAuditRow`: `timestamp INTEGER NOT NULL, op TEXT NOT NULL, tier TEXT NOT NULL, entry_id TEXT NOT NULL, session_id TEXT NULL, hook_kind TEXT NULL, tool_name TEXT NULL, text_preview TEXT NOT NULL, PRIMARY KEY (timestamp, entry_id, op)`). Implement `SqliteMemoryAuditLog implements MemoryAuditLog` against it, and have the sidecar swap the in-memory instance for the SQLite one at boot. The CLI's `--source` flag remains useful for forensic replay against captured snapshots.

- **Migrated from**: v1.1#DF-6-1-P2-P on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-215 - 6.2.P2.Q -- `nexus memory export` / `nexus memory import` CLI surface consumes injected JSONL rather than the live store (DF, P2)

- **Source phase**: Phase 6 (6.2)
- **Plan reference**: [phase-06-memory-cli-decay-and-slash-commands.md](../../../archive/v1/v1.1/plans/phase-06-memory-cli-decay-and-slash-commands.md) sub-task 6.2 ("Output: one JSONL line per row, full row contents (text, vector base64, provenance, tier, timestamps).").
- **Reason**: The core export/import logic lives in [core/memory/MemoryExport.ts](../../../core/memory/MemoryExport.ts) (`exportToJsonl(source, filter)` + `importFromJsonl(text, sink)` + `encodeVectorB64` / `decodeVectorB64` + `isPathInside` path-traversal guard) and is fully exercised by [tests/unit/core/memory/MemoryExport.test.ts](../../../tests/unit/core/memory/MemoryExport.test.ts) (12 cases including the round-trip integrity assertion). The CLI surface in [bin/nexus.mjs](../../../bin/nexus.mjs) calls into the same code path with a `--source <jsonl>` injection. The end-to-end "CLI binds to the live `MemoryStore` and walks every row" wiring is deferred for the same schema-coordination reason as 6.1.P2.P: the production path runs through the desktop daemon's sidecar where the export/import code is already wired (the sidecar instantiates `MemoryStoreExportSource` directly), so the CLI's `--source` injection is the operator-facing surface for forensic replay rather than a primary user path. The acceptance criterion ("a small corpus exports and reimports via `nexus memory import` with round-trip integrity") is satisfied at the unit level.
- **Suggested next step**: Add a `MemoryStoreExportSource` adapter under [src/storage/MemoryExportAdapters.ts](../../../src/storage) (wraps `MemoryStore.listAll(limit)` and projects each row into `ExportableRow`); add a matching `MemoryStoreImportSink`; have the sidecar inject them at boot so the desktop app's export button writes the live store without any JSONL intermediate. Land alongside 6.1.P2.P.

- **Migrated from**: v1.1#DF-6-2-P2-Q on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-216 - 6.5.P2.R -- Memory panel "Forget" button signals via callback; IPC delete pipeline deferred (DF, P2)

- **Source phase**: Phase 6 (6.5)
- **Plan reference**: [phase-06-memory-cli-decay-and-slash-commands.md](../../../archive/v1/v1.1/plans/phase-06-memory-cli-decay-and-slash-commands.md) sub-task 6.5 ("Add a 'Forget' button on each row in the Memory panel ... that calls `memory.delete(id)` IPC -> sidecar handler -> `MemoryHub.delete(id)`.").
- **Reason**: Phase 6 adds the `onForget` callback on `MemoryPanel` (rendered as a "Forget" button per row) plus the two panel tests asserting render + click-dispatch. The actual IPC pipeline (`memory.delete(id)` in the protocol -> sidecar handler -> `MemoryHub.delete(id)`) is deferred because the `MemoryHub` interface in [core/memory/MemoryHub.ts](../../../core/memory/MemoryHub.ts) does not yet expose a `delete(id)` method -- the four-layer in-memory facade was designed write-add-only with bulk `clear()` and `retagScope()` semantics. Adding `delete(id)` requires per-layer wiring (`WorkingMemory.deleteById`, `EpisodicMemory.deleteById`, `SemanticMemory.deleteById`, `GraphMemory.deleteByEntryId`), the matching protocol schema field, the sidecar handler, and the `desktop/sidecar/src/coding/panelData.ts` route -- a non-trivial cross-cutting change. The `/forget` slash command exercises the same `MemoryWritePort.delete(id)` interface at the handler layer (covered by [tests/unit/core/memory/MemorySlashCommands.test.ts](../../../tests/unit/core/memory/MemorySlashCommands.test.ts)) so the contract is proven; only the panel-button-to-sidecar path is left.
- **Suggested next step**: Extend `MemoryHub` with `delete(id: string): Promise<boolean>` (return `true` when the row existed). Add `memory.delete` to the sidecar protocol; route it to the live hub. In the desktop panel, swap the placeholder `onForget` consumer for an IPC call that confirms via the existing `ConfirmationGate` then dispatches `memory.delete(id)`. Cluster with 6.1.P2.P / 6.2.P2.Q so the schema migration and IPC additions land together.

- **Migrated from**: v1.1#DF-6-5-P2-R on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-217 - 6.6.P2.S -- DecaySweep `IdleTimeScheduler` binding deferred to sidecar wiring (DF, P2)

- **Source phase**: Phase 6 (6.6)
- **Plan reference**: [phase-06-memory-cli-decay-and-slash-commands.md](../../../archive/v1/v1.1/plans/phase-06-memory-cli-decay-and-slash-commands.md) sub-task 6.6 ("Register the sweep as an `IdleTimeScheduler` worker with a 24-hour cadence.").
- **Reason**: The sweep worker ([core/memory/DecaySweep.ts](../../../core/memory/DecaySweep.ts)) is feature-complete with the closed-form Ebbinghaus retention curve (`retentionAt(elapsed, halfLife) = exp(-elapsed / halfLife * ln(2))`), per-tier half-lives (24h / 7d / 30d / 365d), the `retention < 0.05 AND accessCount < 3` eviction rule, and full unit-test coverage including the "5% of the math" assertion against a 100-row synthetic corpus. The `nexus memory decay --now` CLI surface fires the sweep manually for debugging. The `IdleTimeScheduler.register({id: "memory.decay-sweep", idleThresholdMs: 5 * 60_000, cadenceMs: 24 * 60 * 60_000, run: () => sweep.sweep()})` call site in the sidecar is deferred for the same reason as 5.6.P2.O ("warm-rebuild" worker): the sidecar needs a `MemoryStore`-backed `DecayProvider` adapter (currently the worker only knows about an array of `DecayableEntry` rows) and the corresponding tombstone table.
- **Suggested next step**: In Phase 7 or 8 (alongside the schema migration that lands 6.1.P2.P + 6.2.P2.Q), add `MemoryStoreDecayProvider` (wraps `MemoryStore.listAll().map(rowToDecayableEntry)` and `MemoryStore.deleteById` for eviction) plus a `memory_tombstones` table (30-day retention). Register the worker at sidecar boot.

- **Migrated from**: v1.1#DF-6-6-P2-S on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-218 - 8.1.P2.T -- `fs.watch` on the ACTIVE pointer not yet wired into the sidecar daemon entry point (DF, P2)

- **Source phase**: Phase 8 (8.1)
- **Plan reference**: [phase-08-devai-hub-closures.md](../../../archive/v1/v1.1/plans/phase-08-devai-hub-closures.md) sub-task 8.1 ("In `desktop/sidecar/src/runtime/codingBootstrap.ts`, add `fs.watch(activeTagPointerPath(...), ...)` ... guarded with debounce (200 ms)").
- **Reason**: Phase 8 ships the watcher core in [core/skills/SkillsReloader.ts](../../../core/skills/SkillsReloader.ts) with 200 ms debounce, `onReload`/`onError` callbacks, and graceful behaviour when the pointer file does not yet exist. `bootstrapCoding()` accepts an optional `skillCatalog` and constructs the reloader when supplied. The remaining wiring is to (a) instantiate the actual `SkillCatalog`-backed adapter in the sidecar daemon entry point (currently still placeholder) and (b) pass it to `bootstrapCoding()`. That wiring blocks on the same `MV` adapter that the v1.0.0 `SkillCatalog` doc-comment references; the bootstrap surface is ready when the adapter lands. The "Sync now" UI feedback ("Loaded N new skills") plumbing reuses the `onReload(tag)` callback and is a one-line addition once the IPC channel is widened in Phase 10.
- **Suggested next step**: After the SkillCatalog-backed adapter lands (tracked in the v1.0.0 known-gaps under `MV`), pass `{skillCatalog: adapter}` to `bootstrapCoding()` from the sidecar entry point. No production code outside the entry point needs to change; the reloader is already constructed-and-started by `bootstrapCoding()` when the catalog is supplied. Add an end-to-end integration test that runs a real `nexus skills sync --apply` against a fixture upstream and asserts the running daemon's catalog log reports a reload within 500 ms (matches the plan's acceptance phrasing).

- **Migrated from**: v1.1#DF-8-1-P2-T on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-219 - 8.3.P2.U -- `nexus skills install --from <url>` integration test against a live HTTPS source deferred to Phase 15 (DF, P2)

- **Source phase**: Phase 8 (8.3)
- **Plan reference**: [phase-08-devai-hub-closures.md](../../../archive/v1/v1.1/plans/phase-08-devai-hub-closures.md) sub-task 8.3 ("Acceptance: end-to-end test installs a tiny fixture skill from a `file://` URL (allowlisted in test mode), confirms the scanner runs, confirms the file lands in the right place.").
- **Reason**: The unit tests in [tests/unit/core/skills/SkillInstaller.test.ts](../../../tests/unit/core/skills/SkillInstaller.test.ts) cover the full pipeline (parseSkillSpec -> allowlist -> fetch -> scanner -> path-clamped write) via the injectable `Fetcher` port + the `NEXUS_SKILLS_TEST_MODE=1` `file://` allow gate. The acceptance criterion (file:// fixture install) is satisfied at the unit level. The remaining work is a live HTTPS install against a real `bendourthe.com` or `raw.githubusercontent.com` URL exercised on the RTM smoke checklist. Phase 15 (RTM) is the natural home for the live-network smoke; the unit + injection scanner coverage is sufficient until then.
- **Suggested next step**: In Phase 15, add `tests/integration/skills-install-live.test.ts` (gated by an env-var so CI does not require network egress) that fetches a small SKILL.md from `raw.githubusercontent.com/bendourthe/...`, runs the scanner, and asserts the file lands in the expected user-skills directory.

- **Migrated from**: v1.1#DF-8-3-P2-U on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-220 - 8.4.P2.V -- `nexus.skills.preferUpstream` consumer wired in the slash-command autocomplete catalog but not in the daemon's slash dispatcher (DF, P2)

- **Source phase**: Phase 8 (8.4)
- **Plan reference**: [phase-08-devai-hub-closures.md](../../../archive/v1/v1.1/plans/phase-08-devai-hub-closures.md) sub-task 8.4 ("Modify the slash-command autocomplete in `modules/coding/chat/SlashCommandRouter.ts` ... to consult `SettingsStore.get('nexus.skills.preferUpstream')`.").
- **Reason**: Phase 8 ships `filterSlashCommandsWithSkills(input, skills, {preferUpstream})` in [desktop/src/modules/coding/slashCommands.ts](../../../desktop/src/modules/coding/slashCommands.ts) so the autocomplete UI surfaces the preferred variant first when the chat composer reads the setting. The daemon-side slash-command dispatcher (the path that actually resolves a chosen `/<name>` to a `SkillRecord` when both `user/<name>` and `devai-hub/<name>` exist) still uses the legacy `SkillLoader.getSkill(name)` lookup keyed by display name. The dispatcher path is not exercised today because the post-Phase-1.4 `modules/coding/chat/SlashCommandRouter.ts` layout the plan references is one of the 12 sub-tree migrations still tracked under 1.4.P1.B. When `src/chat/` moves to `modules/coding/chat/`, the dispatcher should read the same setting from the `SettingsStore` injected via `ChatCommandContext`. The user-visible behaviour (autocomplete ordering) ships in this phase; the under-the-hood resolution is unblocked once the chat sub-tree migrates.
- **Suggested next step**: After `src/chat/` -> `modules/coding/chat/` migrates (open under 1.4.P1.B), update the slash-command dispatcher to read `nexus.skills.preferUpstream` and resolve same-named candidates accordingly. Add a regression test pair (`preferUpstream=true` -> picks devai-hub variant; `=false` -> picks user variant) against a fixture catalog with both namespaces populated.

- **Migrated from**: v1.1#DF-8-4-P2-V on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-221 - 4.5.P2.L -- Sidecar producer for `MemorySnapshot.provenance` / `TraceEvent.hookKind` not yet wired (DF, P2)

- **Source phase**: Phase 4 (4.5)
- **Plan reference**: [phase-04-memory-provenance-and-hooks.md](../../../archive/v1/v1.1/plans/phase-04-memory-provenance-and-hooks.md) sub-task 4.5 acceptance ("provenance chips render correctly on a fresh session's memory entries; trace filter narrows correctly").
- **Reason**: Phase 4 added the consumer-side surface (Memory panel "Show provenance" toggle + chips; TraceDashboard `hookKind` filter dropdown) plus the protocol schema fields (`MemorySnapshot.provenance` optional map; `TraceEvent.hookKind` optional string). The sidecar producer at [desktop/sidecar/src/coding/panelData.ts](../../../desktop/sidecar/src/coding/panelData.ts) still ships placeholder snapshots and a placeholder trace stream; both omit the new fields, so against a fresh-from-defaults sidecar the chips do not appear and the dropdown is empty. The UI degrades gracefully (toggle still toggles; dropdown shows `(all)`), so the acceptance is met for the synthetic test fixtures the panels are exercised against.
- **Suggested next step**: Wire the `MemoryHub` -> `panelData.memorySnapshot()` pipeline to read `LifecycleProvenance` off each layer entry, and have the `TelemetryBus` -> `traceSubscribe()` pipeline copy `event.payload.kind` (when it starts with `lifecycle.`) onto `TraceEventT.hookKind`. Cluster with Phase 5's hybrid retrieval since `HybridRetriever` will be the natural producer of layer entries with full provenance.

- **Migrated from**: v1.1#DF-4-5-P2-L on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-222 - 9.1.P2.W -- `memory.contradiction-sweep` IdleTimeScheduler binding deferred to sidecar wiring (DF, P2)

- **Source phase**: Phase 9 (9.1)
- **Plan reference**: [phase-09-memory-consolidation-optin.md](../../../archive/v1/v1.1/plans/phase-09-memory-consolidation-optin.md) sub-task 9.1 ("Register `core/memory/ContradictionResolver.ts` as an `IdleTimeScheduler` worker `memory.contradiction-sweep` on a 1-hour cadence; only runs when `nexus.memory.consolidation.enabled=true`.").
- **Reason**: The resolver ([core/memory/ContradictionResolver.ts](../../../core/memory/ContradictionResolver.ts)) ships with the full sweep + adjudication pipeline and `createContradictionSweepTask(resolver)` returns the exact `{id: "memory.contradiction-sweep", idleThresholdMs: 5 * 60_000, cadenceMs: 60 * 60_000, run()}` shape `IdleTimeScheduler.register` expects. The sidecar wiring (instantiating `SemanticTierProvider` against the live `MemoryStore`, injecting the production `OllamaChatLike` against `OllamaClient`, registering the task with the desktop daemon's `IdleTimeScheduler` instance) clusters with the same `MemoryStore`-backed adapter cluster that holds `memory.warm-rebuild` (5.6.P2.O) and `memory.decay-sweep` (6.6.P2.S) -- the four-worker family shares a single boot path. Internal `sweep()` is exercised end-to-end by [tests/integration/memory-consolidation-optin.test.ts](../../../tests/integration/memory-consolidation-optin.test.ts); the toggle-off short-circuit path is asserted there and in the unit suite.
- **Suggested next step**: Cluster with 5.6.P2.O / 6.6.P2.S. Once `MemoryStoreSemanticTierProvider` lands (a thin adapter that wraps `MemoryStore.semanticRows()` + a `markSuperseded(id, supersederId, log)` method backed by a new `superseded_by TEXT NULL` column + a `memory_resolution_log` JSON column), instantiate one `ContradictionResolver` per sidecar with the live `OllamaClient`, register the task, and have the Memory tab settings UI surface the `nexus.memory.consolidation.enabled` toggle.

- **Migrated from**: v1.1#DF-9-1-P2-W on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-223 - 9.2.P2.X -- `/memory-compress` sidecar dispatch + Memory panel surface deferred (DF, P2)

- **Source phase**: Phase 9 (9.2)
- **Plan reference**: [phase-09-memory-consolidation-optin.md](../../../archive/v1/v1.1/plans/phase-09-memory-consolidation-optin.md) sub-task 9.2 ("Add `/memory-compress <path>` slash command that wraps the same code.").
- **Reason**: Phase 9 ships `handleMemoryCompress(input, ctx)` ([core/memory/MemorySlashCommands.ts](../../../core/memory/MemorySlashCommands.ts)) and the `memory-compress` autocomplete catalog entry ([desktop/src/modules/coding/slashCommands.ts](../../../desktop/src/modules/coding/slashCommands.ts)). Direct unit coverage exercises the contract (missing path, missing compressor, gate-off, happy-path). The daemon-side slash dispatcher path that resolves a chosen `/memory-compress` to the `handleMemoryCompress` body uses the same `ChatCommandContext` plumbing that 8.4.P2.V references; the legacy `src/chat/SlashCommandRouter.ts` only knows about the v1.0.0 catalog, so wiring the new handler at the daemon clusters with the `src/chat/` -> `modules/coding/chat/` sub-tree migration tracked under 1.4.P1.B.
- **Suggested next step**: After `src/chat/` migrates (under 1.4.P1.B), have the dispatcher import `handleMemoryCompress` from `core/memory/MemorySlashCommands.ts` and add a `compressor: FileCompressor | null` field to the chat context built at sidecar boot. The compressor is constructed once per sidecar with the live `LocalEmbedder` + `SemanticWriter` + `OllamaClient`; the toggle reads from `SettingsStore` on every command invocation so the user can flip it without restarting.

- **Migrated from**: v1.1#DF-9-2-P2-X on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-224 - 10.1.P1.Z -- Proxy-branch daemon IPC client deferred (DF, P1)

- **Source phase**: Phase 10 (10.1)
- **Plan reference**: [phase-10-vscode-thin-adapter-and-republish.md](../../../archive/v1/v1.1/plans/phase-10-vscode-thin-adapter-and-republish.md) sub-task 10.1 prompt ("every command handler, every panel (`NexusCodingPanel`, `MemoryPanel`, `TraceDashboardPanel`) is a thin webview shell that forwards `postMessage` calls into the IPC client").
- **Reason**: Phase 10 lands the activation-shape rewrite: `extension.ts` shrinks from 478 lines to 64; `activateProxy` and `activateExtensionOnly` are separated; `discoverDesktopDaemon()` drives the dispatch. The proxy branch today registers all six `nexus.coding.<cmd>` IDs and surfaces an "open the desktop app" hint per invocation. The actual sidecar IPC client (named pipe on Windows, Unix domain socket on macOS / Linux, `tauri::Channel` bridge for streaming) is the upstream Phase 2 deliverable; per the v1.1.0 cycle plan the IPC widening is tracked separately (see Phase 2 known-gap cluster 3.P1.N / 3.P1.Q / 3.P2.U / 4.P1.W / etc. carried forward from v1.0.0). When that client lands, the proxy branch's six handlers swap their information-message body for an IPC `client.send(commandId, ...args)` call; the activation surface (status bar item, command IDs, compat shim, output channel) is already correct.
- **Suggested next step**: Cluster with the Phase 2 IPC widening commit; ship a `src/desktop/ipcClient.ts` (named pipe / domain socket round-trip), wire it into the six proxy handlers, replace the desktop-app hint surface with daemon-streamed responses, and add an integration test that round-trips `nexus.coding.ping` through a stub daemon.

- **Migrated from**: v1.1#DF-10-1-P1-Z on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-225 - 10.1.P2.AA -- Thin-adapter webview shells for `NexusCodingPanel` / `MemoryPanel` / `TraceDashboardPanel` deferred (DF, P2)

- **Source phase**: Phase 10 (10.1)
- **Plan reference**: [phase-10-vscode-thin-adapter-and-republish.md](../../../archive/v1/v1.1/plans/phase-10-vscode-thin-adapter-and-republish.md) sub-task 10.1 ("every panel ... is a thin webview shell that forwards `postMessage` calls into the IPC client").
- **Reason**: The three panels currently live under `src/panels/` and own their own composition graph (memory hub, tracer, conversation manager); turning them into thin webview shells requires the daemon IPC client (10.1.P1.Z) to be present so the shells have something to forward to. Today the proxy branch registers no webview view providers at all (verified by the proxy unit test); the extension-only branch keeps the full panels intact. The activation surface is correct; only the daemon-backed panel rewrites remain.
- **Suggested next step**: After 10.1.P1.Z lands, extract three thin `src/panels/proxy/<PanelName>Proxy.ts` shells that host the same HTML / CSS payloads as today but route every `postMessage` through the IPC client. Wire them into `activateProxy(...)` behind the same view IDs (`nexus.coding.chatView`, `nexus.coding.memoryPanel`, `nexus.coding.traceDashboard`).

- **Migrated from**: v1.1#DF-10-1-P2-AA on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-226 - 10.3.P2.BB -- Marketplace publish + legacy listing transition note are operator actions (DF, P2)

- **Source phase**: Phase 10 (10.3)
- **Plan reference**: [phase-10-vscode-thin-adapter-and-republish.md](../../../archive/v1/v1.1/plans/phase-10-vscode-thin-adapter-and-republish.md) sub-task 10.3 acceptance ("both listings are visible; clicking through 'Get' on the new listing installs the rebranded extension; existing `gemma-code` users see the transition note").
- **Reason**: Publishing a VSIX to the Marketplace requires the publisher PAT, which is operator-procured and must not be committed. The code-level rename (manifest IDs, npm package name, publisher, command IDs, view-container ID, settings keys) landed in Phase 1.6 (commit `de219a5`); the build artefact is reproducible via `npm run package`; the operator-action steps are documented at [docs/versions/v1/v1.1.0/marketplace-transition.md](../../../archive/v1/v1.1/marketplace-transition.md). The legacy `gemma-code` listing's transition note edit also requires the legacy publisher's PAT.
- **Suggested next step**: Operator runs the OA-V1.1.0-10A + OA-V1.1.0-10B checklist from [marketplace-transition.md](../../../archive/v1/v1.1/marketplace-transition.md) prior to Phase 15 RTM. Surfaces in Phase 15's operator-actions consolidation.

- **Migrated from**: v1.1#DF-10-3-P2-BB on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-227 - 11.1.P2.CC -- Phase 11 proxy panels render the placeholder shell pending the daemon IPC client (DF, P2)

- **Source phase**: Phase 11 (11.1 - 11.7)
- **Plan reference**: [phase-11-nexus-vscode-extension.md](../../../archive/v1/v1.1/plans/phase-11-nexus-vscode-extension.md) sub-tasks 11.1 - 11.7 (multi-model picker, plan mode, auto mode, memory panel, slash autocomplete, sub-agent + sessions, MCP).
- **Reason**: Phase 11 lands the seven Nexus-VS-Code-extension surfaces as pure projectors / reducers under [core/coding/](../../../core/coding) (`ModelDropdown.ts`, `PlanArtifact.ts`, `AutoModeStream.ts`, `MemorySnapshotView.ts`, `SlashAutocomplete.ts`, `SessionList.ts`, `McpBridge.ts`), each with structural ports and a full unit test (100 new tests; 11 new test files; full suite still 3387 passing). The extension's proxy branch ([src/activation/proxy.ts](../../../src/activation/proxy.ts)) registers the three Phase 11 view providers (`nexus.coding.chatView`, `nexus.coding.memoryPanel`, `nexus.coding.traceDashboard`) but each currently mounts a placeholder HTML shell that points the user at the desktop app. The live webview bundle (real `<select>` populated from `ipc.call("models.list", ...)`; live tool-call cards driven by the daemon's `coding.session.event` channel; interactive memory rows with the `Forget` button wired to `memory.delete`) requires the cross-process IPC transport tracked under 10.1.P1.Z to be present so the shells have something to forward to. The daemon-side handlers (`buildMcpListHandler`, `buildMcpInvokeHandler`, `buildSettingsGetHandler`, `buildSettingsSetHandler`, `autocompleteSlashCommands`) are all wired into [desktop/sidecar/src/protocol.ts](../../../desktop/sidecar/src/protocol.ts) (`coding.chat.autocomplete`, `mcp.list`, `mcp.invoke`, `settings.get`, `settings.set` added to `IPC_METHODS` + `METHOD_SCHEMAS` with `implemented: true`), so when 10.1.P1.Z lands the shell -> live-bundle swap is a one-file change per panel.
- **Suggested next step**: After 10.1.P1.Z lands the socket / named-pipe `IpcClient` implementation, replace `ProxyPlaceholderViewProvider` in [src/activation/proxy.ts](../../../src/activation/proxy.ts) with three real `WebviewViewProvider` classes that load the shared webview bundles from [desktop/src/modules/coding/panels/](../../../desktop/src/modules/coding/panels), wire each panel's `postMessage` calls into `ipcClient.call(...)` / `ipcClient.subscribe(...)`, and remove this known-gap entry. The pure projectors / reducers under [core/coding/](../../../core/coding) need no changes -- the parity tests in [tests/integration/extension-desktop-parity.test.ts](../../../tests/integration/extension-desktop-parity.test.ts) already guarantee the bundles will produce identical state on both surfaces.

- **Migrated from**: v1.1#DF-11-1-P2-CC on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-228 - 11.8.P2.DD -- SQLite-backed `SettingsStore` adapter deferred (DF, P2)

- **Source phase**: Phase 11 (11.8)
- **Plan reference**: [phase-11-nexus-vscode-extension.md](../../../archive/v1/v1.1/plans/phase-11-nexus-vscode-extension.md) sub-task 11.8 ("The desktop app's `SettingsPage` writes go through the same IPC ... both write to the same SQLite-backed store").
- **Reason**: Phase 11 ships [core/coding/SettingsBridge.ts](../../../core/coding/SettingsBridge.ts) with the `SettingsStorePort` interface, the `buildSettingsGetHandler` / `buildSettingsSetHandler` daemon-side IPC handlers, the `InMemorySettingsStore` (production-fallback + test surface), and the `reconcileSecondaryMirror` worker that resolves drift between VS Code's own `nexus.coding.*` settings and the daemon store. Full unit-test coverage (12 cases including the no-op-on-equal / conflict-on-disagree / nexus-prefix-only assertions). The remaining work is the SQLite-backed `SqliteSettingsStore implements SettingsStorePort` adapter the production sidecar instantiates against `~/.nexus/settings.sqlite`; that clusters with the same `MemoryStore` adapter cluster that holds 5.6.P2.O / 6.6.P2.S / 9.1.P2.W (one bootstrap site, one schema migration).
- **Suggested next step**: In Phase 12 or 13 (when the sidecar's persistence boundary opens for the diffusion-tier overrides UI), add `SqliteSettingsStore` against a new `app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at INTEGER NOT NULL)` table; store JSON-encoded values; have the sidecar bootstrap swap the in-memory store for the SQLite one and pass it to `buildSettingsGetHandler` / `buildSettingsSetHandler`. The structural port and reconciliation worker do not change.

- **Migrated from**: v1.1#DF-11-8-P2-DD on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-229 - 12.2.P1.FF -- SANA `_execute(ctx)` real-diffusers callback deferred to operator action OA-09 (DF, P1)

- **Source phase**: Phase 12 (12.2 - 12.5)
- **Plan reference**: [phase-12-image-studio-sana.md](../../../archive/v1/v1.1/plans/phase-12-image-studio-sana.md) sub-tasks 12.2 (`sana.py`), 12.3 (`sana_sprint.py`), 12.4 (`sana_int4.py`), 12.5 (`sana_video.py`); operator action OA-09 in [operator-actions.md](../../../archive/v1/v1.1/operator-actions.md).
- **Reason**: Each SANA pipeline module registers handlers backed by the deterministic stub executor from [runtimes/diffusion/pipelines/base.py](../../../runtimes/diffusion/pipelines/base.py) (and `video_base.stub_execute` for the video tier). Wiring a real diffusers-backed `_execute(ctx)` that instantiates `SanaPipeline` / `SanaSprintPipeline` / `SanaVideo` + the linked DC-AE VAE requires a CUDA host with the SANA-augmented PyTorch / diffusers / nunchaku stack -- not present in CI. The IPC round-trip + workflow embed shape are exercised end-to-end by [tests/python/diffusion/test_pipelines_sana.py](../../../tests/python/diffusion/test_pipelines_sana.py) (17 cases including the ControlNet round-trip + Flow-DPM-Solver payload), so the surrounding plumbing is verifiable without a GPU.
- **Suggested next step**: Operator action OA-09 in [operator-actions.md](../../../archive/v1/v1.1/operator-actions.md) captures the real-host timings + the diffusers-backed executor swap on the RTX 4070 baseline rig. Commit per-pipeline fixture clips under `tests/golden/v1.1.0/{image,video}/sana/` once the executor lands.

- **Migrated from**: v1.1#DF-12-2-P1-FF on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-230 - 12.4.P2.GG -- nunchaku license + wheel verification on real host (DF, P2)

- **Source phase**: Phase 12 (12.4)
- **Plan reference**: [phase-12-image-studio-sana.md](../../../archive/v1/v1.1/plans/phase-12-image-studio-sana.md) sub-task 12.4 ("Verify the SVDQuant quantization library license (`nunchaku` or equivalent) is Apache-2.0 or MIT. If not, drop S4 from v1.1.0 and update the cycle plan + known-gaps. If yes, add `nunchaku` to [runtimes/diffusion/requirements.txt]...").
- **Reason**: nunchaku is published under Apache-2.0 by MIT HAN Lab (per the upstream repo `https://github.com/mit-han-lab/nunchaku`), so S4 stays in v1.1.0. The dep is added to [runtimes/diffusion/requirements.txt](../../../runtimes/diffusion/requirements.txt) and the installer's wheel-prefix manifest at [scripts/installer/pyqt/src/nexus_installer/engine/diffusion_venv_provisioner.py](../../../scripts/installer/pyqt/src/nexus_installer/engine/diffusion_venv_provisioner.py). The wheel build itself is part of the CI installer-build job (Phase 14) and not part of this commit; on the RTX 3060 8 GB rig the operator must confirm the offline `pip install --no-index` resolves the bundled wheel and that `nunchaku.import` does not crash on first use.
- **Suggested next step**: After Phase 14's CI installer-build job fetches the `nunchaku` wheel into `payload/python/wheels/`, run `nexus-installer` end-to-end on the diffusion-low (8 GB) rig, then capture the SANA-1.5 INT4 1024x1024 timing under OA-09. If the wheel build fails (e.g., custom CUDA kernels not pre-built for the target ABI), drop S4 from v1.1.0 and surface a known-gap that defers it to v1.1.1.

- **Migrated from**: v1.1#DF-12-4-P2-GG on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-231 - 12.7.P2.HH -- Diffusion tier-aware Image Studio orchestrator wiring deferred (DF, P2)

- **Source phase**: Phase 12 (12.7)
- **Plan reference**: [phase-12-image-studio-sana.md](../../../archive/v1/v1.1/plans/phase-12-image-studio-sana.md) sub-task 12.7 acceptance ("form renders correctly on each tier; selecting Fast Preview swaps the model; selecting 4K on a `diffusion-low` host shows a tooltip 'Requires diffusion-high tier'").
- **Reason**: [desktop/src/modules/image/ImagePromptForm.tsx](../../../desktop/src/modules/image/ImagePromptForm.tsx) accepts a `diffusionTier` prop (Phase 12 commit, this commit) and gates 2K / 4K resolutions + surfaces the tier-required hint when the form's resolution exceeds the host's tier. [desktop/src/modules/image/ImageStudioPage.tsx](../../../desktop/src/modules/image/ImageStudioPage.tsx) accepts the same prop and forwards it. Wiring the upstream resolved-tier source (Phase 3's `resolveDiffusionTier` reading `nexus.diffusion.tierOverride` + auto-detected VRAM) into the page-level prop happens at the App / Routes layer; that layer's tier subscription is the deliverable Phase 3 closed (closure rows below). The remaining work is the one-call subscription wire-up at the `<ImageStudioPage>` mount site; today the page defaults to `diffusion-low` so the gating still functions (the tier is the conservative default until the wire-up lands).
- **Suggested next step**: At the App.tsx / Routes layer that hosts `<ImageStudioPage>`, read `useDiffusionTier()` (a small wrapper around `resolveDiffusionTier` + the SettingsStore subscription) and pass the resolved id into `<ImageStudioPage diffusionTier={...}>`. Add a routing-level test that asserts the prop reaches the form. The form-level tests already cover the gating behaviour, so this is a pure plumbing change.

- **Migrated from**: v1.1#DF-12-7-P2-HH on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### MT-50 - 11.9.P2.EE -- VS Code-shaped end-to-end parity snapshot deferred (MT, P2)

- **Source phase**: Phase 11 (11.9)
- **Plan reference**: [phase-11-nexus-vscode-extension.md](../../../archive/v1/v1.1/plans/phase-11-nexus-vscode-extension.md) sub-task 11.9 ("Add `tests/integration/extension-desktop-parity.test.ts` that drives both surfaces against a recorded session and asserts byte-equal DOM snapshots for Plan Mode artifacts and Auto Mode tool-call cards").
- **Reason**: Phase 11 ships [tests/integration/extension-desktop-parity.test.ts](../../../tests/integration/extension-desktop-parity.test.ts) with four cases that assert byte-equal output between the two surfaces at the *projector* level (Plan-Mode `buildPlanArtifact` fingerprints + rendered text; Auto-Mode `applyAutoModeEvents` folded state via `summarizeAutoModeTurn`). The deeper DOM-level snapshot (rendering each panel through the shared `desktop/src/modules/coding/panels/*` React bundles + the extension's webview HTML host, then diffing the resulting DOM trees) requires a jsdom + Tailwind v4 + webview-postMessage harness that does not yet exist in this repo and is more naturally built alongside the Tailwind v4 wiring tracked under 1.11.P1.G. The projector-parity coverage is sufficient to detect every divergence that would produce a user-visible difference, because the panel React components are pure functions of the projector output.
- **Suggested next step**: Cluster with 1.11.P1.G (Tailwind v4 wiring) in Phase 12 or 13: once the webview build pipeline emits a unified bundle for both desktop and extension, add a jsdom-backed harness that mounts each bundle, drives the projector inputs, and diffs `Element.outerHTML`. Keep the existing projector-parity tests as the fast first line of defence.

- **Migrated from**: v1.1#MT-11-9-P2-EE on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### NI-13 - 13.2.P3.II -- SANA-Video test lives under `tests/python/diffusion/`, not `runtimes/diffusion/tests/` (NI, P3)

- **Source phase**: Phase 13 (13.2)
- **Plan reference**: [phase-13-video-lab-sana-video.md](../../../archive/v1/v1.1/plans/phase-13-video-lab-sana-video.md) sub-task 13.2 prompt ("Add [runtimes/diffusion/tests/test_sana_video.py] ...").
- **Reason**: The project's Python test layout already centralizes every diffusion-runtime test under [tests/python/diffusion/](../../../tests/python/diffusion) (the sibling files `test_video_base.py`, `test_pipelines_sana.py`, `test_video_pipeline_registration.py`, etc. all live here and are discovered by the root pytest configuration). Creating `runtimes/diffusion/tests/test_sana_video.py` would either fork the runtime into a co-located test directory (a layout decision that affects every other pipeline test) or be invisible to the existing pytest discovery. The deviation keeps the new test alongside its peers; the acceptance criterion ("mirror the structure of `test_video_base.py`") is satisfied at the test-shape level rather than at the directory level.
- **Suggested next step**: Either confirm `tests/python/diffusion/` as the canonical home and update the Phase 13 plan reference (no code change) or migrate every Python diffusion test from `tests/python/diffusion/` into `runtimes/diffusion/tests/` as a single cluster, then re-point the root pytest config. The latter is out of scope for Phase 13.

- **Migrated from**: v1.1#NI-13-2-P3-II on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-232 - 13.1.P2.JJ -- VideoLabPage `DEFAULT_VIDEO_MODELS` is still a static array; live registry wiring deferred (DF, P2)

- **Source phase**: Phase 13 (13.1)
- **Plan reference**: [phase-13-video-lab-sana-video.md](../../../archive/v1/v1.1/plans/phase-13-video-lab-sana-video.md) sub-task 13.1 ("Acceptance: ... submit dispatches to `sana_video.py`.").
- **Reason**: The Phase 13 commit adds the `sana-video-2b-720p` text2video entry to [desktop/src/modules/video/VideoLabPage.tsx](../../../desktop/src/modules/video/VideoLabPage.tsx)'s `DEFAULT_VIDEO_MODELS` array so the new Fast 720p preset's chosen modelId resolves under the existing `modelsForMode` filter and the request reaches the dispatcher. The live wiring (`DEFAULT_VIDEO_MODELS` derived from `core/registry/ModelCatalog.listForType("video")` so the entry appears automatically when the catalog gains new SANA-Video variants) clusters with the same Phase 2 IPC widening that the Image Studio model dropdown awaits -- see open item 11.1.P2.CC and the cycle plan's 6.P2.JJ / 7.P2.PP carryforwards. The static array remains a forward-compatible surface because every entry is keyed by its canonical catalog id.
- **Suggested next step**: When the Phase 2 IPC widening lands (10.1.P1.Z), replace the static `DEFAULT_VIDEO_MODELS` array with a `useEffect` that calls `videoClient.listModels()` and maps each result through the existing `{id, displayName, mode}` shape. The Fast 720p preset still binds to `sana-video-2b-720p` -- the wire-up just removes the duplication.

- **Migrated from**: v1.1#DF-13-1-P2-JJ on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### NI-14 - 9.2.P2.Y -- File compressor embeds the aggregated observation, not each chunk (NI, P2)

- **Source phase**: Phase 9 (9.2)
- **Plan reference**: [phase-09-memory-consolidation-optin.md](../../../archive/v1/v1.1/plans/phase-09-memory-consolidation-optin.md) sub-task 9.2 prompt ("chunk to ~2,000-token chunks, embed each, run a local Ollama prompt that extracts {summary, key_facts[], code_patterns[]}").
- **Reason**: The implementation embeds the rendered aggregated observation (summary + key facts + code patterns) exactly once via the injected `Embedder`, rather than embedding every shard individually. The acceptance criterion ("a single semantic-tier row appears with the expected provenance") is satisfied with a single vector because the observation row carries one `content` field; per-shard vectors would be unused by `DenseIndex` (which keys on the row id, not the shard index) until the SQLite schema gains a child `memory_compress_shards` table. The deviation halves embedder cost on long files at the price of slightly noisier semantic search over shards individually.
- **Suggested next step**: When the persistence path lands (clustered with 9.1.P2.W's adapter work), add a `memory_compress_shards` child table keyed by `(observation_id, shard_index)` with per-shard `summary` + `vector` columns. Wire `DenseIndex` to read shard rows too, then enable per-shard embedding inside `FileCompressor`. Keep the aggregated row as the user-facing surface; shards stay an implementation detail of the dense index.

- **Migrated from**: v1.1#NI-9-2-P2-Y on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-233 - 15.1.P1.KK -- Live `/run-deep-review` chain not executed on this host (DF, P1)

- **Source phase**: Phase 15 (15.1)
- **Plan reference**: [phase-15-hardening-and-release.md](../../../archive/v1/v1.1/plans/phase-15-hardening-and-release.md) sub-task 15.1 ("Invoke `/run-deep-review` (or the manual equivalent: `analyze-codebase`, `review-codebase`, `run-security-audit`, `run-penetration-test --depth=deep`). Output under [docs/versions/v1/v1.1.0/review/](../../../archive/v1/v1.1/review) ...").
- **Reason**: The Phase 15.9 finalization session ran on a static-review host without the full DevAI-Hub skill harness wiring + the network egress + the headed display needed to drive the live `/run-deep-review`, `/run-security-audit`, and `/run-penetration-test --depth=deep` skills. The static portion lands in `docs/versions/v1/v1.1.0/review/synthesis.md` Section 8 (cross-phase synthesis from the running known-gaps + history files); the live chain is carried forward to an operator session as OA-V1.1.0-15-DR-A / DR-B / DR-C in [operator-actions.md](../../../archive/v1/v1.1/operator-actions.md). Until those four IDs close, the v1.1.0 tag stays unpushed.
- **Suggested next step**: Operator runs OA-V1.1.0-15-DR-A through DR-D from [operator-actions.md](../../../archive/v1/v1.1/operator-actions.md). Output overlays `docs/versions/v1/v1.1.0/review/synthesis.md`; any new P0 / P1 finding bumps the release gate to "RE-REVIEW BEFORE TAG PUSH".

- **Migrated from**: v1.1#DF-15-1-P1-KK on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-234 - 15.8.P1.LL -- `npx semantic-release --dry-run` not executed on this host (DF, P1)

- **Source phase**: Phase 15 (15.8)
- **Plan reference**: [phase-15-hardening-and-release.md](../../../archive/v1/v1.1/plans/phase-15-hardening-and-release.md) sub-task 15.8 ("Run `npx semantic-release --dry-run` against the v1.1.0 tag. Verify it appends a new entry above the v1.0.0 block in `CHANGELOG.md` without overwriting it.").
- **Reason**: The static-review host has not run `npm ci` in this session, so the `@semantic-release/*` plugin chain (`commit-analyzer`, `release-notes-generator`, `@semantic-release/changelog`, `@semantic-release/npm`, `@semantic-release/git`, `@semantic-release/github`) is not on the dependency path. The Phase 15.7 CHANGELOG entry is hand-authored as the canonical v1.1.0 release-notes content; the dry-run verification is captured under OA-V1.1.0-15F in [operator-actions.md](../../../archive/v1/v1.1/operator-actions.md).
- **Suggested next step**: Operator runs OA-V1.1.0-15F. If the dry-run diverges from the hand-authored entry, add a `@semantic-release/changelog` `changelogTitle` override.

- **Migrated from**: v1.1#DF-15-8-P1-LL on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### MT-51 - 15.11.P2.MM -- Final lint / build / test gate not run end-to-end on this host (MT, P2)

- **Source phase**: Phase 15 (15.11)
- **Plan reference**: [phase-15-hardening-and-release.md](../../../archive/v1/v1.1/plans/phase-15-hardening-and-release.md) sub-task 15.11 ("Re-run the four-step gate one final time on every OS leg.").
- **Reason**: The static-review host has not run `npm run build` / `npm test` / `cargo check` / `pytest` end-to-end during this finalization session because (a) Phases 1-14 each ran the gate in their own implementation sessions and shipped the cycle CI green at each landing, and (b) Phase 15.11 explicitly contemplates a fresh-VM invocation on each OS leg under OA-V1.1.0-15E. The phases-individual gates are documented in the per-phase session histories under `docs/versions/v1/v1.1.0/development/history/`. The cross-OS gate carries forward to OA-V1.1.0-15E (RTM smoke on Windows + macOS + Linux fresh VMs).
- **Suggested next step**: Operator runs OA-V1.1.0-15E. If any leg fails, surface a new known-gap entry referencing the failing test + the OS + the OA-V1.1.0-15E timestamp.

- **Migrated from**: v1.1#MT-15-11-P2-MM on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-235 - 15.2-5.P1.NN -- Phase 15 live operator-action set carried forward (DF, P1)

- **Source phase**: Phase 15 (15.2 + 15.3 + 15.4 + 15.5)
- **Plan reference**: [phase-15-hardening-and-release.md](../../../archive/v1/v1.1/plans/phase-15-hardening-and-release.md) sub-tasks 15.2 (EV signing / notarization / AppImage), 15.3 (SHA rotations + final brand icons), 15.4 (golden task replay + GPU bench + live DevAI-Hub sync), 15.5 (RTM smoke per OS).
- **Reason**: These four sub-tasks each require external infrastructure not available on the static-review host: EV Code Signing certificate + HSM (OA-01), Apple Developer ID certs + notarization workflow (OA-11), Ubuntu / Fedora fresh VMs for AppImage smoke (OA-12), the upstream `bendourthe/DevAI-Hub v1.1.0-baseline` tag (OA-06), the designer-authored final icon set (OA-07), the operator's GPU rig with the three resident Ollama models (~22 GB) for golden-task replay (OA-08) plus the four resident diffusion models (~17 GB) for the GPU bench (OA-09), the live network egress for `nexus skills sync` (OA-10), and three fresh OS VMs for the RTM smoke. Each maps to a stable carryforward ID in [operator-actions.md](../../../archive/v1/v1.1/operator-actions.md): OA-V1.1.0-15B (signing + notarization + AppImage), OA-V1.1.0-15C (SHA rotations + final brand icons), OA-V1.1.0-15D (golden task + GPU bench + live DevAI-Hub sync), OA-V1.1.0-15E (RTM smoke per OS).
- **Suggested next step**: Operator works through OA-V1.1.0-15B / C / D / E in any order. Each carries its own acceptance check + completion timestamp; once all four are signed off, the v1.1.0 tag pushes.

---

- **Migrated from**: v1.1#DF-15-2-5-P1-NN on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### WN-23 - 1.1.P2.A -- Nexus-Hub catalog index (data/skills.json + SKILL_INDEX.md) rebuild deferred (WN, P2)

- **Source phase**: Phase 1 (sub-tasks 1.1, 1.2)
- **Plan reference**: [adoption-ecosystem-2026-05.md](../../../archive/v1/v1.2/plans/adoption-ecosystem-2026-05.md) sub-tasks 1.1 ("Import Hallmark as a Nexus-Hub skill") and 1.2 ("HTML-output convention skill").
- **Reason**: This phase added `catalog/skills/developer-experience/hallmark-design/` and `catalog/skills/developer-experience/html-output-conventions/` (with 4 reference templates) to the sibling Nexus-Hub repo. Running `python infrastructure/tools/build_skills_catalog.py` (or `make build-catalog`) registers both new skills into `data/skills.json` (211 -> 213) and regenerates `data/SKILL_INDEX.md`. A full rebuild was attempted and produced a 2528-line diff because the committed catalog index had pre-existing drift (5 skills had been added and many descriptions edited in their `SKILL.md` files without a corresponding catalog rebuild; the committed `SKILL_INDEX.md` reported `Total: 206` while 211 actual SKILL.md files existed). To respect the "every changed line must trace to the user's request" scope rule and avoid bundling ~2500 lines of unrelated churn into a Phase 1 commit, the wholesale catalog regeneration was reverted; both new skills are committed as the two new directories only. The new skills pass `python scripts/validate_skills.py` cleanly and are picked up by the syncer's `buildManifest` walk (verified locally against `../Nexus-Hub/catalog/skills`).
- **Suggested next step**: A Nexus-Hub maintainer should run `make build-catalog` as a standalone hygiene commit on Nexus-Hub `main`, accepting the 7-skill index update (5 pre-existing + 2 new) plus the description reorderings. Once committed there, cut a Nexus-Hub release tag so the new skills can flow through `nexus skills sync` (see 1.1.P3.B below).

- **Migrated from**: v1.2#WN-1-1-P2-A on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-236 - 1.1.P3.B -- New Nexus-Hub skills require an upstream release to flow through `nexus skills sync` (DF, P3)

- **Source phase**: Phase 1 (sub-task 1.5 acceptance)
- **Plan reference**: [adoption-ecosystem-2026-05.md](../../../archive/v1/v1.2/plans/adoption-ecosystem-2026-05.md) sub-task 1.5 ("Verify: nexus skills sync succeeds and lists hallmark-design and html-output-conventions").
- **Reason**: The production `nexus skills sync` CLI in [bin/nexus.mjs](../../../bin/nexus.mjs) constructs `DevAIHubSyncer` with default options, which resolves the latest GitHub release of `bendourthe/DevAI-Hub` and sparse-clones that tag (see [core/skills/DevAIHubSyncer.ts](../../../core/skills/DevAIHubSyncer.ts) `defaultResolveLatestTag` -> `api.github.com/repos/.../releases/latest`). Newly-created local skills in `../Nexus-Hub` cannot appear via `sync` / `list` until they are pushed AND a release tag containing them is cut. In this environment the live sync exits with `upstream did not return tag_name` (no resolvable release for the configured upstream). The faithful local verification used in 1.5 is the syncer's own `buildManifest` over the local Nexus-Hub catalog, which enumerates 213 skills including both new entries -- that is the exact function `nexus skills list` renders from once an active tag is present.
- **Suggested next step**: After 1.1.P2.A above is committed in Nexus-Hub, push and cut a Nexus-Hub release tag (e.g. `v0.X.0`); then in this repo run `node bin/nexus.mjs skills sync --apply` followed by `node bin/nexus.mjs skills list` and confirm `hallmark-design` + `html-output-conventions` appear. No code change is required in this repo.

- **Migrated from**: v1.2#DF-1-1-P3-B on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-237 - 1.3.P2.C -- Hooks-over-prompts migrations deferred to Phase 5 (DF, P2)

- **Source phase**: Phase 1 (sub-task 1.3)
- **Plan reference**: [adoption-ecosystem-2026-05.md](../../../archive/v1/v1.2/plans/adoption-ecosystem-2026-05.md) sub-task 1.3 ("Do not modify any code yet -- the actual hook migrations happen during Phase 5").
- **Reason**: Phase 1.3 added the "hooks for deterministic automation" Critical Rule to AGENTS.md and authored an inventory at [.claude/agents/hooks-over-prompts-inventory.md](../../../.claude/agents/hooks-over-prompts-inventory.md) ranking current prompt-based rules by enforcement-determinism gain. The inventory deliberately stops at "rank + recommend"; the actual hook implementations (commit-msg ASCII / no-attribution guards, per-invocation destructive-git guard, shell-description presence guard, pre-commit `deps:check` wiring) are explicitly deferred to Phase 5 of the adoption plan to keep Phase 1 scope to skill-native + policy items only.
- **Suggested next step**: Land the prioritized migrations in Phase 5 sub-tasks (5.1-5.5 of the adoption plan), starting with the HIGH-gain commit-msg hooks. The inventory file itself is the authoritative source for migration order.

- **Migrated from**: v1.2#DF-1-3-P2-C on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-238 - 2.4.P2.E -- Legacy `preToolHook` compressor is dead code in production (DF, P2)

- **Source phase**: Phase 2 (sub-task 2.4)
- **Plan reference**: [adoption-ecosystem-2026-05.md](../../../archive/v1/v1.2/plans/adoption-ecosystem-2026-05.md) sub-task 2.4 ("Modify the Coding-pillar Bash-tool handler ... to invoke `CommandCompressor.compress` ... between the subprocess return and the tool-call response").
- **Reason**: `src/tools/handlers/terminal.ts` no longer imports `compressToolOutput` from `src/tools/handlers/preToolHook.ts`; the new `core/observability/CommandCompressor` is the only production compression path. `preToolHook.ts` plus its 6-test unit suite (`tests/unit/tools/handlers/preToolHook.test.ts`) remain in the tree but are not exercised by any non-test caller. Per AGENTS.md "no adjacent-scope cleanup", the module was not removed in this phase to keep the diff traced to the user's request.
- **Suggested next step**: In a follow-up hygiene commit (or as part of the v1.2.0 Phase 7 stabilization sweep), delete `src/tools/handlers/preToolHook.ts` and its unit test, then re-run `npm run test`, `npm run lint`, and `npm run check-architecture`.

- **Migrated from**: v1.2#DF-2-4-P2-E on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-239 - 3.3.P2.G -- Tree-sitter scanner replaced with regex-based extractor (DF, P2)

- **Source phase**: Phase 3 (sub-task 3.3)
- **Plan reference**: [adoption-ecosystem-2026-05.md](../../../archive/v1/v1.2/plans/adoption-ecosystem-2026-05.md) sub-task 3.3 ("Implement `core/codegraph/scanner/TreeSitterScanner.ts` supporting TypeScript, Python, Rust, and Go ... parse with the appropriate Tree-sitter grammar").
- **Reason**: A Tree-sitter scanner requires four per-language native binding packages (`tree-sitter-typescript`, `tree-sitter-python`, `tree-sitter-rust`, `tree-sitter-go`) plus a node-gyp toolchain on every developer machine; none of those packages were already installed in this repo, so adopting them would have added a non-trivial native build burden. The shipped scanner (`core/codegraph/scanner/RepoScanner.ts`) is regex-based with per-language matchers (functions, classes, methods, structs, traits, enums, type-interfaces, plus best-effort call-edge extraction). Acceptance criteria for Phase 3 (4 language fixtures pass, 30s-of-tool-calls stability gate met) are all satisfied with the regex implementation -- the benchmark records the actual codegraph path as 2 tool calls vs. 8 for the grep-shaped baseline (25% of the count, well under the 30% gate). The regex extractor misses some edge cases that a Tree-sitter parse would catch (e.g. multi-line function declarations whose `(` is on the next line; methods declared via assignment to a property; computed method names); these are documented in the scanner's source comments. Two-pass extraction (symbols first, edges second) is implemented so cross-file edges resolve correctly regardless of directory walk order.
- **Suggested next step**: When a future cycle has the budget for the additional native deps, swap `RepoScanner` for a true Tree-sitter scanner behind the same `core/codegraph/scanner/index.ts` re-export so consumers do not need to change. The existing `extractSymbols(source, language)` surface is the abstraction boundary.

- **Migrated from**: v1.2#DF-3-3-P2-G on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-240 - 3.4.P3.H -- Codegraph MCP server is in-process only; no stdio/socket transport (DF, P3)

- **Source phase**: Phase 3 (sub-task 3.4)
- **Plan reference**: [adoption-ecosystem-2026-05.md](../../../archive/v1/v1.2/plans/adoption-ecosystem-2026-05.md) sub-task 3.4 ("The server runs in-process with the Node sidecar; it must not bind a network port").
- **Reason**: `CodeGraphMcpServer` implements the `McpHarnessAdapter` interface from `core/coding/McpBridge.ts` and is registered via the existing in-process harness path; it is intentionally NOT exposed via stdio or any socket, per the plan's acceptance criteria. An external MCP client (e.g. a separate IDE session) cannot reach it. This is by design and matches the privacy-by-construction stance. The DF entry exists for future cycles that may want to expose the codegraph tools to a sibling Nexus instance.
- **Suggested next step**: If a future cycle needs cross-instance access (e.g. a desktop shell and a CLI both querying the same graph), expose `CodeGraphMcpServer` via `src/mcp/McpServer.ts` style stdio with a read-only-by-default allowlist mirroring `DEFAULT_MCP_EXPOSED_TOOLS`. Do not add a network listener.

- **Migrated from**: v1.2#DF-3-4-P3-H on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-241 - 3.5.P3.I -- 15-tool cap may trim codegraph tools first when the catalog is large (DF, P3)

- **Source phase**: Phase 3 (sub-task 3.5)
- **Plan reference**: Internal -- introduced by Phase 3.5's wiring decision.
- **Reason**: `src/tools/ToolActivationRules.ts` now treats the 9 `codegraph_*` tools as trimmable when the total enabled-tool count exceeds 15 (sub-agent or large-MCP scenarios). MCP tools are trimmed first, then codegraph tools, then core tools are preserved untouched. This is a sensible default but means an agent loop with a busy external MCP server may lose access to codegraph tools without an obvious diagnostic. Users will see the catalog drop, but the activation `reasons` map includes a per-tool entry explaining the trim.
- **Suggested next step**: When Phase 5 (agent-loop policy) lands, add a one-line warning to the system prompt header when any codegraph tool was trimmed under the 15-tool cap so the user can react.

- **Migrated from**: v1.2#DF-3-5-P3-I on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-242 - 4.1.P2.J -- AST chunker reuses Phase 3's regex extractor (DF, P2)

- **Source phase**: Phase 4 (sub-task 4.1)
- **Plan reference**: [adoption-ecosystem-2026-05.md](../../../archive/v1/v1.2/plans/adoption-ecosystem-2026-05.md) sub-task 4.1 ("Implement `core/memory/chunkers/AstChunker.ts` that takes a file path + content and returns an array of `Chunk` records, each aligned to a Tree-sitter top-level node").
- **Reason**: Phase 4.1 ships `core/memory/chunkers/AstChunker.ts` per the plan's surface (one chunk per top-level symbol for TS / Python / Rust / Go; size-based fallback for other languages). The "AST-awareness" reuses `extractSymbols()` from `core/codegraph/scanner/RepoScanner.ts` -- the Phase 3 regex-based extractor -- rather than Tree-sitter, because no Tree-sitter native bindings are available in this repo. This inherits Phase 3.3's exact tradeoff: symbol boundaries are correct in the common cases the regex extractor handles, and the same edge cases (multi-line declarations, property-method assignments, computed names) cause occasional under-chunking. Class chunks envelop their methods (instead of producing per-method nested chunks) to avoid line-range duplication.
- **Suggested next step**: When 3.3.P2.G (the Tree-sitter scanner swap) lands in a future cycle, `AstChunker` automatically inherits the upgrade because it consumes `extractSymbols` -- no change required at the chunker layer.

- **Migrated from**: v1.2#DF-4-1-P2-J on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-243 - 4.2.P3.K -- PrunedDenseIndex graph build is O(N^2); ~50k node practical ceiling (DF, P3)

- **Source phase**: Phase 4 (sub-task 4.2)
- **Plan reference**: [adoption-ecosystem-2026-05.md](../../../archive/v1/v1.2/plans/adoption-ecosystem-2026-05.md) sub-task 4.2 ("API: same as `DenseIndex` ... storage representation is HNSW graph in CSR format with high-degree-preserving pruning ... on `search(query, k)`, embed the query, then traverse the HNSW graph, computing embeddings on-demand for visited nodes").
- **Reason**: `core/memory/PrunedDenseIndex.ts` ships a single-layer kNN graph (with reverse-edge symmetrization for connectivity), not multi-layer HNSW. The graph build at `compact()` is an all-pairs `O(N^2)` scan; on the 100k-chunk benchmark this would take minutes. The Phase 4.4 stability gate uses a 2k-chunk CI fixture (1/50th scale) so the integration test completes in ~2s; the 100k sweep is documented as a manual run (see MT entry 4.4.P2.L below). Search is best-first graph traversal with seed-sampling, frontier-by-score, and an LRU embedding cache (default 512 entries) -- close to HNSW's query routine but without the hierarchical fanout. Storage savings hit the headline gate (18.68% of `DenseIndex` on the 2k benchmark).
- **Suggested next step**: When a future cycle has the budget, port the graph build to a true multi-layer HNSW (e.g. via `hnswlib-node` already mentioned in the v1.1.0 DenseIndex header) so the index scales past ~50k nodes without quadratic compact time. The save/load file format already includes a `version` field for forward-compat.

- **Migrated from**: v1.2#DF-4-2-P3-K on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-244 - 4.3.P3.M -- Migration script ships as `.mjs` instead of `.ts` (DF, P3)

- **Source phase**: Phase 4 (sub-task 4.3)
- **Plan reference**: [adoption-ecosystem-2026-05.md](../../../archive/v1/v1.2/plans/adoption-ecosystem-2026-05.md) sub-task 4.3 ("Write a one-way migration script at `scripts/migrate-dense-index-to-pruned.ts`").
- **Reason**: The Nexus repo's `scripts/` convention is `.mjs` files that import from compiled `out/` -- `tsconfig.json` explicitly excludes `scripts/` from the `tsc` include set. A `.ts` script under `scripts/` would not be runnable without a separate compilation step. To keep the migration logic unit-testable while honoring the script convention, the migration function lives at `core/memory/migrateDenseToPruned.ts` (where the unit tests can import it) and `scripts/migrate-dense-index-to-pruned.mjs` is a thin CLI wrapper that imports the compiled JS.
- **Suggested next step**: If a future cycle migrates `scripts/` to TypeScript (e.g. via a dedicated `tsconfig.scripts.json`), rename the wrapper to `.ts` to match the plan's literal filename. The underlying function module stays unchanged.

- **Migrated from**: v1.2#DF-4-3-P3-M on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### MT-52 - 4.4.P2.L -- 100k-chunk memory-tier benchmark is manual, not CI (MT, P2)

- **Source phase**: Phase 4 (sub-task 4.4)
- **Plan reference**: [adoption-ecosystem-2026-05.md](../../../archive/v1/v1.2/plans/adoption-ecosystem-2026-05.md) sub-task 4.4 ("Generate a 100k-chunk benchmark fixture by indexing a large public repo ... record on-disk bytes and recall@10 on a 100-query test set").
- **Reason**: The 100k-chunk fixture takes minutes to build and consumes hundreds of MB of tmpdir disk. Running it on every CI invocation would balloon the integration suite well past its current budget. The Phase 4 stability gate ships as a CI-friendly 2k-chunk smoke (`tests/integration/memory-tier/storage-benchmark.test.ts`) that exercises the same code paths and asserts the documented gate (storage <=20% of Standard, recall >=80%). The 100k variant is gated behind the `NEXUS_PHASE4_BENCH_SIZE=100000` environment variable and is documented in `tests/fixtures/memory-tier-benchmark-results/2026-05-26/README.md`. The Phase 7.2 storage-size benchmark sub-task is responsible for the canonical 100k run.
- **Suggested next step**: Phase 7.2 runs the full 100k sweep with the real transformer embedder and publishes the resulting recall + ratio numbers under `docs/versions/v1/v1.2.0/benchmarks/memory-storage-size-2026-05-26.md`.

- **Migrated from**: v1.2#MT-4-4-P2-L on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-245 - 4.x.P3.N -- HybridRetriever owns ingest only via the new `ingestFile()` helper (DF, P3)

- **Source phase**: Phase 4 (sub-task 4.1 wiring decision)
- **Plan reference**: [adoption-ecosystem-2026-05.md](../../../archive/v1/v1.2/plans/adoption-ecosystem-2026-05.md) sub-task 4.1 ("Wire `AstChunker` into `core/memory/HybridRetriever.ts` ingest path -- the hybrid retriever should call the AST chunker first, with the size chunker as fallback").
- **Reason**: The HybridRetriever existed pre-Phase-4 as a query-only façade; the actual memory ingest happened upstream in `MemoryHub.write()` (which calls `bm25.add(id, text)` + `dense.add(id, vec)` directly). Phase 4.1 adds a new `HybridRetriever.ingestFile(input)` helper that chunks via `AstChunker`, embeds (Standard tier) or stores text (Pruned tier), and adds chunks to both indexes. Existing pre-Phase-4 ingest call sites in `MemoryHub` and `WarmRebuildWorker` were NOT migrated to use the helper; migration would expand Phase 4's scope into the memory-hub call graph. The new helper is the seam Phase 5+ ingest call sites should pick up.
- **Suggested next step**: When the memory hub gains a code-aware ingest pathway (e.g. a "ingest workspace" command or a code-graph-driven background indexer), route through `HybridRetriever.ingestFile()` instead of calling `bm25.add` / `dense.add` directly. The helper handles both tiers cleanly.

- **Migrated from**: v1.2#DF-4-x-P3-N on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-246 - 2.4.P3.F -- Tee footer is embedded in the tool-result JSON instead of the next-turn system prompt (DF, P3)

- **Source phase**: Phase 2 (sub-task 2.4)
- **Plan reference**: [adoption-ecosystem-2026-05.md](../../../archive/v1/v1.2/plans/adoption-ecosystem-2026-05.md) sub-task 2.4 ("the system prompt for the next agent turn includes a one-line footer: `[Last command compressed; raw output available at <teePath> if needed.]` when `teePath` is set").
- **Reason**: The plan asks for the footer to be injected into the next-turn system prompt via `PromptBuilder`. The shipped wiring embeds the footer as a `footer` field inside the `run_terminal` tool-result JSON payload alongside `teePath` and `strategyApplied`. Functionally the model sees the path on the very next reasoning step (the JSON is part of the conversation history that feeds the next system prompt), so the tee path is reachable without an additional PromptBuilder edit. A literal PromptBuilder hook would have crossed the Coding-pillar agent-loop boundary, which is closer to Phase 5's "agent loop policy" surface.
- **Suggested next step**: When Phase 5 lands the read-only-exploration sub-agent enforcement and the 13th `session-reflection` hook position, also add a PromptBuilder section that surfaces the most recent tee footer in the next-turn system prompt header, and switch the tool-result JSON to omit `footer` once the PromptBuilder section is wired.

- **Migrated from**: v1.2#DF-2-4-P3-F on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-247 - 5.1.P2.O -- Explore-intent enforcement wired only at `src/agents/SubAgentManager`, not at the (future) modules/coding dispatch path (DF, P2)

- **Source phase**: Phase 5 (sub-task 5.1)
- **Plan reference**: [adoption-ecosystem-2026-05.md](../../../archive/v1/v1.2/plans/adoption-ecosystem-2026-05.md) sub-task 5.1 ("Modify the sub-agent dispatch layer ... so that sub-agents invoked with `intent: 'explore'` have a tool allowlist restricted to: Read, Glob, Grep, codegraph_* tools, and Bash only for commands matching a configurable allowlist of read-only commands").
- **Reason**: The policy module ships at `core/coding/SubAgentPolicy.ts` (pure, no I/O) and is wired through the v1.0.0 sub-agent dispatch entry point at [src/agents/SubAgentManager.ts](../../../src/agents/SubAgentManager.ts) -- the only sub-agent dispatcher actually running in production today. The plan's reference to `modules/coding/` is forward-looking; the Coding-module engine still lives in `src/` during the one-cycle compat window per [AGENTS.md "Project Layout"](../../../AGENTS.md). When the dispatch path moves to `modules/coding/` (tracked separately under v1.1.0 carryforward `1.4.P1.B`), the new dispatcher must call `evaluateExploreToolCall` and `lintExploreSpecialist` at the same wiring points -- those public surfaces are stable.
- **Suggested next step**: When `1.4.P1.B` lands the src -> modules/coding move, port the explore intent + policy wiring in `SubAgentManager.run` / `SubAgentManager._buildScopedRegistry` to the new dispatcher. The policy module is the abstraction boundary.

- **Migrated from**: v1.2#DF-5-1-P2-O on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-248 - 5.1.P2.P -- Explore policy is not yet enforced for MCP tools loaded at runtime (DF, P2)

- **Source phase**: Phase 5 (sub-task 5.1)
- **Plan reference**: [adoption-ecosystem-2026-05.md](../../../archive/v1/v1.2/plans/adoption-ecosystem-2026-05.md) sub-task 5.1 (tool allowlist: "Read, Glob, Grep, codegraph_* tools, and Bash only for commands matching ...").
- **Reason**: `EXPLORE_READONLY_TOOLS` in [core/coding/SubAgentPolicy.ts](../../../core/coding/SubAgentPolicy.ts) explicitly enumerates the built-in tool surface (read_file / list_directory / grep_codebase / codegraph_* / web_search / fetch_page). Dynamic MCP tools loaded at runtime via the [core/coding/McpBridge.ts](../../../core/coding/McpBridge.ts) harness are NOT auto-classified -- under the current policy, every MCP tool is rejected from an explore sub-agent. This is the safer-by-default behavior, but it means a user who legitimately wants `mcp:github/search_issues` to be available during exploration must extend the allowlist manually.
- **Suggested next step**: When Phase 6 (re-partial integrations) lands the LSP client, also extend the policy with a "read-only MCP tool" annotation derived from the MCP tool descriptor's input schema -- tools whose JSON schema has no write-capable verbs in their name (e.g. `create`, `update`, `delete`, `post`, `write`) should automatically join the explore allowlist. Until then, MCP tools are blocked under explore intent.

- **Migrated from**: v1.2#DF-5-1-P2-P on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-249 - 5.2.P3.Q -- PathScope filtering does not auto-reload skills mid-session in the live daemon (DF, P3)

- **Source phase**: Phase 5 (sub-task 5.2)
- **Plan reference**: [adoption-ecosystem-2026-05.md](../../../archive/v1/v1.2/plans/adoption-ecosystem-2026-05.md) sub-task 5.2 ("Add a method `reevaluatePathScope(currentPath: string)` that the agent loop calls when the editing focus changes, so a skill can become active mid-session as the agent moves into a relevant subtree").
- **Reason**: `InMemorySkillCatalog.reevaluatePathScope` ships and is tested -- it returns the visible set for a given path. The actual live wiring (have the Coding-pillar agent loop call `reevaluatePathScope(currentEditPath)` when the focus changes) is NOT included in Phase 5: the agent loop's "current edit path" is not currently surfaced as a hook, and exposing it would cross from `core/skills/` into the agent-loop boundary (`src/tools/AgentLoop.ts`) -- closer to a Phase 6+ concern. Skills authored with `pathScope` are still loaded correctly when the daemon starts in a CWD that matches; they just do not auto-activate mid-session yet.
- **Suggested next step**: When the Coding-pillar agent loop gains a per-turn "active edit path" projection (likely as part of the eventual sub-agent + sessions surface from the v1.1.0 Phase 11 plan), have it call `catalog.reevaluatePathScope(activeEditPath)` and diff the result against the previously-loaded set; activate / deactivate skills accordingly. The catalog surface is already in place.

- **Migrated from**: v1.2#DF-5-2-P3-Q on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### WN-24 - 5.3.P2.R -- `permissions.deny` parser ships but is not yet wired into any tool (WN, P2)

- **Source phase**: Phase 5 (sub-task 5.3)
- **Plan reference**: [adoption-ecosystem-2026-05.md](../../../archive/v1/v1.2/plans/adoption-ecosystem-2026-05.md) sub-task 5.3 ("Add `.nexus/permissions.deny` parsing for per-tool denials -- e.g. `Bash: rm -rf /*` denies Bash matching that pattern").
- **Reason**: The parser at [core/storage/PermissionsDeny.ts](../../../core/storage/PermissionsDeny.ts) is fully implemented and unit-tested (parse + evaluate with literal, wildcard, and ** path patterns; tool-name wildcards; first-match-wins). It is currently a stand-alone module with no caller -- which `dependency-cruiser` correctly flags as `no-orphans`. The next-cycle wiring point is the `run_terminal` permission-gate path (and any other write-capable tool's pre-tool hook). The plan only required the parser surface plus tests; wiring it everywhere would have crossed into a separate per-tool guard concern.
- **Suggested next step**: When v1.2.0 Phase 7 stabilization (or a follow-up cycle) lands a unified pre-tool permission-gate hook, route every tool invocation through `evaluateDeny(toolName, subject, parsedDeny)` after the existing path-guard and ALLOWED_COMMANDS checks. The shared parser is ready.

- **Migrated from**: v1.2#WN-5-3-P2-R on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-250 - 5.3.P3.S -- Codegraph scanner still uses its own inline ignore parser instead of the shared module (DF, P3)

- **Source phase**: Phase 5 (sub-task 5.3)
- **Plan reference**: [adoption-ecosystem-2026-05.md](../../../archive/v1/v1.2/plans/adoption-ecosystem-2026-05.md) sub-task 5.3 ("The parsed exclusion list is honored by: ... (b) the code-graph scanner from Phase 3").
- **Reason**: Phase 5.3 ships the shared `.nexusignore` parser at [core/storage/NexusIgnore.ts](../../../core/storage/NexusIgnore.ts) and wires it into `HybridRetriever.ingestFile` (memory ingest). The pre-existing inline ignore parser inside [core/codegraph/scanner/RepoScanner.ts](../../../core/codegraph/scanner/RepoScanner.ts) (which was added during Phase 3.3) was NOT refactored to use the shared module -- both parsers produce equivalent behavior on the same `.nexusignore` content, but they live in two places. Per AGENTS.md "every changed line must trace directly to the user's request", a wholesale refactor of the codegraph scanner was deferred so the Phase 5.3 diff stayed tight to the plan's surface.
- **Suggested next step**: In a follow-up hygiene commit, replace the inline `loadIgnorePatterns` / `isIgnored` functions in `RepoScanner.ts` with `mergeIgnorePatterns(defaultIgnorePatterns(), parseIgnoreFile(content))` and `matchesIgnore` from `core/storage/NexusIgnore.ts`. Re-run the Phase 3 codegraph integration tests to confirm parity.

- **Migrated from**: v1.2#DF-5-3-P3-S on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-251 - 5.4.P3.T -- session-reflection hook is registered manually; no auto-wiring in the daemon yet (DF, P3)

- **Source phase**: Phase 5 (sub-task 5.4)
- **Plan reference**: [adoption-ecosystem-2026-05.md](../../../archive/v1/v1.2/plans/adoption-ecosystem-2026-05.md) sub-task 5.4 ("Provide one reference hook implementation under `.claude/agents/` that scans the transcript for 'user said X, I did Y wrong' patterns and emits a `proposed-agents-md-update` artifact at `<nexus-home>/reflections/<session-id>.md`").
- **Reason**: The 13th lifecycle event `lifecycle.session.reflection` is added to the `HookBus` union; the reference implementation at [core/lifecycle/SessionReflectionHook.ts](../../../core/lifecycle/SessionReflectionHook.ts) exports `attachSessionReflectionHook(bus, opts)` and is fully unit-tested. The daemon-side automatic wiring (have the chat session emit the event when the user closes the session, then have the bootstrap call `attachSessionReflectionHook` once at daemon startup) is NOT included in Phase 5: the chat session's `end()` path lives in `src/chat/` and crosses into the v1.1.0 Phase 11 surface that the v1.2.0 cycle's compat window has not yet stabilized. The hook composes cleanly when a caller wires it; the integration test exercises that contract.
- **Suggested next step**: When the daemon bootstrap path is consolidated (likely during Phase 7 stabilization or in the v1.1.0 carryforward 1.4.P1.B src -> modules/coding move), call `attachSessionReflectionHook(hookBus)` once at session-construction time and emit `lifecycle.session.reflection` from the session-end handler in `core/coding/` (or wherever the session-end lifecycle is consolidated). Until then, the hook only fires when a test or operator wires it explicitly.

- **Migrated from**: v1.2#DF-5-4-P3-T on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-252 - 6.1.P3.U -- FileWatcher wraps `fs.watch` instead of `chokidar` (DF, P3)

- **Source phase**: Phase 6 (sub-task 6.1)
- **Plan reference**: [adoption-ecosystem-2026-05.md](../../../archive/v1/v1.2/plans/adoption-ecosystem-2026-05.md) sub-task 6.1 ("Implement `core/storage/FileWatcher.ts` wrapping `chokidar` with a 2-second debounce and `.nexusignore` honoring").
- **Reason**: The plan prompt names `chokidar` explicitly, but it is not currently a Nexus dependency. The re-partial bucket scope ("extract the watcher abstraction without adding new third-party deps") favored Node's built-in `fs.watch` (with `recursive: true`, available on macOS/Windows since Node 10 and Linux since Node 20). The shipped wrapper at [core/storage/FileWatcher.ts](../../../core/storage/FileWatcher.ts) provides the exact public surface the plan requested (`watch`, `stop`, `pendingChanges`); the underlying subscribe impl is the single seam where `chokidar` could swap in later without changing call sites. The 2-second debounce, `.nexusignore` honoring (via the Phase 5.3 shared parser), and last-write-wins dedup are all implemented and unit-tested.
- **Suggested next step**: If a future cycle finds Node's `fs.watch` insufficient (the documented gap is recursive watching on older Linux kernels without inotify v5.13+), introduce `chokidar` as an opt-in dependency behind a feature flag and point `defaultSubscribe` at it. Tests inject a `subscribe` impl already, so behavior tests stay green.

- **Migrated from**: v1.2#DF-6-1-P3-U on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-253 - 6.1.P3.V -- WatchedRepoScanner reuses `RepoScanner.extractSymbols` (regex extractor) (DF, P3)

- **Source phase**: Phase 6 (sub-task 6.1)
- **Plan reference**: [adoption-ecosystem-2026-05.md](../../../archive/v1/v1.2/plans/adoption-ecosystem-2026-05.md) sub-task 6.1 ("Refactor `core/codegraph/scanner/TreeSitterScanner.ts` (Phase 3.3) to use this abstraction").
- **Reason**: Phase 3.3 deferred the Tree-sitter scanner to a regex-based `RepoScanner` (`core/codegraph/scanner/RepoScanner.ts`), tracked as open item 3.3.P2.G. The Phase 6.1 plan prompt referenced the deferred name; the actual refactor surfaces as the new `WatchedRepoScanner` adapter at [core/codegraph/scanner/WatchedRepoScanner.ts](../../../core/codegraph/scanner/WatchedRepoScanner.ts), which consumes `FileWatcher` events and reuses `extractSymbols(source, language)` from `RepoScanner`. The full-scan path at sidecar startup still runs through `RepoScanner.scan`; the watcher only handles the delta after that. Both paths share the same symbol extractor so behavior parity is automatic.
- **Suggested next step**: When 3.3.P2.G lands, `WatchedRepoScanner` automatically inherits the Tree-sitter upgrade because the `extractSymbols` import is the single abstraction boundary. No code change at this level.

- **Migrated from**: v1.2#DF-6-1-P3-V on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-254 - 6.1.P3.W -- RepoScanner still uses its inline ignore parser; WatchedRepoScanner shares the FileWatcher filter (DF, P3)

- **Source phase**: Phase 6 (sub-task 6.1)
- **Plan reference**: Implicit -- continuation of 5.3.P3.S.
- **Reason**: `WatchedRepoScanner` does not parse ignore files itself -- it inherits the `FileWatcher`'s filter, which uses the Phase 5.3 shared `NexusIgnore.ts` module. The legacy `RepoScanner.loadIgnorePatterns` still ships an inline parser; both produce equivalent behavior on the same `.nexusignore` content. Sharing the parser across the full-scan and watcher paths is the closure for 5.3.P3.S.
- **Suggested next step**: Same as 5.3.P3.S -- in a follow-up hygiene commit, replace `RepoScanner`'s inline ignore parsing with the shared module. Re-run the codegraph + watcher integration tests to confirm parity.

- **Migrated from**: v1.2#DF-6-1-P3-W on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-255 - 6.2.P2.X -- LSP servers require manual installation; no installer bundling (DF, P2)

- **Source phase**: Phase 6 (sub-task 6.2)
- **Plan reference**: [adoption-ecosystem-2026-05.md](../../../archive/v1/v1.2/plans/adoption-ecosystem-2026-05.md) sub-task 6.2 ("The installer warns when an LSP binary is missing rather than silently falling back to grep").
- **Reason**: `LspClient` resolves `typescript-language-server`, `pylsp`, and `rust-analyzer` via the system PATH. None of these binaries are bundled by the Nexus installer (each is its own multi-MB native asset with platform-specific build steps). When a binary is missing, `LspClient.definition` / `references` returns `{ ok: false, error: "LSP server for <lang> is not installed ..." }` and the wrapper invokes the `onServerMissing` callback once per language (the installer-smoke logs surface the warning). The two MCP tools degrade to a structured error, not a silent grep fallback -- the user sees a clear "install the language server" message.
- **Suggested next step**: When the installer policy is ready to expand the asset list, add per-platform install scripts for each LSP server (e.g. `npm i -g typescript-language-server`, `pipx install python-lsp-server`, `rustup component add rust-analyzer`) and gate them behind opt-in installer prompts. Document the user-side install path in `docs/versions/v1/v1.2.0/development/` until then.

- **Migrated from**: v1.2#DF-6-2-P2-X on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-256 - 6.2.P3.Y -- LSP client implements a minimal subset of LSP, not full protocol (DF, P3)

- **Source phase**: Phase 6 (sub-task 6.2)
- **Plan reference**: Internal -- introduced by the Phase 6.2 narrow-scope decision.
- **Reason**: `LspClient` issues `initialize` -> `initialized` (notification) -> `textDocument/didOpen` -> `textDocument/definition` or `textDocument/references` -> `shutdown` / `exit` at teardown. It does NOT support: text-document version sync, code completion, diagnostics subscription, workspace symbols, semantic tokens, or any LSP server-to-client request. The two MCP tools listed in the plan are the only public surface. If a downstream feature needs broader LSP coverage (e.g. "show diagnostics inline"), the client will need substantial expansion (request routing, server-initiated `window/showMessage` handling, document version tracking).
- **Suggested next step**: Stage broader LSP coverage as a separate phase when the requirement materializes. The JSON-RPC framing + child-process management at the heart of `LspClient` is already factored; new request types are additive.

- **Migrated from**: v1.2#DF-6-2-P3-Y on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-257 - 6.3.P2.Z -- Interactive HTML artifact uses a minimal inline sanitiser, not DOMPurify (DF, P2)

- **Source phase**: Phase 6 (sub-task 6.3)
- **Plan reference**: Implicit -- continuation of the desktop workspace's "no new deps for a re-partial phase" stance.
- **Reason**: The Coding-pillar markdown renderer in the main workspace uses `isomorphic-dompurify`; the desktop workspace does not currently include that dep. Adding it would expand the desktop bundle for one component. The shipped `InteractiveArtifact` at [desktop/src/components/InteractiveArtifact.tsx](../../../desktop/src/components/InteractiveArtifact.tsx) ships an inline `sanitiseArtifactHtml` that strips `<script>`, `<iframe>`, `<object>`, `<embed>`, `<link>`, `<meta>`, `<base>` tags wholesale; removes every attribute starting with `on`; and strips `javascript:` URLs from `href` / `src` / `action`. This is the minimum-surface defence appropriate for content the local agent itself emitted; it is not a full XSS sanitiser for network-sourced HTML.
- **Suggested next step**: If/when the artifact host needs to render network-sourced HTML (currently out of scope), add `isomorphic-dompurify` to the desktop workspace and switch the sanitiser to delegate. Until then, the inline sanitiser is intentional.

- **Migrated from**: v1.2#DF-6-3-P2-Z on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-258 - 7.1.P2.A -- Token-usage benchmark uses deterministic synthesis, not a live worktree replay (DF, P2)

- **Source phase**: Phase 7 (sub-task 7.1)
- **Plan reference**: [adoption-ecosystem-2026-05.md](../../../archive/v1/v1.2/plans/adoption-ecosystem-2026-05.md) sub-task 7.1 ("Run this workload (a) against a checkout of `main` *before* this adoption plan landed (use `git worktree` from the most recent tag prior to Phase 1), and (b) against the current HEAD with all Phases 1-6 active. Record total tokens consumed and total tool calls for both runs.").
- **Reason**: A literal worktree-vs-HEAD replay requires a real local-model run inside both arms -- multi-minute, GPU-bound, and non-deterministic across machines. The Phase 7.1 benchmark at [tests/integration/coding-pillar/phase-7-token-usage.test.ts](../../../tests/integration/coding-pillar/phase-7-token-usage.test.ts) instead executes a deterministic synthesis: the "without adoption" arm simulates the grep-shaped path the agent would take against a pre-Phase-1 checkout (using the real fixture bytes for the result), and the "with adoption" arm runs through the production `CommandCompressor + CodeGraphMcpServer + SqliteGraphStore + RepoScanner` wiring with no mocks. Tokens are approximated by UTF-8 byte length; both arms pay the same proxy so the delta is fair. The published report ([benchmarks/coding-pillar-token-usage-2026-05-26.md](../../../archive/v1/v1.2/benchmarks/coding-pillar-token-usage-2026-05-26.md)) hits the >=30% gates with -93.76% tokens / -45.45% tool calls. A live worktree-vs-HEAD replay would refine the numbers but is unlikely to change the verdict because the byte-count proxy is independent of the model tokenizer.
- **Suggested next step**: If a future cycle invests in a stable local-model fixture (e.g. a checked-in tiny instruct model that returns identical completions across machines), upgrade the Phase 7.1 benchmark to a live agent-loop replay against a tagged worktree; until then, the deterministic synthesis is the canonical artifact.

- **Migrated from**: v1.2#DF-7-1-P2-A on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-259 - 7.x.P3.B -- Plan-prescribed benchmark publish path was `docs/versions/v1/v1.1.0/benchmarks/`; landed under `docs/versions/v1/v1.2.0/benchmarks/` (DF, P3)

- **Source phase**: Phase 7 (sub-tasks 7.1, 7.2)
- **Plan reference**: [adoption-ecosystem-2026-05.md](../../../archive/v1/v1.2/plans/adoption-ecosystem-2026-05.md) sub-tasks 7.1 and 7.2 (the prompt strings literally say "Publish results under `docs/versions/v1/v1.1.0/benchmarks/coding-pillar-token-usage-2026-05-26.md`" and "Publish results at `docs/versions/v1/v1.1.0/benchmarks/memory-storage-size-2026-05-26.md`").
- **Reason**: The plan was written against the v1.1.0 cycle's directory convention before the v1.2.0 cycle directory existed. Both benchmarks belong to the v1.2.0 cycle (v1.1.0 closed 2026-05-26; this adoption track opened the v1.2.0 cycle). The two reports ship under [docs/versions/v1/v1.2.0/benchmarks/](../../../archive/v1/v1.2/benchmarks) so the cycle-end documentation refresh has one home; the original `docs/versions/v1/v1.1.0/benchmarks/` directory was never created. No reader is misled because the README + ARCHITECTURE.md updates from sub-task 7.3 link to the actual `docs/versions/v1/v1.2.0/benchmarks/` location.
- **Suggested next step**: None. The plan path is a documentation typo; the lived convention is correct.

- **Migrated from**: v1.2#DF-7-x-P3-B on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-260 - 7.x.P3.C -- Token-usage benchmark script ships as `tests/integration/coding-pillar/phase-7-token-usage.test.ts`, not `tests/benchmarks/coding-pillar-token-usage.ts` (DF, P3)

- **Source phase**: Phase 7 (sub-task 7.1)
- **Plan reference**: [adoption-ecosystem-2026-05.md](../../../archive/v1/v1.2/plans/adoption-ecosystem-2026-05.md) sub-task 7.1 ("Define a Coding-pillar workload script at `tests/benchmarks/coding-pillar-token-usage.ts`").
- **Reason**: `tests/benchmarks/*.bench.ts` files are picked up by `vitest bench` only, not by `vitest run`; the Phase 7.1 stability gate has to fire on every CI run (matching the per-phase Phase 2.5 + Phase 3.6 + Phase 4.4 convention, which all ship as `tests/integration/.../*.test.ts`). The file therefore lives at the existing integration-test path. The script body itself matches the plan's 5-step workload (Find callers / run tests / inspect failure / propose fix / re-run tests) verbatim.
- **Suggested next step**: None. The integration-test path is the right convention; the plan path was forward-looking.

- **Migrated from**: v1.2#DF-7-x-P3-C on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### BG-10 - 7.x.P1.D -- protobufjs CVEs reach production via `@xenova/transformers` -> `onnxruntime-web` -> `onnx-proto` -> `protobufjs <=7.5.7` (BG, P1)

- **Source phase**: Phase 7 (CI npm-audit gate; pre-existing transitive vulnerability surfaced during the Phase 7 release-readiness sweep)
- **Plan reference**: implicit -- not a Phase 7.x sub-task; surfaced by the `.github/workflows/ci.yml` `npm audit --omit=dev --audit-level=high` step on the post-Phase-7 push.
- **Reason**: GitHub Advisory Database recently published 5 CVEs against `protobufjs <=7.5.7` (GHSA-xq3m-2v4x-88gg arbitrary code execution -- critical; GHSA-66ff-xgx4-vchm + GHSA-2pr8-phx7-x9h3 + GHSA-fx83-v9x8-x52w + GHSA-75px-5xx7-5xc7 -- high). The vulnerable copy reaches the production tree through `@xenova/transformers@2.17.2` -> `onnxruntime-web@1.14.0` -> `onnx-proto@4.0.4` -> `protobufjs@6.11.6`. `@xenova/transformers` is the local-embedder backbone shipped in v1.1.0 Phase 5 (and used by every memory-ingest call site); `onnx-proto` is its hard transitive dep, last published 2020 with no maintenance, and pins `protobufjs@^6.8.8` -- so an `overrides` bump to `protobufjs@^7.5.8` would be a major version jump across onnx-proto's API surface and would almost certainly break `onnxruntime-web`'s ONNX model loading. The pre-Phase-7 commits failed the same gate (the advisory is newer than the most recent successful CI run on `main`); Phase 7 inherits the failure rather than introducing it. Combined with brace-expansion GHSA-jxxr-4gwj-5jf2 (moderate, fixable via dedupe), CI reports 6 vulnerabilities (2 moderate, 3 high, 1 critical) and fails the production audit step.
- **Suggested next step**: Wait for `@xenova/transformers` upstream to release a version that pulls in a newer `onnxruntime-web` (which would update `onnx-proto` -> `protobufjs >=7.5.8`); track upstream at https://github.com/xenova/transformers.js. Until then, either (a) accept the gate failure on the feature branch and merge the cycle-close commits to main via override review, (b) temporarily relax the production-audit `--audit-level` to `critical` and document the carryover, or (c) prototype swapping `@xenova/transformers` for the @huggingface/transformers v4.x line (a separate plan; out of scope for this cycle close). The Phase 7.4 audit ledger keeps this as the cycle's only **P1 carryforward** so future-cycle planners pick it up.
- **Mitigation shipped**: Path (b) was adopted with a narrower scope -- instead of relaxing the audit level globally, the CI gate now calls `scripts/check-prod-audit.mjs` (registered as `npm run check:audit-prod`) which runs `npm audit --omit=dev --json`, filters out the documented allowlist (`@xenova/transformers`, `onnxruntime-web`, `onnx-proto`, `protobufjs`, `brace-expansion`), and fails the gate ONLY when a NEW non-allowlisted advisory at severity >= moderate appears. `.github/workflows/ci.yml` `audit-ts` job replaced `npm audit --production --audit-level=moderate` with `npm run check:audit-prod`. The `qs` moderate DoS (GHSA-q8mj-m7cp-5q26) surfaced alongside the inherited chain and is fixed via an `overrides` entry pinning `qs` to `^6.15.2` (minor-compatible patch -- not a semver-major move; pulled in by `@modelcontextprotocol/sdk` -> `express` -> `qs`). Allowlist additions must be accompanied by a known-gaps entry; the script comment points at this entry as the canonical record. Future drift will fail the gate by default, preserving the audit signal.

- **Migrated from**: v1.2#BG-7-x-P1-D on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### WN-25 - T002.P2.A -- Nexus-Hub validate_skills.py reports 7 pre-existing false-positive secret matches (WN, P2)

- **Source phase**: adoption-skill-cleaner Phase 1 (T002)
- **Plan reference**: [plans/adoption-skill-cleaner.md](../../../archive/v1/v1.3/plans/adoption-skill-cleaner.md) Phase 6 sub-task T017
- **Reason**: Running the full Nexus-Hub `python scripts/validate_skills.py` (no `--path` filter) exits 1 with 7 ERROR-level "potential Generic secret assignment" findings in unrelated, pre-existing skills (`ai-development/google-antigravity-sdk`, `documentation/user-documentation` x2, `infrastructure/cd-pipeline-generator` x2, `infrastructure/rollback-strategy-advisor` x2). These are example snippets (e.g. `password = "..."` in runbook / pipeline samples), not real secrets. They predate this track and are not introduced by the new `skill-description-authoring` skill, which passes both the targeted full validator and the quality pass with 0 errors / 0 warnings. The plan's Phase 6 explicitly says not to mass-edit pre-existing violations; an `--allow-existing` allowlist (`validate_skills.allowlist.json`) is the intended remedy.
- **Suggested next step**: Phase 6 / T017 introduced the `--allow-existing` allowlist (`scripts/validate_skills.allowlist.json`), but it is scoped to the new single-line `name` / `description` violations only -- it does not yet demote these 7 secret-scan false positives, which still surface as ERROR-level findings on an unflagged full run. Remaining work: either extend the allowlist semantics to also grandfather known secret-scan false positives, or refine the `Generic secret assignment` regex to skip fenced code-block examples. Track as a Nexus-Hub-side issue.
- **Phase 6 update (2026-05-29)**: the `--allow-existing` mechanism now exists (format-rule-scoped); this item stays open for the secret-scan grandfathering only.

- **Migrated from**: v1.3#WN-T002-P2-A on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-261 - T012.P2.C -- Usage scan covers only the primary skill root (DF, P2)

- **Source phase**: adoption-skill-cleaner Phase 4 (T012 / T013)
- **Plan reference**: [plans/adoption-skill-cleaner.md](../../../archive/v1/v1.3/plans/adoption-skill-cleaner.md) Phase 4 sub-task T012
- **Reason**: `scanUsage` takes a single `skillsRoot` (the plan-fixed signature), and the CLI passes only the primary root (`skillRootsFor(flags)[0]` -- the `--skills-root` override when given, otherwise the bundled built-in catalog). On a host with active `user` and `devai-hub` roots, the Unused report enumerates only the primary root's skills; skills that live exclusively in the other two roots are not surfaced as unused candidates. The audit's other four sections (Budget / Descriptions / name-Duplicates / Roots) already span all roots via the injected catalog, so this gap is scoped to the Unused section only.
- **Suggested next step**: Either widen `scanUsage` to accept multiple roots (and have the auditor pass every loaded catalog root), or have the auditor derive the usage universe from its own injected catalog rather than re-walking a single disk root. Natural to fold into Phase 6 (T018 `--by-root`) since both touch the same root-resolution surface.

- **Migrated from**: v1.3#DF-T012-P2-C on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-262 - T013.P3.D -- Content-similarity detection is O(N^2); MinHash/LSH deferred (DF, P3)

- **Source phase**: adoption-skill-cleaner Phase 4 (T011 / T013)
- **Plan reference**: [plans/adoption-skill-cleaner.md](../../../archive/v1/v1.3/plans/adoption-skill-cleaner.md) Phase 4 sub-task T011 (implementation note)
- **Reason**: `findSimilarPairs` compares every skill pair (`~N^2/2`). For the current catalog (16 builtin here; ~213 on a full Nexus-Hub sync) this is well under ~22,700 comparisons and runs in milliseconds, so no indexing is warranted yet. The plan explicitly defers a MinHash / LSH pre-filter until catalog size roughly doubles.
- **Suggested next step**: Capture the similarity-detection runtime separately in the Phase 7 benchmark (T020); if it becomes the cost driver as the catalog grows, add a MinHash band pre-filter before the exact Jaccard pass.
- **Phase 7 update (2026-05-29)**: T020 captured the isolated similarity runtime in [benchmarks/skills-audit-2026-05-28.md](../../../archive/v1/v1.3/benchmarks/skills-audit-2026-05-28.md) (4.4ms median over 120 comparisons on the 16-skill builtin catalog). The suggested measurement is now done; the item **stays open** because the MinHash/LSH pre-filter itself is not implemented (deferred until the catalog roughly doubles past the ~213-skill scale). A future cycle reruns the benchmark on the full catalog and decides.

- **Migrated from**: v1.3#DF-T013-P3-D on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-263 - T017.P3.E -- Nexus-Hub allowlist drain: 137 over-long descriptions grandfathered (DF, P3)

- **Source phase**: adoption-skill-cleaner Phase 6 (T017)
- **Plan reference**: [plans/adoption-skill-cleaner.md](../../../archive/v1/v1.3/plans/adoption-skill-cleaner.md) Phase 6 sub-task T017
- **Reason**: Enforcing the new <=250-char single-line `description` rule against the live Nexus-Hub catalog surfaced 137 pre-existing SKILL.md files whose descriptions exceed the ceiling (lengths from 251 up to ~1276 chars; many are multi-trigger workflow descriptions). Per the plan, these were not mass-edited; instead they were grandfathered into `scripts/validate_skills.allowlist.json` so `python scripts/validate_skills.py --allow-existing` demotes them to warnings while new skills are held to the rule. The allowlist is explicitly transitional.
- **Suggested next step**: Drain the allowlist incrementally in the Nexus-Hub repo -- shorten each over-long `description` to a single trigger-noun-preserving line per the `skill-description-authoring` skill, removing its allowlist entry as it lands. When the allowlist reaches zero entries, delete the file and drop the `--allow-existing` flag from any CI invocation. Track as a Nexus-Hub-side issue; a future Nexus cycle's `/generate-plan` Step 0.6 can ingest this item.

- **Migrated from**: v1.3#DF-T017-P3-E on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: Unresolved historical obligation; explicitly carried by the signed v2.16 supplement with original body and priority retained.

#### DF-264 - Bolt 74B-A9B not measured for the 24 GB MoE worker job

- **Source phase**: v2.16.0 Phase 1, T003 (planned follow-on record, not an implementation of the 24 GB trial).
- **Plan reference**: [v2.16.0 model trial](../v2.16/plans/v2.16.0-adoption-humanizer-handwired-nemotron-deepseek.md), T003.
- **Reason**: The seeding comparison records the official `nemotron-3.5-bolt:74b-a9b` artifact at 25 GB with vision, tools, and thinking. Its candidate seat is the 24 GB MoE worker job held by `nemotron-lightning:30b-a3b`. The reference host has 16 GB VRAM, so the required paired golden-task A/B cannot be measured here. No model admission or capability claim is made.
- **Owner**: Maintainer with a 24 GB host.
- **Suggested next step**: Run the v2.14-style A/B on a 24 GB host, recording RAM spill and the parser recovering tool calls. On a measured win, move the job and mark `nemotron-lightning:30b-a3b` a removal candidate.
- **Scope disposition**: The owner-approved plan deliberately records this follow-on; the full-run approval carries it forward without pretending the missing hardware trial ran. The plan's provisional DF-1 maps to DF-151 because inherited DF-1 already exists.

- **Migrated from**: v2.16#DF-151 on 2026-10-31 (reason: user-deferred)
- **Migration evidence**: No admitted golden slots under signed E-3 HOLD; approved follow-on carry to v2.17.0.

### Resolved

| ID | Title | Resolved in | Notes |
|---|---|---|---|
