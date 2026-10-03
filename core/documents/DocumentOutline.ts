/**
 * v2.11.0 Phase 3.2 -- deterministic, bounded document outline builder.
 *
 * Builds a heading tree from parsed text with no model involved. The structure
 * source is chosen per document by a run-time quality predicate: recovered
 * headings when they look trustworthy, otherwise labelled page windows, or
 * character windows when no page boundaries are known, so a caller never
 * dead-ends. Oversized sections under a real heading are split into windows
 * (a `mixed` result).
 *
 * Invariants the cache and the reader rely on:
 *   - `treeHash` identifies the source bytes plus the engine and schema (see
 *     `computeTreeHash`); it is stable across OCR non-determinism.
 *   - offsets index `indexedText` (markdown when the parser gave it, else the
 *     page texts joined by a blank line).
 *   - every node carries an `anchor`: a digest of its full normalised span,
 *     folded with its pages' text digests, so a slice is served only after the
 *     text it is read from is shown to be the text it was built from.
 *   - ids are `<revision>-<stable>`; `revision` comes from an integrity digest
 *     computed with ids excluded, so an id from another revision fails closed.
 *   - window titles are generated from numbers only, never from document text.
 *
 * vscode-free; `core/**` must not import `modules/**`.
 */

import { createHash } from "node:crypto";

export const OUTLINE_SCHEMA_VERSION = 1;
/** The outline path's own page cap: the OCR runtime's MAX_PAGES. parse_document keeps 50. */
export const OUTLINE_MAX_PAGES = 200;

export type StructureSource = "headings" | "page-windows" | "char-windows" | "mixed";

export interface OutlineLimits {
  readonly maxNodes: number;
  readonly maxDepth: number;
  readonly maxTitleChars: number;
  /** Rough cap on the serialised outline (characters). */
  readonly maxSerializedChars: number;
  /** CPU budget for one build. */
  readonly timeBudgetMs: number;
  /** A section whose own text is longer than this is split into windows. */
  readonly maxSectionChars: number;
  /** Pages per window when falling back to page windows. */
  readonly pageWindow: number;
  /** Characters per window when no page boundaries are known. */
  readonly charWindow: number;
}

export const DEFAULT_OUTLINE_LIMITS: OutlineLimits = Object.freeze({
  maxNodes: 2000,
  maxDepth: 8,
  maxTitleChars: 160,
  maxSerializedChars: 400_000,
  timeBudgetMs: 2000,
  maxSectionChars: 60_000,
  pageWindow: 10,
  charWindow: 20_000,
});

export interface OutlinePage {
  readonly index: number;
  readonly text: string;
}

export interface OutlineInput {
  readonly indexedText: string;
  readonly textKind: "markdown" | "text";
  readonly pages?: readonly OutlinePage[];
  /** Source kind for diagnostics: "markdown", "text", "pdf", "docx", "image". */
  readonly kind: string;
  readonly treeHash: string;
  readonly pageCount?: number;
  readonly partial?: boolean;
}

export interface OutlineNode {
  readonly id: string;
  readonly title: string;
  readonly level: number;
  readonly startPage: number | null;
  readonly endPage: number | null;
  readonly charStart: number;
  readonly charEnd: number;
  readonly anchor: string;
  readonly children: readonly OutlineNode[];
}

export interface OutlineResult {
  readonly schemaVersion: number;
  readonly treeHash: string;
  readonly revision: string;
  readonly integrityDigest: string;
  readonly structureSource: StructureSource;
  readonly nodes: readonly OutlineNode[];
  readonly truncated: boolean;
  readonly pagesParsed: number;
  readonly pageCount: number;
  readonly partial: boolean;
  readonly textLength: number;
}

export interface HeadingCandidate {
  readonly title: string;
  readonly level: number;
  readonly offset: number;
}

export interface QualityAssessment {
  readonly accept: boolean;
  readonly count: number;
  readonly coverage: number;
  readonly perPage: number | null;
  readonly levelJumpShare: number;
}

// ---------------------------------------------------------------- hashing

export function sha256Hex(data: string | Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}

/** Text bytes are hashed after BOM stripping and CRLF normalisation. */
export function normalizeTextSource(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("utf8").replace(BOM_AT_START, "").replace(/\r\n?/g, "\n");
}

/** Identity of a source document for one extractor and schema version. */
export function computeTreeHash(source: Uint8Array | string, engineId: string, engineVersion: string): string {
  const bytesHash = sha256Hex(source);
  return sha256Hex(`${bytesHash}|${engineId}|${engineVersion}|${OUTLINE_SCHEMA_VERSION}`);
}

function normalizeForAnchor(text: string): string {
  return text.normalize("NFKC").replace(/\s+/g, " ").trim();
}

// ---------------------------------------------------------------- text helpers

/**
 * C0/C1 controls (except tab and newline), zero-width and directional
 * formatting characters, and the BOM. Built from code points so this source
 * stays ASCII and no tool can rewrite the class.
 */
const STRIPPED_CODE_POINTS: readonly [number, number][] = [
  [0x00, 0x08],
  [0x0b, 0x1f],
  [0x7f, 0x9f],
  [0x200b, 0x200f],
  [0x202a, 0x202e],
  [0x2066, 0x2069],
  [0xfeff, 0xfeff],
];
const CONTROL_OR_BIDI = new RegExp(
  `[${STRIPPED_CODE_POINTS.map(([a, b]) => `${String.fromCharCode(a)}-${String.fromCharCode(b)}`).join("")}]`,
  "g",
);

/** A leading byte-order mark, built from its code point. */
export const BOM_AT_START = new RegExp(`^${String.fromCharCode(0xfeff)}`);

export function sanitizeTitle(title: string, maxChars: number): string {
  const cleaned = title.replace(CONTROL_OR_BIDI, "").replace(/\s+/g, " ").trim();
  return cleaned.length > maxChars ? `${cleaned.slice(0, safeBoundary(cleaned, maxChars))}...` : cleaned;
}

/** Never split a UTF-16 surrogate pair. */
export function safeBoundary(text: string, index: number): number {
  if (index <= 0 || index >= text.length) return Math.max(0, Math.min(index, text.length));
  const code = text.charCodeAt(index);
  const prev = text.charCodeAt(index - 1);
  if (code >= 0xdc00 && code <= 0xdfff && prev >= 0xd800 && prev <= 0xdbff) return index - 1;
  return index;
}

/** Page start offsets when `indexedText` is exactly the pages joined by a blank line. */
export function pageStartOffsets(indexedText: string, pages: readonly OutlinePage[] | undefined): number[] | null {
  if (!pages || pages.length === 0) return null;
  if (pages.map((p) => p.text).join("\n\n") !== indexedText) return null;
  const starts: number[] = [];
  let offset = 0;
  for (const page of pages) {
    starts.push(offset);
    offset += page.text.length + 2;
  }
  return starts;
}

function pageOf(starts: readonly number[] | null, offset: number): number | null {
  if (!starts) return null;
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if ((starts[mid] ?? 0) <= offset) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
}

// ---------------------------------------------------------------- heading detection

const MD_HEADING = /^(#{1,6})[ \t]+(.+?)[ \t]*#*[ \t]*$/;
/** Numbered titles, space-insensitive after the number because OCR drops spaces. */
const NUMBERED_HEADING = /^(\d{1,3}(?:\.\d{1,3}){0,3})\.?[ \t]*([A-Z][A-Za-z][A-Za-z \t]{1,80})$/;

export function detectHeadings(text: string, textKind: "markdown" | "text"): HeadingCandidate[] {
  const out: HeadingCandidate[] = [];
  let inFence = false;
  let offset = 0;
  for (const raw of text.split("\n")) {
    const line = raw.replace(/\r$/, "");
    if (textKind === "markdown") {
      if (/^ {0,3}(```|~~~)/.test(line)) inFence = !inFence;
      else if (!inFence && !/^( {4}|\t)/.test(line)) {
        const m = MD_HEADING.exec(line);
        if (m) out.push({ title: (m[2] ?? "").trim(), level: (m[1] ?? "#").length, offset });
      }
    } else {
      const trimmed = line.trim();
      const m = NUMBERED_HEADING.exec(trimmed);
      if (m && !/\.{3,}/.test(trimmed)) {
        const number = m[1] ?? "1";
        out.push({ title: `${number} ${(m[2] ?? "").trim()}`, level: number.split(".").length, offset });
      }
    }
    offset += raw.length + 1;
  }
  return out;
}

/**
 * Run-time quality predicate (decision 2.4). Calibrated on the Phase 2
 * fixtures: markdown, text, and DOCX headings pass; sparse or erratic OCR
 * headings fail and the caller falls back to windows.
 */
export function assessHeadings(
  headings: readonly HeadingCandidate[],
  textLength: number,
  pageCount: number | null,
  textKind: "markdown" | "text",
): QualityAssessment {
  const count = headings.length;
  const first = headings[0]?.offset ?? textLength;
  const coverage = textLength === 0 ? 0 : (textLength - first) / textLength;
  const perPage = pageCount && pageCount > 0 ? count / pageCount : null;
  let jumps = 0;
  for (let i = 1; i < count; i += 1) {
    if ((headings[i]?.level ?? 1) - (headings[i - 1]?.level ?? 1) > 1) jumps += 1;
  }
  const levelJumpShare = count <= 1 ? 0 : jumps / (count - 1);
  const minCount = textKind === "markdown" ? 1 : 2;
  const densityOk = perPage === null || (perPage >= 0.1 && perPage <= 6);
  const accept = count >= minCount && coverage >= 0.5 && densityOk && levelJumpShare <= 0.3;
  return { accept, count, coverage, perPage, levelJumpShare };
}

// ---------------------------------------------------------------- build

interface Draft {
  title: string;
  level: number;
  charStart: number;
  charEnd: number;
  children: Draft[];
}

class Budget {
  private nodes = 0;
  private chars = 0;
  private ticks = 0;
  truncated = false;
  private readonly started: number;
  constructor(
    private readonly limits: OutlineLimits,
    private readonly now: () => number,
  ) {
    this.started = now();
  }
  take(title: string): boolean {
    if (this.truncated) return false;
    this.ticks += 1;
    if ((this.ticks & 255) === 0 && this.now() - this.started > this.limits.timeBudgetMs) this.truncated = true;
    if (this.nodes >= this.limits.maxNodes || this.chars + title.length + 120 > this.limits.maxSerializedChars) {
      this.truncated = true;
    }
    if (this.truncated) return false;
    this.nodes += 1;
    this.chars += title.length + 120;
    return true;
  }
}

function windowDrafts(
  text: string,
  start: number,
  end: number,
  starts: readonly number[] | null,
  limits: OutlineLimits,
  budget: Budget,
  level: number,
): Draft[] {
  const out: Draft[] = [];
  if (starts) {
    const firstPage = pageOf(starts, start) ?? 1;
    const lastPage = pageOf(starts, Math.max(start, end - 1)) ?? firstPage;
    for (let p = firstPage; p <= lastPage; p += limits.pageWindow) {
      const to = Math.min(lastPage, p + limits.pageWindow - 1);
      const title = p === to ? `Page ${p}` : `Pages ${p}-${to}`;
      if (!budget.take(title)) break;
      const charStart = Math.max(start, starts[p - 1] ?? start);
      const charEnd = to < starts.length ? Math.min(end, (starts[to] ?? end) - 2) : end;
      out.push({ title, level, charStart, charEnd: Math.max(charStart, charEnd), children: [] });
    }
    return out;
  }
  for (let s = start; s < end; s += limits.charWindow) {
    const charStart = safeBoundary(text, s);
    const charEnd = safeBoundary(text, Math.min(end, s + limits.charWindow));
    const title = `Characters ${charStart}-${charEnd}`;
    if (!budget.take(title)) break;
    out.push({ title, level, charStart, charEnd, children: [] });
  }
  return out;
}

function headingDrafts(
  text: string,
  headings: readonly HeadingCandidate[],
  limits: OutlineLimits,
  budget: Budget,
): Draft[] {
  const roots: Draft[] = [];
  const stack: Draft[] = [];
  // A heading nested past maxDepth is attached flat under the deepest kept
  // ancestor; it is not on the stack, so it is closed here by the next heading.
  let flattened: Draft | null = null;
  for (let i = 0; i < headings.length; i += 1) {
    const h = headings[i];
    if (!h) continue;
    if (flattened) {
      flattened.charEnd = h.offset;
      flattened = null;
    }
    const title = sanitizeTitle(h.title, limits.maxTitleChars);
    if (!budget.take(title)) break;
    const draft: Draft = { title, level: h.level, charStart: h.offset, charEnd: text.length, children: [] };
    while (stack.length > 0 && (stack[stack.length - 1]?.level ?? 0) >= h.level) {
      const closed = stack.pop();
      if (closed) closed.charEnd = h.offset;
    }
    const parent = stack[stack.length - 1];
    if (parent) parent.children.push(draft);
    else roots.push(draft);
    if (stack.length < limits.maxDepth) stack.push(draft);
    else flattened = draft;
  }
  return roots;
}

/** Split any section whose own text exceeds the section cap into windows. */
function splitOversized(text: string, drafts: Draft[], starts: readonly number[] | null, limits: OutlineLimits, budget: Budget): boolean {
  let split = false;
  const queue: Draft[] = [...drafts];
  while (queue.length > 0) {
    const d = queue.shift();
    if (!d) continue;
    const ownEnd = d.children[0]?.charStart ?? d.charEnd;
    if (ownEnd - d.charStart > limits.maxSectionChars && d.children.length === 0) {
      d.children = windowDrafts(text, d.charStart, d.charEnd, starts, limits, budget, d.level + 1);
      split = split || d.children.length > 0;
    }
    queue.push(...d.children);
  }
  return split;
}

/** Digest of one page's text, as folded into page-bound anchors. */
export function pageHashesOf(pages: readonly OutlinePage[] | undefined): string[] {
  return (pages ?? []).map((p) => sha256Hex(normalizeForAnchor(p.text)));
}

/**
 * Anchor of a node: a digest of its full normalised span, folded with the
 * ordered digests of the pages it covers. Shared by the builder and the reader
 * so a slice is served only from text that hashes to what was built.
 */
export function anchorFor(
  text: string,
  charStart: number,
  charEnd: number,
  pageHashes: readonly string[],
  startPage: number | null,
  endPage: number | null,
): string {
  const span = sha256Hex(normalizeForAnchor(text.slice(charStart, charEnd)));
  if (startPage === null || endPage === null) return span;
  return sha256Hex(`${span}|${pageHashes.slice(startPage - 1, endPage).join("|")}`);
}

interface ShapeNode {
  readonly title: string;
  readonly level: number;
  readonly charStart: number;
  readonly charEnd: number;
  readonly anchor: string;
  readonly children: readonly ShapeNode[];
}

/** Pre-order list of (node, ordinal, title path). */
function preorder<T extends { readonly title: string; readonly children: readonly T[] }>(
  nodes: readonly T[],
): { node: T; ordinal: number; path: string }[] {
  const out: { node: T; ordinal: number; path: string }[] = [];
  const stack = [...nodes].reverse().map((node) => ({ node, path: node.title }));
  while (stack.length > 0) {
    const item = stack.pop();
    if (!item) continue;
    out.push({ node: item.node, ordinal: out.length, path: item.path });
    for (let i = item.node.children.length - 1; i >= 0; i -= 1) {
      const child = item.node.children[i];
      if (child) stack.push({ node: child, path: `${item.path} > ${child.title}` });
    }
  }
  return out;
}

/** Integrity digest over the canonical structure, ids excluded (not circular). */
export function integrityDigestOf(nodes: readonly ShapeNode[]): string {
  const canonical = preorder(nodes).map(({ node }) => [
    node.title,
    node.level,
    node.charStart,
    node.charEnd,
    node.anchor,
    node.children.length,
  ]);
  return sha256Hex(JSON.stringify([OUTLINE_SCHEMA_VERSION, canonical]));
}

export function nodeId(revision: string, ordinal: number, path: string): string {
  return `${revision}-${sha256Hex(`${ordinal}|${path}`).slice(0, 12)}`;
}

/** The ids an outline must carry, in pre-order, for its revision. */
export function expectedIds(nodes: readonly ShapeNode[], revision: string): string[] {
  return preorder(nodes).map(({ ordinal, path }) => nodeId(revision, ordinal, path));
}

function finalize(
  text: string,
  drafts: readonly Draft[],
  starts: readonly number[] | null,
  pages: readonly OutlinePage[] | undefined,
): { nodes: OutlineNode[]; integrityDigest: string } {
  const pageHashes = pageHashesOf(pages);
  // Pass 1: anchored, id-less nodes, built bottom-up from a pre-order list.
  const order = preorder(drafts);
  const shaped = new Map<Draft, OutlineNode>();
  for (let i = order.length - 1; i >= 0; i -= 1) {
    const draft = order[i]?.node;
    if (!draft) continue;
    const startPage = pageOf(starts, draft.charStart);
    const endPage = pageOf(starts, Math.max(draft.charStart, draft.charEnd - 1));
    shaped.set(draft, {
      id: "",
      title: draft.title,
      level: draft.level,
      startPage,
      endPage,
      charStart: draft.charStart,
      charEnd: draft.charEnd,
      anchor: anchorFor(text, draft.charStart, draft.charEnd, pageHashes, startPage, endPage),
      children: draft.children.map((c) => shaped.get(c)).filter((n): n is OutlineNode => n !== undefined),
    });
  }
  const idless = drafts.map((d) => shaped.get(d)).filter((n): n is OutlineNode => n !== undefined);
  const integrityDigest = integrityDigestOf(idless);
  // Pass 2: assign ids from the revision, again bottom-up.
  const revision = integrityDigest.slice(0, 8);
  const idOrder = preorder(idless);
  const withIds = new Map<OutlineNode, OutlineNode>();
  for (let i = idOrder.length - 1; i >= 0; i -= 1) {
    const item = idOrder[i];
    if (!item) continue;
    withIds.set(item.node, {
      ...item.node,
      id: nodeId(revision, item.ordinal, item.path),
      children: item.node.children.map((c) => withIds.get(c)).filter((n): n is OutlineNode => n !== undefined),
    });
  }
  return {
    nodes: idless.map((n) => withIds.get(n)).filter((n): n is OutlineNode => n !== undefined),
    integrityDigest,
  };
}

export interface BuildOutlineOptions {
  /**
   * Screens recovered heading titles before they become part of the tree (and
   * of its digest). Injected because the injection scanner lives in
   * `modules/coding/guardrails/`, which `core/**` must not import.
   */
  readonly screenTitle?: (title: string) => string;
}

export function buildOutline(
  input: OutlineInput,
  limits: OutlineLimits = DEFAULT_OUTLINE_LIMITS,
  now: () => number = Date.now,
  options: BuildOutlineOptions = {},
): OutlineResult {
  const text = input.indexedText;
  const starts = pageStartOffsets(text, input.pages);
  const pageCount = input.pageCount ?? input.pages?.length ?? 0;
  const budget = new Budget(limits, now);
  const headings = detectHeadings(text, input.textKind);
  const quality = assessHeadings(headings, text.length, starts ? starts.length : null, input.textKind);
  let structureSource: StructureSource;
  let drafts: Draft[];
  if (quality.accept) {
    const screen = options.screenTitle;
    const screened = screen ? headings.map((h) => ({ ...h, title: screen(h.title) })) : headings;
    drafts = headingDrafts(text, screened, limits, budget);
    const firstOffset = headings[0]?.offset ?? 0;
    if (firstOffset > 0 && text.slice(0, firstOffset).trim().length > 0 && budget.take("Front matter")) {
      drafts.unshift({ title: "Front matter", level: 1, charStart: 0, charEnd: firstOffset, children: [] });
    }
    structureSource = splitOversized(text, drafts, starts, limits, budget) ? "mixed" : "headings";
  } else {
    drafts = windowDrafts(text, 0, text.length, starts, limits, budget, 1);
    structureSource = starts ? "page-windows" : "char-windows";
  }
  const { nodes, integrityDigest } = finalize(text, drafts, starts, input.pages);
  return {
    schemaVersion: OUTLINE_SCHEMA_VERSION,
    treeHash: input.treeHash,
    revision: integrityDigest.slice(0, 8),
    integrityDigest,
    structureSource,
    nodes,
    truncated: budget.truncated,
    pagesParsed: input.pages?.length ?? (text.length > 0 ? 1 : 0),
    pageCount,
    partial: input.partial ?? false,
    textLength: text.length,
  };
}

// ---------------------------------------------------------------- traversal and presentation

/** Iterative pre-order walk. */
export function walkOutline(nodes: readonly OutlineNode[], visit: (node: OutlineNode, depth: number) => void): void {
  const stack: { node: OutlineNode; depth: number }[] = [...nodes].reverse().map((node) => ({ node, depth: 1 }));
  while (stack.length > 0) {
    const item = stack.pop();
    if (!item) continue;
    visit(item.node, item.depth);
    for (let i = item.node.children.length - 1; i >= 0; i -= 1) {
      const child = item.node.children[i];
      if (child) stack.push({ node: child, depth: item.depth + 1 });
    }
  }
}

export function findNode(outline: OutlineResult, id: string): OutlineNode | null {
  let found: OutlineNode | null = null;
  walkOutline(outline.nodes, (node) => {
    if (found === null && node.id === id) found = node;
  });
  return found;
}

export interface PresentedNode {
  readonly id: string;
  readonly title: string;
  readonly depth: number;
  readonly pages: string | null;
}

/**
 * Model-context budget applied at presentation time, so the cached tree does
 * not depend on the active model. Returns a flat, depth-annotated list.
 */
export function presentOutline(outline: OutlineResult, maxChars: number): { nodes: PresentedNode[]; truncated: boolean } {
  const out: PresentedNode[] = [];
  let used = 0;
  let truncated = outline.truncated;
  walkOutline(outline.nodes, (node, depth) => {
    if (truncated && used >= maxChars) return;
    const pages =
      node.startPage === null ? null : node.startPage === node.endPage ? `${node.startPage}` : `${node.startPage}-${node.endPage}`;
    const cost = node.title.length + node.id.length + 24;
    if (used + cost > maxChars) {
      truncated = true;
      used = maxChars;
      return;
    }
    used += cost;
    out.push({ id: node.id, title: node.title, depth, pages });
  });
  return { nodes: out, truncated };
}
