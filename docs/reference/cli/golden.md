# `nexus golden`

Run the local golden-task corpus. Output rules: [contract.md](contract.md). Does not require the desktop sidecar. `--mode live` calls the local Ollama backend. The default mode is `dry`, which stays offline.

## Subcommands

- `nexus golden run [--task <id>] [--mode dry|live] [--model <name>] [--json]`

`--task` and `--model` are strings. `--mode` is `dry` or `live`. `--json` is a boolean.

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
