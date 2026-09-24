# `nexus models`

List models the sidecar can serve. Output rules: [contract.md](contract.md). Requires a running sidecar and the same token, host, and port rules as [session.md](session.md).

## Subcommands

- `nexus models list [--json] [--token <t>] [--host <h>] [--port <p>]`

`--json` is a boolean output flag. `--token`, `--host`, and `--port` are strings.

## JSON shape

One JSON value:

```json
{"models":[{"id":"gemma4:e4b","displayName":"Gemma 4 E4B"}]}
```

Field names come from the sidecar catalog (`id`, `displayName`) unless a custom `listModels` provider returns a different object. This command is not JSON Lines.

Auth and sidecar failures use the same `error` object as [session.md](session.md).

## Errors

| Condition | stdout `error.code` | exit |
|---|---|---|
| missing token | `auth` | 1 |
| token rejected | `auth` | 1 |
| sidecar HTTP error | `sidecar` | 1 |
| sidecar not listening | `sidecar-down` | 1 |
