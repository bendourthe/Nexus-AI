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

## Desktop recovery

Image Studio's desktop viewer offers Recovery checkpoints for persisted local PNG images. An agent approval attempt saves the complete current edit history, including undone commands, before access can be granted. Open an image, choose Recovery checkpoints, inspect its caller/run, time and history position, then choose Restore checkpoint and confirm Restore and save. The viewer saves queued edits first and reports a storage failure or concurrent-edit conflict without claiming recovery succeeded. A successful restore replaces the edit history at a new revision and ends that image's agent access; the original PNG stays unchanged. Checkpoints survive application restart, while access grants do not. Older checkpoints remain available through Load older checkpoints.

Deleting Image Studio sessions or folders removes their history, saved edits and recovery checkpoints. Shared original image files stay on disk. Neither this workflow-extraction CLI nor agent HTTP image-edit commands can restore checkpoints; recovery requires the desktop viewer's image-specific grant. The production client, real SQLite/approval boundary and separate-process recovery observations are recorded in [the recovery evidence](../../releases/v2/v2.15/development/v2.15.4-image-checkpoint-evidence.md). Native packaged-window interaction remains to be observed separately.
