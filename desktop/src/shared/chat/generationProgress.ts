/**
 * v2.4.8 follow-up (2026-09-07) -- how far along a generation is, in words.
 *
 * Operator report: a Wan video sat on "Crafting..." for fifteen minutes with
 * nothing to say whether it was working or wedged. A job now reports its
 * sampling steps, so the bar and the estimate below it are measured rather
 * than guessed: the remaining time comes from this run's own step rate. The
 * up-front figure (shown before the first step lands) is a cost model, and it
 * is replaced by the measured one as soon as there is a rate to measure.
 *
 * v2.4.8 follow-up (2026-09-08): loading a model and generating an output are
 * two phases with two clocks, and mixing them is what made the wait unreadable
 * -- a video job showed the whole-job figure ("about 18 min") while it was
 * still loading weights, so the number looked like it described the load. Each
 * phase now carries its own estimate, its own measured remaining time and its
 * own wording, and `mergeProgress` keeps a phase from sliding backwards when a
 * bare liveness heartbeat arrives with no counters on it.
 */

import type { ChatMessage } from "./types";

type Progress = NonNullable<ChatMessage["progress"]>;

/**
 * Rough cost model, calibrated on the operator's RTX 3080 Ti laptop from two
 * real runs: RealVisXL at 1024x1024 x 14 steps took 64 s end to end, and Wan
 * 2.1 T2V 1.3B at 854x480 x 96 frames x 30 steps ran past 17 minutes. It is a
 * starting figure for one GPU class, not a promise -- the live estimate from
 * the measured step rate supersedes it within a step or two.
 */
export const MODEL_LOAD_SECONDS = 25;
/**
 * Weights-to-VRAM rate behind the up-front load figure, calibrated on the same
 * host: RealVisXL (about 7 GB) was still loading at 0:15 and sampling before
 * 0:30. Superseded by the runtime's own estimate within a tick or two.
 */
export const MODEL_LOAD_GB_PER_SECOND = 0.25;
export const IMAGE_SECONDS_PER_STEP_MP = 2.6;
export const VIDEO_SECONDS_PER_STEP_MP_FRAME = 0.9;

export interface GenerationCost {
  readonly pillar: "image" | "video";
  readonly width: number;
  readonly height: number;
  readonly steps: number;
  /** Video only: total frames sampled. */
  readonly frames?: number;
}

/**
 * Seconds the sampling phase of a job this shape usually takes.
 *
 * Sampling only: the model load is its own phase with its own estimate, and
 * adding the two produced a figure that described neither.
 */
export function estimateGenerationSeconds(cost: GenerationCost): number {
  const megapixels = Math.max(0, (cost.width * cost.height) / 1_000_000);
  const steps = Math.max(0, cost.steps);
  const sampling =
    cost.pillar === "video"
      ? steps * megapixels * Math.max(1, cost.frames ?? 1) * VIDEO_SECONDS_PER_STEP_MP_FRAME
      : steps * megapixels * IMAGE_SECONDS_PER_STEP_MP;
  return Math.round(sampling);
}

/**
 * Seconds a model of this size usually takes to reach the GPU. `vramGB` is the
 * model's footprint when the caller knows it (the chat registry publishes one);
 * without it, the measured figure for a mid-size diffusion model.
 */
export function estimateModelLoadSeconds(vramGB?: number | null): number {
  if (typeof vramGB !== "number" || !Number.isFinite(vramGB) || vramGB <= 0) {
    return MODEL_LOAD_SECONDS;
  }
  return Math.max(5, Math.round(vramGB / MODEL_LOAD_GB_PER_SECOND));
}

/** "45 s" / "3 min" / "1 h 5 min". Rounded, never false-precise. */
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  if (total < 60) return `${Math.max(1, total)} s`;
  const minutes = Math.round(total / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

/** "0:07" / "4:12" / "1:02:30" -- a running clock, always exact. */
export function formatElapsed(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const s = String(total % 60).padStart(2, "0");
  const m = Math.floor(total / 60);
  if (m < 60) return `${m}:${s}`;
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}:${s}`;
}

/**
 * The four phases a pending job moves through, in order. A job may skip any
 * of the first three, but it never slides back to an earlier one.
 */
export type JobPhase = "queued" | "clearing" | "loading" | "generating";

const PHASE_RANK: Record<JobPhase, number> = {
  queued: 0,
  clearing: 1,
  loading: 2,
  generating: 3,
};

/**
 * Which phase this message is in.
 *
 * A studio job with nothing reported yet is loading: the GPU is reading
 * weights before the first sample. A chat turn is only loading when the model
 * watch says so -- silence on a chat turn means thinking, never loading.
 */
export function jobPhase(progress: Progress | undefined, studio: boolean): JobPhase {
  const stage = progress?.stage;
  if (stage === "queued") return "queued";
  if (stage === "clearing") return "clearing";
  if (progress && progress.step > 0) return "generating";
  if (stage === "loading") return "loading";
  if (!progress && studio) return "loading";
  return "generating";
}

/** True for the phases that happen before sampling starts. */
export function isPreGeneration(phase: JobPhase): boolean {
  return phase !== "generating";
}

/**
 * Fraction 0-1 of the current phase, or null when nothing is countable.
 *
 * Steps measure the generating phase and weight bytes measure the load, so a
 * completed byte count is never allowed to stand in as a full sampling bar --
 * that is what left a video on a full bar the moment sampling began.
 */
export function phaseFraction(progress: Progress | undefined): number | null {
  if (!progress) return null;
  if (progress.total > 0 && progress.step > 0) {
    return Math.min(1, progress.step / progress.total);
  }
  if (progress.stage === "generating") return null;
  if (progress.totalBytes && progress.totalBytes > 0) {
    const loaded = progress.loadedBytes ?? 0;
    return Math.min(1, Math.max(0, loaded / progress.totalBytes));
  }
  return null;
}

/**
 * Seconds until the weights are all read, measured from the load's own rate.
 *
 * Used when the runtime publishes no estimate of its own (the chat model watch
 * reports a percent but no time). Null before there is anything to divide.
 */
export function loadEtaSeconds(
  fraction: number | null,
  elapsedSeconds: number | null,
): number | null {
  if (fraction === null || fraction <= 0 || fraction >= 1) return null;
  if (elapsedSeconds === null || elapsedSeconds <= 0) return null;
  return Math.max(0, Math.round(elapsedSeconds / fraction - elapsedSeconds));
}

/** The counter fields a runtime `progress` notification may carry. */
export interface ProgressEventFields {
  readonly stage?: string | undefined;
  readonly step?: number | undefined;
  readonly totalSteps?: number | undefined;
  readonly loadedBytes?: number | undefined;
  readonly totalBytes?: number | undefined;
  readonly etaS?: number | null | undefined;
  readonly blockedBy?: string | undefined;
  readonly detail?: string | undefined;
}

/**
 * Fold one runtime event into the progress a bubble already shows.
 *
 * Operator report (2026-09-08): the bar and the step line appeared and
 * disappeared for the whole of a run. The cause was the liveness heartbeat --
 * it carries no stage and no counters, and the shell wrote its absent step
 * straight over the counted one, so every second beat erased the measurement
 * and the phase flipped back. A merge only ever moves forward: the phase never
 * regresses, an event without counters leaves the counters alone, and the load
 * byte counters are dropped once sampling starts so they cannot be read as
 * sampling progress.
 */
export function mergeProgress(
  prev: Progress | undefined,
  event: ProgressEventFields,
): Progress {
  const prevStage = (prev?.stage ?? undefined) as JobPhase | undefined;
  const eventStage = (event.stage ?? undefined) as JobPhase | undefined;
  const known = (value: JobPhase | undefined): value is JobPhase =>
    value !== undefined && value in PHASE_RANK;
  let stage: JobPhase | undefined = known(prevStage) ? prevStage : undefined;
  if (known(eventStage) && (stage === undefined || PHASE_RANK[eventStage] >= PHASE_RANK[stage])) {
    stage = eventStage;
  }

  const eventStep = event.step ?? 0;
  const eventTotal = event.totalSteps ?? 0;
  let step = prev?.step ?? 0;
  let total = prev?.total ?? 0;
  if (eventTotal > 0 && eventTotal !== total) {
    // A new total means a new sampling pass; count it from where it says.
    total = eventTotal;
    step = eventStep;
  } else if (eventStep > 0) {
    step = Math.max(step, eventStep);
    if (eventTotal > 0) total = eventTotal;
  }
  if (step > 0 && (stage === undefined || PHASE_RANK[stage] < PHASE_RANK.generating)) {
    stage = "generating";
  }

  const generating = stage === "generating";
  const bytes =
    generating
      ? {}
      : typeof event.totalBytes === "number"
        ? {
            loadedBytes: event.loadedBytes ?? 0,
            totalBytes: event.totalBytes,
            ...(event.etaS === undefined ? {} : { etaS: event.etaS }),
          }
        : {
            ...(prev?.totalBytes === undefined ? {} : { totalBytes: prev.totalBytes }),
            ...(prev?.loadedBytes === undefined ? {} : { loadedBytes: prev.loadedBytes }),
            ...(prev?.etaS === undefined ? {} : { etaS: prev.etaS }),
          };

  const waiting = stage === "queued" || stage === "clearing";
  const blockedBy = event.blockedBy ?? prev?.blockedBy;
  const detail = event.detail ?? prev?.detail;
  return {
    step,
    total,
    ...(stage === undefined ? {} : { stage }),
    ...bytes,
    ...(waiting && blockedBy ? { blockedBy } : {}),
    ...(waiting && detail ? { detail } : {}),
  };
}

/**
 * Seconds left, measured from this run's own step rate.
 *
 * `elapsedSeconds` is time spent sampling (not the whole job), so the rate is
 * this model on this GPU at these settings. Null until a step has completed.
 */
export function stepEtaSeconds(
  progress: Progress | undefined,
  elapsedSeconds: number,
): number | null {
  if (!progress || progress.total <= 0 || progress.step <= 0) return null;
  if (elapsedSeconds <= 0) return null;
  const done = Math.min(progress.step, progress.total);
  if (done >= progress.total) return 0;
  const perStep = elapsedSeconds / done;
  return Math.round(perStep * (progress.total - done));
}

/**
 * Fixed track width for every generation bar in the app.
 *
 * Operator report: the bar "appears at different width during the process".
 * It used to be `${widest}ch`, computed from the longest caption under it, so
 * every wording change resized it. One constant, one width, every tab.
 */
export const PROGRESS_BAR_MAX_WIDTH = "22rem";

export interface ProgressLines {
  /** Step or load position plus the time left, when either is known. */
  readonly primary: string | null;
  /** The running clock, with the up-front estimate while nothing is measured. */
  readonly secondary: string | null;
  /**
   * v2.4.9: the same figures, split so the bar can put them on ONE row --
   * elapsed on the left, remaining on the right -- instead of stacking two
   * centered lines. `primary` / `secondary` stay for callers wanting prose.
   */
  readonly elapsed: string | null;
  readonly remaining: string | null;
  /** Step position alone ("Step 12 of 30"), without the time left. */
  readonly position: string | null;
  /** The up-front cost-model line, shown only while nothing is measured. */
  readonly hint: string | null;
}

/**
 * The two lines under the bar, worded for the phase they describe.
 *
 * `phaseElapsed` is time spent in THIS phase, so a rate measured from it
 * belongs to this phase alone: a load estimate is never diluted by sampling
 * time and a sampling estimate never includes the model load. `estimateSeconds`
 * is the up-front figure for this phase and is dropped the moment there is a
 * measured one.
 */
export function progressLines(input: {
  readonly progress: Progress | undefined;
  readonly phase: JobPhase;
  readonly phaseElapsed: number | null;
  readonly estimateSeconds?: number | undefined;
}): ProgressLines {
  const { progress, phase, phaseElapsed, estimateSeconds } = input;
  const parts: string[] = [];
  let measured = false;
  let position: string | null = null;
  let remaining: string | null = null;

  if (phase === "generating") {
    if (progress && progress.total > 0 && progress.step > 0) {
      position = `Step ${Math.min(progress.step, progress.total)} of ${progress.total}`;
      parts.push(position);
      const eta = stepEtaSeconds(progress, phaseElapsed ?? 0);
      if (eta !== null && eta > 0) {
        remaining = `about ${formatDuration(eta)} left`;
        parts.push(remaining);
        measured = true;
      } else if (eta === 0) {
        remaining = "finishing";
        parts.push(remaining);
        measured = true;
      }
    }
  } else if (phase === "loading") {
    // The runtime's own estimate first; the load's measured rate second.
    const runtimeEta =
      typeof progress?.etaS === "number" && progress.etaS > 0 ? progress.etaS : null;
    const eta = runtimeEta ?? loadEtaSeconds(phaseFraction(progress), phaseElapsed);
    if (eta !== null && eta > 0) {
      remaining = `about ${formatDuration(eta)} left`;
      parts.push(remaining);
      measured = true;
    }
  }

  const clock: string[] = [];
  const elapsed = phaseElapsed !== null ? `${formatElapsed(phaseElapsed)} elapsed` : null;
  if (elapsed) clock.push(elapsed);
  // The cost model is only worth showing while nothing has been measured yet,
  // and it names its own phase so the number cannot be read as the other one.
  let hint: string | null = null;
  if (!measured && estimateSeconds && estimateSeconds > 0 && phase !== "queued") {
    hint =
      phase === "loading"
        ? `models usually load in about ${formatDuration(estimateSeconds)}`
        : `generating usually takes about ${formatDuration(estimateSeconds)}`;
    clock.push(hint);
  }

  return {
    primary: parts.length > 0 ? parts.join(" · ") : null,
    secondary: clock.length > 0 ? clock.join(" · ") : null,
    elapsed,
    remaining,
    position,
    hint,
  };
}
