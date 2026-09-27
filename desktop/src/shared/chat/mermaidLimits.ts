/** Render-cost caps. Checked before Mermaid parses. */

export const MAX_FENCE_BYTES = 8_192;
export const MAX_NODES = 40;
export const MAX_EDGES = 60;
export const RENDER_TIMEOUT_MS = 1_500;

const EDGE_MARKERS = ["==>", "-.->", "-->", "--o", "--x", "---"] as const;
const NODE_HEAD = /\b([A-Za-z_][\w]*)\s*(?:\[|\(|\{)/g;

export type MermaidAssessment =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: "bytes" | "nodes" | "edges" };

export function mermaidByteLength(source: string): number {
  return new TextEncoder().encode(source).length;
}

function identEndingAt(source: string, index: number): string {
  let end = index;
  while (end > 0 && /[A-Za-z0-9_]/.test(source[end - 1] ?? "")) end -= 1;
  return source.slice(end, index);
}

function identStartingAt(source: string, index: number): string {
  let end = index;
  while (end < source.length && /[A-Za-z0-9_]/.test(source[end] ?? "")) end += 1;
  return source.slice(index, end);
}

export function countMermaidNodes(source: string): number {
  const ids = new Set<string>();
  for (const match of source.matchAll(NODE_HEAD)) {
    if (match[1]) ids.add(match[1]);
  }
  let index = 0;
  while (index < source.length) {
    let marker = "";
    for (const candidate of EDGE_MARKERS) {
      if (source.startsWith(candidate, index)) {
        marker = candidate;
        break;
      }
    }
    if (marker) {
      const left = identEndingAt(source, index);
      const right = identStartingAt(source, index + marker.length);
      if (left) ids.add(left);
      if (right) ids.add(right);
      index += marker.length;
    } else {
      index += 1;
    }
  }
  return ids.size;
}

export function countMermaidEdges(source: string): number {
  let count = 0;
  let index = 0;
  while (index < source.length) {
    const marker = EDGE_MARKERS.find((candidate) => source.startsWith(candidate, index));
    if (marker) {
      count += 1;
      index += marker.length;
    } else {
      index += 1;
    }
  }
  return count;
}

export function assessMermaidSource(source: string): MermaidAssessment {
  if (mermaidByteLength(source) > MAX_FENCE_BYTES) return { ok: false, reason: "bytes" };
  if (countMermaidNodes(source) > MAX_NODES) return { ok: false, reason: "nodes" };
  if (countMermaidEdges(source) > MAX_EDGES) return { ok: false, reason: "edges" };
  return { ok: true };
}

/** Mermaid `click A href "..."` becomes a navigation. Drop those lines before render. */
export function neutralizeMermaidClicks(source: string): string {
  return source
    .split("\n")
    .filter((line) => !/^\s*click\s+/i.test(line))
    .join("\n");
}

export interface ContentPart {
  readonly kind: "text" | "mermaid";
  readonly text: string;
}

export function splitMermaidFences(content: string): readonly ContentPart[] {
  const parts: ContentPart[] = [];
  const pattern = /```mermaid\s*\n([\s\S]*?)```/gi;
  let cursor = 0;
  for (const match of content.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > cursor) {
      parts.push({ kind: "text", text: content.slice(cursor, index) });
    }
    parts.push({ kind: "mermaid", text: match[1] ?? "" });
    cursor = index + match[0].length;
  }
  if (cursor < content.length) {
    parts.push({ kind: "text", text: content.slice(cursor) });
  }
  return parts.length > 0 ? parts : [{ kind: "text", text: content }];
}

export function withTimeout<T>(work: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("diagram render timed out")), timeoutMs);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err instanceof Error ? err : new Error(String(err)));
      },
    );
  });
}
