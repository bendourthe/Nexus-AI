/**
 * v2.1.0 Phase 6 -- JSON CLI routes on the shared loopback control surface.
 *
 * Sibling of ACP (`POST /acp`) and serving (`/v1/*`). Never mounted under
 * `/v1` because ServingGateway 404s unknown OpenAI paths.
 */

import { JSON_CLI_PREFIX } from "../../../../core/cli/jsonCli.js";
import { CONTROL_SURFACE_JSON_CLI_PREFIX } from "./contract.js";
import {
  parseJsonBody,
  readLimitedBody,
  type ControlSurfaceContext,
  type ControlSurfaceRoute,
} from "./loopbackServer.js";
import type { CodingSessionManager } from "../coding/sessionManager.js";
import { SIDECAR_MODELS } from "../coding/models.js";
import type { StudioRuntime } from "../generations/studioRuntime.js";
import { createWorkspaceScope } from "../../../../core/project/WorkspaceScope.js";
import { WorkspaceScopeStore } from "../../../../core/project/WorkspaceScopeStore.js";
import { redactSecrets } from "../../../../core/observability/redactSecrets.js";
import * as nodePath from "node:path";

export interface ObservationLogRecord {
  readonly ts: string;
  readonly level: string;
  readonly message: string;
}

export interface MediaInspectResult {
  readonly duration: number | null;
  readonly width: number | null;
  readonly height: number | null;
  readonly streams: readonly { codec?: string; kind?: string }[];
  readonly incomplete?: boolean;
  readonly runtime?: string;
}

export interface JsonCliRouteDeps {
  readonly sessions: CodingSessionManager;
  readonly studio?: StudioRuntime;
  readonly listModels?: () => Promise<readonly { id: string; displayName?: string }[]>;
  readonly workspaceStore?: WorkspaceScopeStore;
  readonly readLogs?: () => readonly ObservationLogRecord[];
  readonly inspectMedia?: (filePath: string) => Promise<MediaInspectResult>;
  readonly statMedia?: (filePath: string) => { exists: boolean; incomplete?: boolean };
  /** Extra literal secrets (loopback tokens) to scrub from log lines. */
  readonly redactLiterals?: readonly string[];
}

function queryId(path: string): string | null {
  const q = path.split("?")[1];
  if (!q) return null;
  const params = new URLSearchParams(q);
  const id = params.get("id");
  return id && id.length > 0 ? id : null;
}

function pathOnly(path: string): string {
  return path.split("?")[0] ?? path;
}

export function createJsonCliRoute(deps: JsonCliRouteDeps): ControlSurfaceRoute {
  const prefix = CONTROL_SURFACE_JSON_CLI_PREFIX;
  return async (ctx: ControlSurfaceContext): Promise<boolean> => {
    const path = pathOnly(ctx.path);
    if (!path.startsWith(prefix) && !path.startsWith(JSON_CLI_PREFIX)) return false;

    const write = (status: number, body: unknown): boolean => {
      ctx.writer.json(status, body);
      return true;
    };

    try {
      if (ctx.method === "POST" && path === `${prefix}/session/new`) {
        const raw = await readLimitedBody(ctx.req, ctx.maxBodyBytes);
        const body = parseJsonBody(raw) as Record<string, unknown>;
        const modelId = typeof body.modelId === "string" ? body.modelId : "";
        if (!modelId) return write(400, { error: { code: "schema", message: "missing fields: modelId" } });
        const request = {
          modelId,
          title: typeof body.title === "string" ? body.title : undefined,
          workspacePath: typeof body.workspacePath === "string" ? body.workspacePath : undefined,
          workspaceId: typeof body.workspaceId === "string" ? body.workspaceId : undefined,
          workspaceRoots: Array.isArray(body.workspaceRoots)
            ? body.workspaceRoots.filter((root): root is string => typeof root === "string")
            : undefined,
          primaryRoot: typeof body.primaryRoot === "string" ? body.primaryRoot : undefined,
        };
        const store = deps.workspaceStore ?? new WorkspaceScopeStore();
        const previous = request.workspaceId ? store.get(request.workspaceId) : undefined;
        const scope = await createWorkspaceScope(request, { previous });
        const started = deps.sessions.startWithScope(request, store.upsert(scope));
        return write(200, started);
      }

      if (ctx.method === "POST" && path === `${prefix}/session/send`) {
        const raw = await readLimitedBody(ctx.req, ctx.maxBodyBytes);
        const body = parseJsonBody(raw) as Record<string, unknown>;
        const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
        const text = typeof body.text === "string" ? body.text : "";
        if (!sessionId || !text) {
          return write(400, { error: { code: "schema", message: "missing fields: sessionId, text" } });
        }
        const events = await deps.sessions.sendMessage(sessionId, text);
        return write(200, { sessionId, events });
      }

      if (ctx.method === "GET" && path === `${prefix}/session/list`) {
        return write(200, deps.sessions.list());
      }

      if (ctx.method === "GET" && path === `${prefix}/models`) {
        const models = deps.listModels
          ? await deps.listModels()
          : SIDECAR_MODELS.map((m) => ({ id: m.id, displayName: m.displayName }));
        return write(200, { models });
      }

      if (ctx.method === "POST" && path === `${prefix}/generate/queue`) {
        if (!deps.studio) {
          return write(503, { error: { code: "unavailable", message: "generation queue is not available" } });
        }
        const raw = await readLimitedBody(ctx.req, ctx.maxBodyBytes);
        const body = parseJsonBody(raw) as Record<string, unknown>;
        const pillar = body.pillar === "video" ? "video" : body.pillar === "image" ? "image" : null;
        const jobType = typeof body.jobType === "string" ? body.jobType : "";
        const parameters =
          body.parameters && typeof body.parameters === "object" && !Array.isArray(body.parameters)
            ? (body.parameters as Record<string, unknown>)
            : null;
        if (!pillar || !jobType || !parameters) {
          return write(400, {
            error: { code: "schema", message: "missing fields: pillar, jobType, parameters" },
          });
        }
        const job = deps.studio.queue.enqueue({
          id: typeof body.id === "string" ? body.id : `cli-${Date.now().toString(36)}`,
          pillar,
          jobType,
          parameters,
          priority: "batch",
          threadId: typeof body.threadId === "string" ? body.threadId : undefined,
        });
        return write(200, { jobs: [job] });
      }

      if (ctx.method === "GET" && path === `${prefix}/context`) {
        return write(200, snapshotContext(deps));
      }

      if (ctx.method === "GET" && pathOnly(ctx.path) === `${prefix}/logs`) {
        const lines = queryLines(ctx.path);
        if (lines === "invalid") {
          return write(400, { error: { code: "schema", message: "--lines must be a positive integer" } });
        }
        const records = (deps.readLogs?.() ?? []).slice(-lines);
        const roots = authorizedRoots(deps);
        return write(200, {
          lines: records.map((record) => redactLogRecord(record, roots, deps.redactLiterals ?? [])),
        });
      }

      if (ctx.method === "POST" && path === `${prefix}/media/inspect`) {
        const raw = await readLimitedBody(ctx.req, ctx.maxBodyBytes);
        const body = parseJsonBody(raw) as Record<string, unknown>;
        const requested = typeof body.path === "string" ? body.path : "";
        if (!requested) return write(400, { error: { code: "schema", message: "missing fields: path" } });
        const absolute = nodePath.resolve(requested);
        if (!pathIsAuthorized(absolute, authorizedRoots(deps))) {
          return write(403, { error: { code: "forbidden", message: `path is outside authorized workspace roots: ${absolute}` } });
        }
        const stat = deps.statMedia?.(absolute) ?? { exists: true };
        if (!stat.exists) {
          return write(404, { error: { code: "not_found", message: `not found: ${absolute}` } });
        }
        if (stat.incomplete) {
          return write(200, { path: absolute, incomplete: true, duration: null, width: null, height: null, streams: [] });
        }
        if (!deps.inspectMedia) {
          return write(503, { error: { code: "runtime", message: "media runtime is not provisioned" } });
        }
        try {
          const facts = await deps.inspectMedia(absolute);
          return write(200, { path: absolute, ...facts });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          const unreadable = /unreadable|format/i.test(message);
          return write(unreadable ? 415 : 503, {
            error: { code: unreadable ? "unreadable" : "runtime", message },
          });
        }
      }

      if (ctx.method === "GET" && pathOnly(ctx.path) === `${prefix}/generate/status`) {
        if (!deps.studio) {
          return write(503, { error: { code: "unavailable", message: "generation queue is not available" } });
        }
        const id = queryId(ctx.path);
        if (!id) return write(400, { error: { code: "schema", message: "missing fields: id" } });
        const job = deps.studio.queue.get(id);
        return write(200, { job: job ?? null });
      }

      return write(404, { error: { code: "unknown_route", message: `No JSON CLI route for ${ctx.method} ${path}` } });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return write(400, { error: { code: "sidecar", message } });
    }
  };
}

const DEFAULT_LOG_LINES = 100;
const MAX_LOG_LINES = 500;

function queryLines(requestPath: string): number | "invalid" {
  const raw = new URLSearchParams(requestPath.split("?")[1] ?? "").get("lines");
  if (raw === null || raw === "") return DEFAULT_LOG_LINES;
  if (!/^[0-9]+$/.test(raw)) return "invalid";
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return "invalid";
  return Math.min(n, MAX_LOG_LINES);
}

function authorizedRoots(deps: JsonCliRouteDeps): string[] {
  const roots = new Set<string>();
  for (const session of deps.sessions.list().sessions) {
    for (const root of session.workspaceRoots ?? []) roots.add(root);
  }
  for (const scope of deps.workspaceStore?.list() ?? []) {
    for (const root of scope.workspaceRoots) roots.add(root);
    if (scope.primaryRoot) roots.add(scope.primaryRoot);
  }
  return [...roots];
}

function pathIsAuthorized(absolute: string, roots: readonly string[]): boolean {
  const target = nodePath.resolve(absolute);
  return roots.some((root) => {
    const base = nodePath.resolve(root);
    const rel = nodePath.relative(base, target);
    return rel === "" || (!rel.startsWith("..") && !nodePath.isAbsolute(rel));
  });
}

function snapshotContext(deps: JsonCliRouteDeps) {
  const sessions = deps.sessions.list().sessions;
  const active = sessions.length > 0 ? sessions[sessions.length - 1] : undefined;
  const queue = deps.studio?.queue as { list?: () => readonly { status?: string }[] } | undefined;
  const jobs = queue?.list?.() ?? [];
  const generationInFlight = jobs.some((job) => job.status === "queued" || job.status === "running");
  return {
    sessionId: active?.sessionId ?? null,
    title: active?.title ?? null,
    workspaceRoots: [...(active?.workspaceRoots ?? [])],
    primaryRoot: active?.primaryRoot ?? null,
    modelId: active?.modelId ?? null,
    generationInFlight,
  };
}

function redactLogRecord(
  record: ObservationLogRecord,
  roots: readonly string[],
  literals: readonly string[],
): ObservationLogRecord {
  let message = redactSecrets(record.message);
  for (const literal of literals) {
    if (literal) message = message.split(literal).join("<redacted>");
  }
  message = message.replace(/[A-Za-z]:\\[^\s"']+|\/(?:[^\s"']+\/)+[^\s"']+/g, (found) => {
    const normalized = found.replace(/[\\/]+$/, "");
    return pathIsAuthorized(normalized, roots) ? found : "<redacted-path>";
  });
  if (message.length > 240) message = `${message.slice(0, 240)}...`;
  return { ts: record.ts, level: record.level, message };
}
