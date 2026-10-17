# Known Gaps - v2.15

**Project**: Nexus
**Status**: in-progress
**Last updated**: 2026-10-16
**Open items**: 2

## v2.15.0

### Summary

| Category | Open | Resolved |
|---|---|---|
| Not implemented (NI) | 0 | 0 |
| Deferred (DF) | 2 | 0 |
| Bugs / regressions (BG) | 0 | 0 |
| Warnings (WN) | 0 | 0 |
| Missing tests / coverage gaps (MT) | 0 | 0 |
| Quality-gate gaps (QG) | 0 | 0 |

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

### Resolved

| ID | Title | Resolved in | Notes |
|---|---|---|---|
