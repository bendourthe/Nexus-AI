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
/**
 * "45 seconds" / "2 minutes" / "1 hour 5 minutes".
 *
 * v2.4.9 operator instruction: "never use shorter names for time units. Across
 * the entire app, spell out seconds, minutes, hours". Abbreviations read as
 * jargon next to prose, and `s` next to a number is ambiguous with a plural.
 * Singular and plural are both handled, so "1 minutes" never appears.
 */
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  if (total < 60) return plural(Math.max(1, total), "second");
  const minutes = Math.round(total / 60);
  if (minutes < 60) return plural(minutes, "minute");
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0
    ? plural(hours, "hour")
    : `${plural(hours, "hour")} ${plural(rest, "minute")}`;
}

/** `1 second` / `2 seconds`. */
export function plural(count: number, unit: string): string {
  return `${count} ${unit}${count === 1 ? "" : "s"}`;
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
 * "00:23" / "01:30" / "1:05:00" -- the remaining time as a clock.
 *
 * v2.4.11 operator instruction: "instead of 'about 23 seconds left', replace
 * with '00:23 left'". A clock beside a clock compares at a glance; a sentence
 * beside a clock does not.
 */
export function formatClock(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const s = String(total % 60).padStart(2, "0");
  const minutes = Math.floor(total / 60);
  if (minutes < 60) return `${String(minutes).padStart(2, "0")}:${s}`;
  const h = Math.floor(minutes / 60);
  return `${h}:${String(minutes % 60).padStart(2, "0")}:${s}`;
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

/**
 * An estimate that refuses to promise zero while the work is still running.
 *
 * v2.4.11 operator report: the loading bar counted down to "about 2 seconds
 * left", then sat there while the model kept loading, and finally jumped to a
 * full bar with a fresh counter under it. The cost model was simply short for
 * this model, and a countdown that reaches zero mid-load is worse than a
 * vaguer one: it says the wait is over when it is not.
 *
 * Once the clock nears the estimate, the estimate grows with it, so the
 * remaining figure keeps shrinking toward -- and only reaches -- the end of
 * the real work. It never shrinks below the original estimate.
 */
export function adaptiveEstimateSeconds(estimate: number, elapsed: number): number {
  if (!Number.isFinite(estimate) || estimate <= 0) return 0;
  if (elapsed < estimate * 0.85) return estimate;
  return Math.max(estimate, Math.round(elapsed * 1.3 + 5));
}

/**
 * Fill for the loading bar: measured where the runtime counts bytes, and the
 * clock against the estimate where it does not.
 *
 * An unmeasured load is capped below full, because a bar that shows 100% while
 * the model is still loading is the same lie as a countdown at zero. The phase
 * ending is what completes it.
 */
export const UNMEASURED_LOAD_CEILING = 0.95;

export function loadFraction(
  progress: Progress | undefined,
  phaseElapsed: number | null,
  estimateSeconds: number | undefined,
  /** Highest fill shown so far, so the bar can never walk backwards. */
  floor = 0,
): number | null {
  const measured = phaseFraction(progress);
  if (measured !== null) return Math.max(floor, measured);
  if (!estimateSeconds || estimateSeconds <= 0) return null;
  const elapsed = Math.max(0, phaseElapsed ?? 0);
  const estimate = adaptiveEstimateSeconds(estimateSeconds, elapsed);
  if (estimate <= 0) return null;
  /*
   * v2.4.11 operator report: "the progress kept regressing backward as the
   * expected completion time changed". It did: the fill is elapsed/estimate,
   * and the estimate grows when a load outruns it, so the quotient fell. A
   * bar that goes backwards is worse than a bar that stalls -- it says work
   * was undone. The caller keeps the high-water mark and passes it here.
   */
  return Math.max(floor, Math.min(UNMEASURED_LOAD_CEILING, elapsed / estimate));
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
  const elapsedSeconds = phaseElapsed ?? 0;
  let remaining: string | null = null;

  if (phase === "generating") {
    // Sampling steps are the best rate there is, so they still drive the
    // figure -- they are just no longer PRINTED (v2.4.11: "no indication of
    // steps or anything else", only the clock and the time left).
    const eta = stepEtaSeconds(progress, elapsedSeconds);
    if (eta !== null && eta > 0) {
      remaining = `${formatClock(eta)} left`;
    } else if (eta === 0) {
      remaining = "finishing";
    } else if (estimateSeconds && estimateSeconds > 0) {
      const left = adaptiveEstimateSeconds(estimateSeconds, elapsedSeconds) - elapsedSeconds;
      remaining = left > 0 ? `${formatClock(left)} left` : "finishing";
    }
  } else if (phase === "loading") {
    /*
     * v2.4.11: the figure is derived from the very fraction and clock shown
     * beside it, so the three numbers on screen always agree. The runtime's
     * own etaS measures from its first counted byte -- a shorter, faster
     * window than the clock -- so it is only the fallback for a load that
     * reports a time but no fraction.
     */
    const runtimeEta =
      typeof progress?.etaS === "number" && progress.etaS > 0 ? progress.etaS : null;
    const measured = loadEtaSeconds(phaseFraction(progress), phaseElapsed) ?? runtimeEta;
    if (measured !== null && measured > 0) {
      remaining = `${formatClock(measured)} left`;
    } else if (phaseFraction(progress) === null && estimateSeconds && estimateSeconds > 0) {
      // Unmeasured load: the same adaptive estimate that fills the bar, so
      // the countdown cannot reach zero while the bar is still short of full.
      const left = adaptiveEstimateSeconds(estimateSeconds, elapsedSeconds) - elapsedSeconds;
      if (left > 0) remaining = `${formatClock(left)} left`;
    }
  }

  // v2.4.11: "just the time" -- the position under the bar already says what
  // it is, and "0:47 elapsed" beside "00:23 left" reads as two kinds of thing.
  const elapsed = phaseElapsed !== null ? formatElapsed(phaseElapsed) : null;
  return {
    primary: remaining,
    secondary: elapsed,
    elapsed,
    remaining,
    position: null,
    hint: null,
  };
}
