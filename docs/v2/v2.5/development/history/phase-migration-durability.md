# Migration durability Phase 1

Plan: `docs/v2/v2.5/plans/v2.5.0-migration-durability.md`

Shared helper `core/storage/preMigrationSnapshot.ts`. Chat history refuses a half-migrated file. Memory and generation databases snapshot only when `user_version` is behind, and only when they own a file.

## Plan delta

**Incomplete.** The ABI mismatch blocked the fail-before and pass-after quotes. See `QG-v250-2` and `docs/v2/v2.5/development/v2.5.0-migration-durability-evidence.md`.
