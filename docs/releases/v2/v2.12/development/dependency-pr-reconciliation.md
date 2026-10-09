# Dependency PR reconciliation

Status: first repair committed at `f13d29c0fc2a522cd40b2665c94aebc106b8c99f`; grouped updates committed at `f223770d57b62207f80ec4ff7f53373afd323176`; subsequent security toolchain and coverage repairs passed the final local gates below. Nothing is published. Base: `origin/develop` at `bfc0fbc665ee7917b81d5fd504d48ac40badc8ce`. The concurrent main v2.12 checkout is preserved, with an isolated continuation worktree prepared separately.

## Verified repairs

- Stryker core and Vitest runner both resolve to 9.6.1 with Vitest 2.1.9. The prior core-only PR #48 left the runner on 8.x. Mutation targets now follow the moved guardrails and orchestration modules.
- A real mutation run over `LoopGuards.ts:132:0-148:0` produced seven mutants: six killed and one surviving string-literal mutation in the halt message. This proves runner execution, not complete mutation coverage. The first selected range contained only type declarations and produced zero mutants; it was rejected as verification evidence.
- MCP SDK resolves to 1.31.0. [GHSA-6qxp-vccf-f47h](https://github.com/modelcontextprotocol/typescript-sdk/security/advisories/GHSA-6qxp-vccf-f47h) affects 1.12.0 through 1.30.1, including PR #72's proposed version. Nexus's SDK client uses stdio, and no OAuth provider persistence was found in its consumers. The SDK was upgraded rather than adding an audit exception.
- The compiled Nexus `McpServer` completed a real SDK stdio handshake, exposed only the allowed read tool, and returned a successful tool result. Its injected tool executor was a fixture; this verifies transport and adapter compatibility, not the filesystem handler's authorization behavior.
- The worktree read test used a shared `C:\workspace` directory that contained a file produced during testing. Each case now gets a temporary workspace. The integration case checks the read call's exact result ID, success and content, plus the file inside the retained worktree and its absence from the source repository.

## Initial repair commands and results

| Command | Observed result |
|---------|-----------------|
| `npm ci --no-progress --loglevel=error` | Fresh isolated install passed |
| `npm run build --silent` before changes | Passed |
| `vitest run --config configs/vitest.stryker.config.ts` before changes | 622 passed |
| `stryker run configs/stryker.config.json --mutate modules/coding/guardrails/LoopGuards.ts:132:0-148:0 --reporters json --logLevel error` | Six killed, one survived |
| `npm run fast --silent` after SDK and test repairs | Passed; architecture has 18 warnings and zero errors |
| `npm test --silent -- --reporter=dot --maxWorkers=4 --minWorkers=1` | 6,102 passed, 12 skipped |
| `npm run test:shell --silent -- --reporter=dot --maxWorkers=4 --minWorkers=1` | 2,227 passed, one skipped |
| `npm run check --silent` | Zero errors; existing warnings remain |
| `npm run deps:check`, `npm run catalog:check`, `npm run perm-tier:check` | Passed |
| `npm run check:audit-prod --silent` after grouped updates | Zero allowed advisories and zero blocking advisories |
| `node .nexus-hub/mcp-stdio-smoke.cjs` | Handshake, allowlist, tool round trip passed |

The initial concurrent full runs failed in Windows temporary-directory cleanup, Video2X timeouts and process cancellation. Isolated reruns passed those cases. The isolated root run also exposed the shared-workspace test defect, which was corrected before the complete suites passed with four workers. Reduced contention is an inference from these observations; no production timeout or assertion was weakened.

## Remaining PR disposition

| PR | Remaining work |
|----|----------------|
| #48 | Supersede with the verified paired Stryker upgrade after integration |
| #72 | Requested runtime updates verified locally with patched SDK 1.31.0; supersede after integration |
| #59 | Requested development updates verified locally; VS Code types pinned to the declared 1.134.0 minimum; supersede after integration |
| #42 | Verified cache hash matches upstream v6.1.0; prepared patch awaits per-change approval |
| #43 | Verified upstream v3 backport; prepared patch corrects its misleading release comment and awaits approval |
| #44, #45 | Closed as obsolete; requirements are archived and bundled as data, but no current installer path installs them; unmerged branches retained |

## Grouped update verification

PRs #59 and #72 were reconciled together. The MCP SDK stays on patched 1.31.0 rather than the proposed 1.30.1. VS Code types stay at exactly 1.134.0 to agree with the declared application minimum rather than adopting 1.138.0. Electron rebuild 4.0.3 and 4.2.0 both require Node >=22.12; CI already uses Node 22 and 24. The existing root Node >=20 declaration diverges from that development-tool requirement.

The grouped root suite passed 6,102 tests with 12 skips in 135.64 seconds. The grouped desktop suite passed 2,227 tests with one skip in 179.93 seconds. Fast, platform, desktop web build, dependency, catalog and permission checks passed. Deterministic checks reported zero errors; warnings remain, including a warning in the ignored local stdio smoke script. Tauri CLI 2.12.1 and esbuild 0.28.2 ran. The compiled MCP stdio smoke passed again. The built preview HTML and its entry JavaScript returned HTTP 200; the page title was `Nexus AI Studio`.

Visual verification is not observed: the computer-use connector returned no available browser, with an empty app and browser inventory. HTTP evidence does not prove screen behavior. The full npm audit after the grouped updates reports 51 findings (four low, eight moderate, 34 high and five critical) in development dependency chains. Production audit is clean after a compatible brace-expansion 5.0.12 update and the Transformers upgrade. Remaining development advisories require compatible patches or separately verified major migrations; no audit allowance was added.

Rollback: the original manifests, lockfile, configurations and test are recoverable from the base commit. No action pin, permission, trigger, release version, tag or remote branch has changed at this checkpoint. Only the obsolete PRs #44 and #45 were closed.

## Security toolchain migration

Compatible lockfile patches and individually tested development-tool migrations select Vitest/coverage-v8 4.1.11 in both workspaces, Vite 7.3.7 for the desktop build, and vsce 3.9.2. Stryker 9.6.1 executed again with Vitest 4: seven actual mutants, six killed and one surviving halt-message string. The plugin-react 4.7.0 peer contract permits Vite 7. No audit exception, test skip, timeout increase or reduced coverage threshold was added.

The full npm audit fell from 51 findings to 27: three low, two moderate, 22 high, zero critical. Remaining development chains include unpatched braces/micromatch, bundled npm dependencies, nested Babel and KaTeX. The vsce migration adds a secretlint path to the existing braces advisory, so the development graph is not presented as clean. Fresh production audit reports zero allowlisted and zero blocking advisories.

Vitest 4 requires constructible constructor mocks; MCP unit mocks were corrected. The vault integration mock had also swallowed a constructor error: a new per-case connection assertion failed all four cases with the old mock, then passed all four with the constructible mock. SQLite migration seeding now uses one transaction before the unchanged measurement starts, and Git-control-plane fixtures remove redundant subprocesses. The existing checks remain intact.

Root coverage initially passed 6,118 tests with 12 skips: lines 86.77%, branches 75.91%, functions 86.44%, statements 84.60%. Sixteen shared core/video metadata tests moved from desktop to root coverage with their 37 assertions unchanged. This result predates the later vault fix and three sidecar moves, so a final root rerun remains required.

The root test:shell alias consumed forwarded options in its nested npm command. Appending the npm separator makes the same consumer command actually enable coverage and one-worker execution. Earlier desktop attempts through that alias are not coverage evidence. The first correctly forwarded run passed every case (2,211 passed, one skipped), but accurate statement/function coverage failed unchanged 80% thresholds at 77.72%/77.18%; lines 80.35% and branches 71.16% passed.

Three existing sidecar suites moved from root to desktop Node coverage, preserving all 38 cases and 57 assertions. Their actual SQLite/archive operations remain; a local logger-only mock removes the unrelated VS Code import in the chat suite. Nine new IPC tests exercise production client serialization and adapter behavior through the existing invoke override. Three new failure-card tests exercise disclosure state, trace copying, confirmation reset and clipboard-denial fallback. All 50 focused tests, desktop lint and type checking pass. The next full run passed 2,261 desktop tests with one skip and met function, branch and line gates, but statement coverage reached 79.88%, below the unchanged 80% threshold.

Both benchmarks now write default reports into unique temporary directories cleaned after the suite. Optional NEXUS_BENCH_RESULTS_DIR retention uses distinct names, actual UTC timestamps and exclusive creation. A real retained 2k-chunk smoke produced size ratio 0.1859 and recall 1.0; dehydration ratio was 0.0072. Thresholds and calculations are unchanged. This is not the unobserved 100k benchmark. The protected historical fixture has timing-only generated changes and remains unstaged pending its edit-guard approval; it was not restored or accepted.

Eight additional tests exercise the actual document IPC client with controlled timers: model filtering, progress and completion, start/drain/event failures, missing results and pre-acceptance cancellation. All eight focused cases, lint and type checking passed. The final full desktop run passed 2,269 tests with one skip and all unchanged coverage thresholds. Across both workspaces, 8,349 tests passed, compared with the grouped baseline's 8,329: every relocated case remains and 20 meaningful cases were added.

## Final local gate

| Command | Observed result |
|---------|-----------------|
| `npm test --silent -- --coverage --reporter=dot --maxWorkers=1` | 6,080 passed, 12 skipped; 564 passed files and three skipped files; 377.33 seconds |
| Root coverage | Statements 84.73%, branches 75.94%, functions 86.87%, lines 86.92%; configured thresholds passed |
| `npm run test:shell --silent -- --coverage --reporter=dot --maxWorkers=1 --fileParallelism=false` | 2,269 passed, one skipped; 249 passed files; 910.31 seconds |
| Desktop coverage | Statements 80.14%, branches 72.82%, functions 80.29%, lines 82.79%; configured thresholds passed |
| `npm run fast --silent`, `npm run platform --silent`, `npm run build:web --silent --workspace @nexus/desktop` | Passed; existing 18 architecture warnings and web chunk warnings remain |
| `npm run check:audit-prod --silent` | Zero allowlisted and zero blocking advisories |
| Dependency, catalog, permission-tier and test-integrity checks | Passed; test-integrity checker reports zero findings |
| Deterministic, feature-drift and docs-layout checks | Passed |
| `node .nexus-hub/mcp-stdio-smoke.cjs` | Compiled server handshake, read-tool allowlist and fixture tool round trip passed |
| `npx --no-install vsce package --out .nexus-hub/toolchain-smoke-final.vsix` | Passed; actual vsce packaging |
| VSIX archive inspection | 15,228 entries, 216,054,287 bytes, zero local Hub records, zero reports, nonempty compiled extension entry |

Independent source reviews and their rejected candidates are recorded in [dependency-repair-review.md](dependency-repair-review.md). Local logs and artifacts remain ignored under .nexus-hub. Package inspection is not native VS Code host qualification, and the fixture MCP executor does not prove filesystem authorization. GUI observation remains unobserved. Workflow pins #42/#43, the protected generated historical fixture and remaining development advisories are still open; no exception, workflow change or release was applied.
