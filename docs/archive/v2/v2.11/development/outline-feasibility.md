# Outline feasibility (v2.11.0 Phase 2)

<!-- measurements:start -->

Generated 2026-10-02T05:46:44.077Z by `npx vite-node scripts/measure-document-outline.ts`.

Prerequisites: C:\Users\bdour\AppData\Local\Nexus\python\venv\Scripts\python.exe: rapidocr_onnxruntime, pypdfium2, python-docx importable.

| File | Kind | Path | Engine | Markdown | Pages (returned/count) | Seconds | Heading recall | Precision | Page agreement | Deterministic | Navigation |
|---|---|---|---|---|---|---|---|---|---|---|---|
| binary-renamed.txt | binary | direct | - | - | - | - | - | - | - | - | rejected (NUL byte) |
| bom-crlf.md | markdown | direct | direct | yes | 1/1 | 0 | 100% | 100% | n/a | yes (bytes) | 0/0 |
| fenced-code.md | markdown | direct | direct | yes | 1/1 | 0 | 100% | 100% | n/a | yes (bytes) | 0/0 |
| handbook.md | markdown | direct | direct | yes | 1/1 | 0 | 100% | 100% | n/a | yes (bytes) | 3/3 |
| manual-60p.pdf | pdf | ocr | rapidocr | null | 65/65 | 441.3 (6.79/page) | 47% | 65% | 67% | yes | 1/3 |
| no-headings.md | markdown | direct | direct | yes | 1/1 | 0 | 100% | 100% | n/a | yes (bytes) | 0/0 |
| notes.txt | text | direct | direct | no | 1/1 | 0 | 100% | 100% | n/a | yes (bytes) | 3/3 |
| page-marker-literal.md | markdown | direct | direct | yes | 1/1 | 0 | 100% | 100% | n/a | yes (bytes) | 0/0 |
| policy.docx | docx | ocr | docx | yes | 3/3 | 0.2 (0.07/page) | 100% | 100% | n/a | yes | 3/3 |
| quick-guide.pdf | pdf | ocr | rapidocr | null | 2/2 | 13.7 (6.85/page) | 50% | 100% | 100% | yes | 1/3 |
| repeated-headings.md | markdown | direct | direct | yes | 1/1 | 0 | 100% | 100% | n/a | yes (bytes) | 0/0 |
| scan-10p.pdf | scan | ocr | rapidocr | null | 12/12 | 74.6 (6.22/page) | 0% | 0% | n/a | yes | 0/3 |

Runtime cap: 210-page generated PDF: pages returned 200, pageCount 200, 348.4 s.

<!-- measurements:end -->

## Observations

- Markdown, plain text, and DOCX give a complete heading tree: 100% recall and precision, deterministic, instant, and the navigation check sliced the right section in every case it tried.
- RapidOCR (CPU, the portable default) returns `markdown: null`, so PDF and scan headings must come from OCR text lines. It is deterministic on this host (two extractions gave identical page text).
- A one-page probe shows the OCR does recover heading lines, but on the scan it drops the spaces ("1.1StorageLayoutDetails") and merges body words ("Measurerecordconfig"). The measurement's numbered-heading detector requires whitespace, so the 0% scan recall and part of the 47-50% PDF recall are a detector weakness, not proof that headings are lost. The Phase 3 quality predicate would need space-insensitive matching.
- OCR cost is about 6.2-6.9 s per text-dense page on this CPU (65 pages: 441 s). A sparse 210-page PDF took 348 s for the 200 pages the runtime returns.
- The runtime caps at 200 pages and then reports `pageCount: 200`, so truncation beyond 200 is invisible in its result; the true page count would have to come from the PDF itself.
- The GPU OCR engine is not installed on this host and was not measured.

## Decision 2.3: how the outline layer obtains every page

**Choice: Option B.** Pass the runtime's `pages` array through the parser types and give the outline path its own entry point with a cap up to the runtime's own 200. `parse_document`'s interface and 50-page default stay unchanged.

**Evidence**: the runtime already returns per-page text (`pages`) for every fixture, up to 200 pages, without any runtime change; only the TypeScript seam drops it. Option A changes a shipped tool and is out of scope; Option C (looped paged parses) would need a start-page parameter the runtime does not have.

**Unblocks**: 3.1, 3.2, 3.3, 4.1.

## Decision 2.4: structure source per input type, and the stop rule

| Input | Path | Heading-capable (recall >= 0.8) | Structure source |
|---|---|---|---|
| Markdown | direct read | yes (100%) | headings |
| Plain text | direct read | yes (100%, numbered titles) | headings |
| DOCX | OCR runtime, docx engine | yes (100%) | headings |
| Born-digital PDF | OCR runtime, RapidOCR | no (47-50% with the measurement detector) | page windows, unless the run-time predicate accepts the recovered headings |
| Scan | OCR runtime, RapidOCR | no (0% with the measurement detector) | page windows |

Engine determinism table: `rapidocr` (portable, CPU, this host) deterministic; `docx` deterministic; direct read deterministic by construction; any other engine, including the GPU engine, unlisted and therefore non-deterministic (`ephemeral`).

**Stop rule, evaluated as written (thresholds fixed before the run):**

| Criterion | Result |
|---|---|
| (a) `parse_document` interface and 50-page default unchanged | PASS (Option B) |
| (b) no OCR runtime change | PASS |
| (c) first call on the 60-page born-digital fixture within 5 minutes | **FAIL**: 441 s on this host (CPU RapidOCR, 6.79 s per page) |
| navigation check slices a correct section for at least one type | PASS (markdown, text, DOCX) |

**Outcome: STOP, as the rule is written.** Criterion (c) fails. Under the plan, Phases 3 to 5 are replaced by DF-v211-2 and the run continues at Phase 6 with DOC-1 and the CI gaps.

**Open question for the maintainer (blocking).** Criterion (c) measures the OCR engine's own throughput, which `parse_document` already pays on the same pages today; the outline adds no OCR of its own. A narrower reading would compare the outline's first call against `parse_document` on the same pages and record the absolute OCR latency as a known gap. Changing a pre-registered rule after reading the result is a decision for the maintainer, not for the run, so the run stops here until it is made.

## Maintainer decision (2026-10-02)

The maintainer approved option B ("Approved your recommendation", recorded as the answer to blocker 0 in the run record). The plan file is not edited, because the signed run record binds its text; this section is the authoritative amendment.

- **Criterion (c), amended**: the outline's first call may add at most 10% over `parse_document` on the same pages. The absolute OCR cost is the engine's, already paid by `parse_document`, and is recorded as DF-v211-3 rather than used as a viability bound. Phase 4.5 measures the overhead.
- **Outcome under the amended rule: CONTINUE.** (a), (b), and the navigation check passed as written.
- **Scope consequence**: markdown, text, and DOCX get headings; PDFs and scans get page windows unless the run-time predicate accepts the recovered headings, which needs space-insensitive matching for OCR text.
