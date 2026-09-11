# Known Gaps - v2.4

**Project**: Nexus AI Studio
**Status**: in-progress
**Last updated**: 2026-09-10

Per-version tracker of unfinished work, deferrals, and follow-ups. The next plan ingests this file to decide what carries forward. Classifications: `NI` not-implemented, `DF` deferred, `BG` bug/known-issue, `MT` missing-tests/coverage, `WN` warning/suppressed, `QG` bypassed-gate/CI.

Plans: [v2.4.0 adoption](plans/v2.4.0-adoption-unsloth-qwen38-gaussian-splatting.md), [v2.4.1 field reliability](plans/v2.4.1-field-reliability-chat-archives-models-workspaces.md), [v2.4.1 generation recovery](plans/v2.4.1-generation-recovery-and-ui-corrections.md), [v2.4.2 field UI and generation](plans/v2.4.2-field-ui-history-and-generation.md), [v2.4.3 field density](plans/v2.4.3-field-density-identity-and-runtime.md), [v2.4.4 field chrome, restyle, SANA, density](plans/v2.4.4-field-chrome-restyle-sana-and-density.md), [v2.4.5 installer already-downloaded models](plans/v2.4.5-installer-already-downloaded-models.md), [v2.4.6 field delivery, density, and session identity](plans/v2.4.6-field-delivery-density-and-session-identity.md), [v2.4.7 installer wizard density and scope](plans/v2.4.7-installer-wizard-density-and-scope.md), [v2.4.8 desktop token split, persona, and model order](plans/v2.4.8-desktop-token-split-persona-and-model-order.md), [v2.4.9 VoiceStudio field-discipline adoption](plans/v2.4.9-adoption-voicestudio-field-discipline.md)

## v2.4.9

### Summary

| Category | Open | Resolved |
|---|---:|---:|
| Not implemented (NI) | 1 | 0 |
| Deferred (DF) | 2 | 3 |
| Bugs / regressions (BG) | 4 | 11 |
| Warnings (WN) | 1 | 1 |
| Missing tests / coverage gaps (MT) | 2 | 2 |
| Quality-gate gaps (QG) | 3 | 0 |

Operator-driven UX cycle against nine screenshots and three live failures from the packaged v2.4.8 build, plus an installer round. Not a planned phase set: every item traces to something the operator saw. Two live failures shared one root cause (the studio forms offered settings the selected model could not honour), which is what `desktop/src/shared/studio/modelCapabilities.ts` now exists to prevent. Nothing here has been published; the branch is uncommitted-then-committed local work awaiting integration.

From 2026-09-10 this subsection also carries the [v2.4.9 VoiceStudio field-discipline plan](plans/v2.4.9-adoption-voicestudio-field-discipline.md). Its D1 decision split the migration-durability slice into [v2.5.0](../v2.5/plans/v2.5.0-migration-durability.md), so Definition-of-Done clause 5 is deferred scope for this release rather than a miss. Phase 1 items are appended below.

### Resolved

- **BG-5 (resolved)** - A 4096x4096 image request failed instantly with a raw Zod dump in the transcript. Resolution options were gated on the HOST VRAM TIER while `desktop/sidecar/src/protocol.ts:709` caps width and height at 2048, so 4K could never have succeeded on any machine. Capability is now a property of the model (`modelCapabilities.ts`), and the tier is a second filter rather than the only one. `desktop/tests/modelCapabilities.test.ts`.
- **BG-6 (resolved)** - Wan 2.1 T2V 1.3B accepted 720p / 8 s and failed after ten minutes. Its catalog entry declares a 480p local path, `maxVideoFrames: 81` and `maxVideoSeconds: 5`. The model's own limits now bound resolution, fps and duration, and duration became a dropdown narrowed by frame budget rather than a free number field. `desktop/tests/modelCapabilities.test.ts`, `desktop/tests/VideoLabPage.test.tsx`.
- **BG-7 (resolved)** - The generation progress bar changed width mid-run: it was sized `${widest}ch` from the longest caption under it. Replaced with a fixed track. A SECOND layer of the same defect survived the first fix and was caught only by a rendered screenshot (see WN-2 below).
- **BG-8 (resolved)** - A cold image model showed a bare caption for ~37 s and then a bar with ~1 s left, because the bar rendered only once a byte fraction existed. It now renders immediately as an indeterminate particle sweep.
- **BG-9 (resolved)** - A VIDEO timeout told the operator to "Check Ollama is running". Ollama serves chat, not diffusion. `generationError.ts` classifies per surface. `desktop/tests/generationError.test.ts`.
- **BG-10 (resolved)** - The image lightbox's Fullscreen targeted a ref captured during render (frequently null) and its Download was an `<a download>` the Electron renderer ignores for a large data URL, so "most buttons are not working" was literally true. Replaced by `ImageViewer` with an object-URL save path.
- **DF-6 (resolved)** - The v2.4.8 deferral "Video2X enhancement panel redesign" is superseded: the panel was replaced by three plain controls in `57b24967`, and this cycle moved the surrounding studio settings onto the composer row.

- **BG-11 (resolved)** - The Hub catalog snapshot was refused on EVERY installer build: `catalog tag 4.9.0 is not latest (v4.9.0)`, naming the same release twice. The synced catalog writes a bare semver into `nexus-hub-version.json` while GitHub's `/releases/latest` returns a `v`-prefixed `tag_name`, and the check was a raw `!=`. Every shipped installer therefore carried NO embedded snapshot and silently fell back to an install-time sync, which is exactly the offline-install hole the snapshot exists to close. `normalize_tag` now compares releases. The pre-existing suite could not catch it: its fixture wrote `"v9.9.9"`, a prefixed form the real producer never emits. `scripts/installer/tests/test_build_hub_snapshot.py`.
- **BG-12 (resolved)** - Placeholder HF weight pins: 12 of 107 weight files shipped with a `0000...` sha256 and therefore skipped hash verification. 9 are now pinned - 4 from the LFS `oid` the tree API exposes, and 5 small non-LFS files (a config, an index, two `modeling_*.py`) via a new resolve-and-hash fallback, because those files are parsed or EXECUTED at load time and leaving them unverified was not cosmetic. `pin-hf-weights.py` gained `digest_by_download` with an 8 MB cap. Confirmed on a fresh build: the snapshot now embeds (`Snapshot built from ~/.nexus-ai/catalog`, 3301 KB) and the exe grew 239.5 -> 242.7 MB, which is the snapshot's own size, and the pin log reads 3 of 107 instead of 12.
- **BG-13 (resolved)** - Sharpness was double-counted in every exported image. `adjustmentFilter` folded it in as a contrast lift AND the export applied the real convolution on top. Sharpness now lives in exactly one place, and `renderAdjusted` is shared by the preview and the export.
- **WN-1 (resolved)** - Sharpness preview no longer approximates. While sharpening, the viewer renders the export's own `renderAdjusted` into a canvas (debounced 90 ms) instead of faking it with contrast; at sharpness 0 the `<img>` plus a CSS filter is pixel-identical to the export and stays instant.
- **MT-8 (resolved)** - The capability map is now asserted against the catalog: every image/video model must have an explicit entry, and no model may advertise more frames or a longer clip than its `visualTokenBudget`. It caught a real error on its first run (LongCat declared at 121 frames against a catalog budget of 8) and surfaced a catalog data defect, recorded as BG-14 below.
- **MT-9 (resolved)** - `SIDECAR_MAX_IMAGE_DIMENSION` is now checked against the Zod cap parsed out of `desktop/sidecar/src/protocol.ts`, so raising the sidecar cap fails the test instead of leaving the UI behind.
- **DF-7 (resolved)** - The video mode selector is gated on `supportsImageToVideo`: a text-to-video checkpoint no longer offers Image -> Video behind the gear.
- **DF-8 (resolved)** - The image negative prompt is disabled with its reason on a model that ignores it, and the LoRAs / ControlNet section is not rendered at all for a model supporting neither.

- **BG-17 (resolved)** - The v2.4.8 image-path VRAM handoff released nothing. `image_execute` called `vram_lifecycle.release_vram()` from a `finally` in the SAME frame that still held `pipe`, and the success path returns from inside that `try`, so the frame was alive and the weights were still reachable when the sweep ran. `torch.cuda.empty_cache()` returns only allocator blocks no live tensor holds, so it freed the transient activations and left the SDXL-class weights resident, which is the opposite of what the block's own comment claimed. The chat model still could not come back onto the GPU. A second defect compounded it: `_empty_cache()` ran `empty_cache()` BEFORE `gc.collect()`, skipping everything the collector was about to free, including a pipeline held alive only by the reference cycle a diffusers pipeline normally forms. Fixed by dropping `pipe` and `result` before the sweep and by collecting before emptying. The video path never had the bug: it runs the pipeline in a nested frame that has already exited when `vram_scope` sweeps. `tests/python/diffusion/test_vram_release_regression.py` proves both halves with a weakref and a call-order assertion, and both fail against pre-change code. Found by `nexus-standards-judge` reviewing the v2.4.8 range; fixed out of plan by operator decision.
- **BG-18 (resolved)** - The v2.4.8 Ollama eviction asked about the wrong model. `evictOllamaForJob(job.pillar)` discarded the job's model identity and the fit test used a per-pillar constant, `{ image: 6.9, video: 8 }`, while `catalog.json` declares image floors from 2 to 20 GB and video floors from 12 to 24 GB. Decisive case: a 24 GB host with a chat model resident holding 12 GB reports 12 GB free; a `wan2.2-ti2v-5b` job (catalog `vramGB` 24) was tested as 8, `12 >= 8 * 1.5` passed, nothing was evicted, and the runtime then chose its offload strategy against 12 GB free for a 24 GB floor -- exactly the CPU-offload path the eviction exists to prevent. Same shape for `sana-1.6b-4k` (20), `sana-1.6b-2k` (12) and `wan2.1-t2v-1.3b` (13, the pre-ticked 16 GB video default). Fixed by resolving the job's own `modelId` against the catalog, keeping the pillar figure only as a fallback for an unknown model or an unreadable catalog. Extracted to `desktop/sidecar/src/models/mediaModelVram.ts` so it is testable without test-only exports. `desktop/tests/media-model-vram.test.ts` asserts the real catalog floors and both sides of the decisive case in one run. Found by `nexus-standards-judge`; fixed out of plan by operator decision.

### Open Items

##### QG-1 - No end-to-end run against a real GPU job

- **Source**: this cycle, all rounds
- **Impact**: Every change is verified by typecheck, lint, build, unit tests and a rendered screenshot harness. NONE of it has been exercised against a live generation on the operator's hardware. Specifically, the capability caps have not been observed PREVENTING a real failure, only shown to produce the right option lists.
- **Owner**: Operator
- **Next step**: On Videos with Wan 2.1 selected, confirm the duration dropdown offers only 2-5 s and resolution only 480p, then generate one clip and check the bracketed time matches the wall clock. Then repeat one image generation and open the viewer.

##### WN-2 - jsdom cannot see CSS math functions, so width regressions are untestable in unit tests

- **Source**: this cycle, progress bar
- **Impact**: jsdom's `cssstyle` silently drops `min()` / `clamp()` from inline styles, so a `width: min(22rem, 100%)` is invisible to a test assertion. This is why the SECOND width regression (a `fit-content` parent leaking caption length back into the bar) passed the whole unit suite and was caught only by rendering the component and looking at it. Mitigated in the touched files by using `width` + `max-width` pairs instead of `min()`, but the blind spot remains repo-wide.
- **Owner**: Mitigated, not closed
- **Next step**: `desktop/tests/inlineStyleMathGuard.test.ts` now fails if `width` or `minWidth` uses `min()` / `max()` / `clamp()` in the three files whose geometry is asserted, and it self-retires (a test fails) if jsdom ever learns to parse them. `max-width` caps are deliberately exempt: a cap can only shrink an element, so it cannot produce the containing-block bug, and banning it would force less correct fixed values purely to satisfy the harness. The real fix is a browser-based visual check in CI, which this repo does not have.

##### NI-1 - The two model registries are not tested against each other

- **Source**: v2.4.9 Phase 1 (sub-task 1.1)
- **Plan reference**: [v2.4.9 plan](plans/v2.4.9-adoption-voicestudio-field-discipline.md), Phase 1; recorded as OQ-1 to OQ-4 in [docs/reference/model-acceptance.md](../../reference/model-acceptance.md)
- **Impact**: Building the job map surfaced a two-sided divergence nothing guards. Eight `core/registry/ModelCatalog.ts` format bindings have no installable `catalog.json` entry (`llama3.1:8b`, `llama3.2:3b`, `llama3.3:70b`, `qwen2.5:7b`, `qwen2.5-coder:7b`, `deepseek-coder:6.7b`, `hermes3:8b`, `hermes3:70b`) and five installable LLMs have no binding (`gemma4:e2b`, `gemma-4-12b-it-gguf`, `gemma4:26b`, `gemma4:31b`, `inkling-small`), three of which are the pre-ticked chat default on the cpu, 12/16 and 24 GB tiers. The sharp end is concrete rather than cosmetic: `inkling-small` has `family: "inkling"` and `agentic: true`, so `modules/coding/llm/parseAgentToolCalls.ts:23` falls through to `?? "gemma4-xml"` and parses its tool calls with a Gemma grammar. `ModelFamily` cannot even express `inkling`, so binding it needs a type change. `tests/unit/core/registry/ModelCatalog.test.ts` asserts sync against `core/registry/models.json` only, which is why both directions are invisible.
- **Reason not done in this cycle**: Phase 1's scope is two documents and an agent definition. Reconciling the registries is a code change to the coding runtime with its own decision (are the eight dead bindings or missing catalog entries?) and is not a field-discipline item.
- **Owner**: Unassigned
- **Exit condition**: A test asserts `catalog.json` LLM entries and `ModelCatalog.ts` bindings against each other, and each of the 13 divergent ids is either bound, removed, or recorded as deliberately unbound. Evaluable by running that test.
- **Suggested next step**: Decide the eight bindings' status first, since that decides whether the test asserts equality or a documented subset.

##### MT-11 - The standards judge was never dispatched through the agent registry

- **Source**: v2.4.9 Phase 1 (sub-task 1.4)
- **Plan reference**: [v2.4.9 plan](plans/v2.4.9-adoption-voicestudio-field-discipline.md), Phase 1 Verification Expectation
- **Impact**: `.claude/agents/nexus-standards-judge.md` was created mid-session, after the agent registry had loaded, so `nexus-standards-judge` was not a dispatchable agent type. The Verification Expectation was satisfied by handing the definition to a general-purpose agent and instructing it to adopt the file verbatim, which exercised the definition's CONTENT but not the harness's lookup of it. The frontmatter (`name`, `tools: Bash, Read, Grep, Glob`, `model: opus`) is therefore unverified: a malformed field, a rejected tool name, or a wrong `model` value would not have surfaced.
- **Owner**: Operator or next cycle
- **Exit condition**: In a session started after this commit, dispatch `nexus-standards-judge` by name against any pinned range and confirm it returns the verdict format with the declared tool scope. One invocation closes it.
- **Suggested next step**: Do it at the start of Phase 2, which needs a review anyway; the tool scope also gets exercised there because Phase 2's evidence rests on locally-run counts.

##### DF-9 - `prompt-*` budget checks still do not cover `.claude/`

- **Source**: v2.4.9 Phase 1 (sub-task 1.2), confirming pre-existing gap 10.N.H
- **Plan reference**: [v2.4.9 plan](plans/v2.4.9-adoption-voicestudio-field-discipline.md), Phase 1; required by AGENTS.md "## Claude Code addenda"
- **Impact**: AGENTS.md requires that adding a file under `.claude/agents/` be accompanied by confirming the `prompt-*` rule globs cover the new path. Confirmed they do not: `lib/checks/prompt-oversized.mjs:72-73` scopes to `modules/coding/chat/prompts/` and `modules/coding/skills/catalog/**/SKILL.md`. So `nexus-standards-judge.md` has no prompt-size budget, and neither do the four older `.claude/agents/` files. Two `modules/coding/skills/catalog` prompts already exceed the 800-token budget as warnings, so the check does find real drift where it is pointed.
- **Reason not done in this cycle**: Extending the glob is outside Phase 1's stated scope, and the extension is already tracked as 10.N.H under v0.9.0. Recording it here keeps the AGENTS.md obligation discharged without silently widening a check.
- **Owner**: Inherited from 10.N.H
- **Exit condition**: `check:prompts` reports a budget line for at least one `.claude/agents/` file, or 10.N.H is closed with a recorded decision that `.claude/` is deliberately exempt.
- **Suggested next step**: Fold into the Phase 5.5 terminal CI/CD reconciliation, where the check surface is being compared anyway.

##### BG-16 - 216 stale relative links in the living `docs/DEVLOG.md`

- **Source**: v2.4.9 Phase 1 (sub-task 1.4 link verification)
- **Plan reference**: [v2.4.9 plan](plans/v2.4.9-adoption-voicestudio-field-discipline.md), Phase 1; surfaced incidentally while verifying this phase's own links
- **Impact**: A link check over `docs/DEVLOG.md` resolves 216 relative targets to files that do not exist. They are historical entries written before two renames: `src/` to `modules/coding/` (for example `../src/chat/PromptBuilder.ts`, `../src/guardrails/PermissionTiers.ts`) and `scripts/installer/pyqt/` to `scripts/installer/` (for example `../scripts/installer/pyqt/src/nexus_installer/constants.py`), plus the Gemma Code to Nexus product rename (`../src/panels/GemmaCodePanel.ts`). DEVLOG is a living document and its own index lines are how a reader navigates to the code a milestone changed, so the navigation is broken for every entry older than those renames. Nothing detects this: `check:docs-layout` validates directory shape, not link targets.
- **Reason not done in this cycle**: Phase 1 delivers two documents and an agent definition. Repairing 216 historical links is a mechanical but unbounded edit across the whole file, and rewriting historical entries to point at current paths is itself a decision (a milestone's links arguably should resolve to what existed then). All 55 relative links in this phase's own files were verified and resolve.
- **Owner**: Unassigned
- **Exit condition**: A committed link checker over the living docs roots reports zero unresolved relative targets, or DEVLOG's pre-rename entries carry a stated convention (a note that historical paths are as-written and not maintained) that the checker honours. Evaluable by running the checker.
- **Suggested next step**: Decide the convention before repairing anything, since it determines whether the fix is 216 rewrites or one documented exemption plus a checker.

##### BG-19 - `npm audit (production deps)` is red, and `sharp` has no fix

- **Source**: v2.4.9 Phase 2 (sub-task 2.5, while selecting required checks)
- **Plan reference**: [v2.4.9 plan](plans/v2.4.9-adoption-voicestudio-field-discipline.md), Phase 2
- **Impact**: The `npm audit (production deps)` job has been failing on `develop` since `f8185e38`, and it is the ONLY failing job in that CI run. Reproduced locally: 8 production vulnerabilities (1 low, 2 moderate, 5 high). The blocking one is `sharp <=0.35.4-rc.0`, reached transitively through `@huggingface/transformers`, carrying inherited libvips advisories (CVE-2026-33327, CVE-2026-33328, CVE-2026-35590, CVE-2026-35591) and libheif advisories (GHSA-g89c-p67h-r497, GHSA-2jg2-4ch7-h545), with **no fix available**. `hono` and `protobufjs` findings do have fixes. Because the job is red, it could not be added to the branch protection required-check set applied in this phase, so the one production-dependency gate the repository has is also the one gate that is not enforced.
- **Reason not done in this cycle**: The Non-Goals table excludes remediating what the visibility work surfaces, and the decisive dependency has no upstream fix, so the remedy is an override, a replacement for `@huggingface/transformers`, or an accepted risk -- each a decision, not a patch.
- **Owner**: Unassigned
- **Exit condition**: `npm audit --omit=dev` exits zero, or the residual advisories are recorded as accepted with a dated review, and `npm audit (production deps)` joins the required-check set. Evaluable by running the command.
- **Suggested next step**: Run `npm audit fix` for `hono` and `protobufjs` first, since those are free, then decide `sharp` separately on its own merits.

##### QG-2 - Two gating checks are not yet in the required-check set

- **Source**: v2.4.9 Phase 2 (sub-task 2.5)
- **Plan reference**: [v2.4.9 plan](plans/v2.4.9-adoption-voicestudio-field-discipline.md), Phase 2, D2
- **Impact**: D2 made `gitleaks` and `pip-audit (model runtimes)` gating at the workflow level, so a finding turns their run red. Neither is in the branch-protection required-check list applied in this phase, because neither has executed once and requiring a check that has never produced a run leaves it permanently pending and blocks every merge. Until they are added, a red run on either is visible but does not block a merge.
- **Owner**: Operator, at the integration pull request
- **Exit condition**: Both checks show one green run on the integration pull request, then both context names are added to the required list on `develop` and `main`. Evaluable by reading `gh api repos/:owner/:repo/branches/<b>/protection`.
- **Suggested next step**: Do it during 5.10, where the integration pull request produces the first runs anyway.

##### QG-3 - Required checks are 17 individual contexts, not an aggregate gate

- **Source**: v2.4.9 Phase 2 (sub-task 2.5)
- **Plan reference**: [v2.4.9 plan](plans/v2.4.9-adoption-voicestudio-field-discipline.md), Phase 5.5 terminal CI/CD reconciliation
- **Impact**: Branch protection now lists 17 individual check contexts. The canonical CI/CD contract expects a single always-resolving aggregate required check instead. The difference is not cosmetic: three workflows are path-filtered on pull requests (`installer-tests.yml`, `installer-smoke.yml`, `shell-build.yml`), so they produce no check at all on a pull request outside their filter and **cannot be required individually without blocking every unrelated merge**. Those three are therefore unguarded by protection today. An aggregate job that always runs and resolves its dependencies' skip states is the pattern that closes this, and adding a required context also has to stay in step with any future job rename.
- **Reason not done in this cycle**: Authoring an aggregate gate is a pipeline-topology change, and the Non-Goals table excludes applying unreconciled canonical-contract fields. Phase 5.5 is where the comparison happens.
- **Owner**: Phase 5.5
- **Exit condition**: One required context that always resolves, covering the path-filtered workflows through their skip states. Evaluable by opening a pull request that touches no installer path and confirming the aggregate still resolves.
- **Suggested next step**: Compare against the contract in 5.5 before adding more individual contexts, so the list does not grow into something that has to be unwound.

##### DF-10 - The feature inventory covers two README regions, not the whole file

- **Source**: v2.4.9 Phase 3 (sub-task 3.1, decision D3 part B)
- **Plan reference**: [v2.4.9 plan](plans/v2.4.9-adoption-voicestudio-field-discipline.md), Phase 3; contract in [docs/reference/feature-inventory.md](../../reference/feature-inventory.md)
- **Impact**: `check-feature-drift.mjs` enforces 29 names across `## The Four Pillars` and `## Featured Capabilities`. Features named elsewhere in `README.md` are outside the contract and can be deleted from the tree without CI noticing: `### CLI tools (already shipped)` (line 340), `## Quick Start (developer workflow)`, and `## Roadmap`. The bound is deliberate -- the regions must exclude the ~180-line changelog, whose prose names features and would otherwise produce false passes -- but the consequence is that "a CI run fails when a feature named in README.md no longer exists" is true for those two regions and not for the rest of the file.
- **Reason not done in this cycle**: Widening coverage means deciding, per additional region, what counts as a feature claim. `### CLI tools` lists commands rather than features and `## Roadmap` names things that deliberately do NOT exist yet, so a naive widening would turn the roadmap into a set of failing assertions.
- **Owner**: Unassigned
- **Exit condition**: Either an additional region is added to `REGIONS` in the checker with its own entries, or this document records the decision that the two regions are the whole contract and the others are prose. Evaluable by reading the checker's `REGIONS` map against the README's `## ` headings.
- **Suggested next step**: `### CLI tools (already shipped)` is the strongest candidate, since "already shipped" is exactly the claim this gate exists to keep honest.

## v2.4.8

### Summary

| Category | Open | Resolved |
|---|---:|---:|
| Not implemented (NI) | 0 | 0 |
| Deferred (DF) | 5 | 0 |
| Bugs / regressions (BG) | 0 | 4 |
| Warnings (WN) | 0 | 0 |
| Missing tests / coverage gaps (MT) | 7 | 0 |
| Quality-gate gaps (QG) | 0 | 0 |

Phases 1-5 implemented against five operator screenshots of the v2.4.7 desktop. Three were correctness defects (double-counted reasoning tokens, an installer snapshot that named an embedding model as the Chat pick and an untagged model as the Agentic pick, and a Settings tab order that had drifted from the installer); two were chrome and dismissal feedback. Every earlier open row carries forward. Publication and release wait on explicit approval.

### Resolved

- **BG-1 (resolved)** - Reasoning tokens double-counted: Ollama `eval_count` already includes thinking; the sidecar added a bytes/4 estimate on top. Phase 1 splits the provider total by text proportion. `desktop/tests/serving-chatCore.test.ts`.
- **BG-2 (resolved)** - Installer snapshot recommendation ignored catalog tier and mapped embeddings to Chat, so Agents defaulted to gpt-oss 20B. Phase 5 fixes `runtime_provisioner._recommended_by_task` and makes the desktop default catalog-endorsed. `scripts/installer/tests/test_runtime_provisioner.py`, `desktop/tests/selection-policy.test.ts`.
- **BG-3 (resolved)** - Settings tab order drifted from the installer (Document last). Phase 4 pins both sides to `tests/fixtures/v2.4.8-catalog-tab-order.json`.
- **BG-4 (resolved)** - Video generation failed with `module 'torch.nn' has no attribute 'RMSNorm'`: both media lock files pinned torch 2.3.0 while diffusers 0.36's SANA-Video needs 2.4+, and no readiness layer checked the version. Phase 8 pins 2.5.1 cu121 with verified wheels and adds a 2.4 floor to the installer smoke, the sidecar status, and the runtime readiness. `scripts/installer/tests/test_media_runtime_contract.py`, `desktop/tests/diffusion-runtime-factory.test.ts`, `tests/python/diffusion/test_real_execute.py`.

### Open Items

##### MT-10 - `video2x-adapter.test.ts` is flaky under full-suite load

- **Source**: this cycle, observed while re-establishing the test baseline
- **Impact**: One case in `desktop/tests/video2x-adapter.test.ts` fails intermittently in a FULL `vitest run` (2 of 3 runs) and passes every time the file runs alone. It imports nothing changed this cycle (`node:crypto`, `fs`, `path`, `SettingsStore`, a temp-dir helper), was last touched in v2.3.0, and uses real filesystem temp directories with timing-sensitive waits - consistent with temp-dir or scheduling contention on Windows under parallel load. It is therefore a pre-existing test-quality defect, not a regression, but it means the "36-failure baseline" for this host is really "36 plus an intermittent 37th".
- **Owner**: Open
- **Next step**: Identify the specific case (the JSON reporter shows the file but the run that captured names passed), then either isolate its temp dir per test or mark the file `sequential`.

##### BG-14 - Two catalog video entries declare an incoherent frame budget

- **Source**: this cycle, MT-8's new catalog assertion
- **Impact**: `longcat-video-avatar-1.5` and `sana-video-2b-720p` both declare `maxVideoFrames: 8` with `maxVideoSeconds: 8` - one frame per second, which is not a video. The two Wan entries are coherent by contrast (121/5 is 24 fps, 81/5 is 16 fps), so the field is meaningful where it was filled in properly and a placeholder here. The capability map keeps conservative hand-set values for the two, and the test carries a named allowlist so a correction (or a new model with the same placeholder) fails loudly rather than passing.
- **Owner**: Open
- **Next step**: Establish the real frame limits for both checkpoints, correct `core/registry/catalog.json`, then delete the allowlist entry in `modelCapabilities.test.ts`.

##### BG-15 - Three SANA ControlNet repos are gated, so they can be neither pinned nor downloaded

- **Source**: this cycle, BG-12's pin sweep
- **Impact**: `Efficient-Large-Model/SANA-ControlNet-{Canny,Depth,Pose}` return HTTP 401 on the model-info endpoint itself, not 404, so the repos exist but require Hugging Face credentials. Their three weight files are the last unpinned entries (3 of 107). The wider consequence is not the pin: if a user ever enables one of these ControlNets, the DOWNLOAD will 401 too. They are `type: controlnet` with no `task`, so they do not appear in the model picker and no user has hit this yet.
- **Owner**: Open
- **Next step**: Decide whether these belong in the catalog at all. Pinning them would require shipping or prompting for an HF token, which breaches the local-first, zero-credential posture; the honest alternatives are to drop the three entries or to mark them as requiring user-supplied credentials.

##### MT-1 - Packaged token label is not observed

- **Source phase**: Phase 1 - Token split
- **Impact**: Tests pin the screenshot case (215 thinking bytes, 32 reply bytes, `eval_count: 72` -> 63 / 9) and the sum invariant. No packaged turn has been observed since.
- **Owner**: Operator, this cycle's installer rebuild
- **Next step**: Operator item 1 in `last-phase-evidence-v2.4.8-desktop-corrections.md`.

##### MT-2 - Packaged composer dismissal and Persona chrome are not observed

- **Source phase**: Phase 2
- **Impact**: jsdom pointer and Escape events prove the hook; a real Tauri webview pointer has not.
- **Owner**: Operator, this cycle's installer rebuild
- **Next step**: Operator items 2-3.

##### MT-3 - Packaged Sessions title is not observed on all four pillars

- **Source phase**: Phase 3
- **Impact**: Tests pin copy and tokens on FolderTree and both studio panes; the packaged Agents pane title is asserted only through CodingPage copy.
- **Owner**: Operator, this cycle's installer rebuild
- **Next step**: Operator item 4.

##### MT-4 - Packaged Settings card is not compared against the packaged installer picker side by side

- **Source phase**: Phase 4
- **Impact**: Parity is asserted on values (tab order, colors, pill order) and on structure, not on rendered pixels. Font family differs by platform (Qt `FONT_PRIMARY` vs. the app's `--font-sans` stack) and is not asserted.
- **Owner**: Operator, this cycle's installer rebuild
- **Next step**: Operator item 5.

##### MT-5 - Packaged picker order and default are not observed after a fresh snapshot

- **Source phase**: Phase 5
- **Impact**: The desktop rule is proven against the stale on-disk snapshot; the installer's corrected writer is proven in pytest. The two have not been observed together on the operator host.
- **Owner**: Operator, this cycle's installer rebuild
- **Next step**: Operator items 6-7, then `type ~/.nexus/selected-models.json` to confirm `recommendedByTask.chat` and `.agentic` read `gemma-4-12b-it-gguf`.

##### MT-6 - Packaged Phase 7 card cluster and collapsible groups are not observed

- **Source phase**: Phase 7 (added 2026-09-07)
- **Impact**: Tests pin size-then-action in the title row, the absence of star / checkmark / action row, the three headings with counts, collapse per tab, and disabled incompatible cards. None of it has rendered in the packaged desktop.
- **Owner**: Operator, this cycle's second installer rebuild
- **Next step**: Operator items 8-9 in `last-phase-evidence-v2.4.8-desktop-corrections.md`.

##### MT-7 - Packaged Phase 8 surfaces are not observed

- **Source phase**: Phase 8 (added 2026-09-07)
- **Impact**: Tests pin the torch floor on three layers, the `loading` / `generating` stages, the `Loading model...` bubble state, the centered composer cluster, and the footer copy. No packaged install has yet reprovisioned the venv to torch 2.5.1 or generated a video on it.
- **Owner**: Operator, this cycle's third installer rebuild
- **Next step**: Operator items 10-15 in `last-phase-evidence-v2.4.8-desktop-corrections.md`.

##### DF-5 - The stale torch 2.3.0 venv is repaired only by a reinstall or a Settings > Video Repair

- **Source phase**: Phase 8
- **Impact**: The desktop now reports the stale venv as repairable and offers Repair; the runtime refuses to generate with a typed message. Nothing upgrades the venv automatically. The wheel download is about 2.4 GB on Windows.
- **Owner**: Operator
- **Next step**: Re-run the rebuilt installer (the changed manifest fingerprint reprovisions) or press Repair in Settings > Video.

##### DF-4 - Settings no longer offers a way to set or clear a favorite model

- **Source phase**: Phase 7
- **Impact**: The star was the only Settings control for a favorite. Pickers still write a favorite on every model change and `resolveDefaultId` still honors it, so a favorite once set cannot be cleared from the UI.
- **Owner**: Next desktop cycle
- **Next step**: Decide whether favorites are dropped entirely (remove `writeFavorite` from the pickers) or get a small control on the picker itself.

##### DF-1 - The inferred reasoning / output split is not flagged in the tooltip

- **Source phase**: Phase 1
- **Impact**: When the provider gives only a total, the split is proportional and estimated while the total is exact. No protocol field carries "split inferred", so the tooltip states both numbers plainly.
- **Owner**: Next desktop cycle
- **Next step**: Add an optional `reasoningSplit: "provider" | "inferred"` to the `done` event and render `~` on inferred parts.

##### DF-2 - Uncommitted installer wizard-merge state rides in the rebuilt installer

- **Source phase**: Phase 6
- **Impact**: `develop` carries 30 modified and 6 untracked files (installer wizard merge rounds 1-3, recorded only in `docs/todos.md`). This plan neither staged nor reverted them; the rebuilt `NexusSetup.exe` includes them, as did the installer the operator already field-tested.
- **Owner**: Operator
- **Next step**: Decide whether the wizard merge becomes its own plan and commit, or is discarded, before v2.4.8 publishes.

##### DF-3 - Stale `recommendedByTask` on already-installed hosts is only masked, not rewritten

- **Source phase**: Phase 5
- **Impact**: The desktop rule keeps pickers and defaults correct against the stale snapshot; the file itself still says `chat: embeddinggemma` until the installer runs again. Settings downloads append to it without correcting it.
- **Owner**: Next desktop cycle
- **Next step**: Have the sidecar's `loadOrMigrate` drop a `recommendedByTask` entry whose model is not on the task's tab.

## v2.4.7

### Summary

| Category | Open | Resolved |
|---|---:|---:|
| Not implemented (NI) | 0 | 0 |
| Deferred (DF) | 2 | 0 |
| Bugs / regressions (BG) | 0 | 1 |
| Warnings (WN) | 0 | 0 |
| Missing tests / coverage gaps (MT) | 1 | 0 |
| Quality-gate gaps (QG) | 0 | 0 |

Phases 1-5 implemented against four operator screenshots of the v2.4.6 installer. One was a defect this project introduced in v2.4.5; three were density and scope feedback. Every earlier open row carries forward, because the v2.4.7 rebuild is the first installer since v2.4.6 merged.

### Open Items

##### MT-1 - The reworked wizard is not observed in the packaged window

- **Source phase**: Phases 1-4
- **Impact**: Tests pin selection-scoped sizing across four consumers, the derived component resolver, the overlaid Browse button, the column-scoped Ollama URL, the hidden VS Code paragraph, one-line storage in the facts column, and the counter row. None of it has rendered in the packaged wizard, and Qt geometry does not resolve headlessly.
- **Owner**: Operator, this cycle's installer rebuild
- **Next step**: Operator items 1-5 in `last-phase-evidence-v2.4.7-wizard-density.md`.

##### DF-1 - An already-installed Ollama still reads as "will be installed"

- **Source phase**: Phase 2 - Configuration scope
- **Impact**: `state.ollama_installed` could mark the row satisfied rather than pending. The installer step is already idempotent, so this is imprecise wording rather than wrong behavior.
- **Owner**: Next installer cycle
- **Next step**: Render a distinct "already present" state for a satisfied required component.

##### DF-2 - Category labels are not coloured chips

- **Source phase**: Phase 4 - Review density and model summary
- **Impact**: Screenshot 4's mockup colours each category label. The counter row delivers the visual separation the operator asked for; recolouring the labels is cosmetic and carries a palette decision with no correctness content.
- **Owner**: Next installer cycle
- **Next step**: Decide a per-category palette, or accept the current neutral headings.

### Resolved

##### BG-1 - Review reported two contradictory sizes for one selection (resolved)

- **Resolved**: 2026-09-06 in Phases 1 and 4.
- **Evidence**: The card claimed `7 selected (7 already downloaded, 0 to download)` beside `~157 GB to download / 233.2 GB already downloaded`. The counts were computed per id and correct; the sizes were read from `installed_report.pending_gb` / `downloaded_gb`, which are catalog-wide because the picker probes every entry so each card can show a Downloaded pill. `pending_download_gb` returned the same catalog-wide value, so the install guard demanded headroom for models the user never selected, and `can_select_model` credited back the catalog-wide downloaded total. Introduced in v2.4.5; its tests missed it because every fixture made the report cover exactly the selection, so the two scopes coincided. `state.pending_models_gb` is now the single selection-scoped figure, written beside `selected_models_gb` and read by all four consumers. `test_selection_scoped_sizing.py` adds 13 cases in which every fixture uses a catalog strictly wider than the selection, and both pre-existing fixture helpers were rebuilt with that property. Packaged confirmation remains MT-1.

## v2.4.6

### Summary

| Category | Open | Resolved |
|---|---:|---:|
| Not implemented (NI) | 0 | 0 |
| Deferred (DF) | 0 | 0 |
| Bugs / regressions (BG) | 0 | 0 |
| Warnings (WN) | 2 | 0 |
| Missing tests / coverage gaps (MT) | 7 | 0 |
| Quality-gate gaps (QG) | 0 | 0 |

Phase 7 of field-delivery is implemented locally. Chat, Agents, Image, and Video pickers fail closed on the this-install allowlist, recommend order, Stop, studio captions without Shaping, Advanced on the context row, RealVis default when owned, and GPU busy while a scheduler job is active. Packaged four-tab chrome is not yet observed. Every earlier v2.4.5 / v2.4.4 open item carries forward.

### Open Items

##### MT-1 - Packaged payload fingerprint and maximized first show are not observed

- **Source phase**: Phase 1 - Packaged delivery and installer window
- **Impact**: Tests pin stale-bundle refusal, Settings fingerprint copy, and `present_installer_window` calling `showMaximized`. None of it has run in a frozen NexusSetup.exe on the operator host.
- **Owner**: Operator, this cycle's installer rebuild
- **Next step**: Phase 8 human items (1) and (5).

##### MT-2 - Packaged Setup compactness is not observed

- **Source phase**: Phase 2 - Installer Setup compactness
- **Plan reference**: `docs/v2/v2.4/plans/v2.4.6-field-delivery-density-and-session-identity.md` (sub-tasks 2.1-2.3)
- **Reason**: Qt tests pin two-column prereqs, a title-row Re-check icon, one-line GPU text, worker replacement, elision, and no trailing stretch. None of it has run in a frozen NexusSetup.exe on the operator host.
- **Suggested next step**: Phase 8 human item for Setup screenshot 1.

##### MT-3 - Packaged Configuration, Review groups, and VS Code 1.136 VSIX load are not observed

- **Source phase**: Phase 3 - Configuration, VS Code host, and Review groups
- **Plan reference**: `docs/v2/v2.4/plans/v2.4.6-field-delivery-density-and-session-identity.md` (sub-tasks 3.1-3.4)
- **Reason**: Tests pin Unsloth default-on when Compatible, 1.136 enabled and checked, absent Gemma/Video2X copy, and Review headings that keep juggernaut-xl-v9 under Image. None of it has run in a frozen NexusSetup.exe, and the VSIX has not been loaded in Microsoft VS Code 1.136.0 on the operator host.
- **Suggested next step**: Phase 8 human items for screenshots 2-4 and a `code --install-extension` on 1.136.

##### MT-4 - Packaged VS Code owned-agentic picker is not observed

- **Source phase**: Phase 4 - VS Code Agentic Model Surface
- **Plan reference**: `docs/v2/v2.4/plans/v2.4.6-field-delivery-density-and-session-identity.md` (sub-tasks 4.1-4.4)
- **Reason**: Unit tests pin the AD-13 allowlist, empty-snapshot fail-closed, leftover installed ids absent, default `gemma-4-12b-it-gguf` when owned, and tool dispatch plus ConfirmationGate after a model switch. The command, status bar, and `/model` have not been clicked in a VSIX loaded on Microsoft VS Code 1.136.0.
- **Suggested next step**: Phase 8 human item: install the rebuilt VSIX, open Select Agentic Model, confirm leftover Ollama tags are absent.

##### MT-5 - Packaged Sessions History chrome is not observed

- **Source phase**: Phase 5 - Sessions History chrome and Session nouns
- **Plan reference**: `docs/v2/v2.4/plans/v2.4.6-field-delivery-density-and-session-identity.md` (sub-tasks 5.1-5.4)
- **Reason**: Desktop tests pin the empty header, left-aligned create actions, `HISTORY_HAIRLINE_GAP` on both sides of the rule, Session copy, and the unchanged Chatbot tab label. None of it has run in a frozen desktop from this cycle's installer on the operator host.
- **Suggested next step**: Phase 8 human item (6): empty and filled Sessions History, centered hairline, Session copy, Chatbot tab unchanged.

##### MT-6 - Packaged Settings compact cards are not observed

- **Source phase**: Phase 6 - Settings model cards
- **Plan reference**: `docs/v2/v2.4/plans/v2.4.6-field-delivery-density-and-session-identity.md` (sub-tasks 6.1-6.2)
- **Reason**: Desktop tests fail if Details, Best for, Why this one, `Also agentic`, `Backend model:`, or `ID:` return, and they pin the Gemma 4 12B three-line card plus a centered action row. None of it has run in a frozen desktop from this cycle's installer on the operator host.
- **Suggested next step**: Phase 8 human item (7): Settings Gemma card matches the three-line spec, no Details.

##### MT-7 - Packaged four-tab runtime chrome is not observed

- **Source phase**: Phase 7 - Four-tab runtime chrome
- **Plan reference**: `docs/v2/v2.4/plans/v2.4.6-field-delivery-density-and-session-identity.md` (sub-tasks 7.1-7.4)
- **Reason**: Desktop vitest pins leftover exclusion on Chat/Agents/Image/Video, Gemma 4 12B before LFM and gpt-oss among owned ids, RealVis default when owned, Stop replacing Send while streaming, Creating/Generating labels (orb state remains shaping), Advanced in `composer-advanced-slot`, and GPU not Idle at 0% while a job is active. None of it has run in a frozen desktop from this cycle's installer on the operator host.
- **Suggested next step**: Phase 8 human items for Chat tokens/Stop, Agents recommend order, Image RealVis plus captions, Video Generating, leftover absence, and GPU busy during a live turn.

##### WN-1 - Mtime freshness cannot catch a freshly copied stale NSIS

- **Source phase**: Phase 1 - Packaged delivery and installer window
- **Impact**: Staging compares desktop source mtimes to the bundle mtime. Last week's tauri output left in `desktop/src-tauri/target` fails as intended. An old NSIS copied onto disk *after* source last changed gets a new timestamp and can still freeze.
- **Owner**: Phase 8 if field evidence shows a copied stale payload
- **Next step**: Prefer `cd desktop; npm run build:shell` immediately before `build-windows.ps1`. A source-tree stamp from `build:shell` would close the hole.

##### WN-2 - Electron ABI for VS Code 1.136 is inferred from 1.134/1.135

- **Source phase**: Phase 3 - Configuration, VS Code host, and Review groups
- **Plan reference**: `docs/v2/v2.4/plans/v2.4.6-field-delivery-density-and-session-identity.md` (sub-task 3.2)
- **Reason**: vscode-versions listed 1.134.0 and 1.135.0 at Electron 42.8.1. 1.136.0 released 2026-09-02 and was not in that table at planning time. This phase kept the rebuild pin at 42.8.1 rather than claiming a new ABI.
- **Suggested next step**: Confirm `process.versions.electron` on the operator 1.136.0 host before Phase 8 VSIX rebuild; if it is not 42.8.1, rebuild `better-sqlite3` for that Electron.

## v2.4.5

### Summary

| Category | Open | Resolved |
|---|---:|---:|
| Not implemented (NI) | 0 | 0 |
| Deferred (DF) | 0 | 0 |
| Bugs / regressions (BG) | 0 | 1 |
| Warnings (WN) | 1 | 0 |
| Missing tests / coverage gaps (MT) | 2 | 0 |
| Quality-gate gaps (QG) | 0 | 0 |

Phases 1-5 implemented against an operator screenshot of the v2.4.4 installer rebuild: the Review step refused to proceed with `Insufficient disk space (need 204.4 GB free, have 201.0 GB)` on a host already holding 176 GB of the selected models. Measuring the store first established there were no duplicate downloads, which relocated the defect from the downloader to the precheck. Every v2.4.4 open item carries forward unchanged, because this cycle's installer rebuild is the first opportunity to observe any of them.

### Open Items

##### MT-1 - Packaged installer behavior is not observed

- **Source phase**: Phases 2-4
- **Impact**: Tests pin the probe across both stores and every failure mode, the Downloaded pill, first-load auto-selection that defers to user edits, two-column Review with per-model marks, a pending-only estimate, and the guard passing the exact field reproduction while still blocking a 500 GB new selection. None of it has run in the packaged wizard.
- **Owner**: Operator, this cycle's installer rebuild
- **Next step**: Operator items 1-4 in `last-phase-evidence-v2.4.5-installer-downloaded.md`.

##### MT-2 - Ollama API detection path is not exercised against a live daemon

- **Source phase**: Phase 1 - Downloaded-model probe
- **Impact**: The `/api/tags` branch is covered by an injected fake and the disk-manifest fallback by real fixture files. A live Ollama returning its real payload shape has not been probed. A response shape change would silently fall back to the manifest path, which is correct but slower and would log a `probe_errors` line.
- **Owner**: Operator, next packaged run
- **Next step**: Operator item 4 (chat models detected with Ollama running, and again with it stopped).

##### WN-1 - Two pre-existing ruff F401 findings remain

- **Source phase**: Carried from v2.4.4 WN-1; unchanged by this cycle
- **Impact**: `runtimes/diffusion/vram_lifecycle.py:35` and `tests/python/diffusion/test_registry.py:6`. Neither file is touched by this plan.
- **Owner**: Next cleanup pass
- **Next step**: Both are auto-fixable; left alone because they trace to no line in this plan.

### Resolved

##### BG-1 - Installer refused an install for models already on disk (resolved)

- **Resolved**: 2026-09-01 in Phases 1-4.
- **Evidence**: The guard was handed `selected_models_gb`, a catalog-size sum with no filesystem reference. Measured host state showed 11 distinct model directories, each present once, empty `_tmp`, and `inkling-small` legitimately ~74.7 GB as a three-part GGUF split - so nothing had been downloaded twice and the downloader (`_install_file`, which skips verified files) was never at fault. `pending_download_gb` now sizes the remaining download for the guard, the picker footer, and `can_select_model` alike. `test_field_case_passes_the_guard` asserts 194.4 GB selected / 176.4 GB present / 201.0 GB free now passes, `test_the_same_selection_was_refused_before_the_fix` pins the old `204.4 GB` message, and `test_a_genuinely_oversized_new_selection_still_blocks` proves the guard was fixed rather than disabled. Packaged observation remains MT-1.

## v2.4.4

### Summary

| Category | Open | Resolved |
|---|---:|---:|
| Not implemented (NI) | 0 | 0 |
| Deferred (DF) | 1 | 0 |
| Bugs / regressions (BG) | 0 | 0 |
| Warnings (WN) | 1 | 0 |
| Missing tests / coverage gaps (MT) | 6 | 0 |
| Quality-gate gaps (QG) | 0 | 1 |

Phases 1-7 are implemented locally against packaged post-v2.4.3 screenshots 1-6. Every change is proven by automated tests; none of the six field symptoms has been re-observed on the packaged 16 GB NVIDIA host, because that requires a rebuilt installer this cycle did not produce. The Diffusers pin moved 0.34.0 to 0.36.0 on distribution evidence, and a live import plus a Wan and SDXL re-smoke on the new pin are the highest-value operator items.

### Open Items

##### MT-1 - Packaged transcript gutters and pill glow are not observed

- **Source phase**: Phase 1 - Transcript Gutters and Thinking Pill
- **Impact**: The gutter is proven as one `paddingInline` on the list with no downstream inset, and list, row, and pending are all overflow-visible. jsdom does not lay out a packaged transcript, so whether the glow is uncropped at 100% and 150% zoom is not observed here.
- **Owner**: Operator, next packaged build
- **Next step**: Operator item 1. Supersedes v2.4.3 MT-3, which stated the same limit against the 12px inset this phase deleted.

##### MT-2 - Packaged hairline centering and title inset are not observed

- **Source phase**: Phase 2 - History Hairline, Title Inset, and Bulk Actions
- **Impact**: Tests pin one symmetric `marginBlock` on the rule, zero padding-top on the tree header, and a chat title as the first node after the selection rail. Pixel spacing in a packaged window is not observed here. Archive All and Delete All are proven against an in-memory client, including chats inside collapsed folders, but not against the real IPC store.
- **Owner**: Operator, next packaged build
- **Next step**: Operator item 2. Supersedes v2.4.3 MT-2.

##### MT-3 - Packaged NVIDIA restyle identity is not observed

- **Source phase**: Phase 3 - Image Restyle Identity on the GPU
- **Impact**: Four contributors are fixed and each is pinned by a test: the parser accepts trailing punctuation, the send always resolves to img2img with the identity prompt or fails closed, strength 0 survives, the seed is forwarded, and a pipeline that echoes its source raises `unchanged-output`. Whether a real SANA/SDXL img2img at strength 0.85 produces black fur on this host is not observed here.
- **Owner**: Operator, next packaged build
- **Next step**: Operator item 3. Supersedes v2.4.3 MT-6; this is the third cycle to carry it.

##### MT-4 - Live SANA import on the 0.36.0 pin is not observed

- **Source phase**: Phase 4 - SANA Family Diffusers Pin
- **Impact**: 0.36.0 was verified from published wheels to contain the SANA video pipeline modules and to export both class names, and to declare no torch or transformers upper bound. `from diffusers import SanaPipeline, SanaVideoPipeline` has not been executed in a provisioned venv, because Diffusers resolves pipelines lazily and the probe needs the full media runtime.
- **Owner**: Operator, next packaged build
- **Next step**: Operator item 4. Supersedes v2.4.3 MT-7.

##### DF-1 - Wan and SDXL are not re-smoked on the new Diffusers pin

- **Source phase**: Phase 4 - SANA Family Diffusers Pin
- **Impact**: The pin change touches every Image and Video model on the host, not only SANA. Nothing in the automated suites exercises a real pipeline load, so a regression in Wan or SDXL under 0.36.0 would not be caught locally.
- **Owner**: Operator, next packaged build
- **Next step**: Operator item 4, second half. This is the highest-blast-radius unobserved change in the cycle.

##### MT-5 - Packaged generation liveness is not observed

- **Source phase**: Phase 5 - Generation Liveness and Studio Captions
- **Impact**: The reader is proven to answer `health` while a job is inside its handler, heartbeats are proven to emit and stop, and a pending studio orb is proven unpaused. Whether the packaged freeze is fully explained by the blocked reader, or partly by GPU compositor starvation on a 16 GB laptop, is not established. No headroom value was changed, deliberately, because there is no evidence for choosing one.
- **Owner**: Operator, next packaged build
- **Next step**: Operator item 5. If the window still stalls with the reader unblocked, compositor VRAM is the remaining hypothesis and `workingMemReserveGB` becomes the next lever.

##### MT-6 - Packaged Settings density is not observed

- **Source phase**: Phase 6 - Settings Models Density and Details
- **Impact**: Tests pin search inside the tab row container, a centered horizontal action row, no card min-height, split pill label/value colours, and Best for as bullets. Real-viewport card height and wrap behaviour at the packaged Settings width are not observed here.
- **Owner**: Operator, next packaged build
- **Next step**: Operator item 6. Supersedes v2.4.3 MT-4.

##### QG-1 - Develop-targeted pull requests now run the full merge-result gate (resolved)

- **Resolved**: 2026-08-31 in Phase 7, with explicit operator approval.
- **Evidence**: Carried from v2.4.3 QG-5. Every substantive workflow filtered `pull_request` to `main`, so PR 58 (which targets `develop`) ran only commitlint: the push trigger tested the branch head, but the merge result was never tested. `develop` was added to the `pull_request.branches` filter of `ci.yml`, `shell-build.yml`, `installer-tests.yml`, `coverage-diff.yml`, and `pr-quality.yml`; no job logic changed. Confirmed by observation, not assertion: `gh pr checks 58` now reports 42 pass, 1 skipping (path-gated `init.ps1`), 0 fail on head `4b1771da`, against a pull request that previously ran one check.

##### WN-1 - Two pre-existing ruff F401 findings remain

- **Source phase**: Phase 3 - Image Restyle Identity on the GPU (observed, not caused)
- **Impact**: `runtimes/diffusion/vram_lifecycle.py:35` imports `typing.Any` unused and `tests/python/diffusion/test_registry.py:6` imports `sys` unused. Neither file was touched by this cycle, and every file that was touched passes ruff.
- **Owner**: Next cleanup pass
- **Next step**: Both are auto-fixable. Left alone here because they trace to no line in this plan.

## v2.4.3

### Summary

| Category | Open | Resolved |
|---|---:|---:|
| Not implemented (NI) | 0 | 0 |
| Deferred (DF) | 0 | 0 |
| Bugs / regressions (BG) | 0 | 0 |
| Warnings (WN) | 0 | 0 |
| Missing tests / coverage gaps (MT) | 7 | 0 |
| Quality-gate gaps (QG) | 0 | 0 |

Phases 1-7 are implemented locally. A packaged wizard screenshot of the two-column Configuration/Review pages and Unsloth lock on this 16 GB NVIDIA host is not observed here. Hairline pixels and dialog centering in a packaged window are not observed here. Thinking-pill glow containment in a packaged transcript is not proven in jsdom. Packaged Settings nowrap facts and icon colors are not observed here. Packaged Agents picker order on this 16 GB install is not observed here. Packaged NVIDIA restyle before/after is not observed here. A packaged NVIDIA SANA-Video clip (or a live missing-file string from that install) is not observed here.

### Open Items

##### MT-1 - Packaged installer two-column layout and Unsloth lock are not observed

- **Source phase**: Phase 1 - Installer Two-Column Layout and Unsloth Lock
- **Plan reference**: [v2.4.3-field-density-identity-and-runtime.md](plans/v2.4.3-field-density-identity-and-runtime.md) T001 / 1.1
- **Reason**: Pytest proves two-column widgets, Unsloth disabled when Incompatible, Compatible after NVIDIA 16384 on showEvent, Review 16 GB, and the renamed time label. A packaged wizard run on this host is not recorded here.
- **Suggested next step**: Last-phase operator item (Configuration two columns and Unsloth Compatible on this 16 GB NVIDIA host).

##### MT-2 - Hairline pixels and delete-dialog centering are not proven in jsdom

- **Source phase**: Phase 2 - History Chrome, Selection, Titles, and Delete Overlay
- **Plan reference**: [v2.4.3-field-density-identity-and-runtime.md](plans/v2.4.3-field-density-identity-and-runtime.md) T007 / 2.1
- **Reason**: Tests assert the hairline node on `/images` (absent on Settings), New chat `onSelect`/`onOpenChat`, a pre-created Image title change, and `folder-tree-confirm-delete` as a child of `document.body`. jsdom does not layout a packaged window so the hairline's appearance and the dialog's visual center are not observed here.
- **Suggested next step**: Last-phase operator items (hairline under tabs; New chat selects empty; Image first prompt titles the row; delete dialog centered).

##### MT-3 - Thinking-pill glow pixel containment is not proven in jsdom

- **Source phase**: Phase 3 - Thinking Pill Geometry
- **Plan reference**: [v2.4.3-field-density-identity-and-runtime.md](plans/v2.4.3-field-density-identity-and-runtime.md) T013 / 3.1
- **Reason**: Tests pin min-width to `Searching...`, a 12 px left inset, and overflow visible on the pill host and chat pending row. jsdom does not layout a packaged transcript, so glow pixels vs the pane edge are not observed here. v2.4.2 MT-1 remains the prior-cycle statement of the same limit.
- **Suggested next step**: Last-phase operator item (thinking pill glow at 100% and 150% zoom).

##### MT-4 - Packaged Settings compact-card nowrap and icon colors are not observed

- **Source phase**: Phase 4 - Settings Models Compact Cards
- **Plan reference**: [v2.4.3-field-density-identity-and-runtime.md](plans/v2.4.3-field-density-identity-and-runtime.md) T016 / 4.1
- **Reason**: Tests pin a nowrap facts row without Company/License pills, pills inside Details, and green / red / blue action colors via inline style. A packaged Settings screenshot is not recorded here.
- **Suggested next step**: Last-phase operator item (Settings one facts line and icon colors).

##### MT-5 - Packaged Agents picker order and empty-session default are not observed

- **Source phase**: Phase 5 - Shared Picker Rank and Default
- **Plan reference**: [v2.4.3-field-density-identity-and-runtime.md](plans/v2.4.3-field-density-identity-and-runtime.md) T020 / 5.1
- **Reason**: Tests prove `resolveDefaultId` prefers `gemma-4-12b-it-gguf` over a gpt-oss favorite, and QuickModelSwitcher lists Gemma before gpt-oss at 16 GB with recommendOrder. A packaged Agents screenshot on this host is not recorded here.
- **Suggested next step**: Last-phase operator item (Agents empty session defaults to Gemma 4 12B on this install).

##### MT-6 - Packaged NVIDIA restyle identity is not observed

- **Source phase**: Phase 6 - Image Restyle Identity
- **Plan reference**: [v2.4.3-field-density-identity-and-runtime.md](plans/v2.4.3-field-density-identity-and-runtime.md) T024 / 6.1
- **Reason**: Tests prove restyle strength 0.7, identity prompt, no SAM2, and fail-closed without last output. A packaged NVIDIA before/after of "Make the puppy black" is not recorded here. v2.4.2 MT-3 remains the prior-cycle statement of the same limit.
- **Suggested next step**: Last-phase operator item (Make the puppy black restyles fur).

##### MT-7 - Packaged NVIDIA SANA-Video clip is not observed

- **Source phase**: Phase 7 - SANA-Video Layout and Executor
- **Plan reference**: [v2.4.3-field-density-identity-and-runtime.md](plans/v2.4.3-field-density-identity-and-runtime.md) T028 / 7.1
- **Reason**: Tests prove a complete SANA fixture loads SanaVideoPipeline with local_files_only and never WanPipeline, an incomplete tree names the missing path, catalog files include model_index.json plus scheduler/tokenizer/VAE, and 16 GB default video stays wan2.1-t2v-1.3b. A packaged NVIDIA generate of sana-video-2b-720p is not recorded here.
- **Suggested next step**: Last-phase operator item (opt-in SANA-Video either plays a clip or names a real missing file).

## v2.4.2

### Summary

| Category | Open | Resolved |
|---|---:|---:|
| Not implemented (NI) | 0 | 0 |
| Deferred (DF) | 0 | 0 |
| Bugs / regressions (BG) | 0 | 0 |
| Warnings (WN) | 0 | 0 |
| Missing tests / coverage gaps (MT) | 6 | 0 |
| Quality-gate gaps (QG) | 0 | 0 |

Phases 1-7 are implemented locally. Phase 7 recorded last-phase evidence and is waiting on T043 push/PR approval against `develop` ([PR 58](https://github.com/bendourthe/Nexus-AI/pull/58)). jsdom cannot prove thinking-pill pixel containment, a live overflow pane jumping to the latest turn, or two Settings cards filling a real viewport. Packaged img2img identity, empty-video fail-closed, and a live installer GPU/Unsloth/VS Code screenshot are not observed here. Operator items 1-9 remain Not observed (`not_observed != absent`).

### Open Items

##### MT-1 - Thinking-pill pixel containment is not proven in jsdom layout

- **Source phase**: Phase 1 - Sidebar History Host and Shared Chrome
- **Plan reference**: [v2.4.2-field-ui-history-and-generation.md](plans/v2.4.2-field-ui-history-and-generation.md) T005 / 1.5
- **Reason**: jsdom does not layout. The Phase 1 test asserts overflow visible, sibling pill chrome (so `border-radius: 999px` is not on the canvas host), and `rectFullyInside` with mocked boxes. A real `getBoundingClientRect()` crop cannot be observed here.
- **Suggested next step**: Phase 7 operator item 1 (thinking pill at 100% and 150% zoom) is the layout proof.

##### MT-2 - Composer stick-to-bottom is proven on a mocked scroller, not a live pane

- **Source phase**: Phase 2 - Transcript Honesty
- **Plan reference**: [v2.4.2-field-ui-history-and-generation.md](plans/v2.4.2-field-ui-history-and-generation.md) T009 / 2.1
- **Reason**: `useStickToBottom` tests assign `scrollHeight` / `clientHeight` and assert `stickNow` sets `scrollTop`. They do not layout Chat, Agents, Image, or Video overflow panes with real content height after send.
- **Suggested next step**: Phase 7 operator send on each of the four tabs and confirm the new user turn is in view unless the user scrolled up.

##### MT-3 - Packaged img2img identity for "Make that puppy black" is not observed

- **Source phase**: Phase 3 - Image Follow-up Identity
- **Plan reference**: [v2.4.2-field-ui-history-and-generation.md](plans/v2.4.2-field-ui-history-and-generation.md) T016 / 3.1
- **Reason**: Automated tests prove img2img against last PNG bytes, strength 0.45, and no SAM2 for that phrase. A packaged NVIDIA run that the same puppy is recolored rather than resampled is not recorded here.
- **Suggested next step**: Phase 7 operator item: generate a puppy, send "Make that puppy black" with no attachment, capture before/after.

##### MT-4 - Packaged empty-video fail-closed is not observed

- **Source phase**: Phase 4 - Video Fail-Closed Output
- **Plan reference**: [v2.4.2-field-ui-history-and-generation.md](plans/v2.4.2-field-ui-history-and-generation.md) T020 / 4.1
- **Reason**: Automated tests prove persist of the playable-clip error, Settings > Models on missing weights, and fail-closed when `resolveMp4Url` is empty. A packaged NVIDIA run that a first puppy-in-grass turn never paints an empty success bubble is not recorded here.
- **Suggested next step**: Phase 7 operator item: send a Video Lab prompt that cannot produce a clip (missing weights or empty path) and capture the written failure.

##### MT-5 - Settings Models density is not proven on a real viewport

- **Source phase**: Phase 5 - Settings Models Density
- **Plan reference**: [v2.4.2-field-ui-history-and-generation.md](plans/v2.4.2-field-ui-history-and-generation.md) T024 / 5.1
- **Reason**: Tests assert the catalog fingerprint is absent, chrome gap is `--space-1`, and card padding is `--space-2`. jsdom does not layout two downloaded cards against a packaged window height.
- **Suggested next step**: Phase 7 operator item 8 (Settings Models density).

##### MT-6 - Live installer VRAM / Unsloth / VS Code merge is not observed

- **Source phase**: Phase 6 - Installer VRAM, Unsloth, and VS Code Merge
- **Plan reference**: [v2.4.2-field-ui-history-and-generation.md](plans/v2.4.2-field-ui-history-and-generation.md) T028 / 6.1
- **Reason**: Pytest pins 16384 and 15360 display as 16 GB, Unsloth Compatible/Incompatible before opt-in, and a 7-step route with the VS Code checkbox on Configuration. A packaged wizard run on this NVIDIA host is not recorded here.
- **Suggested next step**: Phase 7 operator item 9 (installer GPU line shows whole GB and Unsloth badge on the same page as VS Code).

## v2.4.1

### Summary

| Category | Open | Resolved |
|---|---:|---:|
| Not implemented (NI) | 0 | 0 |
| Deferred (DF) | 6 | 1 |
| Bugs / regressions (BG) | 0 | 0 |
| Warnings (WN) | 0 | 2 |
| Missing tests / coverage gaps (MT) | 0 | 0 |
| Quality-gate gaps (QG) | 3 | 3 |

Phases 1-6 of the generation-recovery plan are committed locally. Phase 7 proved packaged NVIDIA image and video generation on this host (exact installer SHA-256 `E29725ADE5671271962CE9FB6DE66DCAA38BA182DC257802DFA835C78120490D`). Remaining operator checklist items (clean-install visuals, gated Hugging Face account, reboot persistence, Settings/Data/Training, transcript/Agents screenshots) stay Not observed. Publication still requires the full local gate, one Phase 7 commit, and explicit push/PR approval. `not_observed != absent` throughout.

### Open Items

##### DF-1 - Packaged Windows clean and repair installer behavior is not observed

- **Source phase**: Phase 1 and Phase 8 human testing
- **Plan reference**: Phase 8.7 operator items 1-3
- **Reason**: The prior packaged field run exposed imperceptible fixed-value motion, low percentage contrast, and hidden finalization work that left the bar at 73% while visible groups said Done. The replacement implements and tests a repeating liquid gradient, contrast capsule, and complete visible step mapping, and its frozen smoke passes. A clean/repair visual run of the replacement is not observed.
- **Owner / next evidence**: Release operator. Run checklist items 1-3 on a clean Windows Sandbox and an existing Nexus install, then attach screenshots and `nexus-install-nexus-desktop-log.txt`.

##### DF-3 - Reasoning disclosure is not observed with a thinking-capable local model

- **Source phase**: Phase 3 and Phase 8 human testing
- **Plan reference**: Phase 8.7 operator item 6
- **Reason**: Component and hydration tests prove collapsed-by-default disclosure, keyboard access, absence when no reasoning exists, and token tooltip detail. No local provider turn with separate reasoning content was run here.
- **Owner / next evidence**: Desktop operator. Use a catalog model that emits separate reasoning, confirm the disclosure expands without moving reasoning into the answer bubble, and capture collapsed and expanded states.

##### DF-4 - Archive, delete, reset, and restore are not observed across all four pillars

- **Source phase**: Phase 4 and Phase 8 human testing
- **Plan reference**: Phase 8.7 operator item 7
- **Reason**: Store, IPC, cancellation, late-event, and page-reset tests cover Chatbot, Agents, Images, and Videos. A packaged four-pillar operator matrix was not run.
- **Owner / next evidence**: Desktop operator. Complete checklist item 7 and record one session id per pillar plus the reset and restore result.

##### DF-5 - Installer/Settings visual parity and live disk-meter change are not observed

- **Source phase**: Phase 5 and Phase 8 human testing
- **Plan reference**: Phase 8.7 operator item 8
- **Reason**: The prior packaged field run exposed Nomic as incorrectly required and incompatible rows above compatible rows. The replacement makes EmbeddingGemma 300M the required/default app-wide embedder and compatibility the first ordering partition in installer and Settings. Automated shared-policy tests pass; replacement visual parity and an observed free-space change after model install/remove are not recorded.
- **Owner / next evidence**: Release operator. Capture the same model in both surfaces, then install/remove it and record the disk meter before and after.

##### DF-6 - Native folder pickers outside Windows are not observed

- **Source phase**: Phase 7
- **Plan reference**: Phase 8.7 operator item 9
- **Reason**: The Tauri command and frontend cancellation/stale-result behavior are automated. macOS and Linux picker behavior was not run on native hosts.
- **Owner / next evidence**: Platform operator. On macOS and Linux, select, cancel, and rapidly reopen the picker and record the resulting workspace chips.

##### DF-7 - Windows multi-root OS sandbox confinement remains partial

- **Source phase**: Phase 6 and Phase 8 human testing
- **Plan reference**: Phase 8.7 operator item 9
- **Reason**: Canonical path guards and scoped tool tests allow both selected roots and deny outside paths. The Windows sandbox backend still does not kernel-enforce filesystem or network confinement, so the support tier remains partial even when the UI and path guard behave correctly.
- **Owner / next evidence**: Security owner. Keep the existing loud partial/unconfined status. A later sandbox phase must add kernel-enforced Windows filesystem and network boundaries before claiming confined support.

##### QG-2 - Indexed skill catalog paths remain absent from this checkout

- **Source phase**: Phase 8 architecture, known-gaps, docs layout, and CI reconciliation; generation-recovery Phase 7
- **Plan reference**: Phase 8.1-8.5 and generation-recovery T089-T093
- **Reason**: The plan-indexed `catalog/skills/...` paths and the repository `.agents/skills` bundle still do not contain `project-refactor`, `docs-layout-refactor`, `known-gaps-tracker`, `cicd-architect`, `verification-before-completion`, or `dev-progress-tracker`. This Phase 7 session loaded the user-level copies under `C:\Users\bdour\.agents\skills` and followed those procedures. The repo-local mapping is still missing.
- **Suggested next step**: Vendor or map the canonical skill files into the repository catalog before the next planning session, or update plan templates to the user-level install path.

##### QG-5 - Develop-targeted pull requests miss several merge-result workflows

- **Source phase**: Generation-recovery Phase 7 terminal CI comparison
- **Plan reference**: T093
- **Reason**: `ci.yml`, `installer-tests.yml`, `shell-build.yml`, `pr-quality.yml`, `coverage-diff.yml`, and `codeql.yml` limit `pull_request.branches` to `main`. Feature-branch `push` still runs `ci.yml` and path-gated installer tests, and `commitlint.yml` runs on any PR. There is no always-resolving aggregate required-check job, and `package.json` has no `fast` / `full` / `platform` / `report` / `release` profile scripts. Workflow files were not changed; silence is not approval.
- **Suggested next step**: After explicit approval, add `develop` to the listed `pull_request.branches` (or an aggregate gate job) in the smallest set of workflows that must validate the merge result. Record any remaining profile-script differences as environment-only.

##### QG-6 - Model-prompting freshness helper is absent

- **Source phase**: Generation-recovery Phase 7 advisory governance check
- **Plan reference**: implement-phase 9.0 duty 8
- **Reason**: `python scripts/check_model_prompting_freshness.py --advisory` cannot run because the file is absent. The duty is advisory and does not block the phase.
- **Suggested next step**: Add the helper in a later tooling change, or keep the logged no-op.

### Resolved Items

##### DF-2 - Real NVIDIA CUDA diffusion generation is now observed

- **Resolved**: 2026-08-30 in generation-recovery Phase 7.
- **Evidence**: Packaged `runtime.json` schema 3 reports `diffusion.status=ready`, `torch 2.3.0+cu121`, `cuda_available=true` on an RTX 3080 Ti Laptop (driver 596.08). Exact unsigned installer SHA-256 `E29725ADE5671271962CE9FB6DE66DCAA38BA182DC257802DFA835C78120490D` plus installed sidecar produced a 512x512 PNG (330437 bytes, SHA-256 `1db719ce7693e918e958e22f6b7de34fe9bede4b5e9b128bdad4fc96db35fa80`, sampled variance 4034.6219) and an H.264 MP4 (848x480, 13 frames, 1.083 s, SHA-256 `60bb5cb281b7845ec7839467ba4d3ababd3a15cea52dd43e4cdfbb54a9a22422`) via `scripts/installer/build/smoke-installed-media.ps1`. Reboot persistence is still Not observed.

##### WN-1 - Rust format drift resolved

- **Resolved**: 2026-08-29 in Phase 8.
- **Evidence**: Applied canonical `cargo fmt --all` output to `desktop/src-tauri/src/lib.rs` and `sidecar.rs`. Fresh `cargo fmt --all -- --check`, Clippy with warnings denied, and all 19 Rust tests pass.

##### WN-2 - Installer-wide Ruff drift resolved

- **Resolved**: 2026-08-29 in Phase 8.
- **Evidence**: Applied Ruff's safe fixes, repaired the remaining line-length and style findings, and formatted the complete installer tree. Fresh `uv run ruff check .` reports `All checks passed!`; `uv run ruff format --check .` reports 171 files formatted.

##### QG-4 - Repository-wide nexus-check baseline enforced

- **Resolved**: 2026-08-29 in Phase 8.
- **Evidence**: Removed the two insecure-random production/test calls and added `configs/nexus-check-baseline.json` plus CLI enforcement that consumes only exact rule/file/message counts, fails excess findings, fails stale entries, and rejects malformed baselines. Fresh `npm run check --silent` reports 0 errors, 53 warnings, 56 exact matches, and 0 stale entries; focused CLI/memory/workspace tests pass.

##### QG-1 - Release-preconditions helper is absent

- **Resolved**: 2026-08-30 in generation-recovery Phase 7.
- **Evidence**: `python scripts/check_release_preconditions.py --branches --repo-settings` now reports the current branch, dirty tree, origin, and GitHub repository settings without mutation. Focused tests in `tests/python/test_release_helpers.py` pass.

##### QG-3 - Unicode-safety helper is absent

- **Resolved**: 2026-08-30 in generation-recovery Phase 7.
- **Evidence**: `python scripts/validate_unicode_safety.py --strict` now rejects BOMs and unsafe punctuation and can fix them. The same focused helper tests pass, and the Phase 7 text additions scanned with 21 files / 0 failures.

### Reconciliation of Earlier Active Files (v2.4.4, 2026-08-31)

Glob of 31 `docs/**/known-gaps.md` files. Files whose Status is `in-progress`, or whose Open Items remain, were each read against this cycle's observations:

- `docs/v2/v2.4/known-gaps.md` (this file): v2.4.3 MT-2, MT-3, MT-4, MT-6, and MT-7 are each superseded by a v2.4.4 row that states the same unobserved limit against the new code. None is closed: this cycle produced no packaged observation, and the plan forbids closing them because a fix exists. v2.4.3 MT-1 (installer two-column, Unsloth lock) and MT-5 (picker order) are carried forward untouched - this screenshot set does not cover them.
- `docs/v2/v2.3/known-gaps.md`: still in-progress. Nothing observed here bears on MT-1 or the v2.3.0 DF/QG rows. Unchanged.
- `docs/v2/v2.0/known-gaps.md`: still in-progress with hardware and audio deferrals. No observation this cycle. Unchanged.
- `docs/v1/v1.20/known-gaps.md`, `docs/v1/v1.19/known-gaps.md`: still in-progress. No v2.4.4 observation closes their DF rows. Unchanged.
- `docs/v1/v1.3/known-gaps.md`, `docs/v1/v1.5/known-gaps.md`, `docs/v1/v1.8/known-gaps.md`: open or rehearsal-blocked historical carryforward. Unchanged.
- `docs/v2/v2.1`, `docs/v2/v2.2`, and the remaining `docs/v1/**` and `docs/archive/**` ledgers: finalized. Left in place; no historical GPU or visual row was closed without new observation.

### Reconciliation of Earlier Active Files

- `docs/v2/v2.3/known-gaps.md`: reviewed 2026-08-30; still in-progress. v2.4.1 generation recovery does not close MT-1 or the v2.3.0 DF/QG rows. They remain unchanged.
- `docs/v2/v2.2/known-gaps.md`: finalized; packaged GPU evidence is still absent, so historical rows remain unchanged.
- `docs/v2/v2.1/known-gaps.md`: finalized; no change.
- `docs/v2/v2.0/known-gaps.md`: reviewed 2026-08-30; still in-progress with DF-1 and other hardware/audio deferrals. This cycle produced no observed evidence for those rows.
- `docs/v1/v1.20/known-gaps.md` and `docs/v1/v1.19/known-gaps.md`: still in-progress. No v2.4.1 observation closes their remaining DF rows.
- `docs/v1/v1.8/known-gaps.md` and `docs/v1/v1.5/known-gaps.md`: still in-progress or rehearsal-blocked; not modified.
- `docs/v1/v1.3/known-gaps.md`: Status remains open for historical skill-cleaner carryforward; not modified.
- Glob of 31 `docs/**/known-gaps.md` files: archive and finalized ledgers were left in place. No historical GPU/visual row was closed without new observation.
