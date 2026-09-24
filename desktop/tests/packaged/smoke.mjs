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
  const host = String(destination).replace(/^[a-z]+:\/\//, "").split("/")[0].split(":")[0];
  return host === "127.0.0.1" || host === "localhost" || host === "::1" || host === "[::1]";
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
