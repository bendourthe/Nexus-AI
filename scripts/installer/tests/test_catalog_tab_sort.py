"""v2.2.8 Phase 4 / v2.2.9 Phase 5 -- golden catalog sort dual-asserts.

The installer keeps pure ``collapse_and_sort`` order; Settings partitions
installed-and-ready (downloaded) rows first via ``downloaded_first``, each
partition keeping the installer order. Desktop ``visibleModelsOnTab`` asserts
the same fixtures in desktop/tests/catalogTabs.test.ts.
"""

from __future__ import annotations

import json
from pathlib import Path

from nexus_installer.catalog_tab_sort import (
    canonical_display_order,
    catalog_fingerprint,
    collapse_and_sort,
    downloaded_first,
    settings_display_order,
)

_FIXTURES = Path(__file__).resolve().parents[3] / "tests" / "fixtures"
FIXTURE_V228 = _FIXTURES / "v2.2.8-catalog-tab-sort.json"
FIXTURE_V229 = _FIXTURES / "v2.2.9-catalog-tab-sort.json"
FIXTURE_V241 = _FIXTURES / "v2.4.1-model-display-order.json"
DISPLAY_FIXTURE_V241 = (
    Path(__file__).resolve().parents[3]
    / "core"
    / "registry"
    / "model-display-order.fixture.json"
)

# v2.2.9 Phase 5 (T010): embed maps to the Embeddings tab, not Chat.
TASK_TAB = {
    "chat": "chat",
    "embed": "embeddings",
    "agentic": "agentic",
    "image": "image",
    "video": "video",
    "audio": "audio",
    "document": "document",
}

TYPE_TAB = {
    "llm": "chat",
    "embed": "embeddings",
    "image": "image",
    "video": "video",
    "audio": "audio",
    "document": "document",
}


def _tabs_for(row: dict) -> list[str]:
    primary = TASK_TAB.get(str(row.get("task") or "")) or TYPE_TAB.get(
        str(row.get("type") or "")
    )
    if primary is None:
        return ["other"]
    if row.get("agentic") and primary == "chat":
        return ["chat", "agentic"]
    return [primary]


def _opts(data: dict) -> dict:
    return dict(
        host_vram_gb=data["hostVramGB"],
        gpu_vendor=data["gpuVendor"],
        defaults=set(data["defaults"]),
        recommend_order=list(data["recommendOrder"]),
    )


def test_golden_v228_catalog_tab_sort_matches_fixture() -> None:
    data = json.loads(FIXTURE_V228.read_text(encoding="utf-8"))
    models = data["models"]
    opts = _opts(data)
    for tab, expected in data["expectedIds"].items():
        rows = [m for m in models if tab in _tabs_for(m)]
        assert collapse_and_sort(rows, **opts) == expected


def test_golden_v229_installer_order_has_no_downloaded_boost() -> None:
    data = json.loads(FIXTURE_V229.read_text(encoding="utf-8"))
    models = data["models"]
    opts = _opts(data)
    for tab, expected in data["expectedInstallerIds"].items():
        rows = [m for m in models if tab in _tabs_for(m)]
        assert collapse_and_sort(rows, **opts) == expected, tab


def test_golden_v229_settings_order_is_downloaded_first() -> None:
    data = json.loads(FIXTURE_V229.read_text(encoding="utf-8"))
    models = data["models"]
    opts = _opts(data)
    for tab, expected in data["expectedSettingsIds"].items():
        rows = [m for m in models if tab in _tabs_for(m)]
        assert downloaded_first(rows, **opts) == expected, tab


def test_v241_canonical_order_and_fingerprint() -> None:
    fixture = json.loads(FIXTURE_V241.read_text(encoding="utf-8"))
    assert (
        canonical_display_order(fixture["catalog"]["models"]) == fixture["expectedIds"]
    )
    assert catalog_fingerprint(fixture["catalog"]) == fixture["expectedFingerprint"]


def test_v241_incompatible_rows_sort_after_every_compatible_row() -> None:
    rows = [
        {
            "id": "new-required-over-budget",
            "displayName": "New Required",
            "task": "agentic",
            "tags": ["required"],
            "vramGB": 24,
            "releaseDate": "2026-08-01",
        },
        {
            "id": "older-compatible",
            "displayName": "Older Compatible",
            "task": "agentic",
            "tags": [],
            "vramGB": 8,
            "releaseDate": "2025-01-01",
        },
    ]
    assert canonical_display_order(rows, host_vram_gb=16) == [
        "older-compatible",
        "new-required-over-budget",
    ]


def test_gpt_oss_moves_up_within_the_downloaded_partition_once_installed() -> None:
    """Contract: downloaded gpt-oss ranks above LFM (installer rank wins)."""
    data = json.loads(FIXTURE_V229.read_text(encoding="utf-8"))
    models = [dict(m) for m in data["models"]]
    for row in models:
        if row["id"] == "gpt-oss:20b":
            row["installed"] = True
            row["source"] = "registry"
    opts = _opts(data)
    rows = [m for m in models if "agentic" in _tabs_for(m)]
    expected = data["expectedSettingsIdsAfterGptOssDownload"]["agentic"]
    assert downloaded_first(rows, **opts) == expected


def test_patient_tier_row_is_listed_on_both_orders() -> None:
    data = json.loads(FIXTURE_V229.read_text(encoding="utf-8"))
    for key in ("expectedInstallerIds", "expectedSettingsIds"):
        assert "inkling-small" in data[key]["agentic"]
        assert "inkling-small" in data[key]["chat"]


def test_v241_shared_recommendation_and_availability_contract() -> None:
    data = json.loads(DISPLAY_FIXTURE_V241.read_text(encoding="utf-8"))
    options = {
        "host_vram_gb": data["hostVramGB"],
        "gpu_vendor": data["gpuVendor"],
    }
    assert canonical_display_order(data["rows"], **options) == data["expectedInstaller"]
    assert settings_display_order(data["rows"], **options) == data["expectedSettings"]


# ---------------------------------------------------------------------------
# v2.4.10 Phase 3 (T017) -- un-promoted position of minicpm5:2b in the installer.
#
# These assertions route through ``_catalog_model_sort_row`` on purpose. Feeding
# catalog rows straight into ``canonical_display_order`` would simulate the
# DESKTOP and go green while the installer product differed, which is exactly the
# divergence this plan exists around: the installer discards a row's own ``tags``
# and rebuilds them from ``is_required`` plus membership in the recommended.json
# tier defaults, so a catalog tag alone changes nothing here.
#
# Fixture approach, stated as the plan requires: the real
# core/registry/catalog.json is loaded through ``load_catalog_models``, the same
# loader the wizard uses, rather than extending
# core/registry/model-display-order.fixture.json. The assertions then track the
# shipped entry instead of a copy of it.
#
# Positions are asserted RELATIVE to named neighbours, never as a full id
# sequence, which would break on every future catalog entry.
# ---------------------------------------------------------------------------

from nexus_installer.pages.typed_catalog import (  # noqa: E402
    _catalog_model_sort_row,
    load_catalog_models,
)

_REAL_CATALOG = (
    Path(__file__).resolve().parents[3] / "core" / "registry" / "catalog.json"
)

_MINICPM5 = "minicpm5:2b"
_LFM = "lfm2.5:2.6b"

_RECOMMENDED_JSON = (
    Path(__file__).resolve().parents[3] / "core" / "registry" / "recommended.json"
)


def _tier_defaults(tier: str = "8") -> set[str]:
    """The real tier defaults, so the installer's tier INPUT is the shipped one.

    Phase 4 was skipped, so ``minicpm5:2b`` appears in no tier and the assertions
    below measure the un-promoted state against real data rather than a stub.
    """
    tiers = json.loads(_RECOMMENDED_JSON.read_text(encoding="utf-8"))["tiers"]
    return {model_id for ids in tiers[tier].values() for model_id in ids}


_AGENTIC_DEFAULTS = _tier_defaults("8")


def _sorted_ids(tab: str, *, host_vram_gb: int = 16) -> list[str]:
    models = load_catalog_models(_REAL_CATALOG)
    rows = []
    for model in models:
        row = _catalog_model_sort_row(model, defaults=_AGENTIC_DEFAULTS) | {
            "task": model.task,
            "type": model.type,
            "agentic": model.agentic,
        }
        # Tab membership via _tabs_for, never by filtering task == "agentic":
        # chat rows carrying agentic: true also land on the Agentic tab.
        if tab in _tabs_for(row):
            rows.append(row)
    return collapse_and_sort(
        rows,
        host_vram_gb=host_vram_gb,
        gpu_vendor="nvidia",
        defaults=_AGENTIC_DEFAULTS,
        recommend_order=[],
    )


def test_minicpm5_is_present_in_the_real_catalog() -> None:
    ids = [m.id for m in load_catalog_models(_REAL_CATALOG)]
    assert _MINICPM5 in ids


def test_minicpm5_sits_on_the_chat_tab_not_the_agentic_tab() -> None:
    assert _MINICPM5 in _sorted_ids("chat")
    # The Phase 2 decision as a product assertion: shipping this task: agentic would
    # have placed it FIRST among untagged Agentic rows, since its release date is the
    # newest in the catalog, making the most prominent unticked agentic option the one
    # proven not to call tools through this runtime.
    assert _MINICPM5 not in _sorted_ids("agentic")


def test_lfm_still_leads_the_installer_agentic_tab() -> None:
    # Phase 4 was skipped, so the incumbent keeps both the pill and the pre-tick.
    assert _sorted_ids("agentic")[0] == _LFM


def test_minicpm5_follows_every_recommended_row_on_the_chat_tab() -> None:
    models = {m.id: m for m in load_catalog_models(_REAL_CATALOG)}
    ids = _sorted_ids("chat")
    assert ids, "chat tab produced no rows; the assertion below would be vacuous"
    mine = ids.index(_MINICPM5)
    tagged_after = [
        model_id
        for model_id in ids[mine + 1 :]
        if _catalog_model_sort_row(models[model_id], defaults=_AGENTIC_DEFAULTS)["tags"]
    ]
    assert not tagged_after, (
        f"{_MINICPM5} is untagged, so every required/recommended row must sort ahead "
        f"of it; these sort after it instead: {tagged_after}"
    )


def test_minicpm5_precedes_every_older_dated_untagged_chat_row() -> None:
    models = {m.id: m for m in load_catalog_models(_REAL_CATALOG)}
    ids = _sorted_ids("chat")
    mine = ids.index(_MINICPM5)
    my_date = models[_MINICPM5].release_date
    # Expressed as a function of the Phase 1 confirmed date rather than as "first":
    # every untagged row sorting BEFORE it must be at least as new.
    for model_id in ids[:mine]:
        model = models[model_id]
        row = _catalog_model_sort_row(model, defaults=_AGENTIC_DEFAULTS)
        if row["tags"]:
            continue
        assert str(model.release_date) >= str(my_date), (
            f"{model_id} ({model.release_date}) sorts before {_MINICPM5} "
            f"({my_date}) despite being older and untagged"
        )


def test_installer_gives_minicpm5_no_recommended_tag() -> None:
    # The divergence this plan documents: the installer rebuilds tags from
    # is_required + tier defaults and ignores the catalog row's own tags. Since
    # Phase 4 was skipped, minicpm5:2b is in no tier default and stays untagged here.
    model = next(m for m in load_catalog_models(_REAL_CATALOG) if m.id == _MINICPM5)
    row = _catalog_model_sort_row(model, defaults=_AGENTIC_DEFAULTS)
    assert row["tags"] == []


def test_installer_tags_are_not_read_from_the_catalog_row() -> None:
    # Proves the divergence is still real rather than assumed, so a future reader
    # knows why Phase 4 had to change recommended.json as well as catalog.json.
    model = next(m for m in load_catalog_models(_REAL_CATALOG) if m.id == _LFM)
    promoted = _catalog_model_sort_row(model, defaults={_LFM})
    demoted = _catalog_model_sort_row(model, defaults=set())
    assert promoted["tags"] == ["recommended"]
    # Same catalog row, which ships tags: ["recommended"], yet the installer emits
    # nothing once the id leaves the tier defaults.
    assert demoted["tags"] == []
