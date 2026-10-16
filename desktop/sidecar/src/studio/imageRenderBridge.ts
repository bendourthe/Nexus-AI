/**
 * v2.13.0 Phase 6 -- bounded render requests from the sidecar to the running
 * desktop renderer (docs/releases/v2/v2.13/development/image-command-contract.md).
 *
 * The shell only relays renderer-initiated calls, so the renderer polls
 * `claim` and answers with `complete`. A request nobody claims and answers
 * within the deadline fails as RENDERER_UNAVAILABLE; a response for a dead
 * request id, or one that is not a PNG of the requested size, is refused.
 */

import { randomUUID } from "node:crypto";

import { ImageEditError } from "../../../../core/image/ImageEditRecipe.js";
import type { EditMark, ImageAdjustments } from "../../../../core/image/ImageEditRecipe.js";

const PNG_MAGIC = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

/** Encoded output ceiling: 16-bit RGBA at the 2048 x 2048 recipe limit, plus headroom. */
export const MAX_RENDER_OUTPUT_BYTES = 2048 * 2048 * 8 + 1024 * 1024;
export const RENDER_DEADLINE_MS = 8000;

export interface RenderInput {
  readonly revision: number;
  readonly sourceSha256: string;
  readonly width: number;
  readonly height: number;
  readonly adjustments: ImageAdjustments;
  readonly marks: readonly EditMark[];
  /** The pinned, hashed source snapshot, base64. */
  readonly png: string;
}

export interface RenderRequest extends RenderInput {
  readonly requestId: string;
}

interface Pending {
  readonly request: RenderRequest;
  claimed: boolean;
  readonly resolve: (png: Buffer) => void;
  readonly reject: (error: ImageEditError) => void;
  readonly timer: ReturnType<typeof setTimeout>;
}

export interface RenderCompletion {
  readonly requestId: string;
  readonly ok: boolean;
  readonly png?: string;
  readonly message?: string;
}

export class ImageRenderBridge {
  private readonly pending = new Map<string, Pending>();
  private closed = false;

  constructor(private readonly deadlineMs: number = RENDER_DEADLINE_MS) {}

  render(input: RenderInput): Promise<Buffer> {
    if (this.closed) {
      return Promise.reject(new ImageEditError("RENDERER_UNAVAILABLE", "The desktop renderer is shutting down."));
    }
    const requestId = randomUUID();
    return new Promise<Buffer>((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.pending.delete(requestId)) {
          reject(new ImageEditError(
            "RENDERER_UNAVAILABLE",
            "No running Nexus window rendered the image in time. Open Nexus and retry.",
          ));
        }
      }, this.deadlineMs);
      this.pending.set(requestId, { request: { ...input, requestId }, claimed: false, resolve, reject, timer });
    });
  }

  /** The oldest unclaimed request, marked claimed; null when there is none. */
  claim(): RenderRequest | null {
    for (const entry of this.pending.values()) {
      if (!entry.claimed) {
        entry.claimed = true;
        return entry.request;
      }
    }
    return null;
  }

  /** Accepts a response only for a live request; a refused response fails that request. */
  complete(response: RenderCompletion): { accepted: boolean } {
    const entry = this.pending.get(response.requestId);
    if (!entry || !entry.claimed) return { accepted: false };
    this.pending.delete(response.requestId);
    clearTimeout(entry.timer);
    if (!response.ok) {
      entry.reject(new ImageEditError("RENDER_FAILED", response.message?.slice(0, 300) || "The renderer could not render the image."));
      return { accepted: true };
    }
    const png = typeof response.png === "string" ? Buffer.from(response.png, "base64") : Buffer.alloc(0);
    const valid = png.length >= 33 && png.length <= MAX_RENDER_OUTPUT_BYTES
      && png.subarray(0, 8).equals(PNG_MAGIC)
      && png.subarray(12, 16).toString("ascii") === "IHDR"
      && png.readUInt32BE(16) === entry.request.width
      && png.readUInt32BE(20) === entry.request.height;
    if (!valid) {
      entry.reject(new ImageEditError("RENDER_FAILED", "The renderer returned an invalid image."));
      return { accepted: false };
    }
    entry.resolve(png);
    return { accepted: true };
  }

  /** Fails every outstanding request; used when the sidecar shuts down. */
  close(): void {
    this.closed = true;
    for (const [id, entry] of this.pending) {
      clearTimeout(entry.timer);
      entry.reject(new ImageEditError("RENDERER_UNAVAILABLE", "The desktop renderer is shutting down."));
      this.pending.delete(id);
    }
  }
}
