import { afterEach, describe, expect, it } from "vitest";

import { LoopbackHttpServer } from "../sidecar/src/controlSurface/loopbackServer";
import { createJsonCliRoute, WindowCaptureError } from "../sidecar/src/controlSurface/jsonCliRoutes";
import { assertLoopbackCaptureUrl } from "../sidecar/src/controlSurface/windowCaptureClient";
import { CodingSessionManager } from "../sidecar/src/coding/sessionManager";
import { createStudioRuntime } from "../sidecar/src/generations/studioRuntime";

describe("JSON CLI loopback routes", () => {
  const started: LoopbackHttpServer[] = [];

  afterEach(async () => {
    while (started.length > 0) {
      await started.pop()?.stop();
    }
  });

  it("drives a scripted coding session with bearer auth", async () => {
    const sessions = new CodingSessionManager({
      now: () => new Date("2026-08-20T12:00:00Z"),
      idFactory: () => "sess-cli",
    });
    const studio = createStudioRuntime({ dbPath: ":memory:" });
    const server = new LoopbackHttpServer({ log: () => {} });
    server.mount(createJsonCliRoute({ sessions, studio }));
    started.push(server);
    await server.start({ host: "127.0.0.1", port: 0, token: "secret", listen: true });
    const base = `http://127.0.0.1:${server.boundPort}`;
    const headers = {
      authorization: "Bearer secret",
      "content-type": "application/json",
    };

    const created = await fetch(`${base}/nexus/session/new`, {
      method: "POST",
      headers,
      body: JSON.stringify({ modelId: "gemma4:e4b" }),
    });
    expect(created.status).toBe(200);
    const startedBody = (await created.json()) as { sessionId: string };
    expect(startedBody.sessionId).toBe("sess-cli");

    const sent = await fetch(`${base}/nexus/session/send`, {
      method: "POST",
      headers,
      body: JSON.stringify({ sessionId: "sess-cli", text: "hello" }),
    });
    expect(sent.status).toBe(200);
    const sentBody = (await sent.json()) as { events: { kind: string }[] };
    expect(sentBody.events.some((e) => e.kind === "done")).toBe(true);

    const listed = await fetch(`${base}/nexus/session/list`, { headers });
    expect(listed.status).toBe(200);
    const listBody = (await listed.json()) as { sessions: { sessionId: string }[] };
    expect(listBody.sessions).toHaveLength(1);

    const models = await fetch(`${base}/nexus/models`, { headers });
    expect(models.status).toBe(200);
    const modelBody = (await models.json()) as { models: { id: string }[] };
    expect(modelBody.models.some((m) => m.id === "gemma4:e4b")).toBe(true);

    const queued = await fetch(`${base}/nexus/generate/queue`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        pillar: "image",
        jobType: "txt2img",
        parameters: { prompt: "fox" },
      }),
    });
    expect(queued.status).toBe(200);
  });

  it("rejects a wrong token before the JSON CLI handler runs", async () => {
    const server = new LoopbackHttpServer({ log: () => {} });
    server.mount(createJsonCliRoute({ sessions: new CodingSessionManager() }));
    started.push(server);
    await server.start({ host: "127.0.0.1", port: 0, token: "secret", listen: true });
    const res = await fetch(`http://127.0.0.1:${server.boundPort}/nexus/session/list`, {
      headers: { authorization: "Bearer wrong" },
    });
    expect(res.status).toBe(401);
  });

  it("returns a Nexus-window PNG and refuses any other route", async () => {
    const png =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const seen: { kind: string; route: string | null }[] = [];
    const server = new LoopbackHttpServer({ log: () => {} });
    server.mount(
      createJsonCliRoute({
        sessions: new CodingSessionManager(),
        captureWindow: async (request) => {
          seen.push(request);
          return {
            scope: "nexus-window",
            route: request.route,
            width: 1,
            height: 1,
            mediaType: "image/png",
            pngBase64: png,
          };
        },
      }),
    );
    started.push(server);
    await server.start({ host: "127.0.0.1", port: 0, token: "secret", listen: true });
    const base = `http://127.0.0.1:${server.boundPort}`;
    const headers = { authorization: "Bearer secret", "content-type": "application/json" };

    const shot = await fetch(`${base}/nexus/screenshot`, { headers });
    expect(shot.status).toBe(200);
    const shotBody = (await shot.json()) as { scope: string; route: string | null; pngBase64: string };
    expect(shotBody.scope).toBe("nexus-window");
    expect(shotBody.route).toBeNull();
    expect(shotBody.pngBase64).toBe(png);

    const captured = await fetch(`${base}/nexus/capture`, {
      method: "POST",
      headers,
      body: JSON.stringify({ route: "/coding" }),
    });
    expect(captured.status).toBe(200);
    expect(seen.map((item) => item.route)).toEqual([null, "/coding"]);

    const refused = await fetch(`${base}/nexus/capture`, {
      method: "POST",
      headers,
      body: JSON.stringify({ route: "C:/Windows/win.ini" }),
    });
    expect(refused.status).toBe(400);
    const refusedBody = (await refused.json()) as { error: { code: string } };
    expect(refusedBody.error.code).toBe("schema");
  });

  it("reports window capture unavailable when the shell is not attached", async () => {
    const server = new LoopbackHttpServer({ log: () => {} });
    server.mount(createJsonCliRoute({ sessions: new CodingSessionManager() }));
    started.push(server);
    await server.start({ host: "127.0.0.1", port: 0, token: "secret", listen: true });
    const res = await fetch(`http://127.0.0.1:${server.boundPort}/nexus/screenshot`, {
      headers: { authorization: "Bearer secret" },
    });
    expect(res.status).toBe(503);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("unavailable");
  });

  it("refuses a capture URL that is not loopback", () => {
    expect(() => assertLoopbackCaptureUrl("http://example.com/capture")).toThrow(WindowCaptureError);
    expect(assertLoopbackCaptureUrl("http://127.0.0.1:9/capture").hostname).toBe("127.0.0.1");
  });
});
