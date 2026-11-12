import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { evaluateSmoke, isLoopback, sha256File } from "../../../desktop/tests/packaged/smoke.mjs";
import { checkArtifacts, checkStaging, parityAgainstWorkflows } from "../../../scripts/check-release-assets.mjs";

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
    expect(result.findings).toContain("non-loopback connection: https://example.com/models");
  });

  it("treats Tauri webview hosts as loopback", () => {
    const result = evaluateSmoke({
      ...full,
      connections: [
        "http://tauri.localhost/assets/index.js",
        "http://ipc.localhost/sidecar_status",
      ],
    });
    expect(result.ok).toBe(true);
    expect(result.findings).toEqual([]);
  });

  it("does not treat a lookalike host as loopback", () => {
    const result = evaluateSmoke({
      ...full,
      connections: ["https://localhost.evil.com/models"],
    });
    expect(result.findings).toContain("non-loopback connection: https://localhost.evil.com/models");
  });

  it("does not let userinfo hide an external host", () => {
    const result = evaluateSmoke({
      ...full,
      connections: ["http://127.0.0.1@evil.com/models"],
    });
    expect(result.findings).toContain("non-loopback connection: http://127.0.0.1@evil.com/models");
  });

  it("rejects an empty connection list item and a non-url", () => {
    const result = evaluateSmoke({
      ...full,
      connections: ["", "not a url"],
    });
    expect(result.ok).toBe(false);
    expect(result.findings.some((finding) => finding.startsWith("non-loopback connection:"))).toBe(true);
  });

  it("canonicalizes numeric loopback and still rejects dotted lookalikes", () => {
    expect(isLoopback("http://2130706433/")).toBe(true);
    expect(isLoopback("http://0x7f000001/")).toBe(true);
    expect(isLoopback("http://[::1]/")).toBe(true);
    expect(isLoopback("http://[::ffff:127.0.0.1]/")).toBe(true);
    expect(isLoopback("http://127.0.0.1.evil.com/")).toBe(false);
    expect(isLoopback("http://[::ffff:8.8.8.8]/")).toBe(false);
    expect(isLoopback("http://127.0.0.1.nip.io/")).toBe(false);
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

  it("reads a staging directory and compares the smoked digest", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "release-stage-"));
    fs.writeFileSync(path.join(dir, "NexusSetup.exe"), "");
    const empty = checkStaging({ expected, stagingDir: dir, smokeDigest: "abc" });
    expect(empty.ok).toBe(false);
    expect(empty.findings.some((finding) => finding.includes("zero-length"))).toBe(true);

    fs.writeFileSync(path.join(dir, "NexusSetup.exe"), "bytes");
    const mismatch = checkStaging({ expected, stagingDir: dir, smokeDigest: "abc" });
    expect(mismatch.findings.some((finding) => finding.includes("digest mismatch"))).toBe(true);

    const digest = checkStaging({ expected, stagingDir: dir, smokeDigest: undefined }).findings;
    expect(digest.some((finding) => finding.includes("digest mismatch"))).toBe(false);
    const hashed = checkStaging({
      expected,
      stagingDir: dir,
      smokeDigest: "277089d91c0bdf4f2e6862ba7e4a07605119431f5d13f726dd352b06f1b206a9",
    });
    expect(hashed.ok).toBe(true);
  });
});

describe("packaged behavioral judgment", async () => {
  const { BEHAVIORAL_PHASES, BEHAVIORAL_SCHEMA, evaluateBehavioralReport } = await import(
    "../../../desktop/tests/packaged/smoke.mjs"
  );
  const exeSha256 = "a".repeat(64);
  const runId = "run-1";
  const now = Date.parse("2026-11-11T06:00:00Z");
  function passing(): Record<string, any> {
    return {
      schemaVersion: BEHAVIORAL_SCHEMA,
      mode: "edit",
      control: null,
      runId,
      startedAt: "2026-11-11T05:50:00Z",
      finishedAt: "2026-11-11T05:55:00Z",
      error: null,
      executable: { sha256: exeSha256 },
      candidate: { commit: "c".repeat(40) },
      ownedProfile: { root: "C:/tmp/owned", ownerRunId: "owner" },
      phases: Object.fromEntries(BEHAVIORAL_PHASES.map((name: string) => [name, { status: "pass" }])),
      recipe: { expected: { brightness: 110 }, observed: { afterSave: { brightness: 110 }, afterRestart: { brightness: 110 } } },
      launches: [
        { appPid: 1, seededSessionVisible: true },
        { appPid: 2, seededSessionVisible: true },
      ],
      render: { ok: true, mismatchedPixels: 0, changedChannels: 10 },
      sourcePreservation: { expectedSha256: "f", fixtureSha256: "f", seededSha256: "f" },
      realProfileChanged: [],
    };
  }
  const judge = (report: unknown) => evaluateBehavioralReport(report, { exeSha256, runId, now });

  it("accepts a complete report bound to this run and executable", () => {
    expect(judge(passing())).toEqual({ ok: true, findings: [] });
  });

  it("never accepts a route-only report or a synthetic body without observations", () => {
    expect(judge(full).findings).toEqual(["route-only report: not a behavioral report"]);
    expect(judge({ schemaVersion: BEHAVIORAL_SCHEMA, mode: "edit", control: null, runId }).ok).toBe(false);
    expect(judge(null).ok).toBe(false);
  });

  it.each([
    ["missing fixture", (r: any) => ({ ...r, error: "fixture-missing: x", phases: { ...r.phases, seed: { status: "fail" } } })],
    ["denied save", (r: any) => ({ ...r, phases: { ...r.phases, edit: { status: "fail" } }, recipe: { ...r.recipe, observed: { afterRestart: { brightness: 110 } } } })],
    ["lost persistence", (r: any) => ({ ...r, recipe: { ...r.recipe, observed: { ...r.recipe.observed, afterRestart: { brightness: 100 } } } })],
    ["source mutation", (r: any) => ({ ...r, sourcePreservation: { expectedSha256: "f", fixtureSha256: "f", seededSha256: "0" } })],
    ["wrong executable", (r: any) => ({ ...r, executable: { sha256: "b".repeat(64) } })],
    ["wrong run", (r: any) => ({ ...r, runId: "run-2" })],
    ["wrong profile", (r: any) => ({ ...r, ownedProfile: { root: "C:/tmp/owned" } })],
    ["stale artifact", (r: any) => ({ ...r, startedAt: "2026-11-10T01:00:00Z", finishedAt: "2026-11-10T01:05:00Z" })],
    ["timeout", (r: any) => ({ ...r, error: "stage-timeout: save-acknowledged exceeded 30000 ms", phases: { ...r.phases, edit: { status: "fail" } } })],
    ["controlled defect", (r: any) => ({ ...r, control: "lost-persistence" })],
    ["render mismatch", (r: any) => ({ ...r, render: { ok: false, mismatchedPixels: 3, changedChannels: 10 } })],
    ["real profile changed", (r: any) => ({ ...r, realProfileChanged: ["C:/Users/x/.nexus/settings.json"] })],
    ["single launch", (r: any) => ({ ...r, launches: [r.launches[0], r.launches[0]] })],
  ])("rejects %s", (_name, mutate) => {
    const result = judge(mutate(passing()));
    expect(result.ok).toBe(false);
    expect(result.findings.length).toBeGreaterThan(0);
  });
});
