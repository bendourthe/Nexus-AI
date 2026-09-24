# `nexus trace`

Export one stored trace to a self-contained HTML file. Output rules: [contract.md](contract.md). Does not require a running sidecar. It reads a SQLite trace database the desktop app already wrote.

## Subcommands

- `nexus trace export --trace <id> --out <file> --db <path> [--title <t>] [--json]`

`--trace`, `--out`, `--db`, and `--title` are strings. `--json` is a boolean.

## JSON shape

```json
{"ok":true,"spanCount":4,"path":"C:\\Users\\me\\trace.html"}
```

## Errors

| Condition | stderr | exit |
|---|---|---|
| missing `--trace`, `--out`, or `--db` | flag is required | 2 |
| database path does not exist | `trace database not found` | 2 |
| id is not in the database | `no trace with id` | 1 |
| unknown `nexus trace` subcommand | `Expected: export` | 2 |
