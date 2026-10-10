# Nexus Architecture Atlas

This walkthrough maps Nexus's durable user flows to their owning components.

| User flow | Primary owner | Supporting contract | Evidence |
|---|---|---|---|
| Install or repair media | `scripts/installer/` | Owner-aware lease and atomic runtime state | Installer tests plus packaged operator run |
| Generate an image | `desktop/sidecar/src/diffusion/dispatcher.ts` and Python pipelines | Shared diffusion readiness API | PNG validator and retained artifact |
| Generate a video | `desktop/sidecar/src/diffusion/videoDispatcher.ts` and Python pipelines | Shared diffusion readiness API | Video probe and retained artifact |
| Browse and install models | `core/registry/` and Settings | Shared availability/recommendation tuple | Cross-language rank fixture |
| Read chat usage | `core/chat/` and shared chat UI | Role-local token provenance | Protocol, hydration, and UI tests |
| Work across local folders | Coding page and workspace scope | Union-of-roots path boundary | Picker, persistence, and denial tests |

## End-to-end path

1. Catalog-source reachability checks and desktop payload preparation are packaging prerequisites. The installer provisions the media runtime.
2. The sidecar reads the atomic readiness record and exposes one repair contract to Image Studio and Video Lab.
3. Generation jobs check the selected model directory layout before loading models and finalize artifacts before reporting success.
4. The desktop renders truthful capability, model, transcript, archive, and workspace state from shared contracts.
5. Packaged acceptance requires installing the exact candidate, retaining the installer-to-payload binding, and exercising the installed runtime with the media smoke harness. The harness alone does not establish that binding.

Release-specific logs and test counts live in the corresponding release or archive tree.
