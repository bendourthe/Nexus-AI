/**
 * v2.11.0 Phase 2 (T005) -- measure what the parsers give an outline builder.
 *
 * For each fixture under tests/fixtures/documents/outline/docs (as listed by
 * the expected/ files): markdown and text are read directly (the OCR runtime
 * has no such kind); PDF, scan, and DOCX go to the OCR runtime bundle directly,
 * not through headlessOcrParser.ts, because that seam drops the per-page
 * `pages` array and applies the 50-page parse_document cap.
 *
 * Reports heading recall and precision, whether page boundaries are
 * recoverable, pages parsed versus page count, seconds per page, per-engine
 * determinism (each OCR fixture parsed twice here, never in production), and a
 * script-only navigation check. Results replace the block between the
 * measurement markers in docs/v2/v2.11/development/outline-feasibility.md.
 *
 * Run: npx vite-node scripts/measure-document-outline.ts
 * Offline: the only child process is the local OCR runtime; no network.
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createOcrRuntimeBundle } from "../core/documents/ocrRuntimeFactory.js";
import type { OcrParseManager, OcrParseResult } from "../core/documents/OcrParseManager.js";
import type { ExpectedFile, ExpectedHeading } from "./generate-outline-fixtures.js";
import { makeLongPdf } from "./generate-outline-fixtures.js";

// ---------------------------------------------------------------- pure functions

export interface DetectedHeading {
  readonly title: string;
  readonly level: number;
  /** 1-based page, when page texts are known. */
  readonly page: number | null;
  /** Character offset of the heading line in the indexed text. */
  readonly offset: number;
}

export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9. ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const MD_HEADING = /^(#{1,6})\s+(.+?)\s*#*\s*$/;
const NUMBERED_HEADING = /^(\d+(?:\.\d+){0,3})\.?\s+([A-Z][A-Za-z][A-Za-z ]{1,60})$/;

/** Headings from markdown, ignoring fenced and indented code blocks. */
export function detectMarkdownHeadings(markdown: string): DetectedHeading[] {
  const out: DetectedHeading[] = [];
  let inFence = false;
  let offset = 0;
  for (const raw of markdown.split("\n")) {
    const line = raw.replace(/\r$/, "");
    if (/^\s{0,3}(```|~~~)/.test(line)) inFence = !inFence;
    else if (!inFence && !/^( {4}|\t)/.test(line)) {
      const m = MD_HEADING.exec(line);
      if (m) out.push({ title: (m[2] ?? "").trim(), level: (m[1] ?? "#").length, page: null, offset });
    }
    offset += raw.length + 1;
  }
  return out;
}

/** Headings from plain or OCR text: short numbered lines ("3.2 Network Settings"). */
export function detectNumberedHeadings(pages: readonly string[]): DetectedHeading[] {
  const out: DetectedHeading[] = [];
  let offset = 0;
  pages.forEach((pageText, index) => {
    for (const raw of pageText.split("\n")) {
      const line = raw.replace(/\r$/, "").trim();
      const m = NUMBERED_HEADING.exec(line);
      if (m && !/\.{3,}/.test(line)) {
        const number = m[1] ?? "1";
        out.push({ title: `${number} ${(m[2] ?? "").trim()}`, level: number.split(".").length, page: index + 1, offset });
      }
      offset += raw.length + 1;
    }
    offset += 2;
  });
  return out;
}

export interface MatchResult {
  readonly recall: number;
  readonly precision: number;
  readonly matched: number;
  /** Matched headings whose detected page equals the expected start page. */
  readonly pageAgreement: number | null;
}

/** Order-preserving multiset match of expected against detected titles. */
export function matchHeadings(expected: readonly ExpectedHeading[], detected: readonly DetectedHeading[]): MatchResult {
  const pool = detected.map((d) => ({ d, used: false }));
  let matched = 0;
  let pageHits = 0;
  let pageComparable = 0;
  for (const e of expected) {
    const key = normalizeTitle(e.title);
    const hit = pool.find((p) => !p.used && normalizeTitle(p.d.title) === key);
    if (hit) {
      hit.used = true;
      matched += 1;
      if (hit.d.page !== null) {
        pageComparable += 1;
        if (hit.d.page === e.startPage) pageHits += 1;
      }
    }
  }
  return {
    recall: expected.length === 0 ? 1 : matched / expected.length,
    precision: detected.length === 0 ? (expected.length === 0 ? 1 : 0) : matched / detected.length,
    matched,
    pageAgreement: pageComparable === 0 ? null : pageHits / pageComparable,
  };
}

/** Slice from a heading to the next detected heading (crude, script-only). */
export function sliceSection(text: string, detected: readonly DetectedHeading[], index: number): string {
  const start = detected[index]?.offset ?? 0;
  const end = detected[index + 1]?.offset ?? text.length;
  return text.slice(start, end);
}

export function navigationCheck(
  text: string,
  expected: readonly ExpectedHeading[],
  detected: readonly DetectedHeading[],
): { tried: number; correct: number } {
  const candidates = expected.filter((e) => e.firstWords.length > 0);
  const picks = [candidates[0], candidates[Math.floor(candidates.length / 2)], candidates[candidates.length - 1]].filter(
    (e): e is ExpectedHeading => e !== undefined,
  );
  let correct = 0;
  for (const e of picks) {
    const index = detected.findIndex((d) => normalizeTitle(d.title) === normalizeTitle(e.title));
    if (index >= 0 && normalizeTitle(sliceSection(text, detected, index)).includes(normalizeTitle(e.firstWords))) correct += 1;
  }
  return { tried: picks.length, correct };
}

export function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

// ---------------------------------------------------------------- runner

interface Row {
  readonly file: string;
  readonly kind: string;
  readonly path: string;
  readonly engine: string;
  readonly markdown: string;
  readonly pages: string;
  readonly seconds: string;
  readonly recall: string;
  readonly precision: string;
  readonly pageAgreement: string;
  readonly deterministic: string;
  readonly navigation: string;
}

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..");
const FIXTURES = join(REPO, "tests/fixtures/documents/outline");
const REPORT = join(REPO, "docs/v2/v2.11/development/outline-feasibility.md");
const START = "<!-- measurements:start -->";
const END = "<!-- measurements:end -->";

function ocrPython(): string {
  const fromEnv = process.env["NEXUS_OCR_PYTHON"];
  if (fromEnv) return fromEnv;
  const runtimeJson = join(homedir(), ".nexus", "runtime.json");
  if (existsSync(runtimeJson)) {
    const parsed = JSON.parse(readFileSync(runtimeJson, "utf8")) as { diffusionPython?: string };
    if (parsed.diffusionPython) return parsed.diffusionPython;
  }
  return "python";
}

function prerequisitesOk(python: string): { ok: boolean; detail: string } {
  try {
    execFileSync(python, ["-c", "import rapidocr_onnxruntime, pypdfium2, docx"], { stdio: "pipe" });
    return { ok: true, detail: `${python}: rapidocr_onnxruntime, pypdfium2, python-docx importable` };
  } catch (err) {
    return { ok: false, detail: `${python}: ${(err as Error).message.split("\n")[0] ?? "import failed"}` };
  }
}

async function parseOnce(manager: OcrParseManager, bytes: Buffer): Promise<{ result: OcrParseResult; seconds: number }> {
  const started = Date.now();
  const jobId = manager.start({ documentBase64: bytes.toString("base64"), maxPages: 200 });
  for (;;) {
    const drained = manager.drain(jobId);
    const err = drained.events.find((e) => e.kind === "error");
    if (err) throw new Error(err.message ?? "parse failed");
    if (drained.done && drained.result) return { result: drained.result, seconds: (Date.now() - started) / 1000 };
    if (drained.done) throw new Error("parse produced no result");
    await new Promise<void>((r) => setTimeout(r, 100));
  }
}

function pct(n: number | null): string {
  return n === null ? "n/a" : `${Math.round(n * 100)}%`;
}

async function measure(): Promise<{ rows: Row[]; prereq: string; capRow: string }> {
  const python = ocrPython();
  const prereq = prerequisitesOk(python);
  const env = { ...process.env, NEXUS_OCR_PYTHON: python, NEXUS_OCR_CWD: REPO };
  const bundle = prereq.ok ? createOcrRuntimeBundle(env) : null;
  const rows: Row[] = [];
  const expectedFiles = readdirSync(join(FIXTURES, "expected"))
    .filter((f) => f.endsWith(".json"))
    .sort();
  try {
    for (const name of expectedFiles) {
      const expected = JSON.parse(readFileSync(join(FIXTURES, "expected", name), "utf8")) as ExpectedFile;
      const bytes = readFileSync(join(FIXTURES, "docs", expected.file));
      if (expected.kind === "binary") {
        const rejected = bytes.includes(0);
        rows.push({ file: expected.file, kind: "binary", path: "direct", engine: "-", markdown: "-", pages: "-", seconds: "-", recall: "-", precision: "-", pageAgreement: "-", deterministic: "-", navigation: rejected ? "rejected (NUL byte)" : "NOT rejected" });
        continue;
      }
      if (expected.kind === "markdown" || expected.kind === "text") {
        const text = bytes.toString("utf8").replace(/^/, "").replace(/\r\n/g, "\n");
        const detected = expected.kind === "markdown" ? detectMarkdownHeadings(text) : detectNumberedHeadings([text]);
        const m = matchHeadings(expected.headings, detected);
        const nav = navigationCheck(text, expected.headings, detected);
        rows.push({ file: expected.file, kind: expected.kind, path: "direct", engine: "direct", markdown: expected.kind === "markdown" ? "yes" : "no", pages: "1/1", seconds: "0", recall: pct(m.recall), precision: pct(m.precision), pageAgreement: "n/a", deterministic: "yes (bytes)", navigation: `${nav.correct}/${nav.tried}` });
        continue;
      }
      if (!bundle) {
        rows.push({ file: expected.file, kind: expected.kind, path: "ocr", engine: "-", markdown: "-", pages: "-", seconds: "-", recall: "-", precision: "-", pageAgreement: "-", deterministic: "-", navigation: "inconclusive (runtime unavailable)" });
        continue;
      }
      const first = await parseOnce(bundle.parser, bytes);
      const second = await parseOnce(bundle.parser, bytes);
      const pageTexts = first.result.pages.map((p) => p.text);
      const indexed = first.result.markdown ?? pageTexts.join("\n\n");
      const detected = first.result.markdown !== null ? detectMarkdownHeadings(first.result.markdown) : detectNumberedHeadings(pageTexts);
      const m = matchHeadings(expected.headings, detected);
      const nav = navigationCheck(indexed, expected.headings, detected);
      const same =
        first.result.pages.length === second.result.pages.length &&
        first.result.pages.every((p, i) => sha256(p.text) === sha256(second.result.pages[i]?.text ?? ""));
      const perPage = first.result.pages.length === 0 ? 0 : first.seconds / first.result.pages.length;
      rows.push({
        file: expected.file,
        kind: expected.kind,
        path: "ocr",
        engine: first.result.engine,
        markdown: first.result.markdown === null ? "null" : "yes",
        pages: `${first.result.pages.length}/${first.result.pageCount}`,
        seconds: `${first.seconds.toFixed(1)} (${perPage.toFixed(2)}/page)`,
        recall: pct(m.recall),
        precision: pct(m.precision),
        pageAgreement: pct(m.pageAgreement),
        deterministic: same ? "yes" : "no",
        navigation: `${nav.correct}/${nav.tried}`,
      });
    }
    let capRow = "not run (runtime unavailable)";
    if (bundle) {
      const long = await parseOnce(bundle.parser, makeLongPdf(210));
      capRow = `210-page generated PDF: pages returned ${long.result.pages.length}, pageCount ${long.result.pageCount}, ${long.seconds.toFixed(1)} s`;
    }
    return { rows, prereq: prereq.detail, capRow };
  } finally {
    await bundle?.client.shutdown();
  }
}

export function renderReport(rows: readonly Row[], prereq: string, capRow: string, when: string): string {
  const header =
    "| File | Kind | Path | Engine | Markdown | Pages (returned/count) | Seconds | Heading recall | Precision | Page agreement | Deterministic | Navigation |\n" +
    "|---|---|---|---|---|---|---|---|---|---|---|---|";
  const body = rows
    .map((r) => `| ${r.file} | ${r.kind} | ${r.path} | ${r.engine} | ${r.markdown} | ${r.pages} | ${r.seconds} | ${r.recall} | ${r.precision} | ${r.pageAgreement} | ${r.deterministic} | ${r.navigation} |`)
    .join("\n");
  return `${START}\n\nGenerated ${when} by \`npx vite-node scripts/measure-document-outline.ts\`.\n\nPrerequisites: ${prereq}.\n\n${header}\n${body}\n\nRuntime cap: ${capRow}.\n\n${END}`;
}

function writeReport(block: string): void {
  const existing = existsSync(REPORT) ? readFileSync(REPORT, "utf8") : `# Outline feasibility (v2.11.0 Phase 2)\n\n${START}\n${END}\n`;
  const startAt = existing.indexOf(START);
  const endAt = existing.indexOf(END);
  const next =
    startAt >= 0 && endAt > startAt
      ? `${existing.slice(0, startAt)}${block}${existing.slice(endAt + END.length)}`
      : `${existing.trimEnd()}\n\n${block}\n`;
  writeFileSync(REPORT, next);
}

if (!process.env["VITEST"]) {
  measure()
    .then(({ rows, prereq, capRow }) => {
      writeReport(renderReport(rows, prereq, capRow, new Date().toISOString()));
      process.stdout.write(`measured ${rows.length} fixtures; ${capRow}\n`);
    })
    .catch((err: unknown) => {
      process.stderr.write(`measurement failed: ${err instanceof Error ? err.message : String(err)}\n`);
      process.exitCode = 1;
    });
}
