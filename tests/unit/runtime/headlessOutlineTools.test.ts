import { afterEach, describe, expect, it, vi } from "vitest";
import { createHeadlessTools } from "../../../modules/coding/runtime/headlessTools.js";
afterEach(() => vi.unstubAllEnvs());
describe("outline retirement in shared headless composition", () => {
  it("ignores stale runtime options and environment opt-ins", () => {
    vi.stubEnv("NEXUS_DOCUMENT_OUTLINE", "1");
    vi.stubEnv("NEXUS_DOCUMENT_OUTLINE_SUMMARIES", "1");
    const tools = createHeadlessTools({ documentOutlineEnabled: true, outlineSummaries: { model: () => "unused" } } as never);
    expect(tools.map((t) => t.name)).not.toContain("document_outline");
    expect(tools.map((t) => t.name)).not.toContain("document_read_section");
    expect(tools.map((t) => t.name)).toContain("read_file");
  });
});
