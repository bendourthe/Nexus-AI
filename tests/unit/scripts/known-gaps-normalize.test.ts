/**
 * v2.15.0 Phase 1 (T003, T004) -- the one-time known-gaps ledger converter and
 * its independent preservation oracle.
 *
 * The converter must change format, never wording, and its output must be
 * readable by the completion checker with zero problems. The second property
 * is checked against tests/fixtures/known-gaps/expected-parse.json, the pinned
 * checker's parse of the committed expected outputs (captured by capture.mjs),
 * so CI needs no `~/.nexus-hub`. Removed with the converter after v2.15.0.
 */

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  convertLedger,
  inScope,
  Refusal,
  splitFirstSentence,
} from "../../../scripts/known-gaps/migrations/normalize.mjs";
import { checkPreservation, contentWords } from "../../../scripts/known-gaps/migrations/preserve.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(resolve(HERE, "../../.."), "tests/fixtures/known-gaps");
const DATE = { date: "2026-10-19" };

type Item = { id: string; state: string; section: string };
type Ledger = { path: string; minor: string; layout: string; items: Item[]; problems: string[]; text: string };

function fixtureLedgers(name = "discovery.json"): Ledger[] {
  const found = JSON.parse(readFileSync(join(FIXTURES, name), "utf8")) as { ledgers: Omit<Ledger, "text">[] };
  return found.ledgers.map((ledger) => ({ ...ledger, text: readFileSync(join(FIXTURES, "repo", ledger.path), "utf8") }));
}

const expectedParse = JSON.parse(readFileSync(join(FIXTURES, "expected-parse.json"), "utf8")) as Record<
  string,
  { items: Item[]; problems: string[] }
>;
const lf = (text: string) => text.replaceAll("\r\n", "\n");

/** A one-ledger world for the refusal cases. */
function ledger(path: string, minor: string, lines: string[], problems: string[], items: Item[] = []): Ledger {
  return { path, minor, layout: "archive", items, problems, text: lines.join("\n") };
}

describe("convertLedger on the fixtures", () => {
  const all = fixtureLedgers();
  const converted = Object.keys(expectedParse);

  it.each(converted)("should reproduce the reviewed output for %s", (path) => {
    const target = all.find((l) => l.path === path)!;

    const { output, changed } = convertLedger(target, all, DATE);

    expect(changed).toBe(true);
    expect(lf(output)).toBe(lf(readFileSync(join(FIXTURES, "expected", path), "utf8")));
  });

  it.each(converted)("should produce an output the pinned checker reads with zero problems for %s", (path) => {
    const target = all.find((l) => l.path === path)!;

    const { report } = convertLedger(target, all, DATE);

    expect(expectedParse[path].problems).toEqual([]);
    expect(expectedParse[path].items.filter((i) => i.state === "open")).toHaveLength(report.openAfter);
  });

  it.each(converted)("should preserve every word and link of %s", (path) => {
    const target = all.find((l) => l.path === path)!;

    const { output } = convertLedger(target, all, DATE);

    expect(checkPreservation(target.text, output)).toMatchObject({ ok: true });
  });

  it("should leave an already converted ledger unchanged", () => {
    const after = fixtureLedgers("converted-discovery.json").map((l) => {
      const path = join(FIXTURES, "expected", l.path);
      return converted.includes(l.path) ? { ...l, text: readFileSync(path, "utf8") } : l;
    });
    const target = after.find((l) => l.path === "docs/archive/v2/v2.6/known-gaps.md")!;

    const result = convertLedger(target, after, DATE);

    expect(result.changed).toBe(false);
    expect(result.output).toBe(target.text);
  });

  it("should keep CRLF line endings", () => {
    const target = all.find((l) => l.path === "docs/archive/v2/v2.4/known-gaps.md")!;
    const crlf = { ...target, text: lf(target.text).replaceAll("\n", "\r\n") };

    const { output } = convertLedger(crlf, all, DATE);

    expect(output).toContain("\r\n");
    expect(output.replaceAll("\r\n", "")).not.toContain("\n");
  });

  it("should refuse a ledger outside v1.17 to v2.12", () => {
    const legacy = ledger("docs/archive/v1/v1.3/known-gaps.md", "v1.3", ["# x"], ["line 1 heading-without-id"]);

    expect(() => convertLedger(legacy, [legacy], DATE)).toThrow(/outside v1.17 to v2.12/);
    expect(inScope("v2.12")).toBe(true);
    expect(inScope("v2.13")).toBe(false);
  });
});

describe("convertLedger refusals", () => {
  const table = ["# Known gaps", "", "## v2.8.0", "", "| ID | Why it is still open | Archived record |", "| --- | --- | --- |"];

  it("should refuse two original rows with the same id in one section and name both", () => {
    const target = ledger(
      "docs/archive/v2/v2.8/known-gaps.md",
      "v2.8",
      [...table, "| DF-1 | First. | this file |", "| DF-1 | Second. | this file |"],
      ["line 7 row", "line 8 row"],
    );

    expect(() => convertLedger(target, [target], DATE)).toThrow(/line 8: DF-1 collides with line 7/);
  });

  it("should refuse a table without a separator row", () => {
    const target = ledger(
      "docs/archive/v2/v2.8/known-gaps.md",
      "v2.8",
      ["# Known gaps", "", "| ID | Why |", "| DF-1 | No separator. |"],
      ["line 4 row"],
    );

    expect(() => convertLedger(target, [target], DATE)).toThrow(/line 3: table without a separator row/);
  });

  it("should refuse a bullet that continues as an unindented paragraph", () => {
    const target = ledger(
      "docs/archive/v2/v2.8/known-gaps.md",
      "v2.8",
      ["# Known gaps", "", "### Open Items", "", "- **DF-1** - Title. Body.", "continues here"],
      ["line 5 row"],
    );

    expect(() => convertLedger(target, [target], DATE)).toThrow(/line 6: bullet DF-1 continues/);
  });

  it("should refuse a row whose id two earlier ledgers hold when the row names neither", () => {
    const holder = (minor: string) =>
      ledger(`docs/archive/v2/${minor}/known-gaps.md`, minor, ["# x"], [], [{ id: "DF-7", state: "open", section: "v" }]);
    const target = ledger(
      "docs/archive/v2/v2.8/known-gaps.md",
      "v2.8",
      [...table, "| DF-7 | Carried. | somewhere |"],
      ["line 7 row"],
    );

    expect(() => convertLedger(target, [holder("v2.5"), holder("v2.6"), target], DATE)).toThrow(
      /DF-7 is held by docs\/archive\/v2\/v2.5\/known-gaps.md, docs\/archive\/v2\/v2.6\/known-gaps.md/,
    );
  });

  it("should refuse an id cell that carries more than the id", () => {
    const target = ledger(
      "docs/archive/v2/v2.8/known-gaps.md",
      "v2.8",
      [...table, "| DF-1 (renamed) | Text. | this file |"],
      ["line 7 row"],
    );

    expect(() => convertLedger(target, [target], DATE)).toThrow(Refusal);
  });
});

describe("checkPreservation", () => {
  const source = "| ID | Why it is still open | Archived record |\n| --- | --- | --- |\n| DF-1 | One two three. | [rec](a/b.md) |\n";

  it("should pass a faithful conversion", () => {
    const output = "### DF-1 - One two three.\n\n- **Archived record**: [rec](a/b.md)\n";

    expect(checkPreservation(source, output).ok).toBe(true);
  });

  it("should fail on a dropped word and print the first differing words", () => {
    const output = "### DF-1 - One three.\n\n- **Archived record**: [rec](a/b.md)\n";

    expect(checkPreservation(source, output)).toMatchObject({
      ok: false,
      reason: "word-sequence",
      expected: "two three. [rec](a/b.md)",
      actual: "three. [rec](a/b.md)",
    });
  });

  it("should fail when a link target is lost even if its words survive", () => {
    const output = "### DF-1 - One two three.\n\n- **Archived record**: [rec](a/c.md)\n";

    expect(checkPreservation(source, output)).toMatchObject({ ok: false });
  });

  it("should ignore a vX.Y# id prefix and the separator after an id", () => {
    expect(contentWords("| v2.4#BG-2 | Text. |")).toEqual(contentWords("#### BG-2 - Text."));
  });
});

describe("splitFirstSentence", () => {
  it.each([
    ["Chat search matches titles only. A hit is not labelled.", ["Chat search matches titles only.", "A hit is not labelled."]],
    ["Uses `a. b` inside code. Then more.", ["Uses `a. b` inside code.", "Then more."]],
    ["See [docs. here](x.md) first. Then more.", ["See [docs. here](x.md) first.", "Then more."]],
    ["No sentence break", ["No sentence break", ""]],
    [`${"x".repeat(170)}. Short.`, [`${"x".repeat(170)}. Short.`, ""]],
  ])("should split %j", (cell, expected) => {
    expect(splitFirstSentence(cell)).toEqual(expected);
  });
});
