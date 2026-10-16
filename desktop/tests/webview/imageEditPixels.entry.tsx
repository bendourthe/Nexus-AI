/**
 * v2.13.0 Phase 5 -- in-browser pixel check for the durable image viewer.
 *
 * Bundled by image-edit-pixels.mjs and opened in headless Edge (Chromium, the
 * engine behind the desktop's WebView2). jsdom has no Canvas pixels, so this is
 * where preview/export equality and real sharpening are observed. The result
 * is written to <pre id="result"> as JSON.
 */

import { createRoot } from "react-dom/client";

import {
  createImageEditRecipe,
  reduceImageEditRecipe,
  type ImageEditRecipe,
} from "../../../core/image/ImageEditRecipe";
import { ImageViewer, NEUTRAL_ADJUSTMENTS, renderAdjusted } from "../../src/shared/studio/ImageViewer";
import type { DurableImageEdit } from "../../src/shared/studio/imageEditClient";

const W = 64;
const H = 48;
const ADJUST = { brightness: 120, contrast: 130, saturation: 70, sharpness: 60 };

function report(result: Record<string, unknown>): void {
  const pre = document.createElement("pre");
  pre.id = "result";
  pre.textContent = JSON.stringify(result);
  document.body.appendChild(pre);
}

async function fixturePng(): Promise<{ base64: string; bytes: ArrayBuffer }> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  for (let x = 0; x < W; x += 1) {
    ctx.fillStyle = `rgb(${(x * 4) % 256}, ${(255 - x * 3) % 256}, ${(x * 7) % 256})`;
    ctx.fillRect(x, 0, 1, H);
  }
  ctx.fillStyle = "#101010";
  ctx.fillRect(20, 10, 12, 20); // a hard edge, so sharpening has something to do
  const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
  const bytes = await blob.arrayBuffer();
  let binary = "";
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return { base64: btoa(binary), bytes };
}

function pixels(source: CanvasImageSource): Uint8ClampedArray {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(source, 0, 0);
  return ctx.getImageData(0, 0, W, H).data;
}

function compare(a: Uint8ClampedArray, b: Uint8ClampedArray): { differing: number; maxDelta: number } {
  let differing = 0;
  let maxDelta = 0;
  for (let i = 0; i < a.length; i += 1) {
    const delta = Math.abs(a[i]! - b[i]!);
    if (delta > 0) differing += 1;
    if (delta > maxDelta) maxDelta = delta;
  }
  return { differing, maxDelta };
}

async function sha256(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function until<T>(probe: () => T | null | undefined, label: string, ms = 8000): Promise<T> {
  const started = performance.now();
  for (;;) {
    const value = probe();
    if (value) return value;
    if (performance.now() - started > ms) throw new Error(`timed out waiting for ${label}`);
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

async function main(): Promise<void> {
  const source = await fixturePng();
  const identity = { studioSessionId: "s", studioTurnId: "t", sourceSha256: await sha256(source.bytes) };
  let recipe: ImageEditRecipe = createImageEditRecipe(identity, W, H);
  for (const action of [
    { kind: "adjustments", values: ADJUST },
    { kind: "mark", mark: { kind: "stroke", color: "#ff0000", size: 4, points: [{ x: 2, y: 2 }, { x: 40, y: 30 }, { x: 60, y: 5 }] } },
    { kind: "mark", mark: { kind: "text", color: "#00ffff", size: 12, text: "Nx", x: 4, y: 30 } },
  ]) recipe = reduceImageEditRecipe(recipe, action, recipe.revision);

  const durable: DurableImageEdit = {
    open: async () => ({ grantId: "g", identity, recipe, png: source.base64 }),
    commit: async () => recipe,
    revision: async () => recipe.revision,
    close: async () => undefined,
  };
  const captured: Blob[] = [];
  const originalCreate = URL.createObjectURL.bind(URL);
  URL.createObjectURL = (blob: Blob | MediaSource): string => {
    if (blob instanceof Blob) captured.push(blob);
    return originalCreate(blob);
  };
  HTMLAnchorElement.prototype.click = function noDownload(): void { /* capture only */ };

  const root = document.createElement("div");
  document.body.appendChild(root);
  createRoot(root).render(<ImageViewer src="data:image/png;base64," onClose={() => undefined} testId="v" durable={durable} />);

  await until(() => document.querySelector('[data-testid="v-save-status"]')?.textContent?.includes("Edits saved"), "saved status");
  const image = await until(() => {
    const img = document.querySelector<HTMLImageElement>('[data-testid="v-image"]');
    return img && img.complete && img.naturalWidth === W ? img : null;
  }, "source image");
  const preview = await until(() => document.querySelector<HTMLCanvasElement>('[data-testid="v-preview"]'), "preview canvas");
  await until(() => (preview.width === W ? preview : null), "preview render");
  await new Promise((resolve) => setTimeout(resolve, 300)); // past the 90 ms preview debounce
  const overlay = document.querySelector<HTMLCanvasElement>('[data-testid="v-overlay"]')!;

  const composite = document.createElement("canvas");
  composite.width = W;
  composite.height = H;
  const cctx = composite.getContext("2d")!;
  cctx.drawImage(preview, 0, 0);
  cctx.drawImage(overlay, 0, 0);
  const shown = cctx.getImageData(0, 0, W, H).data;

  const click = (id: string): void => document.querySelector<HTMLElement>(`[data-testid="${id}"]`)!.click();
  click("v-save");
  await until(() => document.querySelector('[data-testid="v-choice-edited"]'), "version choice");
  click("v-choice-edited");
  const editedBlob = await until(() => captured[0], "edited export");
  const exported = pixels(await createImageBitmap(editedBlob));

  click("v-save");
  await until(() => document.querySelector('[data-testid="v-choice-original"]'), "version choice");
  click("v-choice-original");
  const originalBlob = await until(() => captured[1], "original export");

  // Sharpening must change pixels in this engine, not only in the kernel test.
  const plain = document.createElement("canvas");
  plain.width = W;
  plain.height = H;
  const pctx = plain.getContext("2d")!;
  renderAdjusted(pctx, image, W, H, { ...NEUTRAL_ADJUSTMENTS, sharpness: 0 });
  const unsharp = pctx.getImageData(0, 0, W, H).data;
  const sharpOk = renderAdjusted(pctx, image, W, H, { ...NEUTRAL_ADJUSTMENTS, sharpness: 100 });
  const sharp = pctx.getImageData(0, 0, W, H).data;

  report({
    ok: true,
    engine: navigator.userAgent,
    previewVsExport: compare(shown, exported),
    sharpening: { readback: sharpOk, ...compare(unsharp, sharp) },
    original: {
      sourceSha256: identity.sourceSha256,
      downloadedSha256: await sha256(await originalBlob.arrayBuffer()),
    },
    exportedType: editedBlob.type,
  });
}

main().catch((error: unknown) => report({ ok: false, error: error instanceof Error ? error.message : String(error) }));
