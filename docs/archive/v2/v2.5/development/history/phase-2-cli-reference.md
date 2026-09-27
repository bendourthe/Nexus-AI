# Phase 2 -- CLI reference tree

Plan: `docs/v2/v2.5/plans/v2.5.0-adoption-diffusionstudio-editor.md`

## What landed

One page per command group under `docs/reference/cli/`, plus `README.md`. `HELP` links to that index. `lib/checks/cli-reference-drift.mjs` fails when a HELP group has no page, a page omits a subcommand, or a page names a group or subcommand HELP does not list.

## Verification

`npx vitest run --config configs/vitest.config.ts tests/unit/cli/reference-drift.test.ts` -- 5 passed.

The phase asked to run the `session.md` example against a live sidecar. That exercise is deferred to Phase 4, which is the first phase that changes the sidecar. The documented `nexus session list --json` shape matches `GET /nexus/session/list` in `jsonCliRoutes.ts`.

## CI impact

New rule `cli-reference-drift` is registered in `lib/checks/index.mjs`, so the existing `nexus check` CI job covers it. New test path `tests/unit/cli/reference-drift.test.ts` is under the existing Vitest suite. No workflow file was edited.

## Plan delta

**No delta.** Pages are per command group, and the drift check requires each HELP subcommand string to appear on that group's page. `README.md` and `contract.md` are reserved and are not command pages.
