/**
 * Node side of the pinned checker adapter (v2.15.0).
 *
 * Runs scripts/known-gaps/checker-adapter.py, which verifies the checker's
 * sha256 pin before importing it, and returns its JSON.
 */

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ADAPTER = resolve(ROOT, "scripts/known-gaps/checker-adapter.py");
const PYTHON = process.env.PYTHON ?? (process.platform === "win32" ? "python" : "python3");

export function runAdapter(args, input) {
  const result = spawnSync(PYTHON, ["-I", ADAPTER, ...args], {
    cwd: ROOT,
    input,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  });
  if (result.error) throw new Error(`checker adapter did not start: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`checker adapter failed (${result.status}): ${result.stderr.trim()}`);
  return JSON.parse(result.stdout);
}

/** The adapter's discovery, with each ledger's raw text attached. */
export function discoverLedgers(root = ROOT) {
  const found = runAdapter(["discover", "--root", root]);
  return {
    pin: found.pin,
    unreadable: found.unreadable,
    ledgers: found.ledgers.map((ledger) => ({
      ...ledger,
      text: readFileSync(resolve(root, ledger.path), "utf8"),
    })),
  };
}
