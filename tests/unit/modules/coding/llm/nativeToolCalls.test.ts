/**
 * v2.11.0 -- native tool calls survive every client and reach the loops' parse.
 */

import { describe, expect, it } from "vitest";

import { loadedContextLength } from "../../../../../modules/coding/llm/ollamaMemory.js";
import { OpenAiToolCallAccumulator } from "../../../../../modules/coding/llm/openAiToolCalls.js";
import { parseAgentToolCalls } from "../../../../../modules/coding/llm/parseAgentToolCalls.js";
import { LLMStreamChunkSchema } from "../../../../../modules/coding/llm/types.js";

describe("LLMStreamChunkSchema", () => {
  it("keeps the structured calls Ollama returns instead of stripping them", () => {
    const chunk = LLMStreamChunkSchema.parse({
      message: {
        role: "assistant",
        content: "",
        tool_calls: [{ id: "call_1", function: { index: 0, name: "document_outline", arguments: { path: "a.md" } } }],
      },
      done: true,
    });
    expect(chunk.message.tool_calls).toEqual([{ id: "call_1", function: { name: "document_outline", arguments: { path: "a.md" } } }]);
  });
});

describe("OpenAiToolCallAccumulator", () => {
  it("joins name and argument fragments by index, in index order", () => {
    const acc = new OpenAiToolCallAccumulator();
    acc.add([{ index: 1, function: { name: "list_directory", arguments: "{}" } }]);
    acc.add([{ index: 0, function: { name: "read_file", arguments: '{"pa' } }]);
    acc.add([{ index: 0, function: { arguments: 'th": "a.ts"}' } }]);
    expect(acc.drain()).toEqual([
      { function: { name: "read_file", arguments: { path: "a.ts" } } },
      { function: { name: "list_directory", arguments: {} } },
    ]);
    expect(acc.drain()).toEqual([]);
  });

  it("keeps a name repeated in every fragment whole instead of doubling it", () => {
    const acc = new OpenAiToolCallAccumulator();
    acc.add([{ index: 0, function: { name: "read_file", arguments: '{"path":' } }]);
    acc.add([{ index: 0, function: { name: "read_file", arguments: '"a.ts"}' } }]);
    expect(acc.drain()).toEqual([{ function: { name: "read_file", arguments: { path: "a.ts" } } }]);
  });

  it("keeps a call with unparseable arguments as an empty record and drops nameless fragments", () => {
    const acc = new OpenAiToolCallAccumulator();
    acc.add([{ index: 0, function: { name: "read_file", arguments: "{not json" } }, { index: 1, function: { arguments: "{}" } }]);
    expect(acc.drain()).toEqual([{ function: { name: "read_file", arguments: {} } }]);
  });
});

describe("loadedContextLength", () => {
  const ps = (body: unknown, ok = true) => ({ get: async () => new Response(JSON.stringify(body), { status: ok ? 200 : 500 }) });

  it("returns the window Ollama loaded the model with, matching an untagged id", async () => {
    const http = ps({ models: [{ name: "qwen3.5:9b", context_length: 16384 }] });
    expect(await loadedContextLength(http, "qwen3.5:9b")).toBe(16384);
    expect(await loadedContextLength(http, "qwen3.5")).toBe(16384);
  });

  it("returns null when the model is not loaded, the field is missing, or Ollama fails", async () => {
    expect(await loadedContextLength(ps({ models: [{ name: "other:1b", context_length: 4096 }] }), "qwen3.5:9b")).toBeNull();
    expect(await loadedContextLength(ps({ models: [{ name: "qwen3.5:9b" }] }), "qwen3.5:9b")).toBeNull();
    expect(await loadedContextLength(ps({}, false), "qwen3.5:9b")).toBeNull();
    expect(await loadedContextLength({ get: async () => Promise.reject(new Error("ECONNREFUSED")) }, "m")).toBeNull();
  });
});

describe("parseAgentToolCalls with native calls", () => {
  it("returns native calls even when the text carries none", () => {
    const parsed = parseAgentToolCalls("Let me look.", "qwen-json", [
      { function: { name: "read_file", arguments: { path: "a.ts" } } },
    ]);
    expect(parsed.hasAny).toBe(true);
    expect(parsed.results).toHaveLength(1);
    const first = parsed.results[0];
    expect(first?.ok && first.call.tool).toBe("read_file");
    expect(first?.ok && first.call.parameters).toEqual({ path: "a.ts" });
  });

  it("ignores text calls when native calls exist, so one call never runs twice", () => {
    const parsed = parseAgentToolCalls(
      '<|tool_call>call:read_file{path:<|"|>a.ts<|"|>}<tool_call|>',
      "gemma4-xml",
      [{ function: { name: "read_file", arguments: { path: "a.ts" } } }],
    );
    expect(parsed.results).toHaveLength(1);
  });

  it("still parses text calls when the backend returned none natively", () => {
    const parsed = parseAgentToolCalls('<|tool_call>call:list_directory{path:<|"|>.<|"|>}<tool_call|>', "gemma4-xml", []);
    expect(parsed.results.map((r) => (r.ok ? r.call.tool : "bad"))).toEqual(["list_directory"]);
  });

  it("reports no calls when neither source has one", () => {
    expect(parseAgentToolCalls("All done.", "gemma4-xml", []).hasAny).toBe(false);
  });
});
