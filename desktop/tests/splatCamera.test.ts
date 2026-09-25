import { afterEach, describe, expect, it, vi } from "vitest";
import { MAX_GAUSSIANS, type GaussianCloud } from "../../core/image/GaussianSplat";
import {
  INITIAL_SPLAT_CAMERA,
  MAX_SPLAT_VIEWPORT_PX,
  SPLAT_MAX_DISTANCE,
  SPLAT_MAX_PAN,
  SPLAT_MAX_PITCH,
  SPLAT_MIN_DISTANCE,
  clampSplatViewport,
  orbitSplatCamera,
  panSplatCamera,
  splatClipOrigin,
  splatEye,
  stepSplatInertia,
  zoomSplatCamera,
} from "../src/modules/image/splatCamera";
import {
  SPLAT_CONTEXT_CAP,
  SPLAT_FRAGMENT_SHADER,
  SPLAT_VERTEX_SHADER,
  createSplatProgram,
  drawSplatFrame,
  drawSplatStill,
  exportCanvasPng,
  loadSplatViewer,
  releaseSplatContext,
  requestSplatContext,
  resetSplatContexts,
  tryAcquireSplatContext,
} from "../src/modules/image/splatRaster";

function cloudAtOrigin(): GaussianCloud {
  return {
    format: "splat",
    count: 1,
    positions: new Float32Array([0, 0, 0]),
    scales: new Float32Array([0.1, 0.1, 0.1]),
    rotations: new Float32Array([0, 0, 0, 1]),
    colors: new Uint8Array([200, 20, 20, 255]),
  };
}

function stubGl(overrides: Record<string, unknown> = {}): WebGL2RenderingContext {
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
    getExtension: () => null,
    ...overrides,
  } as unknown as WebGL2RenderingContext;
}

afterEach(() => {
  resetSplatContexts();
});

describe("splat camera bounds", () => {
  it("keeps zoom, pitch, and pan inside the contract", () => {
    let zoomed = INITIAL_SPLAT_CAMERA;
    let pulled = INITIAL_SPLAT_CAMERA;
    for (let i = 0; i < 12; i++) {
      zoomed = zoomSplatCamera(zoomed, -1);
      pulled = zoomSplatCamera(pulled, 1);
    }
    const pitched = orbitSplatCamera(INITIAL_SPLAT_CAMERA, 0, 10, false);
    const panned = panSplatCamera(INITIAL_SPLAT_CAMERA, 40, -40);
    expect(zoomed.distance).toBe(SPLAT_MIN_DISTANCE);
    expect(pulled.distance).toBe(SPLAT_MAX_DISTANCE);
    expect(pitched.pitch).toBe(SPLAT_MAX_PITCH);
    expect(panned.panX).toBe(SPLAT_MAX_PAN);
    expect(panned.panY).toBe(-SPLAT_MAX_PAN);
  });

  it("drops inertial spin when reduced motion is set", () => {
    const spinning = orbitSplatCamera(INITIAL_SPLAT_CAMERA, 0.2, 0.1, true);
    const stopped = stepSplatInertia(spinning, true);
    expect(stopped.spinYaw).toBe(0);
    expect(stopped.spinPitch).toBe(0);
    const stepped = stepSplatInertia(spinning, false);
    expect(Math.abs(stepped.yaw)).toBeGreaterThan(Math.abs(INITIAL_SPLAT_CAMERA.yaw));
    expect(Math.abs(stepped.spinYaw)).toBeLessThan(Math.abs(spinning.spinYaw));
  });

  it("caps the viewport and still frames the origin", () => {
    expect(clampSplatViewport(9000, -4)).toEqual({ width: MAX_SPLAT_VIEWPORT_PX, height: 480 });
    const clip = splatClipOrigin(INITIAL_SPLAT_CAMERA, 1);
    expect(clip.w).toBeGreaterThan(0);
    expect(Math.abs(clip.ndcX)).toBeLessThan(1.5);
    expect(Math.abs(clip.ndcY)).toBeLessThan(1.5);
    const eye = splatEye({ ...INITIAL_SPLAT_CAMERA, distance: 0 });
    const distance = Math.hypot(eye[0], eye[1], eye[2]);
    expect(distance).toBeGreaterThanOrEqual(SPLAT_MIN_DISTANCE - 0.01);
  });
});

describe("splat raster", () => {
  it("keeps shaders local and rejects remote view sources", () => {
    expect(SPLAT_VERTEX_SHADER.includes("http")).toBe(false);
    expect(SPLAT_FRAGMENT_SHADER.includes("http")).toBe(false);
    const remote = loadSplatViewer({ source: { kind: "path", path: "https://3daistudio.com/a.splat" } });
    expect(remote.error?.code).toBe("remote-url");
    expect(remote.cloud).toBeNull();
    const truncated = loadSplatViewer({
      source: { kind: "buffer", format: "splat", bytes: new Uint8Array([1, 2, 3]) },
    });
    expect(truncated.error?.code).toBe("truncated");
  });

  it("refuses a cloud over the Gaussian cap and does not share contexts past the metal cap", () => {
    const oversized = loadSplatViewer({ cloud: { ...cloudAtOrigin(), count: MAX_GAUSSIANS + 1 } });
    expect(oversized.error?.code).toBe("too-many");
    for (let i = 0; i < SPLAT_CONTEXT_CAP; i++) expect(tryAcquireSplatContext()).toBe(true);
    expect(tryAcquireSplatContext()).toBe(false);
    releaseSplatContext();
    expect(tryAcquireSplatContext()).toBe(true);
  });

  it("draws with WebGL2 and exports a PNG without fetching", () => {
    const drawArrays = vi.fn();
    const program = createSplatProgram(stubGl({ drawArrays }));
    expect(program).not.toBeNull();
    drawSplatFrame(program!, cloudAtOrigin(), INITIAL_SPLAT_CAMERA, 320, 240);
    expect(drawArrays).toHaveBeenCalledWith(0, 0, 1);
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("no network"));
    const canvas = {
      toDataURL: (type: string) => `data:${type};base64,aaa`,
    } as HTMLCanvasElement;
    expect(exportCanvasPng(canvas)).toBe("data:image/png;base64,aaa");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("returns null when the cap is full or the shader does not compile", () => {
    for (let i = 0; i < SPLAT_CONTEXT_CAP; i++) tryAcquireSplatContext();
    const getContext = vi.fn();
    const canvas = { getContext } as unknown as HTMLCanvasElement;
    expect(requestSplatContext(canvas)).toBeNull();
    expect(getContext).not.toHaveBeenCalled();
    resetSplatContexts();
    expect(createSplatProgram(stubGl({ getShaderParameter: () => false }))).toBeNull();
  });

  it("paints a still dot for a Gaussian in front of the camera", () => {
    const arc = vi.fn();
    const ctx = {
      fillStyle: "",
      clearRect: () => undefined,
      fillRect: () => undefined,
      beginPath: () => undefined,
      arc,
      fill: () => undefined,
    } as unknown as CanvasRenderingContext2D;
    drawSplatStill(ctx, cloudAtOrigin(), INITIAL_SPLAT_CAMERA, 320, 240);
    expect(arc).toHaveBeenCalled();
  });
});
