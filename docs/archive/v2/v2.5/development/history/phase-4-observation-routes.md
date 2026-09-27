# Phase 4 -- observation routes

Plan: `docs/v2/v2.5/plans/v2.5.0-adoption-diffusionstudio-editor.md`

## What landed

`GET /nexus/context`, `GET /nexus/logs`, and `POST /nexus/media/inspect` are on the existing loopback route. `nexus context`, `nexus logs`, and `nexus media inspect` call them. Logs are bounded and redacted. Media inspect refuses a path outside workspace roots before any stat or probe. `screenshot` and `capture` are `DF-v250-1`.

## Verification

`npx vitest run --config configs/vitest.config.ts tests/unit/controlSurface/observationRoutes.test.ts tests/unit/cli/contract.test.ts tests/unit/cli/reference-drift.test.ts` -- 39 passed.

Live sidecar: `Invoke-WebRequest http://127.0.0.1:11500/nexus/context` failed with `Unable to connect to the remote server`. Recorded as `QG-v250-1`. Not proven here.

## CI impact

New test path `tests/unit/controlSurface/observationRoutes.test.ts` is under the existing Vitest suite. No new dependency or workflow edit.

## Plan delta

**No delta.** The three routes match the phase. The live sidecar exercise could not run because nothing was listening.
