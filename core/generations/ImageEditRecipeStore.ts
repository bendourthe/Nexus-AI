import { createHash } from "node:crypto";
import { closeSync, fstatSync, openSync, readSync, realpathSync, statSync } from "node:fs";
import { isAbsolute, relative } from "node:path";
import { StudioSessionStore } from "./StudioSessionStore.js";
import type { StudioTurn } from "./StudioSessionStore.types.js";
import {
  createImageEditRecipe, IMAGE_EDIT_LIMITS, ImageEditError, parseImageEditRecipe, PNG_SIGNATURE, reduceImageEditRecipe,
  type ImageEditIdentity, type ImageEditRecipe,
} from "../image/ImageEditRecipe.js";

/** Issued by the host's human confirmation owner, never by the global app token. */
export interface ImageEditAccess {
  readonly callerId: string;
  readonly runId: string;
  readonly grantId: string;
}
export type ImageEditAuthorizer = (access: ImageEditAccess, identity: ImageEditIdentity) => boolean;
export interface ImageEditSourceSnapshot {
  readonly bytes: Buffer;
  readonly sha256: string;
  readonly width: number;
  readonly height: number;
}

// Bounds encoded input while allowing 16-bit RGBA at the decoded pixel ceiling.
export const MAX_IMAGE_EDIT_SOURCE_BYTES = IMAGE_EDIT_LIMITS.pixels * 8 + 1024 * 1024;
const PNG_MAGIC = Buffer.from(PNG_SIGNATURE);

export class ImageEditRecipeStore {
  private readonly mediaRoot: string;

  constructor(
    private readonly sessions: StudioSessionStore,
    mediaRoot: string,
    private readonly authorize: ImageEditAuthorizer,
  ) {
    if (typeof authorize !== "function") throw new ImageEditError("FORBIDDEN", "An owned-image authorizer is required.");
    this.mediaRoot = realpathSync(mediaRoot);
  }

  load(identityInput: ImageEditIdentity, access: ImageEditAccess): ImageEditRecipe {
    const identity = this.identity(identityInput);
    this.checkAccess(access, identity);
    return this.storage(() => this.sessions.withImageRecipe(identity.studioSessionId, identity.studioTurnId, (scope) => {
      const source = this.source(scope.turn, identity);
      const recipe = this.existing(scope.recipeJson, identity, source, scope.storedRevision, scope.storedSourceSha256);
      this.checkAccess(access, identity);
      return recipe;
    }));
  }

  commit(identityInput: ImageEditIdentity, access: ImageEditAccess, action: unknown, expectedRevision: number): ImageEditRecipe {
    const identity = this.identity(identityInput);
    this.checkAccess(access, identity);
    return this.storage(() => this.sessions.withImageRecipe(identity.studioSessionId, identity.studioTurnId, (scope) => {
      const source = this.source(scope.turn, identity);
      const previous = this.existing(scope.recipeJson, identity, source, scope.storedRevision, scope.storedSourceSha256);
      const next = reduceImageEditRecipe(previous, action, expectedRevision);
      this.checkAccess(access, identity);
      scope.commit(next, expectedRevision);
      // The transaction rolls back if authorization or source ownership changes.
      this.source(scope.turn, identity);
      this.checkAccess(access, identity);
      return next;
    }));
  }

  /**
   * The identity and verified bytes of a persisted image turn, for display and for
   * issuing a grant. Reveals nothing the turn's owner does not already list.
   */
  describe(sessionId: string, turnId: string): { identity: ImageEditIdentity; source: ImageEditSourceSnapshot } {
    return this.storage(() => this.sessions.withImageRecipe(sessionId, turnId, (scope) => {
      const source = this.ownedPng(scope.turn);
      const identity = this.identity({ studioSessionId: sessionId, studioTurnId: turnId, sourceSha256: source.sha256 });
      return { identity, source };
    }));
  }

  /** The stored revision only, so an open viewer can poll for outside changes cheaply. */
  revision(identityInput: ImageEditIdentity, access: ImageEditAccess): number {
    const identity = this.identity(identityInput);
    this.checkAccess(access, identity);
    return this.storage(() => this.sessions.withImageRecipe(identity.studioSessionId, identity.studioTurnId, (scope) => {
      if (scope.storedSourceSha256 !== null && scope.storedSourceSha256 !== identity.sourceSha256) {
        throw new ImageEditError("SOURCE_CHANGED", "The recipe no longer matches its original image.");
      }
      return scope.storedRevision;
    }));
  }

  readSource(identityInput: ImageEditIdentity, access: ImageEditAccess): ImageEditSourceSnapshot {
    const identity = this.identity(identityInput);
    this.checkAccess(access, identity);
    return this.storage(() => this.sessions.withImageRecipe(identity.studioSessionId, identity.studioTurnId, (scope) => {
      const source = this.source(scope.turn, identity);
      this.checkAccess(access, identity);
      return source;
    }));
  }

  private identity(input: ImageEditIdentity): ImageEditIdentity {
    return createImageEditRecipe(input, 1, 1).identity;
  }

  private checkAccess(access: ImageEditAccess, identity: ImageEditIdentity): void {
    if (!access || [access.callerId, access.runId, access.grantId].some((value) => typeof value !== "string" || !value || value.length > 256)
      || this.authorize(access, identity) !== true) {
      throw new ImageEditError("FORBIDDEN", "This caller and run have no grant for the selected image.");
    }
  }

  private existing(json: string | null, identity: ImageEditIdentity, source: ImageEditSourceSnapshot, storedRevision: number, storedHash: string | null): ImageEditRecipe {
    if (json === null) return createImageEditRecipe(identity, source.width, source.height);
    let input: unknown;
    try { input = JSON.parse(json); } catch {
      throw new ImageEditError("INVALID_RECIPE", "The stored image recipe is malformed.");
    }
    const recipe = parseImageEditRecipe(input);
    if (recipe.revision !== storedRevision || recipe.identity.sourceSha256 !== storedHash) {
      throw new ImageEditError("INVALID_RECIPE", "Stored image recipe metadata is inconsistent.");
    }
    if (recipe.identity.studioSessionId !== identity.studioSessionId || recipe.identity.studioTurnId !== identity.studioTurnId
      || recipe.identity.sourceSha256 !== identity.sourceSha256 || recipe.width !== source.width || recipe.height !== source.height) {
      throw new ImageEditError("SOURCE_CHANGED", "The recipe no longer matches its original image.");
    }
    return recipe;
  }

  private source(turn: StudioTurn, identity: ImageEditIdentity): ImageEditSourceSnapshot {
    const source = this.ownedPng(turn);
    if (source.sha256 !== identity.sourceSha256) throw new ImageEditError("SOURCE_CHANGED", "The original image hash changed.");
    return source;
  }

  private ownedPng(turn: StudioTurn): ImageEditSourceSnapshot {
    let descriptor: number | undefined;
    try {
      if (!turn.mediaRef || turn.mediaRef.startsWith("data:")) throw new ImageEditError("UNSUPPORTED_SOURCE", "A persisted local PNG is required.");
      const canonical = realpathSync(turn.mediaRef);
      const suffix = relative(this.mediaRoot, canonical);
      if (!suffix || suffix.startsWith("..") || isAbsolute(suffix)) throw new ImageEditError("FORBIDDEN", "Image source is outside owned generation storage.");
      descriptor = openSync(canonical, "r");
      const before = fstatSync(descriptor);
      if (!before.isFile() || before.size > MAX_IMAGE_EDIT_SOURCE_BYTES) throw new ImageEditError("LIMIT_EXCEEDED", "Encoded image exceeds the source safety limit.");
      // A hard link inside the owned root can name a file kept elsewhere.
      if (before.nlink > 1) throw new ImageEditError("FORBIDDEN", "Image source is linked from outside owned generation storage.");
      const bytes = Buffer.allocUnsafe(before.size);
      let offset = 0;
      while (offset < bytes.length) {
        const count = readSync(descriptor, bytes, offset, bytes.length - offset, offset);
        if (!count) throw new ImageEditError("SOURCE_CHANGED", "The original image was truncated while it was read.");
        offset += count;
      }
      const after = fstatSync(descriptor);
      const current = statSync(canonical);
      if (realpathSync(turn.mediaRef) !== canonical || [after, current].some((stat) =>
        stat.dev !== before.dev || stat.ino !== before.ino || stat.size !== before.size
        || stat.mtimeMs !== before.mtimeMs || stat.ctimeMs !== before.ctimeMs)) {
        throw new ImageEditError("SOURCE_CHANGED", "The original image changed while it was read.");
      }
      if (bytes.length < 33 || !bytes.subarray(0, 8).equals(PNG_MAGIC)
        || bytes.readUInt32BE(8) !== 13 || bytes.subarray(12, 16).toString("ascii") !== "IHDR") {
        throw new ImageEditError("UNSUPPORTED_SOURCE", "Durable image edits require a PNG source.");
      }
      const width = bytes.readUInt32BE(16);
      const height = bytes.readUInt32BE(20);
      if (!width || !height || width > IMAGE_EDIT_LIMITS.width || height > IMAGE_EDIT_LIMITS.height
        || width * height > IMAGE_EDIT_LIMITS.pixels) {
        throw new ImageEditError("LIMIT_EXCEEDED", "Source image exceeds the decoded size limit.");
      }
      const sha256 = createHash("sha256").update(bytes).digest("hex");
      return { bytes, sha256, width, height };
    } catch (error) {
      if (error instanceof ImageEditError) throw error;
      throw new ImageEditError("IMAGE_NOT_FOUND", "The original image could not be read.");
    } finally {
      if (descriptor !== undefined) closeSync(descriptor);
    }
  }

  private storage<T>(operation: () => T): T {
    try { return operation(); } catch (error) {
      if (error instanceof ImageEditError) throw error;
      throw new ImageEditError("STORAGE_UNAVAILABLE", "Image edits could not be stored. Retry or reload.");
    }
  }
}
