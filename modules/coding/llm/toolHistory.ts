import type { LLMMessage } from "./types.js";

/** Convert coding history at the provider boundary; persistence keeps the legacy shape. */
export function toRequestMessages(
  history: readonly LLMMessage[],
  shape: "ollama" | "legacy",
): LLMMessage[] {
  const pending = new Map<string, string>();
  const seen = new Set<string>();
  for (const message of history) {
    if (message.tool_calls?.length) {
      if (message.role !== "assistant" || pending.size) throw new Error("Incomplete native tool-call group.");
      for (const call of message.tool_calls) {
        if (!call.id || seen.has(call.id)) throw new Error("Missing or duplicate native tool-call id.");
        seen.add(call.id);
        pending.set(call.id, call.function.name);
      }
    }
    if (message.role === "tool") {
      const id = message.tool_call_id;
      if (!id || !pending.has(id) || pending.get(id) !== message.tool_name) {
        throw new Error("Orphan or mismatched native tool result.");
      }
      pending.delete(id);
    }
  }
  if (pending.size) throw new Error("Incomplete native tool-call group.");
  return history.map((message) => ({
    role: shape === "legacy" && message.role === "tool" ? "user" : message.role,
    content: message.content,
    ...(message.images ? { images: message.images } : {}),
    ...(shape === "ollama" && message.tool_calls ? { tool_calls: message.tool_calls } : {}),
    ...(shape === "ollama" && message.role === "tool"
      ? { tool_name: message.tool_name, tool_call_id: message.tool_call_id }
      : {}),
  }));
}

/** Keep or drop a native assistant batch and its results together, by identifiers only. */
export function expandToolPairIndices(
  messages: readonly LLMMessage[],
  selected: ReadonlySet<number>,
): Set<number> {
  const expanded = new Set(selected);
  const groups = toolPairGroups(messages);
  const visited = new Set<readonly number[]>();
  for (const index of selected) {
    const group = groups.get(index);
    if (!group || visited.has(group)) continue;
    visited.add(group);
    for (const member of group) expanded.add(member);
  }
  return expanded;
}

/** Index native batches once so repeated trim candidates do not rescan the history. */
export function toolPairGroups(messages: readonly LLMMessage[]): ReadonlyMap<number, readonly number[]> {
  const groups: number[][] = [];
  const callGroups = new Map<string, number[]>();
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    if (message?.role === "assistant" && message.tool_calls?.length) {
      const group = [i];
      groups.push(group);
      for (const call of message.tool_calls) if (call.id) callGroups.set(call.id, group);
    } else if (message?.role === "tool" && message.tool_call_id) {
      callGroups.get(message.tool_call_id)?.push(i);
    }
  }
  const byIndex = new Map<number, readonly number[]>();
  for (const group of groups) for (const index of group) byIndex.set(index, group);
  return byIndex;
}
