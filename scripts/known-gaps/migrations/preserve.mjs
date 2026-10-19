/**
 * Preservation oracle for the one-time ledger conversion (v2.15.0).
 *
 * Written independently of normalize.mjs: it never sees the converter's
 * decisions, only the source text and the output text. Both sides go through
 * the same normalization, which removes only the structure the conversion may
 * add or move (decision 3 in v2.15.0-ledger-conversion-decisions.md): heading
 * and list markers, emphasis, table pipes, header and separator rows, field
 * labels, the ` - ` after an id, a `vX.Y#` id prefix, `**Open items**:` lines,
 * `### Resolved` headings, and the superseded marker with its pointer line.
 * Everything left must match word for word and in order, and every link
 * target in the source must survive.
 *
 * Removed with the converter after v2.15.0.
 */

import { fenceMask, isSeparatorRow, isTableRow, parseHeading, splitCells, splitLines } from "../ledger-text.mjs";

const ID_TOKEN_RE = /^[A-Z]{2,4}-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/;
const QUALIFIED_RE = /^v\d+\.\d+#([A-Z]{2,4}-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*)$/;
const FIELD_LABEL_RE = /^\*\*[^*]+\*\*\s*:\s*/;
const LIST_MARKER_RE = /^\s{0,3}(?:[-*+]|\d+[.)])\s+/;
const CLOSED_SUFFIX_RE = /\s-{1,2}\s*CLOSED\s+\d{4}-\d{2}-\d{2}\s*$/;

/** The normalized word sequence of a ledger. */
export function contentWords(text) {
  const lines = splitLines(text);
  const mask = fenceMask(lines);
  const words = [];
  lines.forEach((raw, index) => {
    let line = raw;
    if (!mask[index]) {
      if (isSeparatorRow(line)) return;
      if (isTableRow(line) && index + 1 < lines.length && isSeparatorRow(lines[index + 1])) return;
      if (/^\s*\*\*Open items\*\*\s*:/i.test(line)) return;
      if (/^\s*[-*+]\s+\*\*Superseded by\*\*\s*:/.test(line)) return;
      const heading = parseHeading(line);
      if (heading) {
        const title = heading.text.replace(CLOSED_SUFFIX_RE, "");
        if (heading.level === 3 && title.trim() === "Resolved") return;
        line = title;
      } else if (isTableRow(line)) {
        line = splitCells(line).join(" ");
      } else {
        line = line.replace(LIST_MARKER_RE, "");
      }
      line = line.replace(FIELD_LABEL_RE, "").replaceAll("**", "");
    }
    const tokens = line.split(/\s+/).filter(Boolean);
    tokens.forEach((token, position) => {
      const qualified = QUALIFIED_RE.exec(token);
      const word = qualified ? qualified[1] : token;
      if (word === "-" && position > 0 && ID_TOKEN_RE.test(words.at(-1) ?? "")) return;
      words.push(word);
    });
  });
  return words;
}

export function linkTargets(text) {
  return [...text.matchAll(/\]\(([^)\s]+)\)/g)].map((match) => match[1]).sort();
}

/**
 * `{ ok, reason, at, expected, actual, sourceWords }` comparing source and output.
 * On a mismatch, `expected` and `actual` hold the first few differing words.
 */
export function checkPreservation(source, output) {
  const expected = contentWords(source);
  const actual = contentWords(output);
  const limit = Math.max(expected.length, actual.length);
  for (let i = 0; i < limit; i += 1) {
    if (expected[i] !== actual[i]) {
      return {
        ok: false,
        reason: "word-sequence",
        at: i,
        expected: expected.slice(i, i + 8).join(" "),
        actual: actual.slice(i, i + 8).join(" "),
        sourceWords: expected.length,
      };
    }
  }
  const missing = [...linkTargets(source)];
  for (const target of linkTargets(output)) {
    const found = missing.indexOf(target);
    if (found !== -1) missing.splice(found, 1);
  }
  if (missing.length > 0) {
    return { ok: false, reason: "link-lost", at: -1, expected: missing.join(" "), actual: "", sourceWords: expected.length };
  }
  return { ok: true, reason: null, at: -1, expected: "", actual: "", sourceWords: expected.length };
}
