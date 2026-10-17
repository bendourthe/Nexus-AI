# LFM2.5-24B-A2B Probe (T002)

**Plan**: [v2.14.0 voice latency and LFM2.5-24B trial](../plans/v2.14.0-adoption-voice-latency-lfm2.5-24b.md), task T002
**Date**: 2026-10-16
**Host**: reference 16 GB tier, NVIDIA GeForce RTX 3080 Ti Laptop GPU (16384 MiB), Windows 11, Ollama 0.32.15
**Verdict**: GO on `QAD-Q4_0` (Q4_K_M spills 0.81 GB at 32K; QAD-Q4_0 fits fully)

## Provenance

| Field | Value |
|---|---|
| Hugging Face repository | `LiquidAI/LFM2.5-24B-A2B-GGUF` |
| Commit SHA | `0912d33141f77e10705345a6732bfd83f0252fdc` (lastModified 2026-10-13T21:33:53Z) |
| Ollama tag | `hf.co/LiquidAI/LFM2.5-24B-A2B-GGUF:Q4_K_M` |
| GGUF layer digest (Ollama manifest) | `sha256:d3334405b96228eb9908cdebb5c6194908f2da64282bda852afc3a3910c64e7d`, 14,526,258,464 bytes |
| Hugging Face LFS sha256 at the commit | `d3334405b96228eb9908cdebb5c6194908f2da64282bda852afc3a3910c64e7d` (match) |
| QAD-Q4_0 LFS sha256 at the commit | `d1c03f73ecaf61017d70419eec9e5dc0b05d50ae26c23d522829b934fbabf8a5`, 13,578,190,880 bytes |
| QAD-Q4_0 Ollama tag and layer digest | `hf.co/LiquidAI/LFM2.5-24B-A2B-GGUF:QAD-Q4_0`, `sha256:d1c03f73ecaf61017d70419eec9e5dc0b05d50ae26c23d522829b934fbabf8a5` (match) |
| Architecture reported by Ollama | `lfm2moe`, 24B total, context length 131072, capabilities tools + thinking + completion |
| License | LFM Open License v1.0 |

Weights live only in the local Ollama store and are never committed.

## Method

A loopback-only Node probe (`127.0.0.1:11434`, no other host) unloaded the model, loaded it at `num_ctx` 8192 and then 32768 with one fixed coding prompt (`num_predict` 256, temperature 0), and read `/api/ps`, `nvidia-smi` and the Ollama processes' working set after each load. Reasoning placement used one streamed `/api/chat` call with `think` true and one with `think` false. Tool calling used three non-streamed calls: native Ollama `tools`, an instruction to emit LFM's Pythonic span, and an instruction to emit the headless loop's Gemma 4 span (`src/tools/Gemma4ToolFormat.ts`). The same probe ran against `nemotron-3.5-lightning:30b`, the weights behind the current 16 GB holder `nemotron-lightning:30b-a3b-offload`, with default options (Nexus sends no explicit offload option; the offload is Ollama's automatic CPU spill).

## Fit and speed

| Model | Context | Resident size | On GPU | Spilled to CPU | GPU used (MiB) | Decode tok/s | Load ms |
|---|---|---|---|---|---|---|---|
| LFM2.5-24B Q4_K_M | 8K | 14.78 GB | 14.78 GB | 0 | 14300 | 130.40 | 42841 (cold) |
| LFM2.5-24B Q4_K_M | 32K | 15.66 GB | 14.84 GB | 0.81 GB | 14368 | 116.91 | 13446 (warm disk) |
| LFM2.5-24B QAD-Q4_0 | 8K | 13.83 GB | 13.83 GB | 0 | 13410 | 155.97 | 6668 |
| LFM2.5-24B QAD-Q4_0 | 32K | 14.36 GB | 14.36 GB | 0 | 13914 | 162.12 | 5150 |
| Nemotron 30B (offload holder) | 8K | 25.64 GB | 13.38 GB | 12.25 GB | 14152 | 18.87 | 41130 (cold) |
| Nemotron 30B (offload holder) | 32K | 25.71 GB | 13.43 GB | 12.28 GB | 14372 | 49.51 | 25586 |

Ollama process working set stayed near 175 MiB in both cases because the runner maps weights from disk; host RAM for the spilled layers is reported by `size - size_vram`, not by working set.

**Q4_K_M at 32K does not fully fit**: 0.81 GB of the model spills to CPU. **QAD-Q4_0 fits fully at 32K** (14.36 GB resident, all on GPU, 2.0 GiB headroom on the card), and decodes faster (162 tok/s). The trial therefore uses QAD-Q4_0. Q4_K_M stays installed locally but is not a trial arm. The current holder never fits: Nemotron keeps about 12.3 GB of its 25.7 GB on CPU at both contexts.

## Reasoning format

| Model | `think` | `thinking` field chars | Content contains `<think>` or `</think>` |
|---|---|---|---|
| LFM2.5-24B | true | 175 | no |
| LFM2.5-24B | false | 175 | no |
| LFM2.5-24B QAD-Q4_0 | true / false | 186 / 186 | no |
| Nemotron 30B | true | 1394 | no |
| Nemotron 30B | false | 0 | no |

Through Ollama 0.32.15, LFM reasoning arrives in the `thinking` field, never as raw text with an orphan `</think>`. LFM ignores `think: false` (it still reasons, and Ollama still separates it). The Ollama template does not open reasoning in the prompt. T012's splitter is therefore a guard for this path, not the primary mechanism.

## Tool calling

| Model | Native Ollama `tools` | Pythonic span when instructed | Gemma 4 span when instructed |
|---|---|---|---|
| LFM2.5-24B | correct `read_file({path: "src/index.ts"})` | `<|tool_call_start|>[read_file(path='src/index.ts')]<|tool_call_end|>` (single quotes; the existing `lfm-pythonic` codec accepts both quote styles, `ToolCallFormat.ts:228-230`) | fails: degenerates into repeated `<tool_call>` lines until `num_predict` |
| LFM2.5-24B QAD-Q4_0 | correct | correct span, single quotes | ignores the instruction and emits its own Pythonic span instead |
| Nemotron 30B | correct | correct, double quotes | near miss: `<|tool_call>call:read_file{path:"src/index.ts"}<tool_call|>` uses plain quotes instead of the `<|"|>` delimiter, which the Gemma 4 parser does not accept |

LFM cannot follow the headless loop's Gemma 4 codec, so the A/B must run LFM on its Pythonic codec (T013). Neither model emits the strict Gemma 4 delimiter today.

## Verdict

**GO.** Ollama loads the model (the first DECLINE condition does not apply), and QAD-Q4_0 fits 16 GB at 32K context with no CPU spill (the second does not apply). Phase 3 runs with:

- Trial tag `hf.co/LiquidAI/LFM2.5-24B-A2B-GGUF:QAD-Q4_0`, pinned to commit `0912d33141f77e10705345a6732bfd83f0252fdc` and GGUF sha256 `d1c03f73ecaf61017d70419eec9e5dc0b05d50ae26c23d522829b934fbabf8a5`.
- The existing `lfm-pythonic` codec, because LFM cannot follow the Gemma 4 codec.
- Reasoning separated by Ollama's `thinking` field; T012's splitter is a guard.
- Measured decode of 162 tok/s at 32K for setting the Phase 3 wall-clock budget in T003.

Comparison arm: `nemotron-3.5-lightning:30b` as loaded by `nemotron-lightning:30b-a3b-offload`, decoding at 18.9 to 49.5 tok/s with about 12.3 GB on CPU.
