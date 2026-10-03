/**
 * v2.11.0 Phase 3.3 -- outline orchestration: snapshot, cache, extraction.
 *
 * Rules (plan Phase 3, decision 2.4, and the maintainer's 2026-10-02 amendment):
 *   - Determinism is a per-engine property measured once in Phase 2. Output of
 *     an engine not listed in DETERMINISTIC_ENGINES (including any unknown id or
 *     device) is `ephemeral`: never written to the file cache, held only in the
 *     in-memory snapshot, and a read after the snapshot expires returns
 *     "outline-expired" so the caller asks for a new outline. No rebuild ever
 *     happens inside a read, so there is no loop.
 *   - For a deterministic engine, a re-extraction that fails the node's anchor
 *     discards the cache entry and returns "anchor-mismatch"; the next outline
 *     call rebuilds with a new revision.
 *   - Two overlapping builds of the same document share one promise, so a
 *     second caller never hits the parser's "busy" refusal.
 *   - `document_outline` reuses a still-live snapshot with the same tree hash
 *     instead of re-extracting.
 */

import {
  DEFAULT_OUTLINE_LIMITS,
  buildOutline,
  computeTreeHash,
  normalizeTextSource,
  type OutlineLimits,
  type OutlinePage,
  type OutlineResult,
} from "./DocumentOutline.js";
import { OutlineCache, TextSnapshotCache } from "./OutlineCache.js";
import { readSection, type SectionReadLimits, type SectionReadResult } from "./SectionReader.js";

export interface EngineIdentity {
  readonly id: string;
  readonly version: string;
  readonly device: string;
}

/** Decision 2.4's table: engine id and device measured deterministic on 2026-10-02. */
export const DETERMINISTIC_ENGINES: readonly Pick<EngineIdentity, "id" | "device">[] = Object.freeze([
  { id: "direct", device: "cpu" },
  { id: "docx", device: "cpu" },
  { id: "rapidocr", device: "cpu" },
]);

export function isDeterministicEngine(engine: EngineIdentity): boolean {
  return DETERMINISTIC_ENGINES.some((e) => e.id === engine.id && e.device === engine.device);
}

export type DocumentKind = "markdown" | "text" | "pdf" | "docx" | "image";

export interface ExtractedDocument {
  readonly indexedText: string;
  readonly textKind: "markdown" | "text";
  readonly pages?: readonly OutlinePage[];
  readonly engine: EngineIdentity;
  readonly pageCount: number;
  readonly partial: boolean;
}

export interface OutlineSessionDeps {
  /** Extract text from bytes the caller has already read through its guards. */
  extract(bytes: Uint8Array, kind: DocumentKind): Promise<ExtractedDocument>;
  /** Engine a kind is expected to use, so a cache lookup can happen before extraction. */
  expectedEngine(kind: DocumentKind): EngineIdentity;
  readonly cache: OutlineCache | null;
  readonly snapshots: TextSnapshotCache;
  readonly screenTitle: (title: string) => string;
  readonly limits?: OutlineLimits;
  readonly now?: () => number;
}

export type OutlineSource = "snapshot" | "file-cache" | "fresh";

export interface SessionOutline {
  readonly outline: OutlineResult;
  readonly ephemeral: boolean;
  readonly source: OutlineSource;
}

export type SessionReadResult =
  | SectionReadResult
  | { readonly ok: false; readonly reason: "outline-expired"; readonly message: string };

function hashSource(bytes: Uint8Array, kind: DocumentKind): Uint8Array | string {
  return kind === "markdown" || kind === "text" ? normalizeTextSource(bytes) : bytes;
}

export class OutlineSession {
  private readonly inflight = new Map<string, Promise<SessionOutline>>();
  private readonly limits: OutlineLimits;

  constructor(private readonly deps: OutlineSessionDeps) {
    this.limits = deps.limits ?? DEFAULT_OUTLINE_LIMITS;
  }

  treeHashFor(bytes: Uint8Array, kind: DocumentKind, engine: EngineIdentity): string {
    return computeTreeHash(hashSource(bytes, kind), `${engine.id}@${engine.device}`, engine.version);
  }

  async outline(bytes: Uint8Array, kind: DocumentKind): Promise<SessionOutline> {
    const expected = this.deps.expectedEngine(kind);
    const key = this.treeHashFor(bytes, kind, expected);
    const running = this.inflight.get(key);
    if (running) return running;
    const job = this.build(bytes, kind, expected, key).finally(() => this.inflight.delete(key));
    this.inflight.set(key, job);
    return job;
  }

  private async build(bytes: Uint8Array, kind: DocumentKind, expected: EngineIdentity, key: string): Promise<SessionOutline> {
    const live = this.deps.snapshots.get(key);
    if (live) return { outline: live.outline, ephemeral: live.ephemeral, source: "snapshot" };
    if (this.deps.cache && isDeterministicEngine(expected)) {
      const cached = await this.deps.cache.get(key);
      if (cached) return { outline: cached, ephemeral: false, source: "file-cache" };
    }
    const extracted = await this.deps.extract(bytes, kind);
    const treeHash = this.treeHashFor(bytes, kind, extracted.engine);
    const ephemeral = !isDeterministicEngine(extracted.engine) || treeHash !== key;
    const outline = buildOutline(
      {
        indexedText: extracted.indexedText,
        textKind: extracted.textKind,
        ...(extracted.pages ? { pages: extracted.pages } : {}),
        kind,
        treeHash,
        pageCount: extracted.pageCount,
        partial: extracted.partial,
      },
      this.limits,
      this.deps.now,
      { screenTitle: this.deps.screenTitle },
    );
    this.deps.snapshots.set(treeHash, {
      outline,
      text: extracted.indexedText,
      pages: extracted.pages,
      engineId: extracted.engine.id,
      engineVersion: extracted.engine.version,
      ephemeral,
    });
    if (!ephemeral && this.deps.cache) await this.deps.cache.put(outline);
    return { outline, ephemeral, source: "fresh" };
  }

  async readSection(
    bytes: Uint8Array,
    kind: DocumentKind,
    nodeId: string,
    treeHash: string,
    limits: SectionReadLimits,
  ): Promise<SessionReadResult> {
    const expected = this.deps.expectedEngine(kind);
    const snapshot = this.deps.snapshots.get(treeHash);
    if (snapshot) {
      const engine = { id: snapshot.engineId, version: snapshot.engineVersion, device: expected.device };
      if (this.treeHashFor(bytes, kind, engine) !== treeHash) {
        return { ok: false, reason: "document-changed", message: "document changed, call document_outline again" };
      }
      return readSection(snapshot.outline, nodeId, treeHash, snapshot.text, snapshot.pages, limits);
    }
    if (this.treeHashFor(bytes, kind, expected) !== treeHash) {
      return { ok: false, reason: "document-changed", message: "document changed, call document_outline again" };
    }
    const cached = this.deps.cache && isDeterministicEngine(expected) ? await this.deps.cache.get(treeHash) : null;
    if (!cached) {
      return { ok: false, reason: "outline-expired", message: "outline expired, call document_outline again" };
    }
    const extracted = await this.deps.extract(bytes, kind);
    if (this.treeHashFor(bytes, kind, extracted.engine) !== treeHash) {
      return { ok: false, reason: "outline-expired", message: "outline expired, call document_outline again" };
    }
    const result = readSection(cached, nodeId, treeHash, extracted.indexedText, extracted.pages, limits);
    if (!result.ok && result.reason === "anchor-mismatch") {
      await this.deps.cache?.discard(treeHash);
      return { ok: false, reason: "anchor-mismatch", message: "call document_outline again" };
    }
    if (result.ok) {
      this.deps.snapshots.set(treeHash, {
        outline: cached,
        text: extracted.indexedText,
        pages: extracted.pages,
        engineId: extracted.engine.id,
        engineVersion: extracted.engine.version,
        ephemeral: false,
      });
    }
    return result;
  }
}
