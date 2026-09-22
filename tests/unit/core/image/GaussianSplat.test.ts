import { describe, expect, it } from "vitest";
import {
  GaussianSplatError,
  assertLocalSplatPath,
  decodePlyBytes,
  decodeSplatBytes,
  decodeViewRequest,
} from "../../../../core/image/GaussianSplat.js";

function splatRow(): Uint8Array {
  const bytes = new Uint8Array(32);
  const view = new DataView(bytes.buffer);
  view.setFloat32(0, 1, true);
  view.setFloat32(4, 2, true);
  view.setFloat32(8, 3, true);
  view.setFloat32(12, 0.1, true);
  view.setFloat32(16, 0.2, true);
  view.setFloat32(20, 0.3, true);
  bytes.set([10, 20, 30, 40], 24);
  bytes.set([0, 0, 0, 255], 28);
  return bytes;
}

function plyOne(): Uint8Array {
  const header = new TextEncoder().encode(
    "ply\nformat binary_little_endian 1.0\nelement vertex 1\nend_header\n",
  );
  const body = new Uint8Array(14 * 4);
  const view = new DataView(body.buffer);
  view.setFloat32(0, 4, true);
  view.setFloat32(4, 5, true);
  view.setFloat32(8, 6, true);
  view.setFloat32(12, 0.4, true);
  view.setFloat32(16, 0.5, true);
  view.setFloat32(20, 0.6, true);
  view.setFloat32(24, 0, true);
  view.setFloat32(28, 0, true);
  view.setFloat32(32, 0, true);
  view.setFloat32(36, 1, true);
  view.setFloat32(40, 0, true);
  view.setFloat32(44, 0, true);
  view.setFloat32(48, 0, true);
  view.setFloat32(52, 0, true);
  const out = new Uint8Array(header.length + body.length);
  out.set(header, 0);
  out.set(body, header.length);
  return out;
}

describe("GaussianSplat", () => {
  it("rejects remote and unsupported paths before decode", () => {
    expect(() => assertLocalSplatPath("https://example.com/a.splat")).toThrow(GaussianSplatError);
    expect(() => assertLocalSplatPath("//cdn.example/a.ply")).toThrow(GaussianSplatError);
    expect(() => assertLocalSplatPath("https://3daistudio.com/a.splat")).toThrow(GaussianSplatError);
    expect(() => assertLocalSplatPath("C:/models/scene.obj")).toThrow(GaussianSplatError);
    expect(assertLocalSplatPath("C:/models/scene.splat")).toBe("splat");
  });

  it("decodes one 32-byte splat row", () => {
    const cloud = decodeSplatBytes(splatRow());
    expect(cloud.count).toBe(1);
    expect(Array.from(cloud.positions)).toEqual([1, 2, 3]);
    expect(cloud.scales[0]).toBeCloseTo(0.1);
    expect(cloud.scales[1]).toBeCloseTo(0.2);
    expect(cloud.scales[2]).toBeCloseTo(0.3);
    expect(Array.from(cloud.colors)).toEqual([10, 20, 30, 40]);
    expect(cloud.rotations[3]).toBe(1);
  });

  it("rejects a truncated splat", () => {
    expect(() => decodeSplatBytes(new Uint8Array(31))).toThrow(GaussianSplatError);
  });

  it("decodes a one-vertex binary ply", () => {
    const cloud = decodePlyBytes(plyOne());
    expect(cloud.count).toBe(1);
    expect(cloud.positions[0]).toBe(4);
    expect(cloud.scales[0]).toBeCloseTo(0.4);
    expect(cloud.rotations[3]).toBe(1);
    expect(cloud.colors[3]).toBeGreaterThan(100);
  });

  it("uses the caller reader for a local path and does not fetch", () => {
    const cloud = decodeViewRequest(
      { id: "view-1", source: { kind: "path", path: "D:/shots/object.splat" } },
      () => splatRow(),
    );
    expect(cloud.count).toBe(1);
  });
});
