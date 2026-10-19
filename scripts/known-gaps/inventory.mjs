#!/usr/bin/env node
/**
 * Known-gaps inventory (v2.15.0). Read-only.
 *
 * Lists every item in the ledgers from v1.17 to v2.12, the carry-forward
 * register and the v2.15 ledger, read through the pinned checker adapter so
 * an item is exactly what the completion checker counts. It maps each
 * register entry to the archived original it carries, lists the register
 * entries it cannot match, and reports a distinct open count in which a
 * carried original and its register entry count once.
 *
 * Usage:
 *   node scripts/known-gaps/inventory.mjs [--json] [--baseline <file>] [--snapshot]
 *
 * --json      machine output instead of the Markdown report
 * --baseline  compare against the dated baseline block in <file>
 *             (default: docs/releases/v2/v2.15/development/v2.15.0-ledger-conversion.md)
 * --snapshot  print a baseline block for today's state and exit
 * --triage <file>   check that the triage record lists every open register and
 *                   v2.12 release item once
 * --batches <file>  check that the follow-up batch list lists every
 *                   archived-only item once, in batches of at most 60
 *
 * Given both, an item may sit in either file but in exactly one of them.
 * Exits 0 on success, 1 when the adapter fails, the baseline is unreadable, or
 * a --triage / --batches check fails.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { discoverLedgers, ROOT } from "./adapter.mjs";
import {
  compareMinor,
  fenceMask,
  isSeparatorRow,
  isTableRow,
  leadingId,
  ledgerPathsIn,
  splitCells,
  splitLines,
} from "./ledger-text.mjs";

export const REGISTER = "docs/v2/v2.12/known-gaps.md";
export const SCOPE = { from: "v1.17", to: "v2.12", extra: ["v2.15"] };
export const RELEASE_V212 = "docs/releases/v2/v2.12/known-gaps.md";
export const BATCH_LIMIT = 60;
export const DEFAULT_BASELINE = "docs/releases/v2/v2.15/development/v2.15.0-ledger-conversion.md";
const BASELINE_RE = /<!-- inventory-baseline:start -->\s*```json\s*([\s\S]*?)```\s*<!-- inventory-baseline:end -->/;
const RECORD_FIELD_RE = /^\s*[-*+]\s+\*\*Archived record\*\*\s*:\s*(.*)$/m;

export function inScope(minor) {
  return (
    (compareMinor(minor, SCOPE.from) >= 0 && compareMinor(minor, SCOPE.to) <= 0) || SCOPE.extra.includes(minor)
  );
}

/**
 * An item's address across the ledgers: the patch version of its `## ` section
 * when the section names one, else its minor, then its id (`v2.2.3#DF-1`,
 * `v2.12#BG-2`). The checker allows a short id once per patch section, so this
 * is unique among unresolved items.
 */
export function itemKey({ minor, section, id }) {
  const version = /^v\d+\.\d+\.\d+(?![0-9])/.exec((section ?? "").trim());
  return `${version ? version[0] : minor}#${id}`;
}

/** A heading title without the separator the checker leaves in front of it. */
function cleanTitle(title) {
  return title.replace(/^\s*(?::|-{1,2})\s*/, "").trim();
}

/** Register rows the checker cannot read yet: `{ id, title, record, line }`. */
export function registerRows(text) {
  const lines = splitLines(text);
  const mask = fenceMask(lines);
  const rows = [];
  let headers = null;
  lines.forEach((line, index) => {
    if (mask[index] || !isTableRow(line)) {
      headers = null;
      return;
    }
    if (headers === null) {
      if (isSeparatorRow(lines[index + 1] ?? "")) headers = splitCells(line);
      return;
    }
    if (isSeparatorRow(line)) return;
    const cells = splitCells(line);
    const id = leadingId(cells[0] ?? "");
    if (!id || cells[0].replaceAll("**", "").trim() !== id) return;
    const record = headers.findIndex((header) => /record/i.test(header));
    rows.push({ id, title: cells[1] ?? "", record: record > 0 ? cells[record] ?? "" : "", line: index + 1 });
  });
  return rows;
}

/**
 * The inventory of the given ledgers (the adapter's discovery with text).
 *
 * Pure: everything it reads is in `ledgers`, so tests can feed committed
 * fixtures captured once from the pinned checker.
 */
export function buildInventory(ledgers) {
  const scoped = ledgers.filter((ledger) => inScope(ledger.minor));
  const items = scoped.flatMap((ledger) =>
    ledger.items.map((item) => ({
      ledger: ledger.path,
      minor: ledger.minor,
      layout: ledger.layout,
      section: item.section,
      key: itemKey({ minor: ledger.minor, section: item.section, id: item.id }),
      id: item.id,
      title: cleanTitle(item.title),
      state: item.state,
      body: item.body,
    })),
  );
  const register = scoped.find((ledger) => ledger.path === REGISTER);
  const carriers = [];
  if (register) {
    for (const item of items.filter((i) => i.ledger === REGISTER)) {
      const record = RECORD_FIELD_RE.exec(item.body)?.[1]?.trim() ?? "";
      carriers.push({ id: item.id, title: item.title, state: item.state, record, form: "entry" });
    }
    for (const row of registerRows(register.text)) {
      carriers.push({ id: row.id, title: row.title, state: "open", record: row.record, form: "row", line: row.line });
    }
  }

  const others = items.filter((item) => item.ledger !== REGISTER);
  for (const carrier of carriers) {
    const named = ledgerPathsIn(carrier.record, REGISTER).filter((path) => path !== REGISTER);
    const byRecord = others.find((item) => named.includes(item.ledger) && item.id === carrier.id);
    const live = others.filter((item) => item.id === carrier.id && item.state !== "resolved" && item.ledger !== REGISTER);
    const original = byRecord ?? (live.length === 1 ? live[0] : null);
    carrier.carries = original ? { ledger: original.ledger, id: original.id, state: original.state } : null;
    carrier.match = byRecord ? "record" : live.length === 1 ? "id" : live.length > 1 ? "ambiguous" : "none";
    // The other v2.12 file owns an id both carry (decision 4): the register copy is the duplicate.
    carrier.duplicateOf = original && original.minor === register.minor && original.state === "open" ? original.ledger : null;
  }

  const carried = new Set(
    carriers
      .filter((c) => c.state === "open" && c.carries && !c.duplicateOf)
      .map((c) => `${c.carries.ledger}#${c.carries.id}`),
  );
  const openUnits = [
    ...carriers.filter((c) => c.state === "open" && !c.duplicateOf).map((c) => ({ ledger: REGISTER, id: c.id })),
    ...others.filter((i) => i.state === "open" && !carried.has(`${i.ledger}#${i.id}`)).map((i) => ({ ledger: i.ledger, id: i.id })),
  ];
  const archivedOnly = others.filter(
    (i) => i.state === "open" && i.layout === "archive" && !carried.has(`${i.ledger}#${i.id}`),
  );

  const perLedger = scoped.map((ledger) => ({
    path: ledger.path,
    minor: ledger.minor,
    layout: ledger.layout,
    items: ledger.items.length,
    open: ledger.items.filter((i) => i.state === "open").length,
    problems: ledger.problems.length,
  }));
  return {
    ledgers: perLedger,
    items: items.map(({ body, ...rest }) => rest),
    carriers,
    unmatched: carriers.filter((c) => c.match === "none" || c.match === "ambiguous"),
    archivedOnly: archivedOnly.map(({ body, ...rest }) => rest),
    totals: {
      ledgers: perLedger.length,
      items: items.length,
      open: perLedger.reduce((sum, l) => sum + l.open, 0),
      problems: perLedger.reduce((sum, l) => sum + l.problems, 0),
      carriers: carriers.length,
      carriedOriginals: carried.size,
      archivedOnly: archivedOnly.length,
      distinctOpen: openUnits.length,
    },
  };
}

export function snapshotOf(inventory, { date, pin }) {
  return {
    date,
    pin,
    ledgers: Object.fromEntries(inventory.ledgers.map((l) => [l.path, { open: l.open, problems: l.problems }])),
    totals: inventory.totals,
  };
}

/** Differences between a baseline snapshot and today's: `[{ key, before, after }]`. */
export function driftFrom(baseline, current) {
  const drift = [];
  for (const [key, value] of Object.entries(current.totals)) {
    if (baseline.totals?.[key] !== value) drift.push({ key: `totals.${key}`, before: baseline.totals?.[key] ?? null, after: value });
  }
  const paths = new Set([...Object.keys(baseline.ledgers ?? {}), ...Object.keys(current.ledgers)]);
  for (const path of [...paths].sort()) {
    for (const field of ["open", "problems"]) {
      const before = baseline.ledgers?.[path]?.[field] ?? null;
      const after = current.ledgers[path]?.[field] ?? null;
      if (before !== after) drift.push({ key: `${path} ${field}`, before, after });
    }
  }
  return drift;
}

export function readBaseline(text) {
  const match = BASELINE_RE.exec(text);
  return match ? JSON.parse(match[1]) : null;
}

const KEY_CELL_RE = /^\|\s*`?(v\d+\.\d+(?:\.\d+)?#[A-Z]{2,4}-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*)`?\s*\|/;

/** Item keys in the first column of a document's table rows, with the `## ` heading each sits under. */
export function listedKeys(text) {
  const listed = [];
  let heading = "";
  for (const line of splitLines(text)) {
    const h = /^##\s+(.*?)\s*$/.exec(line);
    if (h) heading = h[1];
    const key = KEY_CELL_RE.exec(line);
    if (key) listed.push({ key: key[1], heading });
  }
  return listed;
}

/**
 * Coverage of the triage record and the follow-up batch list against the
 * inventory. Pass `null` for a file that was not given; its scope is then
 * not required. Returns `{ ok, missing, repeated, unknown, oversized }`.
 */
export function checkCoverage(inventory, { triage = null, batches = null }) {
  const triageScope = inventory.items
    .filter((i) => (i.ledger === REGISTER || i.ledger === RELEASE_V212) && i.state === "open")
    .map((i) => i.key);
  const batchScope = inventory.archivedOnly.map((i) => i.key);
  const expected = new Set([...(triage !== null ? triageScope : []), ...(batches !== null ? batchScope : [])]);
  const known = new Set([...triageScope, ...batchScope]);
  const fromTriage = triage !== null ? listedKeys(triage) : [];
  const fromBatches = batches !== null ? listedKeys(batches) : [];
  const counts = new Map();
  for (const { key } of [...fromTriage, ...fromBatches]) counts.set(key, (counts.get(key) ?? 0) + 1);
  const perBatch = new Map();
  for (const { heading } of fromBatches.filter((entry) => /^Batch(?![A-Za-z])/.test(entry.heading))) {
    perBatch.set(heading, (perBatch.get(heading) ?? 0) + 1);
  }
  const result = {
    missing: [...expected].filter((key) => !counts.has(key)).sort(),
    repeated: [...counts].filter(([, n]) => n > 1).map(([key]) => key).sort(),
    unknown: [...counts.keys()].filter((key) => !known.has(key)).sort(),
    oversized: [...perBatch].filter(([, n]) => n > BATCH_LIMIT).map(([heading, n]) => `${heading}: ${n}`),
  };
  return { ok: Object.values(result).every((list) => list.length === 0), ...result };
}

export function renderMarkdown(inventory, drift) {
  const t = inventory.totals;
  const out = [
    "# Known-gaps inventory",
    "",
    `- Ledgers: ${t.ledgers}; items: ${t.items}; open: ${t.open}; problems: ${t.problems}`,
    `- Register entries: ${t.carriers}; archived originals they carry: ${t.carriedOriginals}`,
    `- Archived-only open items: ${t.archivedOnly}`,
    `- Distinct open items: ${t.distinctOpen}`,
    "",
    "| Ledger | Items | Open | Problems |",
    "|---|---:|---:|---:|",
    ...inventory.ledgers.map((l) => `| ${l.path} | ${l.items} | ${l.open} | ${l.problems} |`),
    "",
    "## Register entries without an archived original",
    "",
    ...(inventory.unmatched.length === 0
      ? ["None."]
      : inventory.unmatched.map((c) => `- ${c.id} (${c.match}): record ${c.record || "none"}`)),
  ];
  if (drift) {
    out.push("", "## Drift against the baseline", "");
    out.push(...(drift.length === 0 ? ["None."] : drift.map((d) => `- ${d.key}: ${d.before} -> ${d.after}`)));
  }
  return `${out.join("\n")}\n`;
}

function main(argv) {
  const option = (name) => {
    const at = argv.indexOf(name);
    return at === -1 ? null : argv[at + 1];
  };
  const found = discoverLedgers();
  const inventory = buildInventory(found.ledgers);
  inventory.unreadable = found.unreadable;
  const today = new Date().toISOString().slice(0, 10);
  const current = snapshotOf(inventory, { date: today, pin: found.pin });
  if (option("--triage") || option("--batches")) {
    const read = (name) => (option(name) ? readFileSync(resolve(ROOT, option(name)), "utf8") : null);
    const coverage = checkCoverage(inventory, { triage: read("--triage"), batches: read("--batches") });
    process.stdout.write(`${JSON.stringify(coverage, null, 2)}
`);
    return coverage.ok ? 0 : 1;
  }
  if (argv.includes("--snapshot")) {
    process.stdout.write(
      `<!-- inventory-baseline:start -->\n\`\`\`json\n${JSON.stringify(current, null, 2)}\n\`\`\`\n<!-- inventory-baseline:end -->\n`,
    );
    return 0;
  }
  const baselinePath = resolve(ROOT, option("--baseline") ?? DEFAULT_BASELINE);
  let drift = null;
  if (existsSync(baselinePath)) {
    const baseline = readBaseline(readFileSync(baselinePath, "utf8"));
    if (baseline === null && option("--baseline")) {
      process.stderr.write(`no inventory baseline block in ${baselinePath}\n`);
      return 1;
    }
    if (baseline) drift = driftFrom(baseline, current);
  }
  if (argv.includes("--json")) process.stdout.write(`${JSON.stringify({ ...inventory, drift }, null, 2)}\n`);
  else process.stdout.write(renderMarkdown(inventory, drift));
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
