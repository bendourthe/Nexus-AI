# Dependency PR reconciliation

Status: first repair committed at `f13d29c0fc2a522cd40b2665c94aebc106b8c99f`; grouped updates verified locally, not published. Base: `origin/develop` at `bfc0fbc665ee7917b81d5fd504d48ac40badc8ce`. The v2.12 implementation continues separately in the main checkout.

## Verified repairs

- Stryker core and Vitest runner both resolve to 9.6.1 with Vitest 2.1.9. The prior core-only PR #48 left the runner on 8.x. Mutation targets now follow the moved guardrails and orchestration modules.
- A real mutation run over `LoopGuards.ts:132:0-148:0` produced seven mutants: six killed and one surviving string-literal mutation in the halt message. This proves runner execution, not complete mutation coverage. The first selected range contained only type declarations and produced zero mutants; it was rejected as verification evidence.
- MCP SDK resolves to 1.31.0. [GHSA-6qxp-vccf-f47h](https://github.com/modelcontextprotocol/typescript-sdk/security/advisories/GHSA-6qxp-vccf-f47h) affects 1.12.0 through 1.30.1, including PR #72's proposed version. Nexus's SDK client uses stdio, and no OAuth provider persistence was found in its consumers. The SDK was upgraded rather than adding an audit exception.
- The compiled Nexus `McpServer` completed a real SDK stdio handshake, exposed only the allowed read tool, and returned a successful tool result. Its injected tool executor was a fixture; this verifies transport and adapter compatibility, not the filesystem handler's authorization behavior.
- The worktree read test used a shared `C:\workspace` directory that contained a file produced during testing. Each case now gets a temporary workspace. The integration case checks the read call's exact result ID, success and content, plus the file inside the retained worktree and its absence from the source repository.

## Commands and results

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
