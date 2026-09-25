# `nexus doctor`

Read-only inventory of stale local state (legacy home, skill roots, memory files). Output rules: [contract.md](contract.md). Does not require a running sidecar. Always exits 0 when the report builds. A missing build artifact throws and the process exits 2.

## Subcommands

`nexus doctor` has no subcommand.

`nexus doctor [--migration-report] [--json] [--home <dir>] [--legacy-home <dir>] [--skills-root <dir>] [--stale-days <N>]`

`--migration-report` and `--json` are booleans. Path flags are strings. `--stale-days` is a number.

## JSON shape

`nexus doctor --json` is one pretty-printed object:

```json
{
  "generatedAt": "2026-09-24T00:00:00.000Z",
  "nexusHome": "C:\\Users\\me\\.nexus",
  "legacyGemmaHome": "C:\\Users\\me\\.gemma-code",
  "migrationReport": false,
  "findings": [],
  "summary": { "info": 0, "warn": 0, "total": 0 }
}
```

## Errors

Doctor does not use exit 1 for findings. Warnings stay inside `findings`. A missing `DoctorReport` build artifact is a process error on stderr with exit 2.
