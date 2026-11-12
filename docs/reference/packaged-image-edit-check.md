# Packaged Image Edit Check

`desktop/tests/packaged/image-edit-flow.mjs` proves one named behavior in a built Windows desktop app: an Image Studio image is edited through the ordinary viewer, the edit survives an app restart, the saved image has the expected pixels, and neither the source image nor the maintainer's real data changes. It runs the app in a throwaway profile, so it is safe on a working machine.

## Command

Run from the repository root in PowerShell, after `npm run build:shell`:

```powershell
$exe = "desktop\src-tauri\target\release\nexus-shell.exe"
$sha = (Get-FileHash -Algorithm SHA256 $exe).Hash.ToLower()
node desktop/tests/packaged/image-edit-flow.mjs --exe $exe --sha256 $sha --out "$env:TEMP\nexus-edit-check-$(Get-Date -Format yyyyMMddHHmmss)"
```

Expected last line on success:

```text
{"ok":true,"verdict":"PASS","control":null,"error":null,"report":"...\\report.json"}
```

| Option | Meaning |
| --- | --- |
| `--exe` | The built `nexus-shell.exe` to test |
| `--sha256` | Its expected SHA-256; any other file is refused |
| `--out` | A folder that must not exist yet; it receives `report.json` (and `edited.png` on a pass) |
| `--mode` | `edit` (default) or `preflight` (isolation and launch only) |
| `--control` | `lost-persistence` or `source-mutation`: inject one defect; the run must fail |
| `--node` | Node runtime for the app's sidecar; defaults to `%LOCALAPPDATA%\Nexus\runtime\node\node.exe` |
| `--png` | Source image; defaults to the synthetic `desktop/tests/packaged/fixtures/edit-source.png` |

## Exit Codes

| Code | Meaning |
| --- | --- |
| 0 | Every phase was observed and the behavioral judge in `desktop/tests/packaged/smoke.mjs` accepted the report |
| 1 | An observation failed (for example `persisted-edit-lost`, `render-mismatch`, `source-changed`, `real-profile-changed`, a stage timeout) |
| 2 | A prerequisite is missing or malformed (for example `executable-identity-mismatch`, `native-abi-unavailable`, `fixture-missing`, an occupied `--out`) |

A run with `--control` never exits 0.

## What It Does

1. Refuses an occupied root and a store path outside the root before any write.
2. Creates a new owned profile folder and points `USERPROFILE`, `HOME`, `APPDATA`, `LOCALAPPDATA`, `TEMP` and the WebView2 data folder inside it.
3. Seeds the PNG and one Image Studio session through the app's own storage code, run under the app's Node runtime.
4. Starts the app inside a Windows job object, so the app, WebView2 and the sidecar all stop with the job, even if the check is interrupted.
5. In the app: opens Image Studio, the seeded session and its viewer (**Edit**), raises **Brightness** from 100 to 110 with ten arrow-key presses, waits for **Edits saved**, then uses **Save image** and chooses the edited version. Downloads go to a folder inside the owned profile.
6. Stops the app, starts the same build with the same profile, reopens the viewer and reads **Brightness** back.
7. Compares the saved PNG with pixels computed from the source (each channel times 1.10, tolerance 2), and checks that the source image bytes and the real-profile folders (`~/.nexus`, `~/.nexus-ai`, `%LOCALAPPDATA%\ai.nexus.shell`, `~/Downloads`) are unchanged.

The owned profile is deleted on a pass and kept on a failure for review.

## Report

`report.json` uses schema `nexus.packaged-image-edit/v1` and holds: run ID, executable hash, candidate commit, owned profile and owner run ID, a status and timestamp per phase, the fixture hash and session identity, the expected and observed Brightness before the edit, after the save and after the restart, the render comparison, the source hashes, the real-profile changes, each launch's process IDs and the judge's findings. It records no tokens and no UI text beyond the save status.

## Prerequisites and Limits

- Windows x64 desktop session, a built executable, and the Nexus Node 22 runtime (the sidecar's native SQLite module is built for it).
- The source tree that builds the executable must have no uncommitted changes under `core`, `desktop/sidecar/src`, `desktop/src` or `desktop/src-tauri/src`.
- It proves this one Brightness edit, save, restart and render. It does not test the installer, other adjustments, brush or text marks, or any other platform, and it is not part of CI.
- The executable is tested from the build tree, not from an installed copy; installed-app proof is a separate check.
