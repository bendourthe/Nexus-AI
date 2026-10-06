/**
 * v2.1 known-gaps -- dispatch tool-call parsing by catalog `toolFormat`.
 *
 * Gemma 4 XML stays on the existing balanced-brace parser so that path is
 * byte-identical. Other families use `getToolCallFormat(name).parse` and are
 * adapted into the AgentLoop / HeadlessAgentSession `ParseResult` shape.
 */

import { randomUUID } from "crypto";
import {
  ModelCatalog,
  type ToolFormatName,
} from "../../../core/registry/ModelCatalog.js";
import {
  parseToolCalls as parseGemma,
  stripToolCalls as stripGemma,
  type ParseResult,
} from "../../../src/tools/Gemma4ToolFormat.js";
import type { ToolName } from "../../../src/tools/types.js";
import { getToolCallFormat } from "./ToolCallFormat.js";
import type { LLMToolCall } from "./types.js";

export function toolFormatForModel(modelId: string): ToolFormatName {
  return ModelCatalog.byId(modelId)?.toolFormat ?? "gemma4-xml";
}

export interface ToolCallSyntax {
  /** One sentence telling the model how to call a tool in this format. */
  readonly instruction: string;
  /** A complete call of `read_file` with `path` = `src/index.ts`, in this format. */
  readonly example: string;
}

/**
 * v2.11.0 -- the call syntax the model must emit for `format`, stated so the
 * format's own parser reads it. The headless loop used to teach every model
 * the Gemma syntax with JSON arguments, which no parser accepts.
 */
export function toolCallSyntax(format: ToolFormatName): ToolCallSyntax {
  switch (format) {
    case "gemma4-xml":
      return {
        instruction:
          'Call a tool with `<|tool_call>call:TOOL_NAME{key:<|"|>text value<|"|>,count:3}<tool_call|>`: ' +
          'wrap every string value in <|"|> markers and write numbers and booleans bare.',
        example: '<|tool_call>call:read_file{path:<|"|>src/index.ts<|"|>}<tool_call|>',
      };
    case "qwen-json":
      return {
        instruction:
          'Call a tool with `<tool_call>{"name": "TOOL_NAME", "arguments": {...}}</tool_call>`, where the arguments are a JSON object.',
        example: '<tool_call>{"name": "read_file", "arguments": {"path": "src/index.ts"}}</tool_call>',
      };
    case "llama3-json":
      return {
        instruction:
          'Call a tool by replying with only the JSON object `{"name": "TOOL_NAME", "parameters": {...}}` and no other text.',
        example: '{"name": "read_file", "parameters": {"path": "src/index.ts"}}',
      };
    case "deepseek-json":
      return {
        instruction:
          'Call a tool with a fenced block: ```tool, then `{"name": "TOOL_NAME", "parameters": {...}}`, then ```.',
        example: '```tool\n{"name": "read_file", "parameters": {"path": "src/index.ts"}}\n```',
      };
    case "lfm-pythonic":
      return {
        instruction:
          'Call a tool with `<|tool_call_start|>[TOOL_NAME(key="text value", count=3)]<|tool_call_end|>`.',
        example: '<|tool_call_start|>[read_file(path="src/index.ts")]<|tool_call_end|>',
      };
    case "none":
      return { instruction: "This model cannot call tools; answer from what you already know.", example: "" };
  }
}

/**
 * Return the structured calls the backend returned (`nativeCalls`, collected
 * from the stream's `message.tool_calls`) or, when there are none, the calls
 * parsed from the text. Never both: a backend that returns a call natively and
 * also leaves its tokens in the text must not run a side-effecting call twice.
 */
export function parseAgentToolCalls(
  text: string,
  format: ToolFormatName = "gemma4-xml",
  nativeCalls: readonly LLMToolCall[] = [],
): { results: ParseResult[]; hasAny: boolean } {
  const native: ParseResult[] = nativeCalls.map((c) => ({
    ok: true,
    call: {
      tool: c.function.name as ToolName,
      id: randomUUID(),
      parameters: c.function.arguments,
    },
  }));
  if (native.length > 0) return { results: native, hasAny: true };
  return parseTextToolCalls(text, format);
}

function parseTextToolCalls(
  text: string,
  format: ToolFormatName,
): { results: ParseResult[]; hasAny: boolean } {
  if (format === "gemma4-xml") {
    return parseGemma(text);
  }
  const parsed = getToolCallFormat(format).parse(text);
  const results: ParseResult[] = parsed.map((p) => ({
    ok: true,
    call: {
      tool: p.name as ToolName,
      id: randomUUID(),
      parameters: p.args,
    },
  }));
  return { results, hasAny: parsed.length > 0 };
}

export function stripAgentToolCalls(
  text: string,
  format: ToolFormatName = "gemma4-xml",
): string {
  if (format === "gemma4-xml") {
    return stripGemma(text);
  }
  let out = text;
  for (const p of getToolCallFormat(format).parse(text)) {
    out = out.split(p.raw).join("");
  }
  return out.trim();
}
