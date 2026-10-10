/** Messages are selected only by caller-owned positions, never by their content. */
interface ElidableMessage {
  readonly content: string;
  readonly tool_name?: string;
}

export interface ToolResultElision<T> {
  readonly messages: T[];
  readonly elided: number;
  readonly charactersSaved: number;
}

/** Replace old results without removing their messages or native call metadata. */
export function elideToolResults<T extends ElidableMessage>(
  messages: readonly T[],
  toolResultIndices: readonly number[],
  protectedIndices: readonly number[],
  targetTokens: number,
  estimate: (messages: readonly T[]) => number,
): ToolResultElision<T> {
  const result = [...messages];
  const protectedSet = new Set(protectedIndices);
  const oldestFirst = [...new Set(toolResultIndices)].sort((a, b) => a - b);
  let elided = 0;
  let charactersSaved = 0;
  for (const index of oldestFirst) {
    if (estimate(result) < targetTokens) break;
    if (!Number.isInteger(index) || index < 0 || protectedSet.has(index)) continue;
    const message = result[index];
    if (!message) continue;
    const content = `[earlier ${message.tool_name ?? "tool"} result elided to save context; call the tool again if you need it]`;
    const saved = message.content.length - content.length;
    if (saved <= 0) continue;
    result[index] = { ...message, content };
    charactersSaved += saved;
    elided += 1;
  }
  return { messages: result, elided, charactersSaved };
}
