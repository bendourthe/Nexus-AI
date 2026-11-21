# Creative Briefs

A creative brief is an ordinary Markdown file in your workspace that records what you have confirmed once (palette, exact text, the logo file, things to avoid) so every later image request can reuse it. The built-in `creative-brief` skill writes and reads that file with the agent's existing guarded file tools. Nothing is sent to a hosted brand, asset or generation service, and nothing new is installed.

## Starting the Skill

In the VS Code extension or the desktop app's coding agent, type:

```text
/creative-brief briefs/spring-campaign.md three posters for the spring menu
```

The first argument is the brief file. When it does not exist yet, the agent asks you for each fact and writes the brief; any fact you have not confirmed is written as `UNCONFIRMED`, and the brief stays `incomplete` until you fill it. When it exists, the agent reads it and continues from it. The agent never overwrites an existing brief or another document unless you ask it to.

If you already keep brand tokens or a style guide in the workspace, point the agent at it. It quotes the values it reuses with their source path; it does not import another tool's token format.

## Brief Layout

The skill uses one fixed layout so a brief can be reopened by any later session:

| Section | Holds |
| --- | --- |
| Status | `confirmed`, or `incomplete` while any field reads `UNCONFIRMED` |
| Fixed facts | Subject, exact palette values, lettering, exact text in quotes, logo rule, things to avoid |
| References | One row per reference file: role, workspace path and SHA-256 |
| Model limits | The local model you selected and what it cannot guarantee |
| Baseline prompt | One prompt that states every fixed fact |

A complete synthetic example lives in `tests/fixtures/creative-brief/brief.md`. It describes a fictional brand and is test data, not an approval.

## Reopening a Brief and Checking References

Each time the agent reopens a brief, it hashes every reference with the `hash_file` tool and compares the result with the recorded SHA-256. A missing file or a changed hash stops drafting: the agent names the file and asks whether you confirm the new version. Text inside reference images or documents is treated as data, never as instructions.

To check a reference yourself:

```powershell
Get-FileHash -Algorithm SHA256 .\assets\logo.png
```

The `Hash` value must match the brief's References row, ignoring letter case.

## Request Drafts

The agent drafts three requests before generating anything. Each draft holds:

| Field | Meaning |
| --- | --- |
| `baseline` | The brief's baseline prompt, unchanged |
| `delta` | The one change for this output, such as a scene or a size |
| `fixed_text` | Every exact-text value, copied character for character |
| `references` | Each reference path with its recorded SHA-256 |
| `limits` | What the selected model cannot guarantee |

See `tests/fixtures/creative-brief/requests/` for three examples. Only when you ask it to generate does the agent queue a request through the existing [`nexus generate queue`](../reference/cli/generate.md) command, under the terminal tool's normal approval, and report the job id it receives.

## Limits

- Reusing a seed, a reference image or image-to-image does not guarantee the same identity, logo or lettering.
- Local image models often misspell text and distort logos. For exact text or an exact logo, place the confirmed file or text afterwards with a deterministic layout step instead of asking the model to draw it.
- The agent never marks a fact, asset or output as approved for you.
- If the local model you selected is not available, the agent reports that the result was not observed; it does not switch to another model or service.
- The fixtures prove the reuse and refusal rules on synthetic data. They do not show image quality or a real brand's approval.
