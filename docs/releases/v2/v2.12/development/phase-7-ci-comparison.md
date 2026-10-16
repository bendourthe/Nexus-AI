# Phase 7 terminal CI comparison

Status: FAIL / incomplete reconciliation. This is a source/settings assessment, not authorization to migrate, publish or change protection.

Provider: GitHub Actions. Repository: bendourthe/Nexus-AI. Candidate entry: 30a2e47bddc1280badb91aaeaa78c3bcb9447baf, with uncommitted dependency integration from 092ce3c2f386db020d18eab6d69c0655657b2456.

The [input inventory](evidence/phase-7-ci-inputs.json) retains all 23 workflow hashes, parsed events/jobs, action references, package commands and fresh protection/ruleset responses. The [living runbook](../../../../runbooks/ci-lifecycle.md) states current boundaries and recovery. No workflow, permission, secret, required check or setting changed. The separate cache-pin choice remains pending and does not authorize these differences.

| Field | State | Evidence | Smallest change or remaining proof |
|---|---|---|---|
| 1 - Provider detected | PASS | 23 workflow files define GitHub Actions jobs. | None. |
| 2 - Profiles exist | FAIL | package.json has fast/full/platform script names, but no report/release and no complete five-profile contract. | Agree and prove five bounded profiles that reuse existing validators, with list/JSON/report outputs. |
| 3 - No duplicated validator | FAIL | All 23 retained workflow inventories have zero profile calls; validation lists remain inline. | Replace inline lists with proven profile calls incrementally. |
| 4 - Feature-push runs nothing | FAIL | ci.yml excludes only dependabot pushes; installer-tests/sandbox also accept feature pushes. | Remove ordinary feature-push validation after preserving integration-PR coverage. |
| 5 - Integration gate is complete | FAIL | No complete full/platform profile calls; shell Windows/macOS are absent on integration PR. | Run full and required platform groups on the merge result and include their verdicts in the gate. |
| 6 - No duplicate post-merge suite | FAIL | ci/shell run suites on both PR and protected-branch push; codeql/secrets also repeat. | Separate PR validation from minimal post-merge smoke/provenance. |
| 7 - Post-merge is minimal | FAIL | Protected-branch pushes run root and desktop suites. | Keep only post-merge smoke/provenance. |
| 8 - Release is separate | FAIL | release.yml reruns source validation; semantic-release publishes on main push; no release profile. | Reconcile release ownership, packaging/provenance/dry-run profile, and approved publication triggers. |
| 9 - Aggregate required check | PARTIAL | ci-required and installer-required are unconditional allowlists; only ci-required is protected and it omits shell/installer aggregates. | Preserve the stable context while incorporating intended platform verdicts; separately approve settings changes. |
| 10 - No per-leg required context | PASS | Fresh main/develop protection requires only ci-required. | None. |
| 11 - Scoping is job-level | PARTIAL | ci.yml has no paths filter; unrequired shell and other workflows still use workflow path filters. No fresh excluded-path PR exercise. | Move relevant detection to fail-closed job scoping and observe required-context resolution. |
| 12 - Runner selection | PASS | All parsed jobs are hosted or reuse local hosted workflows; no self-hosted jobs. | None. |
| 13 - Expensive legs pre-merge | FAIL | shell-build selects three OS hosts only on main or dispatch; Windows init skips PR. Installer matrix does cover three OS legs on PR. | Move required shell/Windows legs to integration PR with reviewed job-level scoping. |
| 14 - Immutable references | PASS | All external uses references are 40-character SHA pins with comments; reusable workflow references are local. | Separate pending cache-version updates do not invalidate pin immutability. |
| 15 - Least-privilege permissions | FAIL | Eleven workflows have jobs with implicit inherited permissions. | Review explicit read defaults and necessary job writes; each permission change requires approval. |
| 16 - Caching | NOT PROVEN | Manifest-keyed cache inputs exist; complete cold-install exclusion and cache-content qualification are not proven. | Inventory cache consumers and qualify exact proposed changes. |
| 17 - Concurrency | PARTIAL | CI/shell/installer matrix cancel superseded validation; release and semantic-release do not cancel. Other groups are not fully qualified. | Reconcile all validation groups and retain non-cancelling release boundaries. |
| 18 - Untrusted forks | NOT PROVEN | No self-hosted jobs or pull_request_target; reusable installer jobs inherit secrets. No fresh fork qualification. | Review each secret/write-capable reusable leg and prove untrusted PR behavior. |
| 19 - Reports produced | FAIL | Native coverage/SARIF subsets exist, but no common summary/JUnit/SARIF index/environment metadata contract across profiles. | Produce summary and valid partial metadata on failure, reusing runner outputs. |
| 20 - Reports published | FAIL | Shell coverage upload is Ubuntu-only after success and has no retention-days. Other retention periods vary. | Publish required failure evidence unconditionally with reviewed explicit retention. |
| 21 - Deployment boundary | NOT PROVEN | Tag/dispatch identity checks exist; main-push semantic release has no enforced PR-review/admin boundary. Exact validated-artifact publication is not fully proven. | Reconcile release ownership and separately decide protection over validated artifacts. |
| 22 - Failure recovery | PASS | New living runbook requires local reproduction, affected-gate rerun, environment investigation and release holds. | No blind remote retries. |
| 23 - External settings | PASS | Fresh protection/ruleset responses are retained and documented; no automatic mutation. | Strengthening is a separate concrete approval. |

## Cost, risk and decision

Removing feature-push and duplicate post-merge suites reduces repeated execution. Moving required Windows/macOS checks to the integration PR moves existing validation before merge and can change PR duration; no price multiplier is asserted here. Profiles should reuse current validators. Reporting retains diagnostics without rerunning validation.

Preserve every existing validator, runtime floor, required context and platform obligation. The smallest sequence is: agree and prove profiles, replace inline groups incrementally, separate events and job scopes, then reconcile aggregates/reporting and separately approve protection/release changes.

Decision: pending per change. Nothing was silently declined, deferred, bypassed or approved. NOT PROVEN fields need additional evidence before their exact mutation is proposed. Existing canonical-profile gaps remain open; this report does not satisfy T025's migration completion condition.
