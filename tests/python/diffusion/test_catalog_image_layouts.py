"""Every offered image model must ship weights the loader can actually open.

v2.4.11 operator report: "Image generation with that model didn't work", with
no error the user could copy. Driving the installed sidecar through the same
job answered it precisely:

    image runtime is not ready: model-layout-invalid:
    sana-1.6b-2k does not contain a complete pipeline or one supported SDXL
    checkpoint

The catalog provisions SANA 2K/4K as a raw `checkpoints/*.pth` training
checkpoint, while `real_execute._load_text_pipe` accepts exactly two layouts: a
diffusers directory (`model_index.json`) or a single root-level
`.safetensors`. A `.pth` under `checkpoints/` is neither, so those models
cannot generate at all -- and they are selectable, and pre-selected by tier on
some GPUs.

This test states the contract the catalog owes the runtime, so the mismatch
fails here rather than on a user's GPU. When a SANA entry is repointed at
diffusers-format weights, its expectation below goes away with it.
"""

from __future__ import annotations

import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
CATALOG = REPO_ROOT / "core" / "registry" / "catalog.json"

#: Ids known to ship a layout the image loader cannot open. Shrinking this set
#: is the fix; growing it is a regression.
#:
#: Empty since v2.4.11: every SANA entry was repointed from a partial download
#: (a raw `checkpoints/*.pth`, or a lone transformer safetensors) to the
#: complete bf16 diffusers tree the runtime actually loads.
KNOWN_UNLOADABLE: frozenset[str] = frozenset()

#: Models that do NOT go through `_load_text_pipe`, so its layout rules do not
#: describe them: SAM2 is a segmentation utility with its own loader, and the
#: INT4 variant is loaded by nunchaku from a single quantized file.
EXEMPT_PREFIXES: tuple[str, ...] = ("sam2",)
EXEMPT_SUFFIXES: tuple[str, ...] = ("-int4",)


def _image_models() -> list[dict]:
    data = json.loads(CATALOG.read_text(encoding="utf-8"))
    rows = data["models"] if isinstance(data, dict) else data
    return [
        m
        for m in rows
        if m.get("type") == "image"
        and not str(m.get("id", "")).startswith(EXEMPT_PREFIXES)
        and not str(m.get("id", "")).endswith(EXEMPT_SUFFIXES)
    ]


def _declared_files(model: dict) -> list[str]:
    weights = model.get("weights") or {}
    return [str(entry.get("path", "")) for entry in weights.get("files", [])]


def loadable_layout(paths: list[str]) -> bool:
    """Mirror of `real_execute._load_text_pipe`'s accepted layouts."""
    if any(Path(p).name == "model_index.json" for p in paths):
        return True
    root_safetensors = [p for p in paths if p.endswith(".safetensors") and "/" not in p]
    return len(root_safetensors) == 1


def test_offered_image_models_ship_a_loadable_layout():
    unloadable = {
        model["id"]
        for model in _image_models()
        if _declared_files(model) and not loadable_layout(_declared_files(model))
    }
    # Nothing new may join the broken set.
    assert unloadable <= KNOWN_UNLOADABLE, (
        "these image models declare weights the runtime cannot load: "
        f"{sorted(unloadable - KNOWN_UNLOADABLE)}"
    )


def test_the_known_broken_set_is_still_accurate():
    """A fixed model must leave the list, so the list cannot go stale."""
    by_id = {model["id"]: model for model in _image_models()}
    for model_id in KNOWN_UNLOADABLE:
        model = by_id.get(model_id)
        if model is None:
            continue  # Removed from the catalog: nothing left to warn about.
        assert not loadable_layout(_declared_files(model)), (
            f"{model_id} now ships a loadable layout -- remove it from "
            "KNOWN_UNLOADABLE so the guard keeps its teeth"
        )
