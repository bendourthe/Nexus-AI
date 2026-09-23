import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");

function read(relative: string): string {
  return readFileSync(join(ROOT, relative), "utf8");
}

describe("splat packaging parity", () => {
  it("keeps TripoSplat opt-in and keeps Flash-Next and remote splat services out", () => {
    const catalog = JSON.parse(read("core/registry/catalog.json")) as {
      models: { id: string; tags?: string[]; weights?: unknown; license?: string }[];
    };
    const recommended = read("core/registry/recommended.json");
    const adapter = read("desktop/sidecar/src/image/TripoSplatAdapter.ts");
    const ids = catalog.models.map((model) => model.id);
    expect(ids).toContain("triposplat");
    expect(ids).not.toContain("qwen3.8-flash-next");
    expect(JSON.stringify(catalog)).not.toContain("Qwen3.8-Flash-Next");
    expect(JSON.stringify(catalog)).not.toContain("unsloth/Qwen3.8-Flash-Next-GGUF");
    const row = catalog.models.find((model) => model.id === "triposplat");
    expect(row?.tags ?? []).not.toContain("recommended");
    expect(row?.license).toBe("MIT");
    expect(row?.weights).toBeUndefined();
    expect(recommended).not.toContain("triposplat");
    expect(adapter).not.toMatch(/https?:\/\//);
    expect(adapter).toContain("shell: false");
    expect(adapter).not.toContain("Unsloth Desktop");
  });
});
