"""v2.4.9 regression: the image path must actually release its VRAM.

Two defects, both found by the repo-local standards judge against the
v2.4.8 range and both fixed in v2.4.9:

1. `image_execute` called `vram_lifecycle.release_vram()` from a `finally`
   in the same frame that still held `pipe`. `torch.cuda.empty_cache()`
   returns only allocator blocks no live tensor holds, so the weights
   stayed resident and the chat model still could not come back onto the
   GPU -- the exact opposite of what the block's comment claimed.

2. `_empty_cache()` ran `torch.cuda.empty_cache()` BEFORE `gc.collect()`,
   so anything the collector was about to free was skipped by the sweep.

Both assertions below fail against pre-change code. No GPU required: the
first is proven with a weakref to a sentinel pipe, the second by recording
call order against a fake torch module.
"""

from __future__ import annotations

import gc
import sys
import types
import weakref
from pathlib import Path

import pytest

from runtimes.diffusion import vram_lifecycle
from runtimes.diffusion.pipelines import base, real_execute


class _SentinelPipe:
    """Stands in for a loaded diffusers pipeline. Weak-referenceable."""

    def __init__(self) -> None:
        self.moved_to: str | None = None

    def __call__(self, **_kwargs: object) -> object:
        image = types.SimpleNamespace()
        return types.SimpleNamespace(images=[image])


def _image_ctx(model_id: str = "sana-1.6b-1024") -> base.ExecutionContext:
    return base.ExecutionContext(
        job_id="job-vram",
        mode="txt2img",
        params=base.params.parse(
            "txt2img",
            {
                "modelId": model_id,
                "prompt": "a fox",
                "width": 64,
                "height": 64,
                "steps": 1,
                "cfgScale": 1.0,
                "sampler": "euler_a",
                "seed": 1,
            },
        ),
        offload_strategy="cpu",
    )


def test_image_execute_drops_the_pipe_before_releasing_vram(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
):
    """The sweep must see an unreachable pipeline, not a live local.

    Fails before the fix: `pipe` is still bound in `image_execute`'s frame
    when `release_vram()` runs, so the weakref is still alive at sweep time
    and `empty_cache()` would have nothing of substance to return.
    """
    monkeypatch.setenv("NEXUS_MODELS_ROOT", str(tmp_path))
    weights = tmp_path / "weights" / "sana-1.6b-1024"
    weights.mkdir(parents=True)
    (weights / "model_index.json").write_text("{}", encoding="utf-8")

    sentinel = _SentinelPipe()
    ref = weakref.ref(sentinel)

    monkeypatch.setattr(real_execute, "_require_accelerator", lambda: None)
    monkeypatch.setattr(real_execute, "_load_text_pipe", lambda *_a, **_k: sentinel)
    monkeypatch.setattr(real_execute, "_move_pipe", lambda *_a, **_k: None)
    monkeypatch.setattr(real_execute, "_png_bytes", lambda _image: b"png-bytes")
    monkeypatch.setattr(real_execute.base, "emit_stage", lambda *_a, **_k: None)
    monkeypatch.setattr(real_execute.base, "step_callback_kwargs", lambda *_a, **_k: {})

    alive_at_sweep: list[bool] = []

    def _recording_release() -> None:
        # Drop this function's own view of the sentinel is not needed: we ask
        # whether anything ELSE still holds it at the moment of the sweep.
        gc.collect()
        alive_at_sweep.append(ref() is not None)

    monkeypatch.setattr(vram_lifecycle, "release_vram", _recording_release)
    monkeypatch.setattr(real_execute.vram_lifecycle, "release_vram", _recording_release)

    # The local `sentinel` name would itself keep the object alive, so hand
    # the only strong reference to the loader and drop ours before the call.
    holder = {"pipe": sentinel}
    monkeypatch.setattr(
        real_execute, "_load_text_pipe", lambda *_a, **_k: holder.pop("pipe")
    )
    del sentinel

    real_execute.image_execute(_image_ctx())

    assert alive_at_sweep == [False], (
        "image_execute released VRAM while the pipeline was still reachable; "
        "empty_cache() cannot return blocks a live tensor still holds"
    )


def test_empty_cache_collects_before_returning_blocks_to_the_driver(
    monkeypatch: pytest.MonkeyPatch,
):
    """gc.collect() must run before torch.cuda.empty_cache(), not after.

    Fails before the fix, which called them in the opposite order.
    """
    order: list[str] = []

    fake_cuda = types.SimpleNamespace(
        is_available=lambda: True,
        empty_cache=lambda: order.append("empty_cache"),
    )
    fake_torch = types.ModuleType("torch")
    fake_torch.cuda = fake_cuda  # type: ignore[attr-defined]
    monkeypatch.setitem(sys.modules, "torch", fake_torch)

    real_collect = gc.collect

    def _recording_collect(*args: object, **kwargs: object) -> int:
        order.append("gc_collect")
        return real_collect()

    monkeypatch.setattr(vram_lifecycle.gc, "collect", _recording_collect)

    vram_lifecycle._empty_cache()

    assert order == ["gc_collect", "empty_cache"], (
        f"expected collect-then-empty, got {order}; emptying the cache first "
        "skips every block the collector was about to free"
    )


def test_release_vram_is_safe_when_the_pipeline_never_loaded(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
):
    """The `finally` runs on failure paths too, where `pipe` was never bound."""
    monkeypatch.setenv("NEXUS_MODELS_ROOT", str(tmp_path))
    weights = tmp_path / "weights" / "sana-1.6b-1024"
    weights.mkdir(parents=True)
    (weights / "model_index.json").write_text("{}", encoding="utf-8")

    monkeypatch.setattr(real_execute, "_require_accelerator", lambda: None)
    monkeypatch.setattr(real_execute.base, "emit_stage", lambda *_a, **_k: None)

    def _boom(*_a: object, **_k: object) -> object:
        raise RuntimeError("loader exploded")

    monkeypatch.setattr(real_execute, "_load_text_pipe", _boom)

    released: list[bool] = []
    monkeypatch.setattr(
        real_execute.vram_lifecycle, "release_vram", lambda: released.append(True)
    )

    with pytest.raises(real_execute.RuntimeNotReady):
        real_execute.image_execute(_image_ctx())

    assert released == [True], "the finally must still sweep when loading failed"
