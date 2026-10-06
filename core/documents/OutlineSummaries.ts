/**
 * v2.11.0 Phase 4.4 -- optional one-line node summaries, off by default.
 *
 * `core/**` must not import `modules/**`, so the model call is an injected
 * `SummarizeFn`; the channel builds it over the LLM port. Second-order
 * injection is the main risk: a summary is model output derived from
 * untrusted text. So node text is screened before it is sent, every summary
 * is screened and length-capped on generation and again on every cache read,
 * and a flagged summary is dropped for that node only.
 *
 * Summaries are cached in their own namespace, keyed by (tree hash, model id,
 * prompt version), with the same strict validation as the outline cache.
 */

import { sha256Hex, walkOutline, type OutlineResult } from "./DocumentOutline.js";
import type { OutlineStore } from "./OutlineCache.js";

export type SummarizeFn = (text: string) => Promise<string>;

export const SUMMARY_PROMPT_VERSION = "1";
const SUMMARY_SCHEMA = 1;
const NODE_ID = /^[0-9a-f]{8}-[0-9a-f]{12}$/;
const HEX64 = /^[0-9a-f]{64}$/;

export interface SummaryOptions {
  readonly summarize: SummarizeFn;
  /** Screen input text: returns the text to send (redacted as needed). */
  readonly screenInput: (text: string) => string;
  /** Screen a summary: returns the cleaned summary, or null to drop it. */
  readonly screenSummary: (summary: string) => string | null;
  readonly modelId: string;
  readonly maxCalls?: number;
  readonly maxSummaryChars?: number;
  readonly maxInputChars?: number;
  readonly store?: OutlineStore | null;
}

export interface SummaryResult {
  readonly summaries: ReadonlyMap<string, string>;
  readonly status: string;
}

/** Strip markup, control characters, and newlines from a model reply. */
export function cleanSummary(raw: string, maxChars: number): string {
  const text = raw
    .replace(/<[^>]{0,200}>/g, " ")
    .replace(/[`*_#>]+/g, " ")
    .replace(/[\u0000-\u001f\u007f-\u009f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > maxChars ? `${text.slice(0, maxChars).trimEnd()}...` : text;
}

export function summaryCacheName(treeHash: string, modelId: string): string {
  return `${sha256Hex(`${treeHash}|${modelId}|${SUMMARY_PROMPT_VERSION}`)}.json`;
}

function readCached(raw: string | null, outline: OutlineResult, opts: SummaryOptions, maxChars: number): Map<string, string> | null {
  if (raw === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const o = parsed as Record<string, unknown>;
  if (
    o["schema"] !== SUMMARY_SCHEMA ||
    o["treeHash"] !== outline.treeHash ||
    !HEX64.test(outline.treeHash) ||
    o["modelId"] !== opts.modelId ||
    o["promptVersion"] !== SUMMARY_PROMPT_VERSION ||
    o["revision"] !== outline.revision ||
    typeof o["summaries"] !== "object" ||
    o["summaries"] === null
  ) {
    return null;
  }
  const out = new Map<string, string>();
  for (const [id, value] of Object.entries(o["summaries"] as Record<string, unknown>)) {
    if (!NODE_ID.test(id) || !id.startsWith(`${outline.revision}-`) || typeof value !== "string") return null;
    if (value.length > maxChars + 3) return null;
    const screened = opts.screenSummary(value);
    if (screened !== null) out.set(id, screened);
  }
  return out;
}

export async function summarizeOutline(outline: OutlineResult, text: string, opts: SummaryOptions): Promise<SummaryResult> {
  const maxCalls = opts.maxCalls ?? 24;
  const maxChars = opts.maxSummaryChars ?? 200;
  const maxInput = opts.maxInputChars ?? 4000;
  const name = summaryCacheName(outline.treeHash, opts.modelId);
  if (opts.store) {
    let raw: string | null = null;
    try {
      raw = await opts.store.read(name);
    } catch {
      raw = null;
    }
    const cached = readCached(raw, outline, opts, maxChars);
    if (cached) return { summaries: cached, status: `cached (${cached.size})` };
    if (raw !== null) {
      try {
        await opts.store.remove(name);
      } catch {
        /* already gone */
      }
    }
  }
  const nodes: { id: string; start: number; end: number }[] = [];
  walkOutline(outline.nodes, (n) => nodes.push({ id: n.id, start: n.charStart, end: n.charEnd }));
  const summaries = new Map<string, string>();
  let dropped = 0;
  let calls = 0;
  for (const node of nodes) {
    if (calls >= maxCalls) break;
    calls += 1;
    let reply: string;
    try {
      reply = await opts.summarize(opts.screenInput(text.slice(node.start, node.end).slice(0, maxInput)));
    } catch {
      return { summaries, status: `unavailable after ${summaries.size} summaries` };
    }
    const cleaned = cleanSummary(reply, maxChars);
    const screened = cleaned.length === 0 ? null : opts.screenSummary(cleaned);
    if (screened === null) dropped += 1;
    else summaries.set(node.id, screened);
  }
  const skipped = nodes.length - calls;
  if (opts.store && summaries.size > 0) {
    const body = {
      schema: SUMMARY_SCHEMA,
      treeHash: outline.treeHash,
      modelId: opts.modelId,
      promptVersion: SUMMARY_PROMPT_VERSION,
      revision: outline.revision,
      summaries: Object.fromEntries(summaries),
    };
    try {
      await opts.store.write(name, JSON.stringify(body));
    } catch {
      /* summaries still returned; the cache is optional */
    }
  }
  return { summaries, status: `generated ${summaries.size}, dropped ${dropped}, skipped ${skipped} (call budget)` };
}
