"""v1.15.0 Phase 3 (Issue 2) -- model-catalog content invariants.

Guards against a *stale* catalog shipping (the v1.13/v1.14 install-reliability
regression): the real repo catalog must pass, and the validator must catch the
two specific defects -- a broken Gemma Ollama reference and an unflagged
access-gated model.
"""

from __future__ import annotations

import json
from typing import Any

from nexus_installer.catalog_invariants import (
    POST_2025_OLLAMA_TARGETS,
    validate_catalog,
)
from nexus_installer.registry_paths import default_catalog_path

_LFM_PIN = "79fdf00351b46cf26f020aead28d01889886be87c55fa0eb907e6f9b00bfee14"
_LFM_NOTE = "USD 10M cap. This is a use restriction, not a download gate."
_LFM_URL = "ollama://hf.co/LiquidAI/LFM2.5-2.6B-GGUF:Q4_K_M"


def _lfm_entry(**overrides: Any) -> dict[str, Any]:
    entry: dict[str, Any] = {
        "id": "lfm2.5:2.6b",
        "task": "agentic",
        "agentic": True,
        "license": "LFM Open License v1.0",
        "licenseUrl": "https://www.liquid.ai/lfm-license",
        "licenseNote": _LFM_NOTE,
        "requiresLicense": False,
        "source": {"protocol": "ollama", "url": _LFM_URL},
        "weights": {"files": [{"path": "x.gguf", "sha256": _LFM_PIN}]},
    }
    entry.update(overrides)
    return entry


def _load_repo_catalog() -> dict[str, Any]:
    return json.loads(default_catalog_path().read_text(encoding="utf-8"))


class TestRepoCatalog:
    def test_repo_catalog_passes_invariants(self) -> None:
        problems = validate_catalog(_load_repo_catalog())
        assert problems == [], f"catalog.json violates invariants: {problems}"

    def test_current_gemma_entry_is_the_ollama_library_build(self) -> None:
        # Direct regression check for the reported HTTP-400 failure.
        catalog = _load_repo_catalog()
        gemma = next(
            m for m in catalog["models"] if m.get("id") == "gemma-4-12b-it-gguf"
        )
        assert gemma["source"]["url"] == "ollama://gemma4:12b"
        assert gemma.get("minOllamaVersion") == "0.32.15"

    def test_sana_int4_uses_public_pinned_nunchaku_source(self) -> None:
        # Direct regression check for the reported 404/auth loop.
        catalog = _load_repo_catalog()
        sana = next(
            (m for m in catalog["models"] if m.get("id") == "sana-1.6b-int4"), None
        )
        if sana is not None:
            assert sana.get("gated") is not True
            assert sana["source"]["repo"] == "nunchaku-ai/nunchaku-sana"
            assert len(sana["source"]["revision"]) == 40
            assert sana["weights"]["files"][0]["sha256"] != "0" * 64

    def test_post_2025_ollama_targets_are_present(self) -> None:
        catalog = _load_repo_catalog()
        by_id = {m.get("id"): m for m in catalog["models"] if isinstance(m, dict)}
        for model_id, expected_url in POST_2025_OLLAMA_TARGETS.items():
            entry = by_id.get(model_id)
            assert entry is not None, f"{model_id} missing from catalog.json"
            assert entry.get("source", {}).get("url") == expected_url
        assert "qwen2.5-coder:7b" not in by_id
        assert "qwen2.5-coder:14b" not in by_id
        assert "deepseek-coder-v2:16b" not in by_id


class TestLfmLowVramAgentic:
    def test_repo_catalog_includes_lfm_entry(self) -> None:
        catalog = _load_repo_catalog()
        lfm = next((m for m in catalog["models"] if m.get("id") == "lfm2.5:2.6b"), None)
        assert lfm is not None
        assert validate_catalog(catalog) == []

    def test_missing_use_restriction_is_flagged(self) -> None:
        entry = _lfm_entry(whyRecommended="fits CPU hosts")
        del entry["licenseNote"]
        problems = validate_catalog({"models": [entry]})
        assert any("licenseNote" in p for p in problems)

    def test_vendor_benchmark_in_copy_is_flagged(self) -> None:
        entry = _lfm_entry(whyRecommended="ToolSandbox 77.83")
        problems = validate_catalog({"models": [entry]})
        assert any("ToolSandbox" in p for p in problems)

    def test_requires_license_true_is_flagged(self) -> None:
        entry = _lfm_entry(
            requiresLicense=True,
            gated=True,
            gatedReason="should not fire",
        )
        problems = validate_catalog({"models": [entry]})
        assert any("requiresLicense" in p for p in problems)
        assert any("gated" in p for p in problems)

    def test_placeholder_pin_is_flagged(self) -> None:
        entry = _lfm_entry(weights={"files": [{"path": "x.gguf", "sha256": "0" * 64}]})
        problems = validate_catalog({"models": [entry]})
        assert any("placeholder" in p or "SHA-256" in p for p in problems)

    def test_wrong_task_license_or_source_is_flagged(self) -> None:
        task = _lfm_entry(task="chat")
        assert any("task" in p for p in validate_catalog({"models": [task]}))
        no_agentic = _lfm_entry(agentic=False)
        assert any("agentic" in p for p in validate_catalog({"models": [no_agentic]}))
        license_ = _lfm_entry(license="MIT")
        assert any("license" in p for p in validate_catalog({"models": [license_]}))
        url = _lfm_entry(licenseUrl="http://example.invalid")
        assert any("licenseUrl" in p for p in validate_catalog({"models": [url]}))
        source = _lfm_entry(
            source={"protocol": "ollama", "url": "ollama://lfm2.5:2.6b"}
        )
        assert any("official" in p for p in validate_catalog({"models": [source]}))

    def test_phase3_decline_keeps_8b_a1b_out_of_the_repo_catalog(self) -> None:
        catalog = _load_repo_catalog()
        ids = [str(m.get("id")) for m in catalog["models"] if isinstance(m, dict)]
        assert "lfm2.5:8b-a1b" not in ids
        assert not any("8b-a1b" in i.lower() for i in ids)


class TestMuseAndLightning:
    def test_repo_catalog_includes_muse_and_lightning(self) -> None:
        catalog = _load_repo_catalog()
        ids = {str(m.get("id")) for m in catalog["models"] if isinstance(m, dict)}
        assert "muse-glimmer:30b" in ids
        assert "muse-glimmer:30b-dynamic" in ids
        assert "nemotron-lightning:30b-a3b" in ids
        assert "nemotron-lightning:30b-a3b-offload" in ids
        assert "sam2:hiera-tiny" in ids
        lightning = next(
            m for m in catalog["models"] if m.get("id") == "nemotron-lightning:30b-a3b"
        )
        assert lightning["source"]["url"] == "ollama://nemotron-3.5-lightning:30b"
        assert validate_catalog(catalog) == []

    def test_muse_vendor_score_in_copy_is_flagged(self) -> None:
        entry = {
            "id": "muse-glimmer:30b",
            "family": "muse-glimmer",
            "agentic": True,
            "license": "Apache-2.0",
            "minOllamaVersion": "0.32.7",
            "hideBelowVramGB": 16,
            "requiredVramGB": 24,
            "source": {
                "protocol": "ollama",
                "url": "ollama://hf.co/meta-models/Muse-Glimmer-30B-GGUF:K-Quant-17GB",
            },
            "vendorReported": {"suite": "SWE-Bench Verified", "vendorReported": True},
            "localEval": {"status": "not_run"},
            "whyRecommended": "SWE-Bench 76.0",
        }
        problems = validate_catalog({"models": [entry]})
        assert any("76.0" in p or "SWE-Bench" in p for p in problems)

    def test_lightning_missing_role_is_flagged(self) -> None:
        entry = {
            "id": "nemotron-lightning:30b-a3b",
            "family": "nemotron-lightning",
            "agentic": True,
            "license": "OpenMDW-1.1",
            "minOllamaVersion": "0.32.9",
            "hideBelowVramGB": 16,
            "requiredVramGB": 24,
            "source": {
                "protocol": "ollama",
                "url": "ollama://nemotron-3.5-lightning:30b",
            },
            "localEval": {"status": "not_run"},
        }
        problems = validate_catalog({"models": [entry]})
        assert any("worker-candidate" in p for p in problems)


class TestValidateCatalog:
    def test_empty_models_is_flagged(self) -> None:
        assert validate_catalog({"models": []})
        assert validate_catalog({})

    def test_broken_gemma_ollama_ref_is_flagged(self) -> None:
        catalog = {
            "models": [
                {
                    "id": "gemma-4-12b-it-gguf",
                    "source": {
                        "protocol": "ollama",
                        "url": "ollama://hf.co/unsloth/gemma-4-12b-it-GGUF",
                    },
                }
            ]
        }
        assert any("known-broken" in p for p in validate_catalog(catalog))

    def test_current_gemma_ollama_ref_passes(self) -> None:
        catalog = {
            "models": [
                {
                    "id": "gemma-4-12b-it-gguf",
                    "minOllamaVersion": "0.32.15",
                    "source": {"protocol": "ollama", "url": "ollama://gemma4:12b"},
                }
            ]
        }
        assert validate_catalog(catalog) == []

    def test_requires_license_without_gated_is_flagged(self) -> None:
        catalog = {
            "models": [
                {
                    "id": "x",
                    "source": {"protocol": "huggingface", "repo": "r"},
                    "requiresLicense": True,
                    "gatedReason": "why",
                }
            ]
        }
        assert any("requiresLicense" in p for p in validate_catalog(catalog))

    def test_gated_without_reason_or_url_is_flagged(self) -> None:
        catalog = {
            "models": [
                {
                    "id": "x",
                    "source": {"protocol": "huggingface", "repo": "r"},
                    "gated": True,
                }
            ]
        }
        assert any("gatedReason" in p for p in validate_catalog(catalog))

    def test_sana_public_source_is_not_a_known_gated_id(self) -> None:
        catalog = {
            "models": [
                {
                    "id": "sana-1.6b-int4",
                    "source": {
                        "protocol": "huggingface",
                        "repo": "nunchaku-ai/nunchaku-sana",
                    },
                }
            ]
        }
        assert not any("known access-gated" in p for p in validate_catalog(catalog))

    def test_missing_source_protocol_is_flagged(self) -> None:
        catalog = {"models": [{"id": "x"}]}
        assert any("source.protocol" in p for p in validate_catalog(catalog))

    def test_pre_2025_opt_in_is_flagged(self) -> None:
        catalog = {
            "models": [
                {
                    "id": "llama3.1:8b",
                    "task": "chat",
                    "releaseDate": "2024-07-23",
                    "source": {"protocol": "ollama", "url": "ollama://llama3.1:8b"},
                }
            ]
        }
        assert any("pre-2025" in p for p in validate_catalog(catalog))

    def test_pre_2025_keep_list_is_allowed(self) -> None:
        catalog = {
            "models": [
                {
                    "id": "nomic-embed-text",
                    "task": "embed",
                    "releaseDate": "2024-02-14",
                    "source": {
                        "protocol": "ollama",
                        "url": "ollama://nomic-embed-text",
                    },
                }
            ]
        }
        problems = validate_catalog(catalog)
        assert not any("pre-2025" in p for p in problems)

    def test_gemma12_missing_min_ollama_is_flagged(self) -> None:
        catalog = {
            "models": [
                {
                    "id": "gemma-4-12b-it-gguf",
                    "source": {"protocol": "ollama", "url": "ollama://gemma4:12b"},
                }
            ]
        }
        assert any("minOllamaVersion" in p for p in validate_catalog(catalog))

    def test_post_2025_wrong_url_is_flagged(self) -> None:
        catalog = {
            "models": [
                {
                    "id": "gpt-oss:20b",
                    "source": {"protocol": "ollama", "url": "ollama://gpt-oss:wrong"},
                }
            ]
        }
        assert any("gpt-oss:20b" in p for p in validate_catalog(catalog))

    def test_qwen35_sizes_must_ship_together(self) -> None:
        catalog = {
            "models": [
                {
                    "id": "qwen3.5:9b",
                    "source": {"protocol": "ollama", "url": "ollama://qwen3.5:9b"},
                }
            ]
        }
        assert any("qwen3.5" in p for p in validate_catalog(catalog))


class TestRequiredEmbedderPolicy:
    def test_decision_file_records_embeddinggemma_supersession(self) -> None:
        from nexus_installer.catalog_invariants import REQUIRED_EMBEDDER_ID

        repo = default_catalog_path().resolve().parents[2]
        decision = (
            repo
            / "docs"
            / "v2"
            / "v2.3"
            / "development"
            / "embedder-default-decision.md"
        )
        text = decision.read_text(encoding="utf-8")
        assert "Superseded" in text
        assert "**SWITCH**" in text
        assert REQUIRED_EMBEDDER_ID in text
        assert "300M" in text
        assert "reindex" in text.lower()

    def test_repo_catalog_embeddinggemma_is_300m_not_300b(self) -> None:
        catalog = _load_repo_catalog()
        gemma = next(m for m in catalog["models"] if m.get("id") == "embeddinggemma")
        assert gemma["displayName"] == "EmbeddingGemma 300M"
        assert gemma["tag"] == "300m"
        copy = " ".join(
            [
                gemma["displayName"],
                gemma["description"],
                gemma["whyRecommended"],
                gemma["differentiators"],
            ]
        )
        assert "300M" in copy or "300 million" in copy.lower()
        assert "300b" not in copy.lower()
        assert "required default" in gemma["description"].lower()

    def test_recommended_embed_defaults_are_embeddinggemma_only(self) -> None:
        from nexus_installer.catalog_invariants import REQUIRED_EMBEDDER_ID
        from nexus_installer.registry_paths import default_recommended_path

        matrix = json.loads(default_recommended_path().read_text(encoding="utf-8"))
        for tier, sections in matrix["tiers"].items():
            assert sections["embed"] == [REQUIRED_EMBEDDER_ID], tier

    def test_settings_default_embedding_model_is_embeddinggemma(self) -> None:
        from nexus_installer.catalog_invariants import REQUIRED_EMBEDDER_ID

        repo = default_catalog_path().resolve().parents[2]
        manifest = json.loads((repo / "package.json").read_text(encoding="utf-8"))
        default = manifest["contributes"]["configuration"]["properties"][
            "nexus.memory.embeddingModel"
        ]["default"]
        assert default == REQUIRED_EMBEDDER_ID

    def test_embeddinggemma_300b_copy_is_flagged(self) -> None:
        catalog = {
            "models": [
                {
                    "id": "embeddinggemma",
                    "displayName": "EmbeddingGemma 300B",
                    "description": "GemmaEmbedding 300B",
                    "source": {
                        "protocol": "ollama",
                        "url": "ollama://embeddinggemma:300m",
                    },
                }
            ]
        }
        problems = validate_catalog(catalog)
        assert any("300B" in p for p in problems)

    def test_required_embeddinggemma_wrong_task_is_flagged(self) -> None:
        catalog = {
            "models": [
                {
                    "id": "embeddinggemma",
                    "displayName": "EmbeddingGemma 300M",
                    "task": "chat",
                    "source": {
                        "protocol": "ollama",
                        "url": "ollama://embeddinggemma:300m",
                    },
                }
            ]
        }
        problems = validate_catalog(catalog)
        assert any("task must be embed" in p for p in problems)


# ---------------------------------------------------------------------------
# v2.4.10 Phase 3 (T015) -- the two hoisted catalog-wide rules, and the
# minicpm5:2b per-id contract.
#
# The hoist tests deliberately use an entry id with NO bespoke check function.
# That is the whole point of the hoist: before it, PLACEHOLDER_SHA256 was tested
# in exactly one place (inside _check_lfm_entry) and the no-vendor-benchmark
# convention only through per-id token tuples, so an entry nobody had written a
# block for was protected by neither.
# ---------------------------------------------------------------------------

_MINICPM5_PIN = "ec2d5801640099e97d8d7e8003ad4d81f336e757811f03a26173dddf386602fd"
_MINICPM5_URL = "ollama://hf.co/openbmb/MiniCPM5-2B-GGUF:Q4_K_M"


def _plain_entry(**overrides: Any) -> dict[str, Any]:
    """An entry with no bespoke check function anywhere in catalog_invariants."""
    entry: dict[str, Any] = {
        "id": "unrelated-model:1b",
        "task": "chat",
        "description": "A plain entry used to prove the catalog-wide rules apply.",
        "source": {"protocol": "ollama", "url": "ollama://unrelated-model:1b"},
    }
    entry.update(overrides)
    return entry


def _minicpm5_entry(**overrides: Any) -> dict[str, Any]:
    entry: dict[str, Any] = {
        "id": "minicpm5:2b",
        "task": "chat",
        "agentic": False,
        "description": "A small Apache-2.0 chat model.",
        "license": "Apache-2.0",
        "licenseUrl": "https://www.apache.org/licenses/LICENSE-2.0",
        "requiresLicense": False,
        "tags": [],
        "toolCallingVerified": False,
        "source": {"protocol": "ollama", "url": _MINICPM5_URL},
        "weights": {
            "files": [{"path": "MiniCPM5-2B-Q4_K_M.gguf", "sha256": _MINICPM5_PIN}]
        },
    }
    entry.update(overrides)
    return entry


def _problems(entry: dict[str, Any]) -> list[str]:
    return validate_catalog({"models": [entry]})


def test_hoisted_placeholder_sha_fails_on_entry_with_no_bespoke_block() -> None:
    entry = _plain_entry(
        weights={"files": [{"path": "w.safetensors", "sha256": "0" * 64}]}
    )
    problems = _problems(entry)
    assert any("placeholder SHA-256" in p for p in problems), problems


def test_hoisted_placeholder_sha_fails_on_empty_pin() -> None:
    entry = _plain_entry(weights={"files": [{"path": "w.safetensors", "sha256": ""}]})
    assert any("placeholder SHA-256" in p for p in _problems(entry))


def test_hoisted_placeholder_sha_accepts_a_real_pin() -> None:
    entry = _plain_entry(
        weights={"files": [{"path": "w.gguf", "sha256": _MINICPM5_PIN}]}
    )
    assert not any("placeholder SHA-256" in p for p in _problems(entry))


def test_hoisted_placeholder_sha_ignores_entries_with_no_weights() -> None:
    # Plenty of rows pull through Ollama and carry no per-file manifest. Demanding
    # one here would be a different rule than the one being hoisted.
    assert not any("placeholder SHA-256" in p for p in _problems(_plain_entry()))


def test_legacy_sana_ids_stay_exempt_from_the_placeholder_rule() -> None:
    # Efficient-Large-Model/SANA-ControlNet-* returns HTTP 401 unauthenticated, so
    # pin-hf-weights.py cannot rotate these. Tracked as BG-2 rather than softening
    # the rule for everyone.
    entry = _plain_entry(
        id="sana-controlnet-canny",
        weights={"files": [{"path": "m.safetensors", "sha256": "0" * 64}]},
    )
    assert not any("placeholder SHA-256" in p for p in _problems(entry))


def test_hoisted_forbidden_copy_fails_on_entry_with_no_bespoke_block() -> None:
    entry = _plain_entry(
        description="Scores 82.1 on SWE-bench Verified and leads MMLU-Pro."
    )
    problems = _problems(entry)
    assert any("vendor benchmark suite" in p for p in problems), problems


def test_hoisted_forbidden_copy_checks_strengths_and_license_note() -> None:
    entry = _plain_entry(
        strengths=["Top HumanEval pass@1 in its size class"],
        licenseNote="Permissive licence. Leads GPQA among small models.",
    )
    problems = _problems(entry)
    assert any("HumanEval" in p for p in problems), problems
    assert any("GPQA" in p for p in problems), problems


def test_hoisted_forbidden_copy_allows_an_explicit_disclaimer() -> None:
    # qwen3-coder:30b ships exactly this shape. Naming a suite in order to say Nexus
    # does not quote it is the convention working, not breaking.
    entry = _plain_entry(
        description=(
            "A 30B coding specialist. Vendor SWE-bench numbers are not copied here."
        )
    )
    assert not any("vendor benchmark suite" in p for p in _problems(entry))


def test_hoisted_forbidden_copy_still_fails_when_only_one_mention_is_disclaimed() -> (
    None
):
    entry = _plain_entry(
        description=(
            "Vendor SWE-bench numbers are not copied here. It still scores 82.1 on "
            "SWE-bench Verified."
        )
    )
    assert any("vendor benchmark suite" in p for p in _problems(entry))


def test_tool_calling_verified_requires_a_benchmark_record() -> None:
    entry = _plain_entry(toolCallingVerified=True, provenance="Official GGUF.")
    problems = _problems(entry)
    assert any("toolCallingBenchmark" in p for p in problems), problems


def test_tool_calling_benchmark_must_carry_suite_date_and_result() -> None:
    entry = _plain_entry(
        toolCallingVerified=True,
        toolCallingBenchmark={"suite": "local", "date": ""},
    )
    problems = _problems(entry)
    assert any("missing" in p and "date" in p and "result" in p for p in problems), (
        problems
    )


def test_tool_calling_verified_with_a_complete_benchmark_passes() -> None:
    entry = _plain_entry(
        toolCallingVerified=True,
        toolCallingBenchmark={
            "suite": "nexus-harness-local",
            "date": "2026-09-11",
            "result": "pass: emitted a parseable span",
        },
    )
    assert not any("toolCallingBenchmark" in p for p in _problems(entry))


def test_minicpm5_valid_entry_passes() -> None:
    assert _problems(_minicpm5_entry()) == []


def test_minicpm5_wrong_license_label_fails() -> None:
    problems = _problems(_minicpm5_entry(license="MIT"))
    assert any("license must be 'Apache-2.0'" in p for p in problems), problems


def test_minicpm5_non_first_party_target_fails() -> None:
    entry = _minicpm5_entry(
        source={
            "protocol": "ollama",
            "url": "ollama://hf.co/someone-else/MiniCPM5-2B-GGUF:Q4_K_M",
        }
    )
    problems = _problems(entry)
    assert any("first-party" in p for p in problems), problems


def test_minicpm5_cannot_claim_agentic_capability() -> None:
    # The Phase 2 negative result is product behaviour, not a note: all five parsers
    # returned zero calls on nine transcripts because Ollama strips the delimiters.
    problems = _problems(_minicpm5_entry(task="agentic", agentic=True))
    assert any("task must be 'chat'" in p for p in problems), problems
    assert any("agentic must be false" in p for p in problems), problems


def test_minicpm5_cannot_claim_verified_tool_calling() -> None:
    problems = _problems(_minicpm5_entry(toolCallingVerified=True))
    assert any("toolCallingVerified must be false" in p for p in problems), problems


def test_minicpm5_cannot_be_promoted_to_recommended() -> None:
    problems = _problems(_minicpm5_entry(tags=["recommended"]))
    assert any("must not be tagged 'recommended'" in p for p in problems), problems


def test_minicpm5_placeholder_pin_fails() -> None:
    entry = _minicpm5_entry(
        weights={"files": [{"path": "MiniCPM5-2B-Q4_K_M.gguf", "sha256": "0" * 64}]}
    )
    assert any("placeholder SHA-256" in p for p in _problems(entry))


def test_minicpm5_vendor_benchmark_copy_fails() -> None:
    problems = _problems(
        _minicpm5_entry(description="Leads MMLU-Redux and LongBenchPro for its size.")
    )
    assert any("MMLU-Redux" in p for p in problems), problems


def test_minicpm5_contract_is_present_or_valid() -> None:
    # A synthetic catalog without the id must be unchanged by this block.
    assert not any("minicpm5" in p for p in _problems(_plain_entry()))
