# Native tool history: Phase 3

**Date**: 2026-10-09
**Plan**: [outline-promotion-readiness](../../../../../v2/v2.12/plans/v2.12.0-outline-promotion-readiness.md), T009-T012.
**Status**: Local implementation and verification complete; ready for the single Phase 3 local commit. No push, pull request, or remote CI.
**Support tier**: Internal-compatible. Real local Ollama sessions and a real SQLite reopen in the VS Code test host were exercised. Full product activation and the native GUI were not exercised.

## Entry and decision

Phase 2 is committed at `5ddfe8b76d967152698a07b648656586cb4a5026`. Queue assessment still selects v2.12 first; v2.13 requires its integration. The enumerator omits the approved legacy v2.12 plan, so direct inspection supplies it. The continuation worktree preserves the main checkout's concurrent changes and the excluded generated benchmark artifacts. The current session model continues without a silent tier change; the dated fallback provider map remains a fallback rather than a fresh live enumeration.

On Ollama 0.32.15, qwen3.5:9b and gemma4:12b each repeated an unpredictable token supplied only through a tool-role result in all three visibility probes. This selects the proceed option. [Captured evidence](../evidence/phase-3-native-history.json) includes all six replies, source hashes, and the final integrated sessions.

## Implementation

Coding history now carries native assistant calls with locally assigned identifiers and one tool-role message per result. Both Ollama clients use the shared provider-boundary converter, which rejects orphan, duplicate, incomplete, or mismatched groups. The LM Studio and headless OpenAI clients retain assistant text and user-role result envelopes. That limitation is recorded as [DF-v212-4](../../known-gaps.md).

ConversationManager owns the live history. It persists tool results as user-role rows with the same envelope bytes and a result-row identifier marker; reopening the database rebuilds the legacy prompt. The SQLite role CHECK and schema, core chat role unions, sidecar protocol enums, Chat pillar, Studio stores, and tuning stores remain unchanged. Source tracing and compilation confirm that this metadata stays within coding history and its provider conversion. Recorded-request tests exercise both Ollama clients, both loops, and native screened envelopes, including a document body that imitates a tool-result envelope.

Compaction retains or drops a complete assistant batch and all matching results by identifier. Source regeneration, manager summary/trim, sliding windows, and emergency trim preserve that pairing. Native argument bytes count toward token estimates when a backend omits completion usage. Native batch repair adds formatted failed results for unexecuted calls after a guard stop or call limit. Clearing or replacing the conversation during an awaited tool stops the old batch without appending orphan results. Sliding windows preserve array order even after a backward clock adjustment.

Manual range compression rejects partial batches, retains protected results with their assistant calls, and restores protected native rows exactly once on decompression. Message compression directs native batches to range compression because independently reversible single-message blocks would split them on undo. Pair membership is indexed once per trim, and retained-message membership uses a Set.

## Verification

- The final affected coding scope passed 1,674 tests across 126 files, with two existing skips. The final focused scope passed 116 cases across six files; the added screening fixture was then aligned with the parser interface and included in the passing broad run.
- The full desktop suite passed 2,227 tests across 244 files, with one existing skip. Root lint, desktop lint, both typechecks, and the sidecar build passed. Architecture checking passed with zero errors and 18 existing warnings. The baselined deterministic check passed with 56 matched existing errors and zero stale entries; this is not a claim that the raw checker has zero findings.
- After rebuilding, qwen3.5:9b performed three real reads in one batch and completed its answer. Its requests contained 2 and 6 messages; the second request contained three native result rows. gemma4:12b performed three real reads across successive turns, with request sizes 2, 4, 6, and 8. Each final answer returned all three generated proof tokens. The committed evidence retains actual native call/result messages and source hashes.
- VS Code 1.134.0, Electron 42.8.1, binary interface 146 reopened a real on-disk SQLite session and rebuilt the expected legacy prompt. Persisted roles were user, assistant, user, user, user. The probe used an isolated real Electron SQLite binary and left the project's Node binary intact. An earlier attempt on installed VS Code 1.141.0 failed at its binary interface 148; that failed attempt is retained and is not counted as a pass. The final pinned-host process exited 0. This verifies the history/store boundary in an isolated test extension, not full product activation or visual behavior.

Review fixes were proved with failing-then-passing tests for regeneration, partial compression, protected undo, message-mode undo safety, session replacement, and clock changes. Independent correctness, maintainability, testing, project-standards, security, performance, API-contract, reliability, and adversarial lenses reviewed the relevant change. Findings were deduplicated; corroborated compression findings were promoted and verified by failing tests. Final scoped rechecks found no remaining actionable findings. Verifier classes were deterministic and evidence-based, supported by model-based review.

| Considered but rejected | Location | Reason |
|---|---|---|
| Widen core roles or the persisted schema | Core chat, protocol, ChatHistoryStore | The owning rule requires the coding-boundary conversion and legacy rows. |
| Change tool-result presentation in the webview | Existing tool-result events | Evidence was insufficient for a new presentation defect. |
| Refactor provider stream duplication | Existing clients | The change would add complexity outside this phase's benefit. |

## CI impact and remaining work

No pipeline change: new tests are inside existing globs, and evidence is release-scoped. This phase ran no remote validation. WN-v211-5 is resolved for native Ollama calls; other backends retain the explicit DF-v212-4 limitation. Outline tools remain off by default until the later evaluation and promotion gates pass. Phase 4 adds shared tool-result elision and headless compaction. Pending edit-guard decisions and dirty historical benchmark artifacts remain preserved outside this commit.
