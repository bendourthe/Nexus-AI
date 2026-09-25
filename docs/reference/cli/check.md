# `nexus check`

Run the deterministic source checks in `bin/nexus-check.mjs`. Output rules: [contract.md](contract.md). Does not require a running sidecar. `nexus check` forwards every argument after the command name.

## Subcommands

`nexus check` has no subcommand of its own. The forwarded flags are:

- `nexus check [path] [--json] [--rule <id>] [--baseline <file>] [--list-rules] [--strict] [--help]`

`--json`, `--list-rules`, `--strict`, and `--help` are booleans. `--rule` and `--baseline` are strings. `path` is positional.

## JSON shape

`nexus check --json` is one object with a `findings` array. Each finding has `rule`, `severity`, `file`, `line`, `column`, and `message`.

```json
{"findings":[{"rule":"cli-reference-drift","severity":"error","file":"bin/nexus.mjs","line":1,"column":1,"message":"missing page"}]}
```

## Errors

| Condition | stderr | exit |
|---|---|---|
| unknown flag | the flag name | 2 |
| one or more error-severity findings | findings are on stdout | 1 |
| `--strict` and any finding | findings are on stdout | 1 |
| warnings only | findings are on stdout | 0 |
