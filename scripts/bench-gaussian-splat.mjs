/**
 * Gaussian splat benchmark.
 * Default mode uses a deterministic one-row splat so CI does not need CUDA.
 * `--real` records that a live NVIDIA measurement was not run.
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";

const real = process.argv.includes("--real");
const root = mkdtempSync(path.join(tmpdir(), "nexus-splat-bench-"));

function stubSplat() {
  const bytes = Buffer.alloc(32);
  bytes.writeFloatLE(0, 0);
  bytes.writeFloatLE(0, 4);
  bytes.writeFloatLE(0, 8);
  bytes.writeFloatLE(0.1, 12);
  bytes.writeFloatLE(0.1, 16);
  bytes.writeFloatLE(0.1, 20);
  bytes.set([180, 90, 40, 255], 24);
  bytes.set([0, 0, 0, 255], 28);
  return bytes;
}

function report(row) {
  process.stdout.write(`${JSON.stringify(row)}\n`);
}

try {
  const source = path.join(root, "still.png");
  writeFileSync(source, Buffer.from("object-centric-still"));
  if (readFileSync(source).byteLength === 0) {
    throw new Error("fixture is empty");
  }
  if (real) {
    report({
      mode: "real",
      platform: process.platform,
      wallMs: null,
      peakRamBytes: "not observed",
      peakVramBytes: "not observed",
      gaussianCount: null,
      outputBytes: null,
      validation: "not proven here",
      failure: "real-backend-not-invoked",
    });
  } else {
    const started = performance.now();
    const bytes = stubSplat();
    const count = bytes.byteLength / 32;
    const wallMs = Math.round(performance.now() - started);
    report({
      mode: "fake",
      platform: process.platform,
      wallMs,
      peakRamBytes: "not observed",
      peakVramBytes: "not observed",
      gaussianCount: count,
      outputBytes: bytes.byteLength,
      validation: count === 1 ? "pass" : "fail",
      failure: null,
    });
  }
} finally {
  rmSync(root, { recursive: true, force: true });
}
