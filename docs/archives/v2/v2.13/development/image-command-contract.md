# v2.13 image command contract (T019 decision)

**Status**: decided 2026-10-15 for Phase 6. Scope: agent describe, apply, undo, redo, preview and export of a persisted Image Studio image.

## Findings that bound the design

- The control surface (`desktop/sidecar/src/controlSurface/`) authenticates one shared app token. It has no per-caller or per-run identity, so the token cannot by itself decide which image a caller may touch.
- The headless confirmation owner is the ask inbox (`modules/coding/autonomy/AskInbox.ts`): a parked ask is shown in the desktop Ask inbox panel and a human approves or denies it. Desktop coding sessions pass no confirmation host, so their tool calls are not tier-checked.
- The shell relays renderer-initiated calls only (`ipc_call` in `desktop/src-tauri/src/lib.rs`, `sidecar.rs` drops lines without a request id). There is no sidecar-to-renderer push. Renderers already poll the sidecar for work (`useJobDrain`, `*.drainEvents`).
- Window capture (`window_capture.rs`) is a screenshot of the first window. It cannot serve as edited-image export.

## Decisions

1. **Grant.** An agent asks for one image by studio session and turn id, naming a caller id and a run id. The sidecar parks the request in the ask inbox (`toolName: image_edit_access`, DANGEROUS-tier by default as an unknown tool). Only a human approval there issues a grant: a random 128-bit secret bound to the caller id, run id, session, turn and source hash, valid for at most 1 hour. Every agent call presents caller id, run id and grant secret; any mismatch is `FORBIDDEN`. The app token alone, or the desktop viewer's own grants, never satisfy an agent call. Grants end on release, expiry, session deletion or sidecar exit.
2. **Seam.** Agents reach the commands through the existing authenticated JSON CLI routes (`/nexus/image-edit/*`) and the `nexus` CLI, documented in the bundled `nexus` skill. No new built-in coding tool, MCP entry, listener or script evaluation. The UI and the agent routes call the same recipe-store mutation (`ImageEditRecipeStore.commit`).
3. **Mutations.** `apply` requires `expectedRevision` and an idempotency key. A bounded replay cache (256 entries) keys on caller, grant, session, turn, expected revision and key, and stores the canonical payload hash with the result. The identical request returns the stored result without another mutation; the same key with a different payload returns `IDEMPOTENCY_CONFLICT`. Undo and redo are `apply` with those actions.
4. **Render bridge.** The sidecar queues a render request `{requestId, revision, sourceSha256, width, height, state, png}` where `png` is the pinned, hashed source byte snapshot. A running desktop renderer claims requests by polling `studio.image.render.claim` and answers with `studio.image.render.complete`. The sidecar waits at most 8 s; unclaimed or unanswered requests fail with `RENDERER_UNAVAILABLE` and produce no output. A response is accepted only for a live request id, as a PNG whose IHDR dimensions equal the recipe's and whose size is within the 8-bytes-per-pixel source ceiling; stale or forged responses are discarded. Pending requests are rejected when the sidecar shuts down.
5. **One pixel path.** `desktop/src/shared/studio/imageEditRenderer.ts` holds the extracted mark painting and a `renderEditedPng` function built on the existing `renderAdjusted`. The viewer's own export and the bridge both call it.
6. **Export.** Output goes only to `~/.nexus/generations/exports/`. The sidecar canonicalizes that root at start, refuses a root or file path that resolves elsewhere (links, junctions or a replaced parent), and creates the file exclusively (`wx`), so an existing file is a `EXPORT_EXISTS` error and is never overwritten. Before writing it re-reads the recipe revision and source hash; a change during the render refuses the export. Preview returns the PNG bytes to the caller and writes nothing.

## Not chosen

- A Rust event channel or emitter: unnecessary, since polling stays inside current transport and the construction ceiling.
- A headless browser or Node canvas renderer: forbidden by the plan and a second pixel path.
- Agent-chosen export paths: would need a destination allowlist this repository does not have.
- A built-in `image_edit` coding tool: desktop coding sessions do not enforce confirmation tiers, so it would bypass the human grant; the CLI route keeps one authorization path.
