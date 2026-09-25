/**
 * WebGL2 point-sprite rasterizer for a decoded Gaussian cloud.
 * Shaders are inline. This module never fetches a shader, texture, or file.
 */

import { MAX_GAUSSIANS, GaussianSplatError, decodeViewRequest, type GaussianCloud, type GaussianSplatSource } from "../../../../core/image/GaussianSplat";
import { METAL_INSTANCE_CAP } from "../../components/metalRegistry";
import { splatViewProjection, type SplatCamera } from "./splatCamera";

/** Same numeric budget as the metal rings. Each splat canvas still owns its own context. */
export const SPLAT_CONTEXT_CAP = METAL_INSTANCE_CAP;

export const SPLAT_VERTEX_SHADER = `#version 300 es
in vec3 a_position;
in vec4 a_color;
uniform mat4 u_mvp;
out vec4 v_color;
void main() {
  gl_Position = u_mvp * vec4(a_position, 1.0);
  float depth = max(gl_Position.w, 0.05);
  gl_PointSize = clamp(18.0 / depth, 2.0, 48.0);
  v_color = a_color;
}
`;

export const SPLAT_FRAGMENT_SHADER = `#version 300 es
precision mediump float;
in vec4 v_color;
out vec4 fragColor;
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float d = dot(p, p);
  if (d > 1.0) discard;
  float alpha = exp(-d * 3.5) * v_color.a;
  fragColor = vec4(v_color.rgb, alpha);
}
`;

let activeContexts = 0;

export function splatContextCount(): number {
  return activeContexts;
}

export function tryAcquireSplatContext(): boolean {
  if (activeContexts >= SPLAT_CONTEXT_CAP) return false;
  activeContexts += 1;
  return true;
}

export function releaseSplatContext(): void {
  if (activeContexts > 0) activeContexts -= 1;
}

export function resetSplatContexts(): void {
  activeContexts = 0;
}

export interface SplatProgram {
  gl: WebGL2RenderingContext;
  program: WebGLProgram;
  positionBuffer: WebGLBuffer;
  colorBuffer: WebGLBuffer;
  mvp: WebGLUniformLocation | null;
  positionLoc: number;
  colorLoc: number;
}

export interface SplatViewerLoad {
  cloud: GaussianCloud | null;
  error: GaussianSplatError | null;
}

export function loadSplatViewer(input: {
  cloud?: GaussianCloud | null;
  source?: GaussianSplatSource;
  readPath?: (filePath: string) => Uint8Array;
}): SplatViewerLoad {
  if (input.cloud) {
    if (input.cloud.count > MAX_GAUSSIANS) {
      return {
        cloud: null,
        error: new GaussianSplatError("too-many", `Splat count ${input.cloud.count} exceeds ${MAX_GAUSSIANS}.`),
      };
    }
    return { cloud: input.cloud, error: null };
  }
  if (!input.source) return { cloud: null, error: null };
  try {
    return {
      cloud: decodeViewRequest({ id: "splat-viewer", source: input.source }, input.readPath),
      error: null,
    };
  } catch (error) {
    if (error instanceof GaussianSplatError) return { cloud: null, error };
    return { cloud: null, error: new GaussianSplatError("malformed", "Splat decode failed.") };
  }
}

/** WebGL2 only. A full instance cap returns null without creating a shared context. */
export function requestSplatContext(canvas: HTMLCanvasElement): WebGL2RenderingContext | null {
  if (!tryAcquireSplatContext()) return null;
  try {
    const gl = canvas.getContext("webgl2", {
      preserveDrawingBuffer: true,
      alpha: true,
      antialias: false,
    });
    if (!gl) {
      releaseSplatContext();
      return null;
    }
    return gl;
  } catch {
    releaseSplatContext();
    return null;
  }
}

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function createSplatProgram(gl: WebGL2RenderingContext): SplatProgram | null {
  const vertex = compile(gl, gl.VERTEX_SHADER, SPLAT_VERTEX_SHADER);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, SPLAT_FRAGMENT_SHADER);
  if (!vertex || !fragment) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  const positionBuffer = gl.createBuffer();
  const colorBuffer = gl.createBuffer();
  if (!positionBuffer || !colorBuffer) return null;
  return {
    gl,
    program,
    positionBuffer,
    colorBuffer,
    mvp: gl.getUniformLocation(program, "u_mvp"),
    positionLoc: gl.getAttribLocation(program, "a_position"),
    colorLoc: gl.getAttribLocation(program, "a_color"),
  };
}

export function drawSplatFrame(
  splat: SplatProgram,
  cloud: GaussianCloud,
  camera: SplatCamera,
  width: number,
  height: number,
): void {
  const { gl } = splat;
  gl.viewport(0, 0, width, height);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0.04, 0.05, 0.08, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  if (cloud.count <= 0) return;
  gl.useProgram(splat.program);
  if (splat.mvp) {
    gl.uniformMatrix4fv(splat.mvp, false, splatViewProjection(camera, width / Math.max(height, 1)));
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, splat.positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, cloud.positions, gl.DYNAMIC_DRAW);
  if (splat.positionLoc >= 0) {
    gl.enableVertexAttribArray(splat.positionLoc);
    gl.vertexAttribPointer(splat.positionLoc, 3, gl.FLOAT, false, 0, 0);
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, splat.colorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, cloud.colors, gl.DYNAMIC_DRAW);
  if (splat.colorLoc >= 0) {
    gl.enableVertexAttribArray(splat.colorLoc);
    gl.vertexAttribPointer(splat.colorLoc, 4, gl.UNSIGNED_BYTE, true, 0, 0);
  }
  gl.drawArrays(gl.POINTS, 0, cloud.count);
}

export function drawSplatStill(
  ctx: CanvasRenderingContext2D,
  cloud: GaussianCloud,
  camera: SplatCamera,
  width: number,
  height: number,
): void {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#0a0d14";
  ctx.fillRect(0, 0, width, height);
  const mvp = splatViewProjection(camera, width / Math.max(height, 1));
  for (let i = 0; i < cloud.count; i++) {
    const x = cloud.positions[i * 3] ?? 0;
    const y = cloud.positions[i * 3 + 1] ?? 0;
    const z = cloud.positions[i * 3 + 2] ?? 0;
    const clipX = (mvp[0] ?? 0) * x + (mvp[4] ?? 0) * y + (mvp[8] ?? 0) * z + (mvp[12] ?? 0);
    const clipY = (mvp[1] ?? 0) * x + (mvp[5] ?? 0) * y + (mvp[9] ?? 0) * z + (mvp[13] ?? 0);
    const clipW = (mvp[3] ?? 0) * x + (mvp[7] ?? 0) * y + (mvp[11] ?? 0) * z + (mvp[15] ?? 0);
    if (clipW <= 0.05) continue;
    const sx = (clipX / clipW * 0.5 + 0.5) * width;
    const sy = (1 - (clipY / clipW * 0.5 + 0.5)) * height;
    const red = cloud.colors[i * 4] ?? 180;
    const green = cloud.colors[i * 4 + 1] ?? 180;
    const blue = cloud.colors[i * 4 + 2] ?? 180;
    ctx.fillStyle = `rgb(${red}, ${green}, ${blue})`;
    ctx.beginPath();
    ctx.arc(sx, sy, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Local PNG data URL. Callers must not upload the result. */
export function exportCanvasPng(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL("image/png");
}
