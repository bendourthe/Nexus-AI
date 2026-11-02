# Releases

## Source Preparation

Complete local implementation and required validation before publishing the plan branch. Merge its pull request into `develop` only after required checks pass. Prepare synchronized version files and changelog notes from the actual integrated changes on a separate reviewed branch into `develop`, then integrate `develop` into `main` through a reviewed pull request. Do not commit release files directly to protected main.

The old automatic-release paragraph in `CONTRIBUTING.md` describes the former workflow. It no longer applies: source preparation is reviewed, and the workflow never writes a release commit onto main. The separately named `CONTRIBUTING-BEGINNERS.md` guide is retained.

## Readiness

[Release Readiness](../../.github/workflows/semantic-release.yml) is a manual, read-only check of a selected source ref. It validates installer artifact declarations and extracts the exact package version's notes from `CHANGELOG.md`. It creates no commit, tag or GitHub release. The optional [.releaserc.json](../../.releaserc.json) defaults to dry-run commit analysis and notes generation, with no file-writing or publication plugins.

The shared [notes CLI](../../scripts/extract-release-notes.mjs) accepts three arguments: semantic version, changelog path and output path. It accepts H1/H2 release headings with an optional `v` prefix, preserves subsections and fenced examples, and rejects malformed versions or missing, duplicate or empty notes. Workflow callers pass the version as a quoted argument and use the output file directly, so note lines such as `EOF` cannot terminate a workflow-output delimiter.

## Publication

After required checks pass, create an annotated `vX.Y.Z` tag for the exact reviewed main commit under the release's recorded authority. [release.yml](../../.github/workflows/release.yml) checks package/tag equality, annotation, checked-out commit identity and main ancestry before packaging. Its manual dispatch accepts only an existing tag matching the selected source commit; it cannot attach a different source tree to an old release.

The workflow builds three native VSIX packages and the complete Windows installer. One `SHA256SUMS.txt` covers every attached binary. The final job extracts notes from the same checked-out commit and rechecks the remote annotated tag before publication. A missing, lightweight or moved tag blocks publication. Successful workflow completion must be followed by downloading the published assets, verifying every checksum and version, and running the package/installer acceptance named in the release plan. A tag or GitHub release page alone does not prove complete delivery.

## Recovery

If required source checks fail, repair and revalidate locally before corrective publication. If packaging fails, preserve the failed run and inspect its exact source identity and diagnostics. Rebuild an existing tag only from the matching reviewed source through the explicit dispatch. Do not move a published tag, bypass branch protection or publish a second release independently of the artifact workflow. Destructive history or tag changes require the user's explicit decision.
