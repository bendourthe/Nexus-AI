/**
 * Local Gaussian splat view boundary.
 *
 * Decodes `.splat` (32-byte antimatter rows) and a fixed binary `.ply`
 * subset. This module does not open the network, the DOM, or a process.
 */

export const MAX_GAUSSIANS = 262_144;
const SPLAT_ROW_BYTES = 32;

export type SplatFormat = "splat" | "ply";

export type GaussianSplatErrorCode =
  | "remote-url"
  | "unsupported-format"
  | "truncated"
  | "malformed"
  | "too-many";

export class GaussianSplatError extends Error {
  readonly code: GaussianSplatErrorCode;

  constructor(code: GaussianSplatErrorCode, message: string) {
    super(message);
    this.name = "GaussianSplatError";
    this.code = code;
  }
}

export interface GaussianCloud {
  readonly format: SplatFormat;
  readonly count: number;
  readonly positions: Float32Array;
  readonly scales: Float32Array;
  readonly rotations: Float32Array;
  readonly colors: Uint8Array;
}

export type GaussianSplatSource =
  | { readonly kind: "path"; readonly path: string }
  | { readonly kind: "buffer"; readonly bytes: Uint8Array; readonly format: SplatFormat };

export interface GaussianSplatViewRequest {
  readonly id: string;
  readonly source: GaussianSplatSource;
}

const REMOTE_RE = /^(?:https?:|ftp:|\/\/)/i;

export function assertLocalSplatPath(filePath: string): SplatFormat {
  const trimmed = filePath.trim();
  if (trimmed.length === 0) {
    throw new GaussianSplatError("malformed", "Splat path is empty.");
  }
  if (REMOTE_RE.test(trimmed) || trimmed.toLowerCase().includes("3daistudio.com")) {
    throw new GaussianSplatError("remote-url", "Splat view accepts only a local file.");
  }
  const lower = trimmed.toLowerCase();
  if (lower.endsWith(".splat")) return "splat";
  if (lower.endsWith(".ply")) return "ply";
  throw new GaussianSplatError("unsupported-format", "Splat view accepts .splat and .ply only.");
}

export function decodeSplatBytes(bytes: Uint8Array): GaussianCloud {
  if (bytes.byteLength === 0 || bytes.byteLength % SPLAT_ROW_BYTES !== 0) {
    throw new GaussianSplatError("truncated", "Splat file length is not a multiple of 32 bytes.");
  }
  const count = bytes.byteLength / SPLAT_ROW_BYTES;
  if (count > MAX_GAUSSIANS) {
    throw new GaussianSplatError("too-many", `Splat count ${count} exceeds ${MAX_GAUSSIANS}.`);
  }
  const positions = new Float32Array(count * 3);
  const scales = new Float32Array(count * 3);
  const rotations = new Float32Array(count * 4);
  const colors = new Uint8Array(count * 4);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let i = 0; i < count; i++) {
    const base = i * SPLAT_ROW_BYTES;
    for (let k = 0; k < 3; k++) positions[i * 3 + k] = view.getFloat32(base + k * 4, true);
    for (let k = 0; k < 3; k++) scales[i * 3 + k] = view.getFloat32(base + 12 + k * 4, true);
    colors.set(bytes.subarray(base + 24, base + 28), i * 4);
    for (let k = 0; k < 4; k++) rotations[i * 4 + k] = view.getUint8(base + 28 + k) / 255;
  }
  return { format: "splat", count, positions, scales, rotations, colors };
}

export function decodePlyBytes(bytes: Uint8Array): GaussianCloud {
  const headerEnd = findPlyHeaderEnd(bytes);
  const header = new TextDecoder("utf-8").decode(bytes.subarray(0, headerEnd));
  if (!header.startsWith("ply\n") || !header.includes("format binary_little_endian 1.0")) {
    throw new GaussianSplatError("malformed", "PLY must be binary_little_endian 1.0.");
  }
  const countMatch = header.match(/element vertex (\d+)/);
  if (!countMatch) {
    throw new GaussianSplatError("malformed", "PLY header has no vertex count.");
  }
  const count = Number(countMatch[1]);
  if (!Number.isInteger(count) || count < 0) {
    throw new GaussianSplatError("malformed", "PLY vertex count is not an integer.");
  }
  if (count > MAX_GAUSSIANS) {
    throw new GaussianSplatError("too-many", `PLY count ${count} exceeds ${MAX_GAUSSIANS}.`);
  }
  const body = bytes.subarray(headerEnd);
  const row = 14 * 4;
  if (body.byteLength < count * row) {
    throw new GaussianSplatError("truncated", "PLY body is shorter than the vertex count.");
  }
  const positions = new Float32Array(count * 3);
  const scales = new Float32Array(count * 3);
  const rotations = new Float32Array(count * 4);
  const colors = new Uint8Array(count * 4);
  const view = new DataView(body.buffer, body.byteOffset, body.byteLength);
  for (let i = 0; i < count; i++) {
    const base = i * row;
    for (let k = 0; k < 3; k++) positions[i * 3 + k] = view.getFloat32(base + k * 4, true);
    for (let k = 0; k < 3; k++) scales[i * 3 + k] = view.getFloat32(base + 12 + k * 4, true);
    for (let k = 0; k < 4; k++) rotations[i * 4 + k] = view.getFloat32(base + 24 + k * 4, true);
    const opacity = view.getFloat32(base + 40, true);
    const r = sigmoid(view.getFloat32(base + 44, true));
    const g = sigmoid(view.getFloat32(base + 48, true));
    const b = sigmoid(view.getFloat32(base + 52, true));
    const alpha = sigmoid(opacity);
    colors[i * 4] = Math.round(r * 255);
    colors[i * 4 + 1] = Math.round(g * 255);
    colors[i * 4 + 2] = Math.round(b * 255);
    colors[i * 4 + 3] = Math.round(alpha * 255);
  }
  return { format: "ply", count, positions, scales, rotations, colors };
}

export function decodeViewRequest(request: GaussianSplatViewRequest, readPath?: (filePath: string) => Uint8Array): GaussianCloud {
  if (request.source.kind === "buffer") {
    return request.source.format === "splat"
      ? decodeSplatBytes(request.source.bytes)
      : decodePlyBytes(request.source.bytes);
  }
  const format = assertLocalSplatPath(request.source.path);
  if (!readPath) {
    throw new GaussianSplatError("malformed", "A path view needs a caller-supplied reader.");
  }
  const bytes = readPath(request.source.path);
  return format === "splat" ? decodeSplatBytes(bytes) : decodePlyBytes(bytes);
}

function findPlyHeaderEnd(bytes: Uint8Array): number {
  const marker = [0x65, 0x6e, 0x64, 0x5f, 0x68, 0x65, 0x61, 0x64, 0x65, 0x72, 0x0a];
  for (let i = 0; i <= bytes.length - marker.length; i++) {
    let match = true;
    for (let k = 0; k < marker.length; k++) {
      if (bytes[i + k] !== marker[k]) {
        match = false;
        break;
      }
    }
    if (match) return i + marker.length;
  }
  throw new GaussianSplatError("malformed", "PLY header has no end_header marker.");
}

function sigmoid(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return 1 / (1 + Math.exp(-value));
}
