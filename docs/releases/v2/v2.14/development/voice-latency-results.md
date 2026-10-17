# Voice Latency Results and PersonaPlex Trigger (T010)

**Plan**: [v2.14.0 voice latency and LFM2.5-24B trial](../plans/v2.14.0-adoption-voice-latency-lfm2.5-24b.md), task T010
**Gates**: [`gates.md`](gates.md), frozen before these results existed
**Host**: RTX 3080 Ti Laptop GPU (16 GB), Windows 11, Ollama 0.32.15, Chat model `gemma-4-12b-it-gguf` (`gemma4:12b`)
**Records**: [`voice-latency-baseline.json`](voice-latency-baseline.json), [`voice-latency-streamed-pass1.json`](voice-latency-streamed-pass1.json), [`voice-latency-streamed-pass2.json`](voice-latency-streamed-pass2.json)

## Method

All three runs used `scripts/measure-voice-latency.mjs` against the built sidecar over stdio, on the same three synthetic fixtures, 5 cold and 20 warm turns per fixture; streamed runs added 5 barge-in turns per fixture. Streamed mode sends the turn with `voice: { jobId }`, polls `audio.speakDrain` every 100 ms as the webview does (`SPOKEN_REPLY_POLL_MS`), and schedules segments back to back as the webview plays them. "Time to first audio" is the plan's definition: from the transcription request to the first audio reaching the playback path, read here as the first segment received from the sidecar.

## Pass 1: streamed pipeline as planned (T005 to T009)

Values are ms, p50 / p95.

| Fixture | Runs ok | Transcribe | Time to first audio | Time to last audio | Gap between segments | Barge-in cancel |
|---|---|---|---|---|---|---|
| short, cold | 5/5 | 4,728 / 5,515 | 15,823 / 18,126 | 18,123 / 20,426 | n/a | n/a |
| short, warm | 20/20 | 3,979 / 4,171 | 8,285 / 9,113 | 10,585 / 11,413 | n/a | n/a |
| short, barge-in | 5/5 | 3,996 / 4,163 | 8,424 / 8,701 | n/a | n/a | n/a |
| medium, cold | 5/5 | 4,887 / 4,956 | 30,581 / 36,681 | 55,806 / 58,317 | 0 / 0 | n/a |
| medium, warm | 20/20 | 4,292 / 4,851 | 19,592 / 28,339 | 46,180 / 54,764 | 0 / 0 | n/a |
| medium, barge-in | 5/5 | 5,026 / 5,321 | 21,588 / 27,293 | n/a | n/a | 12 / 26 |
| long, cold | 5/5 | 4,868 / 4,955 | 37,052 / 39,406 | 90,627 / 101,656 | 0 / 0 | n/a |
| long, warm | 20/20 | 5,734 / 7,990 | 26,690 / 55,607 | 83,378 / 109,157 | 0 / 0 | n/a |
| long, barge-in | 5/5 | 4,949 / 6,560 | 48,160 / 90,462 | n/a | n/a | 25 / 26 |

## Rework iteration (the one the cut-line allows)

Pass 1 missed V-1. Timing the chat model directly through Ollama showed the cause: with its default reasoning, `gemma4:12b` emits its first visible token 16 to 21 s after the request (2,514 to 3,227 characters of hidden reasoning first); with `think: false` the first visible token comes 0.1 to 0.2 s after the request. Transcription also rebuilt Whisper on every call (4 to 7 s). The owner chose both levers on 2026-10-16:

1. **Whisper is built once per process** (`runtimes/audio/engines.py` `_whisper_model`), as T005 did for Kokoro. No behavior change.
2. **Spoken replies skip the model's hidden reasoning pass**: a turn carrying a voice job sends `think: false` (`desktop/sidecar/src/chat/chatMessageHandler.ts`). Typed turns are unchanged. This trades some answer quality on hard questions for speech that starts within seconds.

## Pass 2: after the rework

Values are ms, p50 / p95.

| Fixture | Runs ok | Transcribe | Time to first audio | Time to last audio | Gap between segments | Barge-in cancel |
|---|---|---|---|---|---|---|
| short, cold | 5/5 | 4,794 / 5,955 | 13,132 / 33,087 | 15,432 / 35,387 | n/a | n/a |
| short, warm | 20/20 | 830 / 875 | 1,715 / 1,809 | 4,015 / 4,109 | n/a | n/a |
| short, barge-in | 5/5 | 846 / 852 | 1,721 / 1,726 | n/a | n/a | n/a |
| medium, cold | 5/5 | 4,991 / 5,057 | 15,145 / 15,421 | 40,121 / 41,410 | 0 / 0 | n/a |
| medium, warm | 20/20 | 1,332 / 1,440 | 3,990 / 4,552 | 29,702 / 31,401 | 0 / 0 | n/a |
| medium, barge-in | 5/5 | 1,267 / 1,313 | 4,027 / 4,889 | n/a | n/a | 12 / 26 |
| long, cold | 5/5 | 4,857 / 4,938 | 15,431 / 15,562 | 80,412 / 87,781 | 0 / 0 | n/a |
| long, warm | 20/20 | 1,745 / 1,817 | 4,166 / 5,228 | 67,180 / 71,980 | 0 / 0 | n/a |
| long, barge-in | 5/5 | 887 / 1,766 | 3,408 / 4,399 | n/a | n/a | 13 / 26 |

## Gate verdicts

Final verdicts are judged on pass 2, the result that ships. Reference: medium fixture, warm, p50 unless stated.

| Gate | Rule | Measured | Verdict |
|---|---|---|---|
| V-1 | Time to first audio at most 2,000 ms | 3,990 ms (pass 1: 19,592 ms; short fixture 1,715 ms) | **FAIL** |
| V-2 | At least 40% below the baseline 38,579 ms | 89.7% below | PASS |
| V-3 | p95 gap between segments under 300 ms, medium and long | 0 ms | PASS |
| V-4 | Time to last audio no worse than baseline, per fixture | short 4,015 vs 12,534; medium 29,702 vs 70,606; long 67,180 vs 113,941 ms | PASS |
| V-5 | Playback stops within 150 ms of barge-in | Synchronous pause on abort (see limits) | PASS (code path; not timed on a speaker) |
| V-6 | Synthesis reports cancelled within 500 ms | p95 26 ms (medium and long barge-in runs) | PASS |
| V-7 | Spoken text equals the speakable projection | Property and sidecar tests (see limits) | PASS (tests) |
| V-8 | Zero non-loopback connections during a voice turn | 0 non-loopback connections in 3,002 samples over the whole pass 2 run (58 sidecar, audio runtime and model server processes; `evidence/egress-pass2.txt`) | PASS |

**Owner decision on the cut-line (2026-10-16).** The plan's cut-line says that if a gate is still missed after the one rework iteration, the streaming path is reverted. Only V-1 is missed, by about 2 s, while the streamed path cut time to first audio by 89.7%. The owner chose to keep the streamed path and record the V-1 miss as a known gap ("Keep streaming; record V-1 miss"). This is a recorded departure from the plan's literal cut-line, not a gate change: `gates.md` is unchanged and V-1 stays FAIL.

**Where the remaining time goes (pass 2, medium warm, p50).** Transcription about 1,332 ms, the model's first visible token about 130 ms after that, then the rest of the first sentence and its synthesis before the first segment is ready at 3,990 ms. A reply that opens with a short sentence (the short fixture) starts speaking at 1,715 ms.

## PersonaPlex (V3) trigger

**FIRED.** V-1's 2.0 s target was missed after Phase 2 and its rework (3,990 ms p50 on the reference fixture). Per the plan, this release builds nothing for PersonaPlex. A v2.15+ candidate is recorded in `known-gaps.md` with the comparison's preconditions: 24 GB tier only, the loopback bind and `torch.load` fixes, a `licenseNote`, and no Nexus memory or tools in that mode.

## Measurement limits

- V-5 (playback stops within 150 ms) is judged from the webview code path, not timed on a speaker: barge-in aborts the job's `AbortController`, whose listener calls `HTMLAudioElement.pause()` synchronously and resolves the playback promise (`useSpokenReply.ts` `playWithAudioElement`); `desktop/tests/useSpokenReply.test.tsx` proves the abort stops the queue and calls `audio.speakCancel`. A timed packaged-app check is in the human testing suggestions.
- V-7 (spoken text equals the speakable projection) is proven by tests, because the measurement sees audio, not text: `tests/unit/core/chat/speakable.test.ts` shows streamed projection equals the whole-reply projection under 200 random chunkings per reply, and `desktop/tests/voice-jobs.test.ts` shows reasoning, secrets, code and URLs never reach synthesis.
- The packaged desktop app was not driven in this phase; the sidecar is the real IPC boundary the webview uses.
