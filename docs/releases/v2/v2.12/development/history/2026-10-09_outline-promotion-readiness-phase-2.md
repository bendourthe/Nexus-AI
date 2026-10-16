# Window-aware document output: Phase 2

**Date**: 2026-10-09
**Plan**: [outline-promotion-readiness](../../../../../v2/v2.12/plans/v2.12.0-outline-promotion-readiness.md), T006-T008.
**Status**: Local verification complete. T006-T008 are ready for the single Phase 2 local commit; no publication occurred.

**Support tier**: Internal-compatible. The compiled headless runtime was exercised with local Ollama and real OCR; the native GUI was not observed here.

## 1. Starting state

The continuation worktree is isolated on `feat/v2.12-outline-continuation` at `59e16c8216383db237f5b373f5bf8e6fada44097`. The main checkout's concurrent edits remain intact. A byte-verified snapshot of 17 relevant files was copied into this worktree after its pristine baseline passed 118 tests. The unchanged snapshot passed 144 tests. The approved Kolibri seed is absorbed into this plan, rather than renumbered or implemented twice.

## 2. Implementation and troubleshooting

The shared `TurnLedger` captures backend prompt counters and estimates subsequent history additions. Each call gets current usage rather than a value captured when the tool was created. Both channels use a reserve of 1,024 tokens, a floor of 512 characters, and the existing ceilings: 10% for outlines and 25% for section reads and parsed documents. Counts within 64 tokens of the window are treated as possibly truncated. Unknown backend usage leaves document tools on their fixed share while the estimate remains available for other loop decisions.

Both OpenAI-shaped clients retain terminal content while waiting for a separate usage frame, then emit exactly one terminal result at DONE, EOF, or the configured bounded terminal wait. Two never-ending-stream regressions failed before the wait bound and passed afterward. This preserves late prompt/completion counters without an indefinite wait.

Contract review then found that a transport reset after a valid completion could discard the saved response. Two real-stream regressions failed before the fix. Both adapters now return the saved completion on a later non-caller-abort read error; unfinished streams and caller cancellation still reject. The eight boundary tests and both client suites passed, together with the workspace-rooting test (34 cases across four files). The independent contract recheck found the issue resolved.

Independent review found stale ledger values after a conversation was rewritten. Tests using real managers reproduced three failures when compaction, summary replacement, or trimming preserved the original system-message ID. `ConversationManager.historyRevision` now changes for existing-history rewrites, including system-prompt replacement; the loop invalidates usage on a revision, seeded-message ID, or model change. Ordinary appends retain usage. The two affected test files passed all 82 cases afterward.

The no-window headless parse path now resolves the same conservative default as the outline path. Its prior 64 KiB allowance contradicted the fixed-share fallback contract; a real handler regression failed before the fix and passed afterward. Optional summary lines formerly enlarged an already budgeted outline body. The renderer now counts actual complete rows and summaries against the body allowance, preserves node IDs, and reports truncation when content is omitted. The summary regression measured 6,864 characters before the fix; afterward it fits the 1,440-character allowance.

## 3. Verification gate

| Check | Observed result |
|---|---|
| Focused LLM, loop, document core, adapters, and integration tests | 401 passed across 26 files |
| `npm run fast` | Passed lint, TypeScript build, and architecture checks; existing architecture warnings remain |
| Desktop TypeScript check | Passed |
| Root aggregate coverage | 6,162 passed, 12 existing skips, no failures; statements/lines 87.99%, branches 83.57%, functions 90.7% |
| Whole-prompt counter probe | Passed on Ollama 0.32.15 / qwen3.5:9b / 16,384-token window |
| Live PDF budget expectation | Passed: three successful page>50 section reads in one response, falling allowances, final prompt 14,430 < 16,384 tokens |
| Independent correctness and reliability rechecks | No remaining substantiated finding in the reviewed fixes |
| Independent API contract and testing rechecks | No remaining substantiated finding after the completion-error fix; prior testing gaps closed |

## 4. Known issues

The edit guard flagged the test-count change from 14,000 to 14,500 as an unrecorded write; the official diff shows exactly that agent-authored change. It remains intact, with rebaseline approval pending for any further edit. No user edit was discarded or accepted without agreement. Native GUI support remains unobserved here.

The first full root run passed 6,155 tests and skipped 12 but failed one workspace-rooting assertion. The test assumed `C:\workspace\parity.txt` did not exist; it already contained a file, and the failure reproduced alone. The test now owns separate temporary workspace and worktree roots containing distinct contents under the same filename, requires the actual workspace content and absence of worktree content, and restores the mock folders in `finally`. No external file was removed or changed. The isolated test and final full coverage pass. Benchmark tests also rewrote historical timing fixtures; those generated changes remain excluded from staging and must be reconciled safely before cleanup.

## 5. Plan delta

Queue assessment found no independent parallel plan: v2.13 explicitly follows v2.12 integration. The installed minor enumerator omits this legacy plan path, so direct inspection supplies the approved plan and absorbed seed. The plan's unknown-count failure-mode sentence mentions character estimates, while its definition of done explicitly requires fixed-share tool budgets. The implementation keeps an estimate and exposes a distinct unknown tool-budget value to satisfy that definition of done. No model or catalog change is introduced. New evidence uses the canonical release tree; legacy plan placement is preserved until final reconciliation.

The plan recommends frontier/high for Phase 2. Host model enumeration and switching are unavailable in this session; implementation continues with the current GPT-6 session without a silent downshift. Official provider pages were checked on 2026-10-09; the OpenAI frontier remains `gpt-6-astra`. The deterministic helper validates the dated fallback, whose Anthropic fast cell is stale against the current overview (`claude-haiku-5-5`). This does not change the selected phase tier. No claim is made that the entire dated provider map is fresh.

## 6. Assumptions

Backend prompt counts describe a whole-prompt snapshot, rather than an additive counter. The live probe's 300, 400, and 500 reference-line requests returned 5,126, 6,826, and 8,526 tokens, with 1,700-token increments. A session's current count is kept per loop rather than taken from shared inference telemetry. OCR and local inference require no added external service.

## 7. Live testing summary

The first integrated PDF run aborted while real CPU OCR was still processing the 65-page fixture. Its owned Python worker was stopped after process ancestry was verified; the failure record remains separate. The second run completed OCR and successfully read the intended page>50 sections, ending at prompt count 11,599. Its three section allowances remained at the fixed ceiling, so it did not prove falling budgets. The third run used more context but reached the diagnostic's 512-token generation limit after one section; it did not satisfy the expectation. The fourth run placed Ollama's diagnostic `think: false` at the request's top level, allowed 2,048 generated tokens, retained `num_ctx=16384`, and asked the model to batch its final two section reads. It returned text and falling allowances (12,924 then 12,100 characters), ending at 12,413 prompt tokens, but read only two table-of-contents nodes. Its content claims and within-turn expectation did not pass.

The fifth run completed from 09:57:00 to 10:07:27 UTC with real, uncached OCR of all 65 pages. The model outlined first and then issued all three requested section reads in one native tool-call response, rather than the requested one-then-two grouping. Captured request message counts were 2, 4, and 8. The outline used 11,141 ledger tokens, allowed 6,553 characters, and returned 3,296. The page 52-55, 55-57, and 63-65 reads used 12,503, 13,527, and 14,498 ledger tokens, allowed 11,428, 7,332, and 3,448 characters, and returned 3,868, 3,670, and 3,405 characters. Every call succeeded and remained within its allowance. Backend whole-prompt counts were 10,288, 12,116, and 14,430, all below 16,384. The session completed with an answer identifying the three page ranges, although it repeated the bodies instead of limiting each to six words. This proves budget behavior, not answer-quality promotion. Cross-turn and near-full behavior in both loops also pass the six real-tool integration cases. Every attempt retains its own ignored request, call, count, progress, and result artifact.

## 8. Task tracker and CI impact

T006 and T007 are implemented with passing evidence; T008's tests, live expectation, documentation, and CI-impact record are complete. New tests use existing unit/integration globs; no pipeline change is required. No Phase 2 branch push, pull request, or remote CI has occurred. The separately scoped dependency repair PR #96 merged on 60 successful checks at `092ce3c2f386db020d18eab6d69c0655657b2456`; that publication does not validate or publish this phase.

## 9. Next steps

Create the single local Phase 2 commit, then proceed to native tool-role history in Phase 3. The preliminary decision probe passed three random-token repetitions on each of qwen3.5:9b and gemma4:12b. Human QA remains in the final phase. Resolve the guarded test rebaseline before changing that file again, and reconcile excluded generated fixture changes before worktree cleanup.
