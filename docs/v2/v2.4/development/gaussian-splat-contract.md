# Gaussian Splat Viewer and Generate Contract

**Release**: v2.4.0
**Decision date**: 2026-09-22
**Status**: Resolved for implementation. Viewer first. Generate is optional, local, and NVIDIA CUDA only.
**Seed comparison**: [Unsloth Qwen3.8-Flash-Next GGUF and 3D AI Studio Gaussian Splatting](../comparisons/v2.4.0-comparison-unsloth-qwen38-gaussian-splatting.md)

## Decision

Ship a local `.splat` and `.ply` viewer even when no generator is installed. Do not wrap 3D AI Studio, do not bundle ComfyUI, and do not shell out to a separately installed third-party splat CLI.

The first generate adapter, if it ships, is an internal adapter over MIT TripoSplat weights (`VAST-AI/TripoSplat`). Weights download only through the existing Hugging Face installer puller. The adapter does not download weights by itself.

The viewer is an internal TypeScript decoder plus a WebGL2 rasterizer. This record does not add an npm Gaussian-splat package.

## Rejected generate options

| Option | Disposition |
| --- | --- |
| Wrap 3D AI Studio HTTP | Rejected. Generation-as-a-service. Photos would leave the machine. |
| Bundle ComfyUI | Rejected. A second application graph, not an internal adapter. |
| Separately installed third-party splat CLI | Rejected. Shell-string execution and an unpinned binary. |
| Internal adapter over MIT TripoSplat weights | Chosen as the only generate path, and only after the viewer exists. |

## Honesty copy

User-facing generate and preview copy is exactly:

"This is a generated 3D preview. Unseen sides are invented. It is not a measured property tour."

The 2D original stays downloadable. A splat job must not replace or delete that file.

## Local-only view rules

`GaussianSplatViewRequest` accepts a canonical local filesystem path or an `ArrayBuffer` the sidecar already read. It rejects `http:`, `https:`, `ftp:`, protocol-relative URLs, and any URL whose host is `3daistudio.com`. `blob:` fetches of untrusted hosts are forbidden. The core decoder does not open the network.

Supported view formats are `.splat` and `.ply` only. Malformed magic bytes, a truncated file, or a Gaussian count above the contract maximum return a typed validation error and do not allocate an unbounded array.

## Generate rules

`GaussianSplatGenerateRequest` is a child job of a completed or uploaded still. It names a distinct output identity. Two requests for the same source do not share one output path and do not overwrite each other or the 2D original.

Capability result is `viewer-ready` or `generate-ready`. Viewer-ready does not imply generate-ready. Generate-ready requires an NVIDIA CUDA preflight. macOS, AMD, and no-GPU hosts fail closed with the honesty copy plus the reason the generator is unavailable. A missing, incompatible, or timed-out backend returns a typed unavailable or timeout result and leaves the source image in place.

The generator shares the existing GPU scheduler with diffusion. It does not start a second unbounded GPU client.

## Provenance

A completed splat records: source content hash, backend name and version, Gaussian count, seed, and duration. Screenshot and download actions use that record. Absence of a generator does not block viewing a local file the user already has.

## Platforms

| Surface | Support |
| --- | --- |
| Viewer | Windows, Linux, and macOS, local files only |
| Generate | NVIDIA CUDA only. Fail closed elsewhere |

## Later tasks this decision unblocks

| Comparison item | Plan tasks |
| --- | --- |
| G-V viewer | T004, T005, T006, T007, T008, T009 |
| G-G generate contract and TripoSplat adapter | T010, T011, T012, T013, T014, T015, T016 |
| Q-1 no Flash-Next catalog row | T001, and the catalog test in T003 |
| Q-2 thinking kwargs | Deferred. Not a v2.4.0 task |
| Q-3 Unsloth Desktop | Dropped. No task |
| G-M multi-view property tour | Dropped for v2.4.0. No task |
| G-S 3D AI Studio HTTP | Dropped. No task |
