import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createDocumentOutlineTools } from "../../../modules/coding/documents/createDocumentOutlineTools.js";
import type { LLMClient } from "../../../modules/coding/llm/types.js";
import { HeadlessAgentSession } from "../../../modules/coding/runtime/HeadlessAgentSession.js";
import { createHeadlessTools, resolveInsideWorkspaceRoots } from "../../../modules/coding/runtime/headlessTools.js";
import { AgentLoop } from "../../../src/tools/AgentLoop.js";
import { DocumentOutlineTool, DocumentReadSectionTool } from "../../../src/tools/handlers/documentOutline.js";
import { collectMessages, makeConversationManager, makeToolRegistry } from "../../helpers/factories.js";

let workdir = "";
beforeEach(async () => {
  workdir = await mkdtemp(join(tmpdir(), "nexus-section-budget-"));
  await writeFile(join(workdir, "manual.md"), "# Manual\n" + "ordinary reference material ".repeat(4_000));
});
afterEach(async () => { await rm(workdir, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 }); });

describe.each(["headless", "extension"] as const)("%s section budget in the agent loop", (channel) => {
  async function run(counts: readonly (number | undefined)[], contextTokens: number, fuller: boolean): Promise<string[]> {
    const tools = createHeadlessTools({ documentOutlineEnabled: true, outlineCacheDir: null, outlineContextTokens: () => contextTokens });
    const core = createDocumentOutlineTools({
      cacheDir: null,
      host: {
        resolvePath: (p) => resolveInsideWorkspaceRoots(workdir, [workdir], p),
        checkSecret: async () => null,
        parseDocument: async () => { throw new Error("markdown uses the direct parser"); },
        contextTokens: () => contextTokens,
      },
    });
    const outline = channel === "headless"
      ? await tools.find((tool) => tool.name === "document_outline")!.execute({ path: "manual.md" }, { workdir })
      : await core.outline({ path: "manual.md" });
    expect(outline.success).toBe(true);
    const nodeId = /\[([0-9a-f]{8}-[0-9a-f]{12})\]/.exec(outline.output)?.[1];
    const treeHash = /tree_hash=([0-9a-f]{64})/.exec(outline.output)?.[1];
    expect(nodeId).toBeDefined();
    expect(treeHash).toBeDefined();
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
            tool_calls: Array.from({ length: calls }, () => ({ function: { name: "document_read_section", arguments: { path: "manual.md", node_id: nodeId, tree_hash: treeHash } } })),
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
      const handler = new DocumentReadSectionTool({ getTools: () => core });
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

  it("shrinks real section output across fuller turns and between calls in one turn", async () => {
    const outputs = await run([0, 13_000, 15_000], 16_384, true);
    expect(outputs).toHaveLength(3);
    expect(outputs[0]!.length).toBeGreaterThan(outputs[1]!.length);
    expect(outputs[1]!.length).toBeGreaterThan(outputs[2]!.length);
    expect(outputs[2]).toContain("context window is nearly full");
    expect(outputs.every((output) => output.includes("ordinary reference material"))).toBe(true);
  });

  it("keeps the fixed section share when a large conversation has no backend count", async () => {
    const outputs = await run([undefined, undefined], 4_096, false);
    expect(outputs).toHaveLength(1);
    expect(outputs[0]!.length).toBeGreaterThan(4_096);
    expect(outputs[0]!.length).toBeLessThan(5_000);
    expect(outputs[0]).not.toContain("context window is nearly full");
  });

  it("shrinks outlines across turns and between calls in one turn", async () => {
    await writeFile(join(workdir, "many.md"), Array.from({ length: 150 }, (_, i) => `# Reference heading ${i}\nordinary text\n`).join("\n"));
    const tools = createHeadlessTools({ documentOutlineEnabled: true, outlineCacheDir: null, outlineContextTokens: () => 16_384 });
    const core = createDocumentOutlineTools({ cacheDir: null, host: {
      resolvePath: (p) => resolveInsideWorkspaceRoots(workdir, [workdir], p),
      checkSecret: async () => null,
      parseDocument: async () => { throw new Error("markdown uses the direct parser"); },
      contextTokens: () => 16_384,
    } });
    let turn = 0;
    const client: LLMClient = {
      checkHealth: async () => true,
      listModels: async () => [],
      async *streamChat() {
        const current = turn++;
        const calls = current === 0 ? 1 : current === 1 ? 2 : 0;
        yield { message: { role: "assistant", content: calls ? "" : "Done.", tool_calls: Array.from({ length: calls }, () => ({ function: { name: "document_outline", arguments: { path: "many.md" } } })) }, done: true, prompt_eval_count: current === 0 ? 0 : 14_500 };
      },
    };
    const outputs: string[] = [];
    if (channel === "headless") {
      const result = await new HeadlessAgentSession(client, tools).run({ task: "Outline repeatedly", workdir, model: "gemma4:12b", onEvent: (event) => {
        if (event.kind === "toolResult") { expect(event.success).toBe(true); outputs.push(event.output); }
      } });
      expect(result.finishReason).toBe("done");
    } else {
      const registry = makeToolRegistry();
      const handler = new DocumentOutlineTool({ getTools: () => core });
      vi.mocked(registry.execute).mockImplementation(async (call) => {
        const result = await handler.execute(call.parameters);
        expect(result.success).toBe(true);
        outputs.push(result.output);
        return result;
      });
      await new AgentLoop(client, makeConversationManager(), registry, "gemma4:12b").run(collectMessages().postMessage);
    }
    expect(outputs).toHaveLength(3);
    expect(outputs[0]!.length).toBeGreaterThan(outputs[1]!.length);
    expect(outputs[1]!.length).toBeGreaterThan(outputs[2]!.length);
    expect(outputs[2]).toContain("context window is nearly full");
    expect(outputs.every((output) => /\[[0-9a-f]{8}-[0-9a-f]{12}\] Reference heading/.test(output))).toBe(true);
  });
});
