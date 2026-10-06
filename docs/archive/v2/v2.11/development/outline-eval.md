# Outline smoke test (v2.11.0 Phase 5)

Generated 2026-10-04T00:34:53.342Z by `NEXUS_OUTLINE_SMOKE=1 npx vitest run --config configs/vitest.smoke.config.ts` in 352.4 minutes.

Directional counts only: 24 questions per arm and model, one run, temperature 0. They cannot resolve small differences.

Models: qwen3.5:9b, gemma4:12b. Context 16384 tokens. Per-question time cap 4 minutes.
Question hash 3079827c42aee720, key hash 0a6cfb37cb75d34a.

Arms: A parse_document (50-page cap); B BM25 chunk retrieval over the full extracted text, one model call; C document_outline + document_read_section; D C with node summaries.

Cells are correct/asked. Timeouts and errors count as wrong.

The four table questions do not discriminate between arms: the fixture repeats one port table in every fourth section, so any copy answers them, including copies inside parse_document's 50 pages. Compare arms on the factual and cross-section columns.

| Model | Arm | All | Factual | Cross-section | Table | Within 50 pages | Past page 50 | Timeouts | Errors or no answer | Tool calls | Seconds |
|---|---|---|---|---|---|---|---|---|---|---|---|
| qwen3.5:9b | A | 9/24 | 4/12 | 1/8 | 4/4 | 7/12 | 2/12 | 0 | 9 | 42 | 1101 |
| qwen3.5:9b | B | 6/24 | 2/12 | 0/8 | 4/4 | 4/12 | 2/12 | 5 | 0 | 0 | 3083 |
| qwen3.5:9b | C | 8/24 | 7/12 | 1/8 | 0/4 | 4/12 | 4/12 | 0 | 7 | 73 | 850 |
| qwen3.5:9b | D | 9/24 | 7/12 | 2/8 | 0/4 | 5/12 | 4/12 | 1 | 5 | 71 | 1587 |
| gemma4:12b | A | 7/24 | 4/12 | 1/8 | 2/4 | 7/12 | 0/12 | 0 | 16 | 27 | 1599 |
| gemma4:12b | B | 0/24 | 0/12 | 0/8 | 0/4 | 0/12 | 0/12 | 24 | 0 | 0 | 5760 |
| gemma4:12b | C | 11/24 | 7/12 | 0/8 | 4/4 | 6/12 | 5/12 | 7 | 1 | 56 | 2226 |
| gemma4:12b | D | 9/24 | 7/12 | 0/8 | 2/4 | 6/12 | 3/12 | 9 | 2 | 56 | 3711 |

## M2 observation

- Cold first `document_outline` of the 65-page manual (CPU OCR, empty cache): 515.0 s.
- GPU before the run: 0 %, 6974 MiB, 16384 MiB. After the cold OCR: 0 %, 0 MiB, 16384 MiB. During a model call: 93 %, 6972 MiB, 16384 MiB.
- Runs were sequential, so OCR (CPU) and the model (GPU) did not contend in this harness.
- After this measurement every PDF and DOCX was extracted at both page caps (50 and 200) before any timed question, so per-question times exclude OCR in every arm. A user's first call on a new document pays the cold cost above.
- The 515.0 s above shared the CPU with test runs and page renders started during it. Two calibration runs the same day, with nothing else running, measured 436.6 s and 451.4 s. Read the cold cost as about 7.5 minutes for 65 text-dense pages (DF-v211-3).

---

Everything above this line was written by the harness. Everything below was added by hand on 2026-10-03 from the same run, using its per-run log (outside the repository).

## The 20 opening-words questions, split at page 50

The table columns above count the two table questions past page 50 as "past page 50", and any arm can answer those from an earlier copy of the table. Without them:

| Model | Arm | Within 50 pages | Past page 50 |
|---|---|---|---|
| qwen3.5:9b | A parse_document | 5/10 | 0/10 |
| qwen3.5:9b | B BM25 | 2/10 | 0/10 |
| qwen3.5:9b | C outline | 4/10 | 4/10 |
| qwen3.5:9b | D outline + summaries | 5/10 | 4/10 |
| gemma4:12b | A parse_document | 5/10 | 0/10 |
| gemma4:12b | B BM25 | 0/10 | 0/10 |
| gemma4:12b | C outline | 4/10 | 3/10 |
| gemma4:12b | D outline + summaries | 4/10 | 3/10 |

What this run shows, directionally:

- Past page 50 the baselines answered nothing on either model, and the outline tools answered 3 to 4 of 10. That is the capability the tools add.
- Within the first 50 pages the arms are close.
- Cross-section questions (the section after a named one) mostly failed in every arm: C scored 1/8 and 0/8.
- Why runs failed, from the log: the model lost the question after several tool results filled the 16,384-token window (it ended by asking what the user wanted). This happened to `parse_document` after one read and to the outline tools after about four (DF-v211-7). OCR text with dropped spaces made the model quote the wrong line in some sections. gemma4:12b timed out on all 24 BM25 calls and on 7 to 9 outline runs, mostly while thinking.

## Decision

- **The flags stay off in v2.11.0**, as committed before the run: `nexus.coding.documentOutline.enabled` and `nexus.coding.documentOutline.summaries.enabled` both default to false in the extension and the desktop app.
- **The counts are directional only**: one run per cell, two models, 24 questions.
- **Promotion criteria, committed in the plan before the run**: default-on is considered only when arm C answers at least 6 of the 8 cross-section questions and the past-page-50 questions correctly, and strictly more than the better of A and B, on both models, over three repeats in a later re-run with at least 20 cross-section questions. This run is far from that: arm C scored 1/8 and 0/8 on cross-section. Fixing DF-v211-7 comes before any re-run.
- **Arm D against arm C**: summaries did not beat the outline alone (qwen 9 against 8 overall, the same 4/10 past page 50; gemma 9 against 11 overall, the same 3/10). The summaries default stays off under the same thresholds.
- **M2**: about 7.5 minutes of CPU OCR for the first outline of a 65-page PDF; later calls read the outline cache.
- **Review**: DF-v211-2, owner the maintainer, at the v2.13.0 release. If no session-history or DEVLOG entry cites a workspace document hash and the answer obtained, remove the tools and the settings keys.

How to turn the flag on, and where a use entry goes: `docs/handbooks/technical/document-outline.md`, sections "Turning them on" and "Recording real use".
