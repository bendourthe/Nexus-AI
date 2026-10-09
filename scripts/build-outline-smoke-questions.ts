/**
 * Build the preserved 24-question anchor or the 38-question expanded smoke set.
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
 * Expanded: 12 factual, 20 cross-section, 6 table questions with distinct targets.
 * Select with NEXUS_OUTLINE_MANUAL=manual-120p.pdf; the anchor is the default.
 * Run: npx vite-node scripts/build-outline-smoke-questions.ts
 */

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { ExpectedFile, ExpectedHeading } from "./generate-outline-fixtures.js";
import type { MatchMode } from "./outline-smoke-scoring.js";

export type QuestionCategory = "factual" | "cross-section" | "table";
export type SmokeArm = "A" | "B" | "C" | "D";

export function selectSmokeArms(raw?: string): SmokeArm[] {
  const selected = (raw ?? "A,B,C,D").split(",").map(arm => arm.trim());
  if (selected.some(arm => !["A", "B", "C", "D"].includes(arm)) || new Set(selected).size !== selected.length) {
    throw new Error("smoke arms must be distinct values from A,B,C,D");
  }
  return selected as SmokeArm[];
}

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

export function buildQuestionSet(fixtureRoot: string, manualFile = "manual-60p.pdf"): { questions: SmokeQuestion[]; keys: SmokeKey[] } {
  if (!/^[a-z0-9-]+\.pdf$/.test(manualFile)) throw new Error("invalid manual file name");
  const manual = load(fixtureRoot, manualFile);
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
      pastPage50: file === manualFile && target.startPage > PARSE_DOCUMENT_CAP,
      distractors: [distractor],
      match: category === "table" ? "exact" : "prefix",
    });
  };
  const withBody = manual.headings.filter((h) => h.firstWords.length > 0);
  const late = withBody.filter((h) => h.startPage > PARSE_DOCUMENT_CAP);
  const early = withBody.filter((h) => h.startPage <= PARSE_DOCUMENT_CAP);

  if (manualFile !== "manual-60p.pdf") {
    const used = new Set<string>();
    for (const [i, target] of withBody.entries()) {
      const preceding = withBody[i - 1];
      if (!preceding || target.startPage <= PARSE_DOCUMENT_CAP) continue;
      push(manualFile, "cross-section", `In ${manualFile}, find the section that comes immediately after section "${preceding.title}". ${OPENING}`, target, firstThree(target), firstThree(preceding));
      used.add(target.title);
      if (used.size === 20) break;
    }
    const tablePicks = [...late, ...early].filter(h => h.table && !used.has(h.title)).slice(0, 6);
    for (const target of tablePicks) {
      if (!target.table) continue;
      const other = withBody.find(h => h.table && h.title !== target.title);
      push(manualFile, "table", `In ${manualFile}, section "${target.title}" contains a port table. Which port is listed?`, target, String(target.table.port), String(other?.table?.port ?? "none"));
      used.add(target.title);
    }
    for (const target of [...late, ...early].filter(h => !used.has(h.title)).slice(0, 12)) {
      const other = withBody.find(h => h.title !== target.title);
      push(manualFile, "factual", `In ${manualFile}, find section "${target.title}". ${OPENING}`, target, firstThree(target), firstThree(other ?? target));
      used.add(target.title);
    }
    validate(questions, keys, manual);
    return { questions, keys };
  }

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

export function validate(questions: readonly SmokeQuestion[], keys: readonly SmokeKey[], expandedManual?: ExpectedFile): void {
  const count = (c: QuestionCategory): number => questions.filter((q) => q.category === c).length;
  if (count("factual") !== 12 || count("cross-section") !== (expandedManual ? 20 : 8) || count("table") !== (expandedManual ? 6 : 4)) {
    throw new Error(`category counts wrong: ${count("factual")}/${count("cross-section")}/${count("table")}`);
  }
  if (new Set(questions.map((q) => q.id)).size !== questions.length) throw new Error("duplicate question id");
  if (keys.some((k) => k.answer.trim().length === 0)) throw new Error("empty answer");
  const minimumLate = expandedManual ? 16 : 8;
  if (keys.filter((k) => k.pastPage50).length < minimumLate) throw new Error(`fewer than ${minimumLate} answers past page 50`);
  if (!keys.some((k) => k.pastPage50)) throw new Error("every answer fits inside parse_document's cap");
  if (expandedManual) {
    if (new Set(keys.map(k => k.section)).size !== keys.length) throw new Error("expanded categories reuse a target section");
    const normalized = (text: string): string => text.toLowerCase().replace(/\s+/g, "");
    for (const key of keys) {
      for (const heading of expandedManual.headings) {
        if (heading.title === key.section) continue;
        const values = [heading.firstWords, ...(heading.table ? Object.values(heading.table).map(String) : [])];
        if (values.some(value => normalized(value).includes(normalized(key.answer)))) {
          throw new Error(`ambiguous answer ${key.id} also appears in ${heading.title}`);
        }
      }
    }
  }
}

export function hashOf(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

if (!process.env["VITEST"]) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "../tests/fixtures/documents/outline");
  const manualFile = process.env["NEXUS_OUTLINE_MANUAL"] ?? "manual-60p.pdf";
  const { questions, keys } = buildQuestionSet(root, manualFile);
  const suffix = manualFile === "manual-60p.pdf" ? "" : `-${manualFile.replace(/\.pdf$/, "")}`;
  mkdirSync(join(root, "eval"), { recursive: true });
  writeFileSync(join(root, "eval", `questions${suffix}.json`), `${JSON.stringify(questions, null, 2)}\n`);
  writeFileSync(join(root, "eval", `keys${suffix}.json`), `${JSON.stringify(keys, null, 2)}\n`);
  process.stdout.write(`wrote ${questions.length} questions; ${keys.filter((k) => k.pastPage50).length} past page 50\n`);
}
