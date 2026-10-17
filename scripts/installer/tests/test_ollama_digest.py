"""v2.14.0 T016 -- the installer verifies a pinned hf.co pull's GGUF digest."""

from __future__ import annotations

import json
from pathlib import Path

from nexus_installer.engine import ollama_digest as od
from nexus_installer.engine.model_router import default_catalog_path, load_catalog_index

TAG = "hf.co/LiquidAI/LFM2.5-24B-A2B-GGUF:QAD-Q4_0"
PINNED = "d1c03f73ecaf61017d70419eec9e5dc0b05d50ae26c23d522829b934fbabf8a5"


def entry() -> dict:
    return load_catalog_index(default_catalog_path())["lfm2.5:24b-a2b"]


def write_manifest(models_dir: Path, digest: str) -> None:
    path = od.manifest_path(TAG, models_dir)
    path.parent.mkdir(parents=True)
    layer = {"mediaType": od.MODEL_LAYER, "digest": f"sha256:{digest}"}
    path.write_text(json.dumps({"layers": [layer]}), encoding="utf-8")


def test_admitted_entry_pins_its_gguf_digest() -> None:
    assert od.pinned_gguf_digest(entry()) == PINNED


def test_unpinned_and_unknown_entries_are_not_checked() -> None:
    library = {"source": {"protocol": "ollama", "url": "ollama://gemma4:12b"}}
    assert od.pinned_gguf_digest(library) is None
    assert od.pinned_gguf_digest(None) is None
    assert od.verify_pull(None, "anything", lambda _t: "x", lambda _t: None) is None


def test_hf_entry_without_a_commit_pin_is_not_checked() -> None:
    small = load_catalog_index(default_catalog_path())["lfm2.5:2.6b"]
    assert od.pinned_gguf_digest(small) is None


def test_manifest_digest_is_read_from_ollamas_layout(tmp_path: Path) -> None:
    write_manifest(tmp_path, PINNED)
    assert od.read_model_digest(TAG, tmp_path) == PINNED
    assert od.read_model_digest("hf.co/none/x:Q4", tmp_path) is None


def test_matching_pull_is_accepted() -> None:
    removed: list[str] = []
    assert od.verify_pull(entry(), TAG, lambda _t: PINNED, removed.append) is None
    assert removed == []


def test_tampered_pull_is_removed_and_fails_closed() -> None:
    removed: list[str] = []
    reason = od.verify_pull(entry(), TAG, lambda _t: "f" * 64, removed.append)
    assert reason is not None and "the model was removed" in reason
    assert removed == [TAG]


def test_unreadable_digest_fails_closed() -> None:
    removed: list[str] = []
    reason = od.verify_pull(entry(), TAG, lambda _t: None, removed.append)
    assert reason is not None and "no readable GGUF digest" in reason
    assert removed == [TAG]
