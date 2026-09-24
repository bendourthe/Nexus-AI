# `nexus image`

Read a Nexus or ComfyUI workflow embedded in a PNG. Output rules: [contract.md](contract.md). Does not require a running sidecar. This command forwards to `bin/nexus-image.mjs`.

## Subcommands

`nexus image` takes the child arguments of `nexus-image`. The only child command is `extract-workflow`.

`nexus image [--json] extract-workflow <file.png>`

`--json` is accepted and does not change stdout, because a successful extract already prints one JSON value. `<file.png>` is a path string.

## JSON shape

Pretty-printed workflow object. `mode` is one of `txt2img`, `img2img`, `inpaint`, `outpaint`.

```json
{"mode":"txt2img","prompt":"a red door"}
```

## Errors

| Condition | stderr | exit |
|---|---|---|
| missing child command or file | `usage: nexus-image extract-workflow <file.png> [--json]` | 2 |
| file cannot be read | `cannot read` | 2 |
| PNG has no workflow chunk | `no workflow metadata found` | 1 |
