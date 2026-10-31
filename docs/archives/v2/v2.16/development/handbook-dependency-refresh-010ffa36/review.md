# Handbook Dependency Receipt Review

## Scope

PR135 merged archive and dependency correction commit a0735c8e into develop as 010ffa364aa56a4bf68039fbd38d8097b75d8162. All eleven pre-merge workflows and all five automatic integration workflows passed. The final full handbook check then correctly rejected six earlier receipts because package.json and package-lock.json changed. This freshness check was missed before the dependency correction was frozen; the refusal is retained. No checker, threshold or evidence input is weakened to repair it.

This metadata-only candidate keeps every handbook source, generated HTML file, theme, stylesheet, script, brand asset and original archived receipt unchanged. The living manifest points to six new review receipts in this directory. Each current snapshot captures the repaired dependency inputs; the old receipts remain at their original archived paths.

## Content Review

For every book, comparison with its prior qualified receipt identifies exactly two changed declared inputs: package.json and package-lock.json. All declared code_inputs and every HTML output remain unchanged. The four dependency patches and Zod compatibility migration do not change the handbook explanations, source examples or interfaces. The actual root suite passes 6,479 tests with 12 skipped, final desktop candidate suite passes 2,373 with one skipped, both workspaces lint and build, and the rebuilt sidecar accepts/rejects actual JSON-RPC requests under installer Node 22.11.0. Source and packaged integration evidence remains in the dependency correction report. No new app, model, GPU, release or hardware qualification is claimed by this receipt refresh.

## Build Review

The unchanged repository generator ran against the repaired dependency state and then passed its read-only --check. All six output HTML files are byte-for-byte equal before and after regeneration. The native full-scope handbook gate verifies the six new snapshots and review artifact hashes; the old stale snapshots were retained as the negative observation. No product package or lockfile is modified by this metadata repair.

## Browser Review

Fresh Playwright bundled Chromium execution covered six books at 2560x1300, 1440x1000 and 390x844 in both reading and presentation modes (36 viewport checks). All reading and presentation roots fit their viewport width. Keyboard next/Home/End, return to reading, first-slide re-entry, fullscreen-failure fallback and no-JavaScript reading passed. No page errors occurred. Fresh PDF generation produced nine pages with no missing reading headings. Reading, presentation and print contact sheets were visually inspected; existing sparse continuation pages remain unchanged and no missing or clipped content was observed. These are fresh observations, not reused browser receipts.

Artifacts: [reading views](reading-contact.png), [presentation views](presentation-contact.png), [nine print pages](print-contact.png), [render observations](fresh-render-observations.json), [print and navigation observations](fresh-print-navigation-observations.json). The original 36 screenshots and six PDFs remain retained in the private review packet with their hashes captured in the observation JSON.

## Preservation

All 247 OPEN obligations, all archived release trees, original raw evidence and original receipts remain unchanged. The native v2.12 stale-destination refusal remains recorded and unwaived. This candidate does not edit app code, dependencies, CI, approval records or spent publication allowances. It has not been published and requires separate authorization for one metadata-only publication push and a new green develop PR. The earlier archive and corrective pushes remain spent.
