# Phase 1 -- CLI output contract

Plan: `docs/v2/v2.5/plans/v2.5.0-adoption-diffusionstudio-editor.md`

## What landed

- `docs/reference/cli/contract.md` states the stdout, stderr, and exit-code rules.
- `docs/v2/v2.5/development/cli-contract-audit.md` records pre-change behavior.
- `--json` now covers the subcommands that previously printed prose only. Prose defaults are unchanged.
- `nexus image` and `nexus video` are dispatched from `bin/nexus.mjs`.
- `tests/unit/cli/contract.test.ts` enumerates `HELP` and asserts JSON stdout.

## Verification

`npx vitest run --config configs/vitest.config.ts tests/unit/cli/contract.test.ts tests/unit/core/cli/jsonCli.test.ts` -- 35 passed.

`node bin/nexus.mjs skills list --json` wrote JSON Lines (one skill object per line) and exited 0. `JSON.parse` of the whole buffer fails once the catalog has more than one skill, which is the JSON Lines rule. `node bin/nexus.mjs skills install --json` wrote the missing-argument message to stderr and exited 2 with empty stdout.

## CI impact

New test path `tests/unit/cli/contract.test.ts` is under the existing Vitest suite. No new dependency, command, or environment variable. The pipeline already runs `npm test`. No workflow file was edited.

## Plan delta

**No delta** (with one non-blocking note). The contract matches the phase. The verification one-liner `JSON.parse` of the entire `skills list --json` buffer only succeeds for a single-line result. A synced catalog emits JSON Lines, so line-by-line parsing is the check that matches the contract. Later phases should document JSON Lines for collections and not treat a multi-line stdout as one JSON value.

## Known gaps

None added. Loopback commands (`session`, `models`, `generate`) still place their JSON error object on stdout, which is the existing shape this phase was told not to redesign.
