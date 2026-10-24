# v2.13 embedding admission

Decision: HOLD. Retain the occupied embeddinggemma:300m default job and existing Nomic/Qwen alternatives. Authority is the owner's approved plan: Phase 3.1 explicitly requires HOLD and skips migration when evidence is missing. No model-admission approval is inferred from the implementation authorization.

[Phase 2 result](embedding-eval-results.json) records Ollama 0.32.15 refusing the candidate with HTTP 412 / RUNTIME_TOO_OLD. The preflight digest and 378346995 artifact bytes identify the requested distribution, not an installed or qualified model. Quality, latency, rejection, vector validity, resources, tiers, coexistence, offline behavior, terms and supported context remain HOLD.

T007 is completed as this conditional decision; T011 is completed as its verification/documentation checkpoint. T008 (cross-store activation design), T009 (live identity enforcement) and T010 (migration/cutover/rollback) are conditionally skipped and remain unchecked. They were not implemented. [Machine disposition](embedding-migration-disposition.json) pins this decision and unchanged production hashes.

No settings, catalog, recommendations, job map, live memory database, old model or HNSW index was changed. The existing vector-space limitations are not claimed fixed. Independent Image Studio phases proceed under the plan.

Revisit only after a compatible runtime and all required hardware/resource/context/offline/distribution evidence are measured. A passing future report still requires the plan's separate model-admission decision before default changes.
