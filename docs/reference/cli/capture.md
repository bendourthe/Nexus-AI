# `nexus capture`

Read a PNG of the Nexus window, optionally after opening one pillar route. Output rules: [contract.md](contract.md). Requires a running sidecar and the same token, host, and port rules as [session.md](session.md).

The capture is the Nexus application window only. It does not include other applications or the rest of the desktop. `--route` may only be `/chatbot`, `/coding`, `/images`, or `/videos`.

## Subcommands

`nexus capture` has no subcommand.

`nexus capture [--route <path>] [--out <file>] [--json] [--token <t>] [--host <h>] [--port <p>]`

`--out` writes the PNG bytes to that file and still prints the JSON record on stdout. `--json` is a boolean.

## JSON shape

One JSON value:

```json
{"scope":"nexus-window","route":"/coding","width":1280,"height":800,"mediaType":"image/png","pngBase64":"<base64>"}
```

`scope` is always `nexus-window`. `route` is the pillar that was opened, or null when `--route` was omitted.

## Errors

| Condition | stderr | exit |
|---|---|---|
| `--route` is not one of the four pillar paths | `--route must be /chatbot, /coding, /images, or /videos` | 2 |
| `--out` has no path | `--out requires a file path` | 2 |
| window capture is not attached | unavailable message | 1 |
| sidecar not listening | sidecar-down message | 1 |
| missing token | auth message | 1 |
