/**
 * v2.13.0 Phase 6 -- the one pixel path for Image Studio edits.
 *
 * Extracted from ImageViewer.tsx so the viewer's live preview and export and
 * the agent render bridge share the same adjustments, sharpening and mark
 * painting. Browser-only: it draws on Canvas.
 */

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

/** Paint a mark list onto any 2D context (overlay preview and export share it). */
export function paintMarks(ctx: CanvasRenderingContext2D, marks: readonly EditMark[]): void {
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

export class ImageRenderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageRenderError";
  }
}

/**
 * Composite `image` with adjustments and marks at its natural size. Throws
 * ImageRenderError when sharpening cannot read the canvas back, so no caller
 * saves an approximation as the edited image.
 */
export function renderEditedCanvas(
  image: CanvasImageSource,
  width: number,
  height: number,
  adjustments: ImageAdjustments,
  marks: readonly EditMark[],
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImageRenderError("No 2D canvas is available to render the image.");
  if (!renderAdjusted(ctx, image, width, height, adjustments)) {
    throw new ImageRenderError("The edited image could not be rendered: its pixels cannot be read back for sharpening.");
  }
  paintMarks(ctx, marks);
  return canvas;
}

export async function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new ImageRenderError("The rendered image could not be encoded as PNG.");
  return blob;
}

/** Decode PNG bytes, render the edit, and return the edited PNG bytes. */
export async function renderEditedPng(
  sourcePng: Blob,
  adjustments: ImageAdjustments,
  marks: readonly EditMark[],
): Promise<Blob> {
  const bitmap = await createImageBitmap(sourcePng);
  try {
    return await canvasToPng(renderEditedCanvas(bitmap, bitmap.width, bitmap.height, adjustments, marks));
  } finally {
    bitmap.close();
  }
}
