/**
 * v2.13.0 Phases 5-6 -- durable Image Studio edits for the desktop viewer and
 * for agents (docs/releases/v2/v2.13/development/image-command-contract.md).
 *
 * Viewer grants are issued when the user opens an image (the human selection)
 * and bound to this sidecar process. Agent grants are issued only when a human
 * approves the agent's request in the Ask inbox, and are bound to the agent's
 * caller id, run id and the image's identity. Grants never leave this process
 * except as the secret handed to the approved agent; both kinds end on release
 * or session deletion, agent grants also on expiry. The viewer and agents share
 * one mutation path: ImageEditRecipeStore.commit.
 */

import { createHash, randomUUID } from "node:crypto";
import { closeSync, constants as fsConstants, fstatSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, realpathSync, unlinkSync, writeSync } from "node:fs";
import * as path from "node:path";

import { ImageEditRecipeStore, type ImageEditAccess } from "../../../../core/generations/ImageEditRecipeStore.js";
import {
  deriveImageEditState,
  ImageEditError,
  imageEditCapabilities,
  parseImageEditAction,
  type ImageEditIdentity,
  type ImageEditRecipe,
} from "../../../../core/image/ImageEditRecipe.js";
import type { StudioSessionStore } from "../../../../core/generations/StudioSessionStore.js";
import type { ParkAskInput } from "../../../../modules/coding/autonomy/types.js";
import { nexusHome } from "../../../../core/storage/paths.js";
import { generatedImagesRoot } from "./generatedImages.js";
import type { ImageRenderBridge } from "./imageRenderBridge.js";

const UI_CALLER = "desktop-image-viewer";
const AGENT_NAME = /^[A-Za-z0-9._:-]{1,128}$/;
export const AGENT_GRANT_TTL_MS = 60 * 60 * 1000;
export const REPLAY_CACHE_LIMIT = 256;

export function generatedExportsRoot(home: string = nexusHome()): string {
  return path.join(home, "generations", "exports");
}

interface Grant {
  readonly identity: ImageEditIdentity;
}

interface AgentGrant extends Grant {
  readonly callerId: string;
  readonly runId: string;
  readonly expiresAt: number;
}

type AccessState = "pending" | "approved" | "denied" | "expired";

interface AccessRequest {
  readonly callerId: string;
  readonly runId: string;
  readonly identity: ImageEditIdentity;
  state: AccessState;
  grantId?: string;
}

export interface OpenedImageEdit {
  readonly grantId: string;
  readonly identity: ImageEditIdentity;
  readonly recipe: ImageEditRecipe;
  readonly capabilities: ReturnType<typeof imageEditCapabilities>;
  readonly png: string;
}

/** Who an agent call claims to be; every field must match its grant. */
export interface AgentAccess {
  readonly callerId: string;
  readonly runId: string;
  readonly grantId: string;
}

export interface AgentImageState {
  readonly identity: ImageEditIdentity;
  readonly revision: number;
  readonly values: ReturnType<typeof imageEditCapabilities>["values"];
  readonly marks: number;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly ranges: ReturnType<typeof imageEditCapabilities>["ranges"];
  readonly markSizes: ReturnType<typeof imageEditCapabilities>["markSizes"];
  readonly limits: ReturnType<typeof imageEditCapabilities>["limits"];
  readonly actions: readonly string[];
  readonly expiresAt: number;
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
  /** Called by the session deletion owner; ends every grant and request for that session. */
  revokeSession(sessionId: string): void;

  requestAccess(input: { callerId: string; runId: string; sessionId: string; turnId: string }): { requestId: string; state: AccessState };
  accessStatus(input: { requestId: string; callerId: string; runId: string }): { state: AccessState; grantId?: string; expiresAt?: number };
  describe(access: AgentAccess): AgentImageState;
  apply(access: AgentAccess, input: { action: unknown; expectedRevision: number; idempotencyKey: string }): AgentImageState;
  render(access: AgentAccess, input: { mode: "preview" | "export"; expectedRevision: number }): Promise<{
    revision: number;
    sha256: string;
    bytes: number;
    png?: string;
    path?: string;
  }>;
  release(access: AgentAccess): { ok: true };
}

export interface ImageEditOpsOptions {
  readonly mediaRoot?: string;
  readonly exportsRoot?: string;
  /** The human confirmation owner for agent access requests. */
  readonly askInbox?: { parkAndWait(input: ParkAskInput): Promise<"approved" | "denied" | "expired"> };
  readonly renderBridge?: ImageRenderBridge;
  readonly now?: () => number;
}

/** `CODE: message`, so callers can tell a conflict from a missing image. */
export function imageEditFailure(error: unknown): Error {
  if (error instanceof ImageEditError) return new Error(`${error.code}: ${error.message}`);
  // Never pass a raw system error (paths, errno text) to a caller.
  return new Error("STORAGE_UNAVAILABLE: Image edits are temporarily unavailable. Retry or reload.");
}

/** Pending agent requests at once, in total and per caller (flood and approval-fatigue bound). */
export const MAX_PENDING_REQUESTS = 16;
export const MAX_PENDING_REQUESTS_PER_CALLER = 4;
/** Decided requests kept for `status`, oldest dropped first. */
export const MAX_DECIDED_REQUESTS = 64;

/** Key-sorted JSON, so the same command always hashes the same. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function sha256(bytes: Buffer | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function requireName(value: unknown, field: string): string {
  if (typeof value !== "string" || !AGENT_NAME.test(value)) {
    throw new ImageEditError("FORBIDDEN", `${field} must be 1-128 letters, digits, '.', '_', ':' or '-'.`);
  }
  return value;
}

export function createImageEditOps(
  sessions: StudioSessionStore,
  options: ImageEditOpsOptions | string = {},
): ImageEditOps {
  const opts: ImageEditOpsOptions = typeof options === "string" ? { mediaRoot: options } : options;
  const mediaRoot = opts.mediaRoot ?? generatedImagesRoot();
  const now = opts.now ?? Date.now;
  mkdirSync(mediaRoot, { recursive: true });
  const runId = randomUUID();
  const grants = new Map<string, Grant>();
  const agentGrants = new Map<string, AgentGrant>();
  const requests = new Map<string, AccessRequest>();
  // One replay cache per grant, so another caller cannot evict this grant's entries.
  const replay = new Map<string, Map<string, { hash: string; result: AgentImageState }>>();
  const rendering = new Set<string>();
  const dropGrant = (grantId: string): void => {
    agentGrants.delete(grantId);
    replay.delete(grantId);
  };

  const sameImage = (a: ImageEditIdentity, b: ImageEditIdentity): boolean =>
    a.studioSessionId === b.studioSessionId && a.studioTurnId === b.studioTurnId && a.sourceSha256 === b.sourceSha256;

  const authorize = (access: ImageEditAccess, requested: ImageEditIdentity): boolean => {
    if (access.callerId === UI_CALLER) {
      const grant = grants.get(access.grantId);
      return access.runId === runId && grant !== undefined && sameImage(grant.identity, requested);
    }
    const grant = agentGrants.get(access.grantId);
    return grant !== undefined && grant.expiresAt > now()
      && grant.callerId === access.callerId && grant.runId === access.runId
      && sameImage(grant.identity, requested);
  };
  const recipes = new ImageEditRecipeStore(sessions, mediaRoot, authorize);
  const uiAccess = (grantId: string): ImageEditAccess => ({ callerId: UI_CALLER, runId, grantId });
  const granted = (grantId: string): Grant => {
    const grant = grants.get(grantId);
    if (!grant) throw new ImageEditError("FORBIDDEN", "This image editor session has ended. Reopen the image.");
    return grant;
  };
  const agentGranted = (access: AgentAccess): AgentGrant => {
    const grant = agentGrants.get(access?.grantId);
    if (!grant || grant.callerId !== access.callerId || grant.runId !== access.runId) {
      throw new ImageEditError("FORBIDDEN", "This caller and run have no grant for the selected image.");
    }
    if (grant.expiresAt <= now()) {
      dropGrant(access.grantId);
      throw new ImageEditError("FORBIDDEN", "The image grant expired. Request access again.");
    }
    return grant;
  };
  const guarded = <T>(operation: () => T): T => {
    try {
      return operation();
    } catch (error) {
      throw imageEditFailure(error);
    }
  };
  const stateOf = (grant: AgentGrant, recipe: ImageEditRecipe): AgentImageState => {
    const caps = imageEditCapabilities(recipe);
    return {
      identity: grant.identity,
      revision: caps.revision,
      values: caps.values,
      marks: deriveImageEditState(recipe).marks.length,
      canUndo: caps.canUndo,
      canRedo: caps.canRedo,
      ranges: caps.ranges,
      markSizes: caps.markSizes,
      limits: caps.limits,
      actions: ["adjustments", "mark", "reset", "undo", "redo"],
      expiresAt: grant.expiresAt,
    };
  };

  // Exports go only under an owned root whose canonical path is fixed now.
  const exportsDir = opts.exportsRoot ?? generatedExportsRoot();
  let exportsRoot: string | null = null;
  const canonicalExportsRoot = (): string => {
    if (exportsRoot) return exportsRoot;
    mkdirSync(exportsDir, { recursive: true });
    if (lstatSync(exportsDir).isSymbolicLink()) {
      throw new ImageEditError("EXPORT_UNSAFE", "The exports folder is a link; refusing to write through it.");
    }
    exportsRoot = realpathSync(exportsDir);
    return exportsRoot;
  };
  const writeExport = (bytes: Buffer, name: string, digest: string): string => {
    const root = canonicalExportsRoot();
    const inRoot = (): boolean => {
      try {
        return realpathSync(exportsDir) === root && !lstatSync(exportsDir).isSymbolicLink();
      } catch {
        return false;
      }
    };
    if (!inRoot()) throw new ImageEditError("EXPORT_UNSAFE", "The exports folder was moved or replaced.");
    const target = path.join(root, name);
    // Open the name exactly once and decide everything through that handle, so
    // no check by path can be swapped before the read or write. A non-empty
    // file is never written: the same edit exported again returns it, anything
    // else under that name is left alone.
    let fd: number;
    try {
      fd = openSync(target, fsConstants.O_RDWR | fsConstants.O_CREAT | (fsConstants.O_NOFOLLOW ?? 0), 0o644);
    } catch {
      throw new ImageEditError("STORAGE_UNAVAILABLE", "The export could not be created.");
    }
    try {
      const existing = fstatSync(fd);
      if (!existing.isFile()) {
        throw new ImageEditError("EXPORT_EXISTS", "An export with this name already exists; it was not overwritten.");
      }
      if (existing.size > 0) {
        if (inRoot() && sha256(readFileSync(fd)) === digest) return target;
        throw new ImageEditError("EXPORT_EXISTS", "An export with this name already exists; it was not overwritten.");
      }
      let offset = 0;
      while (offset < bytes.length) offset += writeSync(fd, bytes, offset, bytes.length - offset);
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    // The parent could have been swapped while writing; never report a file
    // that landed outside the owned root.
    let landed = false;
    try {
      landed = inRoot() && realpathSync(target) === target;
    } catch {
      landed = false;
    }
    if (!landed) {
      try { unlinkSync(target); } catch { /* already gone */ }
      throw new ImageEditError("EXPORT_UNSAFE", "The exports folder changed during the export; nothing was kept.");
    }
    return target;
  };

  const issueAgentGrant = (request: AccessRequest): string => {
    const grantId = randomUUID();
    agentGrants.set(grantId, {
      identity: request.identity,
      callerId: request.callerId,
      runId: request.runId,
      expiresAt: now() + AGENT_GRANT_TTL_MS,
    });
    return grantId;
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
        const recipe = recipes.load(identity, uiAccess(grantId));
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
      const recipe = recipes.commit(grant.identity, uiAccess(input.grantId), input.action, input.expectedRevision);
      return { recipe, capabilities: imageEditCapabilities(recipe) };
    }),
    revision: (input) => guarded(() => {
      const grant = granted(input.grantId);
      return { revision: recipes.revision(grant.identity, uiAccess(input.grantId)) };
    }),
    close: (input) => {
      grants.delete(input.grantId);
      return { ok: true };
    },
    revokeSession: (sessionId) => {
      for (const [id, grant] of grants) if (grant.identity.studioSessionId === sessionId) grants.delete(id);
      for (const [id, grant] of agentGrants) if (grant.identity.studioSessionId === sessionId) dropGrant(id);
      for (const request of requests.values()) {
        if (request.identity.studioSessionId === sessionId && request.state !== "denied") {
          request.state = "denied";
          delete request.grantId;
        }
      }
    },

    requestAccess: (input) => guarded(() => {
      const callerId = requireName(input.callerId, "callerId");
      const agentRun = requireName(input.runId, "runId");
      if (callerId === UI_CALLER) throw new ImageEditError("FORBIDDEN", "That caller id is reserved.");
      if (!opts.askInbox) {
        throw new ImageEditError("APPROVAL_UNAVAILABLE", "No Ask inbox is available to approve image access.");
      }
      const { identity } = recipes.describe(input.sessionId, input.turnId);
      // A repeated request for the same image, caller and run is the same ask.
      const pending = [...requests.entries()].filter(([, r]) => r.state === "pending");
      const existing = pending.find(([, r]) => r.callerId === callerId && r.runId === agentRun && sameImage(r.identity, identity));
      if (existing) return { requestId: existing[0], state: "pending" as const };
      if (pending.length >= MAX_PENDING_REQUESTS
        || pending.filter(([, r]) => r.callerId === callerId).length >= MAX_PENDING_REQUESTS_PER_CALLER) {
        throw new ImageEditError("APPROVAL_UNAVAILABLE", "Too many image access requests are waiting for approval. Retry later.");
      }
      const decided = [...requests.entries()].filter(([, r]) => r.state !== "pending");
      for (const [id] of decided.slice(0, Math.max(0, decided.length - MAX_DECIDED_REQUESTS + 1))) requests.delete(id);
      const requestId = randomUUID();
      const request: AccessRequest = { callerId, runId: agentRun, identity, state: "pending" };
      requests.set(requestId, request);
      // Caller and run ids are whatever the requester sent; the request code lets
      // the user match this ask to the agent that is actually waiting for it.
      const code = requestId.slice(0, 8);
      void opts.askInbox.parkAndWait({
        toolName: "image_edit_access",
        summary: `Allow "${callerId}" (run ${agentRun}) to edit an Image Studio image. Request code ${code}`,
        detail: `Request code ${code}: approve only if the agent you are running shows this code. `
          + "The caller and run names are reported by the requester and are not verified. "
          + `Session ${identity.studioSessionId}, turn ${identity.studioTurnId}, source sha256 ${identity.sourceSha256}. `
          + "For one hour the agent may change adjustments and marks, undo and redo (including undoing your own edits, "
          + "which a new edit then replaces), and export a copy. The original image is never changed.",
        args: { sessionId: identity.studioSessionId, turnId: identity.studioTurnId, callerId, runId: agentRun },
        runMode: "headless",
        runId: agentRun,
        sessionId: identity.studioSessionId,
        ttlMs: AGENT_GRANT_TTL_MS,
      }).then(
        (decision) => {
          if (request.state !== "pending") return;
          request.state = decision;
          if (decision === "approved") request.grantId = issueAgentGrant(request);
        },
        () => {
          if (request.state === "pending") request.state = "denied";
        },
      );
      return { requestId, state: "pending" as const };
    }),
    accessStatus: (input) => guarded(() => {
      const request = requests.get(input.requestId);
      if (!request || request.callerId !== input.callerId || request.runId !== input.runId) {
        throw new ImageEditError("FORBIDDEN", "No access request matches this caller and run.");
      }
      const grant = request.grantId ? agentGrants.get(request.grantId) : undefined;
      if (request.state === "approved" && (!grant || grant.expiresAt <= now())) {
        return { state: "expired" as const };
      }
      return grant
        ? { state: request.state, grantId: request.grantId!, expiresAt: grant.expiresAt }
        : { state: request.state };
    }),
    describe: (access) => guarded(() => {
      const grant = agentGranted(access);
      return stateOf(grant, recipes.load(grant.identity, access));
    }),
    apply: (access, input) => guarded(() => {
      const grant = agentGranted(access);
      const key = typeof input.idempotencyKey === "string" && AGENT_NAME.test(input.idempotencyKey)
        ? input.idempotencyKey
        : null;
      if (!key) throw new ImageEditError("INVALID_RECIPE", "idempotencyKey must be 1-128 letters, digits, '.', '_', ':' or '-'.");
      // Validate before hashing: an invalid or deeply nested action never reaches canonical().
      const action = parseImageEditAction(input.action);
      const cacheKey = `${input.expectedRevision}\n${key}`;
      const hash = sha256(canonical(action));
      let cache = replay.get(access.grantId);
      if (!cache) {
        cache = new Map();
        replay.set(access.grantId, cache);
      }
      const seen = cache.get(cacheKey);
      if (seen) {
        if (seen.hash !== hash) {
          throw new ImageEditError("IDEMPOTENCY_CONFLICT", "This idempotency key was already used for a different command.");
        }
        return seen.result;
      }
      const recipe = recipes.commit(grant.identity, access, action, input.expectedRevision);
      const result = stateOf(grant, recipe);
      cache.set(cacheKey, { hash, result });
      while (cache.size > REPLAY_CACHE_LIMIT) cache.delete(cache.keys().next().value!);
      return result;
    }),
    render: async (access, input) => {
      let claimed = false;
      try {
        const grant = agentGranted(access);
        if (!opts.renderBridge) throw new ImageEditError("RENDERER_UNAVAILABLE", "No desktop renderer is attached.");
        if (input.mode !== "preview" && input.mode !== "export") {
          throw new ImageEditError("INVALID_RECIPE", "mode must be preview or export.");
        }
        // One render at a time per grant; each pending render holds a source copy.
        if (rendering.has(access.grantId)) {
          throw new ImageEditError("RENDERER_UNAVAILABLE", "A render for this grant is still running. Wait for it to finish.");
        }
        rendering.add(access.grantId);
        claimed = true;
        // Pin the recipe revision and an immutable, hashed source snapshot.
        const recipe = recipes.load(grant.identity, access);
        if (recipe.revision !== input.expectedRevision) {
          throw new ImageEditError("REVISION_CONFLICT", "The image was changed by another editor. Describe it again.");
        }
        const source = recipes.readSource(grant.identity, access);
        const state = deriveImageEditState(recipe);
        const png = await opts.renderBridge.render({
          revision: recipe.revision,
          sourceSha256: source.sha256,
          width: source.width,
          height: source.height,
          adjustments: state.adjustments,
          marks: state.marks,
          png: source.bytes.toString("base64"),
        });
        const digest = sha256(png);
        if (input.mode === "preview") {
          return { revision: recipe.revision, sha256: digest, bytes: png.length, png: png.toString("base64") };
        }
        // Refuse an export whose recipe or source changed while it rendered.
        agentGranted(access);
        if (recipes.revision(grant.identity, access) !== recipe.revision
          || recipes.readSource(grant.identity, access).sha256 !== source.sha256) {
          throw new ImageEditError("REVISION_CONFLICT", "The image changed during the export; nothing was written.");
        }
        // Session and turn are hashed into the name, so distinct images never collide.
        const owner = sha256(`${grant.identity.studioSessionId}\n${grant.identity.studioTurnId}`).slice(0, 16);
        const written = writeExport(png, `${owner}-r${recipe.revision}-${digest.slice(0, 12)}.png`, digest);
        return { revision: recipe.revision, sha256: digest, bytes: png.length, path: written };
      } catch (error) {
        throw imageEditFailure(error);
      } finally {
        if (claimed) rendering.delete(access.grantId);
      }
    },
    release: (access) => {
      const grant = agentGrants.get(access?.grantId);
      if (grant && grant.callerId === access.callerId && grant.runId === access.runId) dropGrant(access.grantId);
      return { ok: true };
    },
  };
}
