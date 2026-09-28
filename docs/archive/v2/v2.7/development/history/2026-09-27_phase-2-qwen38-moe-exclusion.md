# Phase 2 - Qwen3.8 MoE distill exclusion note

**Plan**: [v2.7.0-adoption-avatar-install-gate.md](../../plans/v2.7.0-adoption-avatar-install-gate.md)
**Date**: 2026-09-27
**Branch**: `feat/v2.7.0-adoption-avatar-install-gate`

## Plan delta

**Disposition**: No delta

`docs/reference/model-acceptance.md` already contains `## Qwen3.8 family`, so Phase 2 took the subsection path and did not write a wait row. The acceptance bar gained `### Empero 35B-A3B distill`. No catalog or recommended-tier row was added. Phase 3 is unchanged.

## Functional exercise

### Functional exercise - distill exclusion note

- **Revision**: Phase 2 working tree, before the phase commit
- **Artifact and boundary**: Narrow documentation change, `docs/reference/model-acceptance.md`, read by the model-acceptance doc test and the catalog invariant suite
- **Command or action**: `npx vitest run tests/unit/docs/v2.4.9-model-acceptance.test.ts --config configs/vitest.config.ts` and, from `scripts/installer`, `uv run pytest tests/test_catalog_invariants.py -q --tb=line`
- **Input**: the new subsection text and the current `catalog.json` / `recommended.json`
- **Expected contract**: the subsection names `empero-ai/Qwen3.8-35B-A3B-Distill`, says it is not the 27B dense model, and ends "Not admitted, no catalog row." Neither catalog file contains `empero` or `Qwen3.8-35B-A3B`
- **Exit code or measurement**: vitest exit 0 (6 tests). pytest exit 0 (60 tests)
- **Observed output or state**: the subsection is present. Catalog and recommended files have no matching id
- **Comparison**: matches
- **Environment**: Vitest 2.1.9 and uv pytest, Windows
- **Evidence paths**: command output in the phase session
- **Delegates**: functional-verification documentation path. No runnable feature, command, or workflow changed
- **NOT COVERED**: none for this documentation boundary

## CI impact

No new command, dependency, environment variable, test path, or artifact. The doc test stays on the root Vitest job. The catalog invariant file stays on `installer-tests.yml`. No workflow file was edited.

## Gitignore

0 patterns added.

## Docs

The acceptance bar is the documentation change. DEVLOG still has no v2.7.0 index line; that waits for the release. No files were moved.

## Known gaps

No new row. The planned wait-row fallback was not needed.

## Next

Phase 3 writes `docs/v2/v2.7/development/last-phase-evidence.md`, reconciles gaps, and publishes once.
