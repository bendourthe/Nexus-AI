"""v2.14.0 -- voice runtime provisioning regressions.

Desktop voice could not run on an installed host: the catalog fetched one file
per voice model, a voice-only selection never built the shared venv, and the
venv carried no voice packages. These tests read the real catalog and lock.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from nexus_installer.engine import runtime_provisioner as rp
from nexus_installer.engine.hf_weights_puller import load_weights_manifest
from nexus_installer.engine.model_router import default_catalog_path, load_catalog_index
from nexus_installer.installer_state import InstallerState

REPO_ROOT = Path(__file__).resolve().parents[3]

# Files the offline engines open: KModel(config, model) plus the voice tensor,
# and WhisperModel(dir, local_files_only=True).
REQUIRED_FILES = {
    "kokoro-82m": {"config.json", "kokoro-v1_0.pth", "voices/af_heart.pt"},
    "faster-whisper-large-v3": {
        "config.json",
        "model.bin",
        "preprocessor_config.json",
        "tokenizer.json",
        "vocabulary.json",
    },
}


@pytest.mark.parametrize(
    ("selected", "expected"),
    [
        (["kokoro-82m"], True),
        (["faster-whisper-large-v3"], True),
        (["gemma4:12b"], False),
    ],
)
def test_voice_only_selection_provisions_the_shared_venv(
    selected: list[str], expected: bool
) -> None:
    state = InstallerState(selected_model_ids=selected)
    assert rp.RuntimeProvisioner._selection_requires_diffusion(state) is expected


@pytest.mark.parametrize("model_id", sorted(REQUIRED_FILES))
def test_voice_weights_manifest_lists_every_offline_file(model_id: str) -> None:
    entry = load_catalog_index(default_catalog_path())[model_id]
    manifest = load_weights_manifest(entry)
    paths = {f.path for f in manifest.files}
    assert REQUIRED_FILES[model_id] <= paths
    assert manifest.is_pinned, "voice weights must resolve at a pinned commit"
    assert all(f.sha256 != "0" * 64 for f in manifest.files)


@pytest.mark.parametrize(
    "lock",
    [
        "scripts/installer/build/versions.lock.json",
        "runtimes/diffusion/runtime-lock.json",
    ],
)
def test_runtime_lock_installs_voice_packages_offline_ready(lock: str) -> None:
    data = json.loads((REPO_ROOT / lock).read_text(encoding="utf-8"))
    reqs = (data.get("diffusion") or data)["runtimeRequirements"]
    assert "kokoro==0.9.4" in reqs
    assert "faster-whisper==1.2.1" in reqs
    # faster-whisper 1.2.1 passes av.open(metadata_errors=...), which PyAV 19 removed.
    assert "av==18.1.0" in reqs
    spacy_model = [r for r in reqs if r.startswith("en_core_web_sm @ ")]
    assert len(spacy_model) == 1 and "#sha256=" in spacy_model[0]
