/**
 * v2.4.9 -- the pure parts of the image viewer.
 *
 * The DOM behaviour (brush strokes, pointer capture) needs a real canvas, which
 * jsdom does not provide; these cover the maths and the filter contract that
 * the export path depends on.
 */

import { describe, expect, it } from "vitest";
import {
  adjustmentFilter,
  adjustmentsAreNeutral,
  NEUTRAL_ADJUSTMENTS,
  sharpenPixels,
} from "../src/shared/studio/ImageViewer";

describe("adjustmentFilter", () => {
  it("is an identity filter at neutral", () => {
    const filter = adjustmentFilter(NEUTRAL_ADJUSTMENTS);
    expect(filter).toContain("brightness(100%)");
    expect(filter).toContain("contrast(100%)");
    expect(filter).toContain("saturate(100%)");
  });

  it("carries each adjustment into its own CSS function", () => {
    const filter = adjustmentFilter({
      brightness: 130,
      contrast: 90,
      saturation: 40,
      sharpness: 0,
    });
    expect(filter).toContain("brightness(130%)");
    expect(filter).toContain("contrast(90%)");
    expect(filter).toContain("saturate(40%)");
  });

  it("does not encode sharpness, so it cannot be double-counted (WN-1)", () => {
    // It used to fold sharpness in as a contrast lift. The export then applied
    // that lift AND the real convolution, so a saved file was over-contrasted.
    // Sharpness now lives in exactly one place: sharpenPixels, via
    // renderAdjusted, which the preview and the export both call.
    const plain = adjustmentFilter({ ...NEUTRAL_ADJUSTMENTS });
    const sharp = adjustmentFilter({ ...NEUTRAL_ADJUSTMENTS, sharpness: 100 });
    expect(sharp).toEqual(plain);
    expect(sharp).toContain("contrast(100%)");
  });
});

describe("adjustmentsAreNeutral", () => {
  it("is true only when nothing has been changed", () => {
    expect(adjustmentsAreNeutral({ ...NEUTRAL_ADJUSTMENTS })).toBe(true);
    expect(adjustmentsAreNeutral({ ...NEUTRAL_ADJUSTMENTS, brightness: 101 })).toBe(false);
    expect(adjustmentsAreNeutral({ ...NEUTRAL_ADJUSTMENTS, sharpness: 1 })).toBe(false);
  });
});

describe("sharpenPixels", () => {
  function solid(width: number, height: number, value: number): Uint8ClampedArray {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
      data[i + 3] = 255;
    }
    return data;
  }

  it("is a no-op at zero strength", () => {
    const input = solid(4, 4, 120);
    expect(sharpenPixels(input, 4, 4, 0)).toBe(input);
  });

  it("leaves a flat image flat (the kernel sums to 1)", () => {
    const out = sharpenPixels(solid(5, 5, 120), 5, 5, 100);
    const centre = (2 * 5 + 2) * 4;
    expect(out[centre]).toBe(120);
  });

  it("increases local contrast at an edge", () => {
    const width = 5;
    const height = 3;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const i = (y * width + x) * 4;
        const value = x < 2 ? 40 : 200;
        data[i] = value;
        data[i + 1] = value;
        data[i + 2] = value;
        data[i + 3] = 255;
      }
    }
    const after = sharpenPixels(data, width, height, 100);
    const brightEdge = (1 * width + 2) * 4;
    expect(after[brightEdge]!).toBeGreaterThan(200);
  });

  it("preserves alpha", () => {
    const out = sharpenPixels(solid(4, 4, 120), 4, 4, 50);
    expect(out[3]).toBe(255);
  });
});
