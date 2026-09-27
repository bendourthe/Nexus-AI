# Phase 3 -- self-driving nexus skill

Plan: `docs/v2/v2.5/plans/v2.5.0-adoption-diffusionstudio-editor.md`

## What landed

Placement is option B: `modules/coding/skills/catalog/nexus/SKILL.md`. Sync writes `~/.nexus-ai/catalog/` and does not manage the repo catalog. The skill routes to `docs/reference/cli/` and includes one local round trip.

## Verification

`npx vitest run --config configs/vitest.config.ts tests/unit/skills/self-driving-skill.test.ts` -- 3 passed.

A second agent session was not spawned. The automated checks prove the skill file, its links, and that every round-trip command is in HELP. A live sidecar round trip is Phase 4's observation work.

## CI impact

New test path only. The existing Vitest job covers it. No workflow edit.

## Plan delta

**No delta.** The plan's task line already named `modules/coding/skills/catalog/nexus/SKILL.md`, and the sync-root reading confirmed that path.
