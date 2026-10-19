/**
 * Shared text helpers for known-gaps ledgers (v2.15.0).
 *
 * Line splitting that keeps each file's line endings, GFM table rows and
 * cells, heading lookup outside fenced code, and the ledger paths a row's
 * "Archived record" cell names. The inventory and the one-time converter both
 * read ledgers through these, so the two never disagree about what a row is.
 */

import { posix } from "node:path";

/** A gap id as the checker reads it (`GAP_ID` in completion_minor.py). */
export const GAP_ID_SOURCE = "[A-Z]{2,4}-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*";
export const GAP_ID_RE = new RegExp(`^${GAP_ID_SOURCE}$`);

const HEADING_RE = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/;
const FENCE_OPEN_RE = /^ {0,3}(`{3,}|~{3,})(.*)$/;
const FENCE_CLOSE_RE = /^ {0,3}(`{3,}|~{3,})[ \t]*$/;
const SEPARATOR_CELL_RE = /^:?-{3,}:?$/;

/** The file's line ending: CRLF when any line uses it, else LF. */
export function detectEol(text) {
  return text.includes("\r\n") ? "\r\n" : "\n";
}

/** Lines without their endings; `join(eol)` restores the file when it ends with `eol`. */
export function splitLines(text) {
  return text.split(/\r?\n/);
}

/** Per line, whether it sits inside a fenced code block (opener and closer included). */
export function fenceMask(lines) {
  const mask = new Array(lines.length).fill(false);
  let fence = null;
  lines.forEach((line, index) => {
    if (fence === null) {
      const opener = FENCE_OPEN_RE.exec(line);
      if (opener && !(opener[1][0] === "`" && opener[2].includes("`"))) {
        fence = { char: opener[1][0], size: opener[1].length };
        mask[index] = true;
      }
      return;
    }
    mask[index] = true;
    const closer = FENCE_CLOSE_RE.exec(line);
    if (closer && closer[1][0] === fence.char && closer[1].length >= fence.size) fence = null;
  });
  return mask;
}

/** `{ level, text }` for an ATX heading line, else null. */
export function parseHeading(line) {
  const match = HEADING_RE.exec(line);
  return match ? { level: match[1].length, text: match[2] ?? "" } : null;
}

/** The nearest heading above `index` outside fenced code, or null. */
export function headingAbove(lines, mask, index) {
  for (let i = index - 1; i >= 0; i -= 1) {
    if (mask[i]) continue;
    const heading = parseHeading(lines[i]);
    if (heading) return { ...heading, line: i };
  }
  return null;
}

export function isTableRow(line) {
  return /^\s{0,3}\|/.test(line);
}

/**
 * The cells of a table row, trimmed. A backslash-escaped pipe stays in its cell,
 * and so does a pipe inside a code span: GFM would split there, but the ledgers
 * that do it (v2.11's `<|tool_result>`) mean one cell, so the author's cell
 * count is the one kept.
 */
export function splitCells(line) {
  let body = line.trim();
  if (body.startsWith("|")) body = body.slice(1);
  if (body.endsWith("|") && !body.endsWith("\\|")) body = body.slice(0, -1);
  const cells = [];
  let current = "";
  let code = false;
  for (let i = 0; i < body.length; i += 1) {
    const char = body[i];
    if (char === "`") {
      code = !code;
      current += char;
    } else if (char === "\\" && body[i + 1] === "|") {
      current += "\\|";
      i += 1;
    } else if (char === "|" && !code) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

export function isSeparatorRow(line) {
  if (!isTableRow(line)) return false;
  const cells = splitCells(line);
  return cells.length > 0 && cells.every((cell) => SEPARATOR_CELL_RE.test(cell));
}

/** `[start, end)` of the contiguous table rows around `index`. */
export function tableBounds(lines, index) {
  let start = index;
  while (start > 0 && isTableRow(lines[start - 1])) start -= 1;
  let end = index + 1;
  while (end < lines.length && isTableRow(lines[end])) end += 1;
  return [start, end];
}

/** The id at the start of a row's first cell or bullet, with emphasis removed, or null. */
export function leadingId(text) {
  const match = new RegExp(`^\\*{0,2}\\[?(${GAP_ID_SOURCE})(?![A-Za-z0-9-])`).exec(text.trim());
  return match ? match[1] : null;
}

/**
 * Repository-relative known-gaps ledger paths a cell names, in order.
 *
 * Reads backtick spans and Markdown link targets. A link target is resolved
 * against the directory of `fileRel`; a backtick path is taken as written from
 * the repository root, which is how the carry-forward tables write them.
 */
export function ledgerPathsIn(cell, fileRel) {
  const found = [];
  const add = (path) => {
    const clean = path.split("#")[0].trim();
    if (clean.endsWith("known-gaps.md") && !found.includes(clean)) found.push(clean);
  };
  for (const match of cell.matchAll(/\]\(([^)\s]+)\)/g)) {
    add(posix.normalize(posix.join(posix.dirname(fileRel), match[1])));
  }
  for (const match of cell.matchAll(/`([^`]+)`/g)) add(posix.normalize(match[1]));
  return found;
}

/** "v2.4" from a minor token such as "v2.4", or the [major, minor] pair it names. */
export function minorPair(token) {
  const match = /^v(\d+)\.(\d+)/.exec(token);
  return match ? [Number(match[1]), Number(match[2])] : null;
}

export function compareMinor(a, b) {
  const [pa, pb] = [minorPair(a), minorPair(b)];
  return pa[0] - pb[0] || pa[1] - pb[1];
}
