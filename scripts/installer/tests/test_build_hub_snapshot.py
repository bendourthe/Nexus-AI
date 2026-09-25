"""v2.4.9 -- the Hub snapshot staleness check must compare releases, not strings.

Every installer built on this host logged:

    ERROR: catalog tag 4.9.0 is not latest (v4.9.0).
    Refusing to embed a stale Hub snapshot.

Both halves name the SAME release. The synced catalog writes a bare semver into
`nexus-hub-version.json`; GitHub's `/releases/latest` returns `tag_name` with a
`v` prefix. A raw `!=` rejected an up-to-date catalog, so the shipped installer
carried no embedded snapshot and fell back to an install-time sync -- which is
exactly the offline-install hole the snapshot exists to close.

The pre-existing suite could not catch it: its fixture wrote `"v9.9.9"`, a
prefixed form the real producer never emits. These tests pin the bare form.
"""

from __future__ import annotations

import importlib.util
import json
from pathlib import Path

import pytest


def _load_builder():
    builder_path = (
        Path(__file__).resolve().parents[1] / "build" / "build-hub-snapshot.py"
    )
    spec = importlib.util.spec_from_file_location("build_hub_snapshot", builder_path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _catalog(tmp_path: Path, version: str) -> Path:
    catalog = tmp_path / "catalog"
    (catalog / "skills" / "demo").mkdir(parents=True)
    (catalog / "skills" / "demo" / "SKILL.md").write_text("---\nname: Demo\n---\n")
    (catalog / "commands").mkdir()
    (catalog / "commands" / "plan.md").write_text("body")
    (catalog / "nexus-hub-version.json").write_text(json.dumps({"version": version}))
    return catalog


class TestNormalizeTag:
    def test_strips_the_release_prefix_from_either_side(self) -> None:
        module = _load_builder()
        assert module.normalize_tag("v4.9.0") == "4.9.0"
        assert module.normalize_tag("4.9.0") == "4.9.0"
        assert module.normalize_tag("V4.9.0") == "4.9.0"
        assert module.normalize_tag("  v4.9.0  ") == "4.9.0"

    def test_treats_missing_as_empty_rather_than_crashing(self) -> None:
        module = _load_builder()
        assert module.normalize_tag(None) == ""
        assert module.normalize_tag("") == ""

    def test_does_not_strip_a_v_that_belongs_to_the_version(self) -> None:
        # Only a LEADING v is a prefix; "4.9.0v" is not a tag this repo emits,
        # but the function must not silently rewrite the middle of a string.
        module = _load_builder()
        assert module.normalize_tag("4.9.0-vetted") == "4.9.0-vetted"


class TestSnapshotStaleness:
    def test_bare_catalog_semver_matches_a_prefixed_release_tag(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """The exact operator case: catalog 4.9.0, GitHub v4.9.0, not stale."""
        monkeypatch.setenv("NEXUS_HUB_LATEST_TAG", "v4.9.0")
        module = _load_builder()
        out = tmp_path / "out"
        assert module.build_snapshot(_catalog(tmp_path, "4.9.0"), out) == 0
        assert (out / "catalog.tar.gz").is_file()
        manifest = json.loads((out / "manifest.json").read_text(encoding="utf-8"))
        assert len(manifest["sha256"]) == 64
        assert manifest["sha256"] != "0" * 64

    def test_prefixed_catalog_tag_matches_a_bare_release_tag(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """Symmetry: normalizing one side only would leave the mirror broken."""
        monkeypatch.setenv("NEXUS_HUB_LATEST_TAG", "4.9.0")
        module = _load_builder()
        out = tmp_path / "out"
        assert module.build_snapshot(_catalog(tmp_path, "v4.9.0"), out) == 0
        assert (out / "catalog.tar.gz").is_file()

    def test_a_genuinely_older_catalog_is_still_refused(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """The guard must keep its teeth: this is the v3.12.0 frozen-pack class."""
        monkeypatch.setenv("NEXUS_HUB_LATEST_TAG", "v4.9.0")
        module = _load_builder()
        out = tmp_path / "out"
        assert module.build_snapshot(_catalog(tmp_path, "3.12.0"), out) == 1
        assert not (out / "catalog.tar.gz").exists()

    def test_a_catalog_with_no_version_is_refused(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        # Normalizing None to "" must not accidentally equal a real tag.
        monkeypatch.setenv("NEXUS_HUB_LATEST_TAG", "v4.9.0")
        module = _load_builder()
        catalog = _catalog(tmp_path, "4.9.0")
        (catalog / "nexus-hub-version.json").write_text(json.dumps({}))
        assert module.build_snapshot(catalog, tmp_path / "out") == 1
