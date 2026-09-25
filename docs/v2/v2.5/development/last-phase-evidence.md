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

`.github/workflows/ci.yml` runs both checks with no path filter. `.github/workflows/semantic-release.yml` runs the artifact parity check before `npx semantic-release`. Those jobs have not been observed on a remote runner yet.

## Known-gaps reconciliation

Open rows in `docs/v2/v2.5/known-gaps.md` for this work:

- `DF-v250-1` screenshot and capture stay deferred.
- `QG-v250-1` live sidecar context was not observed.
- `QG-v250-2` migration snapshot tests did not load `better-sqlite3` (ABI 146 vs Node ABI 137).
- `MT-v251-1` 53 existing jsx-a11y warnings, ceiling 53.
- `QG-v251-2` packaged Tauri window was not launched.

Archived v2.4 gaps were not closed by these plans.

## Goal-vs-codebase review

The editor-plan goal (an agent can install Nexus, read one reference tree, load one skill, and drive plus observe through `nexus`) is met in source by `docs/reference/cli/`, `modules/coding/skills/catalog/nexus/SKILL.md`, and `nexus context`, `nexus logs`, and `nexus media inspect`. The live sidecar round trip is `QG-v250-1`.

The migration-durability goal (a failed migration leaves the original, writes a snapshot, and refuses the next open) is implemented in `core/storage/preMigrationSnapshot.ts` and `ChatHistoryStore`. The byte-identical proof was not run. See `QG-v250-2`.

The v2.5.1 goal (machine-checked packaged verification and a first accessibility gate) is met for jsx-a11y, the axe triple baseline, command parity, and the artifact-name list. The packaged window launch is `QG-v251-2`.

## Publication and integration

Not done in this file. The branch still has to be pushed, reviewed by CI, and merged before a release.
