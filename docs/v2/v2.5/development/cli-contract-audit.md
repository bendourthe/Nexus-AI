# CLI contract audit (Phase 1.2)

Source: `bin/nexus.mjs` `HELP` plus the handlers it dispatches, including pass-throughs to `bin/nexus-check.mjs`, `bin/nexus-image.mjs`, and `bin/nexus-video.mjs`. Captured before the Phase 1.3 flag additions. This file records the pre-change behavior; it does not change it.

| Command | `--json` today | stdout without the flag | diagnostics on stdout | exit codes |
|---|---|---|---|---|
| `skills sync` | no | prose status lines | no (warnings already on stderr) | 0, 1 (apply failed or thrown load) |
| `skills list` | no | prose, or the "catalog not yet synced" line | yes: the unsynced line is the only stdout | 0 |
| `skills install` | no | prose `wrote` / `sha256` | no | 0, 1, 2 |
| `skills remove` | no | prose `deleted` | no | 0, 1, 2 |
| `skills audit` | yes (`--json` boolean) | formatted report | no (empty catalog is stderr, exit 1) | 0, 1 |
| `skills optimize` | yes, but a banner is written to stdout before the JSON | prose rounds | yes: the mode banner precedes both modes | 0, 1, 2 |
| `skills frontier` | yes, same banner leak | prose summary | yes: the mode banner | 0, 1, 2 |
| `memory audit` | `--format json\|jsonl` only, not `--json` | table, or JSONL when `--format json` | no | 0, 2 |
| `memory export` | no | prose row count | no | 0, 2 |
| `memory import` | no | prose counts | no | 0, 1, 2 |
| `memory decay` | no | prose scan line plus per-row lines | the per-row lines are the result, not a diagnostic | 0, 2 |
| `memory compress` | no | prose result, or a dry-run line | dry-run line is stdout | 0, 1, 2 |
| `doctor` | yes | formatted report | no | 0 |
| `trace export` | no | prose `wrote N span(s)` | no | 0, 1, 2 |
| `golden run` | no | `PASS`/`FAIL` lines plus a summary | no | 0, 1 |
| `session new` | `--json <body>` is the request body; stdout is already one JSON value | JSON error or JSON body | JSON errors are on stdout (existing loopback shape; not redesigned) | 0, 1, 2 |
| `session send` | same as `session new` | JSON | same | 0, 1, 2 |
| `session list` | stdout is already JSON; bare `--json` was a boolean flag with no extra effect | one JSON value | JSON errors on stdout | 0, 1 |
| `models list` | same as `session list` | one JSON value | same | 0, 1 |
| `generate queue` | `--json <body>` is the request body | one JSON value | same | 0, 1, 2 |
| `generate status` | stdout is already JSON; `--id` is required | one JSON value | same | 0, 1, 2 |
| `check` | yes, via `nexus-check --json` | human-readable check report | no | 0, 1, 2 |
| `image` | listed in `HELP` but `main` did not dispatch it; `nexus-image` always prints workflow JSON | n/a from `nexus` (unknown command, exit 2) | n/a | 2 from `nexus` |
| `video` | same gap as `image` | n/a from `nexus` | n/a | 2 from `nexus` |

Collection commands for Phase 1.3: `skills list`, `session list` (already one JSON value from the sidecar; shape kept), `models list` (same), `memory audit` (existing JSONL shape kept), `golden run`.

Single-record commands missing `--json`: `skills sync`, `skills install`, `skills remove`, `memory export`, `memory import`, `memory decay`, `memory compress`, `trace export`. `image` and `video` already emit one JSON value once dispatched; `--json` is accepted and does not change that stdout.
