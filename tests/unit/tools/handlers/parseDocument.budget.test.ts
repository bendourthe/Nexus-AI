/**
 * v2.12.0 Phase 2 -- the extension's `parse_document` sizes its output from
 * the room left in the window, and produces exactly what the headless twin
 * produces for the same inputs.
 */

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ParseDocumentTool, type DocumentParser } from "../../../../src/tools/handlers/parseDocument.js";
import { createHeadlessTools } from "../../../../modules/coding/runtime/headlessTools.js";
import { DEFAULT_CONTEXT_TOKENS } from "../../../../modules/coding/documents/DocumentOutlineTools.js";
import { budgetChars, PARSE_DOCUMENT_CONTEXT_SHARE, RESERVE_TOKENS } from "../../../../modules/coding/runtime/outputBudget.js";
import { mockFs } from "../../../setup.js";

const PARSED = "scanned line of text\n".repeat(3_000);
const WINDOW = 8_192;

const parser: DocumentParser = {
  parse: async () => ({ engine: "rapidocr", text: PARSED, markdown: null, pageCount: 4 }),
};

function tool(contextTokens?: number): ParseDocumentTool {
  return new ParseDocumentTool({
    resolveParser: () => parser,
    ...(contextTokens !== undefined ? { contextTokens: () => contextTokens } : {}),
  });
}

let workdir = "";
beforeEach(() => {
  mockFs.readFile.mockResolvedValue(new TextEncoder().encode("%PDF-1.7 fake"));
  workdir = mkdtempSync(join(tmpdir(), "parse-parity-"));
  writeFileSync(join(workdir, "scan.pdf"), "%PDF-1.7 fake");
});
afterEach(() => {
  rmSync(workdir, { recursive: true, force: true });
});

describe("extension parse_document output budget", () => {
  it("returns less text when the conversation already fills most of the window", async () => {
    const t = tool(WINDOW);
    const empty = await t.execute({ _callId: "a", path: "scan.pdf", _usedTokens: 0 });
    const full = await t.execute({ _callId: "b", path: "scan.pdf", _usedTokens: WINDOW - RESERVE_TOKENS - 100 });
    expect(empty.success && full.success).toBe(true);
    expect(full.output.length).toBeLessThan(empty.output.length);
    expect(full.output).toContain("characters withheld");
  });

  it("caps output at the fixed share when no usage count is passed", async () => {
    const r = await tool(WINDOW).execute({ _callId: "c", path: "scan.pdf" });
    const header = 'Parsed "scan.pdf" with rapidocr (4 page(s)):\n\n';
    const body = r.output.slice(header.length).split("\n\n[parse_document output truncated")[0] ?? "";
    expect(body.length).toBe(budgetChars(WINDOW, PARSE_DOCUMENT_CONTEXT_SHARE));
  });

  it("uses the default window when none is configured, so output is never uncapped", async () => {
    const r = await tool().execute({ _callId: "d", path: "scan.pdf" });
    expect(r.output.length).toBeLessThan(PARSED.length);
    expect(r.output.length).toBeLessThanOrEqual(budgetChars(DEFAULT_CONTEXT_TOKENS, PARSE_DOCUMENT_CONTEXT_SHARE) + 400);
  });

  it("ignores a malformed _usedTokens and falls back to the fixed share", async () => {
    const bad = await tool(WINDOW).execute({ _callId: "e", path: "scan.pdf", _usedTokens: "lots" });
    const none = await tool(WINDOW).execute({ _callId: "f", path: "scan.pdf" });
    expect(bad.output).toBe(none.output);
  });
});

describe("parse_document budget parity across channels", () => {
  it.each([0, 2_000, 6_000, WINDOW])("produces identical output in both channels with %i tokens used", async (used) => {
    const extension = await tool(WINDOW).execute({ _callId: "p", path: "scan.pdf", _usedTokens: used });
    const headless = createHeadlessTools({
      parseDocumentEnabled: true,
      documentParser: parser,
      outlineContextTokens: () => WINDOW,
    }).find((t) => t.name === "parse_document");
    const sidecar = await headless?.execute({ path: "scan.pdf" }, { workdir, workspaceRoots: [workdir], usedTokens: used });
    expect(sidecar?.output).toBe(extension.output);
  });
});
