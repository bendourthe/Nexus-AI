/**
 * v2.13.0 Phase 5 -- renderer client for durable Image Studio edits.
 *
 * The sidecar owns committed state. Every call returns the authoritative
 * recipe or a typed failure; the viewer never reports Saved without one.
 */

import { ipcCall } from "../../lib/ipc";
import type {
  ImageEditIdentity,
  ImageEditRecipe,
} from "../../../../core/image/ImageEditRecipe";

export type ImageEditFailureCode =
  | "INVALID_RECIPE" | "LIMIT_EXCEEDED" | "REVISION_CONFLICT" | "NO_UNDO" | "NO_REDO"
  | "FORBIDDEN" | "IMAGE_NOT_FOUND" | "SOURCE_CHANGED" | "UNSUPPORTED_SOURCE"
  | "STORAGE_UNAVAILABLE" | "RENDER_FAILED" | "UNAVAILABLE";

export class ImageEditRequestError extends Error {
  constructor(readonly code: ImageEditFailureCode, message: string) {
    super(message);
    this.name = "ImageEditRequestError";
  }
}

const KNOWN = new Set<string>([
  "INVALID_RECIPE", "LIMIT_EXCEEDED", "REVISION_CONFLICT", "NO_UNDO", "NO_REDO", "FORBIDDEN",
  "IMAGE_NOT_FOUND", "SOURCE_CHANGED", "UNSUPPORTED_SOURCE", "STORAGE_UNAVAILABLE", "RENDER_FAILED",
]);

/** The sidecar formats image-edit failures as `CODE: message`. */
export function toImageEditError(message: string): ImageEditRequestError {
  const match = /^([A-Z_]+): ([\s\S]*)$/.exec(message.trim());
  if (match && KNOWN.has(match[1]!)) {
    return new ImageEditRequestError(match[1] as ImageEditFailureCode, match[2]!);
  }
  return new ImageEditRequestError("UNAVAILABLE", message || "Image edits are unavailable.");
}

async function call<T>(method: Parameters<typeof ipcCall>[0], params: Record<string, unknown>): Promise<T> {
  const reply = await ipcCall<T>(method, params);
  if (!reply.ok) throw toImageEditError(reply.message);
  return reply.value;
}

export interface OpenedImageEdit {
  readonly grantId: string;
  readonly identity: ImageEditIdentity;
  readonly recipe: ImageEditRecipe;
  readonly png: string;
}

/** One persisted Image Studio image, as the viewer sees it. */
export interface DurableImageEdit {
  open(): Promise<OpenedImageEdit>;
  commit(grantId: string, action: unknown, expectedRevision: number): Promise<ImageEditRecipe>;
  revision(grantId: string): Promise<number>;
  close(grantId: string): Promise<void>;
}

export interface StudioTurnRef {
  readonly sessionId: string;
  readonly turnId: string;
}

export function createDurableImageEdit(turn: StudioTurnRef): DurableImageEdit {
  return {
    open: () => call<OpenedImageEdit>("studio.image.edit.open", { ...turn }),
    commit: async (grantId, action, expectedRevision) =>
      (await call<{ recipe: ImageEditRecipe }>("studio.image.edit.commit", { grantId, action, expectedRevision })).recipe,
    revision: async (grantId) =>
      (await call<{ revision: number }>("studio.image.edit.revision", { grantId })).revision,
    close: async (grantId) => {
      await call("studio.image.edit.close", { grantId });
    },
  };
}

/** The saved PNG of a persisted turn, as a data URL the webview can draw without tainting a canvas. */
export async function loadStudioImage(turn: StudioTurnRef): Promise<string> {
  const { png } = await call<{ png: string }>("studio.image.media", { ...turn });
  return `data:image/png;base64,${png}`;
}
