# Phase 1 - Avatar offered only when weights are installed

**Plan**: [v2.7.0-adoption-avatar-install-gate.md](../../plans/v2.7.0-adoption-avatar-install-gate.md)
**Date**: 2026-09-27
**Branch**: `feat/v2.7.0-adoption-avatar-install-gate` (cut from `origin/develop`)

## Plan delta

**Disposition**: No delta

The hardware predicate stayed `avatarAvailable`. The new offer requires that predicate plus a registry-installed `longcat-video-avatar-1.5` row. Video Lab still accepts audio from hardware alone, refuses a photo-plus-audio turn before intent when the weights are missing, and submits `audio2video` only after the user checks the confirm switch. `intent.ts` was not edited. No catalog row was added. Remaining phases are unchanged: Phase 2 still writes the distill note or the wait row, and Phase 3 still owns publication.

## Starting state

Video Lab used one `canAvatar` flag for composer audio, the talking-head controls, and `audio2video` routing. A diffusion-pro fixture that installed only Wan 2.1 still submitted `audio2video`.

## What landed

- `avatarOffered`, `officialAvatarInstalled`, and `avatarInstallRefusal` in `core/video/avatarGate.ts`.
- Video Lab keeps `hardwareAllowsAvatar` for composer accept, audio, and the talking-head placeholder. `offered` drives the form and `avatarEnabled`.
- A missing-weights refusal is persisted before the GPU check, residency, and `inferVideoIntent`.
- A photo-plus-audio turn on an offered host uses `longcat-video-avatar-1.5` for the busy check and residency, then `assertAvatarAllowed` with `OFFICIAL_AVATAR_REPO` and the user's confirm bit.
- When the offer drops, `confirmLocalAvatar` clears and a stored `audio2video` mode resets.

## Functional exercise

### Functional exercise - avatar install gate

- **Revision**: Phase 1 working tree, before the phase commit
- **Artifact and boundary**: Web UI component, `desktop/src/modules/video/VideoLabPage.tsx`, rendered by Vitest and Testing Library (the desktop page boundary this repo exercises)
- **Command or action**: `npx vitest run tests/VideoLabPage.test.tsx` from `desktop/`, plus `npx vitest run tests/unit/core/video/avatarGate.test.ts --config configs/vitest.config.ts` from the repo root
- **Input**: diffusion-pro at 24 GB with a Wan-only list; the same host with `longcat-video-avatar-1.5` `installed: true` and `source: "registry"`; diffusion-mid at 12 GB with that registry row; catalog-only, external, and omitted source rows
- **Expected contract**: missing weights hide `video-avatar-confirm`, still accept `audio/*`, and persist an install sentence with no `image2video` or `audio2video` request; the registry row starts unchecked and a checked submit is `audio2video` with `confirmLocalAvatar: true`; below-tier hides the control and a photo still routes to `image2video` with no install sentence
- **Exit code or measurement**: both commands exited 0
- **Observed output or state**: avatar gate 13 passed. Video Lab page 33 passed, including the three named cases and the three non-registry source fixtures
- **Comparison**: matches
- **Environment**: Vitest 2.1.9, jsdom, Windows
- **Evidence paths**: command output in the phase session
- **Delegates**: functional-verification procedure recorded here. verification-before-completion and quality-gate-definitions were not separate files; the five gates below are the disposition
- **NOT COVERED**: a packaged Tauri window was not opened. The plan's named observation is this Vitest page render. Browser geometry detection does not apply to the jsdom page

## Verification gate

| Check | Result |
|---|---|
| Avatar gate unit tests | 13 passed |
| Video Lab page tests | 33 passed |
| Desktop eslint on the three touched files | 0 errors, 0 warnings |
| Coverage of the new helpers | exercised by the unit cases (unloaded list, non-boolean installed, empty/catalog-only/external source, community repo, refusal nulls) |
| Build | not a separate compile; the page tests typecheck through Vite. Desktop `tsc --noEmit` was not run for the whole app |
| Remote CI | not run |

The first below-tier assertion failed because the photo was submitted before the composer stored the file (`text2video`). Waiting for the thumbnail made the same render submit `image2video` with no install sentence.

## CI impact

No new command, dependency, environment variable, test path, or artifact. `desktop/tests/VideoLabPage.test.tsx` is already on the desktop Vitest job in `.github/workflows/ci.yml` ("Desktop vitest"). `tests/unit/core/video/avatarGate.test.ts` stays on the existing root Vitest path. No workflow file was edited.

## Gitignore

0 patterns added.

## Docs

DEVLOG index was not given a v2.7.0 line. That line is written when the version is released. README was not changed; the user-facing behavior is covered by the page copy and this history. No files were moved.

## Known gaps

No new NI, DF, BG, WN, MT, or QG row. DF-8 stays open in the v2.0 archive.

## Next

Phase 2 writes the Qwen3.8 MoE distill exclusion. The family section is already in `docs/reference/model-acceptance.md`, so the subsection path is the one this phase leaves for Phase 2.
