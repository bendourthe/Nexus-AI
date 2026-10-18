/**
 * v2.14.0 T012 -- desktop Chat removes prompt-opened reasoning from the reply.
 *
 * Driven by the same fixture as the root coding-path test
 * (tests/unit/core/chat/reasoningOpensInPrompt.test.ts), so both channels are
 * held to one expected visible text.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import type { LLMClient } from "../../modules/coding/llm/types";
import { createChatMessageHandler } from "../sidecar/src/chat/chatMessageHandler";
import { requireModel } from "../sidecar/src/coding/models";

const FIXTURE = JSON.parse(
  readFileSync(resolve(__dirname, "../../tests/fixtures/reasoning/prompt-opened.json"), "utf8"),
) as { chunks: string[]; visible: string; reasoning: string };

const llm: LLMClient = {
  async checkHealth() {
    return true;
  },
  async listModels() {
    return [];
  },
  async *streamChat() {
    for (const content of FIXTURE.chunks) yield { message: { role: "assistant", content }, done: false };
    yield { message: { role: "assistant", content: "" }, done: true };
  },
};

async function turn(reasoningOpensInPrompt: boolean) {
  const base = requireModel("lfm2.5:2.6b");
  const model = reasoningOpensInPrompt ? { ...base, reasoningOpensInPrompt: true } : base;
  const events = await createChatMessageHandler({ llm })({
    sessionId: "s1",
    model,
    messages: [{ role: "user", content: "What is the answer?" }],
  });
  const text = (kind: string) =>
    events.filter((e) => e.kind === kind).map((e) => (e as { text: string }).text).join("");
  return { tokens: text("token"), reasoning: text("reasoning_delta") };
}

describe("desktop Chat reply display", () => {
  it("shows only the visible text and keeps the reasoning separate for a flagged entry", async () => {
    const { tokens, reasoning } = await turn(true);
    expect(tokens).toBe(FIXTURE.visible);
    expect(reasoning).toBe(FIXTURE.reasoning);
  });

  it("streams an unflagged entry exactly as before", async () => {
    const { tokens, reasoning } = await turn(false);
    expect(tokens).toBe(FIXTURE.chunks.join(""));
    expect(reasoning).toBe("");
  });

  it("projects the flag from the catalog for no shipped entry", () => {
    expect(requireModel("lfm2.5:2.6b").reasoningOpensInPrompt).toBeUndefined();
  });
});
