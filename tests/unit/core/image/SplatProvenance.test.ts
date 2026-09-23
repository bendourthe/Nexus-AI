import { describe, expect, it } from "vitest";
import { SPLAT_HONESTY_COPY, buildSplatProvenance, splatArtifactNames } from "../../../../core/image/SplatProvenance.js";

describe("splat provenance", () => {
  it("keeps the honesty sentence and does not invent a backend", () => {
    expect(SPLAT_HONESTY_COPY).toBe(
      "This is a generated 3D preview. Unseen sides are invented. It is not a measured property tour.",
    );
    const record = buildSplatProvenance({
      createdAt: "2026-09-22T00:00:00.000Z",
      sourcePngName: "nexus-image-a.png",
      requestId: "job/1",
      gaussianCount: 1,
      format: "splat",
    });
    expect(record.backend).toBeNull();
    expect(record.backendVersion).toBeNull();
    expect(record.incomplete).toBe(true);
    expect(record.sourceImageHash).toBeNull();
    expect(JSON.stringify(record)).not.toContain("bytes");
  });

  it("names the splat and the screenshot apart from the source PNG", () => {
    const first = splatArtifactNames("nexus-image-a.png", "ply", "one");
    const second = splatArtifactNames("nexus-image-a.png", "ply", "two");
    expect(first.splatFileName).toBe("nexus-image-a-one.ply");
    expect(first.screenshotFileName).toBe("nexus-image-a-one-preview.png");
    expect(first.splatFileName).not.toBe("nexus-image-a.png");
    expect(second.splatFileName).not.toBe(first.splatFileName);
    const complete = buildSplatProvenance({
      sourceImageHash: "abc",
      format: "splat",
      gaussianCount: 2,
      backend: "triposplat",
      backendVersion: "0",
      seed: 7,
      durationMs: 12,
      createdAt: "2026-09-22T00:00:00.000Z",
      sourcePngName: "nexus-image-a.png",
      requestId: "one",
    });
    expect(complete.incomplete).toBe(false);
    expect(complete.splatFileName).not.toBe(complete.sourcePngName);
  });
});
