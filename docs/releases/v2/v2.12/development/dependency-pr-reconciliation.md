# Dependency PR reconciliation

Status: local work in progress, not published. Base: `origin/develop` at `bfc0fbc665ee7917b81d5fd504d48ac40badc8ce`. The v2.12 implementation continues separately in the main checkout.

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
| `npm run check:audit-prod --silent` | Eight documented inherited advisories allowed; zero blocking advisories |
| `node .nexus-hub/mcp-stdio-smoke.cjs` | Handshake, allowlist, tool round trip passed |

The initial concurrent full runs failed in Windows temporary-directory cleanup, Video2X timeouts and process cancellation. Isolated reruns passed those cases. The isolated root run also exposed the shared-workspace test defect, which was corrected before the complete suites passed with four workers. Reduced contention is an inference from these observations; no production timeout or assertion was weakened.

## Remaining PR disposition

| PR | Remaining work |
|----|----------------|
| #48 | Supersede with the verified paired Stryker upgrade after integration |
| #72 | Retain patched SDK 1.31.0 and verify the other requested runtime updates |
| #59 | Verify remaining development updates; align VS Code types to the declared 1.134.0 minimum |
| #42 | Verified cache hash matches upstream v6.1.0; prepared patch awaits per-change approval |
| #43 | Verified upstream v3 backport; prepared patch corrects its misleading release comment and awaits approval |
| #44, #45 | Requirements are archived and bundled as data, but no current installer path installs them; close as obsolete after final reconciliation |

Rollback: the original manifests, lockfile, configurations and test are recoverable from the base commit. No action pin, permission, trigger, release version, tag or remote branch has changed at this checkpoint.
