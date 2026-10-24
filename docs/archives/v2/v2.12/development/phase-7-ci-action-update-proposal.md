# Remaining CI action updates

Status: Exact patches prepared and checked against the captured index; separate approval required per change.

## Cache action update (PR 42)

The [cache patch](evidence/phase-7-ci-action-update-proposal/cache.patch) updates four existing actions/cache references in ci.yml, release.yml and shell-build.yml from 27d5ce7f107fe9357f9df03efb73ab90386fccae (v5.0.5) to 55cc8345863c7cc4c66a329aec7e433d2d1c52a9 (v6.1.0). The PR originally covered three references; the current CI also has a second runtime-audit cache reference, which this proposal includes. Both exact commits and action definitions resolve through the official GitHub API and both use Node 24. Inputs, cache keys/paths, events and permissions retain their current declarations. Hosted cache behavior still needs integration verification.

## SARIF upload repair (PR 43)

The [SARIF patch](evidence/phase-7-ci-action-update-proposal/sarif.patch) replaces the sole scorecard.yml upload-sarif reference f411752efdf656cb71aa17b755b22c890960da1d with 458d36d7d4f47d0dd16ca424c1d3cda0060f1360. GitHub returned HTTP 422 for the current pin twice. The replacement resolves to the official v3.35.5 backport commit and its upload action uses Node 20. The existing v3.35.5 version comment is preserved. Existing SARIF input, triggers and permissions retain their declarations. Authenticated upload remains unproven until approved integration verification.

## Verification and disposition

The [verification receipt](evidence/phase-7-ci-action-update-proposal/verification.json) pins both patches and source files. Git checked each patch against the captured temporary index without applying it. The [vendor contract evidence](evidence/phase-7-ci-action-vendor-contracts.json) retains official responses, definitions and the unresolved old pin. The [live PR comparison](evidence/phase-7-remaining-pr-source-comparison.json) proves that both changes are absent from current main, so neither PR was closed as already superseded. The proposals do not authorize merging the old PR branches. After approved changes pass and merge through the current integration branch, those PRs can be reconciled against the integrated source.

The five-profile migration and every other CI comparison difference remain separate work. The cicd-architect skill, Step 9.4, requires explicit approval per change and excludes pipeline changes from upfront implement approvals. No original workflow or repository setting was changed.
