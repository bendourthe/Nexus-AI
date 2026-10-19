# Docs cleanup report - v2.15

Audit mode only: no file moved.

## Phase 1 (2026-10-19)

- `node scripts/check-docs-layout.mjs`: `canonical layout OK (no docs/versions|docs/archive/versions wrappers)`, exit 0.
- New documents this phase: `development/v2.15.0-ledger-conversion-decisions.md` and `development/v2.15.0-ledger-conversion.md`. Both are release-scoped records under the active release tree, the right place by the lifespan rule. Neither is a scratch document.
- Proposed cleanup: none.

## Phase 2 (2026-10-19)

- `node scripts/check-docs-layout.mjs`: `canonical layout OK`, exit 0.
- Changed documents: ten known-gaps ledgers, converted in place (format only, recorded in `development/v2.15.0-ledger-conversion.md`), and that record. No document moved, and no scratch document was created.
- Proposed cleanup: none.
