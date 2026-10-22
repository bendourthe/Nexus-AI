import { afterEach, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("../../../scripts/check-docs-layout.mjs", import.meta.url));
const tempRoot = resolve(tmpdir());
const roots: string[] = [];

function fixture(active: "canonical" | "legacy"): string {
  const root = mkdtempSync(join(tempRoot, "nexus-docs-layout-"));
  roots.push(root);
  for (const path of [active === "canonical" ? "docs/releases/v2" : "docs/v2", "docs/archive/v0", "docs/archive/v1", "docs/archive/v2"]) {
    mkdirSync(join(root, path), { recursive: true });
  }
  return root;
}

function run(root: string) {
  return spawnSync(process.execPath, [script], { cwd: root, encoding: "utf8" });
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    if (dirname(root) !== tempRoot || !basename(root).startsWith("nexus-docs-layout-")) {
      throw new Error("Refusing cleanup outside the test temporary root");
    }
    rmSync(root, { recursive: true, force: true });
  }
});

describe("canonical documentation layout CLI", () => {
  it("accepts the tracked active layout without an empty legacy directory", () => {
    const result = run(fixture("canonical"));
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("canonical layout OK");
  });

  it("rejects a legacy-only active root", () => {
    const result = run(fixture("legacy"));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("expected canonical dir missing: docs/releases/v2/");
  });

  it("rejects patch-level buckets under the canonical active root", () => {
    const root = fixture("canonical");
    mkdirSync(join(root, "docs/releases/v2/v2.15.1"));
    const result = run(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("non-canonical patch-level dir:");
    expect(result.stderr).toContain("v2.15.1");
  });
});
