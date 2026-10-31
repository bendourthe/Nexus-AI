# Phase 3 Session History

Date: 2026-10-25 (America/Los_Angeles).
Plan: [v2.16.0 trial](../../plans/v2.16.0-adoption-humanizer-handwired-nemotron-deepseek.md), T008-T011.
Entry commit: `f680738d`; queue: one member, 7 tasks done and 19 open.
Worktree: `C:/Users/bdour/Documents/Projects/Development/Nexus-AI-v2.16.0-adoption-humanizer-handwired-nemotron-deepseek`.

## Implementation And Verification

Added the runner's non-negative integer `num_gpu` option. New tests first failed on the old allowlist, then all 22 focused tests passed after the two-line production change. The build, JavaScript syntax check and canonical fast profile pass. A spawned CLI smoke with a controlled loopback model completes a real golden task and forwards the CPU setting on both turns under installer-pinned Node 22.11.0. Negative/fraction/string/unknown options exit 2 without requests. The host Node 24 baseline independently reproduces a native shutdown assertion; its failure remains visible.

T009/T010 record not run after E-3 HOLD. The A/B record has no inferred values or budget. Recalculation preserves HOLD and dependent not-run states. No E4B inference or model quality measurement occurred.

## Plan Delta

Primary disposition: Incomplete. Phase-entry source review finds the runner still has its original six-key allowlist and no GPU override. T008 explicitly remains independent after model-wide rejection. Captured raw fixtures also need narrow no-text attributes to retain their immutable hashes across Windows checkouts, an evidence-portability detail omitted in Phase 2. The new attribute entries cover only this probe and survive release archiving. Existing CLI shutdown under host Node 24 is reproduced with baseline options and recorded as WN-22; the shipped Node 22 verification passes. No unrelated production refactor is made.

Remaining phases retain both holder slots, record the E-3 runtime HOLD and reopen conditions, and follow full-decline no-tag delivery. The final phase must retain the Node 24 limitation and the generic checker mismatch. No silent waiver or global runtime replacement is made.

## Post-Phase Sequence

Gitignore: zero new patterns; raw fixtures and observations are intentional, temporary tooling stays outside git. Test review reuses fresh scoped receipts. CI impact: existing discovery, no pipeline change. Known gaps: WN-22 appended with owner and next step, inherited entries unchanged. Audit: no moves/deletions and no raw-byte formatting. DEVLOG/tracker/history update only this plan. One ASCII local commit closes Phase 3; no push or remote CI.

## Evidence

[Phase 3 evidence](../v2.16.0-phase3-evidence.md) links both CLI observations, the not-run A/B record, and the exact supported-runtime proof.
