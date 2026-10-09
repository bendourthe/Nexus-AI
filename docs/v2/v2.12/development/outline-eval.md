# Outline evaluation, v2.12.0 Phase 6

Status: pre-registered before any Phase 6 inference. This document is included in the local preregistration commit; its exact commit and run-start timestamps will be quoted in the results section. No result has been observed or scored yet. The outline flag stays off by default and experimental.

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

Pending the approved dry and full runs. Do not change the decision rule after observing results.
