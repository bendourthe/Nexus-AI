# `nexus media`

Inspect one artifact Nexus produced. Output rules: [contract.md](contract.md). Requires a running sidecar and the same token, host, and port rules as [session.md](session.md). The path must sit inside a workspace root the app already authorized. The file is not opened when it does not.

## Subcommands

- `nexus media inspect <path> [--json] [--token <t>] [--host <h>] [--port <p>]`

`<path>` is positional. `--json` is a boolean. `--token`, `--host`, and `--port` are strings.

## JSON shape

```json
{"path":"C:\\work\\repo\\out.png","duration":null,"width":512,"height":512,"streams":[{"kind":"video"}]}
```

A file that is still being written returns `"incomplete": true` and null dimensions. Duration, width, and height are null when that fact does not apply.

## Errors

| Condition | stderr | exit |
|---|---|---|
| missing path | `a path is required` | 2 |
| path is outside every authorized root | `outside authorized workspace roots` and no file bytes | 1 |
| path does not exist | `not found` | 1 |
| format cannot be read | `unreadable` | 1 |
| media runtime is not provisioned | names the runtime | 1 |
| sidecar not listening | sidecar-down message | 1 |
