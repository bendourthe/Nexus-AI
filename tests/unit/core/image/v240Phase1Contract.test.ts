import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "../../../..");

function read(rel: string): string {
  return readFileSync(path.join(root, rel), "utf8");
}

describe("v2.4.0 phase 1 splat contract", () => {
  it("keeps Qwen3.8-Flash-Next and the Unsloth GGUF out of the catalog", () => {
    const catalog = read("core/registry/catalog.json");
    expect(catalog).not.toContain("qwen3.8-flash-next");
    expect(catalog).not.toContain("Qwen3.8-Flash-Next");
    expect(catalog).not.toContain("unsloth/Qwen3.8-Flash-Next-GGUF");
  });

  it("assigns each comparison acceptance item to a later phase or an explicit drop", () => {
    const contract = read("docs/archive/v2/v2.4/development/gaussian-splat-contract.md");
    const plan = read("docs/archive/v2/v2.4/plans/v2.4.0-adoption-unsloth-qwen38-gaussian-splatting.md");
    for (const id of ["Q-1", "Q-2", "Q-3", "G-V", "G-G", "G-M", "G-S"]) {
      expect(contract).toContain(id);
    }
    for (const task of ["T004", "T005", "T007", "T010", "T013", "T014"]) {
      expect(plan).toContain(task);
      expect(contract).toContain(task);
    }
    expect(contract).toContain("Deferred");
    expect(contract).toContain("Dropped");
    expect(contract).toContain("This is a generated 3D preview. Unseen sides are invented. It is not a measured property tour.");
  });
});
