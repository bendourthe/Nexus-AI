# Frozen Voice and Model Gates (T003)

**Plan**: [v2.14.0 voice latency and LFM2.5-24B trial](../plans/v2.14.2-adoption-voice-latency-lfm2.5-24b.md), task T003
**Frozen**: 2026-10-16, before any Phase 2 or Phase 3 result exists
**Source of values**: the owner-accepted answers to the 2026-10-14 grill (Q4, Q6, Q7, Q8), recorded in the plan's "Planning review and owner decisions"

These gates do not change after a Phase 2 or Phase 3 result exists. A later edit to this file is a gate change, and a gate change after results exist is invalid evidence.

## Common definitions

- **Baseline**: `voice-latency-baseline.json`, written by `scripts/measure-voice-latency.mjs --mode baseline` on this host before any Phase 2 change. Its per-fixture warm statistics are the reference.
- **Time to first audio**: the plan Goals definition. Wall time from the transcription request to the first audio sample reaching the webview's playback path, measured warm on the medium fixture on the reference 16 GB tier.
- **Speakable projection**: the plan Goals definition. Visible text with reasoning and tool-call text removed, `redactSecrets` applied before sentence splitting, fenced code and tables replaced by "code is on screen" and "table is on screen", and links spoken by label, never by URL.
- **Reference host**: RTX 3080 Ti Laptop GPU (16 GB), Windows 11, Ollama 0.32.15, Chat model `gemma-4-12b-it-gguf` (the 16 GB tier chat default, which resolves to `gemma4:12b`).

## Voice gates (Phase 2)

Measured by `scripts/measure-voice-latency.mjs --mode streamed` with the same fixtures, model and host as the baseline.

| Id | Gate | Pass rule |
|---|---|---|
| V-1 | Time to first audio, absolute | Median (p50) warm on the medium fixture at most 2,000 ms |
| V-2 | Time to first audio, relative | Median warm on the medium fixture at least 40% below the baseline median |
| V-3 | Stutter | p95 silent gap between consecutive segments under 300 ms, on the medium and long fixtures |
| V-4 | Time to last audio | Median warm time to last audio no worse than the baseline median, per fixture |
| V-5 | Barge-in, playback | Playback stops within 150 ms of barge-in |
| V-6 | Barge-in, synthesis | The synthesis job reports cancelled within 500 ms of barge-in |
| V-7 | Spoken text | Spoken text equals the speakable projection on every fixture (no reasoning, secrets, code, table text or URLs are spoken) |
| V-8 | Egress | Zero non-loopback connections during a voice turn |

**V3 trigger (PersonaPlex)**: FIRED if V-1 fails after Phase 2 (including its one bounded rework iteration), otherwise NOT FIRED. A fired trigger records a v2.15+ candidate; this release builds nothing for V3.

**Voice cut-line**: not applied. The owner's T001 usage note says voice is a primary channel for the target users at release, so the wait (not other reasons) is the deciding factor and the full streaming track proceeds.

### Runtime bounds frozen for T005 and T008

| Bound | Value | Applies to |
|---|---|---|
| Maximum text per synthesis request | 8,000 characters | `speak`, `speak.stream`, `AudioSpeakRequest` `.max()` |
| Maximum segments per job | 200 | `speak.stream` |
| Maximum bytes per segment | 2,097,152 (2 MiB of base64 WAV) | `speak.stream` |
| Maximum bytes per job | 67,108,864 (64 MiB) | `speak.stream` and the sidecar drain buffer |
| Per-segment synthesis timeout | 30,000 ms | `speak.stream` |
| Client idle timeout, reset per segment | 30,000 ms | `core/audio` streaming speak |

## Model gates (Phase 3)

Arms, both on this host and on the post-v2.12/v2.13 baseline, over all golden tasks in `tests/golden/tasks`:

- **Candidate**: `hf.co/LiquidAI/LFM2.5-24B-A2B-GGUF:QAD-Q4_0` (T002 verdict GO), sampler temperature 0.1, top_k 50, repeat_penalty 1.05, `lfm-pythonic` codec.
- **Holder**: `nemotron-lightning:30b-a3b-offload` (weights `nemotron-3.5-lightning:30b`), its catalog sampler and its current codec.

| Id | Gate | Pass rule |
|---|---|---|
| M-1 | Fit | T002 fit holds: the candidate loads at 32K context with no CPU spill (met by QAD-Q4_0 in T002) |
| M-2 | Codec | Zero codec parse failures for the candidate across every run |
| M-3 | Win | Either (a) higher golden-task completion than the holder at no worse p95 turn time, or (b) equal completion with p95 turn time at least 25% better |

**Verdicts.** Each gate is PASS, FAIL or HOLD. HOLD applies when an arm has fewer than three complete runs, when a completion difference falls within the run-to-run spread (the range of completion counts across that arm's runs), or when the wall-clock budget ends before both arms finish. The candidate is admitted only when M-1, M-2 and M-3 all PASS. HOLD and ties decline.

**Phase 3 wall-clock budget: 10 hours** for both arms together, measured from the first golden run to the last. Basis: T002 decode speeds of 156 to 162 tok/s for the candidate and 19 to 50 tok/s for the holder, so the holder sets the pace. Three holder runs at an assumed 2 to 3 minutes per task over 28 tasks take roughly 3 to 4 hours, the candidate roughly a quarter of that, leaving margin for a fourth run per arm and one restart. If the budget ends first, the result is HOLD and the model declines.

## Owner usage note (T001, plan question Q3)

"I personally never use it, and never tested it. But I know many people only use this and expect to be using it when the product is released." Recorded 2026-10-16. Voice also could not run on an installed host before this phase's provisioning fix, so there is no prior usage to measure.
