# CLI Shutdown Proposal

## Applied Repair

The current candidate is [shutdown with metrics cleanup](with-cleanup/proposed-cli-shutdown-with-cleanup.patch), limited to `bin/nexus.mjs`. It lets Node finish pending work while retaining the intended exit code, and ends golden-task metrics in a `finally` block if a task throws. The owner subsequently approved this exact patch and a focused process regression test. It is applied in the local closing branch and awaits integration. The [repair evidence](../../v2.16.0-cli-shutdown-repair.md) records 22 passing actual-file cases across Node 22/24 and the fresh local gate. The earlier evidence below remains historical candidate evidence; it does not claim every command was exercised.

The original Node 24 CLI completes both successful controlled golden tasks but aborts at shutdown. The initial exit-code-only draft removed those aborts and passed six option cases on each runtime, but it hung when a thrown task error left metrics polling active. That draft is retained as a rejected proposal. The revised cleanup draft preserves the original error, records only an aborted-task failure internally when no result exists, and stops the sampler before natural exit.

## Evidence

Before approval, the exact revised source was loaded temporarily without editing the application. All twelve original option cases passed across Node 24.13.0 and pinned Node 22.11.0. Ten additional cases passed across those runtimes: an actual failed task returning 1, a metrics-output exception reaching the outer handler and returning 2, an HTTP 500 with metrics returning 1, an injected runner exception with pending metrics returning 2, and complete 2765-byte help output through a delayed pipe returning 0. The injected-exception runs terminated in about two seconds with one metrics request; the exit-code-only draft exceeded the nine-second diagnostic limit and made nine requests on both runtimes.

These use synthetic loopback model responses. No candidate or holder model inferred, no E-3/E-4/E-5 trial was reopened, and no catalog or default changed. Fault injection replaces one runner operation and redirects the metrics endpoint to the controlled server. It is a failure-path test, not production model evidence.

The first extra matrix had invalid Windows loader URLs; a later draft had a CRLF patch-context mismatch. Those setup failures are retained and excluded from product proof. The successful revised matrix verifies that the CLI ran, checks its actual error/output, and rejects startup failures masquerading as a task's expected exit code. [Hashed artifact manifest](with-cleanup/proposal.json).

## Scope Decision

This changes shutdown behavior for every command using the shared entrypoint. The initial plan changed the sampler-option validator; `bin/nexus.mjs` is outside those planned paths and the signed run has no automatic path-scope grant. Native record answer captured the owner's separate scope approval and closed blocker 1. Actual-file boundary checks, CLI/metrics tests and the full root coverage gate now pass; closing integration is pending. This proposal grants no migration authority for DF-151 or WN-22 and does not make the minor complete.
