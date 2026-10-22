import { describe, expect, it } from "vitest";
// @ts-expect-error The standalone inventory helper has no emitted declaration.
import { buildInventory, carriedCandidate, checkCoverage } from "../../../scripts/known-gaps/inventory.mjs";

const active = ["docs", "releases", "v2", "v2.12", "known-gaps.md"].join("/");
const archived = ["docs", "archives", "v2", "v2.12", "known-gaps.md"].join("/");
const legacy = ["docs", "v2", "v2.12", "known-gaps.md"].join("/");
const source = "docs/archive/v2/v2.4/known-gaps.md";
const entry = (section: string, body = "") => ({ id: "DF-1", title: "One owed item", section, state: "open", body });
const table = (keys: string[]) => ["## Triage", "", "| Item | Ledger |", "|---|---|", ...keys.map((key) => `| ${key} | x |`), ""].join("\n");

describe.each([active, archived])("canonical register identity %s", (path) => {
  it("keeps minor carriers distinct from patch items and reports repeated patch identities", () => {
    const carrier = entry("v2.12", `- **Archived record**: \`${source}\``);
    const patch = entry("v2.12.0");
    const ledgers = [
      { path: source, minor: "v2.4", layout: "archive", problems: [], text: "", items: [entry("v2.4.10")] },
      { path, minor: "v2.12", layout: path === archived ? "archive" : "active", problems: [], text: "", items: [carrier, patch] },
    ];
    const inventory = buildInventory(ledgers);
    expect(inventory.carriers).toHaveLength(1);
    expect(inventory.carriers[0].carries).toEqual({ ledger: source, id: "DF-1", key: "v2.4.10#DF-1", state: "open" });
    expect(inventory.items.filter((item: { ledger: string }) => item.ledger === path).map((item: { key: string }) => item.key)).toEqual(["v2.12#DF-1", "v2.12.0#DF-1"]);
    expect(inventory.totals.distinctOpen).toBe(2);
    expect(inventory.collisions).toEqual([]);
    ledgers[1].items.push(patch);
    const repeated = buildInventory(ledgers);
    expect(repeated.collisions).toEqual([`${path}#v2.12.0#DF-1`]);
    expect(repeated.items.filter((item: { key: string }) => item.key === "v2.12.0#DF-1")).toHaveLength(2);
  });

  it("uses the exact superseded pointer instead of guessing the newest same-id item", () => {
    const older = { key: "v2.4.9#DF-1", body: `**Superseded by**: ${path} DF-1` };
    const newer = { key: "v2.4.10#DF-1", body: "" };
    expect(carriedCandidate("DF-1", [older, newer])).toBe(older);
  });
});

describe.each([legacy, active, archived])("register coverage identity %s", (path) => {
  it("requires every open identity and preserves resolved and duplicate accounting", () => {
    const inventory = { items: [
      { ledger: path, key: "v2.12#DF-1", state: "open" },
      { ledger: path, key: "v2.12.0#WN-2", state: "open" },
      { ledger: path, key: "v2.12#DF-3", state: "resolved" },
    ], archivedOnly: [] };
    const keys = inventory.items.map((item) => item.key);
    expect(checkCoverage(inventory, { triage: table(keys) }).ok).toBe(true);
    expect(checkCoverage(inventory, { triage: table(keys.slice(1)) }).missing).toEqual(["v2.12#DF-1"]);
    expect(checkCoverage(inventory, { triage: table([...keys, keys[0]]) }).repeated).toEqual(["v2.12#DF-1"]);
  });
});

it("does not treat suffix or neighboring-path lookalikes as canonical registers", () => {
  for (const path of [`examples/${active}`, archived.replace("v2.12/", "v2.120/"), "docs/archive/v2/v2.12/known-gaps.md"]) {
    const inventory = buildInventory([{ path, minor: "v2.12", layout: "active", problems: [], text: "", items: [entry("v2.12")] }]);
    expect(inventory.carriers).toEqual([]);
    expect(checkCoverage(inventory, { triage: table(["v2.12#DF-1"]) }).unknown).toEqual(["v2.12#DF-1"]);
  }
});

it("retains both ledger namespaces when input contains both canonical locations", () => {
  const inventory = buildInventory([active, archived].map((path) => ({ path, minor: "v2.12", layout: "archive", problems: [], text: "", items: [entry("v2.12")] })));
  expect(inventory.items.map((item: { ledger: string }) => item.ledger)).toEqual([active, archived]);
  expect(inventory.carriers).toHaveLength(2);
  expect(inventory.totals.distinctOpen).toBe(2);
});
