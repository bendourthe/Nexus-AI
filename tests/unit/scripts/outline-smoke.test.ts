/**
 * v2.11.0 Phase 5 -- the smoke harness's scorer, question set, and isolation.
 */

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { buildQuestionSet, validate } from "../../../scripts/build-outline-smoke-questions.js";
import { extractAnswer, scoreAnswer } from "../../../scripts/outline-smoke-scoring.js";

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
  it("is rebuilt byte for byte from the fixtures", () => {
    const { questions, keys } = buildQuestionSet(FIXTURES);
    expect(JSON.parse(readFileSync(join(FIXTURES, "eval", "questions.json"), "utf8"))).toStrictEqual(questions);
    expect(JSON.parse(readFileSync(join(FIXTURES, "eval", "keys.json"), "utf8"))).toStrictEqual(keys);
  });

  it("matches opening-words answers by prefix and table answers exactly", () => {
    const { questions, keys } = buildQuestionSet(FIXTURES);
    for (const q of questions) {
      expect(keys.find((k) => k.id === q.id)?.match).toBe(q.category === "table" ? "exact" : "prefix");
    }
  });

  it("keeps the questions file free of answers", () => {
    const questions = readFileSync(join(FIXTURES, "eval", "questions.json"), "utf8");
    expect(questions).not.toMatch(/"answer"|"distractors"/);
  });

  it("rejects a set with the wrong category counts or no answers past page 50", () => {
    const { questions, keys } = buildQuestionSet(FIXTURES);
    expect(() => validate(questions.slice(1), keys.slice(1))).toThrow(/category counts/);
    expect(() => validate(questions, keys.map((k) => ({ ...k, pastPage50: false })))).toThrow(/page 50/);
  });
});

describe("smoke harness isolation", () => {
  it("is outside the default Vitest include globs, so npm test and CI never run it", () => {
    const config = readFileSync(join(REPO, "configs/vitest.config.ts"), "utf8");
    expect(config).not.toMatch(/tests\/smoke/);
    const smoke = readFileSync(join(REPO, "configs/vitest.smoke.config.ts"), "utf8");
    expect(smoke).toContain('include: ["tests/smoke/**/*.test.ts"]');
    const harness = readFileSync(join(REPO, "tests/smoke/document-outline-smoke.test.ts"), "utf8");
    expect(harness).toContain('process.env["NEXUS_OUTLINE_SMOKE"] === "1"');
  });
});
