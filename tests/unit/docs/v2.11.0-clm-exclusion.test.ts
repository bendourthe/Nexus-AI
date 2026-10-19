/**
 * v2.11.0 Phase 1 -- CLM-8B and the PageIndex package stay out of the catalog.
 *
 * The refusal lives in one known-gap row. The catalog ids and the acceptance
 * bar stay free of those names.
 */

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "../../..");
const GAPS = join(REPO_ROOT, "docs/archive/v2/v2.11/known-gaps.md");
const CATALOG = join(REPO_ROOT, "core/registry/catalog.json");
const BAR = join(REPO_ROOT, "docs/reference/model-acceptance.md");

const FORBIDDEN_ID_TOKENS = ["clm", "contrastive", "pageindex"] as const;

describe("v2.11.0 CLM and PageIndex exclusion", () => {
  it("records CLM-8B, PageIndex, and the AIRI re-check in one known-gap entry", () => {
    // v2.15.0 converted the ledger's table rows into heading entries the
    // completion checker reads; the record is now one entry, not one row.
    const entries = readFileSync(GAPS, "utf8")
      .replace(/\r\n/g, "\n")
      .split(/\n(?=#{1,6} )/)
      .filter((block) => /^#{3,6} DF-v211-1 /.test(block));
    expect(entries).toHaveLength(1);
    const row = entries[0] ?? "";
    expect(row).toContain("not admitted, no catalog row");
    expect(row).toContain("CLM-8B");
    expect(row).toContain("PageIndex");
    expect(row).toContain("0.12.0-beta.5");
  });

  it("keeps catalog ids free of CLM, Contrastive, and PageIndex", () => {
    const ids = [...readFileSync(CATALOG, "utf8").matchAll(/"id":\s*"([^"]*)"/g)].map(
      (match) => (match[1] ?? "").toLowerCase(),
    );
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) {
      for (const token of FORBIDDEN_ID_TOKENS) {
        expect(id, `catalog id ${id} contains ${token}`).not.toContain(token);
      }
    }
  });

  it("keeps the acceptance bar free of CLM-8B", () => {
    expect(readFileSync(BAR, "utf8")).not.toContain("CLM-8B");
  });
});
