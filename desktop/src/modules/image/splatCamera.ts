/**
 * Bounded orbit camera for the local splat viewer.
 * Pure math: no DOM, no WebGL, no network.
 */

export const SPLAT_MIN_DISTANCE = 0.5;
export const SPLAT_MAX_DISTANCE = 8;
export const SPLAT_MIN_PITCH = -1.2;
export const SPLAT_MAX_PITCH = 1.2;
export const SPLAT_MAX_PAN = 2;
/** Phase 1 contract did not name a pixel cap. Phase 2 fixes each edge at 2048. */
export const MAX_SPLAT_VIEWPORT_PX = 2048;

export interface SplatCamera {
  readonly yaw: number;
  readonly pitch: number;
  readonly distance: number;
  readonly panX: number;
  readonly panY: number;
  readonly spinYaw: number;
  readonly spinPitch: number;
}

export const INITIAL_SPLAT_CAMERA: SplatCamera = {
  yaw: 0.4,
  pitch: 0.25,
  distance: 2.5,
  panX: 0,
  panY: 0,
  spinYaw: 0,
  spinPitch: 0,
};

type Vec3 = readonly [number, number, number];

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

export function clampSplatCamera(camera: SplatCamera): SplatCamera {
  return {
    yaw: finiteOr(camera.yaw, 0),
    pitch: clamp(camera.pitch, SPLAT_MIN_PITCH, SPLAT_MAX_PITCH),
    distance: clamp(camera.distance, SPLAT_MIN_DISTANCE, SPLAT_MAX_DISTANCE),
    panX: clamp(camera.panX, -SPLAT_MAX_PAN, SPLAT_MAX_PAN),
    panY: clamp(camera.panY, -SPLAT_MAX_PAN, SPLAT_MAX_PAN),
    spinYaw: finiteOr(camera.spinYaw, 0),
    spinPitch: finiteOr(camera.spinPitch, 0),
  };
}

export function orbitSplatCamera(camera: SplatCamera, dx: number, dy: number, withSpin: boolean): SplatCamera {
  return clampSplatCamera({
    ...camera,
    yaw: camera.yaw + finiteOr(dx, 0),
    pitch: camera.pitch + finiteOr(dy, 0),
    spinYaw: withSpin ? finiteOr(dx, 0) : 0,
    spinPitch: withSpin ? finiteOr(dy, 0) : 0,
  });
}

export function zoomSplatCamera(camera: SplatCamera, delta: number): SplatCamera {
  const factor = Math.exp(clamp(finiteOr(delta, 0), -1, 1));
  return clampSplatCamera({ ...camera, distance: camera.distance * factor, spinYaw: 0, spinPitch: 0 });
}

export function panSplatCamera(camera: SplatCamera, dx: number, dy: number): SplatCamera {
  return clampSplatCamera({
    ...camera,
    panX: camera.panX + finiteOr(dx, 0),
    panY: camera.panY + finiteOr(dy, 0),
    spinYaw: 0,
    spinPitch: 0,
  });
}

/** Reduced motion drops inertial spin. Otherwise spin decays and is applied once. */
export function stepSplatInertia(camera: SplatCamera, reducedMotion: boolean): SplatCamera {
  if (reducedMotion) {
    return { ...camera, spinYaw: 0, spinPitch: 0 };
  }
  const decay = 0.9;
  const spinYaw = Math.abs(camera.spinYaw) < 0.0002 ? 0 : camera.spinYaw * decay;
  const spinPitch = Math.abs(camera.spinPitch) < 0.0002 ? 0 : camera.spinPitch * decay;
  if (spinYaw === 0 && spinPitch === 0) {
    return { ...camera, spinYaw: 0, spinPitch: 0 };
  }
  return clampSplatCamera({
    ...camera,
    yaw: camera.yaw + spinYaw,
    pitch: camera.pitch + spinPitch,
    spinYaw,
    spinPitch,
  });
}

export function clampSplatViewport(width: number, height: number): { width: number; height: number } {
  const safeWidth = Number.isFinite(width) && width > 0 ? width : 640;
  const safeHeight = Number.isFinite(height) && height > 0 ? height : 480;
  return {
    width: Math.min(Math.round(safeWidth), MAX_SPLAT_VIEWPORT_PX),
    height: Math.min(Math.round(safeHeight), MAX_SPLAT_VIEWPORT_PX),
  };
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function norm(v: Vec3): Vec3 {
  const length = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / length, v[1] / length, v[2] / length];
}

export function splatEye(camera: SplatCamera): Vec3 {
  const clamped = clampSplatCamera(camera);
  const cosPitch = Math.cos(clamped.pitch);
  return [
    clamped.panX + clamped.distance * cosPitch * Math.sin(clamped.yaw),
    clamped.panY + clamped.distance * Math.sin(clamped.pitch),
    clamped.distance * cosPitch * Math.cos(clamped.yaw),
  ];
}

function lookAt(eye: Vec3, target: Vec3, up: Vec3): Float32Array {
  const forward = norm(sub(target, eye));
  const side = norm(cross(forward, up));
  const lifted = cross(side, forward);
  const out = new Float32Array(16);
  out[0] = side[0];
  out[4] = side[1];
  out[8] = side[2];
  out[12] = -dot(side, eye);
  out[1] = lifted[0];
  out[5] = lifted[1];
  out[9] = lifted[2];
  out[13] = -dot(lifted, eye);
  out[2] = -forward[0];
  out[6] = -forward[1];
  out[10] = -forward[2];
  out[14] = dot(forward, eye);
  out[15] = 1;
  return out;
}

function perspective(aspect: number): Float32Array {
  const fovy = Math.PI / 4;
  const near = 0.05;
  const far = 100;
  const f = 1 / Math.tan(fovy / 2);
  const nf = 1 / (near - far);
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
  const out = new Float32Array(16);
  out[0] = f / safeAspect;
  out[5] = f;
  out[10] = (far + near) * nf;
  out[11] = -1;
  out[14] = 2 * far * near * nf;
  return out;
}

function multiplyMat4(a: Float32Array, b: Float32Array): Float32Array {
  const out = new Float32Array(16);
  for (let column = 0; column < 4; column++) {
    for (let row = 0; row < 4; row++) {
      out[column * 4 + row] =
        (a[row] ?? 0) * (b[column * 4] ?? 0) +
        (a[4 + row] ?? 0) * (b[column * 4 + 1] ?? 0) +
        (a[8 + row] ?? 0) * (b[column * 4 + 2] ?? 0) +
        (a[12 + row] ?? 0) * (b[column * 4 + 3] ?? 0);
    }
  }
  return out;
}

export function splatViewProjection(camera: SplatCamera, aspect: number): Float32Array {
  const clamped = clampSplatCamera(camera);
  const eye = splatEye(clamped);
  const target: Vec3 = [clamped.panX, clamped.panY, 0];
  return multiplyMat4(perspective(aspect), lookAt(eye, target, [0, 1, 0]));
}

/** Clip-space of the world origin. Used to prove the bounded camera still sees the scene. */
export function splatClipOrigin(camera: SplatCamera, aspect: number): { w: number; ndcX: number; ndcY: number } {
  const mvp = splatViewProjection(camera, aspect);
  const clipX = mvp[12] ?? 0;
  const clipY = mvp[13] ?? 0;
  const w = mvp[15] ?? 0;
  const safeW = w === 0 ? 1 : w;
  return { w, ndcX: clipX / safeW, ndcY: clipY / safeW };
}
