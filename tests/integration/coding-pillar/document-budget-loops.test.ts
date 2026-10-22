import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { mockFs } from "../../setup.js";
import type { LLMClient } from "../../../modules/coding/llm/types.js";
import { HeadlessAgentSession } from "../../../modules/coding/runtime/HeadlessAgentSession.js";
import { createHeadlessTools } from "../../../modules/coding/runtime/headlessTools.js";
import { AgentLoop } from "../../../src/tools/AgentLoop.js";
import { ParseDocumentTool } from "../../../src/tools/handlers/parseDocument.js";
import { collectMessages, makeConversationManager, makeToolRegistry } from "../../helpers/factories.js";

let workdir = "";
beforeEach(async () => {
  workdir = await mkdtemp(join(tmpdir(), "nexus-document-budget-"));
  await writeFile(join(workdir, "manual.pdf"), "%PDF-1.7 fixture");
});
afterEach(async () => { await rm(workdir, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 }); });

describe.each(["headless", "extension"] as const)("%s document budget in the agent loop", (channel) => {
  async function run(counts: readonly (number | undefined)[], contextTokens: number, fuller: boolean): Promise<string[]> {
    const parser = { parse: async () => ({ engine: "fixture", text: "ordinary reference material ".repeat(4_000), markdown: null, pageCount: 1 }) };
    mockFs.readFile.mockResolvedValue(new TextEncoder().encode("%PDF-1.7 fixture"));
    const tools = createHeadlessTools({ parseDocumentEnabled: true, documentParser: parser, documentContextTokens: () => contextTokens });
    let turn = 0;
    const client: LLMClient = {
      checkHealth: async () => true,
      listModels: async () => [],
      async *streamChat() {
        const current = turn++;
        const calls = current === 0 ? 1 : fuller && current === 1 ? 2 : 0;
        const count = counts[current];
        yield {
          message: {
            role: "assistant",
            content: calls ? "" : "Done.",
            tool_calls: Array.from({ length: calls }, () => ({ function: { name: "parse_document", arguments: { path: "manual.pdf" } } })),
          },
          done: true,
          ...(count === undefined ? {} : { prompt_eval_count: count }),
        };
      },
    };
    const outputs: string[] = [];
    if (channel === "headless") {
      const result = await new HeadlessAgentSession(client, tools).run({
        task: counts[0] === undefined ? "Context ".repeat(4_000) : "Read the section repeatedly",
        workdir,
        model: "gemma4:12b",
        llmOptions: { num_ctx: counts[0] === undefined ? 16_384 : contextTokens },
        onEvent: (event) => {
          if (event.kind === "toolResult") {
            expect(event.success).toBe(true);
            outputs.push(event.output);
          }
        },
      });
      expect(result.finishReason).toBe("done");
    } else {
      const registry = makeToolRegistry();
      const handler = new ParseDocumentTool({ resolveParser: () => parser, contextTokens: () => contextTokens });
      vi.mocked(registry.execute).mockImplementation(async (call) => {
        const result = await handler.execute(call.parameters);
        expect(result.success).toBe(true);
        outputs.push(result.output);
        return result;
      });
      const manager = makeConversationManager();
      if (counts[0] === undefined) manager.addUserMessage("Context ".repeat(4_000));
      await new AgentLoop(client, manager, registry, "gemma4:12b").run(collectMessages().postMessage);
    }
    return outputs;
  }

  it("shrinks real parsed output across fuller turns and between calls in one turn", async () => {
    const outputs = await run([0, 13_000, 15_000], 16_384, true);
    expect(outputs).toHaveLength(3);
    expect(outputs[0]!.length).toBeGreaterThan(outputs[1]!.length);
    expect(outputs[1]!.length).toBeGreaterThan(outputs[2]!.length);
    expect(outputs[2]).toContain("context window is nearly full");
    expect(outputs.every((output) => output.includes("ordinary reference material"))).toBe(true);
    expect(outputs.every((output) => !/document_outline|document_read_section/.test(output))).toBe(true);
    expect(outputs[0]).toContain("max_pages");
  });

  it("keeps the fixed document share when a large conversation has no backend count", async () => {
    const outputs = await run([undefined, undefined], 4_096, false);
    expect(outputs).toHaveLength(1);
    expect(outputs[0]!.length).toBeGreaterThan(4_096);
    expect(outputs[0]!.length).toBeLessThan(5_000);
    expect(outputs[0]).not.toContain("context window is nearly full");
  });

});
