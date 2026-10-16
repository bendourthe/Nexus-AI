/**
 * v2.13.0 Phase 5 -- durable Image Studio edits for the desktop viewer.
 *
 * Generated images are written once, content-addressed, under an owned media
 * root so a persisted turn can name them. Edit grants are issued when the user
 * opens an image in the viewer (the human selection), bound to this sidecar
 * process and to the image's identity, and revoked when the viewer closes or
 * its session is deleted. They never leave this process.
 */

import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";

import { ImageEditRecipeStore, type ImageEditAccess } from "../../../../core/generations/ImageEditRecipeStore.js";
import {
  ImageEditError,
  imageEditCapabilities,
  type ImageEditIdentity,
  type ImageEditRecipe,
} from "../../../../core/image/ImageEditRecipe.js";
import type { StudioSessionStore } from "../../../../core/generations/StudioSessionStore.js";
import { generatedImagesRoot } from "./generatedImages.js";

const UI_CALLER = "desktop-image-viewer";

interface Grant {
  readonly identity: ImageEditIdentity;
}

export interface OpenedImageEdit {
  readonly grantId: string;
  readonly identity: ImageEditIdentity;
  readonly recipe: ImageEditRecipe;
  readonly capabilities: ReturnType<typeof imageEditCapabilities>;
  readonly png: string;
}

export interface ImageEditOps {
  media(input: { sessionId: string; turnId: string }): { png: string };
  open(input: { sessionId: string; turnId: string }): OpenedImageEdit;
  commit(input: { grantId: string; action: unknown; expectedRevision: number }): {
    recipe: ImageEditRecipe;
    capabilities: ReturnType<typeof imageEditCapabilities>;
  };
  revision(input: { grantId: string }): { revision: number };
  close(input: { grantId: string }): { ok: true };
  /** Called by the session deletion owner; drops every grant for that session. */
  revokeSession(sessionId: string): void;
}

/** `CODE: message`, so the renderer can tell a conflict from a missing image. */
export function imageEditFailure(error: unknown): Error {
  if (error instanceof ImageEditError) return new Error(`${error.code}: ${error.message}`);
  return error instanceof Error ? error : new Error(String(error));
}

export function createImageEditOps(
  sessions: StudioSessionStore,
  mediaRoot: string = generatedImagesRoot(),
): ImageEditOps {
  mkdirSync(mediaRoot, { recursive: true });
  const runId = randomUUID();
  const grants = new Map<string, Grant>();
  const authorize = (access: ImageEditAccess, requested: ImageEditIdentity): boolean => {
    const grant = grants.get(access.grantId);
    return access.callerId === UI_CALLER && access.runId === runId && grant !== undefined
      && grant.identity.studioSessionId === requested.studioSessionId
      && grant.identity.studioTurnId === requested.studioTurnId
      && grant.identity.sourceSha256 === requested.sourceSha256;
  };
  const recipes = new ImageEditRecipeStore(sessions, mediaRoot, authorize);
  const access = (grantId: string): ImageEditAccess => ({ callerId: UI_CALLER, runId, grantId });
  const granted = (grantId: string): Grant => {
    const grant = grants.get(grantId);
    if (!grant) throw new ImageEditError("FORBIDDEN", "This image editor session has ended. Reopen the image.");
    return grant;
  };
  const guarded = <T>(operation: () => T): T => {
    try {
      return operation();
    } catch (error) {
      throw imageEditFailure(error);
    }
  };

  return {
    media: (input) => guarded(() => ({
      png: recipes.describe(input.sessionId, input.turnId).source.bytes.toString("base64"),
    })),
    open: (input) => guarded(() => {
      const { identity, source } = recipes.describe(input.sessionId, input.turnId);
      const grantId = randomUUID();
      grants.set(grantId, { identity });
      try {
        const recipe = recipes.load(identity, access(grantId));
        return {
          grantId, identity, recipe,
          capabilities: imageEditCapabilities(recipe),
          png: source.bytes.toString("base64"),
        };
      } catch (error) {
        grants.delete(grantId);
        throw error;
      }
    }),
    commit: (input) => guarded(() => {
      const grant = granted(input.grantId);
      const recipe = recipes.commit(grant.identity, access(input.grantId), input.action, input.expectedRevision);
      return { recipe, capabilities: imageEditCapabilities(recipe) };
    }),
    revision: (input) => guarded(() => {
      const grant = granted(input.grantId);
      return { revision: recipes.revision(grant.identity, access(input.grantId)) };
    }),
    close: (input) => {
      grants.delete(input.grantId);
      return { ok: true };
    },
    revokeSession: (sessionId) => {
      for (const [id, grant] of grants) {
        if (grant.identity.studioSessionId === sessionId) grants.delete(id);
      }
    },
  };
}
