# CI profile correctness proposal

Status: Verified in an owned temporary copy; approval required before application.

The current runner cannot launch npm on this Windows host, and its report profile returns success for partial, missing and unrecognized results. The proposed patch makes incomplete results return a nonzero exit, treats unrecognized statuses as failures, excludes prior report.json aggregate outputs, launches npm through the installed Node/npm CLI on Windows without shell execution, and includes process-launch errors in redacted diagnostics. Profile membership and validator lists retain their current behavior.

## Exact change

Apply [the patch](evidence/phase-7-ci-profile-proposal/ci-profile-correctness.patch) to scripts/ci-profile.mjs and add tests/unit/scripts/ci-profile-report.test.ts. The [verification receipt](evidence/phase-7-ci-profile-proposal/verification.json) pins the original source, candidate, tests and retained outputs. This proposal is a bounded correctness repair; it does not complete the broader CI migration.

## Evidence

The original runner reproduced false success for partial and unknown statuses, empty input and a prior aggregate alone. The patched report CLI produced the expected status and exit for 13 cases, twice each. All 16 focused tests passed. The real fast profile ran all five validators on Windows and returned PASS. A deliberately unavailable platform executable returned FAIL and included its ENOENT diagnostic. Git validated the patch against the captured original index without applying it. The original repository profile still matches its captured SHA-256; official edit-guard diff reported unchanged and no accept was run.

## Approval and remaining work

Approval is requested only for this exact profile patch and its regression tests. No workflow, permission, secret, required-check, settings or remote publication change is included. The remaining CI contract differences in [the comparison](phase-7-ci-comparison.md) remain open. Existing guarded budget-test, generated-HTML and handoff changes remain awaiting their separate approval.

The cicd-architect skill, Step 9.4, requires: "Obtain explicit approval per change. Silence is not approval". It also excludes pipeline changes from upfront implement approvals. The profile has no edit-guard baseline; approval must cover applying this patch on the unchanged captured current file.
