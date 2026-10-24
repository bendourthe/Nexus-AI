# v2.13 baseline and production seams

Baseline is merged develop90b95f2439959ddfa4c902d287a6d673df785dd9, including PR97/98. Worktree C:/Users/bdour/Documents/Projects/Development/Nexus-AI-worktrees/v2.13-craft-retrieval, branch feat/v2.13-craft-retrieval. Dirty main and older worktrees are preserved. Product version2.11.0; v2.12 field testing/M5 and release remain unproven.

## Embedding consumers

| Consumer | Production path | Ownership and behavior |
|---|---|---|
| Extension composition | src/panels/ChatPanelInit.ts#buildMemorySubsystem -> src/storage/MemorySubsystem.ts | Opens globalStorageUri/memory.db once in WAL, shares connection, closes once. Current default embeddinggemma. |
| Vendor-neutral adapter | src/storage/EmbeddingClient.ts -> modules/coding/llm/types.ts -> OllamaClient.ts | embed/embedBatch use /api/embed; cached availability; no query/document role distinction. embedWithProvenance can produce128D heuristic vectors; evaluator must use genuine embed only. |
| Durable memory | src/storage/MemoryStore.ts | Save embeds documents; searchSemantic embeds queries, applies FTS5 bounded prefilter/recency fallback and cosine; searchHybrid invokes HybridRanker RRF. HNSW activates above configured threshold, default1000; separate memory.hnsw files. |
| Episodes | src/storage/EpisodicMemory.ts | record/searchSemantic embed event/query; shared memory.db connection in extension. |
| Graph | src/storage/GraphQueryEngine.ts | Embedder constructor argument is unused. Entity/relation traversal is lexical/recency-based; no live graph vector consumer is established. |
| Unified recall | src/storage/UnifiedMemoryRetriever.ts | Public working/episode/durable/graph/cache composition; preserve actual prefilter/reranker in evaluation. |
| Tool cache | src/storage/ToolOutputCache.ts; ChatPanelInit initToolOutputCache | Separate DB and async embed-after-store, with Ollama/heuristic provenance. Separate identity/recovery boundary if admitted later. |
| Desktop Chat | desktop/sidecar/src/chat/memoryRuntime.ts | EpisodicMemory constructed with null embedder; no desktop semantic claim. |
| Core dense/pruned | core/memory/LocalEmbedder.ts, DenseIndex, PrunedDenseIndex | Production composition for this job not established. Do not modify dormant modules to match a comparison. |

## Image and delivery seams

ImageStudioPage actually lives at desktop/src/modules/image/ImageStudioPage.tsx. Persistent StudioTurn records supply mediaRef; MessageBubble opens ImageViewer with media src/message id, currently without durable studio identity. Ephemeral Chat stays outside durable scope.

StudioSessionStore.types.ts exposes session/turn ids and mediaRef, no workspace owner. studio/sessionRuntime.ts opens ~/.nexus/generations/sessions.db, distinct from studio.db for generation jobs. StudioSessionStore owns connection, foreign keys, transactional append/delete and close. Later facade must reuse that connection/lifecycle rather than open renderer SQLite.

ImageViewer holds adjustments/marks in React memory; undo/redo currently covers marks only. renderAdjusted/sharpenPixels share preview/export. The catch tolerates unavailable sharpness readback; strict Phase5 export must surface failure. Ranges: brightness/contrast20..200,saturation0..200,sharpness0..100; marks use natural-image coordinates.

Existing typed IPC/protocol/handlers and controlSurface/jsonCliRoutes.ts are delivery seams. ControlSurfaceContext in loopbackServer.ts provides shared token/request/cancellation/body/concurrency, not a per-image caller/run grant. Window capture is a screenshot, not edited-image export.

Permission/confirmation owners remain ConfirmationGate and coding action classification/tier resolution. Human owned-image selection/confirmation issues grants bound to caller/run/id/hash; revoke on run/session/source invalidation. Canonical filesystem containment and pinned source bytes must hold at actual read/open/commit, including Windows junction/parent replacement. A global root union or app token does not establish Studio ownership.

Existing tests include tests/unit/core/generations/StudioSessionStore.test.ts, desktop explorer/studio-session tests and imageViewer/generation routes. Fast/platform profiles passed. The actual local adapter/storage diagnostic uses existing VS Code host stubs solely for standalone loading; SQLite and Ollama are real. This proves internal-compatible composition, not packaged/all-tier usage.

## Plan delta

Incomplete baseline assumptions: default is EmbeddingGemma300M, not Nomic; graph embedder unused; ImageStudioPage path differs; restored-image decode has no general ceiling. Freeze actual defaults, preserve Nomic/Qwen alternatives, enforce the selected image ceiling in later phases, and exclude unproven consumers from migration. No product default, catalog/job, user data or queued version changed.
