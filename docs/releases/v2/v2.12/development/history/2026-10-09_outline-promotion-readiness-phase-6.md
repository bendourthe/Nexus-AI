# v2.12.0 Phase 6 evaluation history

Status: both scored runs completed and validated on 2026-10-09. The committed rule yields futility; both models miss the separate user-outcome target. This history accompanies the phase's local results commit. No branch push, pull request or remote CI occurred.

## Plan delta

**Disposition**: Incomplete, non-blocking report-precision delta. The evaluated logger omitted returned session error strings and its M2 prose overstated OCR exclusion. Counts and frozen scoring remain valid, but the exact causes of 51 error finishes cannot be recovered and uncached OCR can consume the question clock. The correction was applied only after both full runs ended and exercised through the actual harness with controlled adapters. Phase 7 and the v2.13 review must retain these limits, the futility recommendation, and the missed user-outcome target; no change to the decision rule or inference restart follows.

The installed queue enumerator was run on 2026-10-09. It finds only the canonical v2.13.0 adoption plan, with 31 open tasks. It omits this approved legacy v2.12 plan, so the approved legacy plan supplements that inventory. v2.13 explicitly follows v2.12 integration and cannot run in parallel. No competing queued implementation alters the Phase 6 scope. Current strong/high capability is retained; the dated model-map fallback is not claimed to be a refreshed provider map.

The larger fixture uses a separate seeded stream, preserving all old fixture bytes. Existing `.gitattributes` already marks every outline document `-text`; `git check-attr` confirms text is unset for the new PDF, so no redundant attribute edit was added. The old v2.11 evaluation JSON stays unchanged. The new manual is 123 pages rather than the approximate 120-page filename.

The real OCR client's 10-minute production request timeout is shorter than the plan's estimated 14-minute expanded cold parse. The harness reuses the existing client and manager with a 30-minute request timeout while its shared absolute deadline bounds preparation and inference; production defaults do not change. The signed original approval was independently verified and already covers the GPU work, so the plan's ask-first surface is satisfied without repeating the question.

## Preparation verification

New fixture and question tests failed before implementation, then passed. Fresh focused run: 36 tests pass in two files. Scoped strict TypeScript covers all six changed TypeScript files; scoped ESLint uses the production rules with zero warnings. Tests lock old and new PDF bytes, expanded expected metadata, both question/key artifacts, category counts, answer uniqueness, section-target isolation and selected-arm validation.

Review corrected two P2 gaps: expanded JSON drift was not locked, and report creation had an overwrite race. Fresh testing and correctness rechecks returned no findings. Reliability review exposed an unwarmed OCR page-count request bypassing the question deadline; the entire operation is now bounded, its OCR child is stopped on timeout, and its previous session must settle before the next question. The review also reproduced a retired-child exit race and identified cancelled-promise cache poisoning. The harness now latches OCR off while settling cancellation, uses a fresh client for the next question, tracks every client for cleanup and evicts failed memo entries. A retry/success-cache regression covers this eviction. Final reliability recheck and real dry-run evidence are recorded below when complete.

## CI impact

No workflow file changes and no remote CI. Existing default script/fixture tests cover the additions; the inference harness remains opt-in and outside the default Vitest include globs. Non-final publication is prohibited. Phase 6 explicitly requires a preregistration commit before inference and a separate results commit.

## Evidence and next gate

Fixture generation and question building were exercised through their real script boundary, including byte-equality tests against committed artifacts. Preregistration commit `e8ee872d6081ee3f2851a83d47ff96f27a91f540` precedes all inference. [Frozen rule, results and decision](../../../../../v2/v2.12/development/outline-eval.md), [metadata evidence](../evidence/phase-6-evaluation.json). All four invocations exited 0, with 8/8 outcomes in each dry run, 152/152 expanded outcomes and 96/96 anchor outcomes. Exact coverage and completed result SHA-256 values were checked. A final pre-edit freeze check passed before any reporting correction.

## Observed results

The controller ran from 2026-10-09T13:48:32.665867Z to 2026-10-09T22:50:34.836530Z, 9 hours, 2 minutes, 2 seconds including CPU preparation and dry runs, within the approved 14-hour ceiling. Zero restarts. Expanded arm C scored 0/20 cross-section answers on Qwen and 4/20 on Gemma, so both fall below the frozen 60% threshold. Qwen C ties A at 0/35 late answers; Gemma C improves from 0/35 to 4/35. The disposition is futility, recommending removal or narrowing at the v2.13 review with no repeats.

On the unchanged anchor, arm A's errors/no-answer including timeouts total 13 on Qwen versus nine previously (target at most four), and 15 on Gemma versus 16 previously (target at most eight). Both miss the target. Gemma default thinking remains active, with 66 full-run timeouts and seven dry-run timeouts. Full runs recorded 946 native tool-result requests and 206 compactions. This proves the Phase 3 history path was active in the measured headless runs, without proving that answer quality is solved.

Initial cold OCR took 1,258.046 seconds for the expanded PDF and 499.511 seconds for the anchor. Only caps 50 and 200 were prewarmed; other caps can include OCR inside the whole-question timeout. These are harness observations using its 30-minute request timeout, not production timeout guarantees. The full expanded and anchor result hashes are retained in metadata, alongside the original report and diagnostic hashes. Raw replies, keys and diagnostics remain outside the repository.

## Post-run reporting correction

After the controller and final Node child terminated, the harness was changed to log returned errors and qualify timing prose. Scored artifacts were preserved, with no rerun or rescoring. The expanded run's 80 error rows comprise 34 max-iterations and 46 error finishes; the anchor's 12 comprise seven max-iterations and five error finishes. All have empty tails and no returned-error field. The 51 error-finish causes are not proven here.

The actual patched harness CLI ran eight controlled rows with mocked local adapters, no GPU or real OCR. It retained four explicit returned errors and four null non-errors, preserved selected outcome/scoring fields against the baseline, and wrote agreeing result JSON/JSONL. An invalid limit exited 1 before creating outputs. Evidence: `C:/Users/bdour/AppData/Local/Temp/nexus-v212-reporting-boundary-l7yhisb0/corrected/actual-reporting-observation-20261009T2252.json`, source SHA-256 `450cc2bbedb3c9fbf25a0f70a2c10c20aaed0c6db6fc4d83f0919670f0a2edb8`. Exact commands and this limited evidence class are recorded in the metadata and local scratch receipt; the integrated final revision still needs its own checks.

## Results verification

Run from `C:/Users/bdour/Documents/Projects/Development/Nexus-AI-worktrees/v2.12-outline-continuation`:

- `python .nexus-hub/phase6-result-summary.py`: complete; all four run coverages validated and completed result hashes matched.
- `python .nexus-hub/phase6-check-frozen-inputs.py`: exit 0 before post-run edits, seven fixture hashes matched, procedure and evaluated harness/generators unchanged.
- `node node_modules/vitest/vitest.mjs run --config configs/vitest.config.ts tests/unit/scripts/outline-smoke.test.ts tests/unit/scripts/measure-document-outline.test.ts --reporter=dot`: 36 passed, zero failures; repeated as the post-phase scoped pass.
- `node node_modules/typescript/bin/tsc --project .nexus-hub/phase6-tsconfig.json --noEmit`: exit 0, strict phase scope.
- `node node_modules/eslint/bin/eslint.js --config .nexus-hub/phase6-eslint.config.mjs scripts/generate-outline-fixtures.ts scripts/build-outline-smoke-questions.ts tests/unit/scripts/measure-document-outline.test.ts tests/unit/scripts/outline-smoke.test.ts tests/smoke/document-outline-smoke.test.ts tests/smoke/outline-smoke-parser.ts --max-warnings=0`: exit 0, zero warnings.

An initial test invocation supplied a nonexistent fixture-test path and selected only 23 tests; the corrected command above exercised all 36. The analogous initial lint command rejected that path, then passed on the six-file scope. Reporting-artifact validation first used the wrong expected error text and then read a PowerShell UTF-16 log with the wrong encoding; corrected validation passed. No production change was needed for those verification-command mistakes.

No new production runtime behavior or dependency was added in this results step; coverage of the previously implemented budgets, history and compaction remains subject to the Phase 7 full gate. The reporting-only correction was exercised through its CLI boundary. The raw evaluation itself is the Phase 6 real OCR/model exercise. Documentation has no additional runnable surface.

## Remaining work

Post-phase documentation audit: [report](../../docs-cleanup-report.md), 20 active v2.12 files plus the report, no moves or deletions, zero ignore patterns added. The owner link comparator exited 0 with zero newly broken links; 3,770 pre-existing unresolved references remain unchanged and are an input to Phase 7's documentation reconciliation. The isolated baseline contains the preregistration revision and untouched v2.13 targets. Receipts: `.nexus-hub/phase6-links-before-20261009T2310.jsonl`, `.nexus-hub/phase6-links-after-20261009T2310.jsonl` and `.nexus-hub/phase6-links-diff-20261009T2310.json`. The initial archive-only baseline lacked a Git index; a temporary index of the exact tracked paths, including its ignored tracked Cargo.lock, resolved that setup issue. No project file was restored from the baseline.

The outline flag stays off and experimental. Support tier: internal-compatible for the enabled local path, candidate for promotion. DF-v211-2 and the remaining answer-quality part of DF-v211-7 stay open with the measured disposition; historical diagnostic limitations are recorded in WN-v212-5. Phase 7 still owns whole-plan tests, handbook refresh and rendered evidence, M5 real-use evidence, independent Goal review, green integration and the installer rebuild. The broader Goal also includes v2.13 and all remaining carry-forward and archived gaps.
