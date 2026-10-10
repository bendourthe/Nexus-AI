# v2.12.0 Phase 5: Desktop Settings switches

**Date**: 2026-10-09. **Plan**: [outline-promotion-readiness](../../../../../v2/v2.12/plans/v2.12.0-outline-promotion-readiness.md), T015-T016. **State**: verified; recorded in the single local Phase 5 commit containing this history.

## Outcome

Settings > Security exposes the experimental outline-tools switch and optional one-line summaries switch. Both default off. The summaries switch is disabled while outline tools are off, and its saved preference survives disabling/re-enabling the tools. The UI reads the effective state again after saving rather than trusting the setter's acknowledgement. A failed status read disables further writes and displays the error.

Recognized environment overrides are returned as optional status metadata. When the outline override is active, optional `storedEnabled` preserves the saved outline preference during summaries-only writes; a missing saved value disables that write. Each override makes its corresponding control read-only, shows the winning value, and explains how to return to the saved preference. Invalid environment strings do not own a control. The request and setter schemas are unchanged; effective flag evaluation is unchanged. The handbook now describes this Settings flow.

## Plan delta

Phase 5's declared prerequisite is Phase 1, so its source and browser verification proceeded while Phase 3's local hook repair was settled and Phase 4's OCR smoke ran. Commits remain separated by phase. The queue still contains v2.13 after v2.12 integration; no parallel plan qualifies. The session's strong/high capability is retained; live model switching is unavailable and no lower tier was substituted.

The existing 320-pixel page overflow came from the adjacent parse-document setting identifier. One wrapping style on that identifier was necessary to make the requested screen usable at the verified width. The new outline section owns its reading-width cap and visible keyboard focus. No unrelated Settings behavior was changed.

## Fresh verification

- Full desktop suite: 244 files pass, 2,245 tests pass, one existing skip, using four workers after the timing failure described below. The focused outline Settings suites pass 24 tests. The earlier targeted Phase 4 runner/enrichment/document/Settings suites pass 46 tests in five files.
- Strict desktop lint, desktop TypeScript check, root read-only TypeScript check, and Vite production build pass. The Vite build retains its existing large-chunk warning.
- The guarded production sidecar rebuild passes. Existing generated files were checked before rebuilding and recorded afterward; the developer's root native addon was not rebuilt.
- Real Chromium 153.0.8010.12 renders the production SecuritySettings component with its real sidecar status/setter dispatcher and an isolated in-memory settings store. Unrelated security, parsing, and audit surfaces use controlled clients. This is a component preview through real IPC handling, rather than a full native Tauri app or a write to the user's saved settings.
- Keyboard Space, visible-label clicks, outline enable/disable, summaries preference restoration, and page reload were exercised. Four writes and the following effective-status reads were observed at the dispatcher. Runtime/console errors: zero.
- Widths 320, 768, and 1,200 have no horizontal overflow. The new section remains inside each viewport and focused labels have a visible two-pixel solid outline. The final narrow screenshot was inspected visually. The evidence source SHA-256 matches the current component.
- The visual detector passes with zero remaining findings. Nine instances of the existing reading-width rule are explicitly allowlisted: the pre-existing Security, parsing, and audit introductory paragraphs at each of three widths. The new outline section has no exception. The retained [evidence](../evidence/phase-5-settings/browser.json) records measurements, writes, and source identity; [visual report](../evidence/phase-5-settings/visual-report.json) and [narrow screenshot](../evidence/phase-5-settings/settings-320.png) accompany it.

## Review and troubleshooting

Correctness, testing, maintainability, project-standards, and API-contract lenses reviewed this phase separately from Phase 3/4 changes. The successful-write/failed-status-read path originally kept stale controls usable. A failing regression demonstrated the risk of a later summaries write re-enabling outline tools, then passed after the controls were disabled. An acknowledged write whose effective state differs is also covered. A reliability pass also found that editing summaries with the outline environment override enabled could persist the effective true value over a saved false preference. A real component/dispatcher regression failed before the fix and passed afterward, confirming the saved false value and effective-off state after override removal. Correctness and API-contract rechecks found no remaining issue; the reliability failure-path review also returned no finding. The review combines deterministic tests with source-contract review.

The first refreshed full-suite run failed one unchanged Windows video-process cancellation case: a 1 ms timeout races a 20 ms abort under concurrent load. All 21 cases in that file passed in isolation; the full suite then passed with four workers. No unrelated source or test was changed.

Early browser attempts are retained in ignored scratch evidence: route fallback rendered the app instead of the probe; direct input clicks intercepted the decorative switch span, so verification uses the visible label; the first narrow run exposed the setting-identifier overflow. The final run resolves these conditions. None of the failed attempts is counted as a pass.

## CI impact and remaining gates

CI impact: no pipeline changes. Existing desktop tests, lint/typecheck, root tests/build, and sidecar build cover this change. No push, pull request, or remote CI run occurred for this phase. Pipeline event/cost reconciliation belongs to the final phase.

The Settings gap DF-v211-4 is resolved by this experimental, off-by-default control flow and its evidence. This verification supports the Settings control flow; it does not promote document answer quality, OCR performance, or summary quality. Phase 6's document experiment and Phase 7's human field-use gate remain separate.
