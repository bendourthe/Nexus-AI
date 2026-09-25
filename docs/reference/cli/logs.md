# `nexus logs`

Read a bounded, redacted snapshot of recent sidecar logs. Output rules: [contract.md](contract.md). Requires a running sidecar and the same token, host, and port rules as [session.md](session.md).

## Subcommands

`nexus logs` has no subcommand.

`nexus logs [--lines <N>] [--json] [--token <t>] [--host <h>] [--port <p>]`

`--lines` is a positive integer. The default is 100 and the hard maximum is 500. `--json` is a boolean.

## JSON shape

JSON Lines, oldest of the window first and newest last:

```json
{"ts":"2026-09-24T00:00:00.000Z","level":"info","message":"job queued"}
```

An empty snapshot is an empty stream. Tokens, secret patterns, prompt text past 240 characters, and absolute paths outside the authorized workspace roots are replaced before the line is written.

## Errors

| Condition | stderr | exit |
|---|---|---|
| `--lines` is missing digits, zero, or negative | `--lines must be a positive integer` | 2 |
| sidecar not listening | sidecar-down message, no log lines | 1 |
| missing token | auth message | 1 |
