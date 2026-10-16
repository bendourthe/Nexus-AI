/**
 * v2.13.0 Phase 6 -- the renderer side of the render bridge. Canvas pixels are
 * covered by the WebView check; this pins the claim/answer protocol.
 */

import { afterEach, describe, expect, it, vi } from "vitest";

import { clearInvokeOverride, setInvokeOverride } from "../src/lib/ipc";
import { serveOneRenderRequest } from "../src/shared/studio/useImageRenderBridge";

afterEach(() => clearInvokeOverride());

const request = {
  requestId: "7f9c2b8e-1d3a-4c5b-8e6f-0a1b2c3d4e5f",
  revision: 2,
  sourceSha256: "a".repeat(64),
  width: 1,
  height: 1,
  adjustments: { brightness: 120, contrast: 100, saturation: 100, sharpness: 0 },
  marks: [],
  png: "iVBORw0KGgo=",
};

function sidecar(claim: unknown) {
  const completed: Record<string, unknown>[] = [];
  setInvokeOverride(async (_cmd, args) => {
    const { method, params } = args as { method: string; params: Record<string, unknown> };
    if (method === "studio.image.render.claim") return { request: claim };
    if (method === "studio.image.render.complete") {
      completed.push(params);
      return { accepted: true };
    }
    throw new Error(method);
  });
  return completed;
}

describe("serveOneRenderRequest", () => {
  it("does nothing when no request is waiting", async () => {
    const completed = sidecar(null);
    const render = vi.fn();
    expect(await serveOneRenderRequest(render)).toBe(false);
    expect(render).not.toHaveBeenCalled();
    expect(completed).toEqual([]);
  });

  it("renders a claimed request with its recipe state and answers with the PNG", async () => {
    const completed = sidecar(request);
    const render = vi.fn(async () => new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" }));
    expect(await serveOneRenderRequest(render)).toBe(true);
    expect(render).toHaveBeenCalledWith(expect.any(Blob), request.adjustments, request.marks);
    expect(completed).toEqual([{ requestId: request.requestId, ok: true, png: "AQID" }]);
  });

  it("reports a render failure instead of an image", async () => {
    const completed = sidecar(request);
    const render = vi.fn(async () => {
      throw new Error("pixels cannot be read back");
    });
    expect(await serveOneRenderRequest(render)).toBe(true);
    expect(completed).toEqual([{ requestId: request.requestId, ok: false, message: "pixels cannot be read back" }]);
  });
});
