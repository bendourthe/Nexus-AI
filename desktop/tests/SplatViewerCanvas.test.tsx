import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { GaussianCloud } from "../../core/image/GaussianSplat";
import { SplatViewerCanvas } from "../src/modules/image/SplatViewerCanvas";
import { SPLAT_MIN_DISTANCE, SPLAT_MAX_PITCH } from "../src/modules/image/splatCamera";
import { SPLAT_CONTEXT_CAP, resetSplatContexts } from "../src/modules/image/splatRaster";

function cloud(): GaussianCloud {
  return {
    format: "splat",
    count: 1,
    positions: new Float32Array([0, 0, 0]),
    scales: new Float32Array([0.1, 0.1, 0.1]),
    rotations: new Float32Array([0, 0, 0, 1]),
    colors: new Uint8Array([10, 20, 30, 255]),
  };
}

function stubGl(): WebGL2RenderingContext {
  return {
    VERTEX_SHADER: 35633,
    FRAGMENT_SHADER: 35632,
    COMPILE_STATUS: 35713,
    LINK_STATUS: 35714,
    ARRAY_BUFFER: 34962,
    DYNAMIC_DRAW: 35048,
    FLOAT: 5126,
    UNSIGNED_BYTE: 5121,
    SRC_ALPHA: 770,
    ONE_MINUS_SRC_ALPHA: 771,
    BLEND: 3042,
    DEPTH_TEST: 2929,
    COLOR_BUFFER_BIT: 16384,
    DEPTH_BUFFER_BIT: 256,
    POINTS: 0,
    createShader: () => ({}),
    shaderSource: () => undefined,
    compileShader: () => undefined,
    getShaderParameter: () => true,
    deleteShader: () => undefined,
    createProgram: () => ({}),
    attachShader: () => undefined,
    linkProgram: () => undefined,
    getProgramParameter: () => true,
    deleteProgram: () => undefined,
    createBuffer: () => ({}),
    getUniformLocation: () => ({}),
    getAttribLocation: () => 0,
    viewport: () => undefined,
    enable: () => undefined,
    blendFunc: () => undefined,
    clearColor: () => undefined,
    clear: () => undefined,
    useProgram: () => undefined,
    uniformMatrix4fv: () => undefined,
    bindBuffer: () => undefined,
    bufferData: () => undefined,
    enableVertexAttribArray: () => undefined,
    vertexAttribPointer: () => undefined,
    drawArrays: () => undefined,
    getExtension: () => ({ loseContext: () => undefined, restoreContext: () => undefined }),
  } as unknown as WebGL2RenderingContext;
}

function fake2d(): CanvasRenderingContext2D {
  return {
    fillStyle: "",
    clearRect: () => undefined,
    fillRect: () => undefined,
    beginPath: () => undefined,
    arc: () => undefined,
    fill: () => undefined,
  } as unknown as CanvasRenderingContext2D;
}

function mockContexts(webgl2: boolean): { types: string[]; contexts: object[]; restore: () => void } {
  const types: string[] = [];
  const contexts: object[] = [];
  const bound = new WeakMap<object, string>();
  const getContext = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (
    this: HTMLCanvasElement,
    type: string,
  ) {
    types.push(type);
    const existing = bound.get(this);
    if (existing && existing !== type) return null;
    if (type === "webgl2" && webgl2) {
      const gl = stubGl();
      bound.set(this, "webgl2");
      contexts.push(gl);
      return gl as unknown as RenderingContext;
    }
    if (type === "2d") {
      bound.set(this, "2d");
      return fake2d() as unknown as RenderingContext;
    }
    return null;
  });
  const raf = vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 1);
  const caf = vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);
  return {
    types,
    contexts,
    restore: () => {
      getContext.mockRestore();
      raf.mockRestore();
      caf.mockRestore();
    },
  };
}

afterEach(() => {
  cleanup();
  resetSplatContexts();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("SplatViewerCanvas", () => {
  it("rejects a remote path and does not fetch or open a socket", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    const sockets: string[] = [];
    vi.stubGlobal(
      "WebSocket",
      class {
        constructor(url: string) {
          sockets.push(url);
        }
      },
    );
    render(<SplatViewerCanvas source={{ kind: "path", path: "https://3daistudio.com/room.splat" }} />);
    expect(screen.getByRole("alert").textContent).toMatch(/local file/i);
    expect(screen.getByTestId("splat-viewer")).toHaveAttribute("data-splat-error", "remote-url");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(sockets).toEqual([]);
  });

  it("shows a still-frame message when WebGL2 is missing", () => {
    const mocked = mockContexts(false);
    try {
      render(<SplatViewerCanvas cloud={cloud()} />);
      expect(screen.getByTestId("splat-fallback").textContent).toMatch(/WebGL2 is unavailable/);
      expect(screen.getByTestId("splat-viewer")).toHaveAttribute("data-splat-fallback", "webgl2-missing");
      expect(mocked.types).not.toContain("webgl");
    } finally {
      mocked.restore();
    }
  });

  it("uses a distinct WebGL2 context per canvas until the metal cap", () => {
    const mocked = mockContexts(true);
    try {
      const { unmount } = render(
        <>
          {Array.from({ length: SPLAT_CONTEXT_CAP + 1 }, (_, index) => (
            <SplatViewerCanvas key={index} cloud={cloud()} />
          ))}
        </>,
      );
      expect(mocked.contexts).toHaveLength(SPLAT_CONTEXT_CAP);
      expect(new Set(mocked.contexts).size).toBe(SPLAT_CONTEXT_CAP);
      expect(mocked.types).not.toContain("webgl");
      expect(screen.getAllByTestId("splat-fallback").some((node) => node.textContent?.includes("GPU preview limit"))).toBe(
        true,
      );
      unmount();
    } finally {
      mocked.restore();
    }
  });

  it("orbits, zooms, and pans inside bounds from the keyboard", () => {
    const mocked = mockContexts(false);
    try {
    render(<SplatViewerCanvas cloud={cloud()} />);
    const viewer = screen.getByTestId("splat-viewer");
    const startYaw = Number(viewer.getAttribute("data-camera-yaw"));
    fireEvent.keyDown(viewer, { key: "ArrowRight" });
    expect(Number(screen.getByTestId("splat-viewer").getAttribute("data-camera-yaw"))).toBeGreaterThan(startYaw);
    for (let i = 0; i < 40; i++) fireEvent.keyDown(screen.getByTestId("splat-viewer"), { key: "+" });
    expect(Number(screen.getByTestId("splat-viewer").getAttribute("data-camera-distance"))).toBeGreaterThanOrEqual(
      SPLAT_MIN_DISTANCE,
    );
    for (let i = 0; i < 40; i++) fireEvent.keyDown(screen.getByTestId("splat-viewer"), { key: "ArrowUp" });
    expect(Number(screen.getByTestId("splat-viewer").getAttribute("data-camera-pitch"))).toBeLessThanOrEqual(SPLAT_MAX_PITCH);
    fireEvent.keyDown(screen.getByTestId("splat-viewer"), { key: "ArrowRight", shiftKey: true });
    expect(Number(screen.getByTestId("splat-viewer").getAttribute("data-camera-pan"))).toBeGreaterThan(0);
    } finally {
      mocked.restore();
    }
  });

  it("does not keep inertial spin when reduced motion is on", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
    );
    const mocked = mockContexts(false);
    try {
      render(<SplatViewerCanvas cloud={cloud()} />);
      const canvas = screen.getByTestId("splat-canvas");
      fireEvent.pointerDown(canvas, { clientX: 0, clientY: 0, button: 0 });
      fireEvent.pointerMove(canvas, { clientX: 40, clientY: 0, button: 0 });
      fireEvent.pointerUp(canvas);
      expect(screen.getByTestId("splat-viewer")).toHaveAttribute("data-reduced-motion", "true");
      expect(screen.getByTestId("splat-viewer")).toHaveAttribute("data-camera-spin", "0.0000");
    } finally {
      mocked.restore();
    }
  });

  it("saves a PNG from the canvas and recovers a lost context to the still frame", () => {
    const mocked = mockContexts(true);
    const png = vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/png;base64,aaa");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    const onScreenshot = vi.fn();
    try {
      render(<SplatViewerCanvas cloud={cloud()} onScreenshot={onScreenshot} />);
      fireEvent.click(screen.getByRole("button", { name: "Save PNG preview" }));
      expect(png).toHaveBeenCalledWith("image/png");
      expect(onScreenshot).toHaveBeenCalledWith("data:image/png;base64,aaa");
      expect(fetchSpy).not.toHaveBeenCalled();
      const canvas = screen.getByTestId("splat-canvas");
      act(() => {
        canvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true }));
      });
      expect(screen.getByTestId("splat-viewer")).toHaveAttribute("data-splat-fallback", "context-lost");
      expect(screen.getByRole("button", { name: "Retry preview" })).toBeTruthy();
    } finally {
      mocked.restore();
    }
  });

  it("caps the viewport and explains an empty cloud", () => {
    const mocked = mockContexts(false);
    try {
    render(<SplatViewerCanvas cloud={{ ...cloud(), count: 0, positions: new Float32Array() }} width={9000} height={9000} />);
    const viewer = screen.getByTestId("splat-viewer");
    expect(viewer).toHaveAttribute("data-viewport-width", "2048");
    expect(viewer).toHaveAttribute("data-viewport-height", "2048");
    expect(screen.getByText("No Gaussians to show.")).toBeTruthy();
    } finally {
      mocked.restore();
    }
  });
});
