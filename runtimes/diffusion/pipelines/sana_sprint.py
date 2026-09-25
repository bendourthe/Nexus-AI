"""Sana-Sprint pipeline (v1.1.0 Phase 12.3).

Registers `sana_sprint.txt2img` -- the 1-step distilled SANA pipeline
that backs Image Studio's "Fast Preview" toggle. The Sprint variant
configures the Flow-DPM-Solver scheduler with `num_inference_steps=1`
so a 1024x1024 image renders in roughly 0.3 s on an RTX 4090 / 0.5 s on
an RTX 4070.

The CI executor is the deterministic stub from `pipelines/base.py`; the
real diffusers call runs on the CUDA host under operator action OA-09.
The handler shape mirrors `sana.py` so the dispatcher can fall through
into the standard `PipelineRunner` orchestration without special-casing.
"""

from __future__ import annotations

from typing import Callable, Dict

from . import base, real_execute


# Sana-Sprint occupies ~3.5 GB on disk; in CUDA at bf16 the transformer
# + DC-AE VAE is ~5 GB. Use 6 GB as the planning size so the offload
# decision is consistent with the parent `sana.py` pipeline.
_MODEL_SIZE_GB = 6.0

# Sprint targets a single denoising step. The real diffusers config is:
#   pipe = SanaSprintPipeline.from_pretrained(...)
#   pipe.scheduler = FlowDPMSolverScheduler.from_config(pipe.scheduler.config)
#   pipe(prompt=..., num_inference_steps=1, guidance_scale=0)
#: Sprint's SCM scheduler rejects an intermediate timestep at any other count
#: (diffusers: "Intermediate timesteps for SCM is not supported when
#: num_inference_steps != 2"), and 2 is what the model card samples at.
DEFAULT_NUM_INFERENCE_STEPS = 2
DEFAULT_SAMPLER = "flow-dpm-solver"


def apply_sprint_overrides(payload: dict) -> dict:
    """Apply `overrides_for_sprint` to the REQUEST inside a job payload.

    A handler is called with `{"jobId": ..., "request": {...}}`, so patching
    the payload itself would set `steps` beside the request rather than in it
    -- which is exactly the sort of near-miss that leaves an override looking
    wired while the pipeline still receives the caller's numbers.
    """
    patched = dict(payload)
    patched["request"] = overrides_for_sprint(dict(payload.get("request") or {}))
    return patched


def register(handlers: Dict[str, Callable], runner: object | None = None) -> None:
    """Register `sana_sprint.txt2img`.

    The Sprint pipeline only supports text-to-image: the distilled model
    makes img2img low-quality, and the production Image Studio UX maps
    "Fast Preview" to txt2img only.

    `runner` is a test seam: it lets a test assert that the Sprint overrides
    reach the pipeline, which is exactly the wiring that was missing.
    """
    runner = runner or base.PipelineRunner(
        mode="txt2img",
        execute=base.select_executor("sana_sprint.txt2img", real=real_execute.image_execute),
        model_size_gb=_MODEL_SIZE_GB,
    )
    # v2.4.11: the override is APPLIED here, not merely defined. It was
    # written to force Sprint's step count and sampler, documented as
    # "the dispatcher calls this", and never called by anything but its own
    # unit test -- so a Sprint job reached the SCM scheduler with the form's
    # step count and died on `Intermediate timesteps for SCM is not supported
    # when num_inference_steps != 2`.
    handlers["sana_sprint.txt2img"] = lambda payload: runner.run(
        apply_sprint_overrides(payload or {})
    )


def overrides_for_sprint(request: dict) -> dict:
    """Return a copy of `request` with Sprint's required overrides applied.

    The dispatcher calls this when the caller's `modelId` resolves to a
    `sana-sprint-*` catalog entry so the user-facing form's "steps" /
    "sampler" controls are forcefully reset to Sprint's required
    configuration. Keeping the override pure-Python (no diffusers
    import) lets the unit tests in `tests/python/diffusion/test_pipelines_sana.py`
    cover this path without a GPU.
    """
    patched = dict(request)
    patched["steps"] = DEFAULT_NUM_INFERENCE_STEPS
    patched["sampler"] = DEFAULT_SAMPLER
    return patched
