# `nexus golden`

Run the local golden-task corpus. Output rules: [contract.md](contract.md). Does not require the desktop sidecar. `--mode live` calls the local Ollama backend. The default mode is `dry`, which stays offline.

## Subcommands

- `nexus golden run [--task <id>] [--mode dry|live] [--model <name>] [--options <file.json>] [--metrics <out.json>] [--tool-format <name>] [--json]`

`--task` and `--model` are strings. `--mode` is `dry` or `live`. `--json` is a boolean.

## CPU-Only Runs

The options file accepts finite numeric values for `temperature`, `top_p`, `top_k`, `min_p`, `repeat_penalty`, `num_ctx`, and `num_gpu`. `num_gpu` must be a non-negative integer; `0` disables GPU offload. Strings such as `"0"`, fractions, negative values and unknown option keys are rejected before a model request.

From the repository root, with the project built, Ollama running and the holder model already installed, create `cpu-options.json` containing:

```json
{"num_gpu":0,"num_ctx":32768}
```

Run one task from PowerShell:

```powershell
node bin/nexus.mjs golden run --mode live --task bugfix-off-by-one-01 --model lfm2.5:2.6b --tool-format lfm-pythonic --options cpu-options.json --metrics cpu-metrics.json
```

The options reach every model turn. The metrics file records the effective options and per-task timings; live memory is marked unmeasured when no usable sample exists. This command runs real local inference, so completion time and model quality depend on the selected model. Unknown or malformed options exit 2.

Support: CPU-option validation and forwarding are verified through the spawned CLI on Windows with the installer-pinned Node 22.11.0 runtime. The reference host's Node 24 shutdown issue is tracked as `WN-22` in [v2.16 known gaps](../../releases/v2/v2.16/known-gaps.md); a successful task message is not a successful process exit on that host.

## JSON shape

`nexus golden run --json` is JSON Lines, one task per line:

```json
{"id":"sample-task","passed":true,"failures":[]}
```

The `passed/total` summary is written to stderr in JSON mode. Exit is 0 only when every selected task passed.

## Errors

| Condition | stderr | exit |
|---|---|---|
| tasks directory cannot be loaded | `failed to load tasks` | 1 |
| `--task` matches nothing | `no task with id` | 1 |
| one or more tasks fail | summary on stderr under `--json` | 1 |
| unknown `nexus golden` subcommand | `Expected: run` | 2 |
