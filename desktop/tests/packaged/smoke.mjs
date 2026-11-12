/**
 * Packaged-bundle smoke judgments. A mounted empty shell is a failure:
 * the root may exist while route-owned selectors are absent.
 * The live Tauri launch is a separate step. These functions are what CI asserts.
 */

import { createHash } from "node:crypto";
import fs from "node:fs";

export const ROUTE_SELECTORS = {
  chatbot: "chat-page",
  agents: "coding-page",
  images: "image-model-select",
  videos: "video-lab-page",
};

export function sha256File(filePath) {
  const hash = createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

export function isLoopback(destination) {
  let host = "";
  try {
    const value = String(destination);
    const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `http://${value}`;
    host = new URL(withScheme).hostname;
  } catch {
    host = "";
  }
  if (host.startsWith("[") && host.endsWith("]")) host = host.slice(1, -1);
  host = host.toLowerCase();
  if (host === "127.0.0.1" || host === "localhost" || host.endsWith(".localhost") || host === "::1") {
    return true;
  }
  return isIpv4MappedLoopback(host);
}

function isIpv4MappedLoopback(host) {
  if (!host.startsWith("::ffff:")) return false;
  const rest = host.slice("::ffff:".length);
  if (rest.includes(".")) {
    const parts = rest.split(".");
    if (parts.length !== 4) return false;
    const nums = parts.map((part) => Number(part));
    return nums.every((n) => Number.isInteger(n) && n >= 0 && n <= 255) && nums[0] === 127;
  }
  const hex = rest.split(":");
  if (hex.length !== 2 || hex.some((part) => !/^[0-9a-f]{1,4}$/.test(part))) return false;
  return (Number.parseInt(hex[0], 16) >>> 8) === 127;
}

export function evaluateSmoke(report) {
  const findings = [];
  if (!report || report.launched === false) {
    findings.push(
      `launch failure: exit ${report?.exitCode ?? "unknown"}; output: ${report?.output ?? ""}`,
    );
    return { ok: false, findings, digest: report?.digest ?? null };
  }
  if (report.timedOut) {
    findings.push(`timeout: route did not become ready within ${report.timeoutMs ?? "the bound"}`);
    return { ok: false, findings, digest: report.digest ?? null };
  }
  const present = new Set(report.selectors ?? []);
  for (const [route, selector] of Object.entries(ROUTE_SELECTORS)) {
    if (!present.has(selector)) {
      findings.push(`mounted-but-empty: route ${route} missing selector ${selector}`);
    }
  }
  for (const destination of report.connections ?? []) {
    if (!isLoopback(destination)) {
      findings.push(`non-loopback connection: ${destination}`);
    }
  }
  return { ok: findings.length === 0, findings, digest: report.digest ?? null };
}

// ---------------------------------------------------------------------------
// v2.16.2 Phase 3 (T010): behavioral report judgment for the packaged
// image-edit check. Separate from the route-only `evaluateSmoke` above, with
// its own versioned contract; a route-only report can never pass it.
// ---------------------------------------------------------------------------

export const BEHAVIORAL_SCHEMA = "nexus.packaged-image-edit/v1";

export const BEHAVIORAL_PHASES = Object.freeze([
  "refusals",
  "seed",
  "launch",
  "open",
  "edit",
  "export",
  "stop",
  "relaunch",
  "readBack",
  "render",
  "sourcePreservation",
  "realProfile",
]);

/**
 * Judge a behavioral report for one run. Fails closed: a missing field, a
 * phase that did not pass, a mismatched run or executable identity, a
 * controlled-defect run, a lost edit, a render mismatch, changed source
 * bytes, a changed real profile or a stale report each produce a finding.
 */
export function evaluateBehavioralReport(report, expected = {}) {
  const findings = [];
  const now = expected.now ?? Date.now();
  const maxAgeMs = expected.maxAgeMs ?? 60 * 60 * 1000;
  if (!report || typeof report !== "object") {
    return { ok: false, findings: ["malformed: report is not an object"] };
  }
  if (report.schemaVersion !== BEHAVIORAL_SCHEMA) {
    findings.push(
      "selectors" in report || "launched" in report
        ? "route-only report: not a behavioral report"
        : `schema: expected ${BEHAVIORAL_SCHEMA}, got ${report.schemaVersion ?? "none"}`,
    );
    return { ok: false, findings };
  }
  if (report.mode !== "edit") findings.push(`mode: expected edit, got ${report.mode}`);
  if (report.control !== null) findings.push(`controlled defect run (${report.control}) can never pass`);
  if (report.error) findings.push(`run error: ${report.error}`);
  if (!expected.runId || report.runId !== expected.runId) findings.push("identity: run id missing or mismatched");
  if (!/^[0-9a-f]{64}$/.test(String(expected.exeSha256 ?? "")) || report.executable?.sha256 !== expected.exeSha256) {
    findings.push("identity: executable hash missing or mismatched");
  }
  if (!/^[0-9a-f]{40}$/.test(String(report.candidate?.commit ?? ""))) findings.push("identity: candidate commit missing");
  if (!report.ownedProfile?.root || !report.ownedProfile?.ownerRunId) findings.push("identity: owned profile missing");
  for (const name of BEHAVIORAL_PHASES) {
    const status = report.phases?.[name]?.status;
    if (status !== "pass") findings.push(`phase ${name}: ${status ?? "unobserved"}`);
  }
  const want = report.recipe?.expected?.brightness;
  if (typeof want !== "number") findings.push("recipe: expected state missing");
  if (report.recipe?.observed?.afterSave?.brightness !== want) findings.push("recipe: save not observed at the expected value");
  if (report.recipe?.observed?.afterRestart?.brightness !== want) findings.push("recipe: persisted value after restart differs");
  const launches = Array.isArray(report.launches) ? report.launches : [];
  if (launches.length < 2 || new Set(launches.map((l) => l.appPid)).size < 2) {
    findings.push("launches: two distinct owned launches were not observed");
  }
  if (launches.some((l) => !l.seededSessionVisible)) findings.push("launches: seeded session not visible");
  const render = report.render ?? {};
  if (!render.ok || render.mismatchedPixels !== 0 || !(render.changedChannels > 0)) {
    findings.push("render: rendered pixels do not match the expected edit");
  }
  const source = report.sourcePreservation ?? {};
  if (!source.expectedSha256 || source.fixtureSha256 !== source.expectedSha256 || source.seededSha256 !== source.expectedSha256) {
    findings.push("source: original image bytes changed or unobserved");
  }
  if (!Array.isArray(report.realProfileChanged) || report.realProfileChanged.length !== 0) {
    findings.push("real profile: changed or unobserved");
  }
  const started = Date.parse(report.startedAt ?? "");
  const finished = Date.parse(report.finishedAt ?? "");
  if (!Number.isFinite(started) || !Number.isFinite(finished) || finished < started) {
    findings.push("timestamps: missing or out of order");
  } else if (now - finished > maxAgeMs) {
    findings.push(`stale: report finished ${Math.round((now - finished) / 1000)} s ago`);
  }
  return { ok: findings.length === 0, findings };
}
