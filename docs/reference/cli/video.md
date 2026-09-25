# `nexus video`

Read a Nexus video workflow embedded in an MP4 `comment` tag via ffprobe. Output rules: [contract.md](contract.md). Does not require a running sidecar. Requires `ffprobe` on `PATH` or `NEXUS_FFPROBE_PATH`. This command forwards to `bin/nexus-video.mjs`.

## Subcommands

`nexus video` takes the child arguments of `nexus-video`. The only child command is `extract-workflow`.

`nexus video [--json] extract-workflow <file.mp4>`

`--json` is accepted and does not change stdout, because a successful extract already prints one JSON value. `<file.mp4>` is a path string.

## JSON shape

```json
{"kind":"video","mode":"text2video","prompt":"a slow pan"}
```

`mode` is `text2video` or `image2video`.

## Errors

| Condition | stderr | exit |
|---|---|---|
| missing child command or file | `usage: nexus-video extract-workflow <file.mp4> [--json]` | 2 |
| ffprobe cannot read the file | `cannot read` | 2 |
| file has no workflow comment | `no workflow metadata found` | 1 |
