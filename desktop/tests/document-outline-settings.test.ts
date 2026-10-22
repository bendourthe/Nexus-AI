import { afterEach, describe, expect, it, vi } from "vitest";
import { InMemorySettingsStore } from "../../core/storage/SettingsStore";
import { createSidecarHeadlessTools } from "../sidecar/src/coding/sidecarHeadlessTools";
import { createHandlerContext, dispatch } from "../sidecar/src/handlers";
import { IPC_METHODS, METHOD_SCHEMAS } from "../sidecar/src/protocol";

afterEach(() => vi.unstubAllEnvs());
describe("retired document outline controls", () => {
  it("refuses both retired methods even with persisted opt-ins", async () => {
    const ctx = createHandlerContext({ pid: 1, platform: process.platform });
    ctx.settings = new InMemorySettingsStore();
    await ctx.settings.set("nexus.coding.documentOutline.enabled", true);
    await ctx.settings.set("nexus.coding.documentOutline.summaries.enabled", true);
    for (const method of ["coding.documentOutline.status", "coding.documentOutline.setEnabled"]) {
      expect(IPC_METHODS).not.toContain(method);
      expect(Object.keys(METHOD_SCHEMAS)).not.toContain(method);
      await expect(dispatch(method, { enabled: true }, ctx)).rejects.toThrow("UnknownMethod");
    }
    expect(await dispatch("coding.parseDocument.status", {}, ctx)).toEqual({ enabled: false });
    expect(await dispatch("coding.parseDocument.setEnabled", { enabled: true }, ctx)).toEqual({ enabled: true });
  });
  it("ignores retired flags but keeps independent document parsing opt-in", () => {
    vi.stubEnv("NEXUS_DOCUMENT_OUTLINE", "1");
    vi.stubEnv("NEXUS_DOCUMENT_OUTLINE_SUMMARIES", "1");
    const documentParser = { parse: async () => ({ engine: "fixture", text: "text", markdown: null, pageCount: 1 }) };
    const names = createSidecarHeadlessTools({ env: process.env, documentParser, parseDocumentEnabled: false }).map((t) => t.name);
    expect(names).not.toContain("document_outline");
    expect(names).not.toContain("document_read_section");
    expect(names).not.toContain("parse_document");
    const enabled = createSidecarHeadlessTools({ env: { NEXUS_PARSE_DOCUMENT: "1" }, documentParser }).map((t) => t.name);
    expect(enabled).toContain("parse_document");
  });
});
