# Archive Publication Dependency Correction

## Status

Locally verified candidate based on archive commit `506e8c5e1157`. [PR135](https://github.com/bendourthe/Nexus-AI/pull/135) remains open and unmerged: its push and merge-result CI runs fail the unchanged production audit. This correction has not been published or remotely validated. The owner's one archive publication push is spent; another corrective push requires separate authorization.

## Changes

Upgrade body-parser 2.3.0 to 2.4.0, fast-uri 3.1.8 to 3.1.9 and undici 7.30.0 to 7.30.1 with explicit override floors. Upgrade both workspace Zod declarations from 3.x to a patched 4.x floor (4.6.6, resolved 4.6.7). The root workspace lock is the only lockfile. The targeted update also deduplicates the mutation-server-protocol copy of Zod 4.6.5.

Zod 4 needs explicit string-key schemas for five existing records. Six object fields using `unknown` also need explicit optional status to retain their Zod 3 omission behavior. Eight new protocol tests capture those contracts, structured values and strict rejection of missing keys or unexpected fields. No permission, transport or handler policy changes are included.

The [Zod advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) identifies patched version 4.6.6, requiring a major-version migration for this project's 3.x dependency. The [body-parser advisory](https://github.com/advisories/GHSA-27r3-jxmh-p828) identifies 2.4.0 as the patched 2.x release. The evidence retains all audit advisory URLs and the exact resolved versions.

## Verification

The [captured evidence summary](evidence/2026-10-23-archive-audit-correction.json) records successful root build, desktop typecheck, web and sidecar builds, both workspace linters, repository checks and test-tampering checks. The production gate passes with zero blocking and zero allowlisted findings; the raw audit still contains the same two low KaTeX/Mermaid findings. No threshold or allowlist was changed.

Separate full runs passed 6,479 root tests with 12 skipped and 2,373 desktop tests with one skipped. Initial concurrent runs had ten root and two desktop timing/resource failures and are retained. All 57 tests in the initially failing root files passed on both the unchanged base and candidate; the later separate full runs had zero failures. The new protocol test first failed six omission cases, then passed all eight cases after compatibility edits. An independent comparison of the actual Zod 3 base schemas and Zod 4 candidate schemas confirms the six accepted omission cases and strict rejections match.

The rebuilt sidecar ran under installer Node 22.11.0 in a disposable home. It reached ready state, accepted a valid ping, rejected malformed parameters, accepted a second valid ping, rejected malformed JSON with code -32700 and exited cleanly. No fresh UI/browser qualification or new release is claimed.

Two private reporting wrappers encountered Windows console encoding errors after successful commands. The original command receipts and raw test JSON remain retained; final sidecar build and smoke were run separately using UTF-8 output.

## Preservation

All 247 OPEN obligations remain unchanged in the v2.16 ledger. No archived plan, raw evidence, native approval binding, workflow, audit allowlist or previous spent push allowance is changed. The recorded v2.12 stale-destination checker refusal is preserved. This candidate adds no release or tag and makes no global MINOR COMPLETE claim. Merge remains conditional on green required checks after any separately authorized publication.
