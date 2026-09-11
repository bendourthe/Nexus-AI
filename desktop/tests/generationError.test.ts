/**
 * v2.4.9 -- the two failures the operator actually saw, plus the shapes that
 * must never reach the transcript raw again.
 */

import { describe, expect, it } from "vitest";
import {
  describeGenerationFailure,
  failureClipboardText,
} from "../src/shared/studio/generationError";

/** Verbatim shape of the operator's 4K rejection. */
const ZOD_TOO_BIG =
  'sidecar request error: [\n  {\n    "code": "too_big",\n    "maximum": 2048,\n' +
  '    "type": "number",\n    "inclusive": true,\n    "exact": false,\n' +
  '    "message": "Number must be less than or equal to 2048",\n' +
  '    "path": [\n      "width"\n    ]\n  },\n  {\n    "code": "too_big",\n' +
  '    "maximum": 2048,\n    "type": "number",\n    "path": [\n      "height"\n    ]\n  }\n]';

describe("describeGenerationFailure", () => {
  it("turns the 4K Zod dump into a sentence about size", () => {
    const failure = describeGenerationFailure(new Error(ZOD_TOO_BIG), { surface: "image" });
    expect(failure.kind).toBe("size-too-large");
    expect(failure.headline).toBe("Your image could not be generated.");
    expect(failure.summary).toContain("2048");
    expect(failure.summary).not.toContain("too_big");
    expect(failure.hint).toMatch(/smaller resolution/i);
  });

  it("keeps the raw trace verbatim for the copy button", () => {
    const failure = describeGenerationFailure(new Error(ZOD_TOO_BIG), { surface: "image" });
    expect(failure.detail).toContain("too_big");
    expect(failureClipboardText(failure)).toContain("--- details ---");
    expect(failureClipboardText(failure)).toContain("too_big");
  });

  it("names the offending field for a non-size schema rejection", () => {
    const raw = 'sidecar request error: [{"code":"too_big","maximum":5,"path":["durationSeconds"]}]';
    const failure = describeGenerationFailure(new Error(raw), { surface: "video" });
    expect(failure.kind).toBe("invalid-setting");
    expect(failure.summary).toContain("duration");
  });

  it("does not blame Ollama when a VIDEO job times out", () => {
    // Operator report: a Wan video ran ten minutes and then said "Check Ollama
    // is running" -- Ollama serves chat, not diffusion.
    const failure = describeGenerationFailure(
      new Error("Local model did not finish in time. Check Ollama is running and the weights are loaded."),
      { surface: "video" },
    );
    expect(failure.kind).toBe("timeout");
    expect(failure.summary).not.toMatch(/ollama/i);
    expect(failure.hint).not.toMatch(/ollama/i);
    expect(failure.hint).toMatch(/shorter clip|smaller resolution|fewer steps/i);
  });

  it("still points at the runtime when a CHAT reply times out", () => {
    const failure = describeGenerationFailure(
      new Error("Local model did not finish in time."),
      { surface: "chat" },
    );
    expect(failure.kind).toBe("timeout");
    expect(failure.hint).toMatch(/runtime|weights/i);
  });

  it("recognizes an out-of-memory failure", () => {
    const failure = describeGenerationFailure(
      new Error("CUDA out of memory. Tried to allocate 2048 MiB"),
      { surface: "image" },
    );
    expect(failure.kind).toBe("out-of-memory");
    expect(failure.hint).toMatch(/lower the resolution/i);
  });

  it("recognizes an unreachable runtime", () => {
    const failure = describeGenerationFailure(new Error("connect ECONNREFUSED 127.0.0.1:8756"), {
      surface: "image",
    });
    expect(failure.kind).toBe("runtime-unavailable");
  });

  it("treats a cancellation as a stop, not an alarm", () => {
    const failure = describeGenerationFailure(new Error("Interrupted by app restart"), {
      surface: "video",
    });
    expect(failure.kind).toBe("cancelled");
    expect(failure.headline).toMatch(/cancelled/i);
  });

  it("always produces a headline, even for an unrecognized error", () => {
    const failure = describeGenerationFailure(new Error("{ weird: blob }"), { surface: "image" });
    expect(failure.headline).toBeTruthy();
    expect(failure.detail).toContain("weird");
  });

  it("does not use a JSON blob as the summary sentence", () => {
    const failure = describeGenerationFailure(new Error('{"unmatched": true'), { surface: "image" });
    expect(failure.summary).toBeNull();
  });
});
