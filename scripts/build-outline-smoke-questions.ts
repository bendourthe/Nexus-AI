/**
 * v2.11.0 Phase 5.1 (T018) -- build the 24-question smoke set and its keys.
 *
 * Questions are derived deterministically from the fixtures' expected files,
 * not from the outline builder's output, so the set cannot be tuned to the
 * tool under test. Questions and keys are written to separate files; the
 * harness copies only the documents into the agent's temporary workspace, so
 * the agent under test can never read the keys.
 *
 * Categories: 12 factual lookup, 8 cross-section (the answer is in the section
 * after the one named), 4 table. At least 8 answers lie past page 50 of the
 * 65-page manual, beyond parse_document's 50-page cap.
 *
 * Run: npx vite-node scripts/build-outline-smoke-questions.ts
 */

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { ExpectedFile, ExpectedHeading } from "./generate-outline-fixtures.js";
import type { MatchMode } from "./outline-smoke-scoring.js";

export type QuestionCategory = "factual" | "cross-section" | "table";

export interface SmokeQuestion {
  readonly id: string;
  readonly file: string;
  readonly category: QuestionCategory;
  readonly question: string;
}

export interface SmokeKey {
  readonly id: string;
  readonly answer: string;
  readonly section: string;
  readonly startPage: number;
  readonly pastPage50: boolean;
  readonly distractors: readonly string[];
  /** `prefix` for opening-words answers (OCR text has no fixed word boundaries). */
  readonly match: MatchMode;
}

const OPENING = "Quote the first few words of its body text exactly as the document shows them.";

const PARSE_DOCUMENT_CAP = 50;

function firstThree(h: ExpectedHeading): string {
  return h.firstWords.split(/\s+/).slice(0, 3).join(" ").toLowerCase();
}

function load(root: string, file: string): ExpectedFile {
  return JSON.parse(readFileSync(join(root, "expected", `${file}.json`), "utf8")) as ExpectedFile;
}

export function buildQuestionSet(fixtureRoot: string): { questions: SmokeQuestion[]; keys: SmokeKey[] } {
  const manual = load(fixtureRoot, "manual-60p.pdf");
  const questions: SmokeQuestion[] = [];
  const keys: SmokeKey[] = [];
  const push = (file: string, category: QuestionCategory, question: string, target: ExpectedHeading, answer: string, distractor: string): void => {
    const id = `q${String(questions.length + 1).padStart(2, "0")}`;
    questions.push({ id, file, category, question });
    keys.push({
      id,
      answer,
      section: target.title,
      startPage: target.startPage,
      pastPage50: file === "manual-60p.pdf" && target.startPage > PARSE_DOCUMENT_CAP,
      distractors: [distractor],
      match: category === "table" ? "exact" : "prefix",
    });
  };
  const withBody = manual.headings.filter((h) => h.firstWords.length > 0);
  const late = withBody.filter((h) => h.startPage > PARSE_DOCUMENT_CAP);
  const early = withBody.filter((h) => h.startPage <= PARSE_DOCUMENT_CAP);

  // Factual: 8 manual sections (late ones first; the manual has fewer than 8
  // past page 50, so early ones fill the rest), then 4 from the other formats.
  for (const h of [...late, ...early.slice(1)].slice(0, 8)) {
    push("manual-60p.pdf", "factual", `In manual-60p.pdf, find section "${h.title}". ${OPENING}`, h, firstThree(h), firstThree(early[0] ?? h));
  }
  for (const file of ["quick-guide.pdf", "policy.docx", "handbook.md", "notes.txt"]) {
    const doc = load(fixtureRoot, file).headings.filter((h) => h.firstWords.length > 0);
    const h = doc[Math.min(1, doc.length - 1)];
    if (!h) continue;
    push(file, "factual", `In ${file}, find section "${h.title}". ${OPENING}`, h, firstThree(h), firstThree(doc[0] ?? h));
  }

  // Cross-section: name a section, ask about the one after it.
  const pairs: [ExpectedHeading, ExpectedHeading][] = [];
  for (let i = 0; i + 1 < withBody.length; i += 1) {
    const a = withBody[i];
    const b = withBody[i + 1];
    if (a && b) pairs.push([a, b]);
  }
  const crossPicks = [...pairs.filter(([, b]) => b.startPage > PARSE_DOCUMENT_CAP).slice(0, 4), ...pairs.filter(([, b]) => b.startPage <= PARSE_DOCUMENT_CAP).slice(2, 6)];
  for (const [a, b] of crossPicks.slice(0, 8)) {
    push("manual-60p.pdf", "cross-section", `In manual-60p.pdf, find the section that comes immediately after section "${a.title}". ${OPENING}`, b, firstThree(b), firstThree(a));
  }

  // Table: sections whose body carries the port table (every fourth section from index 2).
  const tableSections = manual.headings.filter((_, i) => i % 4 === 2);
  const tablePicks = [...tableSections.filter((h) => h.startPage > PARSE_DOCUMENT_CAP).slice(0, 2), ...tableSections.filter((h) => h.startPage <= PARSE_DOCUMENT_CAP).slice(0, 2)];
  const tableQuestions: [string, string, string][] = [
    ["Which protocol does port 8443 use", "https", "http"],
    ["What is the default for port 8080", "enabled", "disabled"],
  ];
  tablePicks.slice(0, 4).forEach((h, i) => {
    const [q, answer, distractor] = tableQuestions[i % 2] ?? ["", "", ""];
    push("manual-60p.pdf", "table", `In manual-60p.pdf, section "${h.title}" contains a port table. ${q}?`, h, answer, distractor);
  });

  validate(questions, keys);
  return { questions, keys };
}

export function validate(questions: readonly SmokeQuestion[], keys: readonly SmokeKey[]): void {
  const count = (c: QuestionCategory): number => questions.filter((q) => q.category === c).length;
  if (count("factual") !== 12 || count("cross-section") !== 8 || count("table") !== 4) {
    throw new Error(`category counts wrong: ${count("factual")}/${count("cross-section")}/${count("table")}`);
  }
  if (new Set(questions.map((q) => q.id)).size !== questions.length) throw new Error("duplicate question id");
  if (keys.some((k) => k.answer.trim().length === 0)) throw new Error("empty answer");
  if (keys.filter((k) => k.pastPage50).length < 8) throw new Error("fewer than 8 answers past page 50");
  if (!keys.some((k) => k.pastPage50)) throw new Error("every answer fits inside parse_document's cap");
}

export function hashOf(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

if (!process.env["VITEST"]) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "../tests/fixtures/documents/outline");
  const { questions, keys } = buildQuestionSet(root);
  mkdirSync(join(root, "eval"), { recursive: true });
  writeFileSync(join(root, "eval", "questions.json"), `${JSON.stringify(questions, null, 2)}\n`);
  writeFileSync(join(root, "eval", "keys.json"), `${JSON.stringify(keys, null, 2)}\n`);
  process.stdout.write(`wrote ${questions.length} questions; ${keys.filter((k) => k.pastPage50).length} past page 50\n`);
}
