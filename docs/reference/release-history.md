# Release History

Release narrative and milestone ledger moved out of the root README on 2026-11-19. The text is unchanged from the README as of v2.16.1. For the formal per-release log, see [CHANGELOG.md](../../CHANGELOG.md); for the development narrative, see [DEVLOG.md](../DEVLOG.md).

## Version Line

Nexus uses a single, convergent version line: git tags and `package.json` carry the same numbers as the milestone docs (`docs/archive/v1/v1.<MINOR>/` through v1.20.0, then `docs/archive/v2/v2.0/` for v2.0.0, `docs/archive/v2/v2.1/` for v2.1.0, `docs/archive/v2/v2.2/` for v2.2.9, and `docs/archive/v2/v2.3/` for **v2.3.1**).

Historical note: between 2026-06-18 and 2026-07-20 a decoupled "release track" cut five semantic-release versions numbered ahead of the milestones. Those tags were renumbered onto the milestone line on 2026-08-05: the old `v2.0.0` tag became `v1.6.0`, `v2.1.0` -> `v1.7.0`, `v2.2.0` -> `v1.12.0`, `v2.3.0` -> `v1.13.0`, and `v2.4.0` -> `v1.14.0`. This **v2.0.0** cut is the reserved convergence release (v1.18 plan + v1.19.x subplans + this adoption plan).

### Milestone ledger

| Milestone | Theme | Status | Docs |
|---|---|---|---|
| v1.0.0 | Four-pillar pivot: Gemma Code -> Nexus desktop AI Studio (Tauri shell + Node sidecar) | Landed | [docs/archive/v1/v1.0/](../../docs/archive/v1/v1.0/) |
| v1.1.0 | Stabilization + expansion: hybrid retrieval, session replay, SANA image / video tiers | Landed | [docs/archive/v1/v1.1/](../../docs/archive/v1/v1.1/) |
| v1.2.0 | 2026-05 ecosystem adoption: code-graph MCP, LEANN-derived pruned dense index, command-output compression | Landed | [docs/archive/v1/v1.2/](../../docs/archive/v1/v1.2/) |
| v1.3.0 | skill-cleaner adoption: `nexus skills audit` token-budget report | Landed | [docs/archive/v1/v1.3/](../../docs/archive/v1/v1.3/) |
| v1.4.0 | claude-code-harness adoption (A1-A12) + `src/` -> `modules/coding/` move + carryforward closure | Landed | [docs/archive/v1/v1.4/](../../docs/archive/v1/v1.4/) |
| v1.5.0 | Local Agent Maturity: Gemma 4 quant ladder, credential vault, energy telemetry, planner / critic / worker DAG | Landed | [docs/archive/v1/v1.5/](../../docs/archive/v1/v1.5/) |
| v1.6.0 | aisuite harness + the offline Nexus-AI interactive guide + opt-in local panel / judge fusion | Landed | [docs/archive/v1/v1.6/](../../docs/archive/v1/v1.6/) |
| v1.7.0 | Local skill self-optimization loop (golden-task runner, bounded-edit optimizer, Pareto frontier) | Landed | [docs/archive/v1/v1.7/](../../docs/archive/v1/v1.7/) |
| v1.8.0 | One-shot end-user installer: desktop bundles, Hugging Face weights puller, per-VRAM catalog curation | Landed | [docs/archive/v1/v1.8/](../../docs/archive/v1/v1.8/) |
| v1.9.0 | Installer + Nexus AI Studio experience overhaul (single-artifact branded wizard + full UI / UX rework) | Landed | [docs/archive/v1/v1.9/](../../docs/archive/v1/v1.9/) |
| v1.10.0 | Nexus-Hub consumption re-architecture: single-home `~/.nexus-ai/catalog/` + live first-launch fetch | Landed | [docs/archive/v1/v1.10/](../../docs/archive/v1/v1.10/) |
| v1.11.0 | Installer overhaul: one-shot reliability, clean-machine harness, embedded desktop bundle, background continuation | Landed | [docs/archive/v1/v1.11/](../../docs/archive/v1/v1.11/) |
| v1.12.0 | Local model-execution scaling (per-model harness, extreme-low-bit + disk-offload tiers) + surface the skill optimizer + exec-sandbox audit | Landed | [docs/archive/v1/v1.12/](../../docs/archive/v1/v1.12/) |
| v1.13.0 | Installer reliability + UX polish: fix the fresh-install model failures (registry routing + Ollama pin + pull/load preflight), gradient "AI Studio" wordmark, and the mockup-matched installing UI | Landed | [docs/archive/v1/v1.13/](../../docs/archive/v1/v1.13/) |
| v1.14.0 | Installer catalog curation + install reliability: best-of-family model collapse with release-date pills, gated-model auth flow (token discovery + guided license step), live reachability, and installing-page polish (uniform dependency bars, footer Cancel) | Landed | [docs/archive/v1/v1.14/](../../docs/archive/v1/v1.14/) |
| v1.15.0 | Post-reinstall fixes + chat-style studios: window controls / open maximized, installer relaunch starts at Welcome, catalog invariant guard + gated-token UX + post-install retry, real `models.*` registry reconciled with Ollama and the installer's weights tree, Image Studio and Video Lab rebuilt as chat, and a crash-proof "Nexus Code" VS Code extension | Landed | [docs/archive/v1/v1.15/](../../docs/archive/v1/v1.15/) |
| v1.16.0 | Local serving gateway + document OCR: opt-in loopback OpenAI/Anthropic API in front of installed models, per-model tokens/sec and TTFT on Traces, RapidOCR (CPU) + Unlimited-OCR (NVIDIA) in the catalog, a governed `parse_document` tool, MLX-via-adapters how-to, and a searchable Models page with Chat/Coding quick switcher | Landed | [docs/archive/v1/v1.16/](../../docs/archive/v1/v1.16/) |
| v1.17.0 | Agent-state motion identity: internal orbs, surface-liveness beam, and hero-action metal ring (no new npm packages), one primary motion per surface, recede-when-active ambient glow, halt-not-slow reduced-motion | Landed | [docs/archive/v1/v1.17/](../../docs/archive/v1/v1.17/) |
| v1.18.0 | Agent harness and governance: skill-native mappings, llama.cpp loopback recipe, live harness selector, catalog/registry governance, ask inbox + scheduler, ACP surface, OS process sandbox | Landed | [docs/archive/v1/v1.18/](../../docs/archive/v1/v1.18/) |
| v1.19.0 | Low-VRAM Agentic catalog: LFM2.5-2.6B CPU / sub-4 GB tool-calling pick, LFM Open License v1.0 use-restriction label, harness profile, 8B-A1B bake-off declined | Landed | [docs/archive/v1/v1.19/](../../docs/archive/v1/v1.19/) |
| v1.19.1 | Agent-loop and guardrail hardening: Hub skill-native wins, hard denials, LoopGuards, security-posture dial, provenance screening, DNS-pinned fetches | Landed | [docs/archive/v1/v1.19/](../../docs/archive/v1/v1.19/) |
| v1.19.2 | Catalog and model expansion: modalities + audioConditioning, official-only weight variants, Hermes 3 family, Inkling-Small patient-tier GGUF, calibrated patient-tier copy | Landed | [docs/archive/v1/v1.19/](../../docs/archive/v1/v1.19/) |
| v1.20.0 | Document ingest: wire `parse_document`, magic-byte Office routing, Chat and Coding attach, Docling layout engine deferred | Landed | [docs/archive/v1/v1.20/](../../docs/archive/v1/v1.20/) |
| v2.0.0 | Convergence: multimodal Chat + local voice loop, DANGEROUS isolated-profile browser tools, Video Lab continuation + gated avatar, ProjectScope stretch | Landed | [docs/archive/v2/v2.0/](../../docs/archive/v2/v2.0/) |
| v2.1.0 | Open local-AI wave: Muse Glimmer + Nemotron Lightning catalog/harness, adaptive routing, Image Studio depth, multimodal chat + SAM2, local fine-tuning, hardening | Landed | [docs/archive/v2/v2.1/](../../docs/archive/v2/v2.1/) |
| v2.2.5 | First successful generation: alias-fold chat ids, fail-closed diffusion bytes, Settings Models installer parity, chat explorer chrome, Hub latest (not 3.12.0) | Landed | [docs/archive/v2/v2.2/](../../docs/archive/v2/v2.2/) |
| v2.2.6 | Session memory: named Image/Video history, last-output follow-up, Agents resume hydrate, Chatbot remount proof | Landed | [docs/archive/v2/v2.2/](../../docs/archive/v2/v2.2/) |
| v2.2.7 | Context meter and transcript chrome: catalog `<val>k` chips, composer Context pill plus picker, date/time/token bubbles | Landed | [docs/archive/v2/v2.2/](../../docs/archive/v2/v2.2/) |
| v2.2.8 | Working local studio: minutes-class chat/generate RPCs, shared FolderTree, installer Models sort, Hub latest with quarantine | Landed | [docs/archive/v2/v2.2/](../../docs/archive/v2/v2.2/) |
| v2.2.9 | Field chrome and catalog identity: finished Chatbot/studio chrome, typed diffusion readiness errors, installer/Settings model parity, truthful Hub sync | Landed at automated-test tier; packaged field QA remains DF-36 | [docs/archive/v2/v2.2/](../../docs/archive/v2/v2.2/) |
| v2.3.0 | Optional local video enhancement, Qwen3.8 stays out, Hub security-audit handoff | Landed at automated/internal-compatible evidence; real Video2X/GPU/packaged measurement remains DF-3 | [docs/archive/v2/v2.3/](../../docs/archive/v2/v2.3/) |
| v2.3.1 | Windows installer field repair: honest RAM, crash containment, card chrome, VS Code 1.135, Unsloth on Configuration | Landed at automated evidence; packaged wizard screenshots remain human QA; host_detect coverage remains MT-1 | [docs/archive/v2/v2.3/](../../docs/archive/v2/v2.3/) |
| v2.4.1 | Field reliability, transcript reasoning, chat archives, unified models, and multi-root Agents workspaces | Tagged. Packaged Windows and live-GPU operator checks remain open in the archived gap log | [docs/archive/v2/v2.4/](../../docs/archive/v2/v2.4/) |
| v2.4.11 | Local splat viewer, optional CUDA generate, and the untagged 2.4.2-2.4.10 field work | Tagged from develop. Live NVIDIA generate and weight hashes remain open | [docs/archive/v2/v2.4/](../../docs/archive/v2/v2.4/) |

Each v1 cycle's plan lives under `docs/archive/v1/v1.<MINOR>/plans/`. v2 plans through v2.11 live under `docs/archive/v2/`. v2.12 and later stay under `docs/v2/`. Deferred work that is still open is in [the v2.15 known gaps](../../docs/archives/v2/v2.15/known-gaps.md) and the [follow-up batch list](../../docs/archives/v2/v2.15/development/v2.15.0-followup-batches.md); the v2.12 register is finalized.

### v2.15.0

The project's known gaps are now one countable list: every gap file from v1.17 to v2.12 reads cleanly in the release checker, the 47 items left open in v2.12 were resolved (3) or moved into the v2.15 known gaps with a next step (44), and the 199 older open items are listed once in four follow-up batches. No app, extension or installer behavior changes.

Evidence: [last-phase evidence](../../docs/archives/v2/v2.15/development/v2.15.0-last-phase-evidence.md), [gap triage](../../docs/archives/v2/v2.15/development/v2.15.0-gap-triage.md), [follow-up batches](../../docs/archives/v2/v2.15/development/v2.15.0-followup-batches.md).

### v2.14.2

Desktop Chat speaks a reply from its first sentence while the model is still writing: median time to first audio on the medium test fell from 38.6 s to about 3.9 s, speaking over a reply stops it, and code, links, secrets and hidden reasoning are never read aloud. Voice now runs on install. LFM2.5 24B-A2B joins the catalog as an opt-in 16 GB worker, with pulled weights checked against their pinned digest. Planned as v2.14.0 and released after v2.14.1. The 2.0 s target is not yet met (v2.15 DF-1).

Evidence: [last-phase evidence](../../docs/archives/v2/v2.14/development/v2.14.2-last-phase-evidence.md), [voice latency results](../../docs/archives/v2/v2.14/development/voice-latency-results.md), [LFM A/B](../../docs/archives/v2/v2.14/development/lfm-ab-results.json), [open gaps](../../docs/archives/v2/v2.15/known-gaps.md).

### v2.14.1

This release adds an internal-compatible development evaluator for a text-only editing adaptation on frozen synthetic English and Chinese drafts. The single pilot failed the response-format contract, so all sixteen held-out drafts remain not-run/HOLD. Factual preservation and readability improvement are unmeasured; Humanizer is not admitted or installed.

Evidence: [baseline](../../docs/archives/v2/v2.14/development/v2.14.1-rewrite-baseline.md), [Humanizer feasibility](../../docs/archives/v2/v2.14/development/v2.14.1-humanizer-feasibility.md), [remaining quality goal DF-5](../../docs/archives/v2/v2.14/known-gaps.md). The separate v2.14.0 plan is not part of this release.

### What's new in v2.12.0

This release carries the v2.12 and v2.13 plans. Its installers and VSIX packages ship as **v2.12.1**: the `v2.12.0` tag exists but its release build failed before publishing (WN-5).

- **Durable Image Studio edits** - Edits to a generated image are saved as a versioned recipe with undo and redo, survive a restart, and never change the original bytes. Generated images are now kept under `~/.nexus/generations/images/` so their turns can be reopened. Preview and export render through one pixel path.
- **Approved agent edits** - `nexus image-edit` and `/nexus/image-edit/*` let an agent describe, apply, render and export edits to one image only after you approve its request in the Ask inbox. The grant is bound to that agent's caller id, run and image, and lasts one hour. Exports go only to `~/.nexus/generations/exports`.
- **Document output and tool history** - Document parsing is budgeted from current prompt usage, native tool calls keep their history, and both agent loops compact tool results. The experimental outline tools and their Settings controls were retired under the frozen evaluation fallback; generic OCR and `parse_document` remain available.
- **EmbeddingGemma 2 is not admitted** - A bounded local evaluator exists, but Ollama 0.32.15 rejects the candidate, so the current embedder is retained (DF-1, DF-2). Kolibri-1 is declined and recorded in the declined-models index.

Plans: [v2.13.0](../../docs/archives/v2/v2.13/plans/v2.13.0-adoption-craft-editors-embeddinggemma-2.md), [v2.12 gaps](../../docs/archives/v2/v2.12/known-gaps.md). Open items: [v2.14 carried gaps](../../docs/archives/v2/v2.14/known-gaps.md).

### What's new in v2.10.0

Hosted Jev, Laya 0.3.20, and the Kev family (0.8B, 4B, 9B, and 27B) are not admitted. The record is one known-gap row, DF-v210-1. None of them is a catalog id, a runtime, an API client, or a download. The Nimble refusal stays in the v2.8.0 plan.

Plan: [System One exclusion](../../docs/archive/v2/v2.10/plans/v2.10.0-adoption-system-one-models.md).

### What's new in v2.9.0

CrisperWhisper 2.0 is not admitted. The acceptance bar has no v2.8.0 exclusion sentences, so the record is one known-gap row, DF-v290-1. It is not a catalog id, a runtime fork, or a download. Word timestamps stay a Faster-Whisper gap.

Plan: [CrisperWhisper exclusion](../../docs/archive/v2/v2.9/plans/v2.9.0-adoption-crisperwhisper.md).

### What's new in v2.8.0

The community Qwen-Image-2.1 GGUF and Bespoke Nimble are not admitted. The acceptance bar has no v2.7.0 exclusion subsection, so the record is one known-gap row, DF-v280-1. Neither name is a catalog id, a runtime, or a download. DF-11 stays open.

Plan: [Qwen-Image and Nimble exclusion](../../docs/archive/v2/v2.8/plans/v2.8.0-adoption-qwen-image-nimble.md).

### What's new in v2.7.0

Video Lab offers a talking-head only when the official LongCat Avatar 1.5 weights are installed. A diffusion-pro machine without those weights can still attach a photo and audio, and is told to install `longcat-video-avatar-1.5` instead of starting an image-to-video job. The Empero Qwen3.8-35B-A3B distill is recorded as not admitted. A confirmed submit still does not sample a clip while DF-8 is open.

Plan: [avatar install gate](../../docs/archive/v2/v2.7/plans/v2.7.0-adoption-avatar-install-gate.md).

### What's new in v2.4.11

Image Studio can open a local `.splat` or `.ply` beside a finished image, with the honesty sentence that unseen sides are invented. Optional generate is a queued child job that fails closed without NVIDIA CUDA. TripoSplat is not pre-ticked and is not downloaded by the installer.

- **Local viewer** - WebGL2 orbit, zoom, and pan, with a still frame when WebGL2 is missing. Remote URLs are rejected.
- **Source image stays** - A splat download is a different file from the PNG.
- **Optional generate** - Set `NEXUS_SPLAT_NVIDIA=1` and `NEXUS_SPLAT_CUDA=1` only on a machine that actually has them, and place the MIT weights yourself. The fake benchmark is `node scripts/bench-gaussian-splat.mjs`.

Support details: [splat benchmark](../../docs/archive/v2/v2.4/benchmarks/gaussian-splat-baseline.md). Open items: [carried gaps](../../docs/archives/v2/v2.12/known-gaps.md).

### What's new in v2.4.1

The complete v2.4.1 implementation is locally code-complete. Automated and internal-compatible evidence covers every requested behavior; packaged Windows visuals and live NVIDIA generation remain explicit operator work rather than silent passes.

- **Installer hierarchy and recovery** - A larger overall bar shows a monotonic percentage and reduced-motion-safe gradient animation. Optional Unsloth and diffusion inputs are frozen with the installer, and failures stay inside the wizard with repair-aware state.
- **Image runtime readiness** - The selected diffusion environment is staged atomically and reports ready only when required weights and CUDA-capable torch are verified.
- **Transcript clarity** - Generating motion is not a bubble. Completed answers use a subtly distinct assistant bubble, time and total tokens sit on opposite sides, detailed token counts are hover/focus accessible, and separate reasoning is collapsed above the answer.
- **Archive and delete** - All four pillars confirm destructive or reversible removal, reset an active view, ignore late events, and expose archived chats in Settings by pillar for restore.
- **Model library** - Installer and Settings share order and display policy. Cards use restrained downloaded color, always-visible summaries, size pills, VRAM beside compatibility, honest external entries, and a live disk-use meter.
- **Multi-root Agents** - Agents defaults to the OS home directory, supports a primary folder plus additions, snapshots roots per session, enforces every selected root, and groups history by durable workspace. The top tabs are Chat, Memory, and Activity.

Support details: [release notes](../../docs/archive/v2/v2.4/release-notes.md). Open field evidence: [known gaps](../../docs/archive/v2/v2.4/known-gaps.md). Operator steps: [v2.4.1 checklist](../../docs/archive/v2/v2.4/development/v2.4.1-operator-checklist.md).

### What's new in v2.3.1

The Windows wizard stays alive through model downloads, reports real system RAM, paints catalog and progress on card surfaces, and treats VS Code as an optional tickable extension install (replace if present) with Unsloth Core on Configuration. Nomic stays the required embedder. EmbeddingGemma 300M stays opt-in.

- **Honest RAM** - Patient-tier cards read host RAM, not install-path free disk. Inkling-Small can be Compatible on a normal RAM host.
- **Crash containment** - An install-thread exception fails in-window with a log path instead of closing the process.
- **Card chrome** - Catalog headers and installing lists inherit card fill instead of black window-color bars.
- **VS Code 1.134 or 1.135** - The checkbox is always visible. It is enabled on those minors (same Electron 42.8.1). 1.136+ stays visible and disabled. Replace uses `--force` only when the extension is already installed.
- **Embedder** - Nomic remains required. EmbeddingGemma copy says 300M, not 300B.

Activation: Optional VS Code extension: tick the wizard checkbox when Microsoft stable `code` 1.134 or 1.135 is on PATH. Unsloth Core: enable Configuration > Unsloth Core (off by default; NVIDIA 16 GB+ VRAM). EmbeddingGemma 300M: select it on Models; it is not required.
Validation: VS Code: `code --version` is 1.134.x or 1.135.0 and the checkbox is enabled; after install, `code --list-extensions` includes `nexus-coding.nexus-coding`. Unsloth: the toggle is on Configuration, not the VS Code page. Embedder: Nomic stays Required; EmbeddingGemma copy says 300M.
Rollback: Untick the VS Code checkbox or uninstall the extension. Turn Unsloth off on Configuration. Leave EmbeddingGemma unselected; Nomic remains the required embedder. None of these uninstall VS Code, CUDA, or existing models.
Authority: The VS Code checkbox does not install VS Code, does not enable 1.136+, and does not change the desktop app. Unsloth does not grant network training or Hub writes. Selecting EmbeddingGemma does not reindex existing memory.
Docs: [docs/install.md](../../docs/install.md), [vscode-host-policy.md](../../docs/archive/v2/v2.3/development/vscode-host-policy.md), [embedder-default-decision.md](../../docs/archive/v2/v2.3/development/embedder-default-decision.md).

The packaged desktop application remains Windows-only; raw Tauri bundles stay withheld (DF-38).

Known gaps: [docs/archive/v2/v2.3/known-gaps.md](../../docs/archive/v2/v2.3/known-gaps.md). Plan: [docs/archive/v2/v2.3/plans/v2.3.1-installer-field-repair.md](../../docs/archive/v2/v2.3/plans/v2.3.1-installer-field-repair.md).

### What's new in v2.3.0

Video Lab can enhance a completed local clip without replacing the original. Qwen3.8-Flash-Next stays out of catalogs. OpenWorker is a Nexus-Hub handoff only. Automated and internal-compatible evidence is supported; real Video2X 6.4.0, GPU/VRAM, packaged detection, and perceptual review are not proven here (DF-3). Hydrated sessions do not restore Enhance (DF-1). Hub security-audit is still unreleased upstream (DF-2).

- **Enhance** - A completed identity-backed clip can upscale, interpolate, or both as a cancellable `video_enhancement` child job. The original download stays; the enhanced file is separate and provenance-linked.
- **Honest backend** - The first adapter may call a user-installed Video2X 6.4.0 executable. Nexus does not download, bundle, or search PATH for it. Missing configuration and unsupported hosts fail closed with shared copy.
- **Settings and installer** - Settings > Video stores an absolute `video.video2xPath`. `NEXUS_VIDEO2X_PATH` wins over the setting. The installer shows a note, not an install toggle.
- **Evidence** - Fake-backend fixtures prove geometry and source preservation. Peak CPU/GPU/VRAM and packaged field detection remain not proven here.
- **Admission** - Qwen3.8 is absent from `core/registry/catalog.json`. OpenWorker is specified in the Hub handoff document; this release does not edit the sibling repository.

Activation: Install Video2X 6.4.0 yourself, then set `NEXUS_VIDEO2X_PATH` or Settings > Video > Video2X executable to the absolute executable path.
Validation: In Video Lab, Recheck capability; Enhance is enabled only when capability is ready. Contract check: `node scripts/bench-video-enhancement.mjs --backend fake`.
Rollback: Clear Settings > Video > Video2X executable and unset `NEXUS_VIDEO2X_PATH`. That does not uninstall Video2X. Original clips remain.
Authority: Configuring a path does not install or download Video2X, does not search PATH, does not replace originals, does not grant network or Hub writes, and does not add Qwen3.8.
Docs: [video-enhancement-baseline.md](../../docs/archive/v2/v2.3/benchmarks/video-enhancement-baseline.md).

The optional VS Code extension still requires VS Code 1.134.0 exactly. The packaged desktop application remains Windows-only; raw Tauri bundles stay withheld (DF-38).

Known gaps: [docs/archive/v2/v2.3/known-gaps.md](../../docs/archive/v2/v2.3/known-gaps.md). Plan: [docs/archive/v2/v2.3/plans/v2.3.0-adoption-qwen-video2x-openworker.md](../../docs/archive/v2/v2.3/plans/v2.3.0-adoption-qwen-video2x-openworker.md).

### What's new in v2.2.9

Finished Chatbot and studio field chrome, made local generation failures truthful, aligned installer and Settings model identity, and clarified Hub sync and quarantine. Automated and internal compatibility evidence is supported; packaged Windows field QA and live GPU generation are not proven here and remain DF-36 and DF-4.

- **Chat finish** - The composer drops leftover Mic/Persona chrome, gives Context the wide control, and keeps the model picker short. Message clocks and full-word token counts sit above bubbles, the active rail row stays selected, and the first generated title persists.
- **Composing state** - Thinking, Searching, Working, and Solving captions rotate beside the internal orb and halt under reduced motion.
- **Studio history and context** - Image and Video history use Chatbot copy and selection behavior, and their Context pills fill against visual-token budgets.
- **Honest generate** - CUDA, weights, and GPU readiness failures remain distinct through the UI. Stub images are pytest-only.
- **Catalog identity** - Embeddings is first in the installer and Settings, both share name-row pills including Inkling-Small, and Settings moves downloaded models first.
- **Hub sync** - Leading `v` tags compare correctly, Sync now reports staged progress, and Quarantined explains scanner findings while the scanner stays on.

This release changes no opt-in capability or installer flag. The optional VS Code extension requires VS Code 1.134.0 exactly because its bundled `better-sqlite3` 12.11.1 native module targets that host's Electron 42.8.1 runtime; other VS Code versions are not supported by this release artifact.

Known gaps: [docs/archive/v2/v2.2/known-gaps.md](../../docs/archive/v2/v2.2/known-gaps.md). Plan: [docs/archive/v2/v2.2/plans/v2.2.9-field-chrome-catalog-and-generate.md](../../docs/archive/v2/v2.2/plans/v2.2.9-field-chrome-catalog-and-generate.md).

### What's new in v2.2.8

Minutes-class local inference, one history chrome on all four tabs, installer-identical Models sort, and Hub latest apply with the scanner on. Packaged Chatbot `Hi`, live GPU generate, and packaged Hub Active=latest remain unproven (DF-32, DF-4, DF-35). Packaged Explorer launch is observed (DF-2 closed).

- **Inference that finishes** - `chat.send` / generate RPCs use a minutes-class timeout. `ping` stays 15s. A slow local turn shows Composing or a typed Ollama/runtime error, not `(chat unavailable) sidecar response timeout`. Ollama tag `gemma4:12b` lists as Downloaded for catalog `gemma-4-12b-it-gguf`.
- **Shared history** - Chatbot, Agents, Images, and Videos use FolderTree at 280px, collapsing to a 56px icon rail. Confirm-delete is rounded and quiet. Agents folders are a local overlay (DF-33).
- **Chrome** - The module rail has a small top inset. Chat/Agents pending orbs are 48px and centered. Image/Video pending stays hero. The `thinking-orbs` package is not a dependency.
- **Models identity** - Settings Models and the installer Models tab share collapse/sort (family collapse, hideBelowVram, over-budget last). Compact cards, highlighted Downloaded, picker order from that list.
- **Hub latest** - High-severity skills quarantine; clean skills apply; Active moves to the fetched tag. `PromptInjectionScanner` stays on. Pack-time snapshots still refuse a stale 3.12.0 catalog.

Known gaps: [docs/archive/v2/v2.2/known-gaps.md](../../docs/archive/v2/v2.2/known-gaps.md). Plan: [docs/archive/v2/v2.2/plans/v2.2.8-working-local-studio.md](../../docs/archive/v2/v2.2/plans/v2.2.8-working-local-studio.md).

### What's new in v2.2.7

Catalog context on both Models tabs, a shared composer Context meter with an 80% new-session suggestion, and messenger-style date, time, and token chrome on all four transcripts. Packaged Explorer soak, live GPU generate, and live Ollama usage remain unproven (DF-2, DF-4, DF-28 through DF-31).

- **Context chips** - Settings Models and the installer Models tab show catalog `contextWindow` as `128k` (or `32k / 8k` when split). Null windows omit the chip. Neither surface invents 128k or appends `in`.
- **Composer meter** - Chatbot, Agents, Images, and Videos place a pill Context bar under the typing area with the model picker to its right. Image/video rows use `visualTokenBudget` when there is no LLM window, and hide the bar if neither exists. At 80% the UI suggests a new session and must not wipe the current transcript.
- **Header cleanup** - Chatbot no longer shows a lone `/` breadcrumb or a unicode gear. Persona stays as a labeled footer control.
- **Transcript chrome** - One date heading per local day, a discrete clock on each bubble, user `N in`, assistant think+out (or an em dash when unknown). Missing timestamps skip the clock rather than showing Unix epoch.

Known gaps: [docs/archive/v2/v2.2/known-gaps.md](../../docs/archive/v2/v2.2/known-gaps.md). Plan: [docs/archive/v2/v2.2/plans/v2.2.7-context-meter-and-transcript-chrome.md](../../docs/archive/v2/v2.2/plans/v2.2.7-context-meter-and-transcript-chrome.md).

### What's new in v2.2.6

Named sessions and last-output memory for the studio pillars, plus Agents transcript restore. Packaged quit/reopen persist, live GPU generate, and packaged Explorer soak remain unproven (DF-25, DF-4, DF-2).

- **Image and Video history** - Images and Videos reuse the Chatbot folder tree against `studio.session.*` and `~/.nexus/generations/sessions.db`. Turns store paths, never PNG/MP4 blobs. Chatbot stays on `chat.explorer.*`.
- **Last-output follow-up** - An empty-attachment Image follow-up img2imgs the last PNG. An in-session Video follow-up sets existing `continueFrom`. After remount, Video cannot restore `continueFrom` (no `priorJobId` on the session row). Missing files show typed error text, not a blank complete.
- **Agents resume** - Opening a previous session hydrates user and assistant token text. Sessions list can rename and delete. Tool-call cards are not restored.
- **Chatbot remount** - Append-then-remount shows both bubbles and attachment `src`. A failed append keeps the bubble visible and says it was not saved.

Known gaps: [docs/archive/v2/v2.2/known-gaps.md](../../docs/archive/v2/v2.2/known-gaps.md). Plan: [docs/archive/v2/v2.2/plans/v2.2.6-session-memory-and-studio-history.md](../../docs/archive/v2/v2.2/plans/v2.2.6-session-memory-and-studio-history.md).

### What's new in v2.2.5

Field follow-on after v2.2.4 honesty: generation and catalog parity on a machine that already installed models. Live GPU generate and packaged Explorer soak remain unproven (DF-4, DF-2).

- **One model-id space** - catalog id, Ollama tag, and coding LLM id fold through `core/registry/modelAliases.ts`. Chat send of `gemma-4-12b-it-gguf` starts `gemma4:12b`. Unknown ids do not fall back to `gemma4:e4b`.
- **Diffusion fail-closed** - empty, 1x1, and `ok: false` payloads never look like a successful generate. SANA catalog ids call the registered Python methods. No GPU or weights returns a typed not-ready error.
- **Settings Models installer parity** - the list scrolls. Over-budget cards show Needs N GB VRAM, never Compatible. Cards show origin, release date, and Censored/Uncensored. Qwen 3.5 4B is Downloaded only when the tag is present; snapshot-selected missing tags show Retry.
- **Chat explorer chrome** - rename and delete icons on chat rows, reclick-to-rename, chats-pane collapse pill (24px expand target). Right-click stays.
- **Hub latest** - pack-time snapshot refuses a frozen 3.12.0 catalog when GitHub latest differs. Tests inject `NEXUS_HUB_LATEST_TAG`. Scanner allowlist reviewed against Hub v3.19.2; `PromptInjectionScanner` stays on.

Known gaps: [docs/archive/v2/v2.2/known-gaps.md](../../docs/archive/v2/v2.2/known-gaps.md). Plan: [docs/archive/v2/v2.2/plans/v2.2.5-first-successful-generation.md](../../docs/archive/v2/v2.2/plans/v2.2.5-first-successful-generation.md).

### What's new in v2.1.0

Open local-AI wave. Local-only. No new outbound destination. Vendor scores do not become default routes.

- **Muse Glimmer 30B** - Apache-2.0 Meta GGUF via Ollama `hf.co` (`muse-glimmer:30b` at 24 GB, Dynamic at 32 GB). Hidden below 16 GB VRAM and on Ollama older than 0.32.7. Harness profile `muse-glimmer` (detailed, thinking on, llama3-json).
- **Nemotron 3.5 Lightning 30B-A3B** - OpenMDW-1.1 worker (`nemotron-lightning:30b-a3b` native 24 GB, expert-offload at 16 GB). Pulls the Ollama library tag `nemotron-3.5-lightning:30b`. Hidden below 16 GB and on Ollama older than 0.32.9. Harness profile `lightning-worker` (concise, thinking off, qwen-json). Tagged `role: worker-candidate` for cheap-first routing.
- **Catalog flags** - `diffusion` (default false) and `codingEligible` (default true). `localEval` blocks are `not_run` this cycle; `recommended.json` is unchanged.
- **Adaptive routing** - cheap-first workers on Lightning, escalate to Muse on tool-error / identical-action / progress-free signals, GPU swap deferral when VRAM or diffusion would OOM, routing lane on the Traces tab.
- **Studio provenance and queue** - PNG `iTXt` plus `tEXt` alias and a content-hash index; Use Prompt / Use Seed / Use All / Remix; SQLite queue at `~/.nexus/generations/studio.db` with seed/prompt batches, restart recovery, and coding-over-diffusion pump.
- **Multimodal chat** - catalog `vision` plus a per-model visual-token budget. Gemma 4 12B accepts one image (or ffmpeg-sampled video frames). Chat indexes redacted multimodal surrogates and STT transcripts. Muse Glimmer is gated `vision: false` until its hf.co GGUF is proven to ship a projector.
- **Replace-the-X** - SAM2 Hiera Tiny (`sam2:hiera-tiny`, Apache-2.0 utility, hidden from the generator picker). "replace the car with a truck" segments then inpaints. Missing weights leave the original and ask you to install or paint a mask.
- **Fine-tuning** - Settings > Fine-tuning. Opt-in Unsloth Core (`unsloth` Apache-2.0 + `unsloth-zoo` LGPL). Dataset builder redacts secrets and can extract PDFs through the OCR spine. QLoRA jobs queue on the GPU scheduler. Studio/CLI extras are never installed. Live GPU train is local-only (`NEXUS_TUNING_LIVE=1`).
- **Audit log** - append-only SQLite at `~/.nexus/audit/audit.db`, Ed25519 per actor, Settings > Security viewer. Local-only. Tampered rows stay visible and untrusted. A notice appears when the OS keychain is unavailable.
- **JSON CLI** - `nexus session|models|generate` over `/nexus/*` on the sidecar loopback listener, same bearer token. The listener binds for JSON CLI even when Local API `/v1` is off. Schema errors exit 2 before any HTTP call. See [docs/archive/v2/v2.1/development/json-cli.md](../../docs/archive/v2/v2.1/development/json-cli.md).
- **Diffusion VRAM knobs** - Image Studio and Video Lab Advanced: cache VRAM/RAM caps, working reserve, layer streaming. Caps below the model minimum are rejected unless streaming is on.
- **DiffusionGemma** - watch item only (needs llama.cpp PR #24423 in a shipped Ollama release and sub-16 GB quants).

v2.0.0 already shipped the convergence cut. Known gaps: [docs/archive/v2/v2.1/known-gaps.md](../../docs/archive/v2/v2.1/known-gaps.md).

### What's new in v2.0.0

Convergence of the v1.18-v2.0 plan family. Local-only. No new outbound destination. Image, audio, and browser page bytes stay on the machine.

- **Chat vision and STT** - image attach follows catalog `modalities` including `image`. Audio files and the mic transcribe on-device via catalog `faster-whisper-large-v3`. Transcripts are labelled and secret-scrubbed.
- **Voice loop** - off by default (Local Chatbot **Voice loop** checkbox). Push-to-talk and button VAD. Spoken replies use catalog `kokoro-82m`. See CHANGELOG for activation, validation, rollback, and authority.
- **Coding browser tools** - `browser_navigate` / `browser_click` / `browser_type` / `browser_aria_snapshot` / `browser_close` at DANGEROUS over an isolated `~/.nexus/browser-profiles/` tree. Playwright is a local install, not a lockfile pin. Snapshots are provenance-labelled and injection-scanned.
- **Video Lab** - requested length longer than the tier clip chains segments. Talking-head (`audio2video`) is `diffusion-pro` only, official `longcat-video-avatar-1.5` INT8, explicit local-generation confirm. DiT inference is not vendored yet (DF-8).
- **Stretch** - `ProjectScope` (tightening-only), durable untrusted sandbox root, lesson/procedure memory kinds. Code-as-action, command router, and VRM pane transferred (DF-10-12).

v1.20.0 already shipped document ingest. Known gaps: [docs/archive/v2/v2.0/known-gaps.md](../../docs/archive/v2/v2.0/known-gaps.md).

### What's new in v1.20.0

Local document ingest on the existing OCR spine. No Docling. No new outbound destination. Parsed text is shown to you; it does not auto-enter a model prompt.

- **`parse_document` is live** - the existing agent tool is registered on sidecar, ACP, scheduler, and VS Code hosts when `nexus.coding.parseDocument.enabled` is on (sidecar: `NEXUS_PARSE_DOCUMENT=1` or the same key in `~/.nexus/settings.json`). Flag off keeps the tool absent. CONFIRM, redaction, and the inbound classifier still wrap it.
- **Office files parse natively** - `.docx` / `.pptx` / `.xlsx` use python-docx, python-pptx, and openpyxl. Magic bytes win over filename. Encrypted zip and OLE fail closed. Unsupported types return `unsupported-media` instead of being treated as one image.
- **Chat and Coding attach** - both composers accept PDF, images, and those Office types (`DOCUMENT_ACCEPT`). First attachment only (DF-4). Image Studio stays `image/*`.
- **Docling stays off the attach path** - Phase 4 bake-off is DEFER. RapidOCR library smoke ran on synthetic fixtures; catalog RapidOCR install and Unlimited-OCR remain DF-5. `runtimes/ocr/requirements.txt` still has no `docling` and no torch.

v1.19.2 already shipped catalog expansion. Known gaps stay in-progress.

### What's new in v1.19.2

Catalog and model plumbing for the v2.0.0 consumers. Local-only. No new outbound surfaces. sha256 pinning is unchanged. Unofficial community quants are rejected.

- **Modalities** - every catalog row declares input `modalities` (`text` / `image` / `audio`). Chat attachment gating in v2.0.0 reads this field. Video rows also declare `audioConditioning` (disabled until avatar models land).
- **Weight variants** - a catalog entry can list official fp16 / int8 / fp8 / GGUF lines, each with its own file list and sha256. The installer puller selects one (VRAM default or `NEXUS_WEIGHTS_VARIANT`). Community re-quants fail closed.
- **Hermes 3** - `hermes3:8b` and `hermes3:70b` in the Agentic catalog (Ollama library, Llama 3.1 Community License). Harness profile `hermes-agentic` uses llama3-json. The live coding loop still parses Gemma XML (v1.19.2 DF-3). `hermes3:70b` is not a recommended default.
- **Inkling-Small** - opt-in patient-tier GGUF (74.8 GB, Apache-2.0). Visible only when the patient tier is on. Shipped `modalities: ["text"]` because GGUF multimodal is unverified. Never a `recommended.json` default.
- **Patient-tier honesty** - warning floor is ~0.03 tok/s (~32 s/token laptop). RAM-budget presets (`laptop` / `workstation` / `max`) are copy only. Nexus does not bundle the offload runtime.

v1.19.1 already shipped loop hardening. Known gaps stay in-progress.

### What's new in v1.19.1

Agent-loop and guardrail hardening. Local-only. No new outbound surfaces. The coding agent cannot run away on a long auto-mode job, and Unattended is not a no-floor mode.

- **Skill-native wins** - Hub `deep-research-compilation` verifies quotes against fetched text. `prompt-engineering` / `creative-generation` carry persona-card, avatar-prep, and transcript-reasoning guidance. Mapping note: [skill-native-adoptions-v1.19.1.md](../../docs/reference/skill-native-adoptions-v1.19.1.md).
- **Hard denials** - recursive deletes, git history rewrites, and DROP/TRUNCATE SQL are blocked in every posture before confirmation.
- **LoopGuards** - identical-call veto, no-action budget, error-burst, bounded queue, 60-iteration ceiling. Shared with the existing LoopDetector.
- **Security posture** - Strict / Standard / Unattended (`nexus.coding.securityPosture`, default Standard). Unattended skips CONFIRM prompts only. DANGEROUS tools still confirm. Hard-denied commands never run.
- **Provenance and recovery** - tool results carry an origin label; web / MCP origins are always screened. Spill files are secret-scrubbed. Already-applied edits report success-noop. Empty grep returns near-miss probes.
- **DNS pin** - SSRF fetches connect to the first validated public address, not a re-resolved name.
- **watch_path / hash_file** - read-only workspace tools. Tool prompt docs are generated from the live registry.

v1.19.0 already shipped LFM2.5-2.6B as the low-VRAM Agentic pick. Known gaps stay in-progress.
