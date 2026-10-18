/**
 * v2.14.0 T012 -- prompt-opened reasoning is removed in every coding path.
 *
 * A candidate entry is flagged through a test-only `ModelCatalog.byId` spy (no
 * shipped entry sets `reasoningOpensInPrompt`). The same fixture drives the
 * headless loop, the extension's live and fallback stream paths and compaction
 * replay; each must show and keep only the visible text and never execute the
 * decoy tool call inside the reasoning. `lfm2.5:2.6b` must be unchanged.
 */

import * as fsp from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { readFileSync } from "node:fs";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ModelCatalog, type LlmCatalogEntry } from "../../../../core/registry/ModelCatalog.js";
import type { LLMClient, OllamaClient } from "../../../../modules/coding/llm/types.js";
import { HeadlessAgentSession, type HeadlessAgentEvent } from "../../../../modules/coding/runtime/HeadlessAgentSession.js";
import { createHeadlessTools } from "../../../../modules/coding/runtime/headlessTools.js";
import { AgentLoop } from "../../../../src/tools/AgentLoop.js";
import { collectMessages, makeToolRegistry } from "../../../helpers/factories.js";

const { ConversationManager } = await import("../../../../modules/coding/chat/ConversationManager.js");
const { StreamingPipeline } = await import("../../../../modules/coding/chat/StreamingPipeline.js");

const FIXTURE = JSON.parse(
  readFileSync(path.resolve(__dirname, "../../../fixtures/reasoning/prompt-opened.json"), "utf8"),
) as { chunks: string[]; visible: string; reasoning: string };
const RAW = FIXTURE.chunks.join("");
const CANDIDATE = "lfm-candidate";

let restoreSpy: (() => void) | null = null;
function flagCandidate(): void {
  const real = ModelCatalog.byId.bind(ModelCatalog);
  const base = real("lfm2.5:2.6b")!;
  const flagged: LlmCatalogEntry = { ...base, id: CANDIDATE, reasoningOpensInPrompt: true };
  const spy = vi.spyOn(ModelCatalog, "byId").mockImplementation((id: string) => (id === CANDIDATE ? flagged : real(id)));
  restoreSpy = () => spy.mockRestore();
}
afterEach(() => {
  restoreSpy?.();
  restoreSpy = null;
});

function llm(): LLMClient & OllamaClient {
  return {
    checkHealth: vi.fn(async () => true),
    listModels: vi.fn(async () => []),
    streamChat: vi.fn(async function* () {
      for (const content of FIXTURE.chunks) yield { message: { role: "assistant", content }, done: false };
      yield { message: { role: "assistant", content: "" }, done: true };
    }),
  } as unknown as LLMClient & OllamaClient;
}

describe("headless loop", () => {
  let workdir: string;
  beforeEach(async () => {
    workdir = await fsp.mkdtemp(path.join(os.tmpdir(), "nexus-t012-"));
    await fsp.writeFile(path.join(workdir, "decoy.txt"), "never read");
  });
  afterEach(async () => {
    await fsp.rm(workdir, { recursive: true, force: true });
  });

  async function run(model: string) {
    const events: HeadlessAgentEvent[] = [];
    const result = await new HeadlessAgentSession(llm(), createHeadlessTools()).run({
      task: "What is the answer?",
      workdir,
      model,
      onEvent: (e) => events.push(e),
    });
    const tokens = events.filter((e) => e.kind === "token").map((e) => (e as { text: string }).text).join("");
    const toolCalls = events.filter((e) => e.kind === "tool_call" || e.kind === "toolCall");
    return { result, tokens, toolCalls };
  }

  it("shows, keeps and parses only the visible text for a flagged entry", async () => {
    flagCandidate();
    const { result, tokens, toolCalls } = await run(CANDIDATE);
    expect(tokens).toBe(FIXTURE.visible);
    expect(toolCalls).toEqual([]);
    expect(result.finalText).toBe(FIXTURE.visible);
  });

  it("leaves lfm2.5:2.6b unchanged: the same text is shown raw and its call is parsed", async () => {
    const { tokens, toolCalls } = await run("lfm2.5:2.6b");
    // The decoy call runs, so the scripted reply streams again on the next turn;
    // the first turn is passed through byte for byte.
    expect(tokens.startsWith(RAW)).toBe(true);
    expect(toolCalls.length).toBeGreaterThan(0);
  });
});

describe("extension live path (AgentLoop)", () => {
  async function run(model: string) {
    const conversation = new ConversationManager("System.");
    conversation.addUserMessage("What is the answer?");
    const registry = makeToolRegistry();
    const { posted, postMessage } = collectMessages();
    await new AgentLoop(llm(), conversation, registry, model, undefined, undefined, undefined, undefined, {
      passStateGating: false,
    }).run(postMessage);
    const tokens = posted.filter((m) => m.type === "token").map((m) => (m as { value: string }).value).join("");
    const history = conversation.getHistory().filter((m) => m.role === "assistant").map((m) => m.content);
    conversation.dispose();
    return { tokens, executed: vi.mocked(registry.execute).mock.calls.length, history };
  }

  it("posts and keeps only the visible text and never executes the decoy", async () => {
    flagCandidate();
    const { tokens, executed, history } = await run(CANDIDATE);
    expect(tokens).toBe(FIXTURE.visible);
    expect(executed).toBe(0);
    expect(history.join("")).not.toContain("decoy");
  });

  it("leaves lfm2.5:2.6b unchanged", async () => {
    const { tokens, executed } = await run("lfm2.5:2.6b");
    expect(tokens.startsWith(RAW)).toBe(true);
    expect(executed).toBeGreaterThan(0);
  });
});

describe("extension fallback path (StreamingPipeline)", () => {
  async function run(model: string) {
    const manager = new ConversationManager("System.");
    const { posted, postMessage } = collectMessages();
    await new StreamingPipeline(llm(), manager, model).send("What is the answer?", postMessage);
    const tokens = posted.filter((m) => m.type === "token").map((m) => (m as { value: string }).value).join("");
    return tokens;
  }

  it("removes the reasoning before any other scrubber", async () => {
    flagCandidate();
    expect(await run(CANDIDATE)).toBe(FIXTURE.visible);
  });

  it("leaves lfm2.5:2.6b's stream unchanged", async () => {
    expect(await run("lfm2.5:2.6b")).toContain("</think>");
  });
});

describe("compaction replay", () => {
  it("replays only the visible text with the flag, and the raw text without it", () => {
    const manager = new ConversationManager("System.");
    manager.addUserMessage("q");
    manager.addAssistantMessage(RAW);
    const flagged = manager.replayForCompaction({ reasoningOpensInPrompt: true });
    expect(flagged.at(-1)?.content).toBe(FIXTURE.visible);
    expect(manager.replayForCompaction().at(-1)?.content).toBe(RAW);
    // A reply whose reasoning never closes replays as empty.
    manager.addAssistantMessage("still thinking, no closer");
    expect(manager.replayForCompaction({ reasoningOpensInPrompt: true }).at(-1)?.content).toBe("");
  });
});

describe("catalog", () => {
  it("sets the flag on no shipped entry, and never per family", () => {
    expect(ModelCatalog.listLlm().filter((e) => e.reasoningOpensInPrompt)).toEqual([]);
    expect(ModelCatalog.byId("lfm2.5:2.6b")?.reasoningOpensInPrompt).toBeUndefined();
  });
});
