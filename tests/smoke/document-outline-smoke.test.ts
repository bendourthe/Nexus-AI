/**
 * v2.11.0 Phase 5.2 (T019) -- directional local smoke test of the outline tools.
 *
 * Opt-in only: skipped unless NEXUS_OUTLINE_SMOKE=1, and its directory is not
 * in the default Vitest include globs, so neither `npm test` nor CI runs it.
 *
 *   NEXUS_OUTLINE_SMOKE=1 npx vitest run --config configs/vitest.smoke.config.ts
 *
 * Fixed ceiling: 24 questions, four arms, two models, one run each,
 * temperature 0. Arms:
 *   A  parse_document (its 50-page cap) through the real headless agent loop;
 *   B  chunk retrieval over the FULL extracted text (BM25 from core/memory, no
 *      8,000-character cut), top chunks injected into one model call;
 *   C  document_outline + document_read_section through the agent loop;
 *   D  C with node summaries on.
 * Runs are sequential so the OCR engine and the model never contend.
 * Keys never enter the agent's workspace. Counts are directional only.
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, copyFileSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { createHeadlessOcrParser } from "../../core/documents/headlessOcrParser.js";
import { createOcrRuntimeBundle } from "../../core/documents/ocrRuntimeFactory.js";
import { normalizeTextSource } from "../../core/documents/DocumentOutline.js";
import { Bm25Index } from "../../core/memory/Bm25Index.js";
import { createHeadlessOllamaClient } from "../../modules/coding/llm/headlessOllamaClient.js";
import type { LLMClient } from "../../modules/coding/llm/types.js";
import { HeadlessAgentSession } from "../../modules/coding/runtime/HeadlessAgentSession.js";
import { createHeadlessTools, type HeadlessDocumentParser, type HeadlessTool } from "../../modules/coding/runtime/headlessTools.js";
import { hashOf, type SmokeKey, type SmokeQuestion } from "../../scripts/build-outline-smoke-questions.js";
import { scoreAnswer } from "../../scripts/outline-smoke-scoring.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "../..");
const FIXTURES = join(REPO, "tests/fixtures/documents/outline");
const REPORT = join(REPO, "docs/v2/v2.11/development/outline-eval.md");
const OLLAMA = "http://127.0.0.1:11434";
const MODELS = ["qwen3.5:9b", "gemma4:12b"];
const CONTEXT_TOKENS = 16_384;
const QUESTION_TIMEOUT_MS = 4 * 60 * 1000;
const READ_ONLY_TOOLS = new Set(["read_file", "list_directory", "grep_codebase"]);
const ENABLED = process.env["NEXUS_OUTLINE_SMOKE"] === "1";
const LIMIT = Number(process.env["NEXUS_OUTLINE_SMOKE_LIMIT"] ?? "0");
/** Optional per-run JSONL (status, finish reason, tool calls, reply tail) for diagnosing the harness. */
const DETAIL_LOG = process.env["NEXUS_OUTLINE_SMOKE_LOG"];

type Arm = "A" | "B" | "C" | "D";
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
}

/** Harness-only memo: every arm sees the same extraction, and OCR runs once per document. */
function memoParser(inner: HeadlessDocumentParser): HeadlessDocumentParser {
  const cache = new Map<string, ReturnType<HeadlessDocumentParser["parse"]>>();
  return {
    parse(documentBase64, opts) {
      const key = `${createHash("sha256").update(documentBase64).digest("hex")}|${opts?.maxPages ?? ""}`;
      let hit = cache.get(key);
      if (!hit) {
        hit = inner.parse(documentBase64, opts);
        cache.set(key, hit);
      }
      return hit;
    },
  };
}

async function modelSupportsTools(model: string): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA}/api/show`, { method: "POST", body: JSON.stringify({ model }) });
    const body = (await res.json()) as { capabilities?: string[] };
    return Array.isArray(body.capabilities) && body.capabilities.includes("tools");
  } catch {
    return false;
  }
}

function gpuSample(): string {
  try {
    return execFileSync("nvidia-smi", ["--query-gpu=utilization.gpu,memory.used,memory.total", "--format=csv,noheader"], { encoding: "utf8" }).trim();
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
  it("records four-arm counts on local models", async () => {
    const started = Date.now();
    const questionsAll = JSON.parse(readFileSync(join(FIXTURES, "eval", "questions.json"), "utf8")) as SmokeQuestion[];
    const keysAll = JSON.parse(readFileSync(join(FIXTURES, "eval", "keys.json"), "utf8")) as SmokeKey[];
    const questions = LIMIT > 0 ? questionsAll.slice(0, LIMIT) : questionsAll;
    const keyOf = new Map(keysAll.map((k) => [k.id, k]));

    let reachable = true;
    try {
      await fetch(`${OLLAMA}/api/tags`);
    } catch {
      reachable = false;
    }
    if (!reachable) {
      writeFileSync(REPORT, "# Outline smoke test\n\nNot run: Ollama was not reachable on 127.0.0.1:11434.\n");
      return;
    }
    const models: string[] = [];
    const skipped: string[] = [];
    for (const m of MODELS) ((await modelSupportsTools(m)) ? models : skipped).push(m);

    const workspace = mkdtempSync(join(tmpdir(), "outline-smoke-ws-"));
    const cacheDir = mkdtempSync(join(tmpdir(), "outline-smoke-cache-"));
    for (const name of readdirSync(join(FIXTURES, "docs"))) copyFileSync(join(FIXTURES, "docs", name), join(workspace, name));
    expect(readdirSync(workspace).some((f) => f.includes("keys") || f.endsWith(".json"))).toBe(false);

    const env = {
      ...process.env,
      NEXUS_OCR_PYTHON: process.env["NEXUS_OCR_PYTHON"] ?? "C:/Users/bdour/AppData/Local/Nexus/python/venv/Scripts/python.exe",
      NEXUS_OCR_CWD: REPO,
    };
    const bundle = createOcrRuntimeBundle(env);
    const parser = memoParser(createHeadlessOcrParser(bundle.parser));
    const llm = createHeadlessOllamaClient({ baseUrl: OLLAMA });
    const gpuBefore = gpuSample();

    // M2 observation: the cold first outline of the 65-page manual.
    const coldTools = createHeadlessTools({ documentOutlineEnabled: true, documentParser: parser, outlineCacheDir: mkdtempSync(join(tmpdir(), "outline-cold-")), outlineContextTokens: () => CONTEXT_TOKENS });
    const coldStart = Date.now();
    await coldTools.find((t) => t.name === "document_outline")?.execute({ path: "manual-60p.pdf" }, { workdir: workspace, workspaceRoots: [workspace] });
    const coldSeconds = (Date.now() - coldStart) / 1000;
    const gpuAfterOcr = gpuSample();
    // Warm every binary document at both page caps (parse_document's 50, the
    // outline path's 200) so each arm's per-question clock measures the model
    // and its tools, not a one-off OCR pass. The cold cost is reported as M2.
    for (const name of readdirSync(workspace).filter((f) => !/\.(md|txt)$/.test(f))) {
      const b64 = readFileSync(join(workspace, name)).toString("base64");
      for (const maxPages of [50, 200]) await parser.parse(b64, { maxPages });
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
      for (const arm of ["A", "B", "C", "D"] as Arm[]) {
        const session = arm === "B" ? null : new HeadlessAgentSession(llm, toolsFor(arm, model));
        for (const q of questions) {
          const key = keyOf.get(q.id);
          if (!key) continue;
          const t0 = Date.now();
          const signal = AbortSignal.timeout(QUESTION_TIMEOUT_MS);
          let reply = "";
          let toolCalls = 0;
          let finishReason = "answered";
          let status: Outcome["status"] = "answered";
          try {
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
              });
              reply = result?.finalText ?? "";
              toolCalls = result?.toolCalls ?? 0;
              finishReason = result?.finishReason ?? "none";
              if (result?.error) status = "error";
              if (result?.finishReason === "max-iterations") status = "error";
              if (result?.finishReason === "aborted") status = "timeout";
            }
          } catch (err) {
            status = signal.aborted ? "timeout" : "error";
            reply = err instanceof Error ? err.message : String(err);
          }
          if (!gpuDuringModel) gpuDuringModel = gpuSample();
          const correct = status === "answered" && scoreAnswer(reply, key.answer, key.match);
          if (status === "answered" && !/ANSWER\s*:/i.test(reply)) status = "no-answer";
          outcomes.push({ arm, model, id: q.id, category: q.category, pastPage50: key.pastPage50, correct, status, toolCalls, seconds: (Date.now() - t0) / 1000 });
          process.stdout.write(`[smoke] ${model} arm ${arm} ${q.id} ${correct ? "correct" : status === "answered" ? "wrong" : status} finish=${finishReason} tools=${toolCalls}\n`);
          // Diagnostics stay outside the repository: keys and replies never enter docs.
          if (DETAIL_LOG) appendFileSync(DETAIL_LOG, `${JSON.stringify({ model, arm, id: q.id, status, finishReason, toolCalls, tail: reply.slice(-400) })}\n`);
        }
      }
    }
    await bundle.client.shutdown();
    rmSync(workspace, { recursive: true, force: true });

    writeFileSync(REPORT, render({ outcomes, models, skipped, coldSeconds, gpuBefore, gpuAfterOcr, gpuDuringModel, questions, keysAll, minutes: (Date.now() - started) / 60000 }));
    expect(outcomes.length).toBe(models.length * 4 * questions.length);
  });
});

function render(r: {
  outcomes: Outcome[];
  models: string[];
  skipped: string[];
  coldSeconds: number;
  gpuBefore: string;
  gpuAfterOcr: string;
  gpuDuringModel: string;
  questions: SmokeQuestion[];
  keysAll: SmokeKey[];
  minutes: number;
}): string {
  const rows: string[] = [];
  for (const model of r.models) {
    for (const arm of ["A", "B", "C", "D"] as Arm[]) {
      const sel = r.outcomes.filter((o) => o.model === model && o.arm === arm);
      const count = (f: (o: Outcome) => boolean): string => `${sel.filter((o) => f(o) && o.correct).length}/${sel.filter(f).length}`;
      rows.push(
        `| ${model} | ${arm} | ${count(() => true)} | ${count((o) => o.category === "factual")} | ${count((o) => o.category === "cross-section")} | ${count((o) => o.category === "table")} | ${count((o) => !o.pastPage50)} | ${count((o) => o.pastPage50)} | ${sel.filter((o) => o.status === "timeout").length} | ${sel.filter((o) => o.status === "error" || o.status === "no-answer").length} | ${sel.reduce((n, o) => n + o.toolCalls, 0)} | ${Math.round(sel.reduce((n, o) => n + o.seconds, 0))} |`,
      );
    }
  }
  return [
    "# Outline smoke test (v2.11.0 Phase 5)",
    "",
    `Generated ${new Date().toISOString()} by \`NEXUS_OUTLINE_SMOKE=1 npx vitest run --config configs/vitest.smoke.config.ts\` in ${r.minutes.toFixed(1)} minutes.`,
    "",
    "Directional counts only: 24 questions per arm and model, one run, temperature 0. They cannot resolve small differences.",
    "",
    `Models: ${r.models.join(", ")}${r.skipped.length ? `; skipped (no tool calling): ${r.skipped.join(", ")}` : ""}. Context ${CONTEXT_TOKENS} tokens. Per-question time cap ${QUESTION_TIMEOUT_MS / 60000} minutes.`,
    `Question hash ${hashOf(r.questions).slice(0, 16)}, key hash ${hashOf(r.keysAll).slice(0, 16)}.`,
    "",
    "Arms: A parse_document (50-page cap); B BM25 chunk retrieval over the full extracted text, one model call; C document_outline + document_read_section; D C with node summaries.",
    "",
    "Cells are correct/asked. Timeouts and errors count as wrong.",
    "",
    "The four table questions do not discriminate between arms: the fixture repeats one port table in every fourth section, so any copy answers them, including copies inside parse_document's 50 pages. Compare arms on the factual and cross-section columns.",
    "",
    "| Model | Arm | All | Factual | Cross-section | Table | Within 50 pages | Past page 50 | Timeouts | Errors or no answer | Tool calls | Seconds |",
    "|---|---|---|---|---|---|---|---|---|---|---|---|",
    ...rows,
    "",
    "## M2 observation",
    "",
    `- Cold first \`document_outline\` of the 65-page manual (CPU OCR, empty cache): ${r.coldSeconds.toFixed(1)} s.`,
    `- GPU before the run: ${r.gpuBefore}. After the cold OCR: ${r.gpuAfterOcr}. During a model call: ${r.gpuDuringModel}.`,
    "- Runs were sequential, so OCR (CPU) and the model (GPU) did not contend in this harness.",
    "- After this measurement every PDF and DOCX was extracted at both page caps (50 and 200) before any timed question, so per-question times exclude OCR in every arm. A user's first call on a new document pays the cold cost above.",
    "",
  ].join("\n");
}
