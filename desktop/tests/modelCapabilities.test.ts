/**
 * v2.4.9 -- the capability map exists because the forms offered settings the
 * models could not honour. These tests encode the two operator failures that
 * caused it, so neither can come back.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  allowedDurations,
  capabilitiesFor,
  clampToRange,
  hasExplicitCapabilities,
  imageCapabilitiesFor,
  reconcileImageValues,
  reconcileVideoValues,
  videoCapabilitiesFor,
  SIDECAR_MAX_IMAGE_DIMENSION,
  type ImageModelCapabilities,
  type VideoModelCapabilities,
} from "../src/shared/studio/modelCapabilities";

describe("image capabilities", () => {
  it("never offers a dimension the sidecar schema rejects", () => {
    // The operator's 4K request died on `width <= 2048` in protocol.ts. No
    // image model may advertise a resolution above that cap.
    const imageIds = [
      "realvisxl-v5",
      "juggernaut-xl-v9",
      "sana-1.6b-1024",
      "sana-1.6b-int4",
      "sana-1.6b-2k",
      "sana-1.6b-4k",
      "sana-sprint-1024",
    ];
    for (const id of imageIds) {
      const caps = imageCapabilitiesFor(id);
      expect(caps.dimension.max).toBeLessThanOrEqual(SIDECAR_MAX_IMAGE_DIMENSION);
      for (const option of caps.resolutions) {
        expect(option.width, `${id} ${option.value}`).toBeLessThanOrEqual(
          SIDECAR_MAX_IMAGE_DIMENSION,
        );
        expect(option.height, `${id} ${option.value}`).toBeLessThanOrEqual(
          SIDECAR_MAX_IMAGE_DIMENSION,
        );
      }
    }
  });

  it("does not offer 4096 even on the native-4K checkpoint", () => {
    const caps = imageCapabilitiesFor("sana-1.6b-4k");
    expect(caps.resolutions.some((r) => r.width > SIDECAR_MAX_IMAGE_DIMENSION)).toBe(false);
    // ...and it explains why, rather than silently hiding the model's headline feature.
    expect(caps.notes?.dimension).toMatch(/caps a request/i);
  });

  it("disables guidance and negative prompt on a distilled model", () => {
    const sprint = imageCapabilitiesFor("sana-sprint-1024");
    expect(sprint.cfgScale).toBeNull();
    expect(sprint.supportsNegativePrompt).toBe(false);
    expect(sprint.supportsFastPreview).toBe(true);
    expect(sprint.steps.max).toBeLessThanOrEqual(4);
  });

  it("keeps guidance on a non-distilled SDXL fine-tune", () => {
    const sdxl = imageCapabilitiesFor("realvisxl-v5");
    expect(sdxl.cfgScale).not.toBeNull();
    expect(sdxl.supportsNegativePrompt).toBe(true);
    expect(sdxl.supportsFastPreview).toBe(false);
  });

  it("resolves a sprint id to sprint, not to plain SANA, via the family fallback", () => {
    const caps = capabilitiesFor("sana-sprint-9999", "image") as ImageModelCapabilities;
    expect(caps.cfgScale).toBeNull();
  });

  it("falls back to a conservative set for an unknown model", () => {
    const caps = imageCapabilitiesFor("some-future-model");
    expect(caps.dimension.max).toBeLessThanOrEqual(SIDECAR_MAX_IMAGE_DIMENSION);
    expect(caps.supportsControlNet).toBe(false);
  });
});

describe("video capabilities", () => {
  it("does not offer 720p on Wan 2.1 1.3B", () => {
    // The operator asked this model for 720p / 8 s; it ran ten minutes and failed.
    const caps = videoCapabilitiesFor("wan2.1-t2v-1.3b");
    expect(caps.resolutions.map((r) => r.value)).toEqual(["854x480"]);
    expect(caps.notes?.resolutions).toMatch(/480p/);
  });

  it("caps Wan 2.1 duration at its trained clip length", () => {
    const caps = videoCapabilitiesFor("wan2.1-t2v-1.3b");
    expect(Math.max(...caps.durationsSeconds)).toBeLessThanOrEqual(5);
    expect(caps.durationsSeconds).not.toContain(8);
  });

  it("offers 720p on the model that actually supports it", () => {
    const caps = videoCapabilitiesFor("wan2.2-ti2v-5b");
    expect(caps.resolutions.map((r) => r.value)).toContain("1280x720");
    expect(caps.supportsImageToVideo).toBe(true);
  });

  it("narrows the duration dropdown as frame rate rises", () => {
    // 81 frames at 24 fps is 3.375 s, so 4 s and 5 s must drop out.
    const caps = videoCapabilitiesFor("wan2.1-t2v-1.3b");
    expect(allowedDurations(caps, 12)).toEqual([2, 3, 4, 5]);
    expect(allowedDurations(caps, 24)).toEqual([2, 3]);
  });

  it("never returns an empty duration list", () => {
    const caps: VideoModelCapabilities = {
      ...videoCapabilitiesFor("wan2.1-t2v-1.3b"),
      maxFrames: 1,
    };
    expect(allowedDurations(caps, 24).length).toBeGreaterThan(0);
  });
});

describe("reconciling values on a model switch", () => {
  it("pulls a 4K image request down to the model's ceiling", () => {
    const caps = imageCapabilitiesFor("sana-1.6b-4k");
    const { patch, changed } = reconcileImageValues(
      { width: 4096, height: 4096, steps: 14, cfgScale: 4.5 },
      caps,
    );
    expect(patch.width).toBeLessThanOrEqual(SIDECAR_MAX_IMAGE_DIMENSION);
    expect(patch.height).toBeLessThanOrEqual(SIDECAR_MAX_IMAGE_DIMENSION);
    expect(changed.join(" ")).toMatch(/size set to/);
  });

  it("turns off one-step draft when moving to a model that cannot do it", () => {
    const { patch, changed } = reconcileImageValues(
      { width: 1024, height: 1024, steps: 14, cfgScale: 4.5, fastPreview: true },
      imageCapabilitiesFor("realvisxl-v5"),
    );
    expect(patch.fastPreview).toBe(false);
    expect(changed.join(" ")).toMatch(/one-step draft/);
  });

  it("leaves a valid selection untouched", () => {
    const { patch, changed } = reconcileImageValues(
      { width: 1024, height: 1024, steps: 14, cfgScale: 4.5, fastPreview: false },
      imageCapabilitiesFor("realvisxl-v5"),
    );
    expect(patch).toEqual({});
    expect(changed).toEqual([]);
  });

  it("rewrites the operator's failing video request into a runnable one", () => {
    const caps = videoCapabilitiesFor("wan2.1-t2v-1.3b");
    const { patch, changed } = reconcileVideoValues(
      { width: 1280, height: 720, durationSeconds: 8, fps: 24, steps: 30 },
      caps,
    );
    expect(patch.width).toBe(854);
    expect(patch.height).toBe(480);
    expect(patch.durationSeconds).toBeLessThanOrEqual(5);
    expect(changed.join(" ")).toMatch(/resolution set to/);
    expect(changed.join(" ")).toMatch(/duration set to/);
  });
});

describe("clampToRange", () => {
  it("honours step granularity", () => {
    expect(clampToRange(1023, { min: 64, max: 2048, step: 8 })).toBe(1024);
    expect(clampToRange(9999, { min: 64, max: 2048, step: 8 })).toBe(2048);
    expect(clampToRange(1, { min: 64, max: 2048, step: 8 })).toBe(64);
  });
});

describe("generation duration formatting", () => {
  it("is HH:MM:SS on every scale", async () => {
    const { formatHhMmSs, formatGenerationDuration } = await import(
      "../src/shared/chat/MessageBubble"
    );
    expect(formatHhMmSs(42)).toBe("00:00:42");
    expect(formatHhMmSs(65)).toBe("00:01:05");
    expect(formatHhMmSs(600)).toBe("00:10:00");
    expect(formatHhMmSs(4805)).toBe("01:20:05");
    // Bracketed for the timestamp row.
    expect(formatGenerationDuration(42)).toBe(" (00:00:42)");
  });

  it("reports nothing for an unmeasured or sub-second turn", async () => {
    const { formatGenerationDuration, formatHhMmSs } = await import(
      "../src/shared/chat/MessageBubble"
    );
    expect(formatHhMmSs(undefined)).toBe("");
    expect(formatHhMmSs(0.4)).toBe("");
    expect(formatGenerationDuration(undefined)).toBe("");
  });

  it("floors rather than rounds, so a clock never reads ahead of itself", () => {
    // 59.9 s is 00:00:59, not 00:01:00.
    return import("../src/shared/chat/MessageBubble").then(({ formatHhMmSs }) => {
      expect(formatHhMmSs(59.9)).toBe("00:00:59");
    });
  });
});

/**
 * MT-8 / MT-9 -- the capability map was authored FROM the catalog and the
 * sidecar schema but asserted against neither, so either could drift away
 * from it silently. These bind the three files together.
 */
describe("capability map agrees with its sources", () => {
  const catalog = JSON.parse(
    // vitest's root is `desktop/`, so the catalog is one level up. A file URL
    // built from `import.meta.url` is not resolvable under the transform.
    readFileSync(resolve(process.cwd(), "../core/registry/catalog.json"), "utf-8"),
  ) as { models: Array<{ id: string; type?: string; visualTokenBudget?: Record<string, number> }> };

  const mediaModels = catalog.models.filter(
    (m) => m.type === "image" || m.type === "video",
  );

  it("has an explicit entry for every image and video model in the catalog", () => {
    // A model with no entry silently gets the conservative fallback, which is
    // safe but hides the fact that nobody described it.
    expect(mediaModels.length).toBeGreaterThan(0);
    const unmapped = mediaModels
      .filter((m) => m.id !== "sam2:hiera-tiny") // a segmenter, not a generator
      .filter((m) => !hasExplicitCapabilities(m.id, m.type as "image" | "video"));
    expect(unmapped.map((m) => m.id)).toEqual([]);
  });

  /**
   * Catalog entries whose `visualTokenBudget` is INTERNALLY INCONSISTENT and
   * therefore cannot be enforced.
   *
   * Both declare `maxVideoFrames: 8` with `maxVideoSeconds: 8`, i.e. one frame
   * per second, which is not a video. The two Wan entries are coherent by
   * contrast (121 frames / 5 s is 24 fps; 81 / 5 is 16 fps), so the field is
   * meaningful where it was filled in properly and a placeholder here. The
   * capability map keeps conservative hand-set values for these two.
   *
   * This is an allowlist, not a skip: if the catalog is corrected, the guard
   * below fails and tells us to delete the entry rather than letting a real
   * budget go unenforced.
   */
  const INCOHERENT_FRAME_BUDGETS = new Set([
    "longcat-video-avatar-1.5",
    "sana-video-2b-720p",
  ]);

  function budgetIsCoherent(frames: number, seconds: number): boolean {
    // A real clip runs at 8 fps or better.
    return frames / Math.max(1, seconds) >= 8;
  }

  it("flags a catalog frame budget that is not internally coherent", () => {
    const incoherent = mediaModels
      .filter((m) => m.type === "video")
      .filter((m) => {
        const frames = m.visualTokenBudget?.["maxVideoFrames"];
        const seconds = m.visualTokenBudget?.["maxVideoSeconds"];
        if (typeof frames !== "number" || typeof seconds !== "number") return false;
        return !budgetIsCoherent(frames, seconds);
      })
      .map((m) => m.id);
    // Fails when the catalog is fixed (delete the id) or when a NEW model
    // arrives with the same placeholder (investigate, then add it knowingly).
    expect(new Set(incoherent)).toEqual(INCOHERENT_FRAME_BUDGETS);
  });

  it("never advertises more frames than a coherent catalog budget", () => {
    for (const model of mediaModels) {
      if (model.type !== "video") continue;
      if (INCOHERENT_FRAME_BUDGETS.has(model.id)) continue;
      const budget = model.visualTokenBudget?.["maxVideoFrames"];
      if (typeof budget !== "number") continue;
      const caps = videoCapabilitiesFor(model.id);
      expect(caps.maxFrames, `${model.id} maxFrames`).toBeLessThanOrEqual(budget);
    }
  });

  it("never advertises a longer clip than the catalog's own budget", () => {
    for (const model of mediaModels) {
      if (model.type !== "video") continue;
      const budget = model.visualTokenBudget?.["maxVideoSeconds"];
      if (typeof budget !== "number") continue;
      const caps = videoCapabilitiesFor(model.id);
      expect(
        Math.max(...caps.durationsSeconds),
        `${model.id} durations`,
      ).toBeLessThanOrEqual(budget);
    }
  });

  it("mirrors the sidecar's real dimension cap, read from protocol.ts", () => {
    // MT-9: the constant duplicates a Zod cap the renderer cannot import. If
    // the sidecar raises its cap, this fails instead of leaving the UI behind.
    const protocol = readFileSync(
      resolve(process.cwd(), "sidecar/src/protocol.ts"),
      "utf-8",
    );
    const widths = [...protocol.matchAll(/width:\s*z\.number\(\)\.int\(\)\.min\(\d+\)\.max\((\d+)\)/g)];
    expect(widths.length, "no width cap found in protocol.ts").toBeGreaterThan(0);
    for (const match of widths) {
      expect(Number(match[1])).toBe(SIDECAR_MAX_IMAGE_DIMENSION);
    }
  });
});
