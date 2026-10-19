/**
 * v2.15.0 Phase 1 (T002) -- the known-gaps inventory and the pinned checker adapter.
 *
 * The inventory is read through the completion checker's own parser, which is
 * not in this repository. These tests feed it the checker's view of the
 * committed fixtures, captured once by tests/fixtures/known-gaps/capture.mjs,
 * so CI runs without `~/.nexus-hub`. The adapter's pin check needs no checker
 * at all: it must refuse any file whose sha256 differs from the pin.
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  buildInventory,
  checkCoverage,
  driftFrom,
  itemKey,
  listedKeys,
  readBaseline,
  registerRows,
  snapshotOf,
} from "../../../scripts/known-gaps/inventory.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "../../..");
const FIXTURES = join(REPO_ROOT, "tests/fixtures/known-gaps");
const REGISTER = "docs/v2/v2.12/known-gaps.md";

type Discovery = { ledgers: Array<{ path: string; minor: string; layout: string; items: unknown[]; problems: string[] }> };

/** The captured discovery with each ledger's text, read from `repo/` or, when converted, `expected/`. */
function ledgers(discovery: string, converted: boolean) {
  const found = JSON.parse(readFileSync(join(FIXTURES, discovery), "utf8")) as Discovery;
  return found.ledgers.map((ledger) => {
    const expected = join(FIXTURES, "expected", ledger.path);
    const source = converted && existsSync(expected) ? expected : join(FIXTURES, "repo", ledger.path);
    return { ...ledger, text: readFileSync(source, "utf8") };
  });
}

describe("buildInventory", () => {
  it("should count every in-scope ledger and read register rows before conversion", () => {
    const inventory = buildInventory(ledgers("discovery.json", false));

    expect(inventory.ledgers.map((l: { path: string }) => l.path)).toContain(REGISTER);
    expect(inventory.totals.problems).toBeGreaterThan(0);
    expect(inventory.carriers.map((c: { id: string; form: string }) => `${c.id}:${c.form}`)).toEqual([
      "DF-v212-4:row",
      "BG-2:row",
      "DF-v260-1:row",
      "WN-v211-5:row",
      "QG-v211-2:row",
    ]);
  });

  it("should map converted register entries to the originals they carry", () => {
    const inventory = buildInventory(ledgers("converted-discovery.json", true));
    const byId = Object.fromEntries(inventory.carriers.map((c: { id: string }) => [c.id, c]));

    expect(inventory.totals.problems).toBe(0);
    expect(byId["BG-2"].carries).toEqual({ ledger: "docs/archive/v2/v2.4/known-gaps.md", id: "BG-2", state: "open" });
    expect(byId["BG-2"].match).toBe("record");
    expect(byId["DF-v260-1"].carries.ledger).toBe("docs/archive/v2/v2.6/known-gaps.md");
    expect(byId["DF-v212-4"].state).toBe("resolved");
    expect(inventory.unmatched.map((c: { id: string }) => c.id).sort()).toEqual(["QG-v211-2", "WN-v211-5"]);
  });

  it("should count a carried original and its register entry once", () => {
    const inventory = buildInventory(ledgers("converted-discovery.json", true));
    const archivedOnly = inventory.archivedOnly.map((i: { ledger: string; id: string }) => `${i.ledger}#${i.id}`);

    expect(archivedOnly).not.toContain("docs/archive/v2/v2.4/known-gaps.md#BG-2");
    expect(archivedOnly).not.toContain("docs/archive/v2/v2.6/known-gaps.md#DF-v260-1");
    expect(archivedOnly).toContain("docs/archive/v2/v2.4/known-gaps.md#DF-v240-1");
    // 4 open register entries (DF-v212-4 is superseded) + the open items no register entry carries.
    const uncarried = inventory.items.filter(
      (i: { ledger: string; state: string; id: string }) =>
        i.ledger !== REGISTER && i.state === "open" && !["BG-2", "DF-v260-1"].includes(i.id),
    ).length;
    expect(inventory.totals.distinctOpen).toBe(4 + uncarried);
  });
});

describe("registerRows", () => {
  it("should keep a pipe inside a code span in its cell", () => {
    const text = [
      "| ID | Why it is still open | Archived record |",
      "| --- | --- | --- |",
      "| WN-1 | Results go back as `<|tool_result>` blocks. | `docs/archive/v2/v2.11/known-gaps.md` |",
    ].join("\r\n");

    expect(registerRows(text)).toEqual([
      { id: "WN-1", title: "Results go back as `<|tool_result>` blocks.", record: "`docs/archive/v2/v2.11/known-gaps.md`", line: 3 },
    ]);
  });
});

describe("baseline drift", () => {
  it("should report only the counts that changed", () => {
    const inventory = buildInventory(ledgers("discovery.json", false));
    const baseline = snapshotOf(inventory, { date: "2026-10-19", pin: "p" });
    const later = structuredClone(baseline);
    later.totals.problems = 0;
    later.ledgers[REGISTER].problems = 0;

    expect(driftFrom(baseline, baseline)).toEqual([]);
    expect(driftFrom(baseline, later)).toEqual([
      { key: "totals.problems", before: baseline.totals.problems, after: 0 },
      { key: `${REGISTER} problems`, before: baseline.ledgers[REGISTER].problems, after: 0 },
    ]);
  });

  it("should read the baseline block and return null without one", () => {
    const block = '<!-- inventory-baseline:start -->\n```json\n{"date":"2026-10-19"}\n```\n<!-- inventory-baseline:end -->';

    expect(readBaseline(`# Record\n\n${block}\n`)).toEqual({ date: "2026-10-19" });
    expect(readBaseline("# Record\n")).toBeNull();
  });
});

describe("itemKey", () => {
  it.each([
    [{ minor: "v2.2", section: "v2.2.3", id: "DF-1" }, "v2.2.3#DF-1"],
    [{ minor: "v2.2", section: "v2.2.10 follow-up", id: "DF-1" }, "v2.2.10#DF-1"],
    [{ minor: "v2.12", section: "", id: "BG-2" }, "v2.12#BG-2"],
    [{ minor: "v2.5", section: "Closed in v2.5", id: "QG-1" }, "v2.5#QG-1"],
  ])("should address %j as %s", (item, key) => {
    expect(itemKey(item)).toBe(key);
  });
});

describe("checkCoverage", () => {
  // Phase 3 (T012): the triage record and the batch list together must list
  // every in-scope open item exactly once, in batches of at most 60.
  const inventory = {
    items: [
      { ledger: REGISTER, key: "v2.12#BG-2", state: "open" },
      { ledger: "docs/releases/v2/v2.12/known-gaps.md", key: "v2.12.0#WN-v212-5", state: "open" },
      { ledger: REGISTER, key: "v2.12#DF-v212-4", state: "resolved" },
    ],
    archivedOnly: [{ key: "v2.4.9#QG-1" }, { key: "v2.2.3#DF-1" }],
  };
  const table = (heading: string, keys: string[]) =>
    [`## ${heading}`, "", "| Item | Ledger |", "|---|---|", ...keys.map((k) => `| ${k} | x |`), ""].join("\n");

  it("should pass when every item is listed once across the two files", () => {
    const triage = table("Triage", ["`v2.12#BG-2`", "v2.12.0#WN-v212-5"]);
    const batches = table("Batch 1 - v2.15.1", ["v2.4.9#QG-1", "v2.2.3#DF-1"]);

    expect(checkCoverage(inventory, { triage, batches })).toMatchObject({ ok: true });
  });

  it("should name a missing, a repeated and an unknown item", () => {
    const triage = table("Triage", ["v2.12#BG-2", "v2.4.9#QG-1"]);
    const batches = table("Batch 1 - v2.15.1", ["v2.4.9#QG-1", "v2.2.3#DF-1", "v2.9.0#DF-9"]);

    expect(checkCoverage(inventory, { triage, batches })).toEqual({
      ok: false,
      missing: ["v2.12.0#WN-v212-5"],
      repeated: ["v2.4.9#QG-1"],
      unknown: ["v2.9.0#DF-9"],
      oversized: [],
    });
  });

  it("should fail a batch that holds more than 60 items", () => {
    const keys = Array.from({ length: 61 }, (_, i) => `v2.4.9#DF-${i + 1}`);
    const wide = { items: [], archivedOnly: keys.map((key) => ({ key })) };

    expect(checkCoverage(wide, { batches: table("Batch 1 - v2.15.1", keys) }).oversized).toEqual([
      "Batch 1 - v2.15.1: 61",
    ]);
  });

  it("should require only the scope of the file it was given", () => {
    const batches = table("Batch 1 - v2.15.1", ["v2.4.9#QG-1", "v2.2.3#DF-1"]);

    expect(checkCoverage(inventory, { batches }).ok).toBe(true);
    expect(listedKeys(batches).map((entry: { key: string }) => entry.key)).toEqual(["v2.4.9#QG-1", "v2.2.3#DF-1"]);
  });
});

describe("checker-adapter.py pin", () => {
  it("should refuse a checker whose sha256 differs and print both hashes", () => {
    const fake = join(mkdtempSync(join(tmpdir(), "adapter-pin-")), "completion_minor.py");
    writeFileSync(fake, "raise SystemExit('must not be imported')\n", "utf8");
    const python = process.env.PYTHON ?? (process.platform === "win32" ? "python" : "python3");

    const result = spawnSync(python, ["-I", join(REPO_ROOT, "scripts/known-gaps/checker-adapter.py"), "--checker", fake, "discover"], {
      encoding: "utf8",
    });

    expect(result.status).toBe(3);
    expect(result.stderr).toContain("pinned f1689e72b6f96835bb9eda7bd68280e63fbb0c4c644a2e45f8cff19a693cdfd4");
    expect(result.stderr).toMatch(/found [0-9a-f]{64}/);
    expect(result.stdout).toBe("");
  });
});
