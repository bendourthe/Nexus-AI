# `nexus session`

Create a coding session, send a turn, and list sessions through the loopback API. Output rules: [contract.md](contract.md). Requires a running sidecar. Token resolution order: `--token`, `NEXUS_SERVING_TOKEN`, then `nexus.serving.token` in `~/.nexus/settings.json`. Host defaults to `127.0.0.1` and port to `11500` (`--host`, `--port`, or the same settings file).

## Subcommands

- `nexus session new --json <body> [--token <t>] [--host <h>] [--port <p>]` creates a session. `<body>` is a JSON object string and must include `modelId`. Optional body fields include `title`, `workspacePath`, `workspaceId`, `workspaceRoots`, and `primaryRoot`.
- `nexus session send --json <body>` sends a turn. `<body>` must include `sessionId` and `text`.
- `nexus session list [--json] [--token <t>] [--host <h>] [--port <p>]` lists sessions. Here `--json` is the output flag (boolean), not a body.

## JSON shape

Success is one JSON value, the sidecar body, not JSON Lines.

`nexus session new` returns the object from `sessions.startWithScope` (it includes the new session id).

`nexus session send` returns:

```json
{"sessionId":"sess-1","events":[]}
```

`nexus session list` returns whatever `sessions.list()` returns, as one JSON value.

Errors from this group are also one JSON object on stdout (the existing loopback shape):

```json
{"error":{"code":"auth","message":"Missing bearer token. Set NEXUS_SERVING_TOKEN or --token, or enable Local API server."}}
```

`code` is `schema` (exit 2), `auth` (exit 1), `sidecar` (exit 1), or `sidecar-down` (exit 1).

## Errors

| Condition | stdout `error.code` | exit |
|---|---|---|
| missing token | `auth` | 1 |
| body is not an object, or required fields are missing | `schema` | 2 |
| sidecar rejects the bearer token | `auth` | 1 |
| sidecar HTTP error | `sidecar` | 1 |
| nothing is listening | `sidecar-down` | 1 |
| unknown session subcommand | stderr names the command | 2 |
