# Outline evaluation, v2.12.0 Phase 6

Status: both full runs completed on 2026-10-09. The decision rule and frozen procedure below were committed before inference and remain unchanged. The result is futility under that rule; the separate user-outcome target was missed on both models. The outline flag stays off by default and experimental.

## Decision rule

- **Bar**: on both models, arm C answers at least 75% of the expanded set's cross-section questions, and arm C answers more past-page-50 questions than arm A.
- **Pass** (bar met on both models): recommend scheduling the three repeats in v2.13.0, before the M5 review.
- **Futility** (on both models, arm C answers fewer than 60% of cross-section questions, or does not beat arm A past page 50): recommend removing or narrowing the outline tools at the v2.13.0 review, with no repeats.
- **Inconclusive** (anything else): record which model and criterion missed; the repeats are scheduled in v2.13.0 as for a pass.
- **User-outcome target** (reported separately): on the v2.11 24-question set, arm A's "error or no answer" count at least halves against v2.11's run, on both models.
- gemma4 runs with default thinking settings; its timeouts count as no answer and are also reported as their own count.

## Frozen procedure

Run qwen3.5:9b and gemma4:12b sequentially, arms A and C only, temperature 0, 16,384-token context and a four-minute per-question cap. Keep gemma4 default thinking. First perform LIMIT=2 dry runs on each set; then one full run of each set. Arms B and D remain available but are excluded. At most one restart for a harness/scorer defect is allowed, with its reason recorded; a second defect stops the run and becomes a known gap. A timed-out question is an outcome, not a restart.

The signed original run record already authorizes both models, both sets, A/C, the LIMIT dry run, one restart and at most 14 GPU hours. Its signature was verified locally on 2026-10-09. The approval is not renewed. A shared absolute wall-clock deadline, set once before the first dry run, conservatively includes CPU preparation as well as model time and applies to every subsequent invocation. The launch deadline will reserve a short cleanup margin within the 14-hour ceiling. Unreachable Ollama, missing tool-capable models, a failed preparation or a cancellation that cannot settle stops the run with retained diagnostics. No automatic rerun follows a host failure.

The expanded manual has 123 pages, 60 headings, 35 consecutive heading pairs whose second heading starts past page 50, and 48 tables with section-unique port/protocol/default values. Its 38 questions comprise 20 cross-section, 12 factual and six table questions, with 35 late answers and 38 distinct target sections. Prefix scoring applies only to opening-word keys; table keys require exact equality. The builder rejects answers in another section's opening or table. The old manual and 24 anchor questions/keys remain unchanged, verified against their deterministic generators.

Use the existing real OCR client and job manager with a harness-only 30-minute request timeout for the expanded manual. Cold OCR is measured, then selected binary files are prewarmed at 50 and 200 pages; model calls begin after preparation. Each entire question operation is bounded. On timeout the owned OCR child is shut down and the old operation must settle before the next question. Production OCR defaults are unchanged. Temporary workspaces contain only selected source documents, never questions or answer keys.

Reports use exclusive file creation and completed outcomes are checkpointed to an outside-repository JSONL log. Raw replies and keys are not copied into release evidence. Report native tool-result request counts and compaction counts; these establish whether Phase 3 history was active in the measured run, rather than assuming it was.

## Anchor comparison and interpretation

The v2.11 reference is `docs/archive/v2/v2.11/development/outline-eval.md`. Its arm A errors or no-answer counts were nine for qwen3.5:9b and 16 for gemma4:12b, with zero arm A timeouts. Halving therefore requires at most four and eight respectively. For the user-outcome target, new timeouts count as no answer and also retain their separate timeout count, as the frozen rule requires. Wrong answers that contain an answer marker remain wrong and are reported separately from missing answers.

The historical A/C model-call total over 24 questions was about 96 minutes; linear scaling to both 38- and 24-question sets suggests about 4.1 model hours, while larger-document searches and extra tool turns justify the plan's conservative eight-to-12-hour estimate. The signed ceiling is 14 hours including the dry runs and any permitted restart. One run cannot establish repeatability or resolve small differences. The harness exercises the headless channel; extension behavior requires its separate unit evidence and real-use entry.

## Frozen artifact SHA-256

- `docs\manual-120p.pdf`: `bd10ab42cc14866cfebf7cc33a6aef7edea08252320cb9703b4aa18e1472f640`
- `expected\manual-120p.pdf.json`: `fb70b66b354dfabb455fef55b71c9749645dc660ae4585e45f478bc966f09f14`
- `eval\questions-manual-120p.json`: `45fed1ba7a836bb8bd263df2df9bd5ab54bcb08d6c984c7ede9778a196a6dc13`
- `eval\keys-manual-120p.json`: `388a47d4d196311be9700e5d1473a40c910b8267abb2e0ade96374282656fbee`
- `docs\manual-60p.pdf`: `3d0bd4d6bc776e9e960855c48041a655a48db5817805d7307593defeab928908`
- `eval\questions.json`: `aa4099b079cacd02caa716d160b256239cc5e7fdcbf2a53b0d71cc8b4e248c76`
- `eval\keys.json`: `2cd04f82e887f4f00af97fa31bc7f7a8f9b89b3ed7b6102bd7e6dc2e479aac4e`

## Results and decision

The evaluated revision and preregistration commit is `e8ee872d6081ee3f2851a83d47ff96f27a91f540`. The controller started at 2026-10-09T13:48:32.665867Z and finished at 2026-10-09T22:50:34.836530Z, taking 32,522.17 seconds (9 hours, 2 minutes, 2 seconds), including both LIMIT=2 dry runs and CPU preparation. The shared deadline was 2026-10-10T03:47:32.665Z, within the approved 14-hour ceiling. All four invocations exited 0, with zero restarts. The validator confirmed exact question/model/arm coverage, uniqueness, frozen metadata, and completed result hashes. A final pre-edit check confirmed all seven frozen fixture hashes, the original procedure, and the evaluated harness and generators were unchanged.

### Expanded set

There are 38 questions per arm and model, including 20 cross-section questions and 35 answers past page 50. Timeouts are counted separately and also included in the missing-answer total below.

| Model | Arm | Correct / 38 | Cross-section / 20 | Past page 50 / 35 | Timeouts | Errors or no answer, including timeouts | Native tool-result requests | Compactions |
|---|---|---|---|---|---|---|---|---|
| qwen3.5:9b | A | 1 | 0 | 0 | 6 | 35 | 284 | 80 |
| qwen3.5:9b | C | 0 | 0 | 0 | 0 | 36 | 161 | 32 |
| gemma4:12b | A | 1 | 0 | 0 | 30 | 36 | 126 | 48 |
| gemma4:12b | C | 4 | 4 | 4 | 16 | 32 | 120 | 14 |

Arm C's cross-section scores are 0% on qwen3.5:9b and 20% on gemma4:12b, both below the frozen 60% futility threshold and the 75% bar. Qwen C ties A on late answers (0 versus 0); Gemma C exceeds A (4 versus 0). Because both models meet the cross-section futility condition, the result is **futility**. Recommend removing or narrowing the outline tools at the v2.13.0 review, with no repeats. This is a recommendation under the committed rule, not a removal or promotion in this release.

### Unchanged v2.11 anchor

There are 24 questions per arm and model, including eight cross-section questions and 12 answers past page 50. The four anchor table questions repeat the same table and do not distinguish the arms. The anchor does not replace the expanded set's decision criterion.

| Model | Arm | Correct / 24 | Cross-section / 8 | Past page 50 / 12 | Timeouts | Errors or no answer, including timeouts | Native tool-result requests | Compactions |
|---|---|---|---|---|---|---|---|---|
| qwen3.5:9b | A | 7 | 1 | 2 | 2 | 13 | 94 | 25 |
| qwen3.5:9b | C | 4 | 1 | 1 | 0 | 18 | 63 | 4 |
| gemma4:12b | A | 8 | 0 | 2 | 15 | 15 | 43 | 3 |
| gemma4:12b | C | 13 | 2 | 7 | 5 | 5 | 55 | 0 |

The arm A missing-answer count is 13 on Qwen versus nine in v2.11 (target at most four), and 15 on Gemma versus 16 (target at most eight). Neither model meets the user-outcome target. Wrong answers with an answer marker are excluded from that count: four Qwen A answers and one Gemma A answer are wrong rather than missing. Gemma default thinking was retained. Its full-run timeouts are 46 on the expanded set and 20 on the anchor, 66 total; the dry runs add seven. These observed results do not establish that the budget, native-history and compaction changes solved answer quality.

### Procedure, diagnostics and limits

The full runs contain 946 native tool-result requests and 206 compactions. Both models and both arms produced native tool-role result requests, so Phase 3 history was active in the measured headless path. Gemma anchor C produced no compaction events; this is an observed count, not evidence of a missing implementation. The dry runs contain eight outcomes per set and only establish harness execution and coverage. They do not contribute to the promotion score.

The initial cold outline extraction took 1,258.046 seconds on the expanded PDF and 499.511 seconds on the anchor. Only page caps 50 and 200 were prewarmed. Calls at other uncached caps can include OCR inside the four-minute whole-question clock. The raw reports' assertion that every per-question time excludes OCR is therefore too broad; these times cannot be treated as pure model latency or as a production OCR guarantee. The measured harness uses its 30-minute OCR request timeout; production's 10-minute default is unchanged.

The evaluated logger did not retain returned session error strings. The expanded run has 80 error-status rows: 34 finish with `max-iterations` and 46 with `error`. The anchor has 12: seven finish with `max-iterations` and five with `error`. All 92 have empty reply tails and no returned-error field. The specific causes of the 51 `error` finishes are not proven here; do not label them backend failures or context-guard failures from these records alone. After both scored runs ended, the harness was corrected to retain returned errors in future local JSONL diagnostics and qualify its OCR timing prose. A controlled-adapter CLI exercise against the actual patched file retained four returned errors, recorded four null non-errors, preserved selected scoring fields and rejected an invalid limit before writing outputs. It does not supply missing historical errors or new OCR/model evidence. There was no rescore or inference restart.

This is one run per set on one host. It does not establish repeatability or settle small differences. The measured channel is headless; the extension is covered by its separate unit/live-history evidence and the maintainer's pending real-use entry. Support tier: internal-compatible for the experimental enabled local path, candidate for promotion. The default stays off. M5 and the maintainer's workspace-document evidence remain pending.

### Retained evidence

The [metadata evidence](../../../releases/v2/v2.12/development/evidence/phase-6-evaluation.json) records complete counts, times, controller state, report/result/diagnostic hashes, and the post-run reporting exercise. Raw replies, keys and logs remain outside the repository at `C:\Users\bdour\AppData\Local\Temp\nexus-v212-outline-eval-nuaqmnj3`; they were not copied into release evidence.

- Expanded result SHA-256: `87b0f5647032b35e7801623778e8db60fcf8928247bf75d8a8c9feeab6ed42d5`.
- Anchor result SHA-256: `896bf9c8d5d5c561cd113991dc681077b9baf67b586bd6fef610452cbafe9bd1`.
- [Phase 6 history](../../../releases/v2/v2.12/development/history/2026-10-09_outline-promotion-readiness-phase-6.md) records verification and the local results commit.
