# Nexus Architecture Atlas

This walkthrough maps Nexus's durable user flows to their owning components.

| User flow | Primary owner | Supporting contract | Evidence |
|---|---|---|---|
| Install or repair media | `scripts/installer/` | Owner-aware lease; atomic runtime state | Tests; packaged run |
| Generate an image | [Image dispatcher](../../../desktop/sidecar/src/diffusion/dispatcher.ts) and Python pipelines | Shared readiness API | Validated PNG artifact |
| Edit or recover an image | [Image edit runtime](../../../desktop/sidecar/src/studio/imageEditRuntime.ts) and viewer | Revisioned recipes; approval recovery; retained originals | Retry, restart, restore and grant tests |
| Generate a video | [Video dispatcher](../../../desktop/sidecar/src/diffusion/videoDispatcher.ts) and Python pipelines | Shared readiness API | Probed video artifact |
| Browse and install models | `core/registry/` and Settings | Shared availability/recommendation tuple | Cross-language rank fixture |
| Read chat usage | `core/chat/` and shared chat UI | Role-local token provenance | Protocol, hydration, and UI tests |
| Organize chats; select workspaces | Chat explorer and Coding workspace | Persisted folder colors; union-of-roots boundary | Database reopen, picker and denial tests |

## End-to-end path

1. Catalog-source reachability checks and desktop payload preparation are packaging prerequisites. The installer provisions the media runtime.
2. The sidecar reads the atomic readiness record and exposes one repair contract to Image Studio and Video Lab.
3. Generation jobs check the selected model directory layout before loading models and finalize artifacts before reporting success.
4. The desktop renders truthful capability, model, transcript, archive, and workspace state from shared contracts.
5. Packaged acceptance requires installing the exact candidate, retaining the installer-to-payload binding, and exercising the installed runtime with the media smoke harness. The harness alone does not establish that binding.

Release-specific logs and test counts live in the corresponding release or archive tree.
