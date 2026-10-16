/**
 * v2.12.0 Phase 1 -- Kolibri-1 stays out of the catalog, and the declined-models
 * index stays linked and resolvable.
 *
 * The refusal lives in one known-gap row. The catalog ids, the pre-ticked tier
 * defaults, and the acceptance bar stay free of the name; the bar points at the
 * index instead.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "../../..");
const GAPS = join(REPO_ROOT, "docs/v2/v2.12/known-gaps.md");
const CATALOG = join(REPO_ROOT, "core/registry/catalog.json");
const RECOMMENDED = join(REPO_ROOT, "core/registry/recommended.json");
const BAR = join(REPO_ROOT, "docs/reference/model-acceptance.md");
const INDEX = join(REPO_ROOT, "docs/reference/declined-models.md");

describe("v2.12.0 Kolibri-1 exclusion and the declined-models index", () => {
  it("records the decline and its reopen conditions in one known-gap row", () => {
    const rows = readFileSync(GAPS, "utf8")
      .split("\n")
      .map((line) => line.replace(/\r$/, ""))
      .filter((line) => line.startsWith("| DF-v212-1 |"));
    expect(rows).toHaveLength(1);
    const row = rows[0] ?? "";
    for (const fact of [
      "Kolibri-1",
      "not admitted, no catalog row",
      "34 GB",
      "24 GB",
      "262,144",
      "ollama.com/library",
      "llama.cpp",
    ]) {
      expect(row).toContain(fact);
    }
  });

  it("keeps catalog ids and pre-ticked tier defaults free of Kolibri", () => {
    const ids = [...readFileSync(CATALOG, "utf8").matchAll(/"id":\s*"([^"]*)"/g)].map((match) =>
      (match[1] ?? "").toLowerCase(),
    );
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) expect(id, `catalog id ${id}`).not.toContain("kolibri");

    const recommended = JSON.parse(readFileSync(RECOMMENDED, "utf8")) as {
      tiers: Record<string, Record<string, unknown>>;
    };
    const preTicked = Object.values(recommended.tiers).flatMap((sections) =>
      Object.values(sections).flatMap((value) =>
        Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [],
      ),
    );
    expect(preTicked.length).toBeGreaterThan(0);
    for (const id of preTicked) expect(id.toLowerCase(), `pre-ticked id ${id}`).not.toContain("kolibri");
  });

  it("keeps the acceptance bar free of Kolibri and links the index", () => {
    const bar = readFileSync(BAR, "utf8");
    expect(bar).not.toContain("Kolibri");
    expect(bar).toContain("declined-models.md");
  });

  it("lists Kolibri-1 in the index, and every relative link in it resolves", () => {
    const index = readFileSync(INDEX, "utf8");
    expect(index).toContain("Kolibri-1");
    const targets = [...index.matchAll(/\]\(([^)\s]+)\)/g)]
      .map((match) => (match[1] ?? "").split("#")[0] ?? "")
      .filter((target) => target !== "" && !/^[a-z]+:/i.test(target));
    expect(targets.length).toBeGreaterThan(0);
    for (const target of targets) {
      expect(existsSync(resolve(dirname(INDEX), target)), `link ${target}`).toBe(true);
    }
  });
});
