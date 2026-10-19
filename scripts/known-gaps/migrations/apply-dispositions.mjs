#!/usr/bin/env node
/**
 * One-time application of the v2.15.0 triage (Phase 4, T013 and T014).
 * Removed after v2.15.0 together with the converter; the inventory stays.
 *
 * Reads the final dispositions from
 * docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md (T010: a high-
 * confidence `resolve` is final; every other proposal migrates) and:
 *
 *   - marks each resolved register entry ` - RESOLVED <date>` with a
 *     Resolution line citing the triage record;
 *   - copies each migrated register or v2.12 release entry into the v2.15.0
 *     section of docs/releases/v2/v2.15/known-gaps.md under the next free id
 *     of its kind, title and body first and verbatim (links repointed by the
 *     checker's own rewrite_links, through the pinned adapter), then Why still
 *     owed, Next step and Migrated from lines; the source heading gains
 *     ` - MIGRATED to v2.15.0`;
 *   - marks every archived original a register entry carries ` - CLOSED <date>`
 *     with a Superseded by line naming the register entry (decision 6);
 *   - updates `**Open items**:` lines and the Open/Resolved summary counts.
 *
 * It only appends markers and lines; no existing word changes. The pinned
 * checker then verifies every migration (`inventory.mjs --verify-migrations`).
 *
 * Usage:
 *   node scripts/known-gaps/migrations/apply-dispositions.mjs --dry-run|--apply [--date YYYY-MM-DD]
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { discoverLedgers, ROOT, runAdapter } from "../adapter.mjs";
import { buildInventory, REGISTER, RELEASE_V212 } from "../inventory.mjs";
import { detectEol, fenceMask, parseHeading, splitCells, splitLines } from "../ledger-text.mjs";

export const TRIAGE = "docs/releases/v2/v2.15/development/v2.15.0-gap-triage.md";
export const TARGET = "docs/releases/v2/v2.15/known-gaps.md";
const TARGET_VERSION = "v2.15.0";
const TARGET_SECTION = "v2.15.0";
// The v2.15 ledger's summary has the six standard categories; a CI-kind item
// is a quality-gate gap there.
const KIND_IN_TARGET = { CI: "QG" };

/** `{ key -> { final, why, next, proposal, confidence } }` from the triage record's item table. */
export function readDispositions(text) {
  const out = new Map();
  for (const line of splitLines(text)) {
    if (!/^\|\s*v\d+\.\d+(?:\.\d+)?#/.test(line)) continue;
    const cells = splitCells(line).map((cell) => cell.replaceAll("\\|", "|"));
    const [key, , , , proposal, confidence, why, next] = cells;
    const final = proposal === "resolve" && confidence === "high" ? "resolve" : "migrate";
    out.set(key, { final, proposal, confidence, why, next });
  }
  return out;
}

/** Why still owed and Next step lines for a migrated item, by its T010 history. */
export function owedLines(d) {
  if (d.proposal === "close") {
    return {
      why: `Proposed for closure at v2.15.0 triage, not accepted by the owner (T010): ${d.why}`,
      next: `Accept or reject the proposed closure recorded in \`${TRIAGE}\`.`,
    };
  }
  if (d.proposal === "resolve") {
    return {
      why: `Proposed resolved at low confidence at v2.15.0 triage, not accepted (T010): ${d.why}`,
      next: "Run `desktop/tests/packaged/offline.smoke.mjs` on the next packaged probe report and record `offline: PASS`.",
    };
  }
  return { why: d.why, next: d.next };
}

/**
 * Line index ranges of an unresolved item in a ledger's text: `{ heading, end }`,
 * where `end` is the exclusive line index of the item's block. The item is the
 * one heading with that id inside the named `## ` section.
 */
export function locate(lines, mask, section, id) {
  let current = "";
  const found = [];
  const idRe = new RegExp(`^${id.replace(/[-]/g, "\\-")}(?![A-Za-z0-9-])`);
  lines.forEach((line, index) => {
    if (mask[index]) return;
    const h = parseHeading(line);
    if (!h) return;
    if (h.level <= 2) current = h.text;
    else if (current === section && idRe.test(h.text) && !/\s-{1,2}\s*(RESOLVED|CLOSED|MIGRATED)\b/.test(h.text)) {
      found.push({ index, level: h.level });
    }
  });
  if (found.length !== 1) throw new Error(`${id} in section "${section}": ${found.length} matching headings`);
  const { index, level } = found[0];
  let end = lines.length;
  for (let i = index + 1; i < lines.length; i += 1) {
    if (mask[i]) continue;
    const h = parseHeading(lines[i]);
    if (h && (h.level <= level || (h.level >= 3 && /^[A-Z]{2,4}-[A-Za-z0-9]/.test(h.text)))) {
      end = i;
      break;
    }
  }
  return { heading: index, end };
}

/** A ledger being edited: its lines and a queue of edits applied bottom-up. */
class Edit {
  constructor(path) {
    this.path = path;
    this.text = readFileSync(resolve(ROOT, path), "utf8");
    this.eol = detectEol(this.text);
    this.lines = splitLines(this.text);
    this.mask = fenceMask(this.lines);
    this.ops = [];
  }

  /** Append a marker to the item's heading and optionally a line at the end of its block. */
  mark(section, id, marker, line) {
    const { heading, end } = locate(this.lines, this.mask, section, id);
    this.ops.push({ at: heading, kind: "marker", marker });
    if (line) {
      let last = end - 1;
      while (last > heading && this.lines[last].trim() === "") last -= 1;
      const listEnd = /^\s*[-*+]\s/.test(this.lines[last]);
      this.ops.push({ at: last + 1, kind: "insert", lines: listEnd ? [line] : ["", line] });
    }
  }

  insertBefore(index, block) {
    this.ops.push({ at: index, kind: "insert", lines: block });
  }

  render() {
    const lines = [...this.lines];
    for (const op of [...this.ops].sort((a, b) => b.at - a.at || (a.kind === "marker" ? 1 : -1))) {
      if (op.kind === "marker") lines[op.at] = `${lines[op.at].replace(/\s+$/, "")}${op.marker}`;
      else lines.splice(op.at, 0, ...op.lines);
    }
    return lines.join(this.eol);
  }
}

/** Open and Resolved summary counts and the `**Open items**:` line, recomputed from the checker's parse. */
export function recount(before, after) {
  const parse = (text) => runAdapter(["parse", "--stdin"], text).files[0].items;
  const oldItems = parse(before);
  const newItems = parse(after);
  const open = (items, section, kind) =>
    items.filter((i) => i.state === "open" && i.section === section && (KIND_IN_TARGET[i.kind] ?? i.kind) === kind).length;
  const lines = splitLines(after);
  let section = "";
  let subsection = "";
  const out = lines.map((line) => {
    const h = parseHeading(line);
    if (h && h.level <= 2) {
      section = h.text;
      subsection = "";
    } else if (h && h.level === 3) subsection = h.text;
    const row = /^(\|[^|]*\(([A-Z]{2,4})\)\s*\|\s*)(\d+)(\s*\|\s*)(\d+)(\s*\|\s*)$/.exec(line);
    if (row && subsection === "Summary") {
      const kind = row[2];
      const was = open(oldItems, section, kind);
      const now = open(newItems, section, kind);
      return `${row[1]}${now}${row[4]}${Number(row[5]) + Math.max(0, was - now)}${row[6]}`;
    }
    return line;
  });
  const total = newItems.filter((i) => i.state === "open").length;
  return out.join(detectEol(after)).replace(/^(\*\*Open items\*\*\s*:\s*)\d+/m, `$1${total}`);
}

/** Next free id per kind in the target section, counting entries and table rows (its Resolved table). */
function nextFreeIds(items, text) {
  const used = new Map();
  const take = (id) => {
    const match = /^([A-Z]{2,4})-(\d+)$/.exec(id);
    if (match) used.set(match[1], Math.max(used.get(match[1]) ?? 0, Number(match[2])));
  };
  for (const item of items.filter((i) => i.section === TARGET_SECTION)) take(item.id);
  let section = "";
  for (const line of splitLines(text)) {
    const h = parseHeading(line);
    if (h?.level === 2) section = h.text;
    const row = /^\|\s*([A-Z]{2,4}-\d+)\s*\|/.exec(line);
    if (row && section === TARGET_SECTION) take(row[1]);
  }
  return (kind) => {
    const k = KIND_IN_TARGET[kind] ?? kind;
    const n = (used.get(k) ?? 0) + 1;
    used.set(k, n);
    return `${k}-${n}`;
  };
}

export function plan(date) {
  const { ledgers } = discoverLedgers();
  const inventory = buildInventory(ledgers);
  const dispositions = readDispositions(readFileSync(resolve(ROOT, TRIAGE), "utf8"));
  const edits = new Map();
  const edit = (path) => {
    if (!edits.has(path)) edits.set(path, new Edit(path));
    return edits.get(path);
  };
  const triaged = inventory.items.filter((i) => (i.ledger === REGISTER || i.ledger === RELEASE_V212) && i.state === "open");
  const missing = triaged.filter((i) => !dispositions.has(i.key)).map((i) => i.key);
  if (missing.length > 0) throw new Error(`no disposition for ${missing.join(", ")}`);

  const target = ledgers.find((l) => l.path === TARGET);
  const freeId = nextFreeIds(target.items, target.text);
  const copies = [];
  const report = { resolved: [], migrated: [], superseded: [] };
  for (const item of triaged) {
    const d = dispositions.get(item.key);
    if (d.final === "resolve") {
      edit(item.ledger).mark(item.section, item.id, ` - RESOLVED ${date}`, `- **Resolution**: ${d.why} Evidence: ${d.next || "see"} \`${TRIAGE}\`.`);
      report.resolved.push(item.key);
      continue;
    }
    const copy = runAdapter(["copy-body", "--source", item.ledger, "--id", item.id, "--dest", TARGET]);
    const newId = freeId(item.id.split("-")[0]);
    const { why, next } = owedLines(d);
    const body = copy.body.replace(/\r\n/g, "\n").replace(/^\n+|\s+$/g, "").split("\n");
    copies.push([
      `#### ${newId}${copy.title}`,
      "",
      ...body,
      "",
      `- **Why still owed**: ${why}`,
      `- **Next step**: ${next}`,
      `- **Migrated from**: v2.12#${item.id} on ${date} (reason: user-deferred)`,
      `- **Migration evidence**: triaged in \`${TRIAGE}\` (v2.15.0 T009 and T010)${KIND_IN_TARGET[item.id.split("-")[0]] ? `; recorded as a ${KIND_IN_TARGET[item.id.split("-")[0]]} item because this ledger has no ${item.id.split("-")[0]} category` : ""}`,
      "",
    ]);
    edit(item.ledger).mark(item.section, item.id, ` - MIGRATED to ${TARGET_VERSION}`);
    report.migrated.push(`${item.key} -> ${TARGET_VERSION}#${newId}`);
  }

  for (const carrier of inventory.carriers) {
    if (!carrier.carries || carrier.duplicateOf || carrier.form !== "entry") continue;
    const original = inventory.items.find((i) => i.ledger === carrier.carries.ledger && i.id === carrier.carries.id && i.state === "open");
    if (!original || original.layout !== "archive") continue;
    edit(original.ledger).mark(original.section, original.id, ` - CLOSED ${date}`, `- **Superseded by**: ${REGISTER} ${carrier.id}`);
    report.superseded.push(original.key + " (" + original.ledger + ")");
  }

  // The copies go at the end of the v2.15.0 Open Items, before its Resolved subsection.
  const t = edit(TARGET);
  let section = "";
  let at = -1;
  t.lines.forEach((line, index) => {
    const h = parseHeading(line);
    if (h?.level === 2) section = h.text;
    if (at === -1 && section === TARGET_SECTION && h?.level === 3 && h.text.startsWith("Resolved")) at = index;
  });
  if (at === -1) throw new Error(`no Resolved subsection in ${TARGET} ${TARGET_SECTION}`);
  t.insertBefore(at, copies.flat());

  const outputs = new Map();
  for (const [path, e] of edits) outputs.set(path, recount(e.text, e.render()));
  return { outputs, report, edits };
}

function main(argv) {
  const mode = argv.find((a) => a === "--dry-run" || a === "--apply");
  const dateAt = argv.indexOf("--date");
  const date = dateAt !== -1 ? argv[dateAt + 1] : new Date().toISOString().slice(0, 10);
  if (!mode || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    process.stderr.write("usage: apply-dispositions.mjs --dry-run|--apply [--date YYYY-MM-DD]\n");
    return 1;
  }
  const { outputs, report, edits } = plan(date);
  const problems = {};
  for (const [path, text] of outputs) {
    const parsed = runAdapter(["parse", "--stdin"], text).files[0];
    if (parsed.problems.length > 0) problems[path] = parsed.problems;
  }
  process.stdout.write(
    `${JSON.stringify({ resolved: report.resolved.length, migrated: report.migrated.length, superseded: report.superseded.length, files: [...outputs.keys()], problems, report }, null, 2)}\n`,
  );
  if (Object.keys(problems).length > 0) return 1;
  if (mode === "--apply") for (const [path, text] of outputs) writeFileSync(resolve(ROOT, path), text, "utf8");
  void edits;
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`REFUSED: ${error.message}\n`);
    process.exitCode = 1;
  }
}
