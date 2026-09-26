# Closeout evidence for the v2.5.0 and v2.5.1 work on this branch

Quoted from the local tree on `feat/v2.5.0-adoption-diffusionstudio-editor` before the branch push.

## CI/CD coverage

`node scripts/check-command-parity.mjs` printed:

```
command-parity: PASS commands 141, exempt 26, findings 0
```

`node scripts/check-release-assets.mjs` printed:

```
release-assets: PASS parity 3 artifacts
```

`.github/workflows/ci.yml` runs both checks with no path filter. `.github/workflows/semantic-release.yml` runs the artifact parity check before `npx semantic-release`. Both jobs passed on the integration pull requests before merge.

Provider detected: GitHub Actions (`.github/workflows/`). Compared on `318bb2ea` without applying a rewrite. Silence is not approval, so the differences below stay recorded.

| Field | Observed |
|---|---|
| Events | `ci.yml` runs on `push` (every branch except `dependabot/**`) and on `pull_request` to `main` and `develop`. The contract wants validation on the pull request, not a second full run on push to the same branch. |
| Runners | TypeScript jobs use `ubuntu-latest`. The shell workflow uses an OS matrix. Linux and macOS installer workflows are `workflow_dispatch` only (`ubuntu-22.04`, `macos-latest`). |
| Required aggregate | Branch protection expects 16 separate status checks. There is no single always-resolving aggregate job. |
| Permissions | `check-command-parity` and `check-release-assets` set `contents: read`. |
| Pinning | Checkout and setup-node in those jobs use full commit SHAs with version comments. |
| Concurrency | `ci.yml` sets `cancel-in-progress: true` on `ci-${{ github.workflow }}-${{ github.head_ref \|\| github.ref }}`. |
| Path scoping | The two new gates have no `paths` filter. The packaged smoke is not a job at all. |
| Profiles | The five repository-native profiles (`fast`, `full`, `platform`, `report`, `release`) are not present. Not applied. |
| Cross-installer | `installer-build.yml`, `installer-linux.yml`, and `installer-macos.yml` exist. Linux job "Build manual Linux installer rehearsal" succeeded: https://github.com/bendourthe/Nexus-AI/actions/runs/36153544032. macOS job "Build manual macOS installer rehearsal" succeeded: https://github.com/bendourthe/Nexus-AI/actions/runs/36153548528. Both are dispatch-only rehearsals and do not stage the desktop payload. Windows installer bytes for `v2.5.0` were produced by `release.yml` run 36093413452. |
| First-run-remote | `check-command-parity` and `check-release-assets` have since passed on the integration pulls and on `2b4ed3b6`. The packaged smoke has not. |

## Known-gaps reconciliation

Open rows in `docs/v2/v2.5/known-gaps.md` for this work:

- `DF-v250-1` screenshot and capture stay deferred.
- `QG-v250-1` closed. The release executable served context and refused `C:/Windows/win.ini` as outside the workspace roots.
- `QG-v250-2` closed on CI. Node 22 job `108108818115` passed the byte-identical refusal test. This host still cannot load the module.
- `MT-v251-1` closed. Desktop eslint reports 0 jsx-a11y warnings and the ceiling is 0.
- `QG-v251-2` closed. Windows run 36214895318 printed `ok: true` and digest `4ac3034c06049ced364afc830971fedafb304d60aab0d9b0aac58e084a2fbf79`.
- `CI-v251-1` pipeline profile migration was not approved and was not applied. Linux run 36153544032 and macOS run 36153548528 both succeeded.
- `QG-v251-3` closed. The four routes rendered their selectors at 1440px. The sidebar overflow is the collapse pill, and the image findings are single-character labels.

Archived v2.4 gaps were not closed by these plans.

NI-3 stays resolved. The archive records that resolution on 2026-09-21, and `desktop/sidecar/src/protocol.ts` still imports `MODEL_FAMILIES` from `core/registry/ModelCatalog`. Command parity does not detect a duplicated enum, so this plan does not treat NI-3 as closed by Phase 2.

Other `docs/**/known-gaps.md` files whose status is still `in-progress` (`docs/archive/v2/v2.0`, `v2.3`, `v2.4`, and `docs/archive/v1/v1.5`, `v1.19`, `v1.20`) were not changed. Nothing observed in this cycle closes their rows.

## Architecture refactor

Scoped to the paths these plans added. No files were moved.

`npx depcruise --config configs/dependency-cruiser.cjs src core modules --output-type err` printed:

```
x 17 dependency violations (0 errors, 17 warnings). 484 modules, 1667 dependencies cruised.
```

The warnings are pre-existing `no-orphans` hits plus two `no-circular` pairs (`modules/coding/browser/headless.ts` and `core/memory/MemoryHub.ts`). `core/cli/jsonCli.ts` is in the orphan list because the cruise roots are `src`, `core`, and `modules`, while its importer is `desktop/sidecar/src/controlSurface/jsonCliRoutes.ts`. That is a cruise-scope miss, not an unused file.

## Living docs architecture

`npm run check:docs-layout` printed:

```
check-docs-layout: canonical layout OK (no docs/versions|docs/archive/versions wrappers)
```

`docs/testing/` and `docs/validation/` were not created.

## Git-tree hygiene

`python scripts/check_release_preconditions.py --branches --repo-settings` printed:

```
[branches]
current=develop
head=2b4ed3b606c4
protected_checkout=yes
working_tree=clean
origin=https://github.com/bendourthe/Nexus-AI.git
upstream=origin/develop
local_count=14
merged_into_head_count=8

[repo-settings]
status=observed
repository=bendourthe/Nexus-AI
default_branch=main
private=false
archived=false
issues_enabled=true
delete_branch_on_merge=false
default_branch_protection=observed
```

No branch was deleted.

## Human and manual testing

Class (a) is already asserted by the packaged smoke selectors (`chat-page`, `coding-page`, `image-model-select`, `video-lab-page`). These stay manual:

- Class (b): run one GPU image generation and one GPU video generation on the host that has the weights.
- Class (c): look at the four pillar routes and judge spacing, contrast, and motion. jsdom cannot evaluate those.
- Class (d): install `NexusSetup.exe` on a clean Windows machine and confirm the sidecar handshake.
- Keyboard-only and a screen reader over chatbot, agents, images, and videos. The axe baseline was taken under jsdom, which has no layout engine.

## Tier 3 deep pass

Bounded terminal result. Not a clean pass. `fix_rerun_cycles_used` is 0.

- Revision under review: `fdc80498` on `develop`. The published tag `v2.5.0` is `da07e4bd` on `main`.
- Blast-radius verdict: `run`. The diff changes CLI output, desktop UI, persistence snapshots, and release workflows.
- Exercised and quoted below: CLI contract commands, `cli-reference-drift`, the migration snapshot test on Node 22 CI, and the Windows packaged window probe in run 36214895318.
- Implementation-convergence ran on 2026-09-26 against revision `6a585116`. No new task lines were appended. The open items were already tasks or known gaps.
- The four-route measurement on 2026-09-26 is under `### Rendered-surface measurement`. `QG-v251-3` is closed there.
- Environments: Windows host, Node v24.13.0 ABI 137. This host cannot load `better-sqlite3`. The live executable and the CI window probe were observed separately.

Exercises run on 2026-09-25 against `node bin/nexus.mjs`:

| Command | Exit | Stdout | Stderr |
|---|---|---|---|
| `nexus context --json` | 1 | one JSON object, `error.code` `sidecar-down`, message names `http://127.0.0.1:11500/nexus/context` | empty |
| `nexus logs --json --lines 2` | 1 | one JSON object, `error.code` `sidecar-down`, message names `http://127.0.0.1:11500/nexus/logs?lines=2` | empty |
| `nexus --bogus` | 2 | empty | `nexus: unknown command` plus the help text, including exit codes 0, 1, and 2 |
| `nexus doctor --json --home <temp>` | 0 | one JSON object, `generatedAt` and `nexusHome` set to that temp directory | empty |
| `nexus media inspect <missing> --json` | 1 | one JSON object, `error.code` `sidecar-down`, message names `http://127.0.0.1:11500/nexus/media/inspect` | empty |
| `nexus context --json` against the launched executable | 0 | `{"sessionId":null,"title":null,"workspaceRoots":[],"primaryRoot":null,"modelId":null,"generationInFlight":false}` | empty |
| `nexus media inspect C:/Windows/win.ini --json` against the launched executable | 1 | `error.code` `forbidden`, message names `C:\Windows\win.ini` as outside authorized workspace roots | empty |

That matches `docs/reference/cli/contract.md` rule 46 for the sidecar-down rows. The later rows are the live executable: context exited 0, and `C:\Windows\win.ini` was refused. `QG-v250-1` is closed.

`node bin/nexus-check.mjs --rule cli-reference-drift` printed `nexus-check: 0 findings`.

### Rendered-surface measurement (2026-09-26)

The detector CLI opened `desktop/dist/index.html` and passed with 0 findings, but that file does not switch routes. Cold start in `desktop/src/main.tsx` replaces any other path with `/chatbot`. A local server of the same build, then an in-app link click, then the detector's measurement function, showed the route selector on each pillar at 1440px:

| Route | Selector count | Findings |
|---|---|---|
| `/chatbot` | `chat-page` 1 | `horizontal-overflow` on `aside` |
| `/coding` | `coding-page` 1 | `horizontal-overflow` on `aside` |
| `/images` | `image-model-select` 1 | `horizontal-overflow` on `aside`, plus two `undersized-text-box` findings |
| `/videos` | `video-lab-page` 1 | `horizontal-overflow` on `aside` |

That is not a layout defect. The overflowing node is `sidebar-collapse-toggle`, drawn 8px outside the aside (`aside` client width 279, pill right edge 288). The image findings are the single-character labels `W` and `H` (11px and 9px wide) and a disclosure glyph. `QG-v251-3` is closed on that determination.

### Goal-vs-plan sufficiency

`fix_rerun_cycles_used` is 0.

### Implementation-convergence (2026-09-26)

Present-state check of the three plans against the tree at `6a585116`. Counts of new findings appended to the plans: 0 missing, 0 partial, 0 contradicts. The plan files were left unchanged. These already-tracked items are not new work:

| source-ref | gap type | severity | evidence | remaining work |
|---|---|---|---|---|
| T025, T030 | closed | HIGH | Afternoon measurement on 2026-09-26, quoted under Full-suite testing. Root: 551 files passed, 3 skipped, 5913 tests passed, 12 skipped. Desktop: 237 files passed, 2199 tests passed, 1 skipped. Both exits were 0. | None. The Node 24 prebuild is local and uncommitted. |
| v2.5.1 DoD 8 | partial | HIGH | Smoke run 36274353659 printed digest `8272dd28c0053177cd9dda48b72b12834211010c290b7ed10e018176984b81bf` for a normal `npm run build:shell` with no `tauri.conf.json` patch. `check-release-assets.mjs` with no arguments still prints `release-assets: PASS parity 3 artifacts`. | The smoked file is `nexus-shell.exe`. The published Windows file is `NexusSetup.exe`. Those digests are of different files, and `release.yml` does not compare them. |
| DF-v250-1, CI-v251-1 | excluded |  | The editor plan leaves screenshot and capture out. The pipeline profiles were not approved. | Leave both open. |
| T026, T031, T043 | partial | HIGH | Later `develop` commits are not in tag `v2.5.0` at `da07e4bd`. | `/update release` starts only after a green merged integration and its confirmation gates. |

| Question | Answer | Evidence |
|---|---|---|
| What did implementing this teach that the plan did not know? | A 403 from a path outside the workspace roots was reported as an auth failure. Tauri's `tauri.localhost` and `ipc.localhost` hosts are loopback, and the first smoke treated them as egress. `workflow_dispatch` cannot see a workflow that is only on `develop`. | `core/cli/jsonCli.ts` now keeps a non-auth 403 body. `desktop/tests/packaged/smoke.mjs` accepts `*.localhost`. GitHub returned HTTP 404 for `packaged-window-smoke.yml` before the develop push trigger. |
| What did the plan assume that turned out false? | NI-3 was already resolved in the v2.4 archive. The plan's v2.5.1 name assumed no `feat` commits in the release range. Semantic-release computed one minor, `v2.5.0`, and there is no `v2.5.1` tag. | `docs/archive/v2/v2.4/known-gaps.md`. Release commit `da07e4bd`. |
| What would a reader of the Goal expect that no phase delivered? | Screenshot and capture stay excluded. A keyboard and screen-reader pass was not run. The Windows launch probe later passed in run 36214895318. | `DF-v250-1`. Human-testing section above. |
| What did the maintainer ask for that no task line captured? | One release after both 2.5.0 and 2.5.1 were finished. `v2.5.0` was published at `da07e4bd`. Later fixes, including the path refusal and the window probe, are on `develop` and are not in that tag. | https://github.com/bendourthe/Nexus-AI/releases/tag/v2.5.0 |

## Goal-vs-codebase review

Reviewed against the plan headers, not against ticked boxes. Misses stay known gaps.

**Editor plan.** Goal: an outside agent can install Nexus, read one reference tree, load one skill, and drive plus observe through `nexus`. `docs/reference/cli/` is the tree, `modules/coding/skills/catalog/nexus/SKILL.md` is the skill, and `core/cli/jsonCli.ts` plus `desktop/sidecar/src/controlSurface/jsonCliRoutes.ts` expose `context`, `logs`, and `media inspect`. A launched `nexus-shell.exe` returned context JSON and refused a path outside the workspace roots. `screenshot` and `capture` stay out of scope (`DF-v250-1`).

**Migration plan.** Definition of done: a corrupted migration leaves the original byte-identical, writes a snapshot, and refuses the next open, and three launches with nothing pending create no snapshots. The code is `core/storage/preMigrationSnapshot.ts` and the refuse-to-start path in `ChatHistoryStore`. Node 22 CI job `108108818115` passed "leaves the original bytes unchanged and refuses to reopen after a failed migration". On this host, after the published Node 24 prebuild was installed, `tests/unit/core/storage/preMigrationSnapshot.test.ts` passed 4 tests inside the root suite.

**v2.5.1, eight criteria:**

| # | Result | Evidence |
|---|---|---|
| 1 | Met in source | `desktop/tests/fixtures/a11y-violation.tsx` is linted with `--no-ignore` by `desktop/tests/a11y-config.test.ts`. The first-run count is in `docs/v2/v2.5/development/v2.5.1-phase1-evidence.md`. Desktop eslint now reports 0 warnings and the ceiling is 0. |
| 2 | Met in source | `desktop/tests/a11y-baseline.json` is `[]`. `desktop/tests/a11y.test.tsx` fails a new triple while the total count drops. |
| 3 | Met on this tree | `node scripts/check-command-parity.mjs` printed `command-parity: PASS commands 141, exempt 26, findings 0`. `tests/unit/scripts/command-parity.test.ts` covers an unmapped command, a zero enumeration, and a below-snapshot count. |
| 4 | Met in the workflow | `check-command-parity` in `.github/workflows/ci.yml` has no `paths` filter. The comment on that job states why. |
| 5 | Met on a launched Windows executable | `nexus-shell.exe` opened `http://tauri.localhost/chatbot`, `/coding`, `/images`, and `/videos`. Each route exposed `chat-page`, `coding-page`, `image-model-select`, or `video-lab-page`. |
| 6 | Met on the Windows smoke job | Run 36274353659 built `nexus-shell.exe` without a `tauri.conf.json` patch and the probe printed `{"ok":true,"digest":"8272dd28c0053177cd9dda48b72b12834211010c290b7ed10e018176984b81bf","findings":[]}`. |
| 7 | Measured on the launched window | The only requests observed were `tauri.localhost` and `ipc.localhost`. Those names are loopback. `https://example.com/models` still fails the checker. |
| 8 | Gate exists; the published installer digest is not the smoked shell digest | `node scripts/check-release-assets.mjs` prints `release-assets: PASS parity 3 artifacts` and runs in `ci.yml` and before `npx semantic-release`. Run 36274353659 smoked `nexus-shell.exe`. `release.yml` publishes `NexusSetup.exe` plus three VSIX files and does not compare those bytes to the smoke digest. |

NI-3 is resolved in the v2.4 archive and was not used as this plan's proving case. A11 stays deferred.

## Full-suite testing and stabilization

Measured on this host on 2026-09-26 after installing the published `better-sqlite3` 12.11.1 Node 24.13.0 prebuild (`node-v137-win32-x64`). That install was not an `npm rebuild`, and the binary is not a repository file. `node -e` printed `node-loaded 1` before the suites.

Root vitest (`npm test --silent` from the repo root), exit 0, duration 70.24s:

```
 Test Files  551 passed | 3 skipped (554)
      Tests  5913 passed | 12 skipped (5925)
```

`tests/unit/core/storage/preMigrationSnapshot.test.ts` passed 4 tests in that run.

Desktop vitest (`npm test --silent` from `desktop/`), exit 0, duration 818.51s:

```
 Test Files  237 passed (237)
      Tests  2199 passed | 1 skipped (2200)
```

The earlier same-day counts (root 503 failed, desktop 36 failed) were the Electron ABI 146 module on Node ABI 137. Those counts are superseded by this measurement.

## Publication and integration

Pull request 69 merged to `develop` at `c92bdfb15b2ab587b5810fe019bac9d3894a0198`. Pull request 71 merged the CodeQL fixes. Pull request 70 merged to `main` at `58b03ed225c25c27472003f83b6423215fc7c966`. Semantic-release published `v2.5.0` at `da07e4bd9a2330e5c7ede2406607fc01289f1201`. The release page has the three platform VSIX files, `NexusSetup.exe`, and `SHA256SUMS.txt`: https://github.com/bendourthe/Nexus-AI/releases/tag/v2.5.0. `develop` was fast-forwarded to that same commit. There is no separate `v2.5.1` tag, because the commit range since `v2.4.11` includes `feat` commits and semantic-release computed one minor.
