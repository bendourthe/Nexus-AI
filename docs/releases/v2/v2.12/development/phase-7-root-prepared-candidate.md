# Complete prepared root candidate

Status: PASS for the prepared temporary candidate with four workers; original-tree and integration certification remain pending.

The complete root suite passed all 579 test files: 6,215 tests passed, 12 existing skips and zero failures. Coverage is 87.29% lines, 76.48% branches and 87.30% functions, above unchanged 80%/75%/80% thresholds. Statement coverage is 85.13%. Every test, assertion, timeout and threshold was retained; the four-worker CLI setting controls host concurrency only.

## Candidate binding

The [input manifest](evidence/phase-7-root-candidate-inputs.json) captures 3,522 original paths and nine prepared repairs created in a new owned temporary directory: the guarded context-test proposal, six verified HTML outputs, the CI profile proposal and its added regression file. No original guarded file was overwritten or accepted. Before and after the full run, every captured original source hash and every prepared candidate source hash matched. Historical benchmark fixture hashes were also preserved. This is internal-compatible evidence for this exact prepared candidate; it is not a claim that the original worktree or integrated release passed.

## Failure investigation

The initial complete run used default worker concurrency and failed nine tests in six files. Four-worker diagnostic execution passed all six affected files without source, assertion or timeout edits. The subsequent complete four-worker run passed with coverage. Both complete runs and the diagnostic log are retained. The diagnostic wrapper exited 1 only while printing a Unicode check-mark to a Windows cp1252 console, after recording the successful test exit and log; no test rerun was used to hide that print failure. This host exposed 20 logical CPUs and 32 GiB memory. The result supports a host-concurrency explanation for the observed failures; it does not prove every default-worker failure on every host has that cause.

## Evidence and next gate

The [retention receipt](evidence/phase-7-root-prepared-candidate/retention.json) pins all retained logs, full JSON results, coverage reports and benchmark artifacts. The original-tree gate still requires approved application of the prepared changes and fresh verification there. The larger CI profile/event/platform/report contract, integrated installer and release gates remain open. No workflow, repository setting, PR, branch, tag or release changed during this check.
