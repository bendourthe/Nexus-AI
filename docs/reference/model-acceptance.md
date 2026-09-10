# Model and runtime acceptance bar

**Status**: living reference. Introduced in v2.4.9 Phase 1.
**Applies to**: every proposal to add a model, a model variant, or a Python runtime to Nexus.
**Enforced by**: [`tests/unit/docs/v2.4.9-model-acceptance.test.ts`](../../tests/unit/docs/v2.4.9-model-acceptance.test.ts), which asserts the two job-map invariants below mechanically; [`.claude/agents/nexus-standards-judge.md`](../../.claude/agents/nexus-standards-judge.md) on review, for the judgement the test cannot make; and the catalog invariant tests in `scripts/installer/tests/test_catalog_invariants.py`.

## Why this document exists

Nexus ships a curated catalog, not a model zoo. Every entry costs a download the user waits for, a row in a picker they have to read past, a fit-gate decision on their hardware, a license they inherit, and a support surface someone has to keep working on Windows, macOS, and Linux. Breadth is only an asset while every entry still works on every supported platform; past that point it is a maintenance bill charged to the next release.

So the catalog is organised as a **job map**. Every entry owns at least one named job, and every job has exactly one holder. A proposal is accepted on one of two grounds and no others:

1. It **takes a job** from its current holder, with measured numbers from this project's own hardware.
2. It **claims a job nobody holds**.

"It benchmarks well" is not a job. Neither is "it is newer", "it is more popular", or "it scores higher on a leaderboard". A job is a seat in the map below, and seats are occupied.

## How the map is built

The jobs are not invented for this document. They are read off the two files that already decide what users get:

- [`core/registry/catalog.json`](../../core/registry/catalog.json) -- the 38 curated installable entries, each with a `type`, a `task`, a `vramGB` floor, and a license.
- [`core/registry/recommended.json`](../../core/registry/recommended.json) -- the per-hardware-tier default selections. Its `tiers` map (`cpu`, `8`, `12`, `16`, `24`) times its sections (`chat`, `agentic`, `embed`, `image`, `video`, `audio`, `document`) is what the installer pre-ticks and what Settings offers first.

An entry that holds a slot in `recommended.json` holds a **default job**: it is pre-ticked for some class of hardware, so a user gets it without choosing it. An entry that holds no slot holds an **opt-in job**: it is in the catalog because it does something no default does, and the user has to go and get it.

That distinction carries most of the weight in this document. The bar for taking a default job is higher than the bar for claiming an opt-in job, because a default reaches users who never evaluated the choice.

## The job map

### Default jobs (pre-ticked by `recommended.json`)

| Job | Holder | Tier(s) |
|---|---|---|
| cpu-tier chat default | `gemma4:e2b` | cpu |
| cpu-tier dedicated agentic default | `lfm2.5:2.6b` | cpu, and inserted at 8 |
| cpu-tier agentic last-resort fallback | `qwen3.5:4b` | cpu |
| 8 GB chat-and-agentic default | `gemma4:e4b` | 8 |
| 12 and 16 GB chat-and-agentic default | `gemma-4-12b-it-gguf` | 12, 16 |
| 24 GB chat-and-agentic default | `gemma4:31b` | 24 |
| 8 and 12 GB coding-specialist fallback | `qwen3.5:9b` | 8, 12 |
| 16 GB coding-specialist fallback | `gpt-oss:20b` | 16 |
| 24 GB coding-specialist fallback | `qwen3-coder:30b` | 24 |
| app-wide memory embedder (required default) | `embeddinggemma` | all |
| 8 and 12 GB image default | `juggernaut-xl-v9` | 8, 12 |
| 16 and 24 GB image default | `realvisxl-v5` | 16, 24 |
| 16 GB video default | `wan2.1-t2v-1.3b` | 16 |
| 24 GB video default | `wan2.2-ti2v-5b` | 24 |
| speech-to-text default | `faster-whisper-large-v3` | all |
| text-to-speech default | `kokoro-82m` | all |
| cpu and 8 GB document OCR default | `rapidocr-ppocrv4` | cpu, 8 |
| 12 GB and above document OCR quality tier | `unlimited-ocr-3b` | 12, 16, 24 |

**Reading the agentic rows.** `recommended.json` stores agentic as an ordered preference list, not a single pick. The Gemma 4 variant is preferred because it covers chat and agentic with one download; the coding specialist is the in-list fallback taken only when no Gemma 4 variant fits; `lfm2.5:2.6b` exists as a *dedicated* agentic pick for hosts below the Gemma floor. Each of those is a separate job with one holder, which is why the same tier appears on more than one row.

### Opt-in jobs (in the catalog, not pre-ticked)

| Job | Holder |
|---|---|
| long-context embed opt-in, 32K per passage | `qwen3-embedding:0.6b` |
| index-continuity embedder, 8K, preserves an existing Nomic index | `nomic-embed-text` |
| 24 GB MoE worker candidate, native build | `nemotron-lightning:30b-a3b` |
| 16 GB MoE worker candidate, expert-offload sibling | `nemotron-lightning:30b-a3b-offload` |
| 32 GB Dynamic-quant strong candidate | `muse-glimmer:30b-dynamic` |
| 17 GB K-quant strong candidate | `muse-glimmer:30b` |
| patient-tier frontier MoE | `inkling-small` |
| 18 GB MoE chat step between `e4b` and `31b` | `gemma4:26b` |
| low-VRAM image safety net, INT4 via nunchaku | `sana-1.6b-int4` |
| native-4K image entry | `sana-1.6b-4k` |
| single-step preview image entry | `sana-sprint-1024` |
| 2K step of the SANA resolution ladder | `sana-1.6b-2k` |
| linear-attention 1024px SDXL-class entry | `sana-1.6b-1024` |
| segmentation utility weights, hidden from the picker | `sam2:hiera-tiny` |
| audio2video avatar entry, diffusion-pro gated | `longcat-video-avatar-1.5` |
| 720p efficiency video entry | `sana-video-2b-720p` |
| SANA auto-loaded VAE | `dc-ae-f32c32-sana-1.1` |
| SANA canny conditioning | `sana-controlnet-canny` |
| SANA depth conditioning | `sana-controlnet-depth` |
| SANA pose conditioning | `sana-controlnet-pose` |

### Runtime jobs

Runtimes are accepted on the same terms as models: a runtime owns a job, and a second runtime for the same job has to take it.

| Job | Holder | Requirement set |
|---|---|---|
| image and video diffusion execution | `runtimes/diffusion` | [`runtimes/diffusion/requirements.txt`](../../runtimes/diffusion/requirements.txt) |
| speech-to-text and text-to-speech execution | `runtimes/audio` | [`runtimes/audio/requirements.txt`](../../runtimes/audio/requirements.txt) |
| document OCR execution | `runtimes/ocr` | [`runtimes/ocr/requirements.txt`](../../runtimes/ocr/requirements.txt) |

A proposal that adds a runtime dependency to an existing set is not a new runtime, but it is not free either: it lands in the `pip-audit` surface for that set and in every installer that ships it. Say which set, and why the dependency cannot be avoided.

## Open questions

These are entries the map cannot cleanly assign, recorded rather than papered over. Per the rule above, a model that cannot be assigned a job is itself a finding.

**OQ-1 -- Eight coding-runtime format bindings have no installable catalog entry.** [`core/registry/ModelCatalog.ts`](../../core/registry/ModelCatalog.ts) declares 18 entries binding a model id to a `promptFormat` and a `toolFormat`. Ten of them correspond to a `catalog.json` entry. Eight do not: `llama3.1:8b`, `llama3.2:3b`, `llama3.3:70b`, `qwen2.5:7b`, `qwen2.5-coder:7b`, `deepseek-coder:6.7b`, `hermes3:8b`, `hermes3:70b`. A user cannot install any of them from Nexus. Either they are supported models absent from the catalog, or they are dead bindings; the map cannot say which, and neither can the code.

**OQ-2 -- Five installable LLMs have no format binding, and three of them are chat defaults.** Going the other way, these `catalog.json` LLM entries have no `ModelCatalog.ts` entry: `gemma4:e2b`, `gemma-4-12b-it-gguf`, `gemma4:26b`, `gemma4:31b`, `inkling-small`. The first, second, and fourth are the pre-ticked chat default on the cpu, 12/16, and 24 GB tiers respectively. Tool-call parsing falls back to `"gemma4-xml"` (`modules/coding/llm/parseAgentToolCalls.ts:23`), which happens to be right for the four Gemma entries and is **not** right for `inkling-small`, whose `family` is `inkling` and which is marked `agentic: true`. That is a concrete wrong result: an agentic session on `inkling-small` parses tool calls with a Gemma grammar.

**OQ-3 -- Nothing tests the two registries against each other.** `tests/unit/core/registry/ModelCatalog.test.ts` asserts that `ModelCatalog.ts` stays in sync with `core/registry/models.json`. No test compares either against `catalog.json`, which is why OQ-1 and OQ-2 are both invisible today. A proposal that adds an LLM to `catalog.json` should say which side of this seam it lands on.

**OQ-4 -- `ModelFamily` cannot express every catalog family.** The `ModelFamily` union in `ModelCatalog.ts` admits `gemma | llama | qwen | deepseek | lfm2.5 | hermes | muse-glimmer | nemotron-lightning | gpt-oss`. `catalog.json` ships `family: "inkling"`. Adding `inkling-small` to the coding runtime therefore requires a type change, not just a row.

**OQ-5 -- Use-restricted licenses in default slots carry inconsistent disclosure.** Only one catalog entry has a `licenseNote`: `lfm2.5:2.6b`. Three other default holders sit under licenses that impose use restrictions and carry no note -- `juggernaut-xl-v9`, whose own license string reads "CreativeML Open RAIL-M (no paid-API redeployment without a RunDiffusion license)", `realvisxl-v5` under OpenRAIL++, and the Gemma family under the Gemma Terms of Use. See the license posture below for what this document asks of new entries; the existing gap is recorded, not retroactively fixed here.

## The bar

### Taking a job

A proposal that targets an occupied job must name the job, name the holder, and bring **measured numbers from this project's own hardware** on the axes that job is judged by. Vendor-reported figures and leaderboard positions do not count; the catalog already records `vendorReported` and `toolCallingBenchmark` separately for exactly this reason.

What has to be measured depends on the job:

- **A chat or agentic default**: peak resident memory against the tier's VRAM budget, tokens per second on a representative prompt, and for an agentic job a local transcript proving it actually calls tools in the format the binding claims. `toolCallingVerified: true` without a `toolCallingBenchmark` is a validation failure, not a claim.
- **A coding-specialist fallback**: the above, plus why it beats the Gemma variant that already covers chat and agentic with one download. Displacing a one-download-covers-two-jobs holder costs the user a second download, and the numbers have to be worth that.
- **An embedder**: dimension, passage window, and an explicit statement about the index. Switching the app-wide memory embedder forces a reindex of every existing user's on-disk memory, which is a migration, not a swap.
- **An image or video default**: VRAM floor, wall-clock for one generation at the tier's target resolution, and output the reviewer can look at.
- **A runtime**: the dependency delta, the platforms it was built on, and what breaks on the platforms it was not.

A proposal that cannot produce the numbers is not rejected on principle. It is an opt-in entry until someone measures it.

### Claiming an uncovered job

A proposal claiming a job nobody holds has a lighter evidentiary load and a heavier one on definition. Say what the job is in the vocabulary of the map above -- a hardware tier, a section, a modality, a resolution step, a license posture -- and say why no current holder covers it. "No current entry does X" is checkable; a reviewer can look. If the job turns out to be a relabelling of an occupied one, the proposal is a take, and the numbers are back.

An uncovered job that is real but that nobody has hardware to test lands as an opt-in entry, gated below the VRAM floor via `hideBelowVramGB` or the `utility` and `opt-in` tags, exactly as `inkling-small` and `longcat-video-avatar-1.5` are today.

### What both routes require

- A license posture that clears the section below.
- A `source` block with a pinned `revision` and a real `sha256`, or a documented reason the protocol verifies digests on its own. Ollama-sourced entries delegate digest verification to `ollama pull` and carry no `sha256`; Hugging Face entries do not get that exemption.
- Card copy that argues from license, size, context window, and architecture. Vendor benchmark numbers and suite names do not belong in card copy.
- A statement of which of the three runtimes, if any, has to change.

## License posture

The project has already made license-driven catalog decisions, so this section describes a revealed policy rather than a new one. The clearest worked example is [`v2.4.10-adoption-minicpm5-mistral-models.md`](../v2/v2.4/plans/v2.4.10-adoption-minicpm5-mistral-models.md), whose whole argument is that routing every CPU-only and sub-4 GB user to a revenue-capped license is a harm worth a release to fix, because those users have the least hardware freedom to pick something else.

**For a pre-ticked default**, the acceptable postures are:

- **Permissive** (Apache-2.0, MIT, BSD): accepted without further argument. This is the default expectation for any new default holder.
- **Custom but unrestricted in use** (the Gemma Terms of Use, as shipped on the primary chat default across four tiers): accepted, with the license named in the entry and, per OQ-5, a `licenseNote` stating what the terms actually require.
- **Use-restricted** (the RAIL family, redeployment restrictions): accepted only with a `licenseNote` that states the restriction in plain language, because the user inherits it without having chosen the model.
- **Commercially capped** (a revenue ceiling on free use, as in the LFM Open License v1.0): **not acceptable for a pre-ticked default when an alternative fits the same tier.** Where no alternative fits, it ships with a `licenseNote` and an open commitment to replace it; that commitment is what v2.4.10 is discharging. A proposal must not create a new instance of this.

**For an opt-in entry**, any license is acceptable provided it is named accurately in `license`, linked in `licenseUrl`, and any use restriction is stated in `licenseNote`. The user is choosing it deliberately, so disclosure carries the weight that exclusion carries for defaults.

**Neither route accepts** a license that forbids redistribution of the weights the installer downloads, a license whose terms cannot be read from a stable URL, or an entry whose license field says "Apache-2.0" when the model card says otherwise. The last one is the failure mode worth naming: the label is what the invariant test checks, so a wrong label defeats the check rather than tripping it.

## Breadth is not the goal

Every entry above is a maintenance commitment on three platforms. When a proposal cannot take a job and cannot name an uncovered one, the correct outcome is to decline it, and declining is not a judgement about the model. `Ministral 3 14B` was cut from v2.4.10 on exactly these grounds: its only argument was license cleanliness against terms the catalog already ships as a default without incident, and it would have cost an 8.24 GB download, a catalog entry, an invariant, and four assertions to deliver an untagged row.

The same test applies in the other direction. An entry that no longer holds its job, because something took it or because the job stopped existing, is a removal candidate. The map is the record of which entries still have a reason.

## Changing this document

The map goes stale the moment `catalog.json` or `recommended.json` changes. A change to either that adds, removes, or re-tiers an entry updates this document in the same commit, and the open questions above are either resolved or restated with what was learned. A job that quietly acquires a second holder is the specific failure this document exists to catch.
