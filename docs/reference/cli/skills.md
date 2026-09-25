# `nexus skills`

Install, list, audit, and edit the local skill catalog. Output rules: [contract.md](contract.md). Does not require a running sidecar. `nexus skills sync` is the only subcommand that talks to the network (it clones the Nexus-Hub catalog).

## Subcommands

- `nexus skills sync [--tag <tag>] [--apply] [--json]` clones or previews the Hub catalog. `--tag` is a string. `--apply` and `--json` are booleans.
- `nexus skills list [--namespace <ns>] [--json]` lists installed Hub skills. `--namespace` is a string. Collection output.
- `nexus skills install <namespace>/<name> --from <url> [--overwrite] [--json]` writes one skill. `--from` is a URL string. `--overwrite` is a boolean.
- `nexus skills remove <namespace>/<name> [--json]` deletes one installed skill.
- `nexus skills audit [--context-tokens <N>] [--budget-percent <N>] [--months <N>] [--skills-root <dir>] [--sessions-root <dir>] [--by-root builtin|user|devai-hub] [--deep-logs] [--json]` writes a read-only audit. Numeric flags are numbers. `--by-root` is an enum. `--deep-logs` and `--json` are booleans.
- `nexus skills optimize <id> [--apply] [--yes] [--model <name>] [--max-rounds <N>] [--skills-root <dir>] [--json]` proposes bounded edits. `<id>` is positional. `--model` is a string. `--max-rounds` is a number.
- `nexus skills frontier <id> [--apply] [--yes] [--model <name>] [--max-candidates <N>] [--skills-root <dir>] [--json]` ranks Pareto candidates. `--max-candidates` is a number.

## JSON shape

`nexus skills list --json` is JSON Lines:

```json
{"name":"implement-phase","namespace":"nexus-hub","contentHash":"0123456789abcdef"}
```

An unsynced catalog prints `null` and explains on stderr.

`nexus skills sync --json` is one object: `tag`, `alreadyUpToDate`, `applied`, `diff`, `quarantined`, and when a fetch happened `activeDir` and `tmpDir`.

`nexus skills install --json` is `{ "ok": true, "writtenTo": "<path>", "contentHash": "<sha256>" }`.

`nexus skills remove --json` is `{ "ok": true, "removed": "<path>" }`.

`nexus skills audit --json` is the existing pretty-printed audit report object. `nexus skills optimize --json` and `nexus skills frontier --json` are the optimizer result objects. Progress banners go to stderr in JSON mode.

## Errors

| Condition | stderr | exit |
|---|---|---|
| `nexus skills install` without a spec | `nexus skills install: missing <namespace>/<name> argument.` | 2 |
| `nexus skills install` without `--from` | `nexus skills install: --from <url> is required.` | 2 |
| install or remove rejected by the scanner or missing file | reason and message | 1 |
| `nexus skills optimize` or `nexus skills frontier` without an id | id is required | 2 |
| unknown skill id | `unknown skill id` | 2 |
| `nexus skills audit` with an empty catalog | no skills loaded | 1 |
| unknown `nexus skills` subcommand | `unknown subcommand` plus HELP | 2 |
