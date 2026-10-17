/**
 * v2.14.0 T007 -- what a streamed reply shows and what it speaks.
 *
 * Two pure, incremental pieces shared by the extension, desktop Chat and the
 * headless loop (no catalog lookup, no I/O):
 *
 * - `createReasoningSplitter` separates reasoning from visible text. The
 *   caller passes `reasoningOpensInPrompt`: for models whose chat template
 *   opens `<think>` inside the prompt, everything is reasoning until the first
 *   `</think>`, and a stream that never closes it has no visible text. Well-
 *   formed `<think>...</think>` blocks are removed for every model. A tag split
 *   across chunks is held back until it is complete.
 * - `createSpeakableProjector` turns visible text into complete, speakable
 *   sentences: tool-call spans removed, `redactSecrets` applied to the whole
 *   accumulated buffer before any splitting, fenced code and tables replaced
 *   by a short cue, links spoken by label and never by URL.
 *
 * Holdback rule: every secret pattern `redactSecrets` knows is a run without
 * whitespace (PEM blocks excepted, which are held until their END line), so
 * nothing past the last whitespace is ever finalized. A secret split across
 * chunks or across a period is therefore redacted before it can be spoken.
 */

import { redactSecrets } from "../observability/redactSecrets.js";

export const CODE_CUE = "Code is on screen.";
export const TABLE_CUE = "Table is on screen.";
export const LINK_WORD = "link";

const THINK_OPEN = "<think>";
const THINK_CLOSE = "</think>";

export interface ReasoningDelta {
  readonly visible: string;
  readonly reasoning: string;
}

export interface ReasoningSplitter {
  push(chunk: string): ReasoningDelta;
  /** Flush held bytes. `reasoningOnly` is true when no visible text ever existed. */
  end(): ReasoningDelta & { readonly reasoningOnly: boolean };
}

/** Longest suffix of `text` that is a proper prefix of `tag`. */
function partialTagSuffix(text: string, tag: string): number {
  const max = Math.min(text.length, tag.length - 1);
  for (let n = max; n > 0; n--) {
    if (tag.startsWith(text.slice(text.length - n))) return n;
  }
  return 0;
}

export function createReasoningSplitter(options: {
  readonly reasoningOpensInPrompt: boolean;
}): ReasoningSplitter {
  let inReasoning = options.reasoningOpensInPrompt;
  let held = "";
  let sawVisible = false;

  const step = (input: string, final: boolean): ReasoningDelta => {
    let buf = held + input;
    held = "";
    let visible = "";
    let reasoning = "";
    while (buf.length > 0) {
      const tag = inReasoning ? THINK_CLOSE : THINK_OPEN;
      const at = buf.indexOf(tag);
      if (at >= 0) {
        if (inReasoning) reasoning += buf.slice(0, at);
        else visible += buf.slice(0, at);
        buf = buf.slice(at + tag.length);
        inReasoning = !inReasoning;
        continue;
      }
      const keep = final ? 0 : partialTagSuffix(buf, tag);
      const body = buf.slice(0, buf.length - keep);
      if (inReasoning) reasoning += body;
      else visible += body;
      held = buf.slice(buf.length - keep);
      break;
    }
    if (visible.length > 0) sawVisible = true;
    return { visible, reasoning };
  };

  return {
    push: (chunk) => step(chunk, false),
    end: () => {
      const delta = step("", true);
      return { ...delta, reasoningOnly: !sawVisible };
    },
  };
}

// --------------------------------------------------------------- projection

const TOOL_SPANS: ReadonlyArray<readonly [open: string, close: string]> = [
  ["<|tool_call>", "<tool_call|>"],
  ["<|tool_call_start|>", "<|tool_call_end|>"],
];
const PEM_OPEN_RE = /-----BEGIN [A-Z ]*PRIVATE KEY-----/g;
const PEM_CLOSE_RE = /-----END [A-Z ]*PRIVATE KEY-----/;

/**
 * Words whose trailing period does not end a sentence. Titles count only when
 * capitalized, so the unit "ms." still ends one. "etc." and "No." usually end
 * a sentence, so they are not listed: splitting is the safer mistake.
 */
const ABBREVIATIONS = new Set(["e.g", "i.e", "vs", "fig", "approx", "cf"]);
const TITLES = new Set(["Mr", "Mrs", "Ms", "Dr", "Prof", "Sr", "Jr", "St", "Inc", "Ltd", "Co"]);

/** Remove complete spans; return the index of an unclosed span's start, or -1. */
function stripSpans(text: string, open: string, close: string): { text: string; unclosedAt: number } {
  let out = "";
  let rest = text;
  for (;;) {
    const start = rest.indexOf(open);
    if (start < 0) return { text: out + rest, unclosedAt: -1 };
    const end = rest.indexOf(close, start + open.length);
    if (end < 0) return { text: out + rest.slice(0, start), unclosedAt: out.length + start };
    out += rest.slice(0, start) + " ";
    rest = rest.slice(end + close.length);
  }
}

/** Index of the first unclosed PEM block, or -1. */
function unclosedPem(text: string): number {
  PEM_OPEN_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = PEM_OPEN_RE.exec(text)) !== null) {
    if (!PEM_CLOSE_RE.test(text.slice(m.index + m[0].length))) return m.index;
  }
  return -1;
}

const isTableLine = (line: string): boolean => /^\s*\|/.test(line);
const isFence = (line: string): boolean => /^\s*(```|~~~)/.test(line);

/**
 * Speakable text of a markdown prefix. In non-final mode the prefix must
 * already be cut at a safe point; unclosed fences and trailing tables are
 * dropped (held), in final mode they become their cue.
 */
function projectBlocks(text: string, final: boolean): string {
  const lines = text.split("\n");
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    if (isFence(line)) {
      let j = i + 1;
      while (j < lines.length && !isFence(lines[j]!)) j++;
      if (j >= lines.length && !final) break; // unclosed fence: hold it back
      out.push(CODE_CUE);
      i = j + 1;
      continue;
    }
    if (isTableLine(line)) {
      let j = i;
      while (j < lines.length && isTableLine(lines[j]!)) j++;
      if (j >= lines.length && !final) break; // the table may continue
      out.push(TABLE_CUE);
      i = j;
      continue;
    }
    out.push(line);
    i++;
  }
  return out.join("\n");
}

/** Inline markdown to plain speech: links by label, no URLs or markup. */
function projectInline(text: string): string {
  return (
    text
      // Images first, then links: speak the alt text or label only.
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/<https?:\/\/[^>\s]*>/g, LINK_WORD)
      .replace(/\bhttps?:\/\/[^\s)>\]]+/g, LINK_WORD)
      .replace(/\bwww\.[^\s)>\]]+/g, LINK_WORD)
      .replace(/`([^`]*)`/g, "$1")
      .replace(/^\s{0,3}#{1,6}\s+/gm, "")
      .replace(/^\s*(?:[-*+]|\d+[.)])\s+/gm, "")
      .replace(/(\*\*|__|\*|_)(?=\S)([^*_]+?)\1/g, "$2")
  );
}

/** Split speech into sentences; the last element may be incomplete. */
export function splitSentences(text: string): string[] {
  const sentences: string[] = [];
  let start = 0;
  const re = /([.!?])(["')\]]*)(\s+)|\n\s*\n/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m[1]) {
      const before = text.slice(start, m.index);
      const lastWord = /([A-Za-z.]+)$/.exec(before)?.[1] ?? "";
      const bare = lastWord.replace(/\.$/, "");
      if (m[1] === "." && (ABBREVIATIONS.has(bare.toLowerCase()) || TITLES.has(bare))) continue;
      if (m[1] === "." && /^[A-Za-z]$/.test(lastWord)) continue; // initials: "J. Smith"
    }
    const end = m.index + (m[1] ? m[1].length + m[2]!.length : 0);
    const sentence = text.slice(start, end).replace(/\s+/g, " ").trim();
    if (sentence) sentences.push(sentence);
    start = m.index + m[0].length;
  }
  sentences.push(text.slice(start).replace(/\s+/g, " ").trim());
  return sentences;
}

/** The safe prefix of the accumulated visible text, in raw coordinates. */
function safePrefix(raw: string): string {
  let limit = raw.length;
  for (const [open, close] of TOOL_SPANS) {
    const { unclosedAt } = stripSpans(raw, open, close);
    if (unclosedAt >= 0) {
      // stripSpans reports in stripped coordinates; find the raw open position.
      limit = Math.min(limit, raw.lastIndexOf(open));
    }
  }
  const pem = unclosedPem(raw);
  if (pem >= 0) limit = Math.min(limit, pem);
  // Never finalize the trailing non-whitespace run: it may be a partial secret.
  const head = raw.slice(0, limit);
  const lastSpace = Math.max(head.lastIndexOf(" "), head.lastIndexOf("\n"), head.lastIndexOf("\t"));
  return lastSpace >= 0 ? head.slice(0, lastSpace + 1) : "";
}

/** Speakable sentences of `raw`; with `final` false only the stable prefix. */
export function speakableSentences(raw: string, final: boolean): string[] {
  let text = final ? raw : safePrefix(raw);
  for (const [open, close] of TOOL_SPANS) text = stripSpans(text, open, close).text;
  if (final) {
    const pem = unclosedPem(text);
    if (pem >= 0) text = text.slice(0, pem);
  }
  const redacted = redactSecrets(text);
  const spoken = projectInline(projectBlocks(redacted, final));
  const sentences = splitSentences(spoken);
  // In streaming mode the last element is still open, so it is never spoken yet.
  return final ? sentences.filter((s) => s.length > 0) : sentences.slice(0, -1).filter((s) => s.length > 0);
}

export interface SpeakableProjector {
  /** Add visible text; returns sentences that became complete and safe. */
  push(visibleDelta: string): string[];
  /** The stream ended: returns every remaining speakable sentence. */
  end(): string[];
  /** Everything emitted so far, in order (for the spoken-text gate). */
  readonly emitted: readonly string[];
}

export function createSpeakableProjector(): SpeakableProjector {
  let raw = "";
  const emitted: string[] = [];
  const take = (sentences: string[]): string[] => {
    const fresh = sentences.slice(emitted.length);
    emitted.push(...fresh);
    return fresh;
  };
  return {
    push(delta) {
      raw += delta;
      return take(speakableSentences(raw, false));
    },
    end() {
      return take(speakableSentences(raw, true));
    },
    get emitted() {
      return emitted;
    },
  };
}

/** The whole speakable projection of a finished reply (T010 gate V-7). */
export function speakableProjection(visibleText: string): string {
  return speakableSentences(visibleText, true).join(" ");
}
