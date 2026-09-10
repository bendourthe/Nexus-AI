/**
 * v2.2.9 Phase 2.1 (T006) -- pending-orb caption rotator.
 *
 * While a chat/agents reply is pending, the orb pill cycles captions from a
 * fixed list (Thinking / Searching / Working / Solving), shuffled once per
 * pending bubble, then rotated on a steady interval. Reverse-engineered from
 * the thinking-orbs reference grammar (dark pill + particle orb + cycling
 * label); no `thinking-orbs` package import.
 */

import { useEffect, useState } from "react";
import type { AgentState } from "./mapping";

/** Fixed caption list. Order here is the reduced-motion "first caption". */
export const PENDING_CAPTIONS = [
  "Thinking...",
  "Searching...",
  "Working...",
  "Solving...",
] as const;

export type PendingCaption = (typeof PENDING_CAPTIONS)[number];

/** Longest rotating caption; drives a constant pill min-width. */
export function longestPendingCaption(): PendingCaption {
  return PENDING_CAPTIONS.reduce((a, b) => (a.length >= b.length ? a : b));
}


export function pendingPillMinWidthExpr(orbPx: number): string {
  const captionCh = longestPendingCaption().length;
  return `calc(${orbPx}px + var(--space-2) + ${captionCh}ch + (2 * var(--space-3)))`;
}

/** ~2-3s per caption; slow enough not to read as a flicker. */
export const CAPTION_ROTATE_INTERVAL_MS = 2400;

/**
 * Fisher-Yates shuffle of the fixed caption list. Pure: returns a new array,
 * never mutates `PENDING_CAPTIONS`. `rand` is injectable for tests.
 */
export function shufflePendingCaptions(rand: () => number = Math.random): PendingCaption[] {
  const order: PendingCaption[] = [...PENDING_CAPTIONS];
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const a = order[i];
    const b = order[j];
    if (a === undefined || b === undefined) continue;
    order[i] = b;
    order[j] = a;
  }
  return order;
}

/**
 * Each caption drives the matching orb motion grammar so the particles and
 * the word agree ("Searching..." sweeps, "Solving..." spirals inward).
 * "Thinking..." has no dedicated state; composing is the streaming default.
 */
export function pendingCaptionState(caption: PendingCaption): AgentState {
  switch (caption) {
    case "Searching...":
      return "searching";
    case "Working...":
      return "working";
    case "Solving...":
      return "solving";
    default:
      return "composing";
  }
}

/**
 * React hook: shuffle once per mount (one pending bubble = one mount), then
 * advance through that fixed order every `CAPTION_ROTATE_INTERVAL_MS` while
 * `active`. When inactive (reduced motion, or rotation not requested) no
 * interval is scheduled and the first fixed caption is returned.
 */
export function usePendingCaptionRotator(active: boolean): PendingCaption {
  return useCaptionRotator(active, "chat") as PendingCaption;
}

/**
 * v2.4.4 Phase 5.3 (T020) -- Image and Video pending captions.
 *
 * Studio pending showed a single static "Shaping...", which reads as a stuck
 * word during a job that can take minutes; a rotating caption is the second
 * half (with the orb animation) of the signal that work is still happening.
 * The chat pool stays separate because its words describe reasoning, not
 * rendering. Order here is the reduced-motion "first caption".
 */
export const STUDIO_PENDING_CAPTIONS = [
  "Creating...",
  "Crafting...",
  "Generating...",
  // v2.4.8 follow-up: a wider pool, and the rotator now picks at random on
  // every tick (never the same word twice in a row) instead of walking one
  // shuffled order that repeated identically every loop.
  "Rendering...",
  "Composing...",
  "Imagining...",
  "Refining...",
  "Sketching...",
  "Polishing...",
] as const;

export type StudioPendingCaption = (typeof STUDIO_PENDING_CAPTIONS)[number];

/** Longest studio caption; drives a constant width so the word cannot jitter. */
export function longestStudioCaption(): StudioPendingCaption {
  return STUDIO_PENDING_CAPTIONS.reduce((a, b) => (a.length >= b.length ? a : b));
}

export function shuffleStudioCaptions(
  rand: () => number = Math.random,
): StudioPendingCaption[] {
  const order: StudioPendingCaption[] = [...STUDIO_PENDING_CAPTIONS];
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const a = order[i];
    const b = order[j];
    if (a === undefined || b === undefined) continue;
    order[i] = b;
    order[j] = a;
  }
  return order;
}

/**
 * Studio rotator: one random order per pending bubble, looped.
 *
 * v2.4.8 follow-up (2026-09-07): a fresh random pick on every tick could
 * revisit words unevenly and repeat one soon after showing it. A prompt now
 * shuffles the pool once and walks that order, so every word appears before
 * any repeats and the next prompt gets a different order.
 */
export function useStudioCaptionRotator(active: boolean): StudioPendingCaption {
  return useCaptionRotator(active, "studio") as StudioPendingCaption;
}

/**
 * v2.4.8 follow-up (2026-09-08) -- one rotator, two word pools.
 *
 * Operator report: the studios showed the same rotating word whether the GPU
 * was loading weights or sampling, so the two phases were indistinguishable.
 * Rotation now belongs to the generating phase alone, and the pill that chat
 * and Agents already use is the shared animation for it -- Images and Videos
 * pass the studio pool instead of the chat pool rather than getting a
 * different animation.
 */
export type CaptionPool = "chat" | "studio";

export type RotatingCaption = PendingCaption | StudioPendingCaption;

export function captionsFor(pool: CaptionPool): readonly RotatingCaption[] {
  return pool === "studio" ? STUDIO_PENDING_CAPTIONS : PENDING_CAPTIONS;
}

/** Longest caption in this pool; drives a constant width so words cannot jitter. */
export function longestCaptionFor(pool: CaptionPool): RotatingCaption {
  return pool === "studio" ? longestStudioCaption() : longestPendingCaption();
}

export function pillMinWidthExpr(orbPx: number, pool: CaptionPool): string {
  const captionCh = longestCaptionFor(pool).length;
  return `calc(${orbPx}px + var(--space-2) + ${captionCh}ch + (2 * var(--space-3)))`;
}

/**
 * Orb motion grammar for a rotating caption. Chat words each drive their own
 * state; every studio word is the same act of forming an output, so they all
 * shape.
 */
export function rotatingCaptionState(caption: RotatingCaption): AgentState {
  if ((STUDIO_PENDING_CAPTIONS as readonly string[]).includes(caption)) return "shaping";
  return pendingCaptionState(caption as PendingCaption);
}

/**
 * React hook: shuffle the pool once per mount, then walk that order every
 * `CAPTION_ROTATE_INTERVAL_MS` while `active`, so every word appears before
 * any repeats. Inactive returns the pool's first fixed caption and schedules
 * no interval (the reduced-motion path).
 */
export function useCaptionRotator(active: boolean, pool: CaptionPool): RotatingCaption {
  const [order] = useState<RotatingCaption[]>(() =>
    pool === "studio" ? shuffleStudioCaptions() : shufflePendingCaptions(),
  );
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % order.length);
    }, CAPTION_ROTATE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [active, order.length]);

  const first = captionsFor(pool)[0] as RotatingCaption;
  if (!active) return first;
  return order[index % order.length] ?? first;
}

/** True for the two studio activities that render media rather than text. */
export function isStudioActivity(activity: string): boolean {
  return activity === "image-generation" || activity === "video-generation";
}
