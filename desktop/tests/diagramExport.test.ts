import { describe, expect, it, vi } from "vitest";
import {
  assertNoHttpScheme,
  rasterizeSanitizedSvg,
  sanitizeExportFilename,
  sanitizeExportSvg,
  saveDiagram,
} from "../src/shared/studio/diagramExport";

const HOSTILE = `<svg xmlns="http://www.w3.org/2000/svg">
  <script>alert(1)</script>
  <foreignObject><div>x</div></foreignObject>
  <image href="https://example.invalid/a.png"></image>
  <style>@font-face { src: url("https://example.invalid/font.woff"); }</style>
  <text>Label</text>
</svg>`;

describe("diagram export", () => {
  it("strips script, foreignObject, and every http scheme", () => {
    const svg = sanitizeExportSvg(HOSTILE);
    expect(svg.toLowerCase()).not.toContain("<script");
    expect(svg.toLowerCase()).not.toContain("foreignobject");
    expect(svg.toLowerCase()).not.toContain("example.invalid");
    expect(() => assertNoHttpScheme(svg)).not.toThrow();
    expect(svg).toContain("Label");
    expect(() => assertNoHttpScheme(svg)).not.toThrow();
  });

  it("makes no network attempt while rasterising a remote image and font", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const png = await rasterizeSanitizedSvg(HOSTILE, () => new Uint8Array([137, 80, 78, 71]));
    expect(png[0]).toBe(137);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("rejects a renderer-supplied path and sanitises the default name", async () => {
    const saver = vi.fn(async (request: { suggestedName: string; path?: string }) => {
      if (request.path) throw new Error("renderer-supplied path rejected");
      return "saved";
    });
    const name = sanitizeExportFilename(String.raw`..\..\CON`, "png");
    expect(name).toBe("diagram.png");
    expect(name.includes("\\") || name.includes("/")).toBe(false);
    expect(sanitizeExportFilename("LPT1", "svg")).toBe("diagram.svg");
    const saved = await saveDiagram(saver, {
      suggestedName: "diagram-v1",
      svg: "<svg><text>Label</text></svg>",
      extension: "svg",
    });
    expect(saved).toBe("saved");
    expect(saver.mock.calls[0]?.[0].path).toBeUndefined();
    expect(saver.mock.calls[0]?.[0].suggestedName).toBe("diagram-v1.svg");
    await expect(
      saveDiagram(
        async (request) => {
          throw new Error(`export failed for ${request.extension}`);
        },
        { suggestedName: "diagram-v1", svg: "<svg></svg>", extension: "png", pngBytes: new Uint8Array([1]) },
      ),
    ).rejects.toThrow(/export failed/);
  });
});
