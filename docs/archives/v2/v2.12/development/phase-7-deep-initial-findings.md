# Phase 7 initial whole-plan deep-pass findings

Status: initial collection complete with named uncovered boundaries; NO-GO. This record does not certify installation, promotion, publication, or a clean root suite.

Revision: HEAD 30a2e47bddc1280badb91aaeaa78c3bcb9447baf, incoming integration base/MERGE_HEAD 092ce3c2f386db020d18eab6d69c0655657b2456. The exact initial content manifest is [phase-7-deep-inputs.json](evidence/phase-7-deep-inputs.json). Both approved plan hashes are bound there. Blast radius: run, for tool/API budgets, native history and persistence, compaction/security, Settings UI, generated HTML, and fixtures. Global fix/rerun cycles used: 0 of 3 before this initial finding set.

## Whole-plan coverage inventory

| Feature | Phase/task | Artifact | Real boundary | Input | Observed result | Evidence | Status |
|---|---|---|---|---|---|---|---|
| Seed decline and index | T001-T005 | docs/reference/declined-models.md; docs/v2/v2.12/known-gaps.md | Four-block guard, link consumer | 40 catalog IDs, 43 recommended IDs, nine links | No Kolibri ID; links resolve | Phase 1 retained proof; independent review | internal-compatible |
| Window probing and ledger | T006-T008 | outputBudget.ts; both agent loops | Headless HTTP /api/ps and /api/chat | Controlled prompt counts and four turns | Per-turn and same-turn room shrinks | phase-7-headless-loopback.json | internal-compatible |
| Extension document caps | T007-T008 | src/tools/handlers/documentOutline.ts; parseDocument.ts | Extension host tool dispatch | Document reads; parse output | Prior extension and deterministic receipts; current full-root certification unfinished | Earlier channel proof; T029 hold | partial |
| Headless document caps | T007-T008 | DocumentOutlineTools.ts; headlessTools.ts | Public HeadlessAgentSession.run and real file tools | Outline plus three reads | 16,654 then 4,885 characters, four tool results | phase-7-headless-loopback.json | internal-compatible |
| Unknown prompt-count fallback | T008 | document-budget-loops.test.ts | Temporary copy of existing integration test | Explicit context; unknown prompt count | Six tests pass; original unchanged | phase-7-budget-proposal-verified.json | proposal only |
| Native Ollama history | T009-T011 | toolHistory.ts; ConversationManager.ts; provider clients | Actual HTTP NDJSON serializer | Native IDs, names and object args | Assistant calls/results remain paired | phase-3-native-history.json; phase-7-headless-loopback.json | internal-compatible |
| Legacy persistence and compatible clients | T011 | ConversationManager.ts; LM Studio/OpenAI-compatible clients | Persistence mapping and earlier tests | Native tool result saved as legacy user envelope | No schema migration; native compatible history deferred | Independent current-state review; DF-v212-4 | partial |
| Shared elision and compaction | T012-T013 | elideToolResults.ts; CompactionStrategy.ts; both loops | Real headless loop and earlier extension run | Accumulated tool results | Two compactions; original task retained | phase-4-compaction.json; phase-7-headless-loopback.json | internal-compatible |
| Hostile document boundaries | T013 | Screening; document tools; native serializer | Real file tools and HTTP client | Hidden instruction, forged envelope, secret/outside path, orphan native result | Screened or rejected; orphan rejected before chat | phase-7-headless-adversarial.json | internal-compatible |
| Outline switch | T014-T015 | SecuritySettings.tsx; handlers.ts | Rendered Settings and IPC | Saved flag; environment-owned flag | Default off; authoritative status and persistence observed earlier | phase-5-settings/browser.json; desktop tests | internal-compatible |
| Summary switch | T014-T015 | SecuritySettings.tsx; documentOutlineEnabled.ts | Rendered Settings and IPC | Enable/disable summaries | Saved preferences and environment ownership observed earlier | phase-5-settings/browser.json; desktop tests | internal-compatible |
| Expanded PDF generator | T016 | manual-120p.pdf; expected metadata | pypdf PdfReader on frozen bytes | 123 pages, 60 headings, 48 tables | Pages and openings match; initial two-page table probe insufficient | phase-7-pdf-consumer.json | partial |
| Expanded questions and key | T017 | questions-manual-120p.json; keys-manual-120p.json | Evaluation validation CLI | 152 expanded and 96 anchor outcomes | Validated inputs; preregistered bar unchanged | phase-6-evaluation.json | internal-compatible |
| Preregistration and runner | T018-T019 | outline-smoke.ts; outline-eval.md | Actual earlier local inference/OCR run | Arms A/C; Qwen and Gemma | Decision committed before runs; artifacts frozen | phase-6-evaluation.json | internal-compatible |
| Promotion decision | T020 | outline-eval.md | Frozen score consumer | Cross-section results | Qwen 0/20, Gemma 4/20: futility; no repeats or promotion | phase-6-evaluation.json | observed failure to qualify |
| User-outcome target | T020 | outline-eval.md | Anchor score consumer | Error/no-answer target <=4 and <=8 | Observed 13 and 15: target missed | DF-v211-7; phase-6-evaluation.json | observed failure |
| Architecture and links | T021 | phase-7-layout-scan.md | Inventory/refgraph/link tools | 135 selected paths | 25 living, 39 active, 71 source; zero moves/new breaks | phase-7-layout-scan.json | internal-compatible |
| Known-gap reconciliation | T022 | known-gaps.md | Ledger count/owner-path parser | Current canonical ledger | Five open, two resolved; no concealed futility | phase-7-local-validation.json | internal-compatible |
| Atlas handbook | T023 | docs/handbooks/atlas.html | Temporary generated HTML in Chromium | Reading/presentation, eight widths, 320px and text200% | Earlier render proof; new shared accessibility defects | phase-7-handbooks/ | candidate; originals pending |
| Recovery handbook | T023 | docs/handbooks/generation-recovery.html | Temporary HTML in Chromium | Recovery procedures and controls | Earlier render proof; same accessibility defects | phase-7-handbooks/ | candidate; originals pending |
| Outline handbook | T023 | docs/handbooks/technical/document-outline.html | Temporary HTML in Chromium | Budgets, history, experimental limits | Earlier render proof; same accessibility defects | phase-7-handbooks/ | candidate; originals pending |
| Installer handbook | T023 | docs/handbooks/technical/installer-runtime.html | Temporary HTML in Chromium | Qualification limits | Earlier render proof; same accessibility defects | phase-7-handbooks/ | candidate; originals pending |
| Media handbook | T023 | docs/handbooks/technical/media-runtime.html | Temporary HTML in Chromium | Media finalization/limits | Earlier render proof; same accessibility defects | phase-7-handbooks/ | candidate; originals pending |
| Transcript/workspace handbook | T023 | docs/handbooks/technical/transcript-and-workspaces.html | Temporary HTML in Chromium | Permissions/retention boundaries | Earlier render proof; same accessibility defects | phase-7-handbooks/ | candidate; originals pending |
| Hygiene and dependency repair | T024 | dependency-pr-reconciliation.md; staged incoming merge | Git/manifest and repaired fixtures | Incoming develop dependency/test harness repair | 40 focused tests passed; dirty/occupied worktrees preserved | dependency-repair-review.md | partial |
| CI lifecycle | T025 | phase-7-ci-comparison.md; ci-lifecycle.md | Read-only workflow and required-check assessment | 23 fields | 6 PASS, 11 FAIL, 3 PARTIAL, 3 NOT PROVEN | phase-7-ci-inputs.json; QG-v212-1 | incomplete |
| Deep pass and Goal review | T026-T027 | This assessment; independent review | Public boundaries and exact content pins | Main and seed Goals | Incomplete; scoped evidence only | phase-7-deep-inputs.json | partial |
| Maintainer real use | T028 | docs/DEVLOG.md M5 template | Installed candidate used by maintainer | Concrete real-use entry | NOT COVERED; installed candidate/request pending | Existing T028/T030 | not covered |
| Full validation/build | T029 | phase-7-local-validation.json; build provenance | Actual test runners and owned source build | Root/desktop suites; root/sidecar build | Desktop coverage pass; builds pass; last complete root run failed | phase-7-build-provenance.json | partial |
| Benchmark output preservation | T029 diff | Four benchmark test writers | Default and explicit retained-output test runs | Owned temp dirs; ten historical files | Five tests pass each mode; historical bytes preserved | phase-7-local-validation.json | internal-compatible |
| Final integration and installer | T030 | Continuation branch and packaging | Green develop merge plus exact integrated installer | Exact publication binding | NOT COVERED; commit/approval/CI/merge/install pending | Existing T030 | not covered |

## Rendered-owner observations

Browser testing and HTML geometry receipts cover temporary candidates; source fidelity and rebuild identity passed. Eight-width earlier proof recorded 200 active states, 248 contrast/brand cases, and no outward requests or console errors. The added accessibility observation uses Chromium computed names, 320 CSS pixels, doubled root font size with increased text spacing, reduced motion, and keyboard interaction. It is not native screen-reader or browser-chrome-zoom certification. Browser testing and the HTML detector are not applicable to the PDF format; pypdf is the parser consumer, not a visual PDF renderer.

Confirmed shared findings: presentation headings use h2 with no exposed h1; the Exit control loses its name when narrow-screen CSS hides its span. Both originate in scripts/handbook-renderer.mjs. Candidate footer links have exclusive 24px space and are rejected as target-size defects. Focus restores after asynchronous fullscreen completion, so immediate checks are rejected as product failures. Retain the first observation and rerun the probe with settled focus. No viewport overflow or running reduced-motion animations was observed. Actual screen-reader speech, Lighthouse performance, and installed-app rendering remain not covered.

Hallmark audit: retained desktop/phone/reading contact sheets show the existing Nexus blue mark, light canvas, readable hierarchy, content-specific tables and procedures, and low ornamentation. Phone tables require narrow-cell wrapping and have a dedicated reading view. This visual judgment does not replace the accessibility findings.

## Initial finding set

1. accessibility-engineering: confirmed presentation h1 and Exit-name defects in all six candidates; repair the shared renderer and regenerate new temporary candidates in bounded cycle 1.
2. functional-verification: PDF table probe samples opening plus next page, while the first table is on page 5. Correct to actual section ranges in cycle 1; preserve the first receipt and all frozen bytes/scores.
3. functional-verification: terminal content inventory predates newest probes; refresh after bounded checks conclude.
4. Existing T023/T025/T028/T029/T030 duties remain incomplete: original HTML guard agreement, CI decisions, maintainer use, guarded original budget fixture, full-root certification, publication binding, green integration and integrated installer. These are holds, not approved deferrals or duplicate new tasks.

## Goal-vs-plan sufficiency

| Question | Answer | Evidence | Change needed now | Owner |
|---|---|---|---|---|
| What did implementation teach? | Correct bounded native history and shrinking reads can coexist with low actual answer quality; cold OCR was much slower than prewarmed samples. | Frozen Phase 6 evaluation and DF-v211-7. | Keep limits/default-off; do not repeat scored inference after futility. | Evaluation owner, T020/T022. |
| What assumption turned false? | Fixing output overflow did not deliver the separate halving target; the expanded cross-section result did not justify three repeats. | Anchor misses 13/15 against <=4/<=8; cross-section 0/20 and 4/20. | Report failure and carry quality work forward. | T020/T022 and v2.13 review. |
| What would a Goal reader expect that no phase delivered? | Both shipped channels exercised and an installed candidate qualified. Current controlled protocol/source-matched evidence does not establish the remaining installed/integration outcomes. | T029/T030 are open; independent review. | Finish already-tracked validation/integration/installer after the named holds are released. | T029/T030. |
| What maintainer request is not captured here? | All remaining plans/gaps, release, failed PR cleanup and clean develop/worktrees extend beyond this release plan. | Durable maintainer request in initial manifest; plan excludes release until field testing. | Keep active broader goal and queued v2.13 plan; do not mark this plan or the larger goal complete. | Root agent and maintainer. |

## Disposition

NO-GO under quality-gate-definitions: required original-root, actual-output, CI, integration and installer conditions are unsatisfied. Safety probes are scoped single observations, not a global safety pass or repeated pass^k evidence. No gate is bypassed. Available environment: Windows, Node 22, Vitest 4.1.11, Chromium 153, pypdf, and prior real Ollama/extension receipts. Other physical platforms/GPUs, integrated installed use, actual assistive speech and maintainer M5 remain not covered with owners identified above. The approved main and seed plans retain their existing task lines; no duplicate phase is appended.
