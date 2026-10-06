import * as fsp from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { LLMChatRequest, LLMClient } from "../../../modules/coding/llm/types.js";
import { createHeadlessTools } from "../../../modules/coding/runtime/headlessTools.js";
import {
  HeadlessAgentSession,
  type HeadlessAgentEvent,
} from "../../../modules/coding/runtime/HeadlessAgentSession.js";

let workdir: string;

beforeEach(async () => {
  workdir = await fsp.mkdtemp(path.join(os.tmpdir(), "nexus-headless-session-"));
});
afterEach(async () => {
  await fsp.rm(workdir, { recursive: true, force: true });
});

/** Build a Gemma4-native tool-call string with `key:<|"|>value<|"|>` string args. */
function toolCall(name: string, args: Record<string, string>): string {
  const body = Object.entries(args)
    .map(([k, v]) => `${k}:<|"|>${v}<|"|>`)
    .join("");
  return `<|tool_call>call:${name}{${body}}<tool_call|>`;
}

interface ScriptedLlm {
  client: LLMClient;
  requests: LLMChatRequest[];
}

function scriptedLlm(responses: string[], opts: { throwOnCall?: boolean } = {}): ScriptedLlm {
  let i = 0;
  const requests: LLMChatRequest[] = [];
  const client: LLMClient = {
    async checkHealth() {
      return true;
    },
    async listModels() {
      return [];
    },
    async *streamChat(request) {
      requests.push(request);
      if (opts.throwOnCall) throw new Error("stream boom");
      const text = responses[i++] ?? "Done.";
      yield { message: { role: "assistant", content: text }, done: true };
    },
  };
  return { client, requests };
}

describe("HeadlessAgentSession", () => {
  it("executes a write_file tool call then completes", async () => {
    const { client } = scriptedLlm([
      toolCall("write_file", { path: "out.ts", content: "export const x = 1;" }),
      "Wrote the file. Done.",
    ]);
    const session = new HeadlessAgentSession(client, createHeadlessTools());
    const result = await session.run({ task: "create out.ts", workdir, model: "test" });

    expect(result.finishReason).toBe("done");
    expect(result.toolCalls).toBe(1);
    expect(result.llmCalls).toBe(2);
    expect(result.iterations).toBe(2);
    expect(result.finalText).toContain("Done");
    const written = await fsp.readFile(path.join(workdir, "out.ts"), "utf8");
    expect(written).toBe("export const x = 1;");
  });

  it("teaches a qwen-json model the Qwen call syntax and runs the call it makes", async () => {
    await fsp.writeFile(path.join(workdir, "a.txt"), "alpha", "utf8");
    const { client, requests } = scriptedLlm([
      '<tool_call>{"name": "read_file", "arguments": {"path": "a.txt"}}</tool_call>',
      "Read it. Done.",
    ]);
    const session = new HeadlessAgentSession(client, createHeadlessTools());
    const result = await session.run({ task: "read a.txt", workdir, model: "qwen3.5:9b" });

    const system = String(requests[0]?.messages[0]?.content);
    expect(system).toContain('<tool_call>{"name": "read_file", "arguments": {"path": "src/index.ts"}}</tool_call>');
    expect(system).not.toContain("<|tool_call>call:");
    expect(result.toolCalls).toBe(1);
    expect(result.finishReason).toBe("done");
  });

  it("sends the tools natively and runs a call returned in message.tool_calls", async () => {
    await fsp.writeFile(path.join(workdir, "a.txt"), "alpha", "utf8");
    let turn = 0;
    const requests: LLMChatRequest[] = [];
    const client: LLMClient = {
      async checkHealth() {
        return true;
      },
      async listModels() {
        return [];
      },
      async *streamChat(request) {
        requests.push(request);
        turn += 1;
        if (turn === 1) {
          yield {
            message: {
              role: "assistant",
              content: "",
              tool_calls: [{ function: { name: "read_file", arguments: { path: "a.txt" } } }],
            },
            done: true,
          };
          return;
        }
        yield { message: { role: "assistant", content: "It says alpha." }, done: true };
      },
    };
    const events: HeadlessAgentEvent[] = [];
    const session = new HeadlessAgentSession(client, createHeadlessTools());
    const result = await session.run({ task: "read a.txt", workdir, model: "test", onEvent: (e) => events.push(e) });

    expect(requests[0]?.tools?.some((t) => t.function.name === "read_file")).toBe(true);
    expect(result.toolCalls).toBe(1);
    expect(result.finalText).toBe("It says alpha.");
    const toolResult = events.find((e) => e.kind === "toolResult");
    expect(toolResult?.kind === "toolResult" && toolResult.output).toContain("alpha");
  });

  it("teaches the Gemma default the <|\"|> string syntax, not JSON arguments", async () => {
    const { client, requests } = scriptedLlm(["Done."]);
    const session = new HeadlessAgentSession(client, createHeadlessTools());
    await session.run({ task: "x", workdir, model: "test" });

    const system = String(requests[0]?.messages[0]?.content);
    expect(system).toContain('<|tool_call>call:read_file{path:<|"|>src/index.ts<|"|>}<tool_call|>');
    expect(system).not.toContain('{"arg"');
  });

  it("stops at the iteration budget when the model never stops calling tools", async () => {
    const { client } = scriptedLlm(
      Array.from({ length: 10 }, () => toolCall("list_directory", {})),
    );
    const session = new HeadlessAgentSession(client, createHeadlessTools());
    const result = await session.run({ task: "loop", workdir, model: "test", maxIterations: 3 });

    expect(result.finishReason).toBe("max-iterations");
    expect(result.iterations).toBe(3);
    expect(result.llmCalls).toBe(3);
  });

  it("returns aborted when the signal is already aborted", async () => {
    const { client, requests } = scriptedLlm(["Done."]);
    const session = new HeadlessAgentSession(client, createHeadlessTools());
    const result = await session.run({
      task: "x",
      workdir,
      model: "test",
      signal: AbortSignal.abort(),
    });

    expect(result.finishReason).toBe("aborted");
    expect(result.llmCalls).toBe(0);
    expect(requests.length).toBe(0);
  });

  it("returns error when the LLM stream throws", async () => {
    const { client } = scriptedLlm([], { throwOnCall: true });
    const session = new HeadlessAgentSession(client, createHeadlessTools());
    const result = await session.run({ task: "x", workdir, model: "test" });

    expect(result.finishReason).toBe("error");
    expect(result.error).toMatch(/boom/);
  });

  it("feeds an error result back for a valid tool name the headless set lacks, then completes", async () => {
    const { client } = scriptedLlm([
      toolCall("web_search", { query: "anything" }),
      "Recovered without that tool. Done.",
    ]);
    const session = new HeadlessAgentSession(client, createHeadlessTools());
    const result = await session.run({ task: "x", workdir, model: "test" });

    expect(result.finishReason).toBe("done");
    // web_search parses as a valid ToolName but is not in the headless set,
    // so it is not counted as an executed tool call.
    expect(result.toolCalls).toBe(0);
    expect(result.iterations).toBe(2);
  });

  it("injects the skill body and tool declarations into the system prompt", async () => {
    const { client, requests } = scriptedLlm(["Done."]);
    const session = new HeadlessAgentSession(client, createHeadlessTools());
    await session.run({
      task: "x",
      workdir,
      model: "test",
      skillBody: "ALWAYS_RUN_LINT_FIRST",
    });
    const system = requests[0]?.messages.find((m) => m.role === "system")?.content ?? "";
    expect(system).toContain("ALWAYS_RUN_LINT_FIRST");
    expect(system).toContain("write_file");
    expect(system).toContain("run_terminal");
  });

  it("emits token, toolCall, toolResult, and done events", async () => {
    const { client } = scriptedLlm([
      toolCall("write_file", { path: "a.ts", content: "1" }),
      "Done.",
    ]);
    const events: HeadlessAgentEvent[] = [];
    const session = new HeadlessAgentSession(client, createHeadlessTools());
    await session.run({
      task: "x",
      workdir,
      model: "test",
      onEvent: (e) => events.push(e),
    });

    const kinds = new Set(events.map((e) => e.kind));
    expect(kinds.has("token")).toBe(true);
    expect(kinds.has("toolCall")).toBe(true);
    expect(kinds.has("toolResult")).toBe(true);
    expect(events.at(-1)).toEqual({ kind: "done", finishReason: "done" });
  });

  it("keeps the headless system prompt without a harness overlay by default", async () => {
    const { client, requests } = scriptedLlm(["ok"]);
    const session = new HeadlessAgentSession(client, createHeadlessTools());
    await session.run({ task: "x", workdir, model: "test" });
    const system = requests[0]?.messages.find((m) => m.role === "system")?.content ?? "";
    expect(system).not.toContain("Harness overlay is on");
  });

  it("appends a harness overlay line when the selector is enabled", async () => {
    const { client, requests } = scriptedLlm(["ok"]);
    const session = new HeadlessAgentSession(client, createHeadlessTools(), undefined, {
      harnessSelectorEnabled: true,
    });
    await session.run({ task: "x", workdir, model: "gemma4:e4b" });
    const system = requests[0]?.messages.find((m) => m.role === "system")?.content ?? "";
    expect(system).toContain("Harness overlay is on");
  });
});
