import { describe, expect, it } from "vitest";

import {
  DOCUMENT_OUTLINE_SETTING_KEY,
  DOCUMENT_OUTLINE_SUMMARIES_SETTING_KEY,
} from "../../core/documents/documentOutlineEnabled";
import { InMemorySettingsStore } from "../../core/storage/SettingsStore";
import {
  createSidecarHeadlessTools,
  resolveSidecarDocumentOutlineEnabled,
} from "../sidecar/src/coding/sidecarHeadlessTools";
import { createHandlerContext, dispatch } from "../sidecar/src/handlers";
import { IPC_METHODS, METHOD_SCHEMAS } from "../sidecar/src/protocol";

describe("coding.documentOutline settings IPC", () => {
  it("declares status and setEnabled", () => {
    expect(IPC_METHODS).toContain("coding.documentOutline.status");
    expect(IPC_METHODS).toContain("coding.documentOutline.setEnabled");
    expect(METHOD_SCHEMAS["coding.documentOutline.status"]?.implemented).toBe(true);
    expect(METHOD_SCHEMAS["coding.documentOutline.setEnabled"]?.implemented).toBe(true);
  });

  it("persists the opt-in and keeps summaries behind the outline flag", async () => {
    const settings = new InMemorySettingsStore();
    const ctx = createHandlerContext({ pid: 1, platform: process.platform });
    ctx.settings = settings;
    const before = (await dispatch("coding.documentOutline.status", {}, ctx)) as { enabled: boolean; summariesEnabled: boolean };
    expect(before).toStrictEqual({ enabled: false, summariesEnabled: false });
    await settings.set(DOCUMENT_OUTLINE_SUMMARIES_SETTING_KEY, true);
    const stillOff = (await dispatch("coding.documentOutline.status", {}, ctx)) as { summariesEnabled: boolean };
    expect(stillOff.summariesEnabled).toBe(false);
    const after = (await dispatch("coding.documentOutline.setEnabled", { enabled: true }, ctx)) as {
      enabled: boolean;
      summariesEnabled: boolean;
    };
    expect(after).toStrictEqual({ enabled: true, summariesEnabled: true });
    expect(await settings.get<boolean>(DOCUMENT_OUTLINE_SETTING_KEY)).toBe(true);
  });
});

describe("sidecar outline flag", () => {
  it("agrees with the extension's resolution and registers the tools only when on", () => {
    expect(resolveSidecarDocumentOutlineEnabled({ env: {}, outlineSettingsValue: true })).toBe(true);
    expect(resolveSidecarDocumentOutlineEnabled({ env: { NEXUS_DOCUMENT_OUTLINE: "0" }, outlineSettingsValue: true })).toBe(false);
    const on = createSidecarHeadlessTools({ documentOutlineEnabled: true, outlineCacheDir: null, parseDocumentEnabled: false }).map((t) => t.name);
    const off = createSidecarHeadlessTools({ documentOutlineEnabled: false, parseDocumentEnabled: false }).map((t) => t.name);
    expect(on).toContain("document_outline");
    expect(on).toContain("document_read_section");
    expect(on).not.toContain("parse_document");
    expect(off).not.toContain("document_outline");
  });
});
