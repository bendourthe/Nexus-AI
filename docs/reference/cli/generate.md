# `nexus generate`

Queue an image or video job and read its status. Output rules: [contract.md](contract.md). Requires a running sidecar and the same token, host, and port rules as [session.md](session.md).

## Subcommands

- `nexus generate queue --json <body> [--token <t>] [--host <h>] [--port <p>]` enqueues a job. `<body>` must include `pillar` (`image` or `video`), `jobType` (string), and `parameters` (object). Optional: `id`, `threadId`.
- `nexus generate status --id <jobId> [--json] [--token <t>] [--host <h>] [--port <p>]` reads one job. `--id` is a string. `--json` on this subcommand is the boolean output flag.

## JSON shape

Queue success:

```json
{"jobs":[{"id":"cli-abc","pillar":"image","jobType":"txt2img","status":"queued"}]}
```

Status success:

```json
{"job":{"id":"cli-abc","pillar":"image","jobType":"txt2img","status":"queued"}}
```

`job` is `null` when the id is unknown to a live sidecar (HTTP 200). A stopped sidecar is `error.code` `sidecar-down` with exit 1.

## Errors

| Condition | where | exit |
|---|---|---|
| queue body missing `pillar`, `jobType`, or `parameters` | stdout `error.code` `schema` | 2 |
| status without `--id` | stdout `error.code` `schema` | 2 |
| missing or rejected token | stdout `error.code` `auth` | 1 |
| generation queue not mounted | sidecar HTTP error JSON | 1 |
| sidecar not listening | stdout `error.code` `sidecar-down` | 1 |
