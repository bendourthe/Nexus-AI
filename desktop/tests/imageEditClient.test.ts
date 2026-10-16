/**
 * v2.13.0 Phase 5 -- the renderer client for durable Image Studio edits.
 */

import { afterEach, describe, expect, it } from "vitest";

import { clearInvokeOverride, setInvokeOverride } from "../src/lib/ipc";
import {
  createDurableImageEdit,
  ImageEditRequestError,
  loadStudioImage,
  toImageEditError,
} from "../src/shared/studio/imageEditClient";

afterEach(() => clearInvokeOverride());

const turn = { sessionId: "s-1", turnId: "t-1" };

function sidecar(reply: (method: string, params: Record<string, unknown>) => unknown) {
  const calls: { method: string; params: Record<string, unknown> }[] = [];
  setInvokeOverride(async (cmd, args) => {
    if (cmd !== "ipc_call") throw new Error(`unexpected command ${cmd}`);
    const { method, params } = args as { method: string; params: Record<string, unknown> };
    calls.push({ method, params });
    return reply(method, params);
  });
  return calls;
}

describe("toImageEditError", () => {
  it("keeps a known sidecar code and its message", () => {
    const error = toImageEditError("REVISION_CONFLICT: The image recipe revision is stale.");
    expect(error).toBeInstanceOf(ImageEditRequestError);
    expect(error.code).toBe("REVISION_CONFLICT");
    expect(error.message).toBe("The image recipe revision is stale.");
  });

  it("maps anything else, including transport failures, to UNAVAILABLE", () => {
    expect(toImageEditError("ipc-unavailable").code).toBe("UNAVAILABLE");
    expect(toImageEditError("SOMETHING_ELSE: nope").code).toBe("UNAVAILABLE");
    expect(toImageEditError("").message).toBe("Image edits are unavailable.");
  });
});

describe("createDurableImageEdit", () => {
  it("calls the five sidecar methods with the turn and grant it was given", async () => {
    const recipe = { revision: 1 };
    const calls = sidecar((method) => {
      if (method === "studio.image.edit.open") return { grantId: "g", identity: {}, recipe, png: "AAAA" };
      if (method === "studio.image.edit.commit") return { recipe, capabilities: {} };
      if (method === "studio.image.edit.revision") return { revision: 7 };
      if (method === "studio.image.edit.close") return { ok: true };
      if (method === "studio.image.media") return { png: "QkJC" };
      throw new Error(method);
    });
    const edit = createDurableImageEdit(turn);
    expect((await edit.open()).grantId).toBe("g");
    expect(await edit.commit("g", { kind: "reset" }, 0)).toBe(recipe);
    expect(await edit.revision("g")).toBe(7);
    await edit.close("g");
    expect(await loadStudioImage(turn)).toBe("data:image/png;base64,QkJC");
    expect(calls).toEqual([
      { method: "studio.image.edit.open", params: turn },
      { method: "studio.image.edit.commit", params: { grantId: "g", action: { kind: "reset" }, expectedRevision: 0 } },
      { method: "studio.image.edit.revision", params: { grantId: "g" } },
      { method: "studio.image.edit.close", params: { grantId: "g" } },
      { method: "studio.image.media", params: turn },
    ]);
  });

  it("surfaces a sidecar refusal as a typed error", async () => {
    sidecar(() => {
      throw new Error("SOURCE_CHANGED: The recipe no longer matches its original image.");
    });
    await expect(createDurableImageEdit(turn).open()).rejects.toMatchObject({ code: "SOURCE_CHANGED" });
  });
});
