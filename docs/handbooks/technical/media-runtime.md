# Local Media Runtime

The desktop sidecar exposes one vendor-neutral readiness and repair API from `desktop/sidecar/src/diffusion/runtimeFactory.ts`. Image and video runtimes consume that API rather than deriving readiness independently from GPU telemetry or model presence.

Runtime readiness checks the interpreter and recorded backend smoke; generation preflight checks the selected model layout. Image execution produces PNG bytes, and video execution checks non-empty frames and finalizes an MP4 file after a file-size and container-header check. Full artifact decoding is part of packaged qualification. The bounded Repair action is available when the installed contract contains the required repair components; other failures retain their actual code and may require installer rerun or corrected input.

Packaged qualification is stronger than internal tests: the exact installed sidecar must produce a PNG with non-zero pixels and a video with valid codec, duration, frames, and dimensions.
