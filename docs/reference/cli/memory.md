# `nexus memory`

Audit, export, import, decay, and compress captured memory snapshots. Output rules: [contract.md](contract.md). Does not require a running sidecar. The CLI reads a JSONL `--source` (or `--in` / `--file`) because the live database is wired inside the desktop daemon.

## Subcommands

- `nexus memory audit --source <jsonl> [--since <ISO>] [--tier <t>] [--scope <id>] [--session <id>] [--op <op>] [--format table|json|jsonl] [--json]`
- `nexus memory export --out <file> --source <jsonl> [--scope <id>] [--tier <list>] [--since <ISO>] [--json]`
- `nexus memory import --in <file> [--out <file>] [--json]`
- `nexus memory decay --now --source <jsonl> [--json]`
- `nexus memory compress --file <path> [--session <id>] [--model <name>] [--dry-run] [--json]`

`--source`, `--since`, `--tier`, `--scope`, `--session`, `--op`, `--format`, `--out`, `--in`, `--file`, and `--model` are strings. `--now`, `--dry-run`, and `--json` are booleans. `--format` wins over `--json` when they disagree, and the command warns on stderr.

## JSON shape

`nexus memory audit --json` is JSON Lines, one audit row per line (the same shape as `--format json`). An empty result is an empty stream.

`nexus memory export --json` is `{ "ok": true, "rowCount": 2, "path": "<absolute>" }`.

`nexus memory import --json` is `{ "imported": 1, "skipped": 0, "errors": 0 }`.

`nexus memory decay --json` is `{ "scanned": 3, "kept": 2, "evicted": [] }`.

`nexus memory compress --json` is `{ "kind": "compressed", "entryId": "<id>", "chunkCount": 1, "model": "gemma4:e4b", "llmCalls": 1 }`.

## Errors

| Condition | stderr | exit |
|---|---|---|
| `nexus memory audit` without `--source` | `--source <jsonl> is required` | 2 |
| source or `--in` or `--file` path missing | `not found` | 2 |
| unparseable `--since` | `unparseable --since` | 2 |
| `nexus memory export` without `--out` or `--source` | flag is required | 2 |
| `--out` outside the exports root | `path traversal guard` | 2 |
| `nexus memory decay` without `--now` | `--now is required` | 2 |
| `nexus memory compress` failure other than dry-run | kind and message | 1 |
| unknown `nexus memory` subcommand | `unknown subcommand` | 2 |
