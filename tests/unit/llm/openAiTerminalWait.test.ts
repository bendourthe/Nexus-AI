import { afterEach, describe, expect, it, vi } from "vitest";
import { createLmStudioClient } from "../../../modules/coding/llm/LmStudioClient.js";
import { createHeadlessOpenAiClient } from "../../../modules/coding/llm/headlessOpenAiClient.js";
import type { LLMStreamChunk } from "../../../modules/coding/llm/types.js";

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe.each([
  ["extension", createLmStudioClient],
  ["headless", createHeadlessOpenAiClient],
] as const)("%s terminal usage wait", (_channel, createClient) => {
  it.each(["completed", "unfinished", "aborted"] as const)("preserves the completion boundary on a %s transport failure", async (state) => {
    vi.useFakeTimers();
    const abort = new AbortController();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const frames = [
          { choices: [{ delta: { content: "Complete", tool_calls: [{ index: 0, id: "read-1", function: { name: "read_file", arguments: '{"path":"a.txt"}' } }] }, finish_reason: state === "unfinished" ? null : "tool_calls" }] },
          { choices: [], usage: { prompt_tokens: 123, completion_tokens: 7 } },
        ];
        controller.enqueue(new TextEncoder().encode(frames.map((frame) => `data: ${JSON.stringify(frame)}\n`).join("")));
      },
      pull(controller) {
        if (state === "aborted") abort.abort();
        controller.error(new Error("transport reset"));
      },
    });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(stream)));
    const client = createClient({ baseUrl: "http://127.0.0.1:1234", timeoutMs: 25 });
    const chunks: LLMStreamChunk[] = [];
    const finished = (async () => {
      for await (const chunk of client.streamChat({ model: "m", messages: [], stream: true }, abort.signal)) chunks.push(chunk);
    })();
    if (state === "completed") {
      await finished;
      expect(chunks.filter((chunk) => chunk.done)).toHaveLength(1);
      expect(chunks.at(-1)).toMatchObject({ done: true, prompt_eval_count: 123, eval_count: 7, message: { content: "Complete", tool_calls: [{ function: { name: "read_file", arguments: { path: "a.txt" } } }] } });
    } else {
      await expect(finished).rejects.toThrow();
      expect(chunks.some((chunk) => chunk.done)).toBe(false);
    }
    expect(vi.getTimerCount()).toBe(0);
  });

  it("returns the finished response once and cancels a stalled usage stream", async () => {
    vi.useFakeTimers();
    const cancel = vi.fn();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const frames = [
          { choices: [{ delta: { content: "Complete", tool_calls: [{ index: 0, id: "read-1", function: { name: "read_file", arguments: '{"path":"a.txt"}' } }] }, finish_reason: "tool_calls" }] },
          { choices: [], usage: { prompt_tokens: 123, completion_tokens: 7 } },
        ];
        controller.enqueue(new TextEncoder().encode(frames.map((frame) => `data: ${JSON.stringify(frame)}\n`).join("")));
      },
      cancel,
    });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(stream)));
    const client = createClient({ baseUrl: "http://127.0.0.1:1234", timeoutMs: 25 });
    const chunks: LLMStreamChunk[] = [];
    const finished = (async () => {
      for await (const chunk of client.streamChat({ model: "m", messages: [], stream: true })) chunks.push(chunk);
    })();
    await vi.advanceTimersByTimeAsync(26);
    await finished;
    expect(chunks.filter((chunk) => chunk.done)).toHaveLength(1);
    expect(chunks.at(-1)).toMatchObject({ done: true, prompt_eval_count: 123, eval_count: 7, message: { content: "Complete", tool_calls: [{ function: { name: "read_file", arguments: { path: "a.txt" } } }] } });
    expect(cancel).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
});
