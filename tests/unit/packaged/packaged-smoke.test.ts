import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { evaluateSmoke, sha256File } from "../../../desktop/tests/packaged/smoke.mjs";
import { checkArtifacts, parityAgainstWorkflows } from "../../../scripts/check-release-assets.mjs";

const full = {
  launched: true,
  timedOut: false,
  selectors: ["chat-page", "coding-page", "image-model-select", "video-lab-page"],
  connections: ["127.0.0.1:11500"],
  digest: "abc",
};

describe("packaged smoke", () => {
  it("fails a mounted shell that is missing a route selector", () => {
    const result = evaluateSmoke({ ...full, selectors: ["chat-page"] });
    expect(result.ok).toBe(false);
    expect(result.findings.some((finding) => finding.includes("coding-page"))).toBe(true);
  });

  it("reports launch failure and timeout as different findings", () => {
    expect(evaluateSmoke({ launched: false, exitCode: 9, output: "boom" }).findings[0]).toMatch(/launch failure/);
    expect(evaluateSmoke({ ...full, timedOut: true, timeoutMs: 1000 }).findings[0]).toMatch(/timeout/);
  });

  it("names a non-loopback destination", () => {
    const result = evaluateSmoke({ ...full, connections: ["https://example.com/models"] });
    expect(result.findings.some((finding) => finding.includes("example.com"))).toBe(true);
  });

  it("records a bundle digest", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bundle-"));
    const file = path.join(dir, "app.bin");
    fs.writeFileSync(file, "bytes");
    expect(sha256File(file)).toHaveLength(64);
  });
});

describe("release artifacts", () => {
  const expected = [
    { id: "windows-setup", uploadName: "NexusSetup-windows", file: "NexusSetup.exe", bindsSmokeDigest: true },
  ];

  it("names a missing artifact", () => {
    const result = checkArtifacts({ expected, files: [], smokeDigest: "abc" });
    expect(result.findings.some((finding) => finding.includes("missing artifact"))).toBe(true);
  });

  it("names a digest mismatch", () => {
    const result = checkArtifacts({
      expected,
      files: [{ name: "NexusSetup.exe", size: 10, digest: "fff" }],
      smokeDigest: "abc",
    });
    expect(result.findings.some((finding) => finding.includes("digest mismatch"))).toBe(true);
  });

  it("warns on an extra artifact and fails parity when a workflow name is undeclared", () => {
    const result = checkArtifacts({
      expected,
      files: [{ name: "NexusSetup.exe", size: 10, digest: "abc" }, { name: "extra.bin", size: 4 }],
      smokeDigest: "abc",
    });
    expect(result.ok).toBe(true);
    expect(result.warnings.some((warning) => warning.includes("extra.bin"))).toBe(true);
    const parity = parityAgainstWorkflows(expected, "name: NexusSetup-windows\nname: NexusSetup-macos-rehearsal\n");
    expect(parity.some((finding) => finding.includes("NexusSetup-macos-rehearsal"))).toBe(true);
  });
});
