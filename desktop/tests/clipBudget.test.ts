/**
 * v2.4.11 -- an impossible clip is refused before it is started.
 *
 * Operator report: 10 seconds at 24 fps on Wan 2.1 T2V 1.3B ran to the
 * 30-minute request limit and returned "the video took longer than the time
 * limit and was stopped". Half an hour spent to learn the request was never
 * viable.
 */

import { describe, expect, it } from "vitest";

import {
  clipBudgetRefusal,
  GENERATION_TIMEOUT_SECONDS,
} from "../src/shared/studio/clipBudget";

const WAN_480P = { width: 854, height: 480, steps: 30 };

describe("clipBudgetRefusal", () => {
  it("refuses the operator's 10 seconds at 24 fps, and says why", () => {
    const message = clipBudgetRefusal({
      ...WAN_480P,
      durationSeconds: 10,
      fps: 24,
    });
    expect(message).not.toBeNull();
    // The two numbers that decide it, and the two dials that change it.
    expect(message).toContain("240 frames");
    expect(message).toContain("854x480");
    expect(message).toMatch(/duration|frame rate/);
  });

  it("allows a clip that fits the limit", () => {
    expect(
      clipBudgetRefusal({ ...WAN_480P, durationSeconds: 5, fps: 16 }),
    ).toBeNull();
  });

  it("measures a chained clip per segment, not per clip", () => {
    // The whole clip is far past the limit, but it is generated 80 frames at
    // a time, and the limit applies to each run.
    expect(
      clipBudgetRefusal({
        ...WAN_480P,
        durationSeconds: 20,
        fps: 24,
        segmentFrames: 80,
      }),
    ).toBeNull();
  });

  it("keeps the limit and the estimate on the same scale", () => {
    // A guard whose limit drifts from the sidecar's timeout would either
    // refuse good clips or let impossible ones through.
    expect(GENERATION_TIMEOUT_SECONDS).toBe(1_800);
  });
});

/**
 * v2.4.11 -- "busy" and "dead" are different states.
 *
 * Operator screenshot: "The Nexus backend could not start -- Video models
 * cannot be listed", with the backend alive and a generation running. The
 * list call had timed out behind that job.
 */
describe("reportsBackendDown", () => {
  const running = {
    running: true,
    nodePath: null,
    nodeSource: null,
    scriptPath: null,
    failure: null,
    stderrTail: [],
    candidatesRejected: [],
  };

  it("does not call a busy backend dead", async () => {
    const { reportsBackendDown } = await import("../src/lib/sidecarStatus");
    expect(reportsBackendDown("sidecar response timeout", running)).toBe(false);
  });

  it("still reports a backend that is not running", async () => {
    const { reportsBackendDown } = await import("../src/lib/sidecarStatus");
    expect(
      reportsBackendDown("sidecar response timeout", { ...running, running: false }),
    ).toBe(true);
    // Unknown status keeps the fast path: the message is the only evidence.
    expect(reportsBackendDown("sidecar-exited", null)).toBe(true);
  });

  it("ignores messages that never meant a dead backend", async () => {
    const { reportsBackendDown } = await import("../src/lib/sidecarStatus");
    expect(reportsBackendDown("model weights missing", null)).toBe(false);
  });
});
