# Release Verification

## Scope

Release plan: [v2.16.1](../../plans/v2.16.1-release-completion.md), final phase T008-T011. The original goal remains both actual v2.16/v2.17 releases followed by the full codebase/UI/behavior review. Worktree: `C:/Users/bdour/.codex/worktrees/v216-v217-release/Nexus-AI`, branch `codex/v216-release-completion`, base develop `42a4406dbef75142e0eb34a451e767f7643d597c`.

## Plan delta

Disposition: nonblocking implementation correction within T005/T008. Independent actual CLI probes exposed hidden HTML-heading truncation and literal comment-marker failures inside code spans. Three bounded correction/rerun cycles repaired the observed single-line and multiline routes and added 11 regression cases. No new inference, model admission, runtime override, external service, CI-topology rewrite or release-scope expansion resulted. Pending integration and package-delivery tasks retain their original IDs. The queue comparison preserves all 384 unassessed v2.17 obligations and does not replace them with the narrower evaluator proposal.

## Implementation

Phase 1 qualification is retained in local commit c6928b1f: five real codec transcripts pass, four fit attempts retain their observed outcomes, contradictory memory reporting keeps fit HOLD, E-5 remains unrun and zero slots are admitted. Phase 2 local commit e92370dc repairs exact notes, protected-main preparation and tag/source guards with focused and actual Git-boundary evidence. The final phase adds the comment/code-span corrections, full application verification, package activation and required closeout records. Source hashes, full observations and limitations are bound in [final validation](../v2.16.1-final-validation.md) and [its receipt](../v2.16.1-local-validation-receipt.json).

## Verification

Corrected-source root coverage exited 0: 6,528 passed/12 skipped, 598 files/three skipped, unchanged coverage gates. Desktop coverage exited 0: 2,373 passed/one skipped in 261 files. Root/sidecar/web builds, fast profile, desktop checks, 77 affected installer tests, production audit, architecture and six full handbook bindings pass. The Windows candidate installs and activates in supported VS Code/Electron, executes a real packaged SQLite query and registers the expected command in isolated application storage. The final independent extractor CLI retest passes all 26 exact-output/status cases; 32 focused tests pass. Earlier failed reproductions and the interrupted first packaging step remain recorded.

## CI impact

New regressions remain under existing root Vitest discovery. Phase 2 owns the two release workflow changes. This phase changes no ordinary CI topology or protection setting. The terminal per-field comparison, live protection/aggregate observations, retained canonical-policy differences and required hosted gates are in [last-phase evidence](../v2.16.1-last-phase-evidence.md#cicd-coverage). Existing CI obligations remain open in v2.17; no skipped external job is counted as a platform pass.

## Preservation

Every edited existing source, test, plan, tracker and evidence file passed the official edit guard. No baseline acceptance was used. The contributor/beginner guides remain unchanged under their reported conflict condition; the release runbook states the supported path. The automatic development-log summary and unrelated existing work remain preserved. Shared Git identity, hook settings, original archives and all inherited gap bodies remain unchanged. No destructive cleanup occurred.

## Current disposition

T008 is complete, giving 8/11 checked plan tasks. Independent Goal review found supporting local evidence and no additional executable blocker; required final records now exist. T009-T011 remain pending publication, green integration, reviewed release-source preparation and actual published/downloaded package acceptance. No new release exists at this checkpoint. v2.17 implementation/release and the requested final full review remain required.
