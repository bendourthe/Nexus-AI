/**
 * v2.13.0 Phase 6 -- `/nexus/image-edit/*` on the authenticated control
 * surface (docs/releases/v2/v2.13/development/image-command-contract.md).
 *
 * The app token (checked before any route) only reaches these handlers. Each
 * image is reachable only with the grant a human approved for that caller and
 * run; the token alone, or another caller's grant, gets `FORBIDDEN`.
 */

import type { ControlSurfaceContext } from "./loopbackServer.js";
import { parseJsonBody, readLimitedBody } from "../serving/guard.js";
import type { AgentAccess, ImageEditOps } from "../studio/imageEditRuntime.js";

export const IMAGE_EDIT_ROUTE = "image-edit";

const STATUS: Readonly<Record<string, number>> = {
  FORBIDDEN: 403,
  IMAGE_NOT_FOUND: 404,
  REVISION_CONFLICT: 409,
  IDEMPOTENCY_CONFLICT: 409,
  SOURCE_CHANGED: 409,
  EXPORT_EXISTS: 409,
  INVALID_RECIPE: 422,
  LIMIT_EXCEEDED: 422,
  NO_UNDO: 422,
  NO_REDO: 422,
  UNSUPPORTED_SOURCE: 415,
  EXPORT_UNSAFE: 500,
  RENDER_FAILED: 502,
  STORAGE_UNAVAILABLE: 503,
  APPROVAL_UNAVAILABLE: 503,
  RENDERER_UNAVAILABLE: 503,
};

function text(body: Record<string, unknown>, field: string): string {
  const value = body[field];
  return typeof value === "string" ? value : "";
}

function access(body: Record<string, unknown>): AgentAccess {
  return { callerId: text(body, "callerId"), runId: text(body, "runId"), grantId: text(body, "grantId") };
}

/** Handles `${prefix}/image-edit/*`; returns false for any other path. */
export async function handleImageEditRoute(
  ops: (() => Promise<ImageEditOps>) | undefined,
  ctx: ControlSurfaceContext,
  path: string,
  prefix: string,
  write: (status: number, body: unknown) => boolean,
): Promise<boolean> {
  const base = `${prefix}/${IMAGE_EDIT_ROUTE}`;
  if (!path.startsWith(`${base}/`)) return false;
  if (ctx.method !== "POST") {
    return write(405, { error: { code: "method", message: "image-edit routes accept POST only" } });
  }
  if (!ops) {
    return write(503, { error: { code: "unavailable", message: "image editing is not available in this sidecar" } });
  }
  const body = parseJsonBody(await readLimitedBody(ctx.req, ctx.maxBodyBytes)) as Record<string, unknown>;
  const missing = (fields: readonly string[]): boolean => {
    const absent = fields.filter((field) => !text(body, field));
    if (absent.length === 0) return false;
    write(400, { error: { code: "schema", message: `missing fields: ${absent.join(", ")}` } });
    return true;
  };
  const revision = (): number | null => {
    const value = body.expectedRevision;
    return Number.isSafeInteger(value) && (value as number) >= 0 ? (value as number) : null;
  };
  const grantFields = ["callerId", "runId", "grantId"] as const;
  try {
    const edit = await ops();
    switch (path.slice(base.length + 1)) {
      case "access":
        if (missing(["callerId", "runId", "sessionId", "turnId"])) return true;
        return write(202, edit.requestAccess({
          callerId: text(body, "callerId"),
          runId: text(body, "runId"),
          sessionId: text(body, "sessionId"),
          turnId: text(body, "turnId"),
        }));
      case "access/status":
        if (missing(["requestId", "callerId", "runId"])) return true;
        return write(200, edit.accessStatus({
          requestId: text(body, "requestId"),
          callerId: text(body, "callerId"),
          runId: text(body, "runId"),
        }));
      case "describe":
        if (missing(grantFields)) return true;
        return write(200, edit.describe(access(body)));
      case "apply": {
        if (missing([...grantFields, "idempotencyKey"])) return true;
        const expected = revision();
        if (expected === null || body.action === undefined) {
          return write(400, { error: { code: "schema", message: "missing fields: action, expectedRevision" } });
        }
        return write(200, edit.apply(access(body), {
          action: body.action,
          expectedRevision: expected,
          idempotencyKey: text(body, "idempotencyKey"),
        }));
      }
      case "render": {
        if (missing([...grantFields, "mode"])) return true;
        const expected = revision();
        if (expected === null) return write(400, { error: { code: "schema", message: "missing fields: expectedRevision" } });
        const mode = text(body, "mode");
        if (mode !== "preview" && mode !== "export") {
          return write(400, { error: { code: "schema", message: "mode must be preview or export" } });
        }
        return write(200, await edit.render(access(body), { mode, expectedRevision: expected }));
      }
      case "release":
        if (missing(grantFields)) return true;
        return write(200, edit.release(access(body)));
      default:
        return write(404, { error: { code: "unknown_route", message: `No image-edit route for ${path}` } });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const match = /^([A-Z_]+): ([\s\S]*)$/.exec(message);
    if (match && STATUS[match[1]!] !== undefined) {
      return write(STATUS[match[1]!]!, { error: { code: match[1], message: match[2] } });
    }
    return write(400, { error: { code: "sidecar", message } });
  }
}
