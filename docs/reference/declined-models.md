# Declined model proposals

**Status**: living reference

This page lists the model proposals Nexus declined and where each decision is recorded. Each record holds the evidence and the conditions that would reopen the proposal. A decline is about fit with Nexus's hardware tiers and runtimes, not about the model's quality. The acceptance bar that every proposal is judged against is [model-acceptance.md](model-acceptance.md).

| Proposal | Declined in | Reason in one line | Record |
|---|---|---|---|
| Kolibri-1 (Aleph Alpha) | v2.12.0 | The smallest community GGUF is about 34 GB, above the 24 GB top tier, and stock Ollama, llama.cpp, and LM Studio cannot load it. | `DF-v212-1` in [v2.12 known gaps](../v2/v2.12/known-gaps.md); [comparison](../v2/v2.12/comparisons/v2.12.0-comparison-kolibri-1.md) |
| Qwen3.8-Flash-Next | v2.3.0 | Rejected for catalog admission against the six admission gates; kept as a deferred watchlist candidate. | [Admission record](../archive/v2/v2.3/development/model-admission-qwen38.md) |
| `abenzerps/Qwen-Image-2.1-Uncensored-GGUF` and Bespoke Nimble | v2.8.0 | Not admitted, no catalog row. | `DF-v280-1` in [v2.8 known gaps](../archive/v2/v2.8/known-gaps.md) |
| CrisperWhisper 2.0 | v2.9.0 | The fetched page has no weights, license, or size; not admitted, no catalog row. | `DF-v290-1` in [v2.9 known gaps](../archive/v2/v2.9/known-gaps.md) |
| Hosted Jev, Laya, and Kev | v2.10.0 | Hosted models, not admitted, no catalog row. | `DF-v210-1` in [v2.10 known gaps](../archive/v2/v2.10/known-gaps.md) |
| CLM-8B and the PageIndex package | v2.11.0 | CLM-8B fails the runtime, single-GPU, and job-map grounds; the PageIndex package defaults to hosted models and an OpenAI key. | `DF-v211-1` in [v2.11 known gaps](../archive/v2/v2.11/known-gaps.md); [comparison](../archive/v2/v2.11/comparisons/v2.11.0-comparison-pageindex-airi-clm.md) |

Qwen3.8-27B and the Empero Qwen3.8 distill are covered in the acceptance bar's own "Qwen3.8 family" section rather than here.
