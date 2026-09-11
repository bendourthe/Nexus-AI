/**
 * v2.4.9 Phase 3 (T019) -- unit tests for the feature-inventory drift gate.
 *
 * The gate exists because `feature_list.json` claimed v0.8.0 against a product
 * shipping 2.4.x and no job read it. These tests hold the two properties that
 * make the gate worth having:
 *
 *   - It fails CLOSED. Malformed JSON, a missing region heading, an empty
 *     region, or a missing file is an error, never a vacuous pass.
 *   - It does not false-pass on changelog prose. README.md carries a ~180-line
 *     "What's new in vX" changelog that names features; a name that appears
 *     only there must not satisfy a region claim.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  analyze,
  namesInRegion,
  sliceRegion,
} from "../../../scripts/check-feature-drift.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "../../..");

const alwaysExists = () => true;
const neverExists = () => false;

/** A minimal README carrying both regions plus a changelog that names features. */
const README = [
  "# Nexus",
  "",
  "## The Four Pillars",
  "",
  "### 1. Agentic AI Coding",
  "Text.",
  "### 2. Local Chatbot Explorer",
  "Text.",
  "",
  "## Project Status",
  "",
  "### What's new in v2.4.1",
  "- GPU scheduler improvements and Motion identity polish.",
  "",
  "## Featured Capabilities",
  "",
  "| Capability | Surface |",
  "|---|---|",
  "| **GPU scheduler** | Prioritizes coding tokens. |",
  "",
  "## Repository Layout",
  "Text.",
].join("\n");

function inventory(features: unknown[], extra: Record<string, unknown> = {}) {
  return JSON.stringify({ ...extra, features });
}

const GOOD_FEATURES = [
  {
    id: "f001",
    name: "Agentic AI Coding",
    region: "readme:four-pillars",
    evidence: "a.ts",
  },
  {
    id: "f002",
    name: "Local Chatbot Explorer",
    region: "readme:four-pillars",
    evidence: "b.ts",
  },
  {
    id: "f003",
    name: "GPU scheduler",
    region: "readme:featured-capabilities",
    evidence: "c.ts",
  },
];

describe("sliceRegion", () => {
  it("stops at the next level-two heading", () => {
    const slice = sliceRegion(README.split("\n"), "## The Four Pillars");
    expect(slice).not.toBeNull();
    expect(slice?.some((l: string) => l.includes("Agentic AI Coding"))).toBe(true);
    expect(slice?.some((l: string) => l.includes("What's new"))).toBe(false);
  });

  it("reports a missing heading instead of returning an empty slice", () => {
    const seen: string[] = [];
    const slice = sliceRegion(README.split("\n"), "## Nope", (m: string) => seen.push(m));
    expect(slice).toBeNull();
    expect(seen.join(" ")).toContain("region heading not found");
  });
});

describe("namesInRegion", () => {
  it("reads numbered headings and bolded table rows, and strips the number", () => {
    const names = namesInRegion([
      "### 1. Agentic AI Coding",
      "### Document parsing (OCR)",
      "| **GPU scheduler** | Prioritizes coding tokens. |",
      "| Capability | Surface |",
      "Prose mentioning GPU scheduler should not match.",
    ]);
    expect(names).toStrictEqual([
      "Agentic AI Coding",
      "Document parsing (OCR)",
      "GPU scheduler",
    ]);
  });
});

describe("analyze", () => {
  it("passes when the inventory and both regions agree", () => {
    const result = analyze({
      inventoryRaw: inventory(GOOD_FEATURES),
      readmeRaw: README,
      exists: alwaysExists,
    });
    expect(result.errors).toStrictEqual([]);
    expect(result.ok).toBe(true);
    expect(result.summary.entries).toBe(3);
  });

  it("fails when an evidence path does not resolve", () => {
    const result = analyze({
      inventoryRaw: inventory(GOOD_FEATURES),
      readmeRaw: README,
      exists: neverExists,
    });
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("evidence path does not exist");
  });

  it("fails when the README names a feature the inventory does not carry", () => {
    const result = analyze({
      inventoryRaw: inventory(GOOD_FEATURES.slice(0, 2)),
      readmeRaw: README,
      exists: alwaysExists,
    });
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain(
      'names "GPU scheduler", which has no entry',
    );
  });

  it("fails when the inventory claims a feature the region does not state", () => {
    const result = analyze({
      inventoryRaw: inventory([
        ...GOOD_FEATURES,
        {
          id: "f004",
          name: "Quantum teleport",
          region: "readme:featured-capabilities",
          evidence: "d.ts",
        },
      ]),
      readmeRaw: README,
      exists: alwaysExists,
    });
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("not named in README region");
  });

  it("does NOT accept a name that appears only in the changelog", () => {
    // "Motion identity" is named in the changelog prose and nowhere else. A
    // whole-file match would pass this; a region-bounded match must not.
    const result = analyze({
      inventoryRaw: inventory([
        ...GOOD_FEATURES,
        {
          id: "f004",
          name: "Motion identity",
          region: "readme:featured-capabilities",
          evidence: "d.ts",
        },
      ]),
      readmeRaw: README,
      exists: alwaysExists,
    });
    expect(README).toContain("Motion identity"); // present in the file...
    expect(result.ok).toBe(false); // ...but not in the region.
    expect(result.errors.join("\n")).toContain('"Motion identity": not named in README region');
  });

  it("fails closed on malformed JSON", () => {
    const result = analyze({
      inventoryRaw: '{ "features": [',
      readmeRaw: README,
      exists: alwaysExists,
    });
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("not valid JSON");
  });

  it("fails closed on a missing inventory or README", () => {
    expect(
      analyze({ inventoryRaw: null, readmeRaw: README, exists: alwaysExists }).ok,
    ).toBe(false);
    expect(
      analyze({ inventoryRaw: inventory(GOOD_FEATURES), readmeRaw: null, exists: alwaysExists }).ok,
    ).toBe(false);
  });

  it("fails closed on an empty features array", () => {
    const result = analyze({
      inventoryRaw: inventory([]),
      readmeRaw: README,
      exists: alwaysExists,
    });
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("no `features` array");
  });

  it("fails closed when a region heading is missing entirely", () => {
    const result = analyze({
      inventoryRaw: inventory(GOOD_FEATURES),
      readmeRaw: README.replace("## Featured Capabilities", "## Renamed Section"),
      exists: alwaysExists,
    });
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("region heading not found");
  });

  it("fails closed when a region yields no names, rather than passing vacuously", () => {
    const emptied = README.replace(
      "| **GPU scheduler** | Prioritizes coding tokens. |",
      "Nothing here.",
    );
    const result = analyze({
      inventoryRaw: inventory(GOOD_FEATURES),
      readmeRaw: emptied,
      exists: alwaysExists,
    });
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("yielded zero feature names");
  });

  it("rejects a reintroduced version field", () => {
    const result = analyze({
      inventoryRaw: inventory(GOOD_FEATURES, { version: "v0.8.0" }),
      readmeRaw: README,
      exists: alwaysExists,
    });
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("carries a `version` field");
  });

  it("rejects a duplicate id and an unknown region", () => {
    const result = analyze({
      inventoryRaw: inventory([
        ...GOOD_FEATURES,
        { id: "f001", name: "GPU scheduler", region: "readme:nope", evidence: "e.ts" },
      ]),
      readmeRaw: README,
      exists: alwaysExists,
    });
    expect(result.ok).toBe(false);
    const joined = result.errors.join("\n");
    expect(joined).toContain("duplicate id");
    expect(joined).toContain("unknown region");
  });

  it("rejects an entry missing a required field", () => {
    const result = analyze({
      inventoryRaw: inventory([{ id: "f001", name: "GPU scheduler" }]),
      readmeRaw: README,
      exists: alwaysExists,
    });
    expect(result.ok).toBe(false);
    const joined = result.errors.join("\n");
    expect(joined).toContain("`region`");
    expect(joined).toContain("`evidence`");
  });
});

describe("the repository's own inventory", () => {
  it("agrees with README.md right now", () => {
    const result = analyze({
      inventoryRaw: readFileSync(join(REPO_ROOT, "feature_list.json"), "utf8"),
      readmeRaw: readFileSync(join(REPO_ROOT, "README.md"), "utf8"),
      exists: (p: string) => existsSync(join(REPO_ROOT, p)),
    });
    expect(result.errors).toStrictEqual([]);
  });
});
