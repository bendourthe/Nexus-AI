# Frozen v2.13 evaluation and image ownership

Machine-readable authority: [embedding-eval-contract.json](embedding-eval-contract.json), post-v2.12 develop90b95f2439959ddfa4c902d287a6d673df785dd9. Fixture manifest SHA256 09bd598eaae038e3c2b4f94dd54fd4c7fd7a7499d5377947a1df3de55227ba13. Held-out corpus has20real source excerpts,60answerables,20contrastive hard negatives and20unanswerables. Three answer queries share each source group; report group-resampling sensitivity alongside paired query bootstrap. This is bounded excerpt retrieval, not whole-product answer quality. Separate tuning fixture exists; never tune on held-out labels or rewrite scored inputs.

## Retrieval recipe and gates

Baseline embeddinggemma:300m digest85462619ee721b466c5927d109d4cb765861907d5417b9109caebc4e614679f1,768dimensions,2048tokens,current raw-input adapter behavior. Nomic remains alternative, not occupied default. Candidate embeddinggemma-2:270m,768dimensions,8192supported tokens; resolve/pin digest after explicit provisioning before scoring or HOLD.

Use actual MemorySubsystem/MemoryStore searchHybrid, FTS5 prefilter and RRF; fixed clock/rows. Primary20chunks are below HNSW threshold1000; separately exercise enabled path. Genuine vectors only; reject missing/count/dimension/finite/zero-norm violations and never use heuristic fallback or pad mismatches.

Candidate prefixes follow [official card](https://ai.google.dev/gemma/docs/embeddinggemma/model_card_2) and [guide](https://developers.googleblog.com/en/embeddinggemma-2-the-developer-guide/): code queries task: code retrieval; document queries task: search result; corpus title/text. Baseline matches actual current consumer. Record both distinct recipes.

Promotion requires+5percentage-point recall@5 over60answerables,paired bootstrap95%lower bound>0(seed21320261014,10000resamples),p95end-to-end latency<=1.2baseline,no increase in accepted nonempty results on20unanswerables,zeroinvalid/mixed vectors. Frozen rejection:maxcosine>=0.65amongreturnedtop-five rows against actual query vector. Hard negatives reported separately. Thirty warm repetitions/five cold loads per workload;45minute run cap,60second request timeout,exclusive lease,512MiBprovision ceiling. Ordinary use needs process-level blocked non-loopback evidence.

## Resource and distribution

Reference RTX3080TiLaptop16GiB,34,014,523,392bytesRAM,20logicalCPUs. Existing embedding job budget1GiBVRAM. Engineering evaluation ceiling8GiBRAM equals most restrictive current cache-RAM policy;2GiBcoexistence reserve follows reference working-memory policy. These bound evaluation, not new embedding defaults. Baseline observed resident/GPU allocation681417113bytes. Peak processRAM,CPU-only,other GPU tiers,coexistence and process egress were not measured by five diagnostic calls; Phase2 measures or HOLD.

All cpu/8/12/16/24tiers need evidence for default takeover. One16GiBhost does not prove them. No default/catalog/user-index write without all gates and separate admission disposition.

Google/Ollama detailed cards support8Kwhile Ollama tag summary lists256K; retain8K,no inferred32KQwen takeover. Checkpoint/card name Apache2.0; card also directs deployments to prohibited-use policy. Resolve pinned distribution terms before admission; unresolved meansHOLDandretain. This is an evidence disposition, not legal certification.

## Image ownership and limits

Identity:studioSessionId,studioTurnId,source-byteSHA256. Only persisted Image Studio qualifies; Chat remains ephemeral. Resolve mediaRef inside owned generation roots; snapshot bounded immutable source bytes before decode/render/export.

Freeze8MiBserializedJSON,1000retainedcommands,100000stroke points,4096characters/textmark,2048x2048/4,194,304pixelsfromcurrentgenerated-media ceiling. Viewer currently lacks general restored-image decode gate; later implementation enforces it. Limits interact and excess is typed refusal before persistence,never pruning. Representative capacity proof lives in evidence/phase1-image-limit-check.json; reducer enforcement is not implemented yet.

Use one additive sessions.db table via StudioSessionStore's existing lifecycle; expected-revisionCAS,fullhistory/cursor,transactional cascade with owningturn/session,andpreserveother/sharedoriginalmedia. Slider preview ephemeral; gesture end commits once; reset/undo/redo cover adjustments and marks. Saved requires acknowledgment.

Explicit image-specific grant binds authenticated caller,codingrun/session,imageids,sourcehash. App token/rootunion insufficient. Human image selection/confirmation issues grant through existing tier/permission owners; revoke on run/session/source invalidation. UI/commands share reducer/rendering. Live renderer required; headless returnsrenderer-unavailable. No hidden browser,newlistener,arbitraryscriptorduplicatepixelalgorithm.

Containment checks at actual open/commit include source/parent links/replacement. Export exclusive/nooverwrite,recipe revision/hash/requestidbound; stale responses rejected. CONTEXT.md unchanged and user-owned; no glossary edits proposed.
