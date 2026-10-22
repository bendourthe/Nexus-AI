# Known Gaps - v2.15

**Project**: Nexus
**Status**: in-progress
**Last updated**: 2026-10-20
**Open items**: 60

## v2.15.0

### Summary

| Category | Open | Resolved |
|---|---|---|
| Not implemented (NI) | 0 | 0 |
| Deferred (DF) | 30 | 0 |
| Bugs / regressions (BG) | 1 | 1 |
| Warnings (WN) | 18 | 1 |
| Missing tests / coverage gaps (MT) | 1 | 1 |
| Quality-gate gaps (QG) | 10 | 1 |

### Open Items

#### DF-1 - Spoken replies start in 4 s, not the 2.0 s target

- **Source phase**: v2.14.0 Phase 2 (2026-10-16).
- **Plan reference**: v2.14.0 T010; gate V-1 in `docs/archives/v2/v2.14/development/gates.md`; results in `docs/archives/v2/v2.14/development/voice-latency-results.md`.
- **Reason**: after the streamed pipeline and its one rework iteration (Whisper cached, `think: false` on voice turns), median time to first audio on the medium fixture is 3,990 ms against the 2,000 ms gate (baseline 38,579 ms; short fixture 1,715 ms). The remaining time is transcription (about 1.3 s) plus the model finishing and synthesizing its first full sentence. The owner kept the streamed path rather than reverting it as the plan's cut-line would have (decision recorded in the results). Recorded here, not in the v2.14 ledger, because a gap opened during the v2.14 run cannot migrate at that minor's close.
- **Suggested next step**: measure a short spoken lead-in (the first clause, split at a comma, synthesized before the full sentence) and a smaller STT model for voice turns, each against V-1 with `scripts/measure-voice-latency.mjs --mode streamed`.

#### DF-2 - PersonaPlex full-duplex voice is a v2.15+ candidate

- **Source phase**: v2.14.0 Phase 2 (2026-10-16).
- **Plan reference**: v2.14.0 T010 (V3 trigger FIRED); comparison `docs/archives/v2/v2.14/comparisons/v2.14.0-comparison-airllm-digup-mimic-personaplex.md`.
- **Reason**: the V3 trigger fired because V-1 was missed after Phase 2. v2.14 builds nothing for PersonaPlex, as planned.
- **Suggested next step**: plan it only with the comparison's preconditions: 24 GB tier only, the loopback bind and `torch.load` fixes, a `licenseNote`, and no Nexus memory or tools in that mode; re-measure V-1 first, since DF-1's levers may close the gap without it.

#### WN-1 - Hosts without an NVIDIA or Apple GPU still get no voice runtime

- **Source phase**: v2.14.0 Phase 1 (2026-10-16), as v2.14 WN-6.
- **Plan reference**: v2.14.0 T001 provisioning delta.
- **Reason**: voice shares the provisioned media venv, but `scripts/installer/build/versions.lock.json` has only `win-x64-nvidia`, `linux-x64-nvidia` and `mac-arm64-apple` targets. A CPU-only host fails provisioning, so the audio runtime falls back to a bare `python` without the voice packages. Not a regression. Recorded here because a CPU target cannot be verified on the v2.14 reference host (NVIDIA GPU), and a gap opened during the v2.14 run cannot migrate at that minor's close.
- **Suggested next step**: add a CPU target (CPU torch wheels plus the same runtime requirements) and verify it on a CPU-only host or a GPU-hidden run.

#### WN-2 - The OCR runtime is not provisioned, and its OpenCV needs numpy 2

- **Source phase**: v2.14.0 Phase 5 (2026-10-17), from the v2.14 WN-7 investigation.
- **Plan reference**: v2.14.0 T019 known-gaps reconciliation.
- **Reason**: `rapidocr-onnxruntime` appears only in the legacy `REQUIRED_WHEEL_PREFIXES` list; no verified provisioner installs it, so OCR works only where it was installed by hand. Installing it today pulls `opencv-python` 5.0.0.93, which requires `numpy>=2`, against the lock's `numpy==1.26.4`. The OCR runtime's interpreter likely defaults to a bare `python`, the same pattern as the voice bug fixed in v2.14.0 Phase 1. On the v2.14 reference host, where `rapidocr-onnxruntime` was installed by hand into the system Python, `tests/python/ocr/test_parse.py::TestEngineSelection::test_defaults_to_the_portable_engine` fails with `execution-failed` instead of `engine-unavailable` (also in the untouched main checkout, so not a v2.14 regression; CI has no RapidOCR and passes). Not proven here: which OCR features fail on a clean install.
- **Suggested next step**: provision OCR through the verified path with pinned `rapidocr-onnxruntime` and `opencv-python` versions compatible with the lock (or move the lock to numpy 2 after a media regression run), and point the OCR runtime at the provisioned interpreter.

#### WN-3 - The pinned-digest check cannot read a remote or containerized Ollama

- **Source phase**: v2.14.0 Phase 5 (2026-10-17), Tier 3 adversarial pass (finding 9).
- **Plan reference**: v2.14.0 T016; `core/registry/ollamaDigest.ts` `ollamaModelsDir`.
- **Reason**: the check reads Ollama's manifest from the sidecar's own `OLLAMA_MODELS` or home folder. When Ollama runs elsewhere (another machine, WSL, Docker, or a service with its own `OLLAMA_MODELS`), the manifest is unreadable, the check fails closed, and `lfm2.5:24b-a2b`, the only entry with a pinned digest, is removed on every install. Nexus is local-first, so the default setup is unaffected. Not proven here: which supported configurations point Nexus at a non-local Ollama.
- **Suggested next step**: when the Ollama base URL is not loopback, report the pull as unverifiable and let the user choose, instead of deleting it; or read the digest through an Ollama API if one exposes it.

#### WN-4 - A hung synthesis call keeps the voice runtime busy

- **Source phase**: v2.14.0 Phase 5 (2026-10-17), Tier 3 code-vs-plan convergence (item 3).
- **Plan reference**: v2.14.0 T005, T006; `runtimes/audio/engines.py` `iter_speak_segments`, `core/audio/AudioRuntimeClient.ts` `armIdle`.
- **Reason**: the 30 s per-segment bound is checked when a segment returns, because a synchronous Kokoro call cannot be interrupted inside its thread. The user-facing stall is bounded: after 30 s with no segment the client fails the stream and sends `speak.cancel`. But a call that never returns keeps the synthesis lane occupied, so later spoken replies queue behind it until the runtime restarts.
- **Suggested next step**: on a client idle timeout, restart the audio runtime process (the client already respawns it lazily), and add a test with a synthesis stub that never returns.

#### WN-5 - Two low-severity hardening residuals from the adversarial pass

- **Source phase**: v2.14.0 Phase 5 (2026-10-17), Tier 3 adversarial pass (finding 10 and one suspicion).
- **Plan reference**: v2.14.0 T007 (`core/chat/speakable.ts`) and the DF-5 fix (`core/registry/NexusModelRegistry.ts`).
- **Reason**: (a) nested think blocks (`<think>a<think>b</think>c</think>d`) show and speak `c</think>d`. Depth tracking was not added, because a model whose template opens reasoning in the prompt and that also emits its own opener would then show nothing at all. (b) `install(spec)` with a spec that is not in the catalog skips the catalog's weights-path validation; production calls only `installById`, so reaching it needs a modified catalog.
- **Suggested next step**: strip a stray `</think>` from visible text when no reasoning block is open; validate `weights.files` paths inside `_installWeightsFiles` as well.

#### DF-3 - The LFM2.5 24B-A2B admission rests on a reading of M-3 made after the results

- **Source phase**: v2.14.0 Phase 3 decision (2026-10-17), recorded by the Phase 5 Goal-vs-codebase review.
- **Plan reference**: v2.14.0 T014, T016; gate M-3 in `docs/archives/v2/v2.14/development/gates.md`; `docs/archives/v2/v2.14/development/lfm-ab-results.json`.
- **Reason**: M-3(b) needs equal golden-task completion, and the frozen text puts a difference inside the run-to-run spread under HOLD, which declines. The candidate completed 19/19/21 against the holder's 22/20/20 (means 19.67 and 20.67, overlapping ranges). The owner chose on 2026-10-17, after the results existed, to count overlapping ranges as equal, which turned HOLD into ADMIT; read literally, the frozen gate declines. `gates.md` calls a gate change after results invalid evidence. The entry is opt-in and changes no default, so no user gets it without choosing it.
- **Suggested next step**: decide keep or decline with new evidence rather than the reread: either the M5 two-cycle real-use check (v2.14 human testing item 7) or a fresh A/B frozen before it runs, with enough runs per arm to separate a one-task difference from the spread.

#### QG-1 - Spoken replies have no packaged-app evidence, and V-5 was never timed

- **Source phase**: v2.14.0 Phase 5 (2026-10-17), Goal-vs-codebase review.
- **Plan reference**: v2.14.0 "Delivery done" (packaged Windows behavioral evidence), T009, T010 Verification Expectation; gate V-5 (playback stops within 150 ms).
- **Reason**: every voice measurement drove the built sidecar over stdio with simulated playback; no run drove the installed app's window, microphone or speakers. V-5's PASS rests on the code path and a component test, not a timing. The packaged installer was rebuilt and smoke-tested in Phase 5, but that smoke does not exercise voice.
- **Suggested next step**: the owner's field test of the v2.14 human testing items 1 to 6 on the rebuilt installer, and a webview timing mark for barge-in-to-silence so V-5 can be measured; a packaged-window driver would also serve v2.14 WN-2.

#### DF-4 - Candidate runtime compatibility blocks scoring

- **Source phase**: Phase 2.
- **Plan reference**: T005; embedding-eval-results.json.
- **Reason**: Ollama 0.32.15 rejected embeddinggemma-2:270m with HTTP 412 and required a newer runtime. The preflight manifest is pinned at 9e1df58d197e80e5a6c12110efb67b38ba6c8e23790a5044e1cafe6bea34b8f4, 378346995 artifact bytes; installation did not complete. Positive candidate inference and paired quality are not proven here. No runtime/default/index was changed.
- **Suggested next step**: Qualify a compatible Ollama runtime without interrupting other sessions, then explicitly rerun the frozen evaluator to a new evidence file.

- **Migrated from**: v2.13.0#DF-1 on 2026-10-16 (reason: user-deferred)
- **Migration evidence**: left open by v2.13.0, the last plan of v2.13

- **Migrated from**: v2.14#DF-1 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: left open at the v2.14 close (v2.14.2 released 2026-10-19); needs an owner decision or evidence outside this run

#### DF-5 - Universal admission evidence is missing

- **Source phase**: Phase 2.
- **Plan reference**: T005 and conditional T007-T010; embedding-eval-results.json.
- **Reason**: Required hardware tiers, whole-runtime peak RAM, supported-context/precision behavior, controlled coding coexistence, process-level offline containment and authoritative distribution terms remain unproven. Every corresponding gate is HOLD; there is no model-admission approval or waived gate.
- **Suggested next step**: Gather each required gate under the frozen contract before proposing a default takeover. Retain the current default and alternative jobs; Phase 3 migration stays conditional. Plan tasks T008-T010 (migration design, identity enforcement, reversible rebuild) were moved out of the plan's task list on 2026-10-15 and are owned by this gap; restore them as tasks in the version that admits the model.

- **Migrated from**: v2.13.0#DF-2 on 2026-10-16 (reason: user-deferred)
- **Migration evidence**: left open by v2.13.0, the last plan of v2.13

- **Migrated from**: v2.14#DF-2 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: left open at the v2.14 close (v2.14.2 released 2026-10-19); needs an owner decision or evidence outside this run

#### DF-6 - Saved generated images outlive their session

- **Source phase**: Phase 5.
- **Plan reference**: T015; `desktop/sidecar/src/studio/generatedImages.ts`.
- **Reason**: Phase 5 writes each generated Image Studio PNG to `~/.nexus/generations/images/<sha256>.png` so its turn can be reopened and edited. Deleting a session removes its turns and recipes, but not these files, because the plan requires shared original media to be preserved and one file can back several turns. A user who deletes a session may expect its images gone from disk.
- **Suggested next step**: Decide the retention rule with the owner, then add reference-counted cleanup through the session deletion owner (`StudioSessionStore`), covering folder deletion too.

- **Migrated from**: v2.13.0#DF-3 on 2026-10-16 (reason: user-deferred)
- **Migration evidence**: left open by v2.13.0, the last plan of v2.13

- **Migrated from**: v2.14#DF-3 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: left open at the v2.14 close (v2.14.2 released 2026-10-19); needs an owner decision or evidence outside this run

#### DF-7 - An approved agent can replace the user's redo history

- **Source phase**: Phase 7 Tier 3 deep pass (adversarial review).
- **Plan reference**: T018; `core/image/ImageEditRecipe.ts` `reduceImageEditRecipe`.
- **Reason**: an approved agent may undo to the start and then commit a new edit, which drops the redo branch, including the user's own earlier edits. This is ordinary undo semantics and the original image is never touched; the Ask inbox text now says so. No checkpoint restores the history as it was when the grant was issued.
- **Suggested next step**: decide with the owner whether agents may branch below the cursor at grant time, or whether the recipe is checkpointed at grant issue so the user can restore it.

- **Migrated from**: v2.13.0#DF-4 on 2026-10-16 (reason: user-deferred)
- **Migration evidence**: left open by v2.13.0, the last plan of v2.13

- **Migrated from**: v2.14#DF-4 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: left open at the v2.14 close (v2.14.2 released 2026-10-19); needs an owner decision or evidence outside this run

#### WN-6 - Residual image-access hardening items from the adversarial review

- **Source phase**: Phase 7 Tier 3 deep pass (adversarial review).
- **Plan reference**: T018-T020; `image-command-contract.md`.
- **Reason**: (a) pre-existing: a holder of the app token can capture the Nexus window through `GET /nexus/screenshot` or `POST /nexus/capture` while an image is on screen, without an image grant; (b) before approval, `access` error codes reveal whether a turn has an owned PNG; (c) a link or junction on a parent of `~/.nexus/generations/exports` at first use is not detected (the leaf and later swaps are); (d) a render response is not bound to its request beyond id, size and a valid PNG, which relies on the renderer being the app's own window over its private IPC. Fixed in Phase 7 instead: unverified-name warning and request code in the ask, duplicate folding and per-caller caps, per-grant replay caches, one render per grant and 8 in total, full PNG chunk and CRC validation, generic errors, validated actions before hashing, collision-free and idempotent export names, hard-link refusal, and serialized Ask inbox writes.
- **Suggested next step**: decide whether capture routes should exclude image surfaces or require approval, and lstat every ancestor of the exports root at first use.

- **Migrated from**: v2.13.0#WN-3 on 2026-10-16 (reason: user-deferred)
- **Migration evidence**: left open by v2.13.0, the last plan of v2.13

- **Migrated from**: v2.14#WN-1 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: left open at the v2.14 close (v2.14.2 released 2026-10-19); needs an owner decision or evidence outside this run

#### WN-7 - The packaged desktop flows are not automated

- **Source phase**: Phases 5 and 6.
- **Plan reference**: Phase 5 and Phase 6 Verification Expectations; T016, T020.
- **Reason**: Restart is proven at the sidecar (real `sessions.db` and PNG, new store and ops), in the viewer (unmount and remount over the same state), and for pixels in headless Edge, the Chromium engine behind WebView2. Agent renders are proven at the authenticated route, the bridge and the renderer's claim/answer protocol, with the shared pixel path in the same engine. No harness drives the installed Tauri window through generate, edit, quit, relaunch and export, or carries an agent render request through the real shell into a live window.
- **Suggested next step**: Phase 7 human testing suggestions; a packaged-window driver if one is added later.

- **Migrated from**: v2.13.0#WN-1 on 2026-10-16 (reason: user-deferred)
- **Migration evidence**: left open by v2.13.0, the last plan of v2.13

Prior v2.12 and older registers remain authoritative. These new items resolve none of them.

- **Migrated from**: v2.14#WN-2 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: left open at the v2.14 close (v2.14.2 released 2026-10-19); needs an owner decision or evidence outside this run

#### DF-8 - Live rewrite quality remains unmeasured after pilot format HOLD

- **Source phase**: v2.14.1 Phase 1, T002-T004.
- **Plan reference**: [local rewrite evaluation](../../../archives/v2/v2.14/plans/v2.14.1-adoption-humanizer-handwired.md), blocked-run continuation.
- **Reason**: The sole started pilot response completed but fenced its JSON. The frozen envelope rejects fences without repair or retry. Three pilot items and all sixteen held-out items are not run; no semantic, readability or language-quality verdict is available.
- **Owner**: Maintainer.
- **Suggested next step**: If another evaluation is wanted, separately preregister a revised experiment with retained ancestry and obtain qualified language review. Do not replay this experiment, infer a quality loss or admit Humanizer from this observation.

- **Migrated from**: v2.14#DF-5 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: left open at the v2.14 close (v2.14.2 released 2026-10-19); needs an owner decision or evidence outside this run

#### DF-9 - Legacy history for OpenAI-compatible backends

- **Source phase**: Phase 3 - native tool history.
- **Plan reference**: [outline-promotion-readiness](../v2.12/plans/v2.12.0-outline-promotion-readiness.md), sub-task 3.1.
- **Reason**: The LM Studio and headless OpenAI clients convert coding history to the existing assistant-text plus user-role envelope format. Native Ollama history is proven locally on qwen3.5:9b and gemma4:12b; native round trips through other backends are not proven here.
- **Suggested next step**: Measure a live OpenAI-compatible native round trip and resume behavior before adding that backend's native message converter. Owner: the maintainer. Support tier: future for that native-history path.

- **Why still owed**: OpenAI-compatible backends still use the legacy history format, and native round trips through them are unproven.
- **Next step**: Record a live LM Studio native tool round trip and a resume, then add an 'openai' shape to toolHistory.toRequestMessages.
- **Migrated from**: v2.12#DF-v212-4 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

#### WN-8 - Historical evaluation diagnostic and timing limits

- **Source phase**: Phase 6 - evaluation results, sub-task 6.3.
- **Plan reference**: [outline-promotion-readiness](../v2.12/plans/v2.12.0-outline-promotion-readiness.md), sub-tasks 6.3 and 6.4.
- **Reason**: Both completed scored runs used a logger that omitted returned session errors. There are 51 error finishes with empty tails whose specific causes cannot be reconstructed; another 41 error-status rows finish at max-iterations. Only page caps 50 and 200 were prewarmed, so the original reports' claim that every question time excludes OCR is too broad. Counts, exact coverage and frozen scoring were validated; reporting was corrected after inference without modifying or rescoring the artifacts. Support tier: internal-compatible experimental path, candidate for promotion.
- **Suggested next step**: Preserve these limits in Phase 7 and the v2.13 removal/narrowing review. Use the corrected error capture and qualified timings for any separately authorized future diagnostic run; do not infer the missing historical causes or schedule repeats after futility. Owner: the maintainer. [Results](../v2.12/development/outline-eval.md), [metadata](../v2.12/development/evidence/phase-6-evaluation.json).

- **Why still owed**: Proposed for closure at v2.15.0 triage, not accepted by the owner (T010): Nothing can be done: the causes cannot be recovered, the logger is fixed, and the limits are written into outline-eval.md. It belongs with DF-v211-2's decision.
- **Next step**: Accept or reject the proposed closure recorded in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md`.
- **Migrated from**: v2.12#WN-v212-5 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

#### WN-9 - Outline retention is not bounded by session or idle expiry

- **Source phase**: Phase 7 - factual handbook review.
- **Plan reference**: [outline-promotion-readiness](../v2.12/plans/v2.12.0-outline-promotion-readiness.md), handbook refresh and final verification.
- **Reason**: The structure cache has a 50 MiB cap, but the summary store has no eviction cap. Text snapshots have lazy ten-minute idle expiry, while screened text persists for the tool instance's lifetime. Desktop and ACP reuse outline tools across sessions with identical workspace roots, including read authorization and call/output counters. Strict session isolation and ten-minute memory erasure are not implemented. The handbook now states these limits. Support tier: internal-compatible, experimental and off by default.
- **Suggested next step**: Review cache bounds, tool-scope lifetime and session reset requirements alongside the planned removal/narrowing decision. Preserve these limits until changed behavior has real-boundary evidence. Owner: the maintainer. Sources: `core/documents/OutlineCache.ts`, `core/documents/OutlineSummaries.ts`, `modules/coding/documents/DocumentOutlineTools.ts`, `modules/coding/runtime/headlessTools.ts`, `desktop/sidecar/src/coding/headlessAgentRunner.ts`, and `desktop/sidecar/src/acp/AcpAgent.ts`.

- **Why still owed**: The summary store is unbounded and outline state is not reset per session.
- **Next step**: Decide with DF-v211-2; if the tools stay, add a byte cap and eviction to OutlineSummaries and reset per session.
- **Migrated from**: v2.12#WN-v212-6 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

#### WN-10 - Media smoke proof needs separate packaging and installation evidence

- **Source phase**: Phase 7 - factual handbook review.
- **Plan reference**: [outline-promotion-readiness](../v2.12/plans/v2.12.0-outline-promotion-readiness.md), packaged installer qualification and final verification.
- **Reason**: The installed-media smoke harness records a supplied installer hash and exercises an installed sidecar; it does not install that candidate or establish installer-to-payload binding. Catalog-source reachability is a separate packaging check and is not invoked automatically by the Windows build. Generation-time artifact finalization checks are narrower than the smoke harness's decoded PNG and video probes. The corrected handbooks distinguish those evidence boundaries. Support tier: candidate for exact packaged installer/GPU qualification until the required operator evidence exists.
- **Suggested next step**: Retain catalog reachability output, installation of the exact candidate, installer-to-payload binding, and decoded PNG/video results together during packaged qualification. Assess deterministic binding and packaging-check enforcement when that path is implemented; do not certify an arbitrary existing installation from a supplied hash alone. Owner: the maintainer. Sources: `scripts/installer/build/smoke-installed-media.ps1`, `scripts/installer/build/build-windows.ps1`, and `scripts/installer/build/check-hf-catalog.py`.

- **Why still owed**: Installing the exact candidate, binding installer to payload, and the catalog reachability check are still missing; needs operator GPU hardware.
- **Next step**: In the next packaged qualification on an NVIDIA Windows host, run check-hf-catalog.py, install the exact NexusSetup.exe, then smoke-installed-media.ps1, keeping the outputs with the installer hash.
- **Migrated from**: v2.12#WN-v212-7 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

#### QG-2 - Terminal CI reconciliation requires explicit migration decisions

- **Source phase**: Phase 7 - terminal CI/CD comparison.
- **Plan reference**: [outline-promotion-readiness](../v2.12/plans/v2.12.0-outline-promotion-readiness.md), sub-task 7.5 and T025.
- **Reason**: The 23-field source/settings comparison has six PASS, eleven FAIL, three PARTIAL and three NOT PROVEN fields. Missing native report/release profiles, repeated feature-push/post-merge validation, incomplete pre-merge platform coverage, implicit permissions and inconsistent report publication are observable differences. On 2026-10-10 the maintainer approved, and Phase 7 applied, only the CI profile correctness patch and the action pin updates (four `actions/cache` references to v6.1.0 and the `scorecard.yml` `upload-sarif` commit pin); see the [pin evidence](../v2.12/development/evidence/phase-7-ci-action-pin-application.json). Those changes close none of the migration fields above. No permission, secret, required-check or settings change has been approved or applied. This is an incomplete gate, not an accepted bypass.
- **Suggested next step**: Retain [the comparison](../v2.12/development/phase-7-ci-comparison.md) and [input hashes/settings](../v2.12/development/evidence/phase-7-ci-inputs.json), prove remaining source/security fields, prepare exact incremental profile/event/reporting changes, and obtain each consequential CI/permission/settings approval before applying it. Re-gate locally and observe the approved integration topology. Owner: the maintainer. Existing canonical-profile carry-forward gaps remain open.

- **Why still owed**: None of the eleven FAIL fields is fixed; each needs a workflow, permission or settings change with its own approval.
- **Next step**: Draft an approval-ready proposal for field 15: explicit `permissions: contents: read` defaults for the 14 workflows, with job-level write grants listed.
- **Migrated from**: v2.12#QG-v212-1 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

#### BG-1 - SANA ControlNet SHA-256 pins are still the all-zero placeholder.

The files were not fetched.

- **Archived record**: `docs/archive/v2/v2.4/known-gaps.md`

- **Why still owed**: The three SANA ControlNet entries still ship all-zero pins and stay exempt, so an install of them has no integrity check.
- **Next step**: Owner decides keep or drop: keep means rotate with `pin-hf-weights.py --from-dir` from an authenticated download or a public mirror; drop means remove the three rows. Either way, empty PLACEHOLDER_SHA_LEGACY_EXEMPT.
- **Migrated from**: v2.12#BG-2 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

#### DF-10 - MiniCPM tool tags are stripped by Ollama before Nexus can parse them.

- **Archived record**: `docs/archive/v2/v2.4/known-gaps.md`

- **Why still owed**: A runtime-boundary blocker that waits on an Ollama change; neither exit route is open on the current version.
- **Next step**: On an Ollama newer than 0.32.15, re-run the recorded echo prompt (`/api/generate`, `raw: true`) and check whether `<function` survives.
- **Migrated from**: v2.12#DF-1 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

#### WN-11 - The bundled MiniCPM template has no tools section.

That template is outside this repo.

- **Archived record**: `docs/archive/v2/v2.4/known-gaps.md`

- **Why still owed**: The recorded exit check still fails, though the Jinja template may already open the /api/chat route; not proven here.
- **Next step**: Send one /api/chat request with a `tools` array to the MiniCPM tag and check whether the tool definitions reach the prompt; fold the result into the DF-1 re-probe.
- **Migrated from**: v2.12#WN-2 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

#### DF-11 - Live NVIDIA splat generate was not run.

- **Archived record**: `docs/archive/v2/v2.4/known-gaps.md`

- **Why still owed**: The feature ships and no live NVIDIA run is recorded.
- **Next step**: On a CUDA host with TripoSplat weights installed, run `node scripts/bench-gaussian-splat.mjs --real` and add the row to the splat baseline.
- **Migrated from**: v2.12#DF-v240-1 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

#### DF-12 - TripoSplat weight file hashes were not downloaded.

`source.sha256` is the all-zero placeholder.

- **Archived record**: `docs/archive/v2/v2.4/known-gaps.md`

- **Why still owed**: The TripoSplat files are still unpinned, and the pin check cannot see the entry, so the gap is also invisible to it.
- **Next step**: Add a weights.files list for the TripoSplat files at revision 56a96e60, then run `pin-hf-weights.py --model triposplat`.
- **Migrated from**: v2.12#DF-v240-2 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

#### DF-13 - Older version gap logs still contain operator and hardware items that were not re-tested.

- **Archived record**: `docs/archive/v1/` and `docs/archive/v2/v2.0` through `v2.3`

- **Why still owed**: Proposed for closure at v2.15.0 triage, not accepted by the owner (T010): A pointer to other ledgers, not a gap of its own; the v2.15.0 inventory and follow-up batches now track each of those items individually. Superseded by v2.15.0-followup-batches.md.
- **Next step**: Accept or reject the proposed closure recorded in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md`.
- **Migrated from**: v2.12#DF-v240-3 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

#### MT-2 - A real WebGL2 framebuffer was not captured.

- **Archived record**: `docs/archive/v2/v2.4/known-gaps.md`

- **Why still owed**: The feature ships and no real GPU framebuffer capture exists.
- **Next step**: On a GPU host, orbit a fixture splat in SplatViewerCanvas and save the canvas PNG and GL renderer string as evidence.
- **Migrated from**: v2.12#MT-v240-1 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

#### QG-3 - The full local suite was not run on the Electron `better-sqlite3` ABI.

CI Node 22 ran it on the merge.

- **Archived record**: `docs/archive/v2/v2.4/known-gaps.md`

- **Why still owed**: Proposed for closure at v2.15.0 triage, not accepted by the owner (T010): A one-session environment limit at v2.4.0 whose own next step is done on every merge.
- **Next step**: Accept or reject the proposed closure recorded in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md`.
- **Migrated from**: v2.12#QG-v240-1 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

#### QG-4 - `develop` and `main` require only `ci-required`; `installer-required` is not a required context.

Narrowed in v2.11.0: the gate now accepts `success` only, so a skipped installer leg fails it. Still open: the maintainer adds `installer-required` to branch protection after the v2.11.0 merge (a repository setting, not a file).

- **Archived record**: `docs/archive/v2/v2.5/known-gaps.md`

- **Why still owed**: The workflow side is done and its preconditions are met, but the repository setting that makes installer-required a required check is not applied.
- **Next step**: Maintainer only (repository setting): record current protection for rollback, then add the installer-required context to develop and main required checks.
- **Migrated from**: v2.12#CI-v251-1 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010); recorded as a QG item because this ledger has no CI category

#### DF-14 - Chat search still matches titles only.

A hit is not labelled with the branch it belongs to.

- **Archived record**: `docs/archive/v2/v2.6/known-gaps.md`

- **Why still owed**: Search still matches titles only and a hit does not name its branch; the exit condition is not met.
- **Next step**: Add forkedFromChatId and the parent title to the search hit in ChatExplorerStore.search, asserted in desktop/tests/sidecar-node/chat-explorer-phase5.test.ts.
- **Migrated from**: v2.12#DF-v260-1 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

#### QG-5 - The packaged offline probe was not re-run after adding Mermaid.

The v2.6.0 asset build is not that probe.

- **Archived record**: `docs/archive/v2/v2.6/known-gaps.md`

- **Why still owed**: Proposed resolved at low confidence at v2.15.0 triage, not accepted (T010): A packaged build with Mermaid passed the same offline judge with zero findings. Low confidence: the named script was not run, and the probe may not render a Mermaid diagram.
- **Next step**: Run `desktop/tests/packaged/offline.smoke.mjs` on the next packaged probe report and record `offline: PASS`.
- **Migrated from**: v2.12#QG-v260-1 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

#### DF-15 - User compaction is not written back to `chat_chat_messages`, so a restart reloads the pre-compact transcript.

- **Archived record**: `docs/archive/v2/v2.6/known-gaps.md`

- **Why still owed**: A compaction is still memory-only, so a restart reloads the pre-compact transcript.
- **Next step**: Add a ChatExplorerStore method that writes the snapshot and replacement chat_chat_messages rows in one transaction, called from compactActiveChat through a sidecar handler.
- **Migrated from**: v2.12#DF-v260-2 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

#### DF-16 - The Qwen3.8 guard matches `id` and `source.url` only.

- **Archived record**: `docs/archive/v2/v2.6/known-gaps.md`

- **Why still owed**: Every residual bypass in the original record is still open, and no decision says catalog review covers them.
- **Next step**: Widen the guard to family, name and displayName and a `p` separator, with tests in `TestQwen38FamilyGuard`.
- **Migrated from**: v2.12#DF-v260-3 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

#### DF-17 - Qwen3.8-27B is not admitted.

- **Archived record**: `docs/archive/v2/v2.6/known-gaps.md`

- **Why still owed**: Proposed for closure at v2.15.0 triage, not accepted by the owner (T010): The decision and its reopen conditions live in the acceptance bar and are enforced by the invariant; nothing is owed until a trigger fires.
- **Next step**: Accept or reject the proposed closure recorded in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md`.
- **Migrated from**: v2.12#DF-v260-4 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

#### DF-18 - No llama.cpp serving path.

- **Archived record**: `docs/archive/v2/v2.6/known-gaps.md`

- **Why still owed**: Catalog models that need mmproj or a draft model still cannot ship, and the runtime decision the exit condition requires has not been made.
- **Next step**: Write a runtime comparison (llama.cpp as a catalog serving path versus Ollama only) and record the decision as an ADR.
- **Migrated from**: v2.12#DF-v260-5 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

#### DF-19 - The uncensored-LLM product question is unanswered.

- **Archived record**: `docs/archive/v2/v2.6/known-gaps.md`

- **Why still owed**: The exit condition is an explicit product decision, and none is recorded.
- **Next step**: Owner records a yes or no on uncensored LLM entries (STRATEGY.md line or ADR), then close against it.
- **Migrated from**: v2.12#DF-v260-6 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

#### WN-12 - Release-scoped Qwen3.8 mentions under `docs/archive/` stay as written.

- **Archived record**: `docs/archive/v2/v2.6/known-gaps.md`

- **Why still owed**: Proposed for closure at v2.15.0 triage, not accepted by the owner (T010): A permanent decision not to rewrite archived release text; nothing is owed and nothing can change it.
- **Next step**: Accept or reject the proposed closure recorded in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md`.
- **Migrated from**: v2.12#WN-v260-1 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

#### QG-6 - The handbook HTML check fails on a CRLF working tree. - RESOLVED 2026-10-20

The index bytes are LF.

- **Archived record**: `docs/archive/v2/v2.7/known-gaps.md`

- **Why still owed**: The check still fails on a CRLF checkout although the committed HTML is current.
- **Next step**: Normalize the target's CRLF before comparing in generate-handbooks.mjs, with a CRLF temp-dir test.
- **Migrated from**: v2.12#QG-v270-1 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)
- **Resolution**: The generator's read-only drift comparison now normalizes CRLF to LF on both sides. Four actual CLI tests prove LF/CRLF equivalence without rewriting output, reject real content drift, reject missing output and retain BOM detection. The real CRLF checkout now reports all six sources matching. [Evidence and limits](development/v2.15.4-handbook-line-ending-evidence.md).

#### QG-7 - Narrowed in v2.11.0: `ci.yml` now defaults to `permissions: contents: read`, and `package.json` has `fast`, `full`, and `platform` profiles composed from existing commands. Still open: no `report` profile (it needs a summary writer that reads other profiles' output) and no `release` profile (publication belongs to semantic-release), and `ci.yml` still runs its own steps rather than calling the profiles. Owner: the maintainer.

- **Archived record**: `docs/archive/v2/v2.7/known-gaps.md`

- **Why still owed**: No working report or release profile, and CI runs inline steps; overlaps QG-v212-1 fields 2 and 3, which keeps this entry separate.
- **Next step**: Owner decides whether to fold this into v2.12.0#QG-v212-1; otherwise write the report summary writer, then (separate workflow approval) replace inline CI steps with profile calls.
- **Migrated from**: v2.12#QG-v270-2 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

#### QG-8 - `docs/handbooks/html/atlas.html` scrolls sideways at 390 px (524 px wide) from a cause other than inline code, and CI does not run `npm run docs:handbooks:check`, which let `atlas.html` go stale until v2.11.0 regenerated it. Owner: the maintainer. Next step: find the wide element in the atlas, and add the handbook check to the `fast` profile and CI.

- **Archived record**: `docs/archive/v2/v2.11/development/v2.11.0-last-phase-evidence.md`

- **Why still owed**: The overflow is fixed, but the narrow atlas table still breaks words and no CI job or profile runs the handbook check.
- **Next step**: After the QG-v270-1 fix, add docs:handbooks:check to the fast profile (CI wiring needs workflow approval), and set a wrap rule for the atlas table.
- **Migrated from**: v2.12#QG-v211-1 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

#### QG-9 - The production audit allowlist gained `global-agent`, `roarr`, and `sprintf-js` (GHSA-hp3w-g68c-fv3c, no patched `sprintf-js` release).

All three load only from `onnxruntime-node/script/install.js`, its install-time binary download, never at runtime. Fixing them needs a semver-major `global-agent` under a parent that pins `^3.0.0`. Five other advisories in the same audit were fixed in range (`proxy-addr` 2.0.8, `undici` 7.30.0, `fast-uri` 3.1.8, `ip-address` 10.7.3, `source-map-js` 1.2.2). Owner: the maintainer. Next step: remove the three entries when `onnxruntime-node` moves to `global-agent` 4 or a patched `sprintf-js` ships.

- **Archived record**: `scripts/check-prod-audit.mjs`

- **Why still owed**: The removal trigger fired (global-agent 4), but the unused allowlist entries are still in the script.
- **Next step**: Remove the three entries and their comment, then rerun check-prod-audit.
- **Migrated from**: v2.12#QG-v211-2 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

#### QG-10 - The three OS installers were not executed locally for the avatar plan.

The installer matrix workflow already exists.

- **Archived record**: `docs/archive/v2/v2.7/known-gaps.md`

- **Why still owed**: Proposed for closure at v2.15.0 triage, not accepted by the owner (T010): Plan-scoped, its own next step is in force, and the plan owed no installer run; running a real installer is tracked by v2.12.0#WN-v212-7 and CI-v251-1.
- **Next step**: Accept or reject the proposed closure recorded in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md`.
- **Migrated from**: v2.12#QG-v270-3 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

#### DF-20 - The community Qwen-Image GGUF and Bespoke Nimble are not admitted.

No catalog row. The living-bar sentences waited.

- **Archived record**: `docs/archive/v2/v2.8/known-gaps.md`

- **Why still owed**: Proposed for closure at v2.15.0 triage, not accepted by the owner (T010): The decline is recorded and indexed; the owed living-bar sentence was superseded by the declined-models index. The v2.8 record states no reopen conditions, which the owner may want to add.
- **Next step**: Accept or reject the proposed closure recorded in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md`.
- **Migrated from**: v2.12#DF-v280-1 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

#### DF-21 - CrisperWhisper 2.0 is not admitted.

The fetched page has no weights, license, or size. No catalog row.

- **Archived record**: `docs/archive/v2/v2.9/known-gaps.md`

- **Why still owed**: Proposed for closure at v2.15.0 triage, not accepted by the owner (T010): Recorded and indexed; the remaining doc step was superseded by the index. Nothing is owed unless weights, a license and a size are published.
- **Next step**: Accept or reject the proposed closure recorded in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md`.
- **Migrated from**: v2.12#DF-v290-1 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

#### DF-22 - Hosted Jev, Laya 0.3.20, and Kev 0.8B, 4B, 9B, and 27B are not admitted.

No catalog row.

- **Archived record**: `docs/archive/v2/v2.10/known-gaps.md`

- **Why still owed**: Proposed for closure at v2.15.0 triage, not accepted by the owner (T010): The decline is in the living index with its reasons and a guard test enforces it; nothing is owed.
- **Next step**: Accept or reject the proposed closure recorded in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md`.
- **Migrated from**: v2.12#DF-v210-1 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

#### DF-23 - CLM-8B is not admitted, no catalog row.

Its README gives Apache-2.0 code and weights, two frozen Qwen3-8B encoders with 20M-parameter heads, ranking over a closed candidate set, and a serve path of vLLM plus `clm-serve` with no Windows instructions. It does not close DF-11. The v2.10 hosted and license grounds no longer apply to it; the runtime, single-GPU, and job-map grounds still do. The PageIndex package and PageIndex Cloud are not adopted: default models are hosted, local mode asks for an OpenAI key, and OCR and MCP are cloud-only. The local equivalent is PI-1 in the v2.11.0 plan. AIRI was re-checked through 0.12.0-beta.5 with no new adoption.

- **Archived record**: `docs/archive/v2/v2.11/comparisons/v2.11.0-comparison-pageindex-airi-clm.md`

- **Why still owed**: Proposed for closure at v2.15.0 triage, not accepted by the owner (T010): Recorded and indexed with the grounds that still apply, and enforced by a guard test; nothing is owed.
- **Next step**: Accept or reject the proposed closure recorded in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md`.
- **Migrated from**: v2.12#DF-v211-1 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

#### DF-24 - The outline tools remain experimental and off by default.

The v2.12 Phase 6 frozen rule yields futility: expanded C cross-section scores are Qwen 0/20 and Gemma 4/20. Recommend removal or narrowing at the v2.13.0 review, with no repeats. Owner: the maintainer. M5 still requires a session-history or DEVLOG entry citing a workspace document hash and the answer obtained; absent that entry, remove the tools and settings keys at review.

- **Archived record**: [Measured result](../v2.12/development/outline-eval.md), original: `docs/archive/v2/v2.11/development/outline-eval.md`

- **Why still owed**: The frozen futility result calls for removing or narrowing the tools; no M5 entry exists and the owner decision due at v2.13 is not made.
- **Next step**: Owner decides: add the M5 DEVLOG entry (document hash and answer obtained), or remove the outline tools and their settings keys.
- **Migrated from**: v2.12#DF-v211-2 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

#### DF-25 - CPU OCR (RapidOCR, the portable default) costs about 6.8 s per text-dense page on this host: a 60-page PDF takes about 7 minutes on the first `document_outline` call, the same cost `parse_document` already pays. The GPU engine was not measured. The runtime also caps at 200 pages and reports `pageCount: 200`, hiding truncation past that.

- **Archived record**: `docs/archive/v2/v2.11/development/outline-feasibility.md`

- **Why still owed**: OCR cost is unchanged and the GPU engine is unmeasured; the page count still reports the capped value, though truncation is now marked.
- **Next step**: Return the PDF's total page count from runtimes/ocr beside the parsed count, and time a 100-page first outline on the GPU engine.
- **Migrated from**: v2.12#DF-v211-3 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

#### DF-26 - The missing mechanisms were implemented in v2.12 Phases 2-4: per-turn remaining-room budgets, native Ollama tool-role history and shared result compaction.

Phase 6 observed those paths, but the anchor A errors/no-answer including timeouts are Qwen 13 versus nine previously (target at most four), Gemma 15 versus 16 (target at most eight). Answer quality is not solved. Owner: the maintainer. Retain the measured miss and diagnostic limits in the v2.13 removal/narrowing review; do not schedule repeats after the frozen futility result.

- **Archived record**: [Measured result](../v2.12/development/outline-eval.md), [mechanism evidence](../v2.12/development/history/2026-10-09_outline-promotion-readiness-phase-4.md)

- **Why still owed**: Proposed for closure at v2.15.0 triage, not accepted by the owner (T010): The mechanism half is built; the answer-quality half is the removal-or-narrowing decision DF-v211-2 owns, so nothing separate is owed. Superseded by docs/v2/v2.12/known-gaps.md DF-v211-2.
- **Next step**: Accept or reject the proposed closure recorded in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md`.
- **Migrated from**: v2.12#DF-v211-7 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

#### DF-27 - The outline tools refuse PPTX and XLSX, though the OCR runtime reads both (`runtimes/ocr/documents.py`).

Supporting them needs two new document kinds in the shared core and a determinism measurement of their extraction engines before outlines may be cached. Owner: the maintainer. Next step: add the kinds with ephemeral (uncached) outlines, then measure.

- **Archived record**: `docs/archive/v2/v2.11/development/v2.11.0-last-phase-evidence.md`

- **Why still owed**: The outline tools still refuse PPTX and XLSX.
- **Next step**: Add pptx and xlsx DocumentKinds with uncached outlines and measure extraction determinism; low priority while DF-v211-2's removal decision is open.
- **Migrated from**: v2.12#DF-v211-6 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

#### WN-13 - No egress from the OCR child process is proven at socket level.

The test traps sockets in the Node process and scans first-party OCR sources for network imports; third-party OCR packages and first-run model downloads are not covered. Not proven here.

- **Archived record**: `tests/unit/modules/coding/documents/DocumentOutlineTools.test.ts`

- **Why still owed**: No process-level proof that the OCR child sends nothing out; third-party packages and first-run model downloads are uncovered.
- **Next step**: Run the OCR child under an OS-level network block during an outline parse and record the result as evidence.
- **Migrated from**: v2.12#WN-v211-6 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

#### WN-14 - When a parser returns markdown (the GPU OCR engine), per-page data is dropped, so `pagesParsed` reads 1 and sections carry no page range.

The CPU default and DOCX return pages and are unaffected; the GPU engine was not run here.

- **Archived record**: `modules/coding/documents/DocumentOutlineTools.ts` (`createExtractor`)

- **Why still owed**: Unchanged: GPU-engine markdown output still loses page ranges.
- **Next step**: Have the GPU engine return per-page markdown or page offsets so createExtractor keeps pages, with a markdown-and-pages fixture test.
- **Migrated from**: v2.12#WN-v211-7 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

#### WN-15 - The OCR runtime's `parse` result carries no engine version, so the outline cache key uses the engine id, the device, and a fixed version label.

An engine upgrade does not invalidate cached outlines by itself; the per-node anchor check refuses any slice from changed text, so the failure is safe but costs a rebuild.

- **Archived record**: `docs/archive/v2/v2.11/development/history/2026-10-02_v2.11.0-pageindex-airi-clm-phase-3.md`

- **Why still owed**: The cache key still uses a fixed version label; the failure is safe (a forced rebuild) but unchanged.
- **Next step**: Return engineVersion from runtimes/ocr/parse.py and pass it into createExtractor's EngineIdentity.version.
- **Migrated from**: v2.12#WN-v211-1 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

#### WN-16 - The ACP control-surface path builds the outline tools without a model client, so node summaries are off there.

The desktop coding runner and the VS Code extension have them.

- **Archived record**: `docs/archive/v2/v2.11/development/history/2026-10-02_v2.11.0-pageindex-airi-clm-phase-4.md`

- **Why still owed**: Summaries are still off on the ACP path.
- **Next step**: Pass outlineLlm from AcpAgent's own client and active model, mirroring headlessAgentRunner, with a test that summaries are on.
- **Migrated from**: v2.12#WN-v211-2 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

#### WN-17 - Both agent loops now send `tools` natively to every model whose catalog format is not `none` (the extension already did).

A model Ollama reports without the `tools` capability may reject such a request. Not proven here: every chat model installed on this host declares `tools`.

- **Archived record**: `docs/archive/v2/v2.11/development/history/2026-10-03_v2.11.0-pageindex-airi-clm-phase-5.md`

- **Why still owed**: Nothing checks model capabilities before sending native tools, and the behavior with a model that lacks them is unproven.
- **Next step**: Read /api/show capabilities once per model and skip native tools when `tools` is missing, with a stubbed unit test.
- **Migrated from**: v2.12#WN-v211-4 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

#### WN-18 - The summary path's loopback check reuses `isLoopbackEndpoint`: an exact host match that rejects look-alike hosts, `0.0.0.0`, and IPv4-mapped addresses, but does not resolve DNS for `localhost` or refuse an HTTP redirect from the model server.

- **Archived record**: `docs/archive/v2/v2.11/development/history/2026-10-02_v2.11.0-pageindex-airi-clm-phase-4.md`

- **Why still owed**: The limit is unchanged; accepting or hardening it is an open owner decision.
- **Next step**: Decide: accept as a documented limit, or make the summary request refuse redirects (fetch redirect: 'error') with a test.
- **Migrated from**: v2.12#WN-v211-3 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

#### DF-28 - Aleph Alpha's Kolibri-1 (released 2026-10-03, Apache-2.0, 78B total and 3.46B active parameters, about 78 GB in FP8) is not admitted, no catalog row.

The smallest community GGUF (Q3_K_S, about 3.47 bits per weight) is roughly 34 GB by arithmetic, above the 24 GB top tier. Stock Ollama, llama.cpp, and LM Studio cannot load it; the official path needs vLLM with the vendor `aleph-alpha-inference` package. The trained context is 262,144 tokens; 1M is an extrapolation. It fails gates 3, 4, and 5 of the v2.3.0 admission record. Reopen conditions: BOTH a runtime condition (an official `ollama.com/library` tag, or Kolibri support merged into a released upstream llama.cpp) AND a size condition (a first-party Kolibri variant whose quantized weights plus KV cache at the tier's context fit 24 GB, or a raised top tier in `core/registry/recommended.json`). Meeting both reopens the acceptance bar; neither admits the model. Owner: the maintainer.

- **Archived record**: `docs/v2/v2.12/comparisons/v2.12.0-comparison-kolibri-1.md`

- **Why still owed**: Proposed for closure at v2.15.0 triage, not accepted by the owner (T010): Recorded with explicit reopen conditions and enforced by a guard test. The guard test reads the register entry, so the entry text must stay in place when closed.
- **Next step**: Accept or reject the proposed closure recorded in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md`.
- **Migrated from**: v2.12#DF-v212-1 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

#### DF-29 - No catalog-wide check that every entry's declared size fits its tier; the Kolibri-1 decision keeps a per-model guard instead (decided at the seed plan's grill).

Source phase: v2.12.0 Phase 1. Plan reference: `docs/v2/v2.12/plans/v2.12.0-adoption-kolibri-1.md`, parked gaps. Owner: the maintainer. Next step: a plan that already edits `core/registry/catalog.json` measures how many current entries such a check would flag before adopting it. Measured in v2.14.0 Phase 5 over 41 entries ([script](../../../archives/v2/v2.14/development/evidence/measure-catalog-size-check.mjs)): a tier-default check flags 1 (`qwen3.5:4b` is a cpu agentic default yet declares `requiredVramGB` 4); a field-consistency check flags 9 (six `hideBelowVramGB` values below the declared need, several apparently deliberate for offload builds; two embedding models with `vramGB` 1 over `requiredVramGB` 0; `triposplat` with no `sizeGB`). Adoption stays an owner decision.

- **Archived record**: `docs/v2/v2.12/plans/v2.12.0-adoption-kolibri-1.md`

- **Why still owed**: The measurement is done; the owner's adopt-or-decline decision is not, and the measurement surfaced unresolved field inconsistencies.
- **Next step**: Owner decides from the v2.14 measurement: adopt the tier-default check after fixing the flagged entry, or record a decline.
- **Migrated from**: v2.12#DF-v212-2 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

#### DF-30 - No catalog field separates a vendor's trained context from its extrapolated maximum (comparison KOL-2).

Source phase: v2.12.0 Phase 1. Plan reference: `docs/v2/v2.12/plans/v2.12.0-adoption-kolibri-1.md`, parked gaps. Owner: the maintainer. Next step: reopen when a second model with an extrapolated context claim reaches review.

- **Archived record**: `docs/v2/v2.12/comparisons/v2.12.0-comparison-kolibri-1.md`

- **Why still owed**: A watch item with a trigger that only this entry and a plan carry; closing it would lose the watch.
- **Next step**: Move the trigger into model-acceptance.md as an open question, then close the entry against it.
- **Migrated from**: v2.12#DF-v212-3 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: triaged in `docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md` (v2.15.0 T009 and T010)

#### BG-2 - Installer puller tests pass or fail with the CI runner's free disk space - RESOLVED 2026-10-20

- **Source phase**: v2.15.0 release (2026-10-20), on release PRs #121 and #122.
- **Plan reference**: v2.15.0 T026 / release; `scripts/installer/src/nexus_installer/engine/hf_weights_puller.py:588`.
- **Reason**: `install_model` checks `shutil.disk_usage(models_root)` against the model size plus the 10 GB OS reserve, and `scripts/installer/tests/test_hf_weights_puller.py` does not mock it. So the tests pass or fail with the host's real free space. "Installer tests + lint + smoke" failed 12 tests on #121 and #122 (two `Not enough disk space` errors in each log) and passed on #123. Locally, `TestPrecisionVariants::test_state_override_reaches_install_model` fails with "22.7 GB free, need ~15.0 GB plus the 10 GB OS reserve", on this branch and on untouched `develop` (`169d8b3b`). The check is not required; the product code is not wrong.
- **Suggested next step**: monkeypatch `shutil.disk_usage` in those tests (a fixture in `scripts/installer/tests/conftest.py`), keep one test that asserts the real disk-space refusal with a small fake free value, then run `PYTHONPATH=src python -m pytest tests/test_hf_weights_puller.py` on a nearly full disk.
- **Resolution**: The mocked download classes now explicitly use a sufficient-space fixture scoped to this test module. The production reserve, dedicated disk-precheck tests and environment-gated live download remain unchanged. The original precision-override test failed with a forced zero-space host probe before this repair; the entire repaired module passes with forced zero-space and ample-space host probes (54 passed, one live smoke skipped). [Proving commands and limits](development/v2.15.4-installer-disk-test-evidence.md).

#### WN-19 - Two v2.13 migrations cannot be verified because v2.14 recorded their resolution as table rows - RESOLVED 2026-10-20

- **Source phase**: v2.15.0 Phase 5 (2026-10-19), known-gaps reconciliation (T018).
- **Plan reference**: v2.15.0 T018; `node scripts/known-gaps/inventory.mjs --verify-migrations` notes.
- **Reason**: `docs/releases/v2/v2.13/known-gaps.md` marks `WN-2` ("Skill tests leave empty folders in the source catalog") and `QG-1` ("Two tests time out under full-suite load at vitest's 5 s default") ` - MIGRATED to v2.14.0`. Both were carried and fixed in v2.14.0 Phase 5: `docs/archives/v2/v2.14/known-gaps.md` lists them as `WN-3` and `QG-1` in its `### Resolved` table, with the fixes. A table row is not an entry to the completion checker, so its migration check finds no copy (`migration-target-missing`) and `gaps.minor` cannot verify the v2.13 ledger. The work is done; only the provenance the checker reads is missing.
- **Suggested next step**: in the v2.14 archive's `### Resolved` subsection, add one entry per item whose title and body copy the v2.13 entry verbatim, followed by its resolution text from the table row and `- **Migrated from**: v2.13#<ID> on 2026-10-16 (reason: user-deferred)`. Then confirm with `inventory.mjs --verify-migrations` that both read `migration-copy-complete`.
- **Resolution**: Append-only WN-3 and QG-1 entries preserve both complete source titles/bodies and the existing table evidence. All eight v2.13 copies now report migration-copy-complete; the pinned inventory verifier's two missing-copy notes are gone. [Independent verification](development/v2.15-closeout-first-repairs-review.md). This proves copy/provenance integrity only; historical approval-record and alternate-release checks remain separate closeout blockers under QG-11.

#### QG-11 - The completion checker's contract conflicts block every minor run here

- **Source phase**: v2.15.0 Phase 4 (2026-10-19), from the v2.14 run and the v2.15 run.
- **Plan reference**: v2.15.0 T015; [Nexus-Hub checker handoff](development/v2.15.0-nexus-hub-checker-handoff.md).
- **Reason**: the Nexus-Hub completion checker (v4.13.13, `completion_minor.py` sha256 `f1689e72b6f96835`) has contract conflicts that are not missing work in this repository and that this repository cannot fix: (1) `gaps.minor` reaches every ledger back to v0.7, and the 142 problems left in v0.7 and v1.0 to v1.3 can never parse, so `MINOR COMPLETE` is unreachable without a legacy cutoff; (2) `tests.evidence` rejects an honest count of pre-existing failures; (3) `release.changelog` expects `## [x.y.z]` while semantic-release writes `# [x.y.z](...)`; (4) a re-recorded run resets `start_head`, and a plan rename reads as tampering; (5) run-owned merged branches are kept as `recently-active`; (6) `record block` rejects a legitimate `approval-not-covered`; (7) a blocker-answer paste was not captured in the v2.14 run (it was captured in v2.15); (8) `minor_close.py archive` repairs Markdown links only; (9) record lookup from a linked worktree fails (`record block`, `migrate`); (10) `check-minor` hides predicate detail when blocked; (11) `check_handbooks.py` hashes working-copy CRLF bytes; (12) `validate_unicode_safety.py --fix` rewrites raw evidence; (13) small items (relative `load_ledgers` root, the approval page's gap and time wording); (14) `record answer --text` spends the round on a note; (15) the turn-end gate reads the plan from the main checkout and opens `no-progress` while a run waits on its own agents; (16) no tool migrates a gap from an older minor into the current one; (17) a task whose path a later phase deletes reads unmet after the merge, because the task-path log lacks `--full-history`. Each finding, with its evidence and a suggested fix, is in the handoff prompt.
- **Suggested next step**: give the handoff prompt to the agent maintaining Nexus-Hub, and record its answer (fixed, already fixed, or declined, with reasons) here; then re-run `check_plan_completion.py check-minor v2.15` and close the findings it resolves.

### Resolved

| ID | Title | Resolved in | Notes |
|---|---|---|---|
| MT-1 | The Windows stdin regression test never runs in CI | v2.14.0 Phase 5 (owner-approved workflow change, 2026-10-17) | `ci.yml` `init-check-windows` now runs `python -m pytest tests/python/audio -q` on Windows after `init.ps1` (off pull requests, like the job). Locally: 38 passed; workflow tests 51 passed; `nexus-check` unchanged at its baseline |
