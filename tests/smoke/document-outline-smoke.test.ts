/**
 * v2.11.0 Phase 5.2 (T019) -- directional local smoke test of the outline tools.
 *
 * Opt-in only: skipped unless NEXUS_OUTLINE_SMOKE=1, and its directory is not
 * in the default Vitest include globs, so neither `npm test` nor CI runs it.
 *
 *   NEXUS_OUTLINE_SMOKE=1 npx vitest run --config configs/vitest.smoke.config.ts
 *
 * Select the preserved 24-question anchor or the 38-question expanded set,
 * and any distinct subset of A/B/C/D. Two models, one run, temperature 0. Arms:
 *   A  parse_document (its 50-page cap) through the real headless agent loop;
 *   B  chunk retrieval over the FULL extracted text (BM25 from core/memory, no
 *      8,000-character cut), top chunks injected into one model call;
 *   C  document_outline + document_read_section through the agent loop;
 *   D  C with node summaries on.
 * Runs are sequential so the OCR engine and the model never contend.
 * Keys never enter the agent's workspace. Counts are directional only.
 */

import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { appendFileSync, copyFileSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { createHeadlessOcrParser } from "../../core/documents/headlessOcrParser.js";
import { ChildProcessOcrRuntime } from "../../core/documents/OcrRuntimeClient.js";
import { OcrParseManager } from "../../core/documents/OcrParseManager.js";
import { normalizeTextSource } from "../../core/documents/DocumentOutline.js";
import { Bm25Index } from "../../core/memory/Bm25Index.js";
import { createHeadlessOllamaClient } from "../../modules/coding/llm/headlessOllamaClient.js";
import type { LLMClient } from "../../modules/coding/llm/types.js";
import { HeadlessAgentSession } from "../../modules/coding/runtime/HeadlessAgentSession.js";
import { createHeadlessTools, type HeadlessTool } from "../../modules/coding/runtime/headlessTools.js";
import { hashOf, selectSmokeArms, type SmokeArm, type SmokeKey, type SmokeQuestion } from "../../scripts/build-outline-smoke-questions.js";
import { scoreAnswer } from "../../scripts/outline-smoke-scoring.js";
import { memoParser } from "./outline-smoke-parser.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "../..");
const FIXTURES = join(REPO, "tests/fixtures/documents/outline");
const REPORT = process.env["NEXUS_OUTLINE_SMOKE_REPORT"] ?? join(tmpdir(), `outline-smoke-${randomUUID()}.md`);
const RESULT_JSON = `${REPORT}.json`;
const SET = process.env["NEXUS_OUTLINE_SMOKE_SET"] ?? "";
if (SET !== "" && SET !== "manual-120p") throw new Error("unknown outline smoke set");
const SUFFIX = SET ? `-${SET}` : "";
const ARMS = selectSmokeArms(process.env["NEXUS_OUTLINE_SMOKE_ARMS"]);
const OLLAMA = "http://127.0.0.1:11434";
const MODELS = ["qwen3.5:9b", "gemma4:12b"];
const CONTEXT_TOKENS = 16_384;
const QUESTION_TIMEOUT_MS = 4 * 60 * 1000;
const DEADLINE_MS = Number(process.env["NEXUS_OUTLINE_SMOKE_DEADLINE_MS"] ?? "0");
const READ_ONLY_TOOLS = new Set(["read_file", "list_directory", "grep_codebase"]);
const ENABLED = process.env["NEXUS_OUTLINE_SMOKE"] === "1";
const LIMIT = Number(process.env["NEXUS_OUTLINE_SMOKE_LIMIT"] ?? "0");
/** Optional outside-repository JSONL retains every completed outcome and a reply tail. */
const DETAIL_LOG = process.env["NEXUS_OUTLINE_SMOKE_LOG"];

type Arm = SmokeArm;
interface Outcome {
  readonly arm: Arm;
  readonly model: string;
  readonly id: string;
  readonly category: string;
  readonly pastPage50: boolean;
  readonly correct: boolean;
  readonly status: "answered" | "timeout" | "error" | "no-answer";
  readonly toolCalls: number;
  readonly seconds: number;
  readonly nativeToolResultRequests: number;
  readonly compactions: number;
}

function boundedTime(maximumMs: number): number {
  if (!Number.isSafeInteger(DEADLINE_MS) || DEADLINE_MS < 0) throw new Error("invalid smoke deadline");
  const remaining = DEADLINE_MS ? DEADLINE_MS - Date.now() : maximumMs;
  if (remaining <= 0) throw new Error("smoke deadline exhausted");
  return Math.min(maximumMs, remaining);
}

async function bounded<T>(operation: Promise<T>, signal: AbortSignal): Promise<T> {
  signal.throwIfAborted();
  let abort = (): void => {};
  const cancelled = new Promise<never>((_resolve, reject) => {
    abort = () => reject(signal.reason);
    signal.addEventListener("abort", abort, { once: true });
  });
  try {
    return await Promise.race([operation, cancelled]);
  } finally {
    signal.removeEventListener("abort", abort);
  }
}

async function modelSupportsTools(model: string): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA}/api/show`, { method: "POST", body: JSON.stringify({ model }), signal: AbortSignal.timeout(boundedTime(10_000)) });
    const body = (await res.json()) as { capabilities?: string[] };
    return Array.isArray(body.capabilities) && body.capabilities.includes("tools");
  } catch {
    return false;
  }
}

function gpuSample(): string {
  try {
    return execFileSync("nvidia-smi", ["--query-gpu=utilization.gpu,memory.used,memory.total", "--format=csv,noheader"], { encoding: "utf8", timeout: 10_000 }).trim();
  } catch {
    return "nvidia-smi unavailable";
  }
}

function chunks(text: string): string[] {
  const out: string[] = [];
  let current = "";
  for (const para of text.split(/\n\s*\n/)) {
    if (current.length + para.length > 800 && current) {
      out.push(current);
      current = "";
    }
    current = current ? `${current}\n\n${para}` : para;
  }
  if (current) out.push(current);
  return out;
}

async function chat(llm: LLMClient, model: string, prompt: string, signal: AbortSignal): Promise<string> {
  let reply = "";
  for await (const chunk of llm.streamChat(
    { model, stream: true, messages: [{ role: "user", content: prompt }], options: { temperature: 0, num_ctx: CONTEXT_TOKENS } },
    signal,
  )) {
    reply += chunk.message.content;
    if (chunk.done) break;
  }
  return reply;
}

const INSTRUCTION = 'End your reply with exactly one line of the form "ANSWER: <short answer>".';

describe.skipIf(!ENABLED)("document outline directional smoke", () => {
  it("records selected-arm counts on local models", async () => {
    const started = Date.now();
    boundedTime(QUESTION_TIMEOUT_MS);
    if (existsSync(REPORT) || existsSync(RESULT_JSON)) throw new Error("refusing to overwrite a smoke report");
    if (!Number.isInteger(LIMIT) || LIMIT < 0) throw new Error("smoke limit must be a nonnegative integer");
    const questionsAll = JSON.parse(readFileSync(join(FIXTURES, "eval", `questions${SUFFIX}.json`), "utf8")) as SmokeQuestion[];
    const keysAll = JSON.parse(readFileSync(join(FIXTURES, "eval", `keys${SUFFIX}.json`), "utf8")) as SmokeKey[];
    const questions = LIMIT > 0 ? questionsAll.slice(0, LIMIT) : questionsAll;
    const keyOf = new Map(keysAll.map((k) => [k.id, k]));

    let reachable = true;
    try {
      const response = await fetch(`${OLLAMA}/api/tags`, { signal: AbortSignal.timeout(boundedTime(10_000)) });
      if (!response.ok) reachable = false;
    } catch {
      reachable = false;
    }
    if (!reachable) {
      writeFileSync(REPORT, "# Outline smoke test\n\nNot run: Ollama was not reachable on 127.0.0.1:11434.\n", { flag: "wx" });
      throw new Error("Ollama preflight failed");
    }
    const models: string[] = [];
    const skipped: string[] = [];
    for (const m of MODELS) ((await modelSupportsTools(m)) ? models : skipped).push(m);
    if (skipped.length) throw new Error(`required tool-capable models unavailable: ${skipped.join(", ")}`);

    const workspace = mkdtempSync(join(tmpdir(), "outline-smoke-ws-"));
    const cacheDir = mkdtempSync(join(tmpdir(), "outline-smoke-cache-"));

    const env = {
      ...process.env,
      NEXUS_OCR_PYTHON: process.env["NEXUS_OCR_PYTHON"] ?? "C:/Users/bdour/AppData/Local/Nexus/python/venv/Scripts/python.exe",
      NEXUS_OCR_CWD: REPO,
    };
    const clients: ChildProcessOcrRuntime[] = [];
    const createBundle = (): { client: ChildProcessOcrRuntime; parser: OcrParseManager } => {
      const client = new ChildProcessOcrRuntime({ command: env.NEXUS_OCR_PYTHON, cwd: REPO, env, requestTimeoutMs: 30 * 60 * 1000 });
      clients.push(client);
      return { client, parser: new OcrParseManager(client) };
    };
    let bundle = createBundle();
    let parsingSuspended = false;
    const parser = memoParser({
      parse(documentBase64, opts) {
        if (parsingSuspended) return Promise.reject(new Error("OCR suspended during question cancellation"));
        return createHeadlessOcrParser(bundle.parser).parse(documentBase64, opts);
      },
    });
    const baseLlm = createHeadlessOllamaClient({ baseUrl: OLLAMA });
    let nativeToolResultRequests = 0;
    let compactions = 0;
    const llm: LLMClient = {
      ...baseLlm,
      streamChat(request, signal) {
        if (request.messages.some(message => message.role === "tool")) nativeToolResultRequests += 1;
        return baseLlm.streamChat(request, signal);
      },
    };
    const gpuBefore = gpuSample();
    const coldFile = questions.find(q => q.file.endsWith(".pdf"))?.file;
    const coldCacheDir = mkdtempSync(join(tmpdir(), "outline-cold-"));
    try {

    for (const name of new Set(questions.map(q => q.file))) copyFileSync(join(FIXTURES, "docs", name), join(workspace, name));
    expect(readdirSync(workspace).some((f) => f.includes("keys") || f.endsWith(".json"))).toBe(false);

    // M2 observation: the cold first outline of the selected manual.
    const coldTools = createHeadlessTools({ documentOutlineEnabled: true, documentParser: parser, outlineCacheDir: coldCacheDir, outlineContextTokens: () => CONTEXT_TOKENS });
    const coldStart = Date.now();
    process.stdout.write(`[smoke] cold OCR start ${coldFile ?? "no PDF"}\n`);
    if (coldFile) await bounded(Promise.resolve(coldTools.find((t) => t.name === "document_outline")?.execute({ path: coldFile }, { workdir: workspace, workspaceRoots: [workspace] })), AbortSignal.timeout(boundedTime(30 * 60 * 1000)));
    const coldSeconds = (Date.now() - coldStart) / 1000;
    process.stdout.write(`[smoke] cold OCR complete ${coldSeconds.toFixed(1)}s\n`);
    const gpuAfterOcr = gpuSample();
    // Warm every binary document at both page caps (parse_document's 50, the
    // outline path's 200) so each arm's per-question clock measures the model
    // and its tools, not a one-off OCR pass. The cold cost is reported as M2.
    for (const name of readdirSync(workspace).filter((f) => !/\.(md|txt)$/.test(f))) {
      const b64 = readFileSync(join(workspace, name)).toString("base64");
      for (const maxPages of [50, 200]) {
        process.stdout.write(`[smoke] warm OCR ${name} cap=${maxPages}\n`);
        await bounded(parser.parse(b64, { maxPages }), AbortSignal.timeout(boundedTime(30 * 60 * 1000)));
      }
    }

    const outcomes: Outcome[] = [];
    let gpuDuringModel = "";
    const toolsFor = (arm: Arm, model: string): HeadlessTool[] =>
      createHeadlessTools({
        guards: { confirm: async () => true },
        documentParser: parser,
        parseDocumentEnabled: arm === "A",
        documentOutlineEnabled: arm === "C" || arm === "D",
        outlineCacheDir: cacheDir,
        outlineContextTokens: () => CONTEXT_TOKENS,
        outlineSummaries: arm === "D" ? { client: llm, model: () => model, endpoint: OLLAMA } : null,
      }).filter((t) => READ_ONLY_TOOLS.has(t.name) || t.name === "parse_document" || t.name.startsWith("document_"));

    for (const model of models) {
      for (const arm of ARMS) {
        const session = arm === "B" ? null : new HeadlessAgentSession(llm, toolsFor(arm, model));
        for (const q of questions) {
          const key = keyOf.get(q.id);
          if (!key) continue;
          const t0 = Date.now();
          const nativeBefore = nativeToolResultRequests;
          const compactionsBefore = compactions;
          const signal = AbortSignal.timeout(boundedTime(QUESTION_TIMEOUT_MS));
          let reply = "";
          let toolCalls = 0;
          let finishReason = "answered";
          let status: Outcome["status"] = "answered";
          let cancellationFailed = false;
          const operation = (async () => {
            if (arm === "B") {
              const bytes = readFileSync(join(workspace, q.file));
              const text = /\.(md|txt)$/.test(q.file)
                ? normalizeTextSource(bytes)
                : await parser.parse(bytes.toString("base64"), { maxPages: 200 }).then((r) => r.markdown ?? r.text);
              const index = new Bm25Index();
              const parts = chunks(text);
              parts.forEach((c, i) => index.add(String(i), c));
              const top = [...index.search(q.question, 6).keys()].map((id) => parts[Number(id)] ?? "");
              reply = await chat(llm, model, `Excerpts from ${q.file}:\n\n${top.join("\n---\n")}\n\nQuestion: ${q.question}\n${INSTRUCTION}`, signal);
            } else {
              const result = await session?.run({
                task: `Read the document ${q.file} in the working directory with the available tools and answer: ${q.question}\n${INSTRUCTION}`,
                workdir: workspace,
                workspaceRoots: [workspace],
                model,
                maxIterations: 10,
                signal,
                llmOptions: { temperature: 0, num_ctx: CONTEXT_TOKENS },
                onEvent: (event) => { if (event.kind === "compaction") compactions += 1; },
              });
              reply = result?.finalText ?? "";
              toolCalls = result?.toolCalls ?? 0;
              finishReason = result?.finishReason ?? "none";
              if (result?.error) status = "error";
              if (result?.finishReason === "max-iterations") status = "error";
              if (result?.finishReason === "aborted") status = "timeout";
            }
          })();
          try {
            await bounded(operation, signal);
          } catch (err) {
            if (signal.aborted) {
              // Tool parsers do not consume the question signal. Kill outstanding
              // OCR and settle the old session before starting another question.
              parsingSuspended = true;
              await bundle.client.shutdown();
              try {
                await bounded(operation.then(() => undefined, () => undefined), AbortSignal.timeout(5_000));
              } catch {
                cancellationFailed = true;
              }
              if (!cancellationFailed) {
                // A delayed exit event belongs only to the retired client;
                // it must never clear a replacement child's pending work.
                bundle = createBundle();
                parsingSuspended = false;
              }
            }
            status = signal.aborted ? "timeout" : "error";
            reply = err instanceof Error ? err.message : String(err);
          }
          if (!gpuDuringModel) gpuDuringModel = gpuSample();
          const correct = status === "answered" && scoreAnswer(reply, key.answer, key.match);
          if (status === "answered" && !/ANSWER\s*:/i.test(reply)) status = "no-answer";
          outcomes.push({ arm, model, id: q.id, category: q.category, pastPage50: key.pastPage50, correct, status, toolCalls, seconds: (Date.now() - t0) / 1000, nativeToolResultRequests: nativeToolResultRequests - nativeBefore, compactions: compactions - compactionsBefore });
          process.stdout.write(`[smoke] ${model} arm ${arm} ${q.id} ${correct ? "correct" : status === "answered" ? "wrong" : status} finish=${finishReason} tools=${toolCalls}\n`);
          // Diagnostics stay outside the repository: keys and replies never enter docs.
          if (DETAIL_LOG) appendFileSync(DETAIL_LOG, `${JSON.stringify({ ...outcomes[outcomes.length - 1], finishReason, tail: reply.slice(-400) })}\n`);
          if (cancellationFailed) throw new Error("question cancellation did not settle; stopping smoke run");
        }
      }
    }
    const results = { outcomes, models, skipped, coldSeconds, coldFile, gpuBefore, gpuAfterOcr, gpuDuringModel, questions, keysAll, minutes: (Date.now() - started) / 60000 };
    writeFileSync(RESULT_JSON, JSON.stringify({ ...results, questions: undefined, keysAll: undefined, questionHash: hashOf(questions), fullQuestionHash: hashOf(questionsAll), keyHash: hashOf(keysAll), set: SET || "v2.11", arms: ARMS, contextTokens: CONTEXT_TOKENS, deadlineMs: DEADLINE_MS }, null, 2), { flag: "wx" });
    writeFileSync(REPORT, render(results), { flag: "wx" });
    process.stdout.write(`[smoke] report=${REPORT} results=${RESULT_JSON}\n`);
    expect(outcomes.length).toBe(models.length * ARMS.length * questions.length);
    } finally {
      parsingSuspended = true;
      for (const client of clients) await client.shutdown();
      rmSync(workspace, { recursive: true, force: true });
      rmSync(cacheDir, { recursive: true, force: true });
      rmSync(coldCacheDir, { recursive: true, force: true });
    }
  });
});

function render(r: {
  outcomes: Outcome[];
  models: string[];
  skipped: string[];
  coldSeconds: number;
  coldFile?: string;
  gpuBefore: string;
  gpuAfterOcr: string;
  gpuDuringModel: string;
  questions: SmokeQuestion[];
  keysAll: SmokeKey[];
  minutes: number;
}): string {
  const rows: string[] = [];
  for (const model of r.models) {
    for (const arm of ARMS) {
      const sel = r.outcomes.filter((o) => o.model === model && o.arm === arm);
      const count = (f: (o: Outcome) => boolean): string => `${sel.filter((o) => f(o) && o.correct).length}/${sel.filter(f).length}`;
      rows.push(
        `| ${model} | ${arm} | ${count(() => true)} | ${count((o) => o.category === "factual")} | ${count((o) => o.category === "cross-section")} | ${count((o) => o.category === "table")} | ${count((o) => !o.pastPage50)} | ${count((o) => o.pastPage50)} | ${sel.filter((o) => o.status === "timeout").length} | ${sel.filter((o) => o.status === "error" || o.status === "no-answer").length} | ${sel.reduce((n, o) => n + o.toolCalls, 0)} | ${Math.round(sel.reduce((n, o) => n + o.seconds, 0))} |`,
      );
    }
  }
  return [
    "# Outline smoke test (v2.12.0 Phase 6)",
    "",
    `Generated ${new Date().toISOString()} by \`NEXUS_OUTLINE_SMOKE=1 npx vitest run --config configs/vitest.smoke.config.ts\` in ${r.minutes.toFixed(1)} minutes.`,
    "",
    `Directional counts only: ${r.questions.length} questions per arm and model, one run, temperature 0. They cannot resolve small differences. Set: ${SET || "v2.11 anchor"}. Selected arms: ${ARMS.join(", ")}.`,
    "",
    `Models: ${r.models.join(", ")}${r.skipped.length ? `; skipped (no tool calling): ${r.skipped.join(", ")}` : ""}. Context ${CONTEXT_TOKENS} tokens. Per-question time cap ${QUESTION_TIMEOUT_MS / 60000} minutes.`,
    `Question hash ${hashOf(r.questions).slice(0, 16)}, key hash ${hashOf(r.keysAll).slice(0, 16)}.`,
    "",
    "Arms: A parse_document (50-page cap); B BM25 chunk retrieval over the full extracted text, one model call; C document_outline + document_read_section; D C with node summaries.",
    "",
    "Cells are correct/asked. Timeouts and errors count as wrong.",
    "",
    SET ? "The expanded manual has unique per-section table values; table questions require the named section's port." : "The four anchor table questions do not discriminate between arms: the original fixture repeats its port table. Compare arms on the factual and cross-section columns.",
    "",
    "| Model | Arm | All | Factual | Cross-section | Table | Within 50 pages | Past page 50 | Timeouts | Errors or no answer | Tool calls | Seconds |",
    "|---|---|---|---|---|---|---|---|---|---|---|---|",
    ...rows,
    "",
    "## M2 observation",
    "",
    `- Cold first \`document_outline\` of ${r.coldFile ?? "no PDF selected"} (CPU OCR, empty cache): ${r.coldSeconds.toFixed(1)} s.`,
    `- GPU before the run: ${r.gpuBefore}. After the cold OCR: ${r.gpuAfterOcr}. During a model call: ${r.gpuDuringModel}.`,
    "- Runs were sequential, so OCR (CPU) and the model (GPU) did not contend in this harness.",
    "- After this measurement every PDF and DOCX was extracted at both page caps (50 and 200) before any timed question, so per-question times exclude OCR in every arm. A user's first call on a new document pays the cold cost above.",
    "",
  ].join("\n");
}
