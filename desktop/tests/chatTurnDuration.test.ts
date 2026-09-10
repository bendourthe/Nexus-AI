/**
 * v2.4.9 -- "apply the display of the generation time for all modes".
 *
 * Chat is stamped centrally in `completeTurn`, which is the only place that
 * knows both ends of the turn. These lock that in so a future caller cannot
 * quietly drop the measurement.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  beginTurn,
  completeTurn,
  resetChatTurns,
  subscribeCompletedTurns,
} from "../src/modules/chat/chatTurns";
import type { ChatMessage } from "../src/shared/chat/types";

const pending: ChatMessage = {
  id: "a1",
  role: "assistant",
  content: "",
  pending: true,
};

describe("chat turn duration", () => {
  beforeEach(() => {
    resetChatTurns();
    vi.useRealTimers();
  });

  it("stamps the measured wall-clock cost onto the completed reply", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-09T20:00:00Z"));
    beginTurn("c1", pending);
    vi.setSystemTime(new Date("2026-09-09T20:00:07Z"));

    const seen: ChatMessage[] = [];
    const stop = subscribeCompletedTurns((turn) => seen.push(turn.message));
    completeTurn({
      chatId: "c1",
      assistantId: "a1",
      message: { id: "a1", role: "assistant", content: "hi" },
    });
    stop();

    expect(seen).toHaveLength(1);
    expect(seen[0]?.generationSeconds).toBe(7);
  });

  it("does not overwrite a duration the caller already measured", () => {
    beginTurn("c1", pending);
    const seen: ChatMessage[] = [];
    const stop = subscribeCompletedTurns((turn) => seen.push(turn.message));
    completeTurn({
      chatId: "c1",
      assistantId: "a1",
      message: { id: "a1", role: "assistant", content: "hi", generationSeconds: 99 },
    });
    stop();
    expect(seen[0]?.generationSeconds).toBe(99);
  });

  it("leaves an orphaned completion alone rather than inventing a time", () => {
    // No beginTurn: nothing knows when this started.
    const seen: ChatMessage[] = [];
    const stop = subscribeCompletedTurns((turn) => seen.push(turn.message));
    completeTurn({
      chatId: "ghost",
      assistantId: "a1",
      message: { id: "a1", role: "assistant", content: "hi" },
    });
    stop();
    expect(seen[0]?.generationSeconds).toBeUndefined();
  });
});
