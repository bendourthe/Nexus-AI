/**
 * v2.11.0 Phase 3.3 -- structure-only outline cache and in-memory text snapshot.
 *
 * The file cache never holds document text. Entries carry structure, offsets,
 * `textLength`, screened titles, anchors, and the integrity digest, and are
 * written only for extractors recorded as deterministic (decision 2.4). Every
 * read is strictly validated; anything that fails is discarded and treated as
 * a miss. The store is injected, so core holds no filesystem policy.
 *
 * Extracted text lives only in `TextSnapshotCache`: process-local, bounded,
 * with a time-to-live. It is never written to disk.
 */

import {
  DEFAULT_OUTLINE_LIMITS,
  OUTLINE_SCHEMA_VERSION,
  expectedIds,
  integrityDigestOf,
  walkOutline,
  type OutlineLimits,
  type OutlineNode,
  type OutlinePage,
  type OutlineResult,
} from "./DocumentOutline.js";

export interface OutlineStoreEntry {
  readonly name: string;
  readonly size: number;
  readonly mtimeMs: number;
}

/** Injected persistence. File names are `<64 hex>.json`; the store enforces them. */
export interface OutlineStore {
  read(name: string): Promise<string | null>;
  write(name: string, data: string): Promise<void>;
  list(): Promise<readonly OutlineStoreEntry[]>;
  remove(name: string): Promise<void>;
}

export const CACHE_NAME_PATTERN = /^[0-9a-f]{64}\.json$/;
export const DEFAULT_CACHE_MAX_BYTES = 50 * 1024 * 1024;

const HEX64 = /^[0-9a-f]{64}$/;
const SOURCES = new Set(["headings", "page-windows", "char-windows", "mixed"]);

function isInt(value: unknown, min = 0): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= min;
}

/**
 * Strict structural validation. Returns the outline only when every field is
 * well-formed, every offset is inside `textLength`, the digest recomputes,
 * and every id is the one its revision and position require.
 */
export function validateOutline(
  raw: unknown,
  expectedTreeHash: string,
  limits: OutlineLimits = DEFAULT_OUTLINE_LIMITS,
): OutlineResult | null {
  if (typeof raw !== "object" || raw === null) return null;
  const o = raw as Record<string, unknown>;
  if (o["schemaVersion"] !== OUTLINE_SCHEMA_VERSION) return null;
  if (o["treeHash"] !== expectedTreeHash || !HEX64.test(expectedTreeHash)) return null;
  if (typeof o["integrityDigest"] !== "string" || !HEX64.test(o["integrityDigest"])) return null;
  if (o["revision"] !== (o["integrityDigest"] as string).slice(0, 8)) return null;
  if (typeof o["structureSource"] !== "string" || !SOURCES.has(o["structureSource"])) return null;
  if (!isInt(o["textLength"]) || !isInt(o["pagesParsed"]) || !isInt(o["pageCount"])) return null;
  if (typeof o["truncated"] !== "boolean" || typeof o["partial"] !== "boolean") return null;
  if (!Array.isArray(o["nodes"])) return null;
  const textLength = o["textLength"];
  let count = 0;
  let valid = true;
  const check = (n: unknown, depth: number): n is OutlineNode => {
    if (typeof n !== "object" || n === null) return false;
    const node = n as Record<string, unknown>;
    count += 1;
    if (count > limits.maxNodes || depth > limits.maxDepth + 1) return false;
    if (typeof node["id"] !== "string" || typeof node["title"] !== "string") return false;
    if (node["title"].length > limits.maxTitleChars + 3) return false;
    if (!isInt(node["level"], 1) || (node["level"] as number) > 12) return false;
    if (!isInt(node["charStart"]) || !isInt(node["charEnd"])) return false;
    if ((node["charStart"] as number) > (node["charEnd"] as number) || (node["charEnd"] as number) > textLength) return false;
    if (typeof node["anchor"] !== "string" || !HEX64.test(node["anchor"])) return false;
    for (const key of ["startPage", "endPage"]) {
      const v = node[key];
      if (v !== null && !isInt(v, 1)) return false;
    }
    if (!Array.isArray(node["children"])) return false;
    return (node["children"] as unknown[]).every((c) => check(c, depth + 1));
  };
  for (const n of o["nodes"] as unknown[]) {
    if (!check(n, 1)) {
      valid = false;
      break;
    }
  }
  if (!valid) return null;
  const outline = raw as OutlineResult;
  if (integrityDigestOf(outline.nodes) !== outline.integrityDigest) return null;
  const ids: string[] = [];
  walkOutline(outline.nodes, (n) => ids.push(n.id));
  const want = expectedIds(outline.nodes, outline.revision);
  if (ids.length !== want.length || ids.some((id, i) => id !== want[i])) return null;
  return outline;
}

export interface OutlineCacheOptions {
  readonly store: OutlineStore;
  /** The same screen the tool layer applies; titles must already pass it. */
  readonly screenText: (text: string) => string;
  readonly maxBytes?: number;
  readonly limits?: OutlineLimits;
  readonly warn?: (message: string) => void;
}

export class OutlineCache {
  private readonly maxBytes: number;
  private readonly limits: OutlineLimits;
  private readonly warn: (message: string) => void;

  constructor(private readonly options: OutlineCacheOptions) {
    this.maxBytes = options.maxBytes ?? DEFAULT_CACHE_MAX_BYTES;
    this.limits = options.limits ?? DEFAULT_OUTLINE_LIMITS;
    this.warn = options.warn ?? (() => undefined);
  }

  async get(treeHash: string): Promise<OutlineResult | null> {
    if (!HEX64.test(treeHash)) return null;
    const name = `${treeHash}.json`;
    let raw: string | null;
    try {
      raw = await this.options.store.read(name);
    } catch (err) {
      this.warn(`outline cache read failed: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
    if (raw === null) return null;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
    const outline = validateOutline(parsed, treeHash, this.limits);
    if (!outline) {
      this.warn(`outline cache entry ${name} failed validation; discarded`);
      await this.discard(treeHash);
    }
    return outline;
  }

  /** Writes a deterministic outline. Any error degrades to no cache. */
  async put(outline: OutlineResult): Promise<boolean> {
    if (!HEX64.test(outline.treeHash)) return false;
    let unscreened = false;
    walkOutline(outline.nodes, (n) => {
      if (this.options.screenText(n.title) !== n.title) unscreened = true;
    });
    if (unscreened) {
      this.warn("outline cache refused an entry whose titles were not screened");
      return false;
    }
    try {
      await this.options.store.write(`${outline.treeHash}.json`, JSON.stringify(outline));
      await this.evict();
      return true;
    } catch (err) {
      this.warn(`outline cache write failed (continuing without cache): ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  }

  async discard(treeHash: string): Promise<void> {
    if (!HEX64.test(treeHash)) return;
    try {
      await this.options.store.remove(`${treeHash}.json`);
    } catch {
      /* a missing entry is already discarded */
    }
  }

  /** Remove every entry. */
  async purge(): Promise<number> {
    const entries = await this.options.store.list();
    for (const e of entries) await this.options.store.remove(e.name);
    return entries.length;
  }

  private async evict(): Promise<void> {
    const entries = [...(await this.options.store.list())].sort((a, b) => a.mtimeMs - b.mtimeMs);
    let total = entries.reduce((n, e) => n + e.size, 0);
    for (const e of entries) {
      if (total <= this.maxBytes) break;
      await this.options.store.remove(e.name);
      total -= e.size;
    }
  }
}

// ---------------------------------------------------------------- in-memory text snapshot

export interface TextSnapshot {
  readonly outline: OutlineResult;
  readonly text: string;
  readonly pages: readonly OutlinePage[] | undefined;
  readonly engineId: string;
  readonly engineVersion: string;
  readonly ephemeral: boolean;
}

export interface TextSnapshotCacheOptions {
  readonly maxEntries?: number;
  readonly ttlMs?: number;
  readonly now?: () => number;
}

/** Process-local, bounded LRU with a time-to-live. Never persisted. */
export class TextSnapshotCache {
  private readonly entries = new Map<string, { snapshot: TextSnapshot; at: number }>();
  private readonly maxEntries: number;
  private readonly ttlMs: number;
  private readonly now: () => number;

  constructor(options: TextSnapshotCacheOptions = {}) {
    this.maxEntries = options.maxEntries ?? 8;
    this.ttlMs = options.ttlMs ?? 10 * 60 * 1000;
    this.now = options.now ?? Date.now;
  }

  get(treeHash: string): TextSnapshot | null {
    const hit = this.entries.get(treeHash);
    if (!hit) return null;
    if (this.now() - hit.at > this.ttlMs) {
      this.entries.delete(treeHash);
      return null;
    }
    this.entries.delete(treeHash);
    this.entries.set(treeHash, { snapshot: hit.snapshot, at: this.now() });
    return hit.snapshot;
  }

  set(treeHash: string, snapshot: TextSnapshot): void {
    this.entries.delete(treeHash);
    this.entries.set(treeHash, { snapshot, at: this.now() });
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
  }

  delete(treeHash: string): void {
    this.entries.delete(treeHash);
  }

  clear(): void {
    this.entries.clear();
  }
}
