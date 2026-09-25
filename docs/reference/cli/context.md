# `nexus context`

Read the running app's current session, workspace, model, and whether a generation is in flight. Output rules: [contract.md](contract.md). Requires a running sidecar and the same token, host, and port rules as [session.md](session.md).

## Subcommands

`nexus context` has no subcommand.

`nexus context [--json] [--token <t>] [--host <h>] [--port <p>]`

`--json` is a boolean. `--token`, `--host`, and `--port` are strings.

## JSON shape

One JSON object, snapshotted together:

```json
{"sessionId":"sess-1","title":"agent","workspaceRoots":["C:\\work\\repo"],"primaryRoot":"C:\\work\\repo","modelId":"gemma4:e4b","generationInFlight":false}
```

`sessionId` and `title` are `null` when no session exists.

## Errors

| Condition | stderr | exit |
|---|---|---|
| missing or rejected token | `error.code` `auth` on stdout | 1 |
| sidecar not listening | `sidecar not reachable` / `sidecar-down` | 1 |
