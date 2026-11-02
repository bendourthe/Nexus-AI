# Known Gaps - v2.16

**Project**: Nexus AI Studio
**Status**: in-progress
**Last updated**: 2026-11-02
**Open items**: 0

The [archived v2.16.0 ledger](../../../archives/v2/v2.16/known-gaps.md) retains its approved conditional closeout. This active file records the subsequent v2.16.1 release work. All 384 inherited obligations remain OPEN in the [v2.17 ledger](../v2.17/known-gaps.md), with their original bodies, provenance and individually preserved requirements. No inherited item is closed by this patch record. Required integration and publication work remains tracked by unchecked T009-T011 in the [release plan](plans/v2.16.1-release-completion.md).

## v2.16.1

### Summary

| Category | Open | Resolved |
|---|---|---|
| Not implemented (NI) | 0 | 0 |
| Deferred (DF) | 0 | 0 |
| Bugs / regressions (BG) | 0 | 2 |
| Warnings (WN) | 0 | 0 |
| Missing tests / coverage gaps (MT) | 0 | 0 |
| Quality-gate gaps (QG) | 0 | 0 |

### Open Items

No newly unresolved patch defect after local validation. Model admission remains HOLD under the plan's explicit non-admission outcome. Its quality run remains unrun, with a documented reopen condition. Hosted merge-result checks, final version preparation, published/downloaded artifacts, Windows installer acceptance and Linux/macOS package validation are required unfinished plan tasks, not waived gates.

#### Bugs / Regressions

##### BG-10 - Hidden release heading truncates selected notes - RESOLVED 2026-11-02

- **Source phase**: v2.16.1 Phase 3, independent adversarial verification.
- **Plan reference**: [Release completion](plans/v2.16.1-release-completion.md), T005 and T008.
- **Reason**: The actual note-extraction CLI treated a version heading inside an HTML comment as a release boundary, returned exit 0 and omitted following real changes from the selected release.
- **Suggested next step**: Retain the real CLI regression and exact selected-body comparison through integration and release packaging.
- **Resolution**: The extractor ignores hidden headings, preserves complete selected notes and rejects unfinished selected comments before overwriting output. The original reproduction passes in the independent 26-case CLI retest. The final root suite passes 6,528 tests with 12 existing skips. [Evidence](development/v2.16.1-final-validation.md), [independent report](development/v2.16.1-adversarial-report.md).

##### BG-11 - Literal comment marker in code spans is misparsed - RESOLVED 2026-11-02

- **Source phase**: v2.16.1 Phase 3, independent adversarial verification of BG-10's correction.
- **Plan reference**: [Release completion](plans/v2.16.1-release-completion.md), T005 and T008.
- **Reason**: The first comment-aware correction treated literal comment markers in inline code as unfinished HTML comments. Actual CLI observations covered single-backtick, multiple-backtick and soft-line-break code spans. Installed Markdown consumers confirmed the multiline inputs are literal code.
- **Suggested next step**: Retain the inline-code and paragraph/release-boundary guards when changing extraction behavior.
- **Resolution**: Matching code spans protect literal comment markers, including across soft line breaks, while real block/release boundaries stop unmatched spans. All observed routes pass exact CLI output/status comparisons. Eleven regression cases were added across both defects; the final focused run passes 32 tests and the corrected-source full root run passes. [Evidence](development/v2.16.1-final-validation.md), [independent report](development/v2.16.1-adversarial-report.md).

### Resolved

| ID | Title | Resolved in | Notes |
|---|---|---|---|
| BG-10 | Hidden release heading truncates selected notes | Phase 3 | Actual CLI reproduction and final root coverage pass |
| BG-11 | Literal comment marker in code spans is misparsed | Phase 3 | Single-line/multiline and stopping-boundary regressions pass |

### Retained Obligations

The global inventory found eight ledgers requiring inspection, zero parse errors and 384 OPEN records, all in v2.17 before this patch file was added. Existing CI differences remain owned by v2.17 QG-2/QG-9 and their complete historical requirements. Current source and protection observations are linked in [the CI receipt](development/v2.16.1-ci-gate-observation.json); local observations do not close hosted integration requirements. Existing warnings and bounded platform coverage remain explicit in [the validation record](development/v2.16.1-final-validation.md). The full v2.17 implementation/release and the requested subsequent full codebase/UI/behavior review remain required.
