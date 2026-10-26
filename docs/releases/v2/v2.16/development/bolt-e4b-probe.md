# Bolt E4B Probe

Date: 2026-10-25 (America/Los_Angeles).
Plan: [v2.16.0 model trial](../plans/v2.16.0-adoption-humanizer-handwired-nemotron-deepseek.md), T005-T006.
Rules: [frozen gates](v2.16.0-model-gates.md), committed at `5cb4c553` before candidate inference.
Verdict: E-1 PASS, E-2 PASS, E-3 HOLD because the installed runtime is too old. E-4 and E-5 are not run for either slot.

## Provenance

| Field | Observed value |
|---|---|
| Host | Windows 11; NVIDIA GeForce RTX 3080 Ti Laptop GPU, 16384 MiB |
| Local runtime | Ollama `0.32.15`, read from loopback `/api/version` |
| Official tag | `nemotron-3.5-bolt:e4b-q4_K_M`, Windows/Linux GGUF variant |
| Manifest digest | `sha256:69f2be39b309ade35ef04ee02507915f4cd839f6631e14425146cb6c9df3bd39` |
| Registry bundle size | 7,908,812,809 layer bytes; includes model, projector, draft, template, license, and parameters |
| Required Ollama | `0.40.10`, literal `requires` value in registry config |
| Declared renderer/parser | `gemma4-nemotron` / `gemma4`; metadata only, not a locally proven codec |
| NVIDIA card commit | `1db54d5b12533ff1bcaa8e42cf4c667988a1f1be` |
| License | OpenMDW-1.1, fetched and digest-verified from the official manifest's license layer |
| Resident models before/after pull | None; actual `/api/ps` response is `{"models":[]}` |
| Local model digest | Not installed; no successful pull or inference digest is claimed |

Registry manifest, config, license, source checks, raw pull response, and version observations are retained in [evidence/bolt-e4b](evidence/bolt-e4b/). The exact raw protocol inputs consumed by the regression test also live in [the stable fixture directory](../../../../../tests/fixtures/model-probe/bolt-e4b/).

## E-1 Availability

PASS. The [official tags page](https://ollama.com/library/nemotron-3.5-bolt/tags) lists E4B, and the [specific Q4_K_M tag](https://ollama.com/library/nemotron-3.5-bolt:e4b-q4_K_M) lists tools with its capabilities. The official registry returned HTTP 200 for the [manifest](https://registry.ollama.ai/v2/library/nemotron-3.5-bolt/manifests/e4b-q4_K_M). Its byte hash is the full manifest digest above. Config `requires: "0.40.10"` is the authoritative runtime floor even though the rendered page does not print a minimum version.

The default E4B tag also offers an MLX variant; this Windows trial selects the explicit GGUF tag. NVIDIA's approximately 4 GB target-workload description is not the Ollama bundle size or a local VRAM measurement. No fit verdict is inferred from download size.

## E-2 License

PASS against the frozen license gate. The [commit-pinned NVIDIA card](https://huggingface.co/nvidia/NVIDIA-Nemotron-3.5-Bolt-E4B-4GB/blob/1db54d5b12533ff1bcaa8e42cf4c667988a1f1be/README.md) names OpenMDW-1.1. The manifest's license digest is `sha256:bf6afc09321cbabba412015fa925ab9480d04859607f233b278334544937ea34`, verified over the retained bytes.

The applicable [OpenMDW-1.1 grant](https://github.com/OpenMDW/OpenMDW/blob/main/1.1/LICENSE.OpenMDW-1.1) says: "free of charge, to deal in the Model Materials without restriction". Its distribution provision requires retaining the agreement and applicable origin notices; it does not impose a revenue cap or redistribution ban. This gate concerns the selected license text, not a new legal guarantee about third-party rights.

## E-3 Runtime And Codec

HOLD, not a model FAIL. A real loopback POST to `/api/pull` with `{"model":"nemotron-3.5-bolt:e4b-q4_K_M","stream":false}` returned HTTP 500 with an upstream `412` runtime-compatibility refusal. The [raw response](evidence/bolt-e4b/pull-response.json) and [request/status observation](evidence/bolt-e4b/pull-observation.json) retain the actual bytes and their SHA-256. The server version is 0.32.15; the selected manifest requires 0.40.10. No model weights were successfully installed, no model became resident, and no inference request was sent.

Captured agentic inference transcripts: zero. Neither `message.tool_calls`, content parsing, nor `ollama show --template` was exercised on an installed candidate. The registry template and parser declarations cannot replace that missing five-transcript proof. The regression test asserts the compatibility HOLD through Nexus's real catalog visibility function and protects the raw error from being mistaken for a successful tool-call transcript.

No source-page instructions were executed. The model card's installer commands and runtime suggestions were treated as untrusted documentation data; no alternate runtime, package, or service was installed.

## Per-Slot Disposition

| Slot | E-4 | E-5 | Admission |
|---|---|---|---|
| CPU | Not run: E-3 HOLD | Not run: E-3 HOLD | Not admitted |
| GPU fallback | Not run: E-3 HOLD | Not run: E-3 HOLD | Not admitted |

The E-5 budget and task-set choice have not been measured or assigned. Holder memory, candidate memory, tokens per second, task success, and latency have no new trial values.

Reopen when an authorized reference runtime meets the declared 0.40.10 requirement, the exact official tag/digest is rechecked, and the five transcripts prove a Nexus path recovers the calls. Repeat the frozen fit and quality gates before moving either slot. T008's CPU runner option remains independently in scope; no installed-runtime upgrade is performed by this plan.
