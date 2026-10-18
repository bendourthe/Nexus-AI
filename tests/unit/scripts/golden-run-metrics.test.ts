/**
 * v2.14.0 T013 -- golden-run sampler options, per-turn metrics, codec
 * parse-failure counting and codec selection for catalog-only entries.
 */

import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import * as fsp from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { buildSync } from "esbuild";

import { beforeAll, describe, expect, it } from "vitest";

import {
  ALLOWED_OPTIONS,
  createMetricsCollector,
  loadGoldenOptions,
  peakMemory,
} from "../../../bin/goldenRunMetrics.mjs";
import { runGoldenRun } from "../../../bin/nexus.mjs";
import { countUnparsedToolSpans } from "../../../modules/coding/llm/ToolCallFormat.js";
import { toolFormatForModel } from "../../../modules/coding/llm/parseAgentToolCalls.js";
import { lookupAlias, toSidecarRuntime } from "../../../core/registry/modelAliases.js";
import type { LLMChatRequest, LLMClient } from "../../../modules/coding/llm/types.js";
import { HeadlessAgentDriver } from "../../../modules/coding/runtime/HeadlessAgentDriver.js";
import type { HeadlessAgentEvent } from "../../../modules/coding/runtime/HeadlessAgentSession.js";
import { createHeadlessTools } from "../../../modules/coding/runtime/headlessTools.js";

function optionsFile(body: string): string {
  const dir = mkdtempSync(join(tmpdir(), "golden-options-"));
  const path = join(dir, "options.json");
  writeFileSync(path, body);
  return path;
}

describe("--options", () => {
  it("accepts the documented sampler keys, including Ollama's repeat_penalty", () => {
    const path = optionsFile(JSON.stringify({ temperature: 0.1, top_k: 50, repeat_penalty: 1.05 }));
    expect(loadGoldenOptions(path)).toEqual({ temperature: 0.1, top_k: 50, repeat_penalty: 1.05 });
    expect(ALLOWED_OPTIONS).toContain("repeat_penalty");
  });

  it.each([
    ["not json", /not readable JSON/],
    ["[1]", /JSON object/],
    [JSON.stringify({ repetition_penalty: 1.05 }), /unknown option "repetition_penalty"/],
    [JSON.stringify({ temperature: "hot" }), /must be a number/],
  ])("rejects %s before any task runs", (body, error) => {
    expect(() => loadGoldenOptions(optionsFile(body))).toThrow(error);
  });

  // The CLI checks --tool-format against the compiled codec list. CI's test
  // job does not build out/, so build that one module when it is missing
  // (as evaluate-local-rewrites.test.ts does for its modules).
  beforeAll(() => {
    const root = resolve(__dirname, "../../..");
    const entry = "modules/coding/llm/ToolCallFormat.ts";
    if (!existsSync(join(root, "out", entry.replace(/\.ts$/, ".js")))) {
      buildSync({ entryPoints: [join(root, entry)], outdir: join(root, "out"), outbase: root, bundle: true, platform: "node", format: "cjs", logLevel: "silent" });
    }
  });

  it("is refused by the CLI with exit 2, as is a flag with no value", async () => {
    const err: string[] = [];
    const sink = { write: (s: string) => err.push(s) } as unknown as NodeJS.WritableStream;
    expect(await runGoldenRun({ mode: "dry", options: optionsFile("{}x") }, sink, sink)).toBe(2);
    expect(await runGoldenRun({ mode: "dry", metrics: true }, sink, sink)).toBe(2);
    expect(await runGoldenRun({ mode: "live", "tool-format": "bogus" }, sink, sink)).toBe(2);
    expect(err.join("")).toMatch(/need a value/);
  });
});

describe("memory and offload", () => {
  it("reports peak resident, VRAM and RAM and whether layers spilled to system memory", () => {
    expect(peakMemory([])).toEqual({ status: "not_measured" });
    const fits = peakMemory([{ size: 10, sizeVram: 10 }, { size: 12, sizeVram: 12 }]);
    expect(fits).toMatchObject({ status: "measured", peakResidentBytes: 12, peakVramBytes: 12, peakRamBytes: 0, offloaded: false });
    const spills = peakMemory([{ size: 25, sizeVram: 13 }]);
    expect(spills).toMatchObject({ peakRamBytes: 12, offloaded: true });
  });
});

describe("metrics collector through a scripted live run", () => {
  it("records each turn, the first tool call, codec parse failures and memory per task", async () => {
    const workdir = await fsp.mkdtemp(join(tmpdir(), "golden-metrics-"));
    await fsp.writeFile(join(workdir, "a.txt"), "hello");
    const requests: LLMChatRequest[] = [];
    const replies = [
      "<|tool_call_start|>[read_file(path='a.txt')]<|tool_call_end|> and <|tool_call_start|>[broken(((]<|tool_call_end|>",
      "Done.",
    ];
    let turn = 0;
    const llm: LLMClient = {
      async checkHealth() {
        return true;
      },
      async listModels() {
        return [];
      },
      async *streamChat(request) {
        requests.push(request);
        yield { message: { role: "assistant", content: replies[turn++] ?? "Done." }, done: true };
      },
    };
    let clock = 0;
    const collector = createMetricsCollector({
      model: "trial",
      now: () => (clock += 10),
      sampleMs: 60_000,
      readPs: async () => ({ size: 100, sizeVram: 90 }),
    });
    const driver = new HeadlessAgentDriver({
      llm: collector.wrapLlm(llm),
      model: "trial",
      tools: createHeadlessTools(),
      llmOptions: { temperature: 0.1, top_k: 50, repeat_penalty: 1.05 },
      toolFormat: "lfm-pythonic",
      onEvent: (e: HeadlessAgentEvent) => collector.onEvent(e),
    });
    collector.beginTask("t1");
    await driver.run({ task: { id: "t1", description: "Read a.txt", maxIterations: 5 } as never, workdir } as never);
    await new Promise((r) => setTimeout(r, 0));
    collector.endTask({ passed: true, failures: [] });
    const report = collector.report({ model: "trial" });
    const task = report.tasks[0];
    expect(task.turns).toHaveLength(2);
    expect(task.firstToolCallMs).toBeGreaterThan(0);
    expect(task.codecParseFailures).toBe(1);
    expect(task.memory).toMatchObject({ status: "measured", offloaded: true, peakRamBytes: 10 });
    expect(requests[0]?.options).toEqual({ temperature: 0.1, top_k: 50, repeat_penalty: 1.05 });
    await fsp.rm(workdir, { recursive: true, force: true });
  });
});

describe("codec parsing and selection", () => {
  it("counts LFM spans the codec could not parse, and nothing for other formats", () => {
    const text = "<|tool_call_start|>[read_file(path='a')]<|tool_call_end|><|tool_call_start|>[nope(((]<|tool_call_end|><|tool_call_start|>[]<|tool_call_end|>";
    expect(countUnparsedToolSpans(text, "lfm-pythonic")).toBe(1);
    expect(countUnparsedToolSpans(text, "qwen-json")).toBe(0);
  });

  it("keeps coding-catalog codecs and gives unknown ids the Gemma default", () => {
    expect(toolFormatForModel("lfm2.5:2.6b")).toBe("lfm-pythonic");
    expect(toolFormatForModel("gemma4:12b")).toBe("gemma4-xml");
    expect(toolFormatForModel("hf.co/never/registered:Q4")).toBe("gemma4-xml");
  });

  it("takes the alias catalog's codec for an entry the coding catalog does not list", () => {
    for (const id of ["inkling-small", "gemma4:31b", "gemma-4-12b-it-gguf"]) {
      const alias = lookupAlias(id);
      expect(alias, id).toBeDefined();
      expect(toolFormatForModel(id)).toBe(toSidecarRuntime(alias!)?.toolFormat ?? "gemma4-xml");
    }
  });
});
