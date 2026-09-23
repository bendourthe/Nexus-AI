# Unsloth Qwen3.8-Flash-Next Catalog Non-Admission Delta

**Release**: v2.4.0
**Decision date**: 2026-09-22
**Status**: Not admitted. Unsloth GGUF and thinking-control docs do not flip the v2.3.0 rejection.
**Support tier**: Candidate only. Not proven here as a catalog, installer, or Settings model.
**This record is a delta**, not a replacement, of [the v2.3.0 admission record](../../v2.3/development/model-admission-qwen38.md).
**Seed comparison**: [Unsloth Qwen3.8-Flash-Next GGUF and 3D AI Studio Gaussian Splatting](../comparisons/v2.4.0-comparison-unsloth-qwen38-gaussian-splatting.md)

## Decision

v2.4.0 adds no `core/registry/catalog.json` row, installer model, desktop Settings entry, recommended-tier default, or `patient-tier` entry for Qwen3.8-Flash-Next, including the Unsloth Dynamic GGUF. v2.4.0 does not ship Unsloth Desktop.

This is a product and evidence decision. It is not a legal conclusion about Qwen Community License 1.0.

## What Unsloth changed, and what it did not

The comparison records these vendor facts for `unsloth/Qwen3.8-Flash-Next-GGUF`:

| Fact | Recorded value |
| --- | --- |
| Identity | Third-party Dynamic 3.0 GGUF of official `Qwen/Qwen3.8-Flash-Next` |
| Architecture | `qwen4exp` |
| Smallest disk artifact | UD-IQ1_S 72.5 GB (3 shards). UD-IQ1_M 74.5 GB. UD-Q4_K_XL 111.3 GB. BF16 354 GB |
| Vendor RAM table | 1-bit 75 GB minimum, 96 GB recommended. The table continues through BF16 at about 355 GB of RAM plus VRAM, or unified memory |
| Thinking controls | `enable_thinking`, `preserve_thinking`, and `reasoning_effort` in {`xhigh` (default), `medium`, `low`} |
| Vision | Card is `image-text-to-text`. `mmproj-F16.gguf` and `mmproj-BF16.gguf` are published. Nexus has not verified GGUF vision for this architecture |
| License metadata | `license_name: qwen-community-1.0`, `license_link: LICENSE`. The published file list has no `LICENSE` file. A raw `LICENSE` fetch returned 404 |

The smallest disk file is smaller than the official listings in the v2.3.0 record. The runtime floor is not. Unsloth's own table still requires 75 GB of RAM or unified memory. That is a workstation contract, not the laptop GPU envelope, and it is not the same claim as Inkling-Small's measured offload RSS.

## Six gates, re-evaluated for the Unsloth artifact

Each gate is fail or unproven. None pass.

| Gate | Unsloth-artifact result |
| --- | --- |
| 1. Project-specific license review | **Fail: unresolved.** Qwen Community License 1.0 still has no project-specific review for an AI Work Assistant. This engineering note is not that review. |
| 2. Consistent artifact-license provenance | **Fail: inconsistent.** The card points `license_link` at `LICENSE`, and the published siblings omit that file. |
| 3. Stable released cross-platform runtime | **Fail: not a Nexus-pinned contract.** Architecture remains `qwen4exp`. Unsloth tells users to build latest llama.cpp or use Unsloth Desktop. |
| 4. Explicit enforceable hardware requirements | **Fail: not proven for the installer.** 75 GB is explicit and also outside the laptop ceiling. It is a vendor claim, not a Nexus measurement the installer can enforce. |
| 5. Nexus tool-calling benchmark | **Fail: not run** on this artifact, quantization, template, and parser. |
| 6. Experimental opt-in policy and field evidence | **Unproven.** No catalog row exists, so there is no field evidence. Gate 6 cannot override gates 1 through 5. |

## Deferred, not dropped silently

- Qwen `chat_template_kwargs` (`enable_thinking`, `preserve_thinking`, `reasoning_effort`) stay deferred until some Qwen thinking model clears admission. Nexus sampler presets are not that mapping.
- Qwen3.8-27B is a different dense model. It is a watch item, not this release. The later comparison is [v2.6.0](../../v2.6/comparisons/v2.6.0-comparison-qwen38-27b-uncensored-gguf.md).
- Unsloth Desktop is not a Nexus surface.

## Catalog assertion

A unit test reads `core/registry/catalog.json` and fails if it contains `qwen3.8-flash-next`, `Qwen3.8-Flash-Next`, or `unsloth/Qwen3.8-Flash-Next-GGUF`.
