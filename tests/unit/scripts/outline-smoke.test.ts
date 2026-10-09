/**
 * v2.11.0 Phase 5 -- the smoke harness's scorer, question set, and isolation.
 */

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { buildQuestionSet, selectSmokeArms, validate } from "../../../scripts/build-outline-smoke-questions.js";
import type { ExpectedFile } from "../../../scripts/generate-outline-fixtures.js";
import { extractAnswer, scoreAnswer } from "../../../scripts/outline-smoke-scoring.js";
import { memoParser } from "../../smoke/outline-smoke-parser.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "../../..");
const FIXTURES = join(REPO, "tests/fixtures/documents/outline");

describe("scoreAnswer", () => {
  it("scores only the final ANSWER line", () => {
    expect(extractAnswer("thinking...\nANSWER: https")).toBe("https");
    expect(scoreAnswer("The section says https.\nANSWER: https", "https")).toBe(true);
    expect(scoreAnswer("ANSWER: https is what it says", "https")).toBe(false);
  });

  it.each([
    ["1.5", "5"],
    ["15", "5"],
    ["5%", "5 percent"],
    ["not 5", "5"],
    ["http or https", "https"],
  ])("rejects %s for %s", (got, want) => {
    expect(scoreAnswer(`ANSWER: ${got}`, want)).toBe(false);
  });

  it("rejects a dumped section and a multi-candidate list", () => {
    expect(scoreAnswer(`ANSWER: ${"word ".repeat(60)}`, "word")).toBe(false);
    expect(scoreAnswer("ANSWER: enabled, disabled", "enabled")).toBe(false);
  });

  it("ignores whitespace so OCR-merged words still match", () => {
    expect(scoreAnswer("ANSWER: Schedule stream service", "schedule stream service")).toBe(true);
    expect(scoreAnswer("ANSWER: schedulestreamservice", "schedule stream service")).toBe(true);
  });

  it("prefix mode passes an OCR-split opening that runs a word past the key", () => {
    // The calibration case: the outline arm found the right text, OCR had kept a different space.
    expect(scoreAnswer("ANSWER: Systemschedule operator index", "system schedule operator", "prefix")).toBe(true);
    expect(scoreAnswer("ANSWER: Systemschedule operator index", "system schedule operator")).toBe(false);
  });

  it("prefix mode passes a whole quoted opening line", () => {
    expect(
      scoreAnswer("ANSWER: Storage control config module measure cycle sample network queue device factor", "storage control config", "prefix"),
    ).toBe(true);
  });

  it("prefix mode fails a different opening, a quoted paragraph, and a hedge", () => {
    expect(scoreAnswer("ANSWER: deviceprofile.Devicevaluemodulecontrol", "schedule stream service", "prefix")).toBe(false);
    expect(scoreAnswer(`ANSWER: schedule stream service ${"manual signal range ".repeat(8)}`, "schedule stream service", "prefix")).toBe(false);
    expect(scoreAnswer("ANSWER: maybe schedule stream service", "schedule stream service", "prefix")).toBe(false);
  });

  it("fails a reply with no ANSWER line", () => {
    expect(scoreAnswer("https", "https")).toBe(false);
  });
});

describe("question set", () => {
  it("builds disjoint expanded categories with discriminating late answers", () => {
    const { questions, keys } = buildQuestionSet(FIXTURES, "manual-120p.pdf");
    expect(questions.filter(q => q.category === "cross-section")).toHaveLength(20);
    expect(questions.filter(q => q.category === "factual")).toHaveLength(12);
    expect(questions.filter(q => q.category === "table")).toHaveLength(6);
    expect(keys.filter(k => k.pastPage50).length).toBeGreaterThanOrEqual(16);
    expect(new Set(keys.map(k => k.section)).size).toBe(keys.length);
    expect(new Set(keys.filter(k => k.match === "exact").map(k => k.answer)).size).toBe(6);
  });

  it("rejects expanded keys that occur in another section opening or table", () => {
    const { questions, keys } = buildQuestionSet(FIXTURES, "manual-120p.pdf");
    const manual = JSON.parse(readFileSync(join(FIXTURES, "expected", "manual-120p.pdf.json"), "utf8")) as ExpectedFile;
    const opening = keys.find(k => k.match === "prefix")!;
    expect(() => validate(questions, keys, {
      ...manual,
      headings: manual.headings.map((h, i) => i === 0 ? { ...h, firstWords: opening.answer } : h),
    })).toThrow(/ambiguous answer/);
    const table = keys.find(k => k.match === "exact")!;
    const other = manual.headings.find(h => h.table && h.title !== table.section)!;
    expect(() => validate(questions, keys, {
      ...manual,
      headings: manual.headings.map(h => h === other ? { ...h, table: { ...h.table!, port: Number(table.answer) } } : h),
    })).toThrow(/ambiguous answer/);
  });

  it.each(["manual-60p.pdf", "manual-120p.pdf"])("rebuilds %s questions and keys from the fixtures", (manual) => {
    const { questions, keys } = buildQuestionSet(FIXTURES, manual);
    const suffix = manual === "manual-60p.pdf" ? "" : "-manual-120p";
    expect(JSON.parse(readFileSync(join(FIXTURES, "eval", `questions${suffix}.json`), "utf8"))).toStrictEqual(questions);
    expect(JSON.parse(readFileSync(join(FIXTURES, "eval", `keys${suffix}.json`), "utf8"))).toStrictEqual(keys);
  });

  it("matches opening-words answers by prefix and table answers exactly", () => {
    const { questions, keys } = buildQuestionSet(FIXTURES);
    for (const q of questions) {
      expect(keys.find((k) => k.id === q.id)?.match).toBe(q.category === "table" ? "exact" : "prefix");
    }
  });

  it.each(["", "-manual-120p"])("keeps questions%s.json free of answers", (suffix) => {
    const questions = readFileSync(join(FIXTURES, "eval", `questions${suffix}.json`), "utf8");
    expect(questions).not.toMatch(/"answer"|"distractors"/);
  });

  it("rejects a set with the wrong category counts or no answers past page 50", () => {
    const { questions, keys } = buildQuestionSet(FIXTURES);
    expect(() => validate(questions.slice(1), keys.slice(1))).toThrow(/category counts/);
    expect(() => validate(questions, keys.map((k) => ({ ...k, pastPage50: false })))).toThrow(/page 50/);
  });
});

describe("smoke harness isolation", () => {
  it("retries cancelled OCR while retaining successful page-cap extractions", async () => {
    let attempts = 0;
    const result = { engine: "fixture", text: "recovered extraction", markdown: null, pageCount: 25 };
    const parser = memoParser({
      async parse() {
        attempts += 1;
        if (attempts === 1) throw new Error("ocr-runtime-shutdown");
        return result;
      },
    });
    await expect(parser.parse("document", { maxPages: 25 })).rejects.toThrow("ocr-runtime-shutdown");
    await expect(parser.parse("document", { maxPages: 25 })).resolves.toEqual(result);
    await expect(parser.parse("document", { maxPages: 25 })).resolves.toEqual(result);
    expect(attempts).toBe(2);
    await parser.parse("document", { maxPages: 50 });
    expect(attempts).toBe(3);
  });

  it("selects only requested arms and rejects ambiguous or invalid selections", () => {
    expect(selectSmokeArms("A,C")).toEqual(["A", "C"]);
    expect(selectSmokeArms()).toEqual(["A", "B", "C", "D"]);
    for (const invalid of ["", "A,A", "A,C,", "A,E"]) {
      expect(() => selectSmokeArms(invalid)).toThrow(/smoke arms/);
    }
  });

  it("is outside the default Vitest include globs, so npm test and CI never run it", () => {
    const config = readFileSync(join(REPO, "configs/vitest.config.ts"), "utf8");
    expect(config).not.toMatch(/tests\/smoke/);
    const smoke = readFileSync(join(REPO, "configs/vitest.smoke.config.ts"), "utf8");
    expect(smoke).toContain('include: ["tests/smoke/**/*.test.ts"]');
    const harness = readFileSync(join(REPO, "tests/smoke/document-outline-smoke.test.ts"), "utf8");
    expect(harness).toContain('process.env["NEXUS_OUTLINE_SMOKE"] === "1"');
  });
});
