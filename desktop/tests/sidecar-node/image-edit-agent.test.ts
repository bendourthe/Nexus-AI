// @vitest-environment node
/**
 * v2.13.0 Phase 6 -- agent image-edit commands over a real sessions.db, real
 * PNG files, the real render bridge and the real authenticated loopback route.
 * The renderer side is simulated by claiming requests from the bridge; pixel
 * equality with the viewer is proven in the WebView check.
 */

import { afterEach, describe, expect, it } from "vitest";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { StudioSessionStore } from "../../../core/generations/StudioSessionStore.js";
import { CodingSessionManager } from "../../sidecar/src/coding/sessionManager";
import { createJsonCliRoute } from "../../sidecar/src/controlSurface/jsonCliRoutes";
import { LoopbackHttpServer } from "../../sidecar/src/controlSurface/loopbackServer";
import { persistGeneratedPng } from "../../sidecar/src/studio/generatedImages.js";
import { AGENT_GRANT_TTL_MS, createImageEditOps, imageEditFailure, type AgentAccess } from "../../sidecar/src/studio/imageEditRuntime.js";
import { ImageRenderBridge, isWellFormedPng } from "../../sidecar/src/studio/imageRenderBridge.js";
import type { TrustedApprovalPreparation } from "../../../modules/coding/autonomy/AskInbox.js";

const PNG_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGP4DwQACfsD/fteaysAAAAASUVORK5CYII=";
const ADJUST = { kind: "adjustments", values: { brightness: 140, contrast: 100, saturation: 100, sharpness: 0 } };
const sha = (bytes: Buffer): string => createHash("sha256").update(bytes).digest("hex");

const roots: string[] = [];
const stores: StudioSessionStore[] = [];
const servers: LoopbackHttpServer[] = [];

afterEach(async () => {
  while (servers.length) await servers.pop()?.stop();
  for (const store of stores.splice(0)) { try { store.close(); } catch { /* closed */ } }
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

/** A stand-in for the Ask inbox: each request waits for the test's decision. */
function inbox() {
  const asks: { input: { summary: string; args?: Record<string, unknown> }; decide: (d: "approved" | "denied" | "expired") => void }[] = [];
  return {
    asks,
    parkAndWait: (input: { summary: string; args?: Readonly<Record<string, unknown>> }, prepare?: TrustedApprovalPreparation) =>
      new Promise<"approved" | "denied" | "expired">((resolve) => {
        asks.push({ input: input as never, decide: (decision) => {
          if (decision !== "approved") { resolve(decision); return; }
          const prepared = prepare?.(randomUUID(), randomUUID());
          resolve(prepared?.isValid() ? "approved" : "denied");
        } });
      }),
  };
}

function fixture(options: { deadlineMs?: number; now?: () => number } = {}) {
  const root = mkdtempSync(join(tmpdir(), "nexus-image-agent-"));
  roots.push(root);
  const media = join(root, "images");
  const saved = persistGeneratedPng(PNG_B64, media)!;
  const store = new StudioSessionStore(join(root, "sessions.db"));
  stores.push(store);
  const session = store.createSession({ pillar: "image", folderId: null, title: "Agent", modelId: "fixture" });
  const turn = store.appendTurn({ sessionId: session.id, role: "assistant", content: "", mediaRef: saved.outputPath });
  const askInbox = inbox();
  const bridge = new ImageRenderBridge(options.deadlineMs ?? 2000);
  const exportsRoot = join(root, "exports");
  const ops = createImageEditOps(store, {
    mediaRoot: media, exportsRoot, askInbox, renderBridge: bridge, ...(options.now ? { now: options.now } : {}),
  });
  return { root, media, saved, store, session, turn, askInbox, bridge, exportsRoot, ops };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

async function grantFor(f: ReturnType<typeof fixture>, callerId = "agent-a", runId = "run-1"): Promise<AgentAccess> {
  const { requestId } = f.ops.requestAccess({ callerId, runId, sessionId: f.session.id, turnId: f.turn.id });
  f.askInbox.asks.at(-1)!.decide("approved");
  await flush();
  const status = f.ops.accessStatus({ requestId, callerId, runId });
  expect(status.state).toBe("approved");
  return { callerId, runId, grantId: status.grantId! };
}

/** Plays the desktop renderer: claims each request and answers with `answer`. */
function renderer(bridge: ImageRenderBridge, answer: (request: { width: number; height: number; png: string }) => object) {
  const seen: { sourceSha256: string; revision: number }[] = [];
  const timer = setInterval(() => {
    const request = bridge.claim();
    if (!request) return;
    seen.push({ sourceSha256: request.sourceSha256, revision: request.revision });
    bridge.complete({ requestId: request.requestId, ...answer(request) } as never);
  }, 5);
  return { seen, stop: () => clearInterval(timer) };
}

describe("agent access", () => {
  it("issues a grant only after a human approves the request in the Ask inbox", async () => {
    const f = fixture();
    const { requestId } = f.ops.requestAccess({ callerId: "agent-a", runId: "run-1", sessionId: f.session.id, turnId: f.turn.id });
    expect(f.askInbox.asks[0]!.input.summary).toContain("agent-a");
    expect(f.ops.accessStatus({ requestId, callerId: "agent-a", runId: "run-1" })).toEqual({ state: "pending" });
    f.askInbox.asks[0]!.decide("denied");
    await flush();
    expect(f.ops.accessStatus({ requestId, callerId: "agent-a", runId: "run-1" })).toEqual({ state: "denied" });
    expect(() => f.ops.accessStatus({ requestId, callerId: "agent-b", runId: "run-1" })).toThrow(/^FORBIDDEN: /);
  });

  it("keeps each caller and run to its own grant, and never accepts a viewer grant", async () => {
    const f = fixture();
    const a = await grantFor(f, "agent-a", "run-1");
    const b = await grantFor(f, "agent-b", "run-9");
    expect(f.ops.describe(a).revision).toBe(0);
    expect(() => f.ops.describe({ ...a, callerId: "agent-b" })).toThrow(/^FORBIDDEN: /);
    expect(() => f.ops.describe({ ...a, runId: "run-2" })).toThrow(/^FORBIDDEN: /);
    expect(() => f.ops.apply({ ...b, grantId: a.grantId }, { action: ADJUST, expectedRevision: 0, idempotencyKey: "k" })).toThrow(/^FORBIDDEN: /);
    await expect(f.ops.render({ ...b, grantId: a.grantId }, { mode: "preview", expectedRevision: 0 })).rejects.toThrow(/^FORBIDDEN: /);
    await expect(f.ops.render({ ...b, grantId: a.grantId }, { mode: "export", expectedRevision: 0 })).rejects.toThrow(/^FORBIDDEN: /);
    expect(f.bridge.claim()).toBeNull();
    const viewer = f.ops.open({ sessionId: f.session.id, turnId: f.turn.id });
    expect(() => f.ops.describe({ callerId: "desktop-image-viewer", runId: "x", grantId: viewer.grantId })).toThrow(/^FORBIDDEN: /);
    expect(() => f.ops.requestAccess({ callerId: "desktop-image-viewer", runId: "r", sessionId: f.session.id, turnId: f.turn.id }))
      .toThrow(/^FORBIDDEN: /);
  });

  it("ends grants on release, expiry and session deletion", async () => {
    let clock = 1_000;
    const f = fixture({ now: () => clock });
    const a = await grantFor(f);
    clock += AGENT_GRANT_TTL_MS + 1;
    expect(() => f.ops.describe(a)).toThrow(/^FORBIDDEN: The image grant expired/);
    const b = await grantFor(f, "agent-a", "run-2");
    f.ops.release(b);
    expect(() => f.ops.describe(b)).toThrow(/^FORBIDDEN: /);
    const c = await grantFor(f, "agent-a", "run-3");
    f.ops.revokeSession(f.session.id);
    expect(() => f.ops.describe(c)).toThrow(/^FORBIDDEN: /);
  });

  it("reports approval unavailable without an Ask inbox", () => {
    const f = fixture();
    const bare = createImageEditOps(f.store, { mediaRoot: f.media });
    expect(() => bare.requestAccess({ callerId: "a", runId: "r", sessionId: f.session.id, turnId: f.turn.id }))
      .toThrow(/^APPROVAL_UNAVAILABLE: /);
  });
});

describe("agent access hardening (Phase 7 adversarial pass)", () => {
  it("shows an unverified-name warning and a request code, and folds repeats into one ask", () => {
    const f = fixture();
    const first = f.ops.requestAccess({ callerId: "nexus-coding-agent", runId: "run-1", sessionId: f.session.id, turnId: f.turn.id });
    const again = f.ops.requestAccess({ callerId: "nexus-coding-agent", runId: "run-1", sessionId: f.session.id, turnId: f.turn.id });
    expect(again.requestId).toBe(first.requestId);
    expect(f.askInbox.asks).toHaveLength(1);
    const ask = f.askInbox.asks[0]!.input as { summary: string; detail?: string };
    expect(ask.summary).toContain(first.requestId.slice(0, 8));
    expect(ask.detail).toContain("not verified");
    expect(ask.detail).toContain("undoing your own edits");
  });

  it("caps pending requests per caller", () => {
    const f = fixture();
    for (let run = 1; run <= 4; run += 1) {
      f.ops.requestAccess({ callerId: "flooder", runId: `run-${run}`, sessionId: f.session.id, turnId: f.turn.id });
    }
    expect(() => f.ops.requestAccess({ callerId: "flooder", runId: "run-5", sessionId: f.session.id, turnId: f.turn.id }))
      .toThrow(/^APPROVAL_UNAVAILABLE: /);
    expect(f.ops.requestAccess({ callerId: "someone-else", runId: "run-1", sessionId: f.session.id, turnId: f.turn.id }).state)
      .toBe("pending");
  });

  it("allows one render in flight per grant", async () => {
    const f = fixture();
    const a = await grantFor(f);
    const first = f.ops.render(a, { mode: "preview", expectedRevision: 0 });
    await expect(f.ops.render(a, { mode: "preview", expectedRevision: 0 })).rejects.toThrow(/^RENDERER_UNAVAILABLE: A render for this grant/);
    const request = f.bridge.claim()!;
    f.bridge.complete({ requestId: request.requestId, ok: true, png: PNG_B64 });
    await expect(first).resolves.toMatchObject({ revision: 0 });
  });

  it("rejects a deeply nested action as invalid instead of overflowing the stack", async () => {
    const f = fixture();
    const a = await grantFor(f);
    let nested: unknown = {};
    for (let i = 0; i < 20000; i += 1) nested = { kind: "mark", mark: nested };
    expect(() => f.ops.apply(a, { action: nested, expectedRevision: 0, idempotencyKey: "deep" })).toThrow(/^INVALID_RECIPE: /);
  });

  it("never passes a raw system error to the caller", () => {
    const error = imageEditFailure(new Error("EACCES: permission denied, open 'C:\\Users\\someone\\.nexus\\x'"));
    expect(error.message).toBe("STORAGE_UNAVAILABLE: Image edits are temporarily unavailable. Retry or reload.");
  });
});

describe("agent mutations", () => {
  it("replays an identical request, refuses key reuse for another payload, and shares state with the viewer", async () => {
    const f = fixture();
    const a = await grantFor(f);
    const first = f.ops.apply(a, { action: ADJUST, expectedRevision: 0, idempotencyKey: "k1" });
    expect(first.revision).toBe(1);
    const again = f.ops.apply(a, { action: { values: ADJUST.values, kind: "adjustments" }, expectedRevision: 0, idempotencyKey: "k1" });
    expect(again).toEqual(first);
    expect(f.ops.describe(a).revision).toBe(1);
    expect(() => f.ops.apply(a, { action: { kind: "reset" }, expectedRevision: 0, idempotencyKey: "k1" })).toThrow(/^IDEMPOTENCY_CONFLICT: /);
    expect(() => f.ops.apply(a, { action: { kind: "reset" }, expectedRevision: 0, idempotencyKey: "k2" })).toThrow(/^REVISION_CONFLICT: /);
    expect(f.ops.describe(a).revision).toBe(1);

    const viewer = f.ops.open({ sessionId: f.session.id, turnId: f.turn.id });
    expect(viewer.recipe.revision).toBe(1);
    f.ops.commit({ grantId: viewer.grantId, action: { kind: "undo" }, expectedRevision: 1 });
    const described = f.ops.describe(a);
    expect(described).toMatchObject({ revision: 2, canUndo: false, canRedo: true, values: { brightness: 100 } });
    const redone = f.ops.apply(a, { action: { kind: "redo" }, expectedRevision: 2, idempotencyKey: "k3" });
    expect(redone.values.brightness).toBe(140);
  });
});

describe("agent render and export", () => {
  it("previews and exports through the renderer with the pinned source, never overwriting", async () => {
    const f = fixture();
    const a = await grantFor(f);
    f.ops.apply(a, { action: ADJUST, expectedRevision: 0, idempotencyKey: "k1" });
    const r = renderer(f.bridge, () => ({ ok: true, png: PNG_B64 }));
    try {
      const preview = await f.ops.render(a, { mode: "preview", expectedRevision: 1 });
      expect(preview).toMatchObject({ revision: 1, png: PNG_B64, bytes: Buffer.from(PNG_B64, "base64").length });
      expect(r.seen[0]).toEqual({ sourceSha256: f.saved.outputHash, revision: 1 });
      expect(readdirSync(f.root)).not.toContain("exports-written");

      const exported = await f.ops.render(a, { mode: "export", expectedRevision: 1 });
      expect(readFileSync(exported.path!)).toEqual(Buffer.from(PNG_B64, "base64"));
      expect(exported.path!.startsWith(f.exportsRoot.replace(/\\/g, "/")) || exported.path!.startsWith(f.exportsRoot)).toBe(true);
      // The same edit exported again returns the file already there.
      expect((await f.ops.render(a, { mode: "export", expectedRevision: 1 })).path).toBe(exported.path);
      // A different file under that name is never overwritten.
      writeFileSync(exported.path!, Buffer.from("someone else's file"));
      await expect(f.ops.render(a, { mode: "export", expectedRevision: 1 })).rejects.toThrow(/^EXPORT_EXISTS: /);
      expect(readFileSync(exported.path!).toString()).toBe("someone else's file");
      await expect(f.ops.render(a, { mode: "preview", expectedRevision: 0 })).rejects.toThrow(/^REVISION_CONFLICT: /);
      expect(sha(readFileSync(f.saved.outputPath))).toBe(f.saved.outputHash);
    } finally {
      r.stop();
    }
  });

  it("refuses an export when the recipe or source changes while it renders", async () => {
    const f = fixture();
    const a = await grantFor(f);
    const viewer = f.ops.open({ sessionId: f.session.id, turnId: f.turn.id });
    const r = renderer(f.bridge, () => {
      // Another editor commits during the render.
      f.ops.commit({ grantId: viewer.grantId, action: ADJUST, expectedRevision: 0 });
      return { ok: true, png: PNG_B64 };
    });
    try {
      await expect(f.ops.render(a, { mode: "export", expectedRevision: 0 })).rejects.toThrow(/^REVISION_CONFLICT: /);
    } finally {
      r.stop();
    }
    const changed = Buffer.from(PNG_B64, "base64");
    const at = changed.length - 13;
    const r2 = renderer(f.bridge, () => {
      changed.writeUInt8(changed.readUInt8(at) ^ 1, at);
      writeFileSync(f.saved.outputPath, changed);
      return { ok: true, png: PNG_B64 };
    });
    try {
      await expect(f.ops.render(a, { mode: "export", expectedRevision: 1 })).rejects.toThrow(/^SOURCE_CHANGED: /);
    } finally {
      r2.stop();
    }
    expect(existsSync(f.exportsRoot) ? readdirSync(f.exportsRoot) : []).toEqual([]);
  });

  it("refuses to export through a linked or replaced exports folder", async () => {
    const f = fixture();
    const a = await grantFor(f);
    const r = renderer(f.bridge, () => ({ ok: true, png: PNG_B64 }));
    try {
      await f.ops.render(a, { mode: "preview", expectedRevision: 0 });
      mkdirSync(f.exportsRoot, { recursive: true });
      await f.ops.render(a, { mode: "export", expectedRevision: 0 }); // fixes the canonical root
      const elsewhere = join(f.root, "elsewhere");
      mkdirSync(elsewhere);
      renameSync(f.exportsRoot, join(f.root, "exports-old"));
      symlinkSync(elsewhere, f.exportsRoot, "junction");
      f.ops.apply(a, { action: ADJUST, expectedRevision: 0, idempotencyKey: "k1" });
      await expect(f.ops.render(a, { mode: "export", expectedRevision: 1 })).rejects.toThrow(/^EXPORT_UNSAFE: /);
      expect(readdirSync(elsewhere)).toEqual([]);
    } finally {
      r.stop();
    }
  });

  it("fails as renderer-unavailable with no renderer, and refuses forged or stale responses", async () => {
    const f = fixture({ deadlineMs: 150 });
    const a = await grantFor(f);
    await expect(f.ops.render(a, { mode: "preview", expectedRevision: 0 })).rejects.toThrow(/^RENDERER_UNAVAILABLE: /);
    const wrongSize = Buffer.from(PNG_B64, "base64");
    wrongSize.writeUInt32BE(2, 16);
    const r = renderer(f.bridge, () => ({ ok: true, png: wrongSize.toString("base64") }));
    try {
      await expect(f.ops.render(a, { mode: "preview", expectedRevision: 0 })).rejects.toThrow(/^RENDER_FAILED: /);
    } finally {
      r.stop();
    }
    expect(f.bridge.complete({ requestId: "00000000-0000-4000-8000-000000000000", ok: true, png: PNG_B64 })).toEqual({ accepted: false });
    const closing = f.ops.render(a, { mode: "preview", expectedRevision: 0 });
    f.bridge.close();
    await expect(closing).rejects.toThrow(/^RENDERER_UNAVAILABLE: /);
  });
});

describe("render response validation", () => {
  it("accepts only a complete, CRC-correct PNG of the requested size", () => {
    const png = Buffer.from(PNG_B64, "base64");
    expect(isWellFormedPng(png, 1, 1)).toBe(true);
    expect(isWellFormedPng(png, 2, 1)).toBe(false);
    expect(isWellFormedPng(Buffer.concat([png, Buffer.from("trailing")]), 1, 1)).toBe(false);
    const corrupt = Buffer.from(png);
    const at = corrupt.length - 20;
    corrupt.writeUInt8(corrupt.readUInt8(at) ^ 1, at);
    expect(isWellFormedPng(corrupt, 1, 1)).toBe(false);
    expect(isWellFormedPng(png.subarray(0, png.length - 12), 1, 1)).toBe(false);
  });
});

describe("/nexus/image-edit routes", () => {
  it("requires the app token, validates fields, and maps typed failures to HTTP", async () => {
    const f = fixture();
    const server = new LoopbackHttpServer({ log: () => {} });
    server.mount(createJsonCliRoute({ sessions: new CodingSessionManager(), imageEdit: async () => f.ops }));
    servers.push(server);
    await server.start({ host: "127.0.0.1", port: 0, token: "secret", listen: true });
    const base = `http://127.0.0.1:${server.boundPort}/nexus/image-edit`;
    const post = (route: string, body: unknown, token = "secret") => fetch(`${base}/${route}`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    expect((await post("describe", {}, "wrong")).status).toBe(401);
    const missing = await post("apply", { callerId: "agent-a" });
    expect(missing.status).toBe(400);
    expect(await missing.json()).toMatchObject({ error: { code: "schema" } });

    const requested = await post("access", { callerId: "agent-a", runId: "run-1", sessionId: f.session.id, turnId: f.turn.id });
    expect(requested.status).toBe(202);
    const { requestId } = (await requested.json()) as { requestId: string };
    f.askInbox.asks[0]!.decide("approved");
    await flush();
    const status = (await (await post("access/status", { requestId, callerId: "agent-a", runId: "run-1" })).json()) as { grantId: string };
    const grant = { callerId: "agent-a", runId: "run-1", grantId: status.grantId };

    const applied = await post("apply", { ...grant, action: ADJUST, expectedRevision: 0, idempotencyKey: "k1" });
    expect(applied.status).toBe(200);
    expect(await applied.json()).toMatchObject({ revision: 1, values: { brightness: 140 } });
    // Even an approved agent cannot list or restore viewer recovery checkpoints.
    const checkpoint = f.ops.checkpoints({ grantId: f.ops.open({ sessionId: f.session.id, turnId: f.turn.id }).grantId }).checkpoints[0]!;
    for (const route of ["restore", "checkpoints"]) {
      const refused = await post(route, { ...grant, checkpointId: checkpoint.id, expectedRevision: 1 });
      expect(refused.status).toBe(404);
      expect(await refused.json()).toMatchObject({ error: { code: "unknown_route" } });
    }
    const conflict = await post("apply", { ...grant, action: { kind: "reset" }, expectedRevision: 0, idempotencyKey: "k1" });
    expect(conflict.status).toBe(409);
    expect(await conflict.json()).toMatchObject({ error: { code: "IDEMPOTENCY_CONFLICT" } });
    const other = await post("describe", { ...grant, callerId: "agent-b" });
    expect(other.status).toBe(403);
    expect(await other.json()).toMatchObject({ error: { code: "FORBIDDEN" } });
    expect((await post("release", grant)).status).toBe(200);
    expect((await post("describe", grant)).status).toBe(403);
  });
});
