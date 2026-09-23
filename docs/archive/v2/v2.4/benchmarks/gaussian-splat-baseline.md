# Gaussian splat baseline

**Date**: 2026-09-22
**Command**: `node scripts/bench-gaussian-splat.mjs` and `node scripts/bench-gaussian-splat.mjs --real`

## What this measures

The default mode builds one deterministic 32-byte splat row from a tiny still fixture and checks that the row count is 1. It does not score how the picture looks. `--real` does not launch CUDA. A live NVIDIA run is not proven here.

## Observed

Fake mode on win32, 2026-09-22:

```json
{"mode":"fake","platform":"win32","wallMs":0,"peakRamBytes":"not observed","peakVramBytes":"not observed","gaussianCount":1,"outputBytes":32,"validation":"pass","failure":null}
```

Real mode on the same host:

```json
{"mode":"real","platform":"win32","wallMs":null,"peakRamBytes":"not observed","peakVramBytes":"not observed","gaussianCount":null,"outputBytes":null,"validation":"not proven here","failure":"real-backend-not-invoked"}
```

Peak RAM and peak VRAM were not observed. They are not recorded as zero.

## Support envelope

| Surface | Status |
| --- | --- |
| Viewer on Windows, Linux, and macOS | Implemented for local `.splat` and `.ply`. A real GPU framebuffer was not measured in this run. |
| Generate on NVIDIA CUDA | Optional TripoSplat adapter. It runs only when local weights are present. Live generate quality is not proven here. |
| Generate on macOS, AMD, or CPU | Fail closed. The preflight returns `unsupported-platform` or `cuda-missing`. |

## Limitations

Unseen sides of a single-image splat are invented. The Image Studio panel says so. This benchmark does not claim a property tour or a perceptual score.

## Troubleshooting

- Missing `model.safetensors` or `infer.py` under the models root returns unavailable and does not download weights.
- A remote source path is rejected.
- A timed-out or cancelled job deletes the staged splat and leaves the source PNG in place.
