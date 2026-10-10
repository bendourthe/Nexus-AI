# Known Gaps - v2.12

**Project**: Nexus
**Status**: in-progress
**Last updated**: 2026-10-10

The [existing carry-forward register](../../../v2/v2.12/known-gaps.md) remains the source for older open items. This canonical ledger records new phase dispositions without duplicating those items.

## v2.12.0

### Summary

| Category | Open | Resolved |
|---|---|---|
| Not implemented (NI) | 0 | 0 |
| Deferred (DF) | 1 | 1 |
| Bugs / regressions (BG) | 0 | 0 |
| Warnings (WN) | 3 | 1 |
| Missing tests / coverage gaps (MT) | 0 | 0 |
| Quality-gate gaps (QG) | 1 | 0 |

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

##### WN-v212-6 - Outline retention is not bounded by session or idle expiry

- **Source phase**: Phase 7 - factual handbook review.
- **Plan reference**: [outline-promotion-readiness](../../../v2/v2.12/plans/v2.12.0-outline-promotion-readiness.md), handbook refresh and final verification.
- **Reason**: The structure cache has a 50 MiB cap, but the summary store has no eviction cap. Text snapshots have lazy ten-minute idle expiry, while screened text persists for the tool instance's lifetime. Desktop and ACP reuse outline tools across sessions with identical workspace roots, including read authorization and call/output counters. Strict session isolation and ten-minute memory erasure are not implemented. The handbook now states these limits. Support tier: internal-compatible, experimental and off by default.
- **Suggested next step**: Review cache bounds, tool-scope lifetime and session reset requirements alongside the planned removal/narrowing decision. Preserve these limits until changed behavior has real-boundary evidence. Owner: the maintainer. Sources: `core/documents/OutlineCache.ts`, `core/documents/OutlineSummaries.ts`, `modules/coding/documents/DocumentOutlineTools.ts`, `modules/coding/runtime/headlessTools.ts`, `desktop/sidecar/src/coding/headlessAgentRunner.ts`, and `desktop/sidecar/src/acp/AcpAgent.ts`.

##### WN-v212-7 - Media smoke proof needs separate packaging and installation evidence

- **Source phase**: Phase 7 - factual handbook review.
- **Plan reference**: [outline-promotion-readiness](../../../v2/v2.12/plans/v2.12.0-outline-promotion-readiness.md), packaged installer qualification and final verification.
- **Reason**: The installed-media smoke harness records a supplied installer hash and exercises an installed sidecar; it does not install that candidate or establish installer-to-payload binding. Catalog-source reachability is a separate packaging check and is not invoked automatically by the Windows build. Generation-time artifact finalization checks are narrower than the smoke harness's decoded PNG and video probes. The corrected handbooks distinguish those evidence boundaries. Support tier: candidate for exact packaged installer/GPU qualification until the required operator evidence exists.
- **Suggested next step**: Retain catalog reachability output, installation of the exact candidate, installer-to-payload binding, and decoded PNG/video results together during packaged qualification. Assess deterministic binding and packaging-check enforcement when that path is implemented; do not certify an arbitrary existing installation from a supplied hash alone. Owner: the maintainer. Sources: `scripts/installer/build/smoke-installed-media.ps1`, `scripts/installer/build/build-windows.ps1`, and `scripts/installer/build/check-hf-catalog.py`.

#### Quality-gate gaps

##### QG-v212-1 - Terminal CI reconciliation requires explicit migration decisions

- **Source phase**: Phase 7 - terminal CI/CD comparison.
- **Plan reference**: [outline-promotion-readiness](../../../v2/v2.12/plans/v2.12.0-outline-promotion-readiness.md), sub-task 7.5 and T025.
- **Reason**: The 23-field source/settings comparison has six PASS, eleven FAIL, three PARTIAL and three NOT PROVEN fields. Missing native report/release profiles, repeated feature-push/post-merge validation, incomplete pre-merge platform coverage, implicit permissions and inconsistent report publication are observable differences. On 2026-10-10 the maintainer approved, and Phase 7 applied, only the CI profile correctness patch and the action pin updates (four `actions/cache` references to v6.1.0 and the `scorecard.yml` `upload-sarif` commit pin); see the [pin evidence](development/evidence/phase-7-ci-action-pin-application.json). Those changes close none of the migration fields above. No permission, secret, required-check or settings change has been approved or applied. This is an incomplete gate, not an accepted bypass.
- **Suggested next step**: Retain [the comparison](development/phase-7-ci-comparison.md) and [input hashes/settings](development/evidence/phase-7-ci-inputs.json), prove remaining source/security fields, prepare exact incremental profile/event/reporting changes, and obtain each consequential CI/permission/settings approval before applying it. Re-gate locally and observe the approved integration topology. Owner: the maintainer. Existing canonical-profile carry-forward gaps remain open.

### Resolved

| ID | Title | Resolution and evidence |
|---|---|---|
| WN-v211-5 | Native calls recorded as legacy user envelopes | Resolved in v2.12.0 Phase 3 for native Ollama calls. Both models completed three real reads with native assistant calls and tool-role results; persistence/resume keeps its legacy format intentionally. [History](development/history/2026-10-09_outline-promotion-readiness-phase-3.md), [evidence](development/evidence/phase-3-native-history.json). OpenAI-compatible native history remains DF-v212-4. |
| DF-v211-4 | Missing desktop outline Settings controls | Resolved in Phase 5 with experimental, off-by-default switches, saved-preference preservation under environment overrides, and observed keyboard/toggle/reload behavior. [History](development/history/2026-10-09_outline-promotion-readiness-phase-5.md), [evidence](development/evidence/phase-5-settings/browser.json). Answer-quality promotion remains separate. |
