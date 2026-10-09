# v2.12.0 Phase 6 evaluation history

Status: preparation verified; preregistration commit precedes all Phase 6 inference. Results and the Phase 6 exit gate remain pending.

## Plan delta

The installed queue enumerator was run on 2026-10-09. It finds only the canonical v2.13.0 adoption plan, with 31 open tasks. It omits this approved legacy v2.12 plan, so the approved legacy plan supplements that inventory. v2.13 explicitly follows v2.12 integration and cannot run in parallel. No competing queued implementation alters the Phase 6 scope. Current strong/high capability is retained; the dated model-map fallback is not claimed to be a refreshed provider map.

The larger fixture uses a separate seeded stream, preserving all old fixture bytes. Existing `.gitattributes` already marks every outline document `-text`; `git check-attr` confirms text is unset for the new PDF, so no redundant attribute edit was added. The old v2.11 evaluation JSON stays unchanged. The new manual is 123 pages rather than the approximate 120-page filename.

The real OCR client's 10-minute production request timeout is shorter than the plan's estimated 14-minute expanded cold parse. The harness reuses the existing client and manager with a 30-minute request timeout while its shared absolute deadline bounds preparation and inference; production defaults do not change. The signed original approval was independently verified and already covers the GPU work, so the plan's ask-first surface is satisfied without repeating the question.

## Preparation verification

New fixture and question tests failed before implementation, then passed. Fresh focused run: 36 tests pass in two files. Scoped strict TypeScript covers all six changed TypeScript files; scoped ESLint uses the production rules with zero warnings. Tests lock old and new PDF bytes, expanded expected metadata, both question/key artifacts, category counts, answer uniqueness, section-target isolation and selected-arm validation.

Review corrected two P2 gaps: expanded JSON drift was not locked, and report creation had an overwrite race. Fresh testing and correctness rechecks returned no findings. Reliability review exposed an unwarmed OCR page-count request bypassing the question deadline; the entire operation is now bounded, its OCR child is stopped on timeout, and its previous session must settle before the next question. The review also reproduced a retired-child exit race and identified cancelled-promise cache poisoning. The harness now latches OCR off while settling cancellation, uses a fresh client for the next question, tracks every client for cleanup and evicts failed memo entries. A retry/success-cache regression covers this eviction. Final reliability recheck and real dry-run evidence are recorded below when complete.

## CI impact

No workflow file changes and no remote CI. Existing default script/fixture tests cover the additions; the inference harness remains opt-in and outside the default Vitest include globs. Non-final publication is prohibited. Phase 6 explicitly requires a preregistration commit before inference and a separate results commit.

## Evidence and next gate

Fixture generation and question building were exercised through their real script boundary, including byte-equality tests against committed artifacts. Model inference has not started. [Frozen rule and procedure](../../../../../v2/v2.12/development/outline-eval.md). T017/T018 are prepared; T019/T020 and the entire Phase 6 exit checklist remain open until observed results, gap reconciliation and the results commit.
