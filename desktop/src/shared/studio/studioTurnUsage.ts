/**
 * v2.2.7 Phase 2 -- persist usage on Image/Video studio turns.
 *
 * User prompts are estimated (labeled Estimate). A successful assistant
 * mediaRef counts as one visual unit. Failed generates, unreadable last
 * output, and 1x1 stubs (never given a mediaRef) count as zero.
 */

import { estimateTokens } from "../../../../core/chat/sessionContextUsage";

export function studioPersistUsage(input: {
  role: "user" | "assistant";
  content: string;
  mediaRef?: string | null;
}): {
  inputTokens?: number;
  tokensEstimated?: boolean;
  visualUnits: number;
} {
  if (input.role === "user") {
    return {
      inputTokens: estimateTokens(input.content),
      tokensEstimated: true,
      visualUnits: 0,
    };
  }
  return { visualUnits: input.mediaRef ? 1 : 0 };
}

/**
 * v2.4.9 -- wall-clock seconds since a job started, or undefined.
 *
 * Feeds `ChatMessage.generationSeconds`, which the bubble renders in brackets
 * after the timestamp so a ten-minute video reads as ten minutes.
 */
export function elapsedSecondsSince(startedAtMs: number | undefined): number | undefined {
  if (typeof startedAtMs !== "number" || !Number.isFinite(startedAtMs)) return undefined;
  const seconds = (Date.now() - startedAtMs) / 1000;
  return seconds >= 0 ? seconds : undefined;
}
