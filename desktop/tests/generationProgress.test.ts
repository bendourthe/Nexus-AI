import { describe, expect, it } from "vitest";
import {
  estimateGenerationSeconds,
  estimateModelLoadSeconds,
  formatDuration,
  formatElapsed,
  jobPhase,
  loadEtaSeconds,
  mergeProgress,
  MODEL_LOAD_SECONDS,
  phaseFraction,
  progressLines,
  stepEtaSeconds,
} from "../src/shared/chat/generationProgress";

// v2.4.8 follow-up (2026-09-07): a Wan video sat on a rotating word for
// fifteen minutes with no bar, no clock and no estimate. These are the numbers
// behind the block that replaced it.
describe("generationProgress", () => {
  it("formats durations without false precision, in spelled-out units", () => {
    // v2.4.9 operator instruction: "never use shorter names for time units.
    // Across the entire app, spell out seconds, minutes, hours."
    expect(formatDuration(0)).toBe("1 second");
    expect(formatDuration(1)).toBe("1 second");
    expect(formatDuration(12.4)).toBe("12 seconds");
    expect(formatDuration(59)).toBe("59 seconds");
    expect(formatDuration(60)).toBe("1 minute");
    expect(formatDuration(150)).toBe("3 minutes");
    expect(formatDuration(3600)).toBe("1 hour");
    expect(formatDuration(3900)).toBe("1 hour 5 minutes");
    expect(formatDuration(7260)).toBe("2 hours 1 minute");
  });

  it("formats the running clock exactly", () => {
    expect(formatElapsed(0)).toBe("0:00");
    expect(formatElapsed(7)).toBe("0:07");
    expect(formatElapsed(252)).toBe("4:12");
    expect(formatElapsed(3750)).toBe("1:02:30");
  });

  it("reads the fraction from steps first, then from bytes", () => {
    expect(phaseFraction({ step: 12, total: 30 })).toBeCloseTo(0.4);
    expect(
      phaseFraction({ step: 0, total: 0, loadedBytes: 2000, totalBytes: 5000 }),
    ).toBeCloseTo(0.4);
    expect(phaseFraction({ step: 0, total: 0 })).toBeNull();
    expect(phaseFraction(undefined)).toBeNull();
    // v2.4.8 follow-up (2026-09-08): a finished byte count is not a full
    // sampling bar. A video showed a full bar the moment sampling began.
    expect(
      phaseFraction({
        step: 0,
        total: 0,
        stage: "generating",
        loadedBytes: 5000,
        totalBytes: 5000,
      }),
    ).toBeNull();
    // A runtime that overshoots never pushes the bar past full.
    expect(phaseFraction({ step: 31, total: 30 })).toBe(1);
  });

  it("estimates the remaining time from this run's own step rate", () => {
    // 10 of 30 steps in 100 s -> 10 s a step -> 200 s left.
    expect(stepEtaSeconds({ step: 10, total: 30 }, 100)).toBe(200);
    expect(stepEtaSeconds({ step: 30, total: 30 }, 100)).toBe(0);
    expect(stepEtaSeconds({ step: 0, total: 30 }, 100)).toBeNull();
    expect(stepEtaSeconds({ step: 10, total: 30 }, 0)).toBeNull();
    expect(stepEtaSeconds(undefined, 100)).toBeNull();
  });

  it("prefers the measured estimate and drops the guess once it has one", () => {
    const measured = progressLines({
      progress: { step: 10, total: 30, stage: "generating" },
      phase: "generating",
      phaseElapsed: 100,
      estimateSeconds: 1080,
    });
    expect(measured.primary).toBe("Step 10 of 30 · about 3 minutes left");
    // The cost model is gone: there is a real rate now.
    expect(measured.secondary).toBe("1:40 elapsed");

    const guessed = progressLines({
      progress: { step: 0, total: 0, stage: "generating" },
      phase: "generating",
      phaseElapsed: 8,
      estimateSeconds: 1080,
    });
    // v2.4.9: no cost-model sentence. The up-front estimate becomes the
    // REMAINING figure directly, counted down by time already spent.
    expect(guessed.primary).toBeNull();
    expect(guessed.hint).toBeNull();
    expect(guessed.remaining).toBe("about 18 minutes left");
    expect(guessed.secondary).toBe("0:08 elapsed");
  });

  it("uses the runtime's own byte estimate while weights load", () => {
    const lines = progressLines({
      progress: { step: 0, total: 0, stage: "loading", etaS: 12.4 },
      phase: "loading",
      phaseElapsed: 5,
      estimateSeconds: 25,
    });
    expect(lines.primary).toBe("about 12 seconds left");
    expect(lines.secondary).toBe("0:05 elapsed");
  });

  // Operator report (2026-09-08): a video read "usually about 18 min" while it
  // was still loading weights, so the figure looked like the load's.
  it("words each phase's estimate so it cannot describe the other phase", () => {
    const loading = progressLines({
      progress: { step: 0, total: 0, stage: "loading" },
      phase: "loading",
      phaseElapsed: 4,
      estimateSeconds: 25,
    });
    // v2.4.9: the cost-model sentence is gone; the estimate is counted
    // down as this phase's own remaining time instead.
    expect(loading.secondary).toBe("0:04 elapsed");
    expect(loading.remaining).toBe("about 21 seconds left");
    expect(loading.hint).toBeNull();
    const generating = progressLines({
      progress: { step: 0, total: 0, stage: "generating" },
      phase: "generating",
      phaseElapsed: 4,
      estimateSeconds: 1080,
    });
    expect(generating.secondary).toBe("0:04 elapsed");
    expect(generating.remaining).toBe("about 18 minutes left");
  });

  it("measures the load's own remaining time when the runtime gives none", () => {
    // The chat watch reports a percent and no time; 40% in 20 s leaves 30 s.
    expect(loadEtaSeconds(0.4, 20)).toBe(30);
    expect(loadEtaSeconds(1, 20)).toBeNull();
    expect(loadEtaSeconds(0, 20)).toBeNull();
    expect(loadEtaSeconds(0.4, 0)).toBeNull();
    expect(loadEtaSeconds(null, 20)).toBeNull();
    const lines = progressLines({
      progress: {
        step: 0,
        total: 0,
        stage: "loading",
        loadedBytes: 40,
        totalBytes: 100,
      },
      phase: "loading",
      phaseElapsed: 20,
      estimateSeconds: 25,
    });
    expect(lines.primary).toBe("about 30 seconds left");
    // Measured now, so the up-front figure is gone.
    expect(lines.secondary).toBe("0:20 elapsed");
  });

  it("says finishing on the last step rather than 0 s left", () => {
    const lines = progressLines({
      progress: { step: 30, total: 30 },
      phase: "generating",
      phaseElapsed: 300,
    });
    expect(lines.primary).toBe("Step 30 of 30 · finishing");
  });

  it("costs a job from its own shape, calibrated on measured runs", () => {
    // Measured: RealVisXL 1024x1024 x 14 steps took 64 s end to end, of which
    // about 25 s was the model load. The figure here is the sampling half.
    const image = estimateGenerationSeconds({
      pillar: "image",
      width: 1024,
      height: 1024,
      steps: 14,
    });
    expect(image).toBeGreaterThan(30);
    expect(image).toBeLessThan(50);
    // Measured: Wan 854x480 x 96 frames x 30 steps ran about 20 minutes.
    const video = estimateGenerationSeconds({
      pillar: "video",
      width: 854,
      height: 480,
      steps: 30,
      frames: 96,
    });
    expect(video).toBeGreaterThan(900);
    expect(video).toBeLessThan(1500);
    // A video is far dearer than an image of the same frame size.
    expect(video).toBeGreaterThan(image * 5);
  });

  it("costs the model load separately from the sampling it precedes", () => {
    // The two phases are measured and shown separately, so neither figure may
    // include the other's time.
    expect(estimateModelLoadSeconds(null)).toBe(MODEL_LOAD_SECONDS);
    expect(estimateModelLoadSeconds(0)).toBe(MODEL_LOAD_SECONDS);
    // A bigger model takes longer to reach the GPU, and a tiny one still
    // reports a floor rather than "instant".
    expect(estimateModelLoadSeconds(8)).toBeGreaterThan(estimateModelLoadSeconds(4));
    expect(estimateModelLoadSeconds(0.2)).toBeGreaterThanOrEqual(5);
  });

  it("names the phase a pending job is in", () => {
    // A studio job with nothing reported yet is reading weights.
    expect(jobPhase(undefined, true)).toBe("loading");
    // A chat turn on silence is thinking, never loading.
    expect(jobPhase(undefined, false)).toBe("generating");
    expect(jobPhase({ step: 0, total: 0, stage: "loading" }, false)).toBe("loading");
    expect(jobPhase({ step: 0, total: 0, stage: "queued" }, true)).toBe("queued");
    expect(jobPhase({ step: 0, total: 0, stage: "clearing" }, true)).toBe("clearing");
    expect(jobPhase({ step: 0, total: 0, stage: "generating" }, true)).toBe(
      "generating",
    );
    // A counted step is sampling whatever the stage says.
    expect(jobPhase({ step: 3, total: 20, stage: "loading" }, true)).toBe("generating");
  });
});

/**
 * Operator report (2026-09-08): the bar and the step line appeared and
 * disappeared for a whole run. The liveness heartbeat carries no stage and no
 * counters, and writing it straight to the message erased the measurement.
 */
describe("mergeProgress", () => {
  it("leaves a counted step alone when a bare heartbeat arrives", () => {
    const sampling = mergeProgress(undefined, {
      stage: "generating",
      step: 14,
      totalSteps: 30,
    });
    expect(sampling).toMatchObject({ step: 14, total: 30, stage: "generating" });
    const beat = mergeProgress(sampling, { stage: "loading", step: 0, totalSteps: 0 });
    expect(beat).toMatchObject({ step: 14, total: 30, stage: "generating" });
  });

  it("never lets the phase slide backwards", () => {
    const loading = mergeProgress(undefined, { stage: "loading" });
    expect(loading.stage).toBe("loading");
    expect(mergeProgress(loading, { stage: "queued" }).stage).toBe("loading");
    const generating = mergeProgress(loading, { stage: "generating" });
    expect(generating.stage).toBe("generating");
    expect(mergeProgress(generating, { stage: "loading" }).stage).toBe("generating");
  });

  it("drops the load byte counters once sampling starts", () => {
    const loading = mergeProgress(undefined, {
      stage: "loading",
      loadedBytes: 4_000,
      totalBytes: 5_000,
      etaS: 6,
    });
    expect(loading).toMatchObject({
      loadedBytes: 4_000,
      totalBytes: 5_000,
      etaS: 6,
    });
    // Kept across a heartbeat that reports no bytes...
    expect(mergeProgress(loading, { stage: "loading" })).toMatchObject({
      loadedBytes: 4_000,
      totalBytes: 5_000,
    });
    // ...and gone once the phase moves on, so they cannot read as steps.
    const generating = mergeProgress(loading, { stage: "generating" });
    expect(generating.totalBytes).toBeUndefined();
    expect(generating.loadedBytes).toBeUndefined();
    expect(generating.etaS).toBeUndefined();
  });

  it("counts a fresh pass from its own step and keeps the waiting details", () => {
    const first = mergeProgress(undefined, {
      stage: "generating",
      step: 14,
      totalSteps: 14,
    });
    // A different total is a new sampling pass, not a regression to erase.
    const second = mergeProgress(first, {
      stage: "generating",
      step: 2,
      totalSteps: 30,
    });
    expect(second).toMatchObject({ step: 2, total: 30 });
    const queued = mergeProgress(undefined, { stage: "queued", blockedBy: "chat" });
    expect(queued.blockedBy).toBe("chat");
    // Once past the wait, the holder is no longer part of the story.
    expect(mergeProgress(queued, { stage: "loading" }).blockedBy).toBeUndefined();
  });
});
