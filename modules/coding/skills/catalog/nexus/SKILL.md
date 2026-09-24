---
name: nexus
description: Drive a local Nexus desktop from the nexus CLI without reading source
argument-hint: "[what to do with the local Nexus app]"
version: 1.0.0
platforms: [linux, macos, windows]
metadata.tags: [cli, nexus, local]
metadata.related_skills: []
---

You are driving a locally installed Nexus desktop through the `nexus` CLI. Do not read `bin/nexus.mjs` or sidecar source. Load the page you need from `docs/reference/cli/` and follow `docs/reference/cli/contract.md`.

Nexus is local-first. No command in this skill sends a prompt, a file, or a token off the machine. The one exception already documented on the skills page is `nexus skills sync`, which clones the Nexus-Hub catalog. Do not run that unless the user asked to update skills.

## Vocabulary

Command groups, one page each:

- skills: `docs/reference/cli/skills.md`
- memory: `docs/reference/cli/memory.md`
- doctor: `docs/reference/cli/doctor.md`
- trace: `docs/reference/cli/trace.md`
- golden: `docs/reference/cli/golden.md`
- session: `docs/reference/cli/session.md`
- models: `docs/reference/cli/models.md`
- generate: `docs/reference/cli/generate.md`
- check: `docs/reference/cli/check.md`
- image: `docs/reference/cli/image.md`
- video: `docs/reference/cli/video.md`

Index: `docs/reference/cli/README.md`.

## Sidecar

`nexus session`, `nexus models`, and `nexus generate` call `http://127.0.0.1:11500` unless `--host` and `--port` say otherwise. Pass `--token <value>` or set `NEXUS_SERVING_TOKEN`. The desktop writes the same value to `nexus.serving.token` in `~/.nexus/settings.json` when Local API server is enabled.

## Output contract

With `--json`, stdout is one JSON value, or JSON Lines for a collection, and nothing else. Diagnostics go to stderr. Exit `0` is success, exit `1` is a runtime or auth or sidecar failure, exit `2` is a bad invocation or a JSON schema error. Details: `docs/reference/cli/contract.md`.

How to tell the three failures apart:

- Sidecar not running: exit `1` and stdout `error.code` `sidecar-down`.
- Request rejected: exit `1` and stdout `error.code` `auth` (or stderr from a non-loopback command).
- Request malformed: exit `2` and stdout `error.code` `schema`, or stderr that names the missing flag.

## Confirmation boundary

Do not bypass a prompt. `nexus skills sync --apply`, `nexus skills optimize --apply`, and `nexus skills frontier --apply` change files and must stop for the user unless they already passed `--yes`. `nexus skills install`, `nexus skills remove`, `nexus memory import`, `nexus memory decay`, and `nexus memory compress` write or delete local state. `nexus generate queue` spends GPU time. Shell commands that match the blocklist in `src/tools/commandBlocklist.ts` are refused by `src/tools/ConfirmationGate.ts`. Do not rephrase a refused command to sneak it through.

## Worked round trip

Assume the sidecar is up and `NEXUS_SERVING_TOKEN` is set.

1. Start a session.

```
nexus session new --json "{\"modelId\":\"gemma4:e4b\",\"title\":\"agent\"}"
```

Expect exit 0 and one JSON object that includes the new session id.

2. Send a turn. Substitute the id from step 1.

```
nexus session send --json "{\"sessionId\":\"SESSION_ID\",\"text\":\"Say hello in one word.\"}"
```

Expect exit 0 and one JSON object with `sessionId` and `events`.

3. Queue a generation.

```
nexus generate queue --json "{\"pillar\":\"image\",\"jobType\":\"txt2img\",\"parameters\":{\"prompt\":\"a red door\"}}"
```

Expect exit 0 and one JSON object with a `jobs` array. Read `jobs[0].id`.

4. Poll status.

```
nexus generate status --id JOB_ID --json
```

Expect exit 0 and one JSON object `{ "job": { "id": "JOB_ID" } }` or `{ "job": null }` if the id is unknown. Repeat until `job.status` is terminal. If the sidecar is down, expect exit 1 and `error.code` `sidecar-down`, and do not invent a job.
