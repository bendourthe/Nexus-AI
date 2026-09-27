/**
 * Reversible compaction. Recent turns stay byte-identical. A failed summary
 * leaves the thread untouched. Undo restores the last snapshot.
 */

import { CompactionLease } from "./compactionLease.js";

export const COMPACTION_KEEP_RECENT = 10;
export const MAX_COMPACTION_SNAPSHOTS = 1;

export interface CompactMessage {
  readonly id: string;
  readonly role: string;
  readonly content: string;
}

export type CompactResult<T extends CompactMessage> =
  | { readonly ok: true; readonly messages: readonly T[]; readonly summary: string }
  | { readonly ok: false; readonly reason: string; readonly messages: readonly T[] };

export function compactThread<T extends CompactMessage>(input: {
  readonly messages: readonly T[];
  readonly baseline: readonly T[];
  readonly streaming: boolean;
  readonly lease: CompactionLease;
  readonly actor: string;
  readonly summarise: (older: readonly T[]) => string;
  readonly keepRecent?: number;
}): CompactResult<T> {
  const keepRecent = input.keepRecent ?? COMPACTION_KEEP_RECENT;
  if (input.streaming) {
    return { ok: false, reason: "a reply is still streaming", messages: input.messages };
  }
  if (input.messages.length <= keepRecent) {
    return { ok: false, reason: "the thread is too short to compact", messages: input.messages };
  }
  if (!sameThread(input.baseline, input.messages)) {
    return {
      ok: false,
      reason: "the thread changed since the snapshot",
      messages: input.messages,
    };
  }
  const acquired = input.lease.tryAcquire(input.actor);
  if (!acquired.ok) {
    return { ok: false, reason: acquired.reason, messages: input.messages };
  }
  const older = input.messages.slice(0, -keepRecent);
  const recent = input.messages.slice(-keepRecent);
  let summary: string;
  try {
    summary = input.summarise(older);
  } catch (err) {
    input.lease.release(input.actor);
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "compaction failed",
      messages: input.messages,
    };
  }
  if (!sameThread(input.baseline, input.messages)) {
    input.lease.release(input.actor);
    return {
      ok: false,
      reason: "the thread changed since the snapshot",
      messages: input.messages,
    };
  }
  const summaryMessage = {
    ...older[0],
    id: `summary-${older[0]?.id ?? "thread"}`,
    role: "assistant",
    content: summary,
  } as T;
  input.lease.release(input.actor);
  return { ok: true, messages: [summaryMessage, ...recent], summary };
}

export function undoCompaction<T>(current: readonly T[], snapshot: readonly T[] | null): readonly T[] {
  if (!snapshot) return current;
  return snapshot;
}

function sameThread<T extends CompactMessage>(left: readonly T[], right: readonly T[]): boolean {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index]?.id !== right[index]?.id || left[index]?.content !== right[index]?.content) {
      return false;
    }
  }
  return true;
}
