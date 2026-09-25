/**
 * Local WebGL2 splat preview. Shaders and pixels stay on this canvas.
 * A missing context, a lost context, or a full GPU slot shows a still frame
 * and a typed message. Remote URLs are rejected before any read.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import type { GaussianCloud, GaussianSplatSource } from "../../../../core/image/GaussianSplat";
import { useReducedMotion } from "../../motion/useReducedMotion";
import {
  INITIAL_SPLAT_CAMERA,
  clampSplatViewport,
  orbitSplatCamera,
  panSplatCamera,
  stepSplatInertia,
  zoomSplatCamera,
  type SplatCamera,
} from "./splatCamera";
import {
  SPLAT_CONTEXT_CAP,
  createSplatProgram,
  drawSplatFrame,
  drawSplatStill,
  exportCanvasPng,
  loadSplatViewer,
  releaseSplatContext,
  requestSplatContext,
  splatContextCount,
  type SplatProgram,
} from "./splatRaster";

export type SplatFallbackReason = "webgl2-missing" | "context-lost" | "context-cap" | "program-failed";

export interface SplatViewerCanvasProps {
  cloud?: GaussianCloud | null;
  source?: GaussianSplatSource;
  readPath?: (filePath: string) => Uint8Array;
  width?: number;
  height?: number;
  onScreenshot?: (pngDataUrl: string) => void;
}

export function SplatViewerCanvas({
  cloud,
  source,
  readPath,
  width,
  height,
  onScreenshot,
}: SplatViewerCanvasProps): JSX.Element {
  const reduced = useReducedMotion();
  const viewport = clampSplatViewport(width ?? 640, height ?? 480);
  const loaded = useMemo(() => loadSplatViewer({ cloud, source, readPath }), [cloud, source, readPath]);
  const [camera, setCamera] = useState<SplatCamera>(INITIAL_SPLAT_CAMERA);
  const [mode, setMode] = useState<"webgl2" | "fallback">("fallback");
  const [fallbackReason, setFallbackReason] = useState<SplatFallbackReason | null>(null);
  const [shot, setShot] = useState<"idle" | "saved" | "failed">("idle");
  const [retryToken, setRetryToken] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const programRef = useRef<SplatProgram | null>(null);
  const cameraRef = useRef(camera);
  const dragRef = useRef<{ x: number; y: number; mode: "orbit" | "pan" } | null>(null);
  cameraRef.current = camera;

  const drawable = loaded.cloud && loaded.cloud.count > 0 && !loaded.error ? loaded.cloud : null;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !drawable) {
      setMode("fallback");
      setFallbackReason(null);
      return;
    }
    const gl = requestSplatContext(canvas);
    if (!gl) {
      setMode("fallback");
      setFallbackReason(splatContextCount() >= SPLAT_CONTEXT_CAP ? "context-cap" : "webgl2-missing");
      return;
    }
    let held = true;
    const program = createSplatProgram(gl);
    if (!program) {
      releaseSplatContext();
      held = false;
      setMode("fallback");
      setFallbackReason("program-failed");
      return;
    }
    programRef.current = program;
    setMode("webgl2");
    setFallbackReason(null);
    const release = (): void => {
      if (!held) return;
      held = false;
      programRef.current = null;
      releaseSplatContext();
    };
    const onLost = (event: Event): void => {
      event.preventDefault();
      release();
      setMode("fallback");
      setFallbackReason("context-lost");
    };
    canvas.addEventListener("webglcontextlost", onLost);
    drawSplatFrame(program, drawable, cameraRef.current, viewport.width, viewport.height);
    return () => {
      canvas.removeEventListener("webglcontextlost", onLost);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      release();
    };
  }, [drawable, retryToken, viewport.width, viewport.height]);

  useEffect(() => {
    const program = programRef.current;
    if (!program || !drawable || mode !== "webgl2") return;
    drawSplatFrame(program, drawable, camera, viewport.width, viewport.height);
  }, [camera, drawable, mode, viewport.width, viewport.height]);

  useEffect(() => {
    if (mode !== "fallback" || !drawable) return;
    if (fallbackReason === "context-lost" || fallbackReason === "program-failed") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawSplatStill(ctx, drawable, camera, viewport.width, viewport.height);
  }, [camera, drawable, fallbackReason, mode, viewport.width, viewport.height]);

  useEffect(() => {
    if (reduced) {
      setCamera((current) => stepSplatInertia(current, true));
      return;
    }
    if (camera.spinYaw === 0 && camera.spinPitch === 0) return;
    const frame = window.requestAnimationFrame(() => {
      setCamera((current) => stepSplatInertia(current, false));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [camera.spinPitch, camera.spinYaw, reduced]);

  function onPointerDown(event: React.PointerEvent<HTMLCanvasElement>): void {
    if (event.currentTarget.setPointerCapture) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      mode: event.shiftKey || event.button === 1 || event.button === 2 ? "pan" : "orbit",
    };
  }

  function onPointerMove(event: React.PointerEvent<HTMLCanvasElement>): void {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = (event.clientX - drag.x) * 0.01;
    const dy = (event.clientY - drag.y) * 0.01;
    dragRef.current = { ...drag, x: event.clientX, y: event.clientY };
    setCamera((current) =>
      drag.mode === "pan" ? panSplatCamera(current, dx, -dy) : orbitSplatCamera(current, dx, dy, !reduced),
    );
  }

  function onPointerUp(): void {
    dragRef.current = null;
    if (reduced) setCamera((current) => stepSplatInertia(current, true));
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>): void {
    const step = 0.08;
    if (event.shiftKey && event.key === "ArrowLeft") {
      setCamera((current) => panSplatCamera(current, -0.1, 0));
      return;
    }
    if (event.shiftKey && event.key === "ArrowRight") {
      setCamera((current) => panSplatCamera(current, 0.1, 0));
      return;
    }
    if (event.key === "ArrowLeft") setCamera((current) => orbitSplatCamera(current, -step, 0, false));
    if (event.key === "ArrowRight") setCamera((current) => orbitSplatCamera(current, step, 0, false));
    if (event.key === "ArrowUp") setCamera((current) => orbitSplatCamera(current, 0, step, false));
    if (event.key === "ArrowDown") setCamera((current) => orbitSplatCamera(current, 0, -step, false));
    if (event.key === "+" || event.key === "=") setCamera((current) => zoomSplatCamera(current, -0.12));
    if (event.key === "-" || event.key === "_") setCamera((current) => zoomSplatCamera(current, 0.12));
  }

  function onWheel(event: React.WheelEvent<HTMLCanvasElement>): void {
    setCamera((current) => zoomSplatCamera(current, Math.sign(event.deltaY) * 0.08));
  }

  function savePng(): void {
    const canvas = canvasRef.current;
    if (!canvas) {
      setShot("failed");
      return;
    }
    try {
      const url = exportCanvasPng(canvas);
      if (!url.startsWith("data:image/png")) {
        setShot("failed");
        return;
      }
      setShot("saved");
      onScreenshot?.(url);
    } catch {
      setShot("failed");
    }
  }

  function retry(): void {
    setFallbackReason(null);
    setRetryToken((value) => value + 1);
  }

  const fallbackCopy =
    fallbackReason === "context-lost"
      ? "WebGL context was lost. Showing a still preview."
      : fallbackReason === "context-cap"
        ? "Splat preview is using the still frame because the GPU preview limit is reached."
        : fallbackReason === "program-failed"
          ? "WebGL2 could not start. Showing a still preview."
          : fallbackReason === "webgl2-missing"
            ? "WebGL2 is unavailable. Showing a still preview."
            : null;

  return (
    // Camera orbit is a custom widget: keyboard lives on this surface, and the
    // canvas inside it is the pointer target.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div
      role="application"
      aria-label="Gaussian splat preview"
      data-testid="splat-viewer"
      data-splat-mode={drawable ? mode : "fallback"}
      data-splat-fallback={fallbackReason ?? undefined}
      data-splat-error={loaded.error?.code}
      data-splat-empty={loaded.cloud?.count === 0 ? "true" : "false"}
      data-reduced-motion={reduced ? "true" : "false"}
      data-viewport-width={viewport.width}
      data-viewport-height={viewport.height}
      data-camera-yaw={camera.yaw.toFixed(3)}
      data-camera-pitch={camera.pitch.toFixed(3)}
      data-camera-distance={camera.distance.toFixed(3)}
      data-camera-pan={camera.panX.toFixed(3)}
      data-camera-spin={camera.spinYaw.toFixed(4)}
      data-screenshot={shot}
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
      onKeyDown={onKeyDown}
      style={{ width: viewport.width, maxWidth: "100%" }}
    >
      <canvas
        ref={canvasRef}
        data-testid="splat-canvas"
        width={viewport.width}
        height={viewport.height}
        aria-label="Gaussian splat preview"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onContextMenu={(event) => event.preventDefault()}
        onWheel={onWheel}
      />
      {loaded.error ? <p role="alert">{loaded.error.message}</p> : null}
      {loaded.cloud?.count === 0 ? <p>No Gaussians to show.</p> : null}
      {fallbackCopy ? <p data-testid="splat-fallback">{fallbackCopy}</p> : null}
      {fallbackReason === "context-lost" ? (
        <button type="button" onClick={retry}>
          Retry preview
        </button>
      ) : null}
      <button type="button" onClick={savePng}>
        Save PNG preview
      </button>
    </div>
  );
}
