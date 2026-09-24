import { EventEmitter } from "node:events";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createJsonCliRoute } from "../../../desktop/sidecar/src/controlSurface/jsonCliRoutes.js";
import type { CodingSessionManager } from "../../../desktop/sidecar/src/coding/sessionManager.js";

const ROOT = path.join(os.tmpdir(), "nexus-obs-repo");
const OUTSIDE = path.join(os.tmpdir(), "nexus-obs-secret", "prompt.txt");

function sessions(): CodingSessionManager {
  return {
    list: () => ({
      sessions: [
        {
          sessionId: "sess-1",
          modelId: "gemma4:e4b",
          family: "gemma",
          title: "agent",
          createdAt: "2026-09-24T00:00:00.000Z",
          messageCount: 1,
          workspaceRoots: [ROOT],
          primaryRoot: ROOT,
        },
      ],
    }),
  } as unknown as CodingSessionManager;
}

function ctx(method: string, path: string, body = "") {
  const req = new EventEmitter() as EventEmitter & {
    headers: Record<string, string>;
    destroy: () => void;
  };
  req.headers = {};
  req.destroy = () => undefined;
  queueMicrotask(() => {
    if (body) req.emit("data", Buffer.from(body));
    req.emit("end");
  });
  const written: { status: number; body: unknown }[] = [];
  return {
    written,
    ctx: {
      req,
      res: {},
      method,
      path,
      token: "tok",
      writer: { json: (status: number, payload: unknown) => written.push({ status, body: payload }) },
      signal: new AbortController().signal,
      maxBodyBytes: 1_000_000,
      limiter: {},
    },
  };
}

describe("observation routes", () => {
  it("returns one context snapshot", async () => {
    const route = createJsonCliRoute({ sessions: sessions() });
    const { ctx: context, written } = ctx("GET", "/nexus/context");
    await route(context as never);
    expect(written[0]?.status).toBe(200);
    expect(written[0]?.body).toMatchObject({
      sessionId: "sess-1",
      title: "agent",
      primaryRoot: ROOT,
      modelId: "gemma4:e4b",
      generationInFlight: false,
    });
  });

  it("bounds logs and redacts a token and an outside path", async () => {
    const route = createJsonCliRoute({
      sessions: sessions(),
      redactLiterals: ["super-secret-token"],
      readLogs: () => [
        { ts: "t0", level: "info", message: "keep" },
        { ts: "t1", level: "info", message: "token super-secret-token" },
        { ts: "t2", level: "info", message: `path ${OUTSIDE}` },
        { ts: "t3", level: "info", message: `inside ${path.join(ROOT, "out.png")}` },
      ],
    });
    const { ctx: context, written } = ctx("GET", "/nexus/logs?lines=4");
    await route(context as never);
    const lines = (written[0]?.body as { lines: { message: string }[] }).lines;
    expect(lines).toHaveLength(4);
    expect(lines[1]?.message).toContain("<redacted>");
    expect(lines[1]?.message).not.toContain("super-secret-token");
    expect(lines[2]?.message).toContain("<redacted-path>");
    expect(lines[3]?.message).toContain("out.png");
    expect(JSON.stringify(written[0]?.body)).not.toContain("prompt.txt");
  });

  it("rejects a bad --lines value", async () => {
    const route = createJsonCliRoute({ sessions: sessions() });
    const { ctx: context, written } = ctx("GET", "/nexus/logs?lines=-1");
    await route(context as never);
    expect(written[0]?.status).toBe(400);
  });

  it("refuses an outside media path without reading it", async () => {
    let opened = 0;
    const route = createJsonCliRoute({
      sessions: sessions(),
      statMedia: () => {
        opened += 1;
        return { exists: true };
      },
      inspectMedia: async () => {
        opened += 1;
        return { duration: null, width: 1, height: 1, streams: [] };
      },
    });
    const { ctx: context, written } = ctx(
      "POST",
      "/nexus/media/inspect",
      JSON.stringify({ path: OUTSIDE }),
    );
    await route(context as never);
    expect(written[0]?.status).toBe(403);
    expect(opened).toBe(0);
    expect(JSON.stringify(written[0]?.body)).not.toContain("PNG");
  });

  it("inspects an in-root file and reports missing, unreadable, and unprovisioned cases", async () => {
    const route = createJsonCliRoute({
      sessions: sessions(),
      statMedia: (filePath) => {
        if (filePath.endsWith("missing.png")) return { exists: false };
        if (filePath.endsWith("partial.png")) return { exists: true, incomplete: true };
        return { exists: true };
      },
      inspectMedia: async (filePath) => {
        if (filePath.endsWith("bad.png")) throw new Error("unreadable format");
        return { duration: 1.5, width: 640, height: 360, streams: [{ kind: "video" }] };
      },
    });
    const ok = ctx("POST", "/nexus/media/inspect", JSON.stringify({ path: path.join(ROOT, "clip.mp4") }));
    await route(ok.ctx as never);
    expect(ok.written[0]?.status).toBe(200);
    expect(ok.written[0]?.body).toMatchObject({ width: 640, height: 360 });

    const missing = ctx("POST", "/nexus/media/inspect", JSON.stringify({ path: path.join(ROOT, "missing.png") }));
    await route(missing.ctx as never);
    expect(missing.written[0]?.status).toBe(404);

    const bad = ctx("POST", "/nexus/media/inspect", JSON.stringify({ path: path.join(ROOT, "bad.png") }));
    await route(bad.ctx as never);
    expect(bad.written[0]?.status).toBe(415);

    const partial = ctx("POST", "/nexus/media/inspect", JSON.stringify({ path: path.join(ROOT, "partial.png") }));
    await route(partial.ctx as never);
    expect(partial.written[0]?.body).toMatchObject({ incomplete: true, width: null });

    const bare = createJsonCliRoute({ sessions: sessions(), statMedia: () => ({ exists: true }) });
    const down = ctx("POST", "/nexus/media/inspect", JSON.stringify({ path: path.join(ROOT, "clip.mp4") }));
    await bare(down.ctx as never);
    expect(down.written[0]?.status).toBe(503);
  });
});
