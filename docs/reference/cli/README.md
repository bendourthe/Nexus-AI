# `nexus` CLI reference

Index of the agent-facing command pages. Shared stdout, stderr, and exit-code rules live in [contract.md](contract.md). The `HELP` string in `bin/nexus.mjs` is the authoritative list of commands; `cli-reference-drift` fails when this tree and that list disagree.

| Page | Group |
|---|---|
| [skills.md](skills.md) | `nexus skills` |
| [memory.md](memory.md) | `nexus memory` |
| [doctor.md](doctor.md) | `nexus doctor` |
| [trace.md](trace.md) | `nexus trace` |
| [golden.md](golden.md) | `nexus golden` |
| [session.md](session.md) | `nexus session` |
| [models.md](models.md) | `nexus models` |
| [generate.md](generate.md) | `nexus generate` |
| [check.md](check.md) | `nexus check` |
| [image.md](image.md) | `nexus image` |
| [video.md](video.md) | `nexus video` |

Loopback commands (`session`, `models`, `generate`) need the desktop sidecar and a bearer token. Every other group runs in the `nexus` process.
