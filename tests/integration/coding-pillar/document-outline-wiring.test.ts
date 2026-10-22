import { afterEach, describe, expect, it, vi } from "vitest";
import { TOOL_CATALOG } from "../../../src/tools/ToolCatalog.js";
import { buildToolRegistry } from "../../../src/tools/ToolRegistryBuilder.js";
import { BUILTIN_TOOL_NAMES } from "../../../src/tools/types.js";
afterEach(() => vi.unstubAllEnvs());
describe("outline retirement in extension composition", () => {
  it("does not advertise or register either tool despite stale opt-ins", () => {
    vi.stubEnv("NEXUS_DOCUMENT_OUTLINE", "1");
    const registry = buildToolRegistry({ gate: null, secretPathDenyExtra: [], documentOutline: { getTools: () => { throw new Error("retired factory invoked"); } } } as never);
    for (const name of ["document_outline", "document_read_section"]) {
      expect(BUILTIN_TOOL_NAMES).not.toContain(name);
      expect(TOOL_CATALOG.map((t) => t.name)).not.toContain(name);
      expect(registry.has(name)).toBe(false);
    }
    expect(TOOL_CATALOG.map((t) => t.name)).toContain("parse_document");
  });
});
