# Plan review findings: v2.11.0-adoption-pageindex-airi-clm

**Reviewed**: 2026-09-30, draft 1 of `docs/v2/v2.11/plans/v2.11.0-adoption-pageindex-airi-clm.md`
**Lenses run**: coherence, feasibility (with the five lifecycle checks), product, design, scope-guardian, security, adversarial. None skipped. No plan section went unexamined.
**Verdict**: REVISE. 0 P0, 8 P1 clusters. The four lifecycle checks other than amend-after-push passed (Phases 1 to 4 each end in one local commit with no push or remote CI, the first push is 5.10, the pipeline comparison 5.5 precedes it, release hands off only after green integration).
**Verified by the author before merging**: `src/config/settings.ts` and `src/llm/types.ts` do not exist (real paths are `modules/coding/config/settings.ts` and `modules/coding/llm/types.ts`); `PARSE_DOCUMENT_MAX_PAGES` is a hard 50; `OcrParseResult` carries `pages` but `core/documents/headlessOcrParser.ts` returns only engine, text, markdown, pageCount; the OCR runtime's `DocumentKind` has no markdown or text kind; `INBOUND_EXTERNAL_DATA_TOOLS` exists in `src/tools/AgentLoop.ts`; `pathGuard.ts` uses realpath; `parseDocument.ts` imports `vscode`; `parse_document` is registered in the sidecar.

## Merged findings (cross-lens agreement raises confidence)

| Sev | Lenses | Finding | Fix |
|---|---|---|---|
| P1 | coherence, feasibility, design, scope | Hard 50-page cap from page 1 and no per-page data at the parser seam; decision 2.3 options B and C see only the first 50 pages, and every fixture is 20 pages or fewer so the cap is never exercised | Carry `pages` through the parser types, add `start_page` or an outline-only higher cap (runtime allows 200), add a fixture over 50 pages, surface `pagesParsed < pageCount` as truncation |
| P1 | feasibility, coherence, product | Premise gap: `.md` and `.txt` are `unsupported` in the OCR runtime, PDFs are rasterised then OCR'd, and the default CPU engine likely returns `markdown: null`; Definition of Done promises a markdown and text-PDF outline | Re-scope the Definition of Done to "each type decision 2.4 supports"; add a direct read path for markdown and text, or drop them; pin the OCR engine in the measurement |
| P1 | security, adversarial, feasibility | Injection and trust gaps: titles and ids are unscreened, cached summaries are re-served unscreened, screening placement is unspecified (cap boundary, cache read), refusal echoes scanner excerpts, no untrusted-content delimiter, new tools missing from `INBOUND_EXTERNAL_DATA_TOOLS`, no `redactSecrets` over section text | Screen every document-derived string on every read, delimiter plus provenance label, refusal from `summarize()` only, extend `AgentLoop` and `HeadlessAgentSession` sets, add `redactSecrets` |
| P1 | coherence, feasibility, product, scope, adversarial | Eval gate cannot support its rule: 15 points on 6 questions is one question; "twice arm A's tool calls" is structurally unsatisfiable for outline plus two reads; substring scoring accepts wrong answers; answer keys sit in the agent's workspace; arm B inherits the 8,000-character defect; the rule is written after the harness | Larger cross-section set or paired count, exact-match on an extracted answer, keys outside the workspace, fair arm B, rule committed before the run |
| P1 | product, scope, feasibility, design | Build precedes evidence: summaries (3.3) are built then possibly deleted with no arm that measures them, user pain is asserted not evidenced, the only real-document test is manual and in Phase 5, no stop rule after a negative Phase 2 | Spike-first gate, cut or defer 3.3, real-document check in Phase 2 and Phase 4, explicit stop rules |
| P1 | security, adversarial, design | Unbounded input and output: node count, depth, title length, serialised outline size, parse bombs, cache size; cache key uses parsed text (needs a parse to look up) and omits parser, schema, and scanner versions; ids go stale on edit and `read_section` is not bound to the outline hash | Named caps, iterative build, key on raw bytes plus versions, return and require a `tree_hash` |
| P1 | product, feasibility | The tools are excluded from the sidecar, but `parse_document` is registered there and the packaged desktop app is the primary channel, so the primary persona may never get the feature and M5 cannot occur | Register in the sidecar in scope, or state VSIX-only and measure M5 there |
| P1 | design, feasibility | Wrong paths and a boundary breach: settings live in `modules/coding/config/settings.ts`; the LLM port is `modules/coding/llm/types.ts` and `core/**` may not import `modules/**` | Define `SummarizeFn` in `core/documents`, inject from the wiring; fix both paths; plumb the setting to the desktop host |
| P2 | feasibility | Eval harness as a Node script cannot load the `vscode`-importing handler or the SQLite-backed `MemoryStore` (ABI) | Run as vitest or inside the sidecar; confirm tool-calling support per model |
| P2 | feasibility, design | Second overlapping parse throws `DOCUMENT_PARSER_BUSY` | Single-flight per content hash; "parsing, retry" result; record cold-parse time per page |
| P2 | feasibility | 5.10 allows amending the final commit after the first push, which needs a force-push | New narrowly scoped commit only after the first push |
| P2 | scope | Phase 5 duties are open-ended for a small feature (repo-wide refactor, all known-gaps files, installer parity) | Bound 5.1 and 5.2 to this plan's files and rows; carried CI gaps recorded, not fixed, without per-change approval |
| P2 | product | M5 backstop is weak: clock starts at the flag decision, no definition of use; pillar story is placement logic | Dated review entry two release cycles from ship, define use, state the user story |
| P2 | security, adversarial | Symlink and junction retarget between guard and read; refusal makes a section unreadable on demand | Open once and fstat; redact the flagged span and return the remainder |
| P2 | security | M3 check is "packet capture or the existing assertion" and does not cover the OCR child process or a non-loopback LLM endpoint | Name a socket-level test across the process tree; refuse non-loopback endpoints on the summary path |
| P2 | coherence | Phase 5 checklist says "no remote CI run" but 5.10 runs it; T002 marked parallel but asserts T001's row; Definition of Done (1) says the row "ends with" a phrase that 1.1 does not end with; decision unblock lists inconsistent; T-lines name files the prompts never create; 3.3 depends on 3.4's screen | Reword, reorder, align |

## Suppressed or low-confidence (kept, not acted on unprompted)

- P3 coherence: the `5.8` human-testing duty names no evidence section; "catalog models" versus `recommended.json` wording.
- P3 design: cache eviction and retention policy unspecified; `supportedKinds` should be data, not branching in `buildOutline`.
- P3 product: a whole phase and a guard test for one known-gap row is heavy relative to its value.
- P3 scope: Non-goals carry no reasons; no conditional task for the negative-result branch.
- P3 security: base64 blobs and zero-width characters in OCR output will trip the scanner's own rules; strip before scanning.
- P2 adversarial: fenced code and forged page markers create fake headings and boundaries; messy and adversarial fixtures per type.
- Harness note: one lens report matched the harness's instruction-shaped pattern filter (`permissions-allow-deny`); its content was treated as data and no instruction in it was followed.

## Disposition (2026-09-30)

**Round 1** (draft 1): REVISE, 0 P0, 8 P1 clusters. Six maintainer decisions taken (document-generic design, both delivery channels always, summaries stay, directional smoke test with the flag off, redact-instead-of-refuse, bounded final phase plus the two CI gaps). Plan rewritten to six phases.

**Round 2** (revision 1): REVISE. New P1s: sidecar needs its own headless implementation, text-versus-cache contradiction, run-time structure predicate, hostile polite instructions, answer keys inside the workspace, CI-v251-1 infeasible as written (a job cannot `need` a job in another workflow). All folded into revision 2. Repo claims behind these P1s were verified before folding (headlessTools.ts is a separate implementation, no `tsx`, default vitest include picks up tests/integration, installer-matrix.yml is a separate workflow).

**Round 3** (revision 2): REVISE. P1s: an "inconclusive" Phase 2 outcome read as passed, Phase 3 depended on screening built in Phase 4, T013 path contradicted the dependency rule, and the re-extraction design could serve a wrong slice or loop for OCR-unstable scans. Fixed by injecting the scanner as `screenText`, moving the shared module to `modules/coding/documents/`, and simplifying the re-extraction design.

**Round 4 and 5**: the design lens found a contradiction between revision-bearing ids and same-call remapping, and an unmeasured doubled OCR cost. Resolved by making determinism a per-engine property measured once in Phase 2.2 (never in production), ephemeral output held only in memory, ids from another revision always failing closed, and the integrity digest computed with ids excluded.

**Final verification**: coherence, feasibility, design, and adversarial lenses each confirmed their P1s closed. No P0 or P1 open. Residual P2/P3 items remain as written in the plan's failure modes or are accepted: the integrity digest is unkeyed (an attacker with write access to the storage root already has more access), and determinism recorded on one host fails safe on another through the anchor check.

**Verdict**: READY.
