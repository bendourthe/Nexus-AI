/**
 * v2.11.0 -- assemble OpenAI-compatible streamed tool calls.
 *
 * `/v1/chat/completions` streams a call as `delta.tool_calls[]` fragments keyed
 * by `index`: the name arrives once, the JSON argument string arrives in
 * pieces. LM Studio and the headless OpenAI client both send `tools`, so both
 * must keep these calls; before v2.11.0 they read `delta.content` only and
 * dropped every native call.
 */

import type { LLMToolCall } from "./types.js";

export interface OpenAiToolCallDelta {
  readonly index?: number;
  readonly function?: { readonly name?: string; readonly arguments?: string };
}

export class OpenAiToolCallAccumulator {
  private readonly _calls = new Map<number, { name: string; args: string }>();

  add(deltas: readonly OpenAiToolCallDelta[] | undefined): void {
    for (const d of deltas ?? []) {
      const index = d.index ?? 0;
      const entry = this._calls.get(index) ?? { name: "", args: "" };
      // The name arrives whole; setting it (not appending) keeps a server that
      // repeats it in every fragment from producing "read_fileread_file".
      if (d.function?.name) entry.name = d.function.name;
      if (d.function?.arguments) entry.args += d.function.arguments;
      this._calls.set(index, entry);
    }
  }

  /**
   * The completed calls in index order. A call whose arguments are not a JSON
   * object keeps an empty argument record, so the tool's own validation
   * reports the problem instead of the stream failing.
   */
  drain(): LLMToolCall[] {
    const out: LLMToolCall[] = [];
    for (const [, c] of [...this._calls.entries()].sort(([a], [b]) => a - b)) {
      if (!c.name) continue;
      let args: Record<string, unknown> = {};
      try {
        const parsed: unknown = c.args.trim() ? JSON.parse(c.args) : {};
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          args = parsed as Record<string, unknown>;
        }
      } catch {
        // Keep the empty record; see the doc comment.
      }
      out.push({ function: { name: c.name, arguments: args } });
    }
    this._calls.clear();
    return out;
  }
}
