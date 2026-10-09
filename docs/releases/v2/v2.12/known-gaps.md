# Known Gaps - v2.12

**Project**: Nexus
**Status**: in-progress
**Last updated**: 2026-10-09

The [existing carry-forward register](../../../v2/v2.12/known-gaps.md) remains the source for older open items. This canonical ledger records new phase dispositions without duplicating those items.

## v2.12.0

### Summary

| Category | Open | Resolved |
|---|---|---|
| Not implemented (NI) | 0 | 0 |
| Deferred (DF) | 1 | 1 |
| Bugs / regressions (BG) | 0 | 0 |
| Warnings (WN) | 1 | 1 |
| Missing tests / coverage gaps (MT) | 0 | 0 |
| Quality-gate gaps (QG) | 0 | 0 |

### Open Items

#### Deferred

##### DF-v212-4 - Legacy history for OpenAI-compatible backends

- **Source phase**: Phase 3 - native tool history.
- **Plan reference**: [outline-promotion-readiness](../../../v2/v2.12/plans/v2.12.0-outline-promotion-readiness.md), sub-task 3.1.
- **Reason**: The LM Studio and headless OpenAI clients convert coding history to the existing assistant-text plus user-role envelope format. Native Ollama history is proven locally on qwen3.5:9b and gemma4:12b; native round trips through other backends are not proven here.
- **Suggested next step**: Measure a live OpenAI-compatible native round trip and resume behavior before adding that backend's native message converter. Owner: the maintainer. Support tier: future for that native-history path.

#### Warnings

##### WN-v212-5 - Historical evaluation diagnostic and timing limits

- **Source phase**: Phase 6 - evaluation results, sub-task 6.3.
- **Plan reference**: [outline-promotion-readiness](../../../v2/v2.12/plans/v2.12.0-outline-promotion-readiness.md), sub-tasks 6.3 and 6.4.
- **Reason**: Both completed scored runs used a logger that omitted returned session errors. There are 51 error finishes with empty tails whose specific causes cannot be reconstructed; another 41 error-status rows finish at max-iterations. Only page caps 50 and 200 were prewarmed, so the original reports' claim that every question time excludes OCR is too broad. Counts, exact coverage and frozen scoring were validated; reporting was corrected after inference without modifying or rescoring the artifacts. Support tier: internal-compatible experimental path, candidate for promotion.
- **Suggested next step**: Preserve these limits in Phase 7 and the v2.13 removal/narrowing review. Use the corrected error capture and qualified timings for any separately authorized future diagnostic run; do not infer the missing historical causes or schedule repeats after futility. Owner: the maintainer. [Results](../../../v2/v2.12/development/outline-eval.md), [metadata](development/evidence/phase-6-evaluation.json).

### Resolved

| ID | Title | Resolution and evidence |
|---|---|---|
| WN-v211-5 | Native calls recorded as legacy user envelopes | Resolved in v2.12.0 Phase 3 for native Ollama calls. Both models completed three real reads with native assistant calls and tool-role results; persistence/resume keeps its legacy format intentionally. [History](development/history/2026-10-09_outline-promotion-readiness-phase-3.md), [evidence](development/evidence/phase-3-native-history.json). OpenAI-compatible native history remains DF-v212-4. |
| DF-v211-4 | Missing desktop outline Settings controls | Resolved in Phase 5 with experimental, off-by-default switches, saved-preference preservation under environment overrides, and observed keyboard/toggle/reload behavior. [History](development/history/2026-10-09_outline-promotion-readiness-phase-5.md), [evidence](development/evidence/phase-5-settings/browser.json). Answer-quality promotion remains separate. |
