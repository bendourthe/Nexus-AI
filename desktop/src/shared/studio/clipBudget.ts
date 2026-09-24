/**
 * v2.4.11 -- refuse a clip the runtime cannot finish, before it is started.
 *
 * Operator report: a 10-second 24 fps clip on Wan 2.1 T2V 1.3B ran to the
 * 30-minute request limit and came back as "the video took longer than the
 * time limit and was stopped". That request was never viable: 10 s at 24 fps
 * is 240 frames, and this model samples every one of them. The user spent
 * half an hour to be told to try something smaller.
 *
 * The same cost model that powers the on-screen estimate can say so up front,
 * in one sentence, with the two numbers that decide it. A guess is allowed to
 * be wrong -- so this only blocks a request whose ESTIMATE alone exceeds the
 * limit, which is a margin no correction closes.
 */

import {
  estimateGenerationSeconds,
  formatDuration,
} from "../chat/generationProgress";

/** The sidecar's per-generation request timeout (30 minutes). */
export const GENERATION_TIMEOUT_SECONDS = 1_800;

export interface ClipCost {
  readonly width: number;
  readonly height: number;
  readonly steps: number;
  readonly durationSeconds: number;
  readonly fps: number;
  /** Frames per chained segment, when the page splits long clips. */
  readonly segmentFrames?: number | undefined;
}

/**
 * The refusal text for a clip that cannot finish, or null when it can.
 *
 * The message names what was asked for, what it would cost, and the two dials
 * that change it -- so the next attempt is an informed one rather than a
 * shorter guess.
 */
export function clipBudgetRefusal(cost: ClipCost): string | null {
  const frames = Math.max(1, Math.round(cost.durationSeconds * cost.fps));
  // A chained clip is generated one segment at a time, so the limit applies
  // per segment, not to the whole clip.
  const perRun = Math.max(1, Math.min(frames, cost.segmentFrames ?? frames));
  const seconds = estimateGenerationSeconds({
    pillar: "video",
    width: cost.width,
    height: cost.height,
    steps: cost.steps,
    frames: perRun,
  });
  if (seconds <= GENERATION_TIMEOUT_SECONDS) return null;
  const asked = `${cost.durationSeconds} seconds at ${cost.fps} fps (${frames} frames)`;
  return (
    `This clip would take about ${formatDuration(seconds)} to generate, past the ` +
    `${formatDuration(GENERATION_TIMEOUT_SECONDS)} limit, so it would be stopped ` +
    `before it finished. You asked for ${asked} at ${cost.width}x${cost.height} ` +
    `with ${cost.steps} steps. Lower the duration or the frame rate first: both ` +
    `cut the work in direct proportion.`
  );
}
