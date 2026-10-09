import { describe, expect, it, vi } from "vitest";
import { toRequestMessages } from "../../../modules/coding/llm/toolHistory.js";
import type { LLMMessage } from "../../../modules/coding/llm/types.js";
import { ConversationManager } from "../../../modules/coding/chat/ConversationManager.js";
import { toLlmMessages } from "../../../modules/coding/chat/llmMessages.js";
import { ChatHistoryStore } from "../../../src/storage/ChatHistoryStore.js";
import { ToolResultClearing, SlidingWindow, EmergencyTrim, LlmSummary, estimateTokensForMessages } from "../../../modules/coding/chat/CompactionStrategy.js";
import { RegenerateFromSource } from "../../../modules/coding/chat/RegenerateFromSource.js";
import { CompressRangeTool, CompressMessageTool } from "../../../src/tools/handlers/compress.js";
import { CompressionState } from "../../../modules/coding/chat/state/CompressionState.js";
import { decompressBlockInConversation } from "../../../modules/coding/commands/compactCommand.js";
import { createHeadlessOllamaClient } from "../../../modules/coding/llm/headlessOllamaClient.js";
import { createOllamaClient } from "../../../modules/coding/llm/OllamaClient.js";

const calls = [{ id: "call-a", function: { name: "read_file", arguments: { path: "a.ts" } } }, { id: "call-b", function: { name: "read_file", arguments: { path: "b.ts" } } }];
const envelope = '<|tool_result>\n{"name":"read_file","response":{"success":true,"output":"unique body"}}\n<tool_result|>';
const history: LLMMessage[] = [
  { role: "user", content: "Read both." },
  { role: "assistant", content: "Reading.", tool_calls: calls },
  { role: "tool", content: envelope, tool_name: "read_file", tool_call_id: "call-a" },
  { role: "tool", content: envelope, tool_name: "read_file", tool_call_id: "call-b" },
];

describe("native tool history", () => {
  it("preserves object arguments, identifiers and exact result bytes for Ollama", () => {
    expect(toRequestMessages(history, "ollama")).toEqual(history);
  });
  it("converts back to today's assistant-text and user-envelope shape", () => {
    expect(toRequestMessages(history, "legacy")).toEqual(history.map((m) => ({ role: m.role === "tool" ? "user" : m.role, content: m.content })));
  });
  it.each([
    [history[2]!],
    [history[1]!, { ...history[2]!, tool_call_id: "missing" }],
    [history[1]!, history[2]!],
    [history[1]!, history[2]!, history[2]!],
    [history[1]!, { ...history[2]!, tool_name: "write_file" }, history[3]!],
  ])("rejects orphan, incomplete, duplicate or mismatched tool groups", (...messages) => {
    expect(() => toRequestMessages(messages, "ollama")).toThrow(/tool/i);
  });

  it.each(["headless", "extension"])("sends native wire messages through the %s Ollama client", async (channel) => {
    const fetchMock = vi.fn(async (_url: unknown, init?: RequestInit) => {
      if (init?.method === "POST") return new Response(`${JSON.stringify({ message: { role: "assistant", content: "Done." }, done: true })}\n`);
      return new Response(JSON.stringify({ models: [] }));
    });
    vi.stubGlobal("fetch", fetchMock);
    try {
      const client = channel === "headless" ? createHeadlessOllamaClient() : createOllamaClient();
      for await (const _chunk of client.streamChat({ model: "test", messages: history, stream: true })) { /* drain */ }
      const post = fetchMock.mock.calls.find((entry) => entry[1]?.method === "POST");
      expect(JSON.parse(String(post?.[1]?.body)).messages).toEqual(history);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("persists user envelopes without changing the schema and resumes the legacy prompt", () => {
    const store = new ChatHistoryStore(":memory:");
    const manager = new ConversationManager("System.", store);
    try {
      manager.addUserMessage("Read both.");
      manager.addAssistantMessage("Reading.", calls);
      manager.addToolMessage("read_file", "call-a", envelope);
      manager.addToolMessage("read_file", "call-b", envelope);
      expect(toLlmMessages(manager.getHistory(), false).slice(1)).toEqual(history);
      const session = store.getSession(manager.sessionId!);
      expect(session?.messages.map((m) => m.role)).toEqual(["user", "assistant", "user", "user"]);
      expect(session?.messages.slice(-2).map((m) => m.content)).toEqual([envelope, envelope]);
      const resumed = new ConversationManager("System.", store);
      expect(resumed.loadSession(manager.sessionId!)).toBe(true);
      expect(toLlmMessages(resumed.getHistory(), false).slice(1)).toEqual(toRequestMessages(history, "legacy"));
      resumed.dispose();
    } finally {
      manager.dispose();
      store.close();
    }
  });

  it.each(["sliding", "emergency", "summary", "regenerate", "manager-summary", "manager-trim"])("never splits a native batch during %s", async (method) => {
    const manager = new ConversationManager("System.");
    manager.addUserMessage("Read both.");
    manager.addAssistantMessage("Reading.", calls);
    manager.addToolMessage("read_file", "call-a", envelope.repeat(10));
    manager.addToolMessage("read_file", "call-b", envelope.repeat(10));
    manager.addAssistantMessage("Done.");
    let compacted = [...manager.getHistory()];
    if (method === "sliding") compacted = await new SlidingWindow(2).apply(compacted, 1);
    if (method === "emergency") compacted = await new EmergencyTrim().apply(compacted, estimateTokensForMessages(compacted.slice(-2)) + 10);
    if (method === "regenerate") compacted = await new RegenerateFromSource(process.cwd(), 2000, 2).apply(compacted, 1);
    if (method === "summary") {
      const client = { streamChat: async function* () { yield { message: { role: "assistant", content: "Summary." }, done: true }; }, checkHealth: async () => true, listModels: async () => [] };
      compacted = await new LlmSummary(client, "test", 2).apply(compacted, 1);
    }
    if (method === "manager-summary") { manager.replaceWithSummary("Summary.", 2); compacted = [...manager.getHistory()]; }
    if (method === "manager-trim") { manager.trimToContextLimit(envelope.length * 10 / 4 + 10); compacted = [...manager.getHistory()]; }
    expect(() => toRequestMessages(toLlmMessages(compacted, false), "ollama")).not.toThrow();
    const native = compacted.filter((m) => m.role === "tool" || m.tool_calls?.length);
    expect([0, 3]).toContain(native.length);
    manager.dispose();
  });

  it.each(["range", "message"])("rejects partial native batches in %s compression without rewriting history", async (method) => {
    for (const selected of [1, 2]) {
      const manager = new ConversationManager("System.");
      manager.addAssistantMessage("Reading.", calls);
      manager.addToolMessage("read_file", "call-a", envelope);
      manager.addToolMessage("read_file", "call-b", envelope);
      const before = [...manager.getHistory()];
      const state = new CompressionState();
      const id = state.allocateMessageId(before[selected]!);
      const deps = { conversation: manager, state, protectedTools: [], protectUserMessages: false };
      const result = method === "range"
        ? await new CompressRangeTool(deps).execute({ topic: "reads", ranges: [{ startId: id, endId: id, summary: "Summary." }] })
        : await new CompressMessageTool(deps).execute({ compressions: [{ messageId: id, summary: "Summary." }] });
      expect(result.success).toBe(false);
      expect(manager.getHistory()).toEqual(before);
      manager.dispose();
    }
  });

  it.each([false, true])("compresses a whole native batch and honors protected results: %s", async (protectedResult) => {
    const manager = new ConversationManager("System.");
    manager.addAssistantMessage("Reading.", calls);
    manager.addToolMessage("read_file", "call-a", envelope);
    manager.addToolMessage("read_file", "call-b", envelope);
    const state = new CompressionState();
    const ids = manager.getHistory().slice(1).map((m) => state.allocateMessageId(m));
    const result = await new CompressRangeTool({ conversation: manager, state, protectedTools: protectedResult ? ["read_file"] : [], protectUserMessages: false }).execute({ topic: "reads", ranges: [{ startId: ids[0], endId: ids[2], summary: "Summary." }] });
    expect(result.success).toBe(true);
    expect(() => toRequestMessages(toLlmMessages(manager.getHistory(), false), "ollama")).not.toThrow();
    expect(manager.getHistory().filter((m) => m.role === "tool" || m.tool_calls?.length)).toHaveLength(protectedResult ? 3 : 0);
    expect(decompressBlockInConversation(manager, state, "b1").ok).toBe(true);
    expect(() => toRequestMessages(toLlmMessages(manager.getHistory(), false), "ollama")).not.toThrow();
    expect(manager.getHistory().filter((m) => m.role === "tool" || m.tool_calls?.length)).toHaveLength(3);
    manager.dispose();
  });

  it("directs complete native batches to range compression so undo cannot restore only one member", async () => {
    const manager = new ConversationManager("System.");
    manager.addAssistantMessage("Reading.", calls);
    manager.addToolMessage("read_file", "call-a", envelope);
    manager.addToolMessage("read_file", "call-b", envelope);
    const before = [...manager.getHistory()];
    const state = new CompressionState();
    const compressions = before.slice(1).map((m) => ({ messageId: state.allocateMessageId(m), summary: "Summary." }));
    const result = await new CompressMessageTool({ conversation: manager, state, protectedTools: [], protectUserMessages: false }).execute({ compressions });
    expect(result.success).toBe(false);
    expect(result.error).toContain("compress_range");
    expect(state.runCount).toBe(0);
    expect(manager.getHistory()).toEqual(before);
    manager.dispose();
  });

  it("clears native tool bodies without dropping roles or call identifiers", async () => {
    const manager = new ConversationManager("System.");
    manager.addAssistantMessage("Reading.", calls);
    manager.addToolMessage("read_file", "call-a", envelope.repeat(10));
    manager.addToolMessage("read_file", "call-b", envelope.repeat(10));
    const compacted = await new ToolResultClearing(1).apply(manager.getHistory());
    expect(compacted[2]?.content.length).toBeLessThan(envelope.length * 10);
    expect(compacted[2]).toMatchObject({ role: "tool", tool_name: "read_file", tool_call_id: "call-a" });
    expect(compacted[3]?.content).toBe(envelope.repeat(10));
    expect(() => toRequestMessages(toLlmMessages(compacted, false), "ollama")).not.toThrow();
    manager.dispose();
  });

  it("keeps native history order when the wall clock moves backward", async () => {
    const messages = history.map((message, index) => ({ ...message, id: `clock-${index}`, timestamp: index === 1 ? 500 : 100 }));
    const compacted = await new SlidingWindow(2).apply(messages, 1);
    expect(compacted.map((m) => m.id)).toEqual(messages.map((m) => m.id));
    expect(() => toRequestMessages(compacted, "ollama")).not.toThrow();
  });
});
