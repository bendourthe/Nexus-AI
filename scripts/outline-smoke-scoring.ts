/**
 * v2.11.0 Phase 5.2 -- scoring for the outline smoke test (pure, unit-tested).
 *
 * The model must end with an `ANSWER: x` line; only that line is scored.
 * Normalisation lowercases and strips punctuation, and comparison ignores
 * whitespace, because the CPU OCR engine merges words ("measurerecordconfig").
 * Numbers must match as whole tokens, so "15" never matches "5". Hedged or
 * negated answers and over-long answers fail. Opening-words questions use the
 * `prefix` mode (see PREFIX_SLACK_CHARS).
 */

export const MAX_ANSWER_CHARS = 120;

export function extractAnswer(reply: string): string | null {
  const lines = reply.split(/\r?\n/).map((l) => l.trim());
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const m = /^\**\s*ANSWER\s*:\s*\**\s*(.*)$/i.exec(lines[i] ?? "");
    if (m) return (m[1] ?? "").trim();
  }
  return null;
}

export function normalizeAnswer(text: string): string {
  return text
    .toLowerCase()
    .replace(/["'`*_]/g, "")
    .replace(/[^a-z0-9. ]+/g, " ")
    .replace(/\.(?!\d)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const HEDGES = /\b(not|maybe|perhaps|possibly|either|or|unsure|unknown|cannot|can t)\b/;

/**
 * Letters past the key a `prefix` answer may carry. OCR keeps some spaces and
 * drops others, so "the first three words" of OCR text has no fixed boundary:
 * the calibration run saw a correct "Systemschedule operator index" scored
 * wrong against "system schedule operator". A prefix answer passes when its
 * letters start with the key's letters and run at most this much further,
 * so a model quoting the whole opening line passes (the full-run start showed
 * 24 letters was too tight: correct openings scored wrong). A quoted paragraph
 * still fails on MAX_ANSWER_CHARS, and a different opening fails the prefix.
 */
export const PREFIX_SLACK_CHARS = 96;

export type MatchMode = "exact" | "prefix";

export function scoreAnswer(reply: string, expected: string, mode: MatchMode = "exact"): boolean {
  const raw = extractAnswer(reply);
  if (raw === null || raw.length === 0 || raw.length > MAX_ANSWER_CHARS) return false;
  const got = normalizeAnswer(raw);
  const want = normalizeAnswer(expected);
  if (HEDGES.test(got) && !HEDGES.test(want)) return false;
  const gotNumbers = got.match(/\d+(?:\.\d+)?/g) ?? [];
  const wantNumbers = want.match(/\d+(?:\.\d+)?/g) ?? [];
  if (mode === "exact" && gotNumbers.join(",") !== wantNumbers.join(",")) return false;
  const gotLetters = got.replace(/\s+/g, "");
  const wantLetters = want.replace(/\s+/g, "");
  if (mode === "prefix") {
    return gotLetters.startsWith(wantLetters) && gotLetters.length <= wantLetters.length + PREFIX_SLACK_CHARS;
  }
  return gotLetters === wantLetters;
}
