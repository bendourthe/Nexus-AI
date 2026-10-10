# CI lifecycle and recovery

Nexus uses GitHub Actions on bendourthe/Nexus-AI, with develop for integration and main for release. This records current settings and recovery procedure, not complete canonical CI conformance.

## Current protection settings

On 2026-10-10 UTC, both branches required only ci-required from GitHub Actions (application id 15368), with strict up-to-date checks disabled. Required pull-request reviews and restrictions were unset, administrator enforcement was disabled, and the ruleset list was empty. These settings do not establish a mandatory pull-request boundary or prevent administrator bypass. No setting was changed.

From the repository root, with an authenticated GitHub CLI:

1. Run `gh api repos/bendourthe/Nexus-AI/branches/develop/protection`. Expect JSON with required context ci-required.
2. Run `gh api repos/bendourthe/Nexus-AI/branches/main/protection`. Expect the same required context.
3. Run `gh api repos/bendourthe/Nexus-AI/rulesets`. The recorded response was an empty array; review any later rulesets before relying on this snapshot.

## Local and publication order

Verify and commit non-final phases locally. At the final phase, complete local gates and terminal CI reconciliation, then publish once through the integration pull request. Required checks must pass on the merge result before merging. A failed integration holds release work. Version changes, publication and cleanup retain their recorded authorization boundaries.

The package has fast/full/platform script names, but their contents do not implement the complete five-profile contract; report/release profiles are missing. Workflow command lists remain inline. Use specific repository validators and retained logs while migration is pending; a script name is not complete coverage.

## Failure recovery

1. Classify the failed check and reproduce its exact command locally on the candidate with the same runtime floor.
2. If reproduced, fix the cause, rerun the failed check and affected local gate, then make one narrowly scoped stabilization commit. Publish only within the applicable recorded approval and rerun budget.
3. If not reproduced, retain the failure and investigate the environment, dependency or runtime-floor difference. Do not rerun blindly until green.
4. A post-merge smoke failure is an integration incident and holds release work. A release failure also stops tag/publication work until the candidate is reconciled through integration.

Workflow, permission, secret and protection changes each require a concrete separate approval. See [the terminal v2.12 comparison](../releases/v2/v2.12/development/phase-7-ci-comparison.md).
