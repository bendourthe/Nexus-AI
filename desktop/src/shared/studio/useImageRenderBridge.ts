/**
 * v2.13.0 Phase 6 -- the renderer side of the bounded render bridge
 * (docs/releases/v2/v2.13/development/image-command-contract.md).
 *
 * The shell cannot push to the renderer, so the running window polls the
 * sidecar for agent render requests and answers each with the same
 * `renderEditedPng` the viewer's own export uses. One request at a time; a
 * failure is reported back rather than swallowed.
 */

import { useEffect } from "react";

import { ipcCall } from "../../lib/ipc";
import type { EditMark, ImageAdjustments } from "./imageEditRenderer";
import { renderEditedPng } from "./imageEditRenderer";

/** Fast enough for the sidecar's 8 s deadline, cheap on local IPC. */
export const RENDER_POLL_MS = 500;

interface RenderRequest {
  readonly requestId: string;
  readonly adjustments: ImageAdjustments;
  readonly marks: readonly EditMark[];
  readonly png: string;
}

function base64ToBlob(base64: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: "image/png" });
}

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Claim and answer one pending request. Resolves false when there was none. */
export async function serveOneRenderRequest(
  render: typeof renderEditedPng = renderEditedPng,
): Promise<boolean> {
  const claimed = await ipcCall<{ request: RenderRequest | null }>("studio.image.render.claim", {});
  const request = claimed.ok ? claimed.value.request : null;
  if (!request) return false;
  let answer: { ok: boolean; png?: string; message?: string };
  try {
    const png = await render(base64ToBlob(request.png), request.adjustments, request.marks);
    answer = { ok: true, png: await blobToBase64(png) };
  } catch (error) {
    answer = { ok: false, message: error instanceof Error ? error.message : "The image could not be rendered." };
  }
  await ipcCall("studio.image.render.complete", { requestId: request.requestId, ...answer });
  return true;
}

/** Mount once in the app shell; inert outside Tauri (the claim call fails). */
export function useImageRenderBridge(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return undefined;
    let busy = false;
    let stopped = false;
    const timer = window.setInterval(() => {
      if (busy || stopped) return;
      busy = true;
      void (async () => {
        try {
          // Drain a short burst so back-to-back requests do not wait a full tick each.
          for (let i = 0; i < 4 && !stopped && (await serveOneRenderRequest()); i += 1);
        } catch {
          // The sidecar may be restarting; the next tick tries again.
        } finally {
          busy = false;
        }
      })();
    }, RENDER_POLL_MS);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [enabled]);
}
