# `nexus` CLI output contract

Normative rules for every `nexus` subcommand. Later phases and the CLI-wide contract test obey this document. The exit-code wording matches the `HELP` string in `bin/nexus.mjs`.

## Rules

1. **`--json` stdout.** Under `--json`, stdout carries exactly one JSON value for a single-record command, or JSON Lines (one complete JSON object per line, newline-terminated) for a collection command, and nothing else. No banners, no progress, no trailing prose.
2. **Default stdout.** Without `--json`, stdout carries the existing human-readable output unchanged.
3. **Diagnostics.** All diagnostics, warnings, and errors go to stderr in every mode. A success path may still write a human-readable summary to stdout when `--json` is absent.
4. **Exit codes.** `0` is success. `1` is a runtime error, including a validation failure, a sidecar that is unreachable, and an auth failure. `2` is an invalid invocation, including a missing argument and a JSON-schema error.
5. **Empty success.** A command that returns nothing under `--json` emits `null` (single-record) or an empty JSON Lines stream (collection). It never exits `0` with empty stdout and no explanation. The explanation, when one is needed, goes to stderr.

When `--json` is combined with an explicit `--format` that is not `json` or `jsonl`, `--format` wins and the command writes a warning to stderr.

`--json <body>` on `session new`, `session send`, and `generate queue` remains the request body. Those commands already emit one JSON value on stdout. A bare `--json` on `session list`, `models list`, and `generate status` selects the same JSON stdout those commands already produce.

## Worked examples

Single-record success:

```json
{"ok":true,"writtenTo":"C:\\Users\\me\\.nexus\\skills\\user\\demo\\SKILL.md"}
```

Collection (JSON Lines), one object per line:

```json
{"name":"implement-phase","namespace":"nexus-hub","contentHash":"abc123def456"}
{"name":"known-gaps-tracker","namespace":"nexus-hub","contentHash":"789abc012def"}
```

Empty collection: stdout is empty (zero lines) and stderr explains why when the emptiness is not obvious, for example a catalog that has not been synced.

Empty single-record:

```json
null
```

Invalid invocation (exit `2`): stdout is empty, stderr is human-readable.

```text
nexus skills install: missing <namespace>/<name> argument.
```

Runtime failure (exit `1`): stdout is empty or, for the loopback commands that already speak JSON, one JSON error object. stderr carries the human-readable reason when stdout is not itself the error object.

```json
{"error":{"code":"sidecar-down","message":"Sidecar is not reachable at http://127.0.0.1:11500/nexus/session/list."}}
```
