/**
 * v2.11.0 Phase 3.3 -- fail-closed section reads.
 */

import { describe, expect, it } from "vitest";

import { buildOutline, walkOutline, type OutlineNode } from "../../../../core/documents/DocumentOutline.js";
import { readSection } from "../../../../core/documents/SectionReader.js";

const pages = [
  { index: 0, text: "1 Intro\nalpha beta gamma delta" },
  { index: 1, text: "2 Setup\nepsilon zeta eta theta" },
];
const text = pages.map((p) => p.text).join("\n\n");
const HASH = "a".repeat(64);
const outline = buildOutline({ indexedText: text, textKind: "text", pages, kind: "pdf", treeHash: HASH });

function node(title: string): OutlineNode {
  let found: OutlineNode | undefined;
  walkOutline(outline.nodes, (n) => {
    if (n.title === title) found = n;
  });
  if (!found) throw new Error(`no node ${title}`);
  return found;
}

describe("readSection", () => {
  it("returns the section text with its page range", () => {
    const result = readSection(outline, node("2 Setup").id, HASH, text, pages, { maxChars: 10_000 });
    expect(result).toMatchObject({ ok: true, startPage: 2, endPage: 2, truncated: false });
    expect(result.ok && result.text.startsWith("2 Setup")).toBe(true);
  });

  it("truncates to the budget and continues from the returned offset", () => {
    const id = node("1 Intro").id;
    const first = readSection(outline, id, HASH, text, pages, { maxChars: 8 });
    expect(first).toMatchObject({ ok: true, truncated: true });
    const from = first.ok ? (first.continueFrom ?? 0) : 0;
    const second = readSection(outline, id, HASH, text, pages, { maxChars: 10_000, from });
    expect(first.ok && second.ok && (first.text + second.text).startsWith("1 Intro\nalpha beta")).toBe(true);
  });

  it("refuses a different tree hash", () => {
    expect(readSection(outline, node("1 Intro").id, "b".repeat(64), text, pages, { maxChars: 100 })).toMatchObject({
      ok: false,
      reason: "document-changed",
    });
  });

  it("fails closed on an id from another revision", () => {
    const stale = `00000000-${node("1 Intro").id.split("-")[1]}`;
    expect(readSection(outline, stale, HASH, text, pages, { maxChars: 100 })).toMatchObject({
      ok: false,
      reason: "revision-changed",
    });
  });

  it("reports an unknown id from the right revision", () => {
    expect(readSection(outline, `${outline.revision}-ffffffffffff`, HASH, text, pages, { maxChars: 100 })).toMatchObject({
      ok: false,
      reason: "unknown-node",
    });
  });

  it("detects interior drift of the same length (no tolerance)", () => {
    const drifted = text.replace("beta", "bets");
    expect(drifted.length).toBe(text.length);
    const driftedPages = [{ index: 0, text: pages[0]?.text.replace("beta", "bets") ?? "" }, pages[1] ?? { index: 1, text: "" }];
    expect(readSection(outline, node("1 Intro").id, HASH, drifted, driftedPages, { maxChars: 100 })).toMatchObject({
      ok: false,
      reason: "anchor-mismatch",
    });
  });

  it("refuses text of a different length", () => {
    expect(readSection(outline, node("1 Intro").id, HASH, `${text}x`, pages, { maxChars: 100 })).toMatchObject({
      ok: false,
      reason: "anchor-mismatch",
    });
  });

  it("never splits a surrogate pair at the budget edge", () => {
    const t = `## A\nab\u{1F600}cd`;
    const o = buildOutline({ indexedText: t, textKind: "markdown", kind: "markdown", treeHash: HASH });
    const id = o.nodes[0]?.id ?? "";
    const r = readSection(o, id, HASH, t, undefined, { maxChars: 8 });
    expect(r.ok && r.text.endsWith("b")).toBe(true);
  });
});
