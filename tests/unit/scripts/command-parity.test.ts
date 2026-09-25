import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { checkParity, enumerateMethods } from "../../../scripts/check-command-parity.mjs";

const features = new Map([["f001", { id: "f001", evidence: "feature_list.json" }]]);

function writeRegistry(dir: string, body: string): string {
  const file = path.join(dir, "extra.ts");
  fs.writeFileSync(file, body);
  return file;
}

describe("command parity", () => {
  it("fails an unmapped command from a brand-new file", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "parity-"));
    const file = writeRegistry(dir, 'export const IPC_METHODS = [\n  "brand.new.command",\n] as const;\n');
    const enumerated = enumerateMethods([file]);
    const report = checkParity({
      commands: enumerated.commands,
      errors: enumerated.errors,
      bindings: [],
      features,
      snapshot: 1,
      root: process.cwd(),
    });
    expect(report.findings.some((finding) => finding.includes("unmapped command: brand.new.command"))).toBe(true);
  });

  it("fails the floor when the registration idiom matches nothing", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "parity-"));
    const file = writeRegistry(dir, "export const METHODS = [\n  \"ping\",\n] as const;\n");
    const enumerated = enumerateMethods([file]);
    expect(enumerated.commands).toEqual([]);
    const report = checkParity({
      commands: enumerated.commands,
      errors: enumerated.errors,
      bindings: [],
      features,
      snapshot: 1,
      root: process.cwd(),
    });
    expect(report.findings.some((finding) => finding.startsWith("floor:"))).toBe(true);
    expect(report.findings.some((finding) => finding.startsWith("unmapped"))).toBe(false);
  });

  it("fails when the live count is below the snapshot", () => {
    const report = checkParity({
      commands: [{ command: "ping", file: "a.ts" }],
      errors: [],
      bindings: [{ command: "ping", exempt: true, reason: "probe" }],
      features,
      snapshot: 2,
      root: process.cwd(),
    });
    expect(report.findings.some((finding) => finding.includes("below") || finding.includes("snapshot"))).toBe(true);
  });

  it("reports a command claimed twice", () => {
    const report = checkParity({
      commands: [{ command: "ping", file: "a.ts" }],
      errors: [],
      bindings: [
        { command: "ping", feature: "f001" },
        { command: "ping", exempt: true, reason: "also" },
      ],
      features,
      snapshot: 1,
      root: process.cwd(),
    });
    expect(report.findings.some((finding) => finding.includes("claimed 2 times"))).toBe(true);
  });

  it("reports a dead evidence path", () => {
    const report = checkParity({
      commands: [{ command: "ping", file: "a.ts" }],
      errors: [],
      bindings: [{ command: "ping", feature: "f001" }],
      features: new Map([["f001", { id: "f001", evidence: "does/not/exist.ts" }]]),
      snapshot: 1,
      root: process.cwd(),
    });
    expect(report.findings.some((finding) => finding.includes("dead evidence"))).toBe(true);
  });

  it("fails an exemption that has no reason", () => {
    const report = checkParity({
      commands: [{ command: "ping", file: "a.ts" }],
      errors: [],
      bindings: [{ command: "ping", exempt: true, reason: "  " }],
      features,
      snapshot: 1,
      root: process.cwd(),
    });
    expect(report.findings.some((finding) => finding.includes("missing reason"))).toBe(true);
  });
});
