#!/usr/bin/env node
/**
 * One-time known-gaps ledger converter (v2.15.0). Removed after v2.15.0, once
 * every in-scope ledger is converted; the inventory stays.
 *
 * Rewrites the rows the completion checker cannot read (table and bullet rows
 * that start like a gap id) into the shape it does read, without changing a
 * word. The rules are decided in
 * docs/releases/v2/v2.15/development/v2.15.0-ledger-conversion-decisions.md:
 *
 *   - a row that copies an entry recorded elsewhere keeps its table place and
 *     gains that ledger's `vX.Y#` prefix (decision 1);
 *   - a row that is the item's only record becomes a heading entry in place
 *     (decision 2);
 *   - a closed table outside a Resolved subsection gets a `### Resolved`
 *     heading (decision 5);
 *   - in the carry-forward register, every row becomes an entry, and one whose
 *     id is owned by the other v2.12 ledger becomes a superseded entry
 *     (decisions 4 and 6).
 *
 * Every write is checked by the independent oracle in preserve.mjs and by the
 * pinned checker adapter, which must report zero problems for the output.
 *
 * Usage:
 *   node scripts/known-gaps/migrations/normalize.mjs --dry-run <ledger> [--date YYYY-MM-DD]
 *   node scripts/known-gaps/migrations/normalize.mjs --apply <ledger> [--date YYYY-MM-DD]
 *
 * --dry-run prints the converted ledger on stdout and the report on stderr.
 * Exits 0 on success (including a no-op), 1 on a refusal or a failed check.
 */

import { writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  compareMinor,
  detectEol,
  fenceMask,
  headingAbove,
  isSeparatorRow,
  isTableRow,
  leadingId,
  ledgerPathsIn,
  splitCells,
  splitLines,
  tableBounds,
} from "../ledger-text.mjs";
import { discoverLedgers, ROOT, runAdapter } from "../adapter.mjs";
import { checkPreservation } from "./preserve.mjs";

export const REGISTER = "docs/v2/v2.12/known-gaps.md";
export const SCOPE = { from: "v1.17", to: "v2.12" };
const TITLE_HEADERS = new Set(["why it is still open", "title", "item", "gap", "summary"]);
const ROW_PROBLEM_RE = /^line (\d+) row$/;
const BULLET_RE = /^\s{0,3}[-*+]\s+\*\*([A-Z]{2,4}-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*)\*\*\s+-{1,2}\s+(.*)$/;
const MAX_TITLE = 160;

export class Refusal extends Error {}

export function inScope(minor) {
  return compareMinor(minor, SCOPE.from) >= 0 && compareMinor(minor, SCOPE.to) <= 0;
}

/** 0-based line indexes of the checker's row problems. */
function flaggedRows(ledger) {
  const rows = new Set();
  for (const problem of ledger.problems) {
    const match = ROW_PROBLEM_RE.exec(problem);
    if (match) rows.add(Number(match[1]) - 1);
  }
  return rows;
}

/**
 * The heading title and the rest of a cell: the first sentence when it ends at
 * a `. ` outside code, links and parentheses and is at most MAX_TITLE long.
 */
export function splitFirstSentence(cell) {
  let depth = 0;
  let code = false;
  for (let i = 0; i < cell.length - 1; i += 1) {
    const char = cell[i];
    if (char === "`") code = !code;
    else if (!code && (char === "(" || char === "[")) depth += 1;
    else if (!code && (char === ")" || char === "]")) depth = Math.max(0, depth - 1);
    else if (!code && depth === 0 && char === "." && cell[i + 1] === " ") {
      const first = cell.slice(0, i + 1);
      return first.length <= MAX_TITLE ? [first, cell.slice(i + 2).trim()] : [cell, ""];
    }
  }
  return [cell, ""];
}

/** Whether a table's nearest heading marks it as closed work. */
function closedTable(heading) {
  return Boolean(heading) && /\b(closed|resolved)\b/i.test(heading.text);
}

/**
 * Every decision for one ledger's flagged rows, in line order.
 *
 * `holders` maps a ledger path to the ids it holds as entries, for ledgers
 * already analyzed (earlier minors). Returns `{ rows, holds }`, where `holds`
 * is this ledger's own holder set after conversion.
 */
export function analyzeLedger(ledger, ledgers, holders) {
  const lines = splitLines(ledger.text);
  const mask = fenceMask(lines);
  const flagged = flaggedRows(ledger);
  const own = new Set(ledger.items.map((item) => item.id));
  const holds = new Map(ledger.items.map((item) => [item.id, item.state]));
  const rows = [];
  const tables = new Map();

  const holderOf = (path, id) => holders.get(path)?.has(id) ?? false;
  // A resolved entry is a different, closed gap that reuses the short id; only an
  // explicitly named ledger may resolve a reference to it.
  const liveHolderOf = (path, id) => (holders.get(path)?.get(id) ?? "resolved") !== "resolved";
  const classify = (id, recordCell, line) => {
    const named = recordCell ? ledgerPathsIn(recordCell, ledger.path) : [];
    if (ledger.path === REGISTER) {
      const owner = named.find((path) => {
        const other = ledgers.find((l) => l.path === path);
        return other && other.path !== ledger.path && other.minor === ledger.minor && holderOf(path, id);
      });
      return owner ? { kind: "superseded", by: owner } : { kind: "original" };
    }
    const byRecord = named.find((path) => path !== ledger.path && holderOf(path, id));
    if (byRecord) return { kind: "reference", minor: ledgers.find((l) => l.path === byRecord).minor, via: "record" };
    if (own.has(id)) return { kind: "reference", minor: ledger.minor, via: "same-file" };
    const earlier = ledgers.filter(
      (l) => l.path !== ledger.path && compareMinor(l.minor, ledger.minor) < 0 && liveHolderOf(l.path, id),
    );
    if (earlier.length > 1) {
      throw new Refusal(
        `line ${line + 1}: ${id} is held by ${earlier.map((l) => l.path).join(", ")} and the row names none of them`,
      );
    }
    if (earlier.length === 1) return { kind: "reference", minor: earlier[0].minor, via: "earlier" };
    return { kind: "original" };
  };

  for (const index of [...flagged].sort((a, b) => a - b)) {
    if (mask[index]) throw new Refusal(`line ${index + 1}: flagged row inside fenced code`);
    const line = lines[index];
    if (isTableRow(line)) {
      const [start, end] = tableBounds(lines, index);
      if (!tables.has(start)) {
        if (end - start < 2 || !isSeparatorRow(lines[start + 1])) {
          throw new Refusal(`line ${start + 1}: table without a separator row`);
        }
        const headers = splitCells(lines[start]);
        if (!/^id$/i.test(headers[0] ?? "")) throw new Refusal(`line ${start + 1}: table's first column is not ID`);
        const heading = headingAbove(lines, mask, start);
        tables.set(start, { start, end, headers, heading, closed: closedTable(heading) });
      }
      const table = tables.get(start);
      if (index < start + 2) throw new Refusal(`line ${index + 1}: flagged row is a table header`);
      if (table.closed) {
        rows.push({ index, table: start, kind: "closed" });
        continue;
      }
      const cells = splitCells(line);
      if (cells.length !== table.headers.length) {
        throw new Refusal(`line ${index + 1}: row has ${cells.length} cells, header has ${table.headers.length}`);
      }
      const id = leadingId(cells[0]);
      if (id === null || cells[0].replaceAll("**", "").trim() !== id) {
        throw new Refusal(`line ${index + 1}: id cell is not a bare id: ${cells[0]}`);
      }
      const recordColumn = table.headers.findIndex((header) => /record/i.test(header));
      const decision = classify(id, recordColumn > 0 ? cells[recordColumn] : "", index);
      rows.push({ index, table: start, id, cells, ...decision });
      if (decision.kind !== "reference") holds.set(id, decision.kind === "superseded" ? "resolved" : "open");
      continue;
    }
    const bullet = BULLET_RE.exec(line);
    if (!bullet) throw new Refusal(`line ${index + 1}: unrecognized row shape`);
    let end = index + 1;
    while (end < lines.length && /^\s+\S/.test(lines[end]) && !mask[end]) end += 1;
    if (end < lines.length && lines[end].trim() !== "" && !/^\s{0,3}[-*+]\s/.test(lines[end]) && !/^ {0,3}#/.test(lines[end])) {
      throw new Refusal(`line ${end + 1}: bullet ${bullet[1]} continues as an unindented paragraph`);
    }
    // A bullet with its own fields is the item's full record, never a copy (decision 2).
    rows.push({ index, end, table: null, id: bullet[1], text: bullet[2], kind: "original" });
    holds.set(bullet[1], "open");
  }
  return { rows, holds, tables, lines, mask };
}

/** Holder sets for every ledger, analyzed in minor order; refusals elsewhere become warnings. */
export function planHolders(ledgers) {
  const holders = new Map();
  const warnings = [];
  const ordered = [...ledgers].sort((a, b) => compareMinor(a.minor, b.minor) || a.path.localeCompare(b.path));
  for (const ledger of ordered) {
    if (!inScope(ledger.minor)) {
      holders.set(ledger.path, new Map(ledger.items.map((item) => [item.id, item.state])));
      continue;
    }
    try {
      holders.set(ledger.path, analyzeLedger(ledger, ledgers, holders).holds);
    } catch (error) {
      if (!(error instanceof Refusal)) throw error;
      warnings.push(`${ledger.path}: ${error.message}`);
      holders.set(ledger.path, new Map(ledger.items.map((item) => [item.id, item.state])));
    }
  }
  return { holders, warnings };
}

function entryLines(level, id, cells, headers, extra) {
  const titled = TITLE_HEADERS.has((headers[1] ?? "").trim().toLowerCase());
  const [first, rest] = titled ? splitFirstSentence(cells[1]) : ["", ""];
  const suffix = extra.closedOn ? ` - CLOSED ${extra.closedOn}` : "";
  const out = [`${"#".repeat(level)} ${id}${first ? ` - ${first}` : ""}${suffix}`, ""];
  if (rest) out.push(rest, "");
  const fields = [];
  for (let column = titled ? 2 : 1; column < headers.length; column += 1) {
    if (cells[column] !== "") fields.push(`- **${headers[column]}**: ${cells[column]}`);
  }
  if (extra.supersededBy) fields.push(`- **Superseded by**: ${extra.supersededBy} ${id}`);
  out.push(...fields);
  while (out.at(-1) === "") out.pop();
  return out;
}

function qualifiedRow(line, id, minor) {
  return line.replace(new RegExp(`^(\\s{0,3}\\|\\s*\\**\\[?)${id}(?![A-Za-z0-9-])`), `$1${minor}#${id}`);
}

const levelFor = (heading) => Math.min(6, Math.max(3, (heading?.level ?? 2) + 1));

/** Lines replacing one table: segments of kept rows and entries, one blank line apart. */
function convertTable(table, decisions, lines, date) {
  const byLine = new Map(decisions.map((row) => [row.index, row]));
  const level = levelFor(table.heading);
  const blocks = [];
  let pending = [];
  const flush = () => {
    if (pending.length > 0) blocks.push([lines[table.start], lines[table.start + 1], ...pending]);
    pending = [];
  };
  for (let index = table.start + 2; index < table.end; index += 1) {
    const row = byLine.get(index);
    if (!row) pending.push(lines[index]);
    else if (row.kind === "reference") pending.push(qualifiedRow(lines[index], row.id, row.minor));
    else {
      flush();
      const extra = row.kind === "superseded" ? { closedOn: date, supersededBy: row.by } : {};
      blocks.push(entryLines(level, row.id, row.cells, table.headers, extra));
    }
  }
  flush();
  return blocks.flatMap((block, i) => (i === 0 ? block : ["", ...block]));
}

/**
 * Convert one ledger. Returns `{ output, changed, report }`; throws Refusal.
 * `ledgers` is the adapter's discovery for the whole repository.
 */
export function convertLedger(target, ledgers, { date }) {
  if (!inScope(target.minor)) throw new Refusal(`${target.path} is outside ${SCOPE.from} to ${SCOPE.to}`);
  const unsupported = target.problems.filter((problem) => !ROW_PROBLEM_RE.test(problem));
  if (unsupported.length > 0) throw new Refusal(`unsupported problems: ${unsupported.join(", ")}`);
  const parsedOpen = target.items.filter((item) => item.state === "open").length;
  if (target.problems.length === 0) {
    return { output: target.text, changed: false, report: { ledger: target.path, entries: 0, references: 0, superseded: 0, resolvedTables: 0, openBefore: parsedOpen, openAfter: parsedOpen } };
  }
  const { holders } = planHolders(ledgers.filter((l) => l.path !== target.path));
  const { rows, tables, lines, mask } = analyzeLedger(target, ledgers, holders);

  const ids = new Map(target.items.filter((item) => item.state !== "resolved").map((item) => [`${item.section}\u0000${item.id}`, "an existing entry"]));
  for (const row of rows.filter((r) => r.kind === "original" || r.kind === "superseded")) {
    const section = sectionOf(lines, mask, row.index);
    const key = `${section}\u0000${row.id}`;
    if (ids.has(key)) throw new Refusal(`line ${row.index + 1}: ${row.id} collides with ${ids.get(key)} in section "${section}"`);
    ids.set(key, `line ${row.index + 1}`);
  }

  const out = [];
  for (let index = 0; index < lines.length; ) {
    const table = tables.get(index);
    if (table) {
      const decisions = rows.filter((row) => row.table === index);
      if (table.closed) {
        let after = table.end;
        while (after < lines.length && lines[after].trim() === "") after += 1;
        if (after < lines.length && !/^ {0,3}#/.test(lines[after])) {
          throw new Refusal(`line ${after + 1}: text follows a closed table and would move under Resolved`);
        }
        if (out.length > 0 && out.at(-1).trim() !== "") out.push("");
        out.push("### Resolved", "", ...lines.slice(table.start, table.end));
      } else {
        out.push(...convertTable(table, decisions, lines, date));
      }
      index = table.end;
      continue;
    }
    const bullet = rows.find((row) => row.table === null && row.index === index);
    if (bullet) {
      const level = levelFor(headingAbove(lines, mask, index));
      const [first, rest] = splitFirstSentence(bullet.text);
      if (out.length > 0 && out.at(-1).trim() !== "") out.push("");
      out.push(`${"#".repeat(level)} ${bullet.id} - ${first}`);
      if (rest) out.push("", rest);
      const continuation = lines.slice(index + 1, bullet.end);
      if (continuation.length > 0) {
        const indent = Math.min(...continuation.map((l) => /^\s*/.exec(l)[0].length));
        out.push("", ...continuation.map((l) => l.slice(indent)));
      }
      if ((lines[bullet.end] ?? "").trim() !== "") out.push("");
      index = bullet.end;
      continue;
    }
    out.push(lines[index]);
    index += 1;
  }

  const created = rows.filter((row) => row.kind === "original").length;
  const openAfter = parsedOpen + created;
  let output = out.join(detectEol(target.text));
  output = output.replace(/^(\*\*Open items\*\*\s*:\s*)\d+(\s*)$/im, `$1${openAfter}$2`);
  return {
    output,
    changed: output !== target.text,
    report: {
      ledger: target.path,
      entries: created,
      references: rows.filter((row) => row.kind === "reference").length,
      superseded: rows.filter((row) => row.kind === "superseded").length,
      resolvedTables: [...tables.values()].filter((table) => table.closed).length,
      openBefore: openAfter,
      openAfter,
    },
  };
}

function sectionOf(lines, mask, index) {
  for (let i = index - 1; i >= 0; i -= 1) {
    if (mask[i]) continue;
    const match = /^ {0,3}##(?!#)[ \t]+(.*?)[ \t]*$/.exec(lines[i]) ?? /^ {0,3}#(?!#)[ \t]+(.*?)[ \t]*$/.exec(lines[i]);
    if (match) return /^ {0,3}##(?!#)/.test(lines[i]) ? match[1] : "";
  }
  return "";
}

// ------------------------------------------------------------------ CLI

function main(argv) {
  const mode = argv.find((arg) => arg === "--dry-run" || arg === "--apply");
  const dateAt = argv.indexOf("--date");
  const date = dateAt !== -1 ? argv[dateAt + 1] : new Date().toISOString().slice(0, 10);
  const target = argv.find((arg, i) => !arg.startsWith("--") && argv[i - 1] !== "--date");
  if (!mode || !target || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    process.stderr.write("usage: normalize.mjs --dry-run|--apply <ledger> [--date YYYY-MM-DD]\n");
    return 1;
  }
  const rel = relative(ROOT, resolve(target)).replaceAll("\\", "/");
  const { ledgers } = discoverLedgers();
  const ledger = ledgers.find((l) => l.path === rel);
  if (!ledger) {
    process.stderr.write(`not a ledger the checker reads: ${rel}\n`);
    return 1;
  }
  let result;
  try {
    result = convertLedger(ledger, ledgers, { date });
  } catch (error) {
    if (!(error instanceof Refusal)) throw error;
    process.stderr.write(`REFUSED ${rel}: ${error.message}\n`);
    return 1;
  }
  const preservation = checkPreservation(ledger.text, result.output);
  const parsed = runAdapter(["parse", "--stdin"], result.output).files[0];
  const open = parsed.items.filter((item) => item.state === "open").length;
  const report = {
    ...result.report,
    changed: result.changed,
    problemsBefore: ledger.problems.length,
    problemsAfter: parsed.problems.length,
    problems: parsed.problems,
    parsedOpenAfter: open,
    preservation,
  };
  process.stderr.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!preservation.ok) {
    process.stderr.write(`PRESERVATION FAILED at word ${preservation.at}: expected "${preservation.expected}", got "${preservation.actual}"\n`);
    return 1;
  }
  if (parsed.problems.length > 0 || open !== result.report.openAfter) {
    process.stderr.write("CHECK FAILED: the output does not parse cleanly with the expected open count\n");
    return 1;
  }
  if (mode === "--dry-run") process.stdout.write(result.output);
  else if (result.changed) writeFileSync(resolve(ROOT, rel), result.output, "utf8");
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
