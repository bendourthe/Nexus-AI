# v2.13 conditional migration design disposition

T008 is SKIPPED because admission is HOLD. No activation pointer, writer-quiescence protocol, staged generation, spike or cross-store recovery implementation was created. T009 and T010 are also SKIPPED; live vector identity and interrupted rebuild/activation/rollback are not claimed implemented.

The approved conditional branch requires this result when any admission evidence is missing. The current default remains active, and production paths are unchanged. See [admission](embedding-admission.md), [machine disposition](embedding-migration-disposition.json) and [Phase 3 evidence](v2.13.0-phase3-evidence.md).

If admission later succeeds, reopen T008-T010 and implement their full recovery gates. This document supplies conditional evidence only.
