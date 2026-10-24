# Dependency repair review

## Scope and method

Base: `bfc0fbc665ee7917b81d5fd504d48ac40badc8ce`. Reviewed commits `f13d29c0` and `f223770d`, plus the subsequent security toolchain, test-harness and packaging repairs in `fix/stryker-pairing`. Mode: report-only. Depth: full within these two bounded batches: test-harness migration first, then dependency/configuration/packaging changes. Lockfile inspection followed changed package nodes and peer edges rather than printing the entire generated diff.

Intent: keep Stryker core and runner compatible, patch the MCP SDK, reconcile the pending npm update groups, migrate vulnerable development tools without weakening assertions or coverage thresholds, isolate generated benchmark reports, attribute shared video metadata tests to root coverage, and exclude local records from VSIX packaging. The main checkout's concurrent v2.12 runtime work, the protected generated historical benchmark fixture, and draft documentation updates were excluded from this source review.

| Lens | Reason and observed result |
|------|----------------------------|
| Correctness | Always-on; no findings in either batch; independently rechecked the later npm argument-forwarding fix |
| Maintainability | Always-on; no findings in either batch |
| Testing | Always-on; no findings in either batch; confirmed all 16 relocated tests and their 37 assertions remain |
| Project standards | Always-on; no introduced convention, threshold or manifest/lock mismatch |
| Security | Selected for dependency provenance, credential tests, filesystem output and package exclusions; no introduced substantiated finding |
| Reliability | Selected for temporary directories, report writes, SQLite fixtures and subprocess setup; no introduced substantiated finding |
| API contract | Selected for consumed tooling configuration and the new test-report environment option; no product API/schema change or substantiated contract break; independently rechecked npm forwarding |

Performance was skipped because no production hot path or user-sized workload was changed. Adversarial review was skipped because no production parser, endpoint or trust boundary was added. Agent-native review was skipped because no product capability was added.

Each lens returned an empty JSON findings array. The fixed scoring sequence (deduplication, agreement promotion, advisory demotion, then confidence gate) therefore had zero findings at each stage. No surviving finding needed an independent validation pass. This is a focused manual review, not a complete security scanner audit, host qualification or GUI observation. Deterministic verification results are recorded separately in [dependency-pr-reconciliation.md](dependency-pr-reconciliation.md).

## Considered but rejected

| Candidate | Location | Evidence and disposition |
|-----------|----------|--------------------------|
| Higher development Node floor | Root manifest and locked tool engines | The base already required Node >=22.12 through Electron rebuild and a higher floor through semantic-release; the declaration mismatch predates this repair |
| Vite/plugin peer mismatch | Desktop dependency graph | Locked plugin-react 4.7.0 explicitly permits Vite 7; selected package peer versions are aligned |
| Loss of video tests | Relocated `WorkflowMetadata.test.ts` | Exact content comparison differs only in the import path and `.js` suffix; root discovery includes the new path |
| Weaker migration measurement | `MemoryStore.migration.test.ts` | The transaction batches fixture seeding before the existing measurement starts; row count and timing assertions remain unchanged |
| Benchmark overwrite or path-driven deletion | Both benchmark tests | Default report roots come from `mkdtemp`; optional retained directories are never recursively removed; distinct report prefixes and exclusive creation prevent overwrite |
| Vault tests passing through constructor failure | `credential-vault-mcp.test.ts` | Added connection assertion failed all four cases with the old constructor and passed all four with the constructible mock; vault assertions remain |
| False-positive worktree result | `worktree-read-rooting.test.ts` | Assertion correlates a successful read result with its call id and checks exact retained bytes plus absence from the source repository |
| Incomplete orchestration mutation coverage | Specialized Stryker Vitest configuration | The deliberate orchestration-test exclusion predates this repair; the observed seven-mutant smoke proves execution, not complete mutation coverage |
| Lost shell test arguments | Root `test:shell` script | Corrected the nested npm separator; the rerun visibly enables coverage and uses the requested worker settings; plain invocations still run the same workspace test command |

Remaining full npm audit findings are unresolved development dependency chains. The newer vsce adds a secretlint chain to the existing unpatched `braces` advisory; this is recorded rather than presented as an entirely clean development graph. Final VSIX contents and production audit require their own fresh command evidence.

## Targeted coverage-repair follow-up

Correctness, testing, maintainability and project standards independently reviewed the subsequent three sidecar test moves and the two new behavior test files in report-only mode. All four returned empty JSON findings arrays. The relocated suites retain all 38 cases and 57 assertions: chat explorer 20/28, data transfer 15/24, studio sessions 3/5. Changes are Node environment annotations, import paths, explanatory comments and a logger-only mock that removes a VS Code dependency while leaving real SQLite stores and sidecar operations exercised. Existing root store tests remain in place.

Nine new IPC contract tests exercise the production clients and adapters through the existing invoke override, checking routes, parameters, null usage counters, result envelopes, malformed search-hit filtering, error propagation and cache invalidation. Three new failure-card tests exercise details visibility and accessible expansion state, copying the original trace, confirmation reset, and denied-clipboard fallback. Overrides, mounted components, globals and timers are reset between tests. All 50 focused cases passed, including the moved suites. Full coverage thresholds are unchanged and the fresh project-wide runs remain the acceptance gate.

Considered and rejected: scratch directories left by the transferred tests and stores closed after assertions are unchanged from their originals; optional client method calls are followed by route or result assertions that fail if the method is absent. The IPC checks prove serialization and adapter behavior through an injected invoke boundary, not a live Tauri transport. The component tests use jsdom, not native visual observation. No broader claim follows from these results.

## Document-client coverage follow-up

The fresh full desktop run passed all 2,261 cases with one skip and met function, branch and line thresholds; statement coverage reached 79.88% against an unchanged 80% gate. Eight subsequent document IPC cases exercise the actual renderer client via its existing invoke seam and controlled timers: usable installed-model filtering, unavailable model list, chosen engine, polling progress and result, start failure, drain failure, error event, missing result, and pre-acceptance cancellation. The parameterized polling cases attach rejection expectations before advancing time. Terminal parse paths assert zero timers before cleanup. Exact requests, results and errors are checked. All eight cases, desktop lint and type checking passed.

The same four reviewers independently returned empty findings arrays for this file. They considered missing post-acceptance cancellation and overlapping slow-poll coverage, and treated these as unchanged pre-existing gaps rather than introducing a finding against a tests-only diff. The existing global test setup clears timers before restoring real timers; the local hooks also reset the invoke seam and response queue. These are contract tests, with no claim of live OCR or native Tauri verification. The subsequent full desktop coverage rerun passed 2,269 cases with one skip and all unchanged thresholds; root passed 6,080 with 12 skips. Final deterministic and artifact evidence is recorded in the reconciliation document.
