# v2.12.0 Phase 4: Shared tool-result compaction

**Date**: 2026-10-09. **Plan**: [outline-promotion-readiness](../../../../../v2/v2.12/plans/v2.12.0-outline-promotion-readiness.md), T013-T014.

## Outcome

Both coding loops call one result-elision helper. Headless callers record result positions as they append them. The extension manager records result identities and resolves current positions after earlier pipeline strategies shift the history. The helper replaces old bodies with loop-authored placeholders; it does not find results by their text. Roles, positions, names, call identifiers, attachments and unrelated fields remain intact. System messages, the original task, and the newest result are protected; the extension also retains its configured recent-result count.

The headless loop checks its ledger before the next request, compacts at 60% toward 40%, and preserves the measured backend density during the rewrite estimate. The next real count can trigger another compaction. A possibly truncated prompt with nothing elidable, or a still-full prompt, ends with a clear recovery instruction. Explicit context configuration takes precedence; otherwise the desktop uses its existing loaded-model probe. That probe now remains timed and cancellable through JSON-body consumption. Desktop runtime errors pass through the existing user-facing formatter.

New legacy result rows have loop-owned IDs. Those markers survive SQLite resume and fork copying with new unique IDs; stored roles, content and schema remain unchanged. Elided marked results remain excluded from human-turn protection in later trimming stages. Unmarked historic user rows remain unowned by this helper; no content-based ownership migration was performed.

## Plan delta

The approved plan remains sufficient. Queue assessment still places v2.13 after v2.12 integration; the installed enumerator omits the approved legacy v2.12 path, so direct plan inspection supplements it. No queued plan qualifies for parallel execution. The session retains the plan's strong/high capability; live model switching is unavailable and no weaker model was substituted.

The effective-window resolver is reused rather than duplicated. Production inspection found the desktop already probes Ollama's loaded window, so the loop receives the same probe instead of applying an unrelated fallback to a known larger window. Review uncovered ownership across forks and later human-turn classification, plus the newly awaited probe's response-body stall; their narrow fixes and regressions are included in this phase. Existing unrelated main-worktree edits and historic benchmark changes remain preserved.

## Fresh verification

- Expanded runtime, chat, LLM, documents, storage, agent-loop and compaction-under-load scope: 672 tests pass in 49 files. New review regressions independently pass 17 tests in three files. The desktop runner/enrichment/document/Settings scope passes 46 tests in five files.
- Strict root scope lint and strict desktop lint pass. Root scratch runtime and shared-core builds pass; desktop TypeScript check passes. The final guarded production sidecar build passes. Architecture check: zero errors, 18 existing warnings. The baselined deterministic checker passes with 56 matched existing findings and zero stale entries, rather than a zero-findings raw result.
- Scripted tests distinguish the exact 60% threshold and 40% stopping target, repeated real-count compaction, protected messages, native and legacy shapes, forged envelopes/placeholders, shifted indices, fork-resume ownership, later emergency task protection, explicit-versus-loaded window precedence, and cancellation. Real ephemeral HTTP servers prove timeout and cancellation release incomplete response bodies; each test closes its connections in finally.
- The actual 65-page manual was extracted through CPU OCR and read with qwen3.5:9b on Ollama 0.32.15. Eleven model requests completed one outline and nine section reads, with six compaction events. The final prompt retained the exact task, and the answer included FINAL ANSWER COMPLETE. Real prompt counts were 6,797; 8,658; 9,427; 7,941; 8,885; 8,449; 9,376; 8,662; 8,974; 9,096; 9,263, all below 16,384. Final retained text plus elided bodies would estimate 16,729 tokens without compaction. [Evidence](../evidence/phase-4-compaction.json) records document/task/source hashes, calls, counters, message metadata and content hashes. Full local diagnostics remain in the cited ignored scratch artifact.

This real run supports the headless compaction boundary. Its OCR-derived table words and final response were not scored for answer quality; it does not promote the tools or replace Phase 6's preregistered experiment. Extension behavior is supported by the shared function and production-manager tests, rather than an additional visual extension session here.

## Review and troubleshooting

Correctness, maintainability, testing, project-standards, security, API-contract, reliability and adversarial lenses reviewed this phase against 56b05c6e separately from the concurrent Settings work. Findings were deduplicated, verified against real source contracts or failing tests, fixed, and rechecked. Remaining findings: zero. Verifier classes include deterministic tests and evidence-based contracts, supported by independent model-based lenses.

| Considered but rejected | Location | Reason |
|---|---|---|
| Discover result ownership from forged envelopes or placeholders | Shared helper and manager | Caller positions and trusted IDs own selection. |
| Treat elision as a native history migration | SQLite/provider boundary | Existing roles, content and columns stay unchanged. |
| Replace the existing loaded-window resolver | Desktop runner | Reusing its precedence avoids divergence. |
| Validate injected invalid target values as a new public input | Shared helper | Production targets derive from validated windows; no caller-controlled target is exposed. |
| Refactor the compact loop block or duplicate callback construction | Runtime/compactor | It adds indirection without reducing meaningful complexity. |

The first broad test run caught obsolete append-method assertions and missing test-double ownership methods; they now reflect the real contract. A fork-resume test initially passed the wrong API argument and was corrected to load the stored session ID. The first isolated live build omitted the separate core project and failed before inference; the completed build includes both projects. Failed setup logs are retained and are not counted as passes.

## CI impact and remaining work

CI impact: no pipeline change. New tests fall under existing root/desktop globs, and new source is covered by existing lint, TypeScript, architecture and sidecar jobs. Current push/pull-request event cost and pending workflow pins are reserved for the final pipeline reconciliation. No push, pull request, or remote CI ran for this phase.

No new unresolved phase gap is introduced. Phase 3's OpenAI-compatible native-history limitation remains DF-v212-4. Outline tools stay off by default. Phase 5 Settings source is separately verified and documented; its task/gap closure and commit follow this phase. Phase 6 still needs the committed decision rule and maintainer approval for its long GPU run, and Phase 7 owns integration and field testing.
