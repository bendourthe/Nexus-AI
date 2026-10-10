/**
 * v2.12.0 Phase 2 -- window-aware tool output: the shared budget rule, the
 * per-turn ledger, and the headless document tools that use them.
 */

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  budgetChars,
  CHARS_PER_TOKEN,
  FLOOR_CHARS,
  NEARLY_FULL_NOTE,
  remainingBudgetChars,
  RESERVE_TOKENS,
  sizeParsedDocument,
  TRUNCATION_MARGIN_TOKENS,
  truncateToBudget,
  TurnLedger,
} from "../../../modules/coding/runtime/outputBudget.js";
import { createHeadlessTools, type HeadlessTool, type HeadlessToolContext } from "../../../modules/coding/runtime/headlessTools.js";

describe("remainingBudgetChars", () => {
  const WINDOW = 16_384;

  it("returns the fixed share when the usage count is unknown", () => {
    for (const used of [undefined, null, Number.NaN, -1]) {
      expect(remainingBudgetChars(WINDOW, used, 0.25)).toEqual({ chars: budgetChars(WINDOW, 0.25), nearlyFull: false });
    }
  });

  it("returns the fixed share in an empty conversation, because the room left is larger", () => {
    expect(remainingBudgetChars(WINDOW, 0, 0.25).chars).toBe(budgetChars(WINDOW, 0.25));
  });

  it("shrinks to the room left minus the answer reserve as the conversation fills", () => {
    const used = 13_000;
    const room = (WINDOW - used - RESERVE_TOKENS) * CHARS_PER_TOKEN;
    expect(room).toBeLessThan(budgetChars(WINDOW, 0.25));
    expect(remainingBudgetChars(WINDOW, used, 0.25)).toEqual({ chars: room, nearlyFull: false });
  });

  it("never goes below the floor, and says so when the window is nearly or over full", () => {
    expect(remainingBudgetChars(WINDOW, WINDOW - RESERVE_TOKENS - 10, 0.25)).toEqual({ chars: FLOOR_CHARS, nearlyFull: true });
    expect(remainingBudgetChars(WINDOW, WINDOW * 2, 0.25)).toEqual({ chars: FLOOR_CHARS, nearlyFull: true });
  });

  it("treats a count within the truncation margin as a full window", () => {
    const justBelow = WINDOW - TRUNCATION_MARGIN_TOKENS;
    expect(remainingBudgetChars(WINDOW, justBelow, 0.25).nearlyFull).toBe(true);
  });

  it("decreases monotonically as usage grows", () => {
    let previous = Number.POSITIVE_INFINITY;
    for (let used = 0; used <= WINDOW; used += 512) {
      const { chars } = remainingBudgetChars(WINDOW, used, 0.25);
      expect(chars).toBeLessThanOrEqual(previous);
      previous = chars;
    }
  });
});

describe("truncateToBudget", () => {
  it("keeps short text whole and reports what it withholds from long text", () => {
    expect(truncateToBudget("abc", 10)).toEqual({ text: "abc", withheld: 0 });
    expect(truncateToBudget("abcdef", 4)).toEqual({ text: "abcd", withheld: 2 });
  });

  it("does not split a surrogate pair", () => {
    const smile = String.fromCodePoint(0x1f600);
    const cut = truncateToBudget(`ab${smile}cd`, 3);
    expect(cut.text).toBe("ab");
    expect(cut.withheld).toBe(4);
  });
});

describe("TurnLedger", () => {
  it("keeps document budgeting on its fixed share until a prompt count is known", () => {
    const ledger = new TurnLedger();
    ledger.turnCompleted(undefined, 400);
    expect(ledger.usedTokens(80_000)).toBe(20_000);
    expect(remainingBudgetChars(16_384, ledger.toolBudgetTokens(80_000), 0.25).chars).toBe(16_384);
    ledger.turnCompleted({ prompt_eval_count: 13_000, eval_count: 0 }, 0);
    expect(ledger.toolBudgetTokens(0)).toBe(13_000);
  });

  it("falls back to the history estimate when the backend sends no count", () => {
    const ledger = new TurnLedger();
    ledger.turnCompleted(undefined, 400);
    expect(ledger.usedTokens(8_000)).toBe(2_000);
  });

  it("adds what was appended after the reported turn", () => {
    const ledger = new TurnLedger();
    ledger.turnCompleted({ prompt_eval_count: 5_000, eval_count: 100 }, 400);
    expect(ledger.usedTokens(0)).toBe(5_100);
    ledger.record(4_000);
    expect(ledger.usedTokens(0)).toBe(6_100);
  });

  it("reads an OpenAI-shaped usage block", () => {
    const ledger = new TurnLedger();
    ledger.turnCompleted({ usage: { prompt_tokens: 3_000, completion_tokens: 20 } }, 80);
    expect(ledger.usedTokens(0)).toBe(3_020);
  });

  it("uses the larger of the report and the estimate, so an uncached-only count cannot understate", () => {
    const ledger = new TurnLedger();
    ledger.turnCompleted({ prompt_eval_count: 200, eval_count: 10 }, 40);
    expect(ledger.usedTokens(40_000)).toBe(10_000);
  });

  it("restarts the appended count at each reported turn, and keeps the report across a turn without one", () => {
    const ledger = new TurnLedger();
    ledger.turnCompleted({ prompt_eval_count: 1_000, eval_count: 0 }, 0);
    ledger.record(4_000);
    ledger.turnCompleted({ prompt_eval_count: 2_500, eval_count: 0 }, 0);
    expect(ledger.usedTokens(0)).toBe(2_500);
    ledger.turnCompleted(undefined, 400);
    expect(ledger.usedTokens(0)).toBe(2_600);
  });
});

describe("sizeParsedDocument", () => {
  it("cuts the body, says how much was withheld, and flags a nearly full window", () => {
    const body = "y".repeat(10_000);
    const roomy = sizeParsedDocument("H:\n\n", body, 4_096, 0);
    expect(roomy).toContain("characters withheld");
    expect(roomy).not.toContain(NEARLY_FULL_NOTE);
    const full = sizeParsedDocument("H:\n\n", body, 4_096, 4_096);
    expect(full).toContain(NEARLY_FULL_NOTE);
    expect(full.length).toBeLessThan(roomy.length);
  });

  it("returns header and body unchanged when they fit", () => {
    expect(sizeParsedDocument("H:\n\n", "short", 16_384, 0)).toBe("H:\n\nshort");
  });
});

describe("headless document tools size output from the room left", () => {
  let workdir = "";
  beforeEach(() => {
    workdir = mkdtempSync(join(tmpdir(), "budget-ws-"));
  });
  afterEach(() => {
    rmSync(workdir, { recursive: true, force: true });
  });

  const WINDOW = 4_096;
  const parsedText = "page text ".repeat(2_000);

  function tools(): HeadlessTool[] {
    return createHeadlessTools({
      parseDocumentEnabled: true,
      documentOutlineEnabled: true,
      outlineCacheDir: null,
      outlineContextTokens: () => WINDOW,
      documentParser: {
        parse: async () => ({ engine: "rapidocr", text: parsedText, markdown: null, pageCount: 3 }),
      },
    });
  }

  function byName(name: string): HeadlessTool {
    const tool = tools().find((t) => t.name === name);
    if (!tool) throw new Error(`missing tool ${name}`);
    return tool;
  }

  function ctx(usedTokens?: number): HeadlessToolContext {
    return { workdir, workspaceRoots: [workdir], ...(usedTokens !== undefined ? { usedTokens } : {}) };
  }

  it("returns less parse_document text when the conversation already fills most of the window", async () => {
    writeFileSync(join(workdir, "scan.pdf"), "%PDF-1.7 fake");
    const tool = byName("parse_document");
    const empty = await tool.execute({ path: "scan.pdf" }, ctx(0));
    const full = await tool.execute({ path: "scan.pdf" }, ctx(WINDOW - RESERVE_TOKENS - 100));
    const unknown = await tool.execute({ path: "scan.pdf" }, ctx());
    expect(empty.success && full.success && unknown.success).toBe(true);
    expect(full.output.length).toBeLessThan(empty.output.length);
    expect(empty.output.length).toBe(unknown.output.length);
    expect(empty.output).toContain("characters withheld");
  });

  it("returns less document_read_section text when the conversation already fills most of the window", async () => {
    writeFileSync(join(workdir, "long.md"), `# Title\n\n## Only\n${"word ".repeat(4_000)}\n`);
    const set = tools();
    const outline = set.find((t) => t.name === "document_outline");
    const read = set.find((t) => t.name === "document_read_section");
    if (!outline || !read) throw new Error("outline tools missing");
    const o = await outline.execute({ path: "long.md" }, ctx(0));
    const ids = [...o.output.matchAll(/\[([0-9a-f]{8}-[0-9a-f]{12})\]/g)].map((m) => m[1] ?? "");
    const treeHash = /tree_hash=([0-9a-f]{64})/.exec(o.output)?.[1] ?? "";
    const args = { path: "long.md", node_id: ids.at(-1) ?? "", tree_hash: treeHash };
    const roomy = await read.execute(args, ctx(0));
    const tight = await read.execute(args, ctx(WINDOW - RESERVE_TOKENS - 200));
    expect(roomy.success && tight.success).toBe(true);
    expect(tight.output.length).toBeLessThan(roomy.output.length);
    expect(tight.output.length).toBeGreaterThan(FLOOR_CHARS / 2);
  });

  it("caps parse_document at the default fixed share when the host does not know the window or usage", async () => {
    writeFileSync(join(workdir, "scan.pdf"), "%PDF-1.7 fake");
    const set = createHeadlessTools({
      parseDocumentEnabled: true,
      documentParser: { parse: async () => ({ engine: "rapidocr", text: parsedText, markdown: null, pageCount: 3 }) },
    });
    const tool = set.find((t) => t.name === "parse_document");
    const r = await tool?.execute({ path: "scan.pdf" }, ctx());
    expect(r?.output).toContain(parsedText.trim().slice(0, 100));
    expect(r?.success).toBe(true);
    expect(r?.output).toContain("characters withheld");
    expect(r?.output.length).toBeLessThan(9_000);
    expect(r?.output).not.toContain("context window is nearly full");
  });
});
