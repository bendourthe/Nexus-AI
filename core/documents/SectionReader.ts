/**
 * v2.11.0 Phase 3.3 -- read one outline section, fail-closed.
 *
 * A slice is served only when every identity check passes: the document's
 * tree hash, the id's revision, the recorded text length, and the node's
 * anchor recomputed over the text the slice would come from. There is no
 * length tolerance anywhere: a mismatch is a refusal, never a nearby slice.
 */

import {
  anchorFor,
  findNode,
  pageHashesOf,
  safeBoundary,
  type OutlinePage,
  type OutlineResult,
} from "./DocumentOutline.js";

export type SectionReadFailure =
  | "document-changed"
  | "revision-changed"
  | "unknown-node"
  | "anchor-mismatch";

export type SectionReadResult =
  | {
      readonly ok: true;
      readonly nodeId: string;
      readonly title: string;
      readonly startPage: number | null;
      readonly endPage: number | null;
      readonly text: string;
      readonly truncated: boolean;
      /** Character offset within the section to pass back as `from` for the next part. */
      readonly continueFrom: number | null;
    }
  | { readonly ok: false; readonly reason: SectionReadFailure; readonly message: string };

export interface SectionReadLimits {
  /** Characters returned per call (context-derived by the caller). */
  readonly maxChars: number;
  /** Offset within the section to continue from. */
  readonly from?: number;
}

function fail(reason: SectionReadFailure, message: string): SectionReadResult {
  return { ok: false, reason, message };
}

export function readSection(
  outline: OutlineResult,
  nodeId: string,
  treeHash: string,
  text: string,
  pages: readonly OutlinePage[] | undefined,
  limits: SectionReadLimits,
): SectionReadResult {
  if (treeHash !== outline.treeHash) {
    return fail("document-changed", "document changed, call document_outline again");
  }
  if (!nodeId.startsWith(`${outline.revision}-`)) {
    return fail("revision-changed", "this node id belongs to another outline revision, call document_outline again");
  }
  const node = findNode(outline, nodeId);
  if (!node) {
    return fail("unknown-node", "unknown node id; call document_outline to list valid ids");
  }
  if (text.length !== outline.textLength) {
    return fail("anchor-mismatch", "the extracted text no longer matches this outline, call document_outline again");
  }
  const anchor = anchorFor(text, node.charStart, node.charEnd, pageHashesOf(pages), node.startPage, node.endPage);
  if (anchor !== node.anchor) {
    return fail("anchor-mismatch", "the extracted text no longer matches this outline, call document_outline again");
  }
  const sectionLength = node.charEnd - node.charStart;
  const from = Math.max(0, Math.min(limits.from ?? 0, sectionLength));
  const start = safeBoundary(text, node.charStart + from);
  const end = safeBoundary(text, Math.min(node.charEnd, start + Math.max(1, limits.maxChars)));
  const truncated = end < node.charEnd;
  return {
    ok: true,
    nodeId: node.id,
    title: node.title,
    startPage: node.startPage,
    endPage: node.endPage,
    text: text.slice(start, end),
    truncated,
    continueFrom: truncated ? end - node.charStart : null,
  };
}
