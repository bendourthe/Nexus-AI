# `nexus screenshot`

Read a PNG of the Nexus window. Output rules: [contract.md](contract.md). Requires a running sidecar and the same token, host, and port rules as [session.md](session.md).

The capture is the Nexus application window only. It does not include other applications or the rest of the desktop.

## Subcommands

`nexus screenshot` has no subcommand.

`nexus screenshot [--out <file>] [--json] [--token <t>] [--host <h>] [--port <p>]`

`--out` writes the PNG bytes to that file and still prints the JSON record on stdout. `--json` is a boolean.

## JSON shape

One JSON value:

```json
{"scope":"nexus-window","route":null,"width":1280,"height":800,"mediaType":"image/png","pngBase64":"<base64>"}
```

`scope` is always `nexus-window`. `route` is null because this command captures the window as it is.

## Errors

| Condition | stderr | exit |
|---|---|---|
| `--out` has no path | `--out requires a file path` | 2 |
| window capture is not attached | unavailable message | 1 |
| sidecar not listening | sidecar-down message | 1 |
| missing token | auth message | 1 |
