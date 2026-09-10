/**
 * v2.4.9 -- the image viewer and light editor.
 *
 * Operator report on the old lightbox: "a terrible UI ... most buttons are not
 * working. One would expect that clicking on the image puts it in maximized
 * screen (full resolution) with a few editing options like a paint brush, a
 * button to add text, a button to make the image brighter, change the
 * contrast, sharpness, saturation, and also undo/redo the manual changes, and
 * then a button to download the edited or original image."
 *
 * The old one was a bare `<div>` of unstyled `<button>`s whose Fullscreen call
 * targeted a ref captured during render (so it was frequently null), and whose
 * Download was an `<a download>` that Electron's renderer ignores for a data:
 * URL of that size.
 *
 * This replaces it with:
 *   - a full-bleed backdrop that opens at the image's real resolution,
 *   - live adjustments (brightness / contrast / saturation / sharpness) applied
 *     as a CSS filter for preview and re-applied on the canvas for export,
 *   - a brush and a text tool that paint onto an overlay canvas,
 *   - real undo/redo over the stroke history,
 *   - download of the EDITED composite or the ORIGINAL bytes.
 *
 * Everything is local: adjustments are a filter string, strokes are points in
 * memory, and export composites through an offscreen canvas. No network, no
 * new dependency.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Brush,
  Contrast,
  Download,
  Redo2,
  RotateCcw,
  Sun,
  Type as TypeIcon,
  Undo2,
  X,
} from "lucide-react";

export interface ImageAdjustments {
  brightness: number;
  contrast: number;
  saturation: number;
  sharpness: number;
}

export const NEUTRAL_ADJUSTMENTS: ImageAdjustments = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  sharpness: 0,
};

/** One painted mark. A text mark carries its string; a stroke carries points. */
export type EditMark =
  | {
      readonly kind: "stroke";
      readonly color: string;
      readonly size: number;
      /** Natural-image coordinates, so a stroke survives a window resize. */
      readonly points: readonly { readonly x: number; readonly y: number }[];
    }
  | {
      readonly kind: "text";
      readonly color: string;
      readonly size: number;
      readonly text: string;
      readonly x: number;
      readonly y: number;
    };

/**
 * The CSS filter for a set of adjustments.
 *
 * Sharpness has no CSS primitive. `drop-shadow` is not sharpening, so rather
 * than fake it the preview approximates with a small contrast lift and the
 * EXPORT applies a real convolution (see `sharpenPixels`). The preview is
 * therefore slightly softer than the exported file, which is the honest
 * trade: a wrong preview that promised more would be worse.
 */
export function adjustmentFilter(a: ImageAdjustments): string {
  const contrast = a.contrast + a.sharpness * 0.15;
  return [
    `brightness(${a.brightness}%)`,
    `contrast(${contrast}%)`,
    `saturate(${a.saturation}%)`,
  ].join(" ");
}

export function adjustmentsAreNeutral(a: ImageAdjustments): boolean {
  return (
    a.brightness === NEUTRAL_ADJUSTMENTS.brightness &&
    a.contrast === NEUTRAL_ADJUSTMENTS.contrast &&
    a.saturation === NEUTRAL_ADJUSTMENTS.saturation &&
    a.sharpness === NEUTRAL_ADJUSTMENTS.sharpness
  );
}

/**
 * A 3x3 unsharp-mask convolution, strength 0-100.
 *
 * Deliberately takes and returns a raw pixel buffer rather than an `ImageData`:
 * that keeps the kernel testable without a DOM (jsdom has no `ImageData`) and
 * keeps the canvas plumbing at the one call site that owns it. Edge pixels are
 * copied through rather than clamped-sampled -- a one-pixel border is invisible
 * at any real image size and the loop stays readable.
 */
export function sharpenPixels(
  src: Uint8ClampedArray,
  width: number,
  height: number,
  strength: number,
): Uint8ClampedArray {
  if (strength <= 0) return src;
  const amount = Math.min(1, strength / 100);
  const out = new Uint8ClampedArray(src);
  const center = 1 + 4 * amount;
  const side = -amount;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = (y * width + x) * 4;
      for (let c = 0; c < 3; c += 1) {
        const value =
          src[i + c]! * center +
          src[i - 4 + c]! * side +
          src[i + 4 + c]! * side +
          src[i - width * 4 + c]! * side +
          src[i + width * 4 + c]! * side;
        out[i + c] = value;
      }
    }
  }
  return out;
}

export interface ImageViewerProps {
  readonly src: string;
  readonly alt?: string;
  /** Base name for a saved file, without extension. */
  readonly downloadName?: string;
  readonly onClose: () => void;
  /** Extra studio buttons (Copy workflow, Enhance) in the toolbar. */
  readonly extra?: React.ReactNode;
  readonly testId?: string;
}

type Tool = "none" | "brush" | "text";

export function ImageViewer({
  src,
  alt,
  downloadName = "nexus-image",
  onClose,
  extra,
  testId = "image-viewer",
}: ImageViewerProps): JSX.Element {
  const [adjustments, setAdjustments] = useState<ImageAdjustments>({ ...NEUTRAL_ADJUSTMENTS });
  const [tool, setTool] = useState<Tool>("none");
  const [color, setColor] = useState("#ff3b30");
  const [brushSize, setBrushSize] = useState(8);
  /** Committed marks; `redo` holds what undo popped. */
  const [marks, setMarks] = useState<readonly EditMark[]>([]);
  const [redo, setRedo] = useState<readonly EditMark[]>([]);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef<{ x: number; y: number }[] | null>(null);

  const edited = marks.length > 0 || !adjustmentsAreNeutral(adjustments);

  // Escape closes; the backdrop click does too. Both were missing before.
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose();
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redoMark();
        else undoMark();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, marks, redo]);

  /** Repaint the overlay from the mark list whenever it changes. */
  const repaint = useCallback((): void => {
    const canvas = overlayRef.current;
    if (!canvas || !natural) return;
    canvas.width = natural.w;
    canvas.height = natural.h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    paintMarks(ctx, marks);
    if (drawingRef.current && drawingRef.current.length > 0) {
      paintMarks(ctx, [
        { kind: "stroke", color, size: brushSize, points: drawingRef.current },
      ]);
    }
  }, [brushSize, color, marks, natural]);

  useEffect(() => {
    repaint();
  }, [repaint]);

  function undoMark(): void {
    setMarks((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1]!;
      setRedo((r) => [...r, last]);
      return prev.slice(0, -1);
    });
  }

  function redoMark(): void {
    setRedo((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1]!;
      setMarks((m) => [...m, last]);
      return prev.slice(0, -1);
    });
  }

  /** Pointer position in NATURAL image pixels, not screen pixels. */
  function toImagePoint(event: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / Math.max(1, rect.width);
    const scaleY = canvas.height / Math.max(1, rect.height);
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  function onPointerDown(event: React.PointerEvent<HTMLCanvasElement>): void {
    if (tool === "none") return;
    const point = toImagePoint(event);
    if (tool === "text") {
      const text = window.prompt("Text to add");
      if (!text) return;
      setMarks((prev) => [
        ...prev,
        { kind: "text", color, size: brushSize * 4, text, x: point.x, y: point.y },
      ]);
      setRedo([]);
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = [point];
    repaint();
  }

  function onPointerMove(event: React.PointerEvent<HTMLCanvasElement>): void {
    if (!drawingRef.current) return;
    drawingRef.current.push(toImagePoint(event));
    repaint();
  }

  function onPointerUp(): void {
    const points = drawingRef.current;
    drawingRef.current = null;
    if (!points || points.length === 0) return;
    setMarks((prev) => [...prev, { kind: "stroke", color, size: brushSize, points }]);
    setRedo([]);
  }

  /** Composite adjustments + marks onto a canvas and hand back a PNG blob. */
  const exportEdited = useCallback(async (): Promise<Blob | null> => {
    const image = imgRef.current;
    if (!image || !natural) return null;
    const canvas = document.createElement("canvas");
    canvas.width = natural.w;
    canvas.height = natural.h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    // Adjustments first, so marks are painted at full strength on top.
    ctx.filter = adjustmentFilter(adjustments);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    ctx.filter = "none";
    if (adjustments.sharpness > 0) {
      try {
        const raw = ctx.getImageData(0, 0, canvas.width, canvas.height);
        // Write the sharpened bytes back into the ImageData we already own,
        // rather than constructing a new one: `new ImageData(buffer, ...)`
        // needs a plain ArrayBuffer, and a typed array returned from a helper
        // is not guaranteed to have one under `lib.dom` in TS 5.7+.
        const sharpened = sharpenPixels(
          raw.data,
          canvas.width,
          canvas.height,
          adjustments.sharpness,
        );
        raw.data.set(sharpened);
        ctx.putImageData(raw, 0, 0);
      } catch {
        // A tainted canvas cannot be read back; the un-sharpened export is
        // still correct in every other respect.
      }
    }
    paintMarks(ctx, marks);
    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png");
    });
  }, [adjustments, marks, natural]);

  const save = useCallback(
    async (which: "edited" | "original"): Promise<void> => {
      const blob =
        which === "original" ? await fetch(src).then((r) => r.blob()) : await exportEdited();
      if (!blob) return;
      // An object URL + a synthetic click is the one download path that works
      // in the Electron renderer for both a data: source and a canvas blob.
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${downloadName}${which === "edited" ? "-edited" : ""}.png`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
    },
    [downloadName, exportEdited, src],
  );

  const filter = useMemo(() => adjustmentFilter(adjustments), [adjustments]);

  return (
    <div
      data-testid={testId}
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 90,
        background: "color-mix(in srgb, #000 88%, transparent)",
        backdropFilter: "blur(6px)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Toolbar */}
      <div
        onClick={(e) => e.stopPropagation()}
        data-testid={`${testId}-toolbar`}
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "var(--space-2)",
          padding: "var(--space-2) var(--space-3)",
          background: "color-mix(in srgb, var(--bg-1) 92%, transparent)",
          borderBottom: "1px solid var(--border-1)",
        }}
      >
        <ToolButton
          label="Brush"
          active={tool === "brush"}
          testId={`${testId}-brush`}
          onClick={() => setTool((t) => (t === "brush" ? "none" : "brush"))}
        >
          <Brush size={16} aria-hidden="true" />
        </ToolButton>
        <ToolButton
          label="Add text"
          active={tool === "text"}
          testId={`${testId}-text`}
          onClick={() => setTool((t) => (t === "text" ? "none" : "text"))}
        >
          <TypeIcon size={16} aria-hidden="true" />
        </ToolButton>

        <input
          type="color"
          aria-label="Colour"
          data-testid={`${testId}-color`}
          value={color}
          onChange={(e) => setColor(e.target.value)}
          style={{
            width: 28,
            height: 28,
            padding: 0,
            border: "1px solid var(--border-1)",
            borderRadius: 6,
            background: "transparent",
            cursor: "pointer",
          }}
        />
        <label style={labelStyle}>
          Size
          <input
            type="range"
            min={1}
            max={64}
            value={brushSize}
            data-testid={`${testId}-size`}
            onChange={(e) => setBrushSize(Number(e.target.value))}
          />
        </label>

        <Divider />

        <Slider
          icon={<Sun size={14} aria-hidden="true" />}
          label="Brightness"
          testId={`${testId}-brightness`}
          value={adjustments.brightness}
          min={20}
          max={200}
          onChange={(v) => setAdjustments((a) => ({ ...a, brightness: v }))}
        />
        <Slider
          icon={<Contrast size={14} aria-hidden="true" />}
          label="Contrast"
          testId={`${testId}-contrast`}
          value={adjustments.contrast}
          min={20}
          max={200}
          onChange={(v) => setAdjustments((a) => ({ ...a, contrast: v }))}
        />
        <Slider
          label="Saturation"
          testId={`${testId}-saturation`}
          value={adjustments.saturation}
          min={0}
          max={200}
          onChange={(v) => setAdjustments((a) => ({ ...a, saturation: v }))}
        />
        <Slider
          label="Sharpness"
          testId={`${testId}-sharpness`}
          value={adjustments.sharpness}
          min={0}
          max={100}
          onChange={(v) => setAdjustments((a) => ({ ...a, sharpness: v }))}
        />

        <Divider />

        <ToolButton
          label="Undo"
          testId={`${testId}-undo`}
          disabled={marks.length === 0}
          onClick={undoMark}
        >
          <Undo2 size={16} aria-hidden="true" />
        </ToolButton>
        <ToolButton
          label="Redo"
          testId={`${testId}-redo`}
          disabled={redo.length === 0}
          onClick={redoMark}
        >
          <Redo2 size={16} aria-hidden="true" />
        </ToolButton>
        <ToolButton
          label="Reset edits"
          testId={`${testId}-reset`}
          disabled={!edited}
          onClick={() => {
            setMarks([]);
            setRedo([]);
            setAdjustments({ ...NEUTRAL_ADJUSTMENTS });
          }}
        >
          <RotateCcw size={16} aria-hidden="true" />
        </ToolButton>

        <div style={{ marginLeft: "auto", display: "flex", gap: "var(--space-2)" }}>
          {extra}
          <button
            type="button"
            data-testid={`${testId}-download-edited`}
            onClick={() => void save("edited")}
            disabled={!edited}
            style={primaryButtonStyle(edited)}
          >
            <Download size={15} aria-hidden="true" /> Save edited
          </button>
          <button
            type="button"
            data-testid={`${testId}-download-original`}
            onClick={() => void save("original")}
            style={primaryButtonStyle(true)}
          >
            <Download size={15} aria-hidden="true" /> Save original
          </button>
          <ToolButton label="Close" testId={`${testId}-close`} onClick={onClose}>
            <X size={16} aria-hidden="true" />
          </ToolButton>
        </div>
      </div>

      {/* Stage: the image at its own resolution, capped to the viewport. */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "var(--space-3)",
          overflow: "auto",
        }}
      >
        <div style={{ position: "relative", lineHeight: 0 }}>
          <img
            ref={imgRef}
            src={src}
            alt={alt ?? "Generated image"}
            data-testid={`${testId}-image`}
            crossOrigin="anonymous"
            onLoad={(e) => {
              const node = e.currentTarget;
              setNatural({ w: node.naturalWidth, h: node.naturalHeight });
            }}
            style={{
              display: "block",
              maxWidth: "100%",
              maxHeight: "calc(100vh - 9rem)",
              objectFit: "contain",
              filter,
            }}
          />
          <canvas
            ref={overlayRef}
            data-testid={`${testId}-overlay`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              cursor: tool === "none" ? "default" : "crosshair",
              // Only capture the pointer while a tool is armed, so a plain
              // click on the picture still falls through to the backdrop.
              pointerEvents: tool === "none" ? "none" : "auto",
            }}
          />
        </div>
      </div>
    </div>
  );
}

/** Paint a mark list onto any 2D context (overlay preview and export share it). */
function paintMarks(ctx: CanvasRenderingContext2D, marks: readonly EditMark[]): void {
  for (const mark of marks) {
    if (mark.kind === "text") {
      ctx.fillStyle = mark.color;
      ctx.font = `${mark.size}px sans-serif`;
      ctx.textBaseline = "top";
      ctx.fillText(mark.text, mark.x, mark.y);
      continue;
    }
    if (mark.points.length === 0) continue;
    ctx.strokeStyle = mark.color;
    ctx.lineWidth = mark.size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    const [first, ...rest] = mark.points;
    ctx.moveTo(first!.x, first!.y);
    for (const point of rest) ctx.lineTo(point.x, point.y);
    // A single tap is a dot, not an invisible zero-length line.
    if (rest.length === 0) ctx.lineTo(first!.x + 0.01, first!.y);
    ctx.stroke();
  }
}

const labelStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "var(--space-1)",
  fontSize: "var(--text-xs)",
  color: "var(--fg-muted)",
} as const;

function Divider(): JSX.Element {
  return (
    <span
      aria-hidden="true"
      style={{ width: 1, height: 20, background: "var(--border-1)" }}
    />
  );
}

function ToolButton({
  label,
  active = false,
  disabled = false,
  testId,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  testId: string;
  onClick: () => void;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      data-testid={testId}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 30,
        height: 30,
        borderRadius: 8,
        border: "1px solid",
        borderColor: active ? "var(--accent-image, var(--accent-chatbot))" : "transparent",
        background: active
          ? "color-mix(in srgb, var(--accent-image, var(--accent-chatbot)) 18%, transparent)"
          : "transparent",
        color: disabled ? "var(--fg-disabled, var(--fg-muted))" : "var(--fg-0)",
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

function Slider({
  icon,
  label,
  testId,
  value,
  min,
  max,
  onChange,
}: {
  icon?: React.ReactNode;
  label: string;
  testId: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}): JSX.Element {
  return (
    <label style={labelStyle} title={`${label}: ${value}`}>
      {icon}
      <span>{label}</span>
      <input
        type="range"
        aria-label={label}
        data-testid={testId}
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "5.5rem" }}
      />
    </label>
  );
}

function primaryButtonStyle(enabled: boolean) {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "var(--space-1)",
    padding: "0.3rem 0.75rem",
    borderRadius: "999px",
    border: "1px solid var(--border-1)",
    background: "var(--bg-2, var(--bg-1))",
    color: enabled ? "var(--fg-0)" : "var(--fg-muted)",
    opacity: enabled ? 1 : 0.5,
    cursor: enabled ? "pointer" : "not-allowed",
    fontSize: "var(--text-xs)",
  } as const;
}
