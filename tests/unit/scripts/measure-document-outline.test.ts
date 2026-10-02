/**
 * v2.11.0 Phase 2 -- pure functions behind the outline measurement, and the
 * fixture generator's determinism. Neither import runs its script's main(),
 * because Vitest sets VITEST.
 */

import { describe, expect, it } from "vitest";

import {
  detectMarkdownHeadings,
  detectNumberedHeadings,
  matchHeadings,
  navigationCheck,
  normalizeTitle,
} from "../../../scripts/measure-document-outline.js";
import {
  FIXTURE_SEED,
  generateFixtures,
  makeManyHeadingsMarkdown,
  makeNestedListMarkdown,
} from "../../../scripts/generate-outline-fixtures.js";

describe("normalizeTitle", () => {
  it("lowercases, strips punctuation, and collapses whitespace", () => {
    expect(normalizeTitle("  3.2  Network-Settings! ")).toBe("3.2 network settings");
  });
});

describe("detectMarkdownHeadings", () => {
  it("ignores headings inside fenced and indented code", () => {
    const md = "## Real\n\ntext\n\n```bash\n# not a heading\n```\n\n    # indented\n\n### Second";
    const found = detectMarkdownHeadings(md).map((h) => [h.title, h.level]);
    expect(found).toStrictEqual([
      ["Real", 2],
      ["Second", 3],
    ]);
  });

  it("records the character offset of each heading line", () => {
    const md = "intro\n## A\nbody";
    expect(detectMarkdownHeadings(md)[0]?.offset).toBe(6);
  });
});

describe("detectNumberedHeadings", () => {
  it("finds numbered titles with their page and skips dot-leader TOC lines", () => {
    const found = detectNumberedHeadings(["1 Introduction .......... 3", "1 Introduction\nbody", "1.2 Storage Details\nmore"]);
    expect(found.map((h) => [h.title, h.level, h.page])).toStrictEqual([
      ["1 Introduction", 1, 2],
      ["1.2 Storage Details", 2, 3],
    ]);
  });
});

describe("matchHeadings", () => {
  it("computes recall, precision, and page agreement", () => {
    const expected = [
      { title: "1 Intro", level: 1, startPage: 2, firstWords: "" },
      { title: "1.1 Scope", level: 2, startPage: 3, firstWords: "" },
    ];
    const detected = [
      { title: "1 Intro", level: 1, page: 2, offset: 0 },
      { title: "Noise", level: 1, page: 2, offset: 5 },
    ];
    const result = matchHeadings(expected, detected);
    expect(result.recall).toBe(0.5);
    expect(result.precision).toBe(0.5);
    expect(result.pageAgreement).toBe(1);
  });

  it("treats an empty expectation with no detections as a perfect score", () => {
    expect(matchHeadings([], [])).toMatchObject({ recall: 1, precision: 1 });
  });
});

describe("navigationCheck", () => {
  it("slices from a heading to the next and looks for the first words", () => {
    const text = "## A\nalpha beta gamma\n## B\ndelta epsilon";
    const detected = detectMarkdownHeadings(text);
    const expected = [
      { title: "A", level: 2, startPage: 1, firstWords: "alpha beta" },
      { title: "B", level: 2, startPage: 1, firstWords: "delta epsilon" },
    ];
    expect(navigationCheck(text, expected, detected)).toStrictEqual({ tried: 3, correct: 3 });
  });
});

describe("generateFixtures", () => {
  it("is byte-identical for the same seed", () => {
    const a = generateFixtures(FIXTURE_SEED);
    const b = generateFixtures(FIXTURE_SEED);
    expect(a.map((f) => f.name)).toStrictEqual(b.map((f) => f.name));
    a.forEach((fixture, i) => {
      expect(fixture.bytes.equals(b[i]?.bytes ?? Buffer.alloc(0)), fixture.name).toBe(true);
    });
  });

  it("changes text output for a different seed", () => {
    const a = generateFixtures(FIXTURE_SEED).find((f) => f.name === "handbook.md");
    const b = generateFixtures(FIXTURE_SEED + 1).find((f) => f.name === "handbook.md");
    expect(a?.bytes.equals(b?.bytes ?? Buffer.alloc(0))).toBe(false);
  });

  it("keeps the 60-page manual at 60 pages or more", () => {
    const manual = generateFixtures(FIXTURE_SEED).find((f) => f.name === "manual-60p.pdf");
    expect(manual?.expected.pageCount).toBeGreaterThanOrEqual(60);
  });

  it("builds the large test-time shapes on demand", () => {
    expect(detectMarkdownHeadings(makeManyHeadingsMarkdown(5000))).toHaveLength(5000);
    expect(makeNestedListMarkdown(5000).split("\n")).toHaveLength(5000);
  });
});
