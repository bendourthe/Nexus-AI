# Known Gaps - v2.15

**Project**: Nexus
**Status**: in-progress
**Last updated**: 2026-10-19
**Open items**: 16

## v2.15.0

### Summary

| Category | Open | Resolved |
|---|---|---|
| Not implemented (NI) | 0 | 0 |
| Deferred (DF) | 8 | 0 |
| Bugs / regressions (BG) | 0 | 0 |
| Warnings (WN) | 7 | 0 |
| Missing tests / coverage gaps (MT) | 0 | 1 |
| Quality-gate gaps (QG) | 1 | 0 |

### Open Items

#### DF-1 - Spoken replies start in 4 s, not the 2.0 s target

- **Source phase**: v2.14.0 Phase 2 (2026-10-16).
- **Plan reference**: v2.14.0 T010; gate V-1 in `docs/releases/v2/v2.14/development/gates.md`; results in `docs/releases/v2/v2.14/development/voice-latency-results.md`.
- **Reason**: after the streamed pipeline and its one rework iteration (Whisper cached, `think: false` on voice turns), median time to first audio on the medium fixture is 3,990 ms against the 2,000 ms gate (baseline 38,579 ms; short fixture 1,715 ms). The remaining time is transcription (about 1.3 s) plus the model finishing and synthesizing its first full sentence. The owner kept the streamed path rather than reverting it as the plan's cut-line would have (decision recorded in the results). Recorded here, not in the v2.14 ledger, because a gap opened during the v2.14 run cannot migrate at that minor's close.
- **Suggested next step**: measure a short spoken lead-in (the first clause, split at a comma, synthesized before the full sentence) and a smaller STT model for voice turns, each against V-1 with `scripts/measure-voice-latency.mjs --mode streamed`.

#### DF-2 - PersonaPlex full-duplex voice is a v2.15+ candidate

- **Source phase**: v2.14.0 Phase 2 (2026-10-16).
- **Plan reference**: v2.14.0 T010 (V3 trigger FIRED); comparison `docs/releases/v2/v2.14/comparisons/v2.14.0-comparison-airllm-digup-mimic-personaplex.md`.
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
- **Plan reference**: v2.14.0 T014, T016; gate M-3 in `docs/releases/v2/v2.14/development/gates.md`; `docs/releases/v2/v2.14/development/lfm-ab-results.json`.
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
- **Plan reference**: [local rewrite evaluation](../v2.14/plans/v2.14.1-adoption-humanizer-handwired.md), blocked-run continuation.
- **Reason**: The sole started pilot response completed but fenced its JSON. The frozen envelope rejects fences without repair or retry. Three pilot items and all sixteen held-out items are not run; no semantic, readability or language-quality verdict is available.
- **Owner**: Maintainer.
- **Suggested next step**: If another evaluation is wanted, separately preregister a revised experiment with retained ancestry and obtain qualified language review. Do not replay this experiment, infer a quality loss or admit Humanizer from this observation.

- **Migrated from**: v2.14#DF-5 on 2026-10-19 (reason: user-deferred)
- **Migration evidence**: left open at the v2.14 close (v2.14.2 released 2026-10-19); needs an owner decision or evidence outside this run

### Resolved

| ID | Title | Resolved in | Notes |
|---|---|---|---|
| MT-1 | The Windows stdin regression test never runs in CI | v2.14.0 Phase 5 (owner-approved workflow change, 2026-10-17) | `ci.yml` `init-check-windows` now runs `python -m pytest tests/python/audio -q` on Windows after `init.ps1` (off pull requests, like the job). Locally: 38 passed; workflow tests 51 passed; `nexus-check` unchanged at its baseline |
