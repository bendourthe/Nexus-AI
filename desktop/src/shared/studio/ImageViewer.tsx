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
import type { DurableImageEdit } from "./imageEditClient";
import { useDurableImageEdit } from "./useDurableImageEdit";
import {
  Brush,
  Copy,
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
 * The CSS filter for the three adjustments CSS can express exactly.
 *
 * WN-1 (fixed): this used to fold sharpness in as a contrast lift, so the
 * preview only approximated it. Worse, the EXPORT applied that same lift AND
 * the real convolution, double-counting sharpness in the saved file. Sharpness
 * is now absent here and handled once, by `sharpenPixels`, on both paths --
 * see `renderAdjusted`, which the preview and the export share.
 */
export function adjustmentFilter(a: ImageAdjustments): string {
  return [
    `brightness(${a.brightness}%)`,
    `contrast(${a.contrast}%)`,
    `saturate(${a.saturation}%)`,
  ].join(" ");
}

/**
 * Paint `image` onto `ctx` with adjustments applied, sharpening last.
 *
 * ONE function for the live preview and the exported file, which is the whole
 * point: the operator sees what they save. Order matters (filter, then
 * convolve), so sharing the code is the only way to keep the two identical.
 */
export function renderAdjusted(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  width: number,
  height: number,
  adjustments: ImageAdjustments,
): boolean {
  ctx.clearRect(0, 0, width, height);
  ctx.filter = adjustmentFilter(adjustments);
  ctx.drawImage(image, 0, 0, width, height);
  ctx.filter = "none";
  if (adjustments.sharpness <= 0) return true;
  try {
    const raw = ctx.getImageData(0, 0, width, height);
    raw.data.set(sharpenPixels(raw.data, width, height, adjustments.sharpness));
    ctx.putImageData(raw, 0, 0);
    return true;
  } catch {
    // A tainted canvas cannot be read back, so sharpening did not happen. The
    // preview shows the rest; v2.13.0: the export refuses rather than save an
    // approximation and call it the edited image.
    return false;
  }
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
  /**
   * v2.4.9: accepted and IGNORED. The studios pass their Copy-workflow / seed
   * / layers row here; the operator reported none of those buttons did
   * anything, so the viewer no longer renders them. Kept on the interface so
   * the call sites stay valid and the intent is explicit rather than a silent
   * prop drop.
   */
  readonly extra?: React.ReactNode;
  readonly testId?: string;
  /**
   * v2.13.0: a persisted Image Studio image. Edits are saved and survive a
   * restart, and undo/redo covers adjustments as well as marks. Without it
   * (Chat attachments) editing stays in memory, as before.
   */
  readonly durable?: DurableImageEdit;
}

type Tool = "none" | "brush" | "text";

export function ImageViewer({
  src,
  alt,
  downloadName = "nexus-image",
  onClose,
  testId = "image-viewer",
  durable,
}: ImageViewerProps): JSX.Element {
  const [localAdjustments, setAdjustments] = useState<ImageAdjustments>({ ...NEUTRAL_ADJUSTMENTS });
  const [tool, setTool] = useState<Tool>("none");
  const [color, setColor] = useState("#ff3b30");
  const [brushSize, setBrushSize] = useState(8);
  /** Committed marks; `redo` holds what undo popped. */
  const [localMarks, setMarks] = useState<readonly EditMark[]>([]);
  const [redo, setRedo] = useState<readonly EditMark[]>([]);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  // v2.13.0: a persisted Image Studio image keeps its edits in the sidecar. A
  // slider drag previews locally and commits once, on release.
  const saved = useDurableImageEdit(durable);
  const isDurable = saved.status !== "off" && saved.status !== "unavailable";
  const editingLocked = isDurable && (saved.status === "loading" || saved.state === null);
  const [dragAdjustments, setDragAdjustments] = useState<ImageAdjustments | null>(null);
  const adjustments: ImageAdjustments = isDurable
    ? dragAdjustments ?? saved.state?.adjustments ?? NEUTRAL_ADJUSTMENTS
    : localAdjustments;
  const marks: readonly EditMark[] = isDurable ? saved.state?.marks ?? [] : localMarks;
  const shownSrc = isDurable ? saved.src : src;

  const imgRef = useRef<HTMLImageElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef<{ x: number; y: number }[] | null>(null);

  const edited = marks.length > 0 || !adjustmentsAreNeutral(adjustments);

  /** Close only after every saved edit is acknowledged; a failure stays visible. */
  const requestClose = useCallback((): void => {
    if (!isDurable) {
      onClose();
      return;
    }
    void saved.flush().then((ok) => {
      if (ok) onClose();
    });
  }, [isDurable, onClose, saved]);

  // Escape closes; the backdrop click does too. Both were missing before.
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") requestClose();
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redoMark();
        else undoMark();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [requestClose, localMarks, redo, isDurable, saved]);

  function changeAdjustment(key: keyof ImageAdjustments, value: number): void {
    if (editingLocked) return;
    if (isDurable) setDragAdjustments({ ...adjustments, [key]: value });
    else setAdjustments((a) => ({ ...a, [key]: value }));
  }

  /** Slider released: one committed command for the whole drag. */
  function commitAdjustments(): void {
    if (!isDurable || !dragAdjustments) return;
    const values = dragAdjustments;
    setDragAdjustments(null);
    saved.apply({ kind: "adjustments", values });
  }

  function commitMark(mark: EditMark): void {
    if (isDurable) {
      saved.apply({ kind: "mark", mark });
      return;
    }
    setMarks((prev) => [...prev, mark]);
    setRedo([]);
  }

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
    if (isDurable) {
      if (saved.canUndo) saved.apply({ kind: "undo" });
      return;
    }
    setMarks((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1]!;
      setRedo((r) => [...r, last]);
      return prev.slice(0, -1);
    });
  }

  function redoMark(): void {
    if (isDurable) {
      if (saved.canRedo) saved.apply({ kind: "redo" });
      return;
    }
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
    // v2.13.0: a drag past the edge stays on the image, so a saved mark never
    // names a point outside its source.
    const clamp = (value: number, max: number): number => Math.min(Math.max(value, 0), max);
    return {
      x: clamp((event.clientX - rect.left) * scaleX, canvas.width),
      y: clamp((event.clientY - rect.top) * scaleY, canvas.height),
    };
  }

  function onPointerDown(event: React.PointerEvent<HTMLCanvasElement>): void {
    if (tool === "none" || editingLocked) return;
    const point = toImagePoint(event);
    if (tool === "text") {
      const text = window.prompt("Text to add");
      if (!text) return;
      commitMark({ kind: "text", color, size: brushSize * 4, text, x: point.x, y: point.y });
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
    commitMark({ kind: "stroke", color, size: brushSize, points });
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
    // The same call the live preview makes, so the file matches the screen.
    // Marks go on afterwards, at full strength, unadjusted.
    if (!renderAdjusted(ctx, image, canvas.width, canvas.height, adjustments)) {
      setExportError("The edited image could not be exported: its pixels cannot be read back for sharpening.");
      return null;
    }
    setExportError(null);
    paintMarks(ctx, marks);
    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png");
    });
  }, [adjustments, marks, natural]);

  /**
   * v2.4.9 -- one Save and one Copy, each asking WHICH version.
   *
   * The toolbar previously carried two save buttons plus a row of studio
   * actions that did nothing ("all the buttons in screenshot 4 should be
   * removed - they're not doing anything anyways"). Two buttons for one verb
   * also forces the user to decide before they know the choice exists.
   */
  const [pendingAction, setPendingAction] = useState<"save" | "copy" | null>(null);

  const save = useCallback(
    async (which: "edited" | "original"): Promise<void> => {
      const blob =
        which === "original" ? await fetch(shownSrc ?? src).then((r) => r.blob()) : await exportEdited();
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
    [downloadName, exportEdited, shownSrc, src],
  );

  /** Copy either version to the clipboard as PNG bytes. */
  const copy = useCallback(
    async (which: "edited" | "original"): Promise<void> => {
      const blob =
        which === "original"
          ? await fetch(shownSrc ?? src).then((r) => r.blob())
          : await exportEdited();
      if (!blob) return;
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
      } catch {
        // Clipboard image writes are permission-gated; Save still works.
      }
    },
    [exportEdited, shownSrc, src],
  );

  const runPending = useCallback(
    (which: "edited" | "original"): void => {
      const action = pendingAction;
      setPendingAction(null);
      if (action === "save") void save(which);
      if (action === "copy") void copy(which);
    },
    [copy, pendingAction, save],
  );

  const filter = useMemo(() => adjustmentFilter(adjustments), [adjustments]);

  /**
   * WN-1 -- exact sharpness preview.
   *
   * CSS has no sharpen primitive, so while sharpness is on we render the same
   * `renderAdjusted` the export uses into a canvas and show that instead of
   * the <img>. At sharpness 0 the <img> plus a CSS filter is pixel-identical
   * to the export and far cheaper, so brightness and saturation stay instant;
   * only sharpening pays for a full-resolution pass, debounced so a slider
   * drag does not queue one render per pixel of travel.
   */
  const sharpening = adjustments.sharpness > 0;
  const previewRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (!sharpening || !natural) return;
    const handle = window.setTimeout(() => {
      const canvas = previewRef.current;
      const image = imgRef.current;
      if (!canvas || !image) return;
      canvas.width = natural.w;
      canvas.height = natural.h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      renderAdjusted(ctx, image, canvas.width, canvas.height, adjustments);
    }, 90);
    return () => window.clearTimeout(handle);
  }, [adjustments, natural, sharpening]);

  return (
    <div
      data-testid={testId}
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
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
      <button
        type="button"
        aria-label="Close image viewer"
        onClick={requestClose}
        style={{ position: "absolute", inset: 0, border: 0, background: "transparent" }}
      />
      {/*
        Toolbar.

        v2.4.11 operator ask: "in editing mode, center the editing options
        horizontally". The editing controls sit in their own centred group;
        Copy / Save / Close are taken out of the flow (absolute, pinned right)
        so their width cannot pull the centred group off centre.
      */}
      <div
        data-testid={`${testId}-toolbar`}
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: "var(--space-2)",
          padding: "var(--space-2) var(--space-3)",
          // Room for the pinned group, so a wide editing row never slides
          // under it on a narrow window.
          paddingRight: "9rem",
          paddingLeft: "9rem",
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
          onChange={(v) => changeAdjustment("brightness", v)}
          onCommit={commitAdjustments}
        />
        <Slider
          icon={<Contrast size={14} aria-hidden="true" />}
          label="Contrast"
          testId={`${testId}-contrast`}
          value={adjustments.contrast}
          min={20}
          max={200}
          onChange={(v) => changeAdjustment("contrast", v)}
          onCommit={commitAdjustments}
        />
        <Slider
          label="Saturation"
          testId={`${testId}-saturation`}
          value={adjustments.saturation}
          min={0}
          max={200}
          onChange={(v) => changeAdjustment("saturation", v)}
          onCommit={commitAdjustments}
        />
        <Slider
          label="Sharpness"
          testId={`${testId}-sharpness`}
          value={adjustments.sharpness}
          min={0}
          max={100}
          onChange={(v) => changeAdjustment("sharpness", v)}
          onCommit={commitAdjustments}
        />

        <Divider />

        <ToolButton
          label="Undo"
          testId={`${testId}-undo`}
          disabled={isDurable ? !saved.canUndo || editingLocked : localMarks.length === 0}
          onClick={undoMark}
        >
          <Undo2 size={16} aria-hidden="true" />
        </ToolButton>
        <ToolButton
          label="Redo"
          testId={`${testId}-redo`}
          disabled={isDurable ? !saved.canRedo || editingLocked : redo.length === 0}
          onClick={redoMark}
        >
          <Redo2 size={16} aria-hidden="true" />
        </ToolButton>
        <ToolButton
          label="Reset edits"
          testId={`${testId}-reset`}
          disabled={!edited || editingLocked}
          onClick={() => {
            if (isDurable) {
              saved.apply({ kind: "reset" });
              return;
            }
            setMarks([]);
            setRedo([]);
            setAdjustments({ ...NEUTRAL_ADJUSTMENTS });
          }}
        >
          <RotateCcw size={16} aria-hidden="true" />
        </ToolButton>

        {/*
          v2.4.9: `extra` (the studio's Copy-workflow / seed / layers row) is
          deliberately NOT rendered. The operator reported those buttons did
          nothing, and an inert control in a toolbar is worse than no control.
          The prop stays on the interface so the studios keep compiling; it is
          unused here on purpose.
        */}
        <div
          style={{
            position: "absolute",
            right: "var(--space-3)",
            top: "50%",
            transform: "translateY(-50%)",
            display: "flex",
            gap: "var(--space-1)",
          }}
        >
          <ToolButton
            label="Copy image"
            testId={`${testId}-copy`}
            onClick={() => (edited ? setPendingAction("copy") : void copy("original"))}
          >
            <Copy size={16} aria-hidden="true" />
          </ToolButton>
          <ToolButton
            label="Save image"
            testId={`${testId}-save`}
            onClick={() => (edited ? setPendingAction("save") : void save("original"))}
          >
            <Download size={16} aria-hidden="true" />
          </ToolButton>
          <ToolButton label="Close" testId={`${testId}-close`} onClick={requestClose}>
            <X size={16} aria-hidden="true" />
          </ToolButton>
        </div>
      </div>

      <EditStatusLine
        testId={`${testId}-save-status`}
        status={saved.status}
        message={exportError ?? saved.message}
        onRetry={saved.retry}
        onReload={saved.reload}
      />

      {pendingAction ? (
        <div
          data-testid={`${testId}-version-choice`}
          role="dialog"
          aria-modal="true"
          aria-label={pendingAction === "save" ? "Save which version" : "Copy which version"}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "color-mix(in srgb, #000 55%, transparent)",
          }}
        >
          <button
            type="button"
            aria-label="Dismiss version choice"
            onClick={() => setPendingAction(null)}
            style={{ position: "absolute", inset: 0, border: 0, background: "transparent" }}
          />
          <div
            style={{
              position: "relative",
              zIndex: 1,
              display: "inline-flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "var(--space-3)",
              padding: "var(--space-4)",
              borderRadius: "var(--radius-lg, 14px)",
              background: "var(--bg-1)",
              border: "1px solid var(--border-1)",
              width: "max-content",
              maxWidth: "90vw",
            }}
          >
            <strong style={{ color: "var(--fg-0)", textAlign: "center" }}>
              {pendingAction === "save" ? "Save which version?" : "Copy which version?"}
            </strong>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "var(--space-2)",
              }}
            >
              <button
                type="button"
                data-testid={`${testId}-choice-edited`}
                onClick={() => runPending("edited")}
                style={primaryButtonStyle(true)}
              >
                Edited
              </button>
              <button
                type="button"
                data-testid={`${testId}-choice-original`}
                onClick={() => runPending("original")}
                style={primaryButtonStyle(true)}
              >
                Original
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Stage: the image at its own resolution, capped to the viewport. */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
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
            src={shownSrc ?? undefined}
            alt={alt ?? "Generated image"}
            data-testid={`${testId}-image`}
            crossOrigin="anonymous"
            onLoad={(e) => {
              const node = e.currentTarget;
              setNatural({ w: node.naturalWidth, h: node.naturalHeight });
            }}
            style={{
              display: sharpening ? "none" : "block",
              maxWidth: "100%",
              maxHeight: "calc(100vh - 9rem)",
              objectFit: "contain",
              filter,
            }}
          />
          {sharpening ? (
            <canvas
              ref={previewRef}
              data-testid={`${testId}-preview`}
              style={{
                display: "block",
                maxWidth: "100%",
                maxHeight: "calc(100vh - 9rem)",
                objectFit: "contain",
              }}
            />
          ) : null}
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
  onCommit,
}: {
  icon?: React.ReactNode;
  label: string;
  testId: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  /** v2.13.0: the drag or key step ended; a durable viewer saves once here. */
  onCommit?: () => void;
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
        onPointerUp={onCommit}
        onKeyUp={onCommit}
        onBlur={onCommit}
        style={{ width: "5.5rem" }}
      />
    </label>
  );
}

/** v2.13.0: whether a persisted image's edits are saved, never claimed early. */
function EditStatusLine({
  testId,
  status,
  message,
  onRetry,
  onReload,
}: {
  testId: string;
  status: ReturnType<typeof useDurableImageEdit>["status"];
  message: string | null;
  onRetry: () => void;
  onReload: () => void;
}): JSX.Element | null {
  const text =
    message ??
    (status === "loading" ? "Loading saved edits..." :
      status === "saving" ? "Saving..." :
        status === "saved" ? "Edits saved" : null);
  if (!text) return null;
  return (
    <div
      data-testid={testId}
      role="status"
      aria-live="polite"
      style={{
        position: "relative",
        zIndex: 1,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: "var(--space-2)",
        padding: "var(--space-1) var(--space-3)",
        fontSize: "var(--text-xs)",
        color: status === "error" || status === "conflict" ? "var(--danger, #ff6b6b)" : "var(--fg-muted)",
      }}
    >
      <span>{text}</span>
      {status === "error" ? (
        <button type="button" data-testid={`${testId}-retry`} onClick={onRetry} style={primaryButtonStyle(true)}>
          Retry
        </button>
      ) : null}
      {status === "conflict" || status === "error" ? (
        <button type="button" data-testid={`${testId}-reload`} onClick={onReload} style={primaryButtonStyle(true)}>
          Reload
        </button>
      ) : null}
    </div>
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
