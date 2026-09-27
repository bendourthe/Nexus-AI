import { describe, expect, it } from "vitest";
import { accountContext } from "../../../core/chat/contextAccounting.js";
import { CompactionLease } from "../../../core/chat/compactionLease.js";
import { compactThread, undoCompaction, type CompactMessage } from "../../../core/chat/compactionSnapshot.js";

function messages(count: number): CompactMessage[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `m${index}`,
    role: index % 2 === 0 ? "user" : "assistant",
    content: `body-${index}`,
  }));
}

describe("context accounting", () => {
  it("keeps known plus unaccounted equal to the total and never coerces unknown to zero", () => {
    const account = accountContext({
      categories: [
        { name: "prompt", tokens: 30 },
        { name: "tools", tokens: null },
      ],
      observedTotal: 50,
      windowTokens: 100,
      cacheRead: 12,
      cacheCreation: 4,
    });
    expect(account.lines.find((line) => line.name === "tools")?.tokens).toBe("unknown");
    expect(account.known + account.unaccounted).toBe(account.total);
    expect(account.unaccounted).toBe(20);
    expect(account.cacheRead).toBe(12);
    expect(account.total).toBe(50);
  });

  it("hides an empty thread, clamps remaining at the window, and hides when the total is unknown", () => {
    const empty = accountContext({
      categories: [{ name: "prompt", tokens: 0 }],
      observedTotal: 0,
      windowTokens: 100,
    });
    expect(empty.visible).toBe(false);
    expect(empty.remaining).toBe(100);

    const exact = accountContext({
      categories: [{ name: "prompt", tokens: 100 }],
      observedTotal: 100,
      windowTokens: 100,
    });
    expect(exact.remaining).toBe(0);
    expect(exact.visible).toBe(true);

    const over = accountContext({
      categories: [{ name: "prompt", tokens: 101 }],
      observedTotal: 101,
      windowTokens: 100,
    });
    expect(over.remaining).toBe(0);

    const hidden = accountContext({
      categories: [{ name: "prompt", tokens: null }],
      observedTotal: null,
      windowTokens: 100,
    });
    expect(hidden.total).toBeNull();
    expect(hidden.visible).toBe(false);
  });
});

describe("compaction lease and undo", () => {
  it("rejects a second holder and expires after a crash", () => {
    let now = 0;
    const lease = new CompactionLease(() => now, 1000);
    expect(lease.tryAcquire("auto").ok).toBe(true);
    const rejected = lease.tryAcquire("user");
    expect(rejected.ok).toBe(false);
    now = 1000;
    expect(lease.tryAcquire("user").ok).toBe(true);
  });

  it("preserves recent turns, aborts on failure, declines while streaming, and undoes", () => {
    const lease = new CompactionLease(() => 0, 1000);
    const thread = messages(12);
    const streaming = compactThread({
      messages: thread,
      baseline: thread,
      streaming: true,
      lease,
      actor: "user",
      summarise: () => "summary",
    });
    expect(streaming.ok).toBe(false);
    if (!streaming.ok) expect(streaming.reason).toMatch(/streaming/);

    const tooShort = compactThread({
      messages: messages(4),
      baseline: messages(4),
      streaming: false,
      lease,
      actor: "user",
      summarise: () => "summary",
    });
    expect(tooShort.ok).toBe(false);

    const failed = compactThread({
      messages: thread,
      baseline: thread,
      streaming: false,
      lease,
      actor: "user",
      summarise: () => {
        throw new Error("summariser down");
      },
    });
    expect(failed.ok).toBe(false);
    expect(failed.messages).toEqual(thread);

    const changed = compactThread({
      messages: [...thread, { id: "new", role: "user", content: "late" }],
      baseline: thread,
      streaming: false,
      lease,
      actor: "user",
      summarise: () => "summary",
    });
    expect(changed.ok).toBe(false);
    if (!changed.ok) expect(changed.reason).toMatch(/changed/);

    const done = compactThread({
      messages: thread,
      baseline: thread,
      streaming: false,
      lease,
      actor: "user",
      summarise: () => "summary",
    });
    expect(done.ok).toBe(true);
    if (done.ok) {
      expect(done.messages.slice(-10)).toEqual(thread.slice(-10));
      expect(undoCompaction(done.messages, thread)).toEqual(thread);
    }
  });
});
