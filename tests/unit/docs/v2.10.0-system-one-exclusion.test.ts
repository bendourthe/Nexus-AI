/**
 * v2.10.0 Phase 1 -- hosted Jev, Laya, and Kev stay out of the catalog.
 *
 * The refusal lives in one known-gap row. The acceptance bar and the
 * registry files this plan must not edit stay free of those names.
 */

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "../../..");
const GAPS = join(REPO_ROOT, "docs/archive/v2/v2.10/known-gaps.md");
const BAR = join(REPO_ROOT, "docs/reference/model-acceptance.md");

const UNTOUCHED = [
  "core/registry/catalog.json",
  "core/registry/recommended.json",
  "core/skills/PromptInjectionScanner.ts",
  "src/tools/ConfirmationGate.ts",
  "modules/coding/routing/commandRouter.ts",
] as const;

const FORBIDDEN_TOKENS = [
  "jev",
  "laya",
  "kev",
  "nimble",
  "typesafe",
  "system-one",
] as const;

describe("v2.10.0 System One exclusion", () => {
  it("records hosted Jev, Laya, and Kev in one known-gap row", () => {
    const gaps = readFileSync(GAPS, "utf8");
    expect(gaps).toContain("DF-v210-1");
    expect(gaps).toContain("Hosted Jev");
    expect(gaps).toContain("Laya 0.3.20");
    expect(gaps).toContain("0.8B");
    expect(gaps).toContain("4B");
    expect(gaps).toContain("9B");
    expect(gaps).toContain("27B");
    expect(gaps).toContain(
      "docs/archive/v2/v2.8/plans/v2.8.0-adoption-qwen-image-nimble.md",
    );
    expect(gaps).toContain("not admitted, no catalog row");
    const systemOneRows = gaps
      .split("\n")
      .map((line) => line.replace(/\r$/, ""))
      .filter((line) => line.startsWith("##### DF-v210-"));
    expect(systemOneRows).toStrictEqual([
      "##### DF-v210-1 - Hosted Jev, Laya, and Kev are not admitted",
    ]);
  });

  it("keeps the acceptance bar free of System One, Laya, Kev, and Jev", () => {
    const bar = readFileSync(BAR, "utf8");
    expect(bar).not.toContain("System One");
    expect(bar).not.toContain("Laya");
    expect(bar).not.toContain("Kev");
    expect(bar).not.toContain("Jev");
  });

  it("leaves the catalog and the guarded sources free of those tokens", () => {
    for (const relative of UNTOUCHED) {
      const text = readFileSync(join(REPO_ROOT, relative), "utf8").toLowerCase();
      for (const token of FORBIDDEN_TOKENS) {
        expect(text, `${relative} contains ${token}`).not.toContain(token);
      }
    }
  });
});
