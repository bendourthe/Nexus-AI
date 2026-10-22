// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { AskInbox, JsonFileAskInboxStore, MemoryAskInboxStore, type AskInboxStore } from "../../../modules/coding/autonomy/AskInbox.js";
import { StudioSessionStore } from "../../../core/generations/StudioSessionStore.js";
import { createImageEditOps, type AgentAccess } from "../../sidecar/src/studio/imageEditRuntime.js";
import { ImageRenderBridge } from "../../sidecar/src/studio/imageRenderBridge.js";

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGP4DwQACfsD/fteaysAAAAASUVORK5CYII=", "base64");
const roots: string[] = [];
const stores: StudioSessionStore[] = [];
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const adjust = (brightness: number) => ({ kind: "adjustments", values: { brightness, contrast: 100, saturation: 100, sharpness: 0 } });

afterEach(() => {
  for (const store of stores.splice(0)) { try { store.close(); } catch { /* Already closed to prove restart. */ } }
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function fixture(askStore?: AskInboxStore) {
  const root = mkdtempSync(join(tmpdir(), "nexus-checkpoints-"));
  roots.push(root);
  const mediaRoot = join(root, "images");
  mkdirSync(mediaRoot);
  const source = join(mediaRoot, "source.png");
  writeFileSync(source, PNG);
  const dbPath = join(root, "sessions.db");
  const store = new StudioSessionStore(dbPath);
  stores.push(store);
  const folder = store.createFolder({ pillar: "image", parentId: null, name: "Images" });
  const session = store.createSession({ pillar: "image", folderId: folder.id, title: "Image", modelId: "fixture" });
  const turn = store.appendTurn({ sessionId: session.id, role: "assistant", content: "", mediaRef: source });
  const json = askStore ?? new JsonFileAskInboxStore(join(root, "asks.json"));
  let clock = 1000;
  const inbox = new AskInbox({ store: json, now: () => clock });
  const bridge = new ImageRenderBridge(5000);
  const options = { mediaRoot, askInbox: inbox, renderBridge: bridge, now: () => clock, exportsRoot: join(root, "exports") };
  const ops = createImageEditOps(store, options);
  const selected = { sessionId: session.id, turnId: turn.id };
  const viewer = ops.open(selected);
  return { root, mediaRoot, source, dbPath, store, folder, session, turn, inbox, json, bridge, options, ops, selected, viewer,
    advance: (ms: number) => { clock += ms; } };
}

async function request(f: ReturnType<typeof fixture>, runId = "run") {
  const callerId = "agent";
  const requested = f.ops.requestAccess({ ...f.selected, callerId, runId });
  await tick();
  const ask = (await f.inbox.list("pending")).find((item) => item.runId === runId)!;
  expect(ask).toBeDefined();
  const status = () => f.ops.accessStatus({ requestId: requested.requestId, callerId, runId });
  return { ask, requested, status, access: (): AgentAccess => ({ callerId, runId, grantId: status().grantId! }) };
}

async function approve(f: ReturnType<typeof fixture>, runId = "run") {
  const r = await request(f, runId);
  expect((await f.inbox.approve(r.ask.id)).ok).toBe(true);
  await tick();
  expect(r.status().state).toBe("approved");
  return r;
}

describe("approval recovery checkpoints through real owners", () => {
  it("captures actual approval history including redo, survives restart, restores with CAS and revokes grants", async () => {
    const f = fixture();
    const grantId = f.viewer.grantId;
    let recipe = f.ops.commit({ grantId, action: adjust(120), expectedRevision: 0 }).recipe;
    recipe = f.ops.commit({ grantId, action: adjust(150), expectedRevision: recipe.revision }).recipe;
    recipe = f.ops.commit({ grantId, action: { kind: "undo" }, expectedRevision: recipe.revision }).recipe;
    const r = await request(f);
    expect(f.ops.checkpoints({ grantId }).checkpoints).toEqual([]);
    // Viewer changes while the ask waits must be included, not the request-time state.
    recipe = f.ops.commit({ grantId, action: { kind: "redo" }, expectedRevision: recipe.revision }).recipe;
    recipe = f.ops.commit({ grantId, action: { kind: "undo" }, expectedRevision: recipe.revision }).recipe;
    const approvalRecipe = recipe;
    expect((await f.inbox.approve(r.ask.id)).ok).toBe(true);
    await tick();
    const checkpoint = f.ops.checkpoints({ grantId }).checkpoints[0]!;
    expect(checkpoint).toMatchObject({ revision: recipe.revision, cursor: 1, commands: 2 });
    expect(f.ops.describe(r.access()).checkpointId).toBe(checkpoint.id);
    expect((await f.inbox.approve(r.ask.id)).ok).toBe(false);
    expect(f.ops.checkpoints({ grantId }).checkpoints).toHaveLength(1);
    const branched = f.ops.apply(r.access(), { action: adjust(180), expectedRevision: recipe.revision, idempotencyKey: "branch" });
    expect(branched.canRedo).toBe(false);
    f.store.close();
    const reopened = new StudioSessionStore(f.dbPath);
    stores.push(reopened);
    const restarted = createImageEditOps(reopened, f.options);
    const viewer = restarted.open(f.selected);
    expect(() => restarted.describe(r.access())).toThrow("FORBIDDEN");
    expect(restarted.checkpoints({ grantId: viewer.grantId }).checkpoints[0]).toEqual(checkpoint);
    const restored = restarted.restore({ grantId: viewer.grantId, checkpointId: checkpoint.id, expectedRevision: branched.revision }).recipe;
    expect(restored).toEqual({ ...approvalRecipe, revision: branched.revision + 1 });
    expect(() => restarted.restore({ grantId: viewer.grantId, checkpointId: checkpoint.id, expectedRevision: branched.revision })).toThrow("REVISION_CONFLICT");
    expect(restarted.open(f.selected).recipe).toEqual(restored);
    expect(readFileSync(f.source)).toEqual(PNG);
  });

  it("captures revision zero without creating a live recipe row", async () => {
    const f = fixture();
    const r = await approve(f);
    expect(f.ops.describe(r.access()).revision).toBe(0);
    expect(f.ops.checkpoints({ grantId: f.viewer.grantId }).checkpoints[0]).toMatchObject({ revision: 0, cursor: 0, commands: 0 });
    const db = new Database(f.dbPath);
    expect(db.prepare("SELECT count(*) AS n FROM studio_image_edit_recipes").get()).toEqual({ n: 0 });
    db.close();
  });

  it("checkpoint or JSON failure exposes no approved state; retry after viewer edits uses a fresh snapshot", async () => {
    const underlying = new MemoryAskInboxStore();
    let rejectApproval = true;
    const json: AskInboxStore = { load: () => underlying.load(), save: async (items) => {
      if (rejectApproval && items.some((item) => item.state === "approved")) throw new Error("disk full");
      await underlying.save(items);
    } };
    const f = fixture(json);
    const r = await request(f);
    const db = new Database(f.dbPath);
    db.exec("CREATE TRIGGER checkpoint_failure BEFORE INSERT ON studio_image_edit_checkpoints BEGIN SELECT RAISE(ABORT, 'disk full'); END");
    expect((await f.inbox.approve(r.ask.id)).ok).toBe(false);
    expect(r.status()).toEqual({ state: "pending" });
    expect(f.ops.checkpoints({ grantId: f.viewer.grantId }).checkpoints).toHaveLength(0);
    db.exec("DROP TRIGGER checkpoint_failure");
    expect((await f.inbox.approve(r.ask.id)).ok).toBe(false);
    expect((await f.inbox.get(r.ask.id))?.state).toBe("pending");
    expect((await json.load())[0]?.state).toBe("pending");
    expect(r.status()).toEqual({ state: "pending" });
    const failed = f.ops.checkpoints({ grantId: f.viewer.grantId }).checkpoints[0]!;
    const recipe = f.ops.commit({ grantId: f.viewer.grantId, action: adjust(155), expectedRevision: 0 }).recipe;
    rejectApproval = false;
    expect((await f.inbox.approve(r.ask.id)).ok).toBe(true);
    await tick();
    const checkpoints = f.ops.checkpoints({ grantId: f.viewer.grantId }).checkpoints;
    expect(checkpoints).toHaveLength(2);
    const successful = checkpoints.find((entry) => entry.id !== failed.id)!;
    expect(successful.revision).toBe(recipe.revision);
    expect(f.ops.describe(r.access()).checkpointId).toBe(successful.id);
    expect(checkpoints.find((entry) => entry.id === failed.id)).toEqual(failed);
    db.close();
    f.store.close();
    const reopened = new StudioSessionStore(f.dbPath);
    stores.push(reopened);
    const ops = createImageEditOps(reopened, f.options);
    expect(ops.checkpoints({ grantId: ops.open(f.selected).grantId }).checkpoints).toEqual(checkpoints);
  });

  it("restore invalidates delayed approval persistence and pending requests without granting access", async () => {
    const memory = new MemoryAskInboxStore();
    let release: (() => void) | undefined;
    let delay = false;
    const json: AskInboxStore = { load: () => memory.load(), save: async (items) => {
      if (delay && items.some((item) => item.state === "approved")) {
        await new Promise<void>((resolve) => { release = resolve; });
      }
      await memory.save(items);
    } };
    const f = fixture(json);
    const original = await approve(f, "original");
    const checkpoint = f.ops.checkpoints({ grantId: f.viewer.grantId }).checkpoints[0]!;
    const pending = await request(f, "delayed");
    delay = true;
    const deciding = f.inbox.approve(pending.ask.id);
    await tick();
    expect(release).toBeDefined();
    expect((await f.inbox.get(pending.ask.id))?.state).toBe("pending");
    const restored = f.ops.restore({ grantId: f.viewer.grantId, checkpointId: checkpoint.id, expectedRevision: 0 });
    expect(restored.recipe.revision).toBe(1);
    delay = false;
    release!();
    expect((await deciding).ok).toBe(false);
    await tick();
    expect(pending.status()).toEqual({ state: "denied" });
    expect(() => f.ops.describe(original.access())).toThrow("FORBIDDEN");
    expect((await f.inbox.get(pending.ask.id))?.state).toBe("denied");
    expect((await memory.load()).find((item) => item.id === pending.ask.id)?.state).toBe("denied");
    const next = await approve(f, "fresh");
    expect(f.ops.describe(next.access()).revision).toBe(1);
  });

  it.each(["preview", "export"] as const)("restore revokes a delayed %s before bytes or output escape", async (mode) => {
    const f = fixture();
    const r = await approve(f);
    const render = f.ops.render(r.access(), { mode, expectedRevision: 0 });
    const assertion = expect(render).rejects.toThrow("FORBIDDEN");
    const job = f.bridge.claim()!;
    const checkpoint = f.ops.checkpoints({ grantId: f.viewer.grantId }).checkpoints[0]!;
    f.ops.restore({ grantId: f.viewer.grantId, checkpointId: checkpoint.id, expectedRevision: 0 });
    f.bridge.complete({ requestId: job.requestId, ok: true, png: PNG.toString("base64") });
    await assertion;
    expect(existsSync(join(f.root, "exports"))).toBe(false);
    expect(() => f.ops.apply(r.access(), { action: adjust(180), expectedRevision: 1, idempotencyKey: "old" })).toThrow("FORBIDDEN");
  });

  it("denied/expired asks never capture; separate approvals capture separately; agent grants cannot restore", async () => {
    const f = fixture();
    const denied = await request(f, "denied");
    await f.inbox.deny(denied.ask.id);
    const expired = await request(f, "expired");
    f.advance(3600001);
    expect((await f.inbox.approve(expired.ask.id)).ok).toBe(false);
    expect(f.ops.checkpoints({ grantId: f.viewer.grantId }).checkpoints).toHaveLength(0);
    const one = await approve(f, "one");
    const two = await approve(f, "two");
    const checkpoints = f.ops.checkpoints({ grantId: f.viewer.grantId }).checkpoints;
    expect(checkpoints).toHaveLength(2);
    expect(checkpoints[0]!.id).not.toBe(checkpoints[1]!.id);
    expect(() => f.ops.restore({ grantId: one.access().grantId, checkpointId: checkpoints[0]!.id, expectedRevision: 0 })).toThrow("FORBIDDEN");
    expect(() => f.ops.checkpoints({ grantId: two.access().grantId })).toThrow("FORBIDDEN");
    expect(() => f.ops.apply(one.access(), { action: { kind: "restore", checkpointId: checkpoints[0]!.id }, expectedRevision: 0, idempotencyKey: "restore" })).toThrow("INVALID_RECIPE");
  });

  it("rejects cross-turn/source checkpoints and preserves shared original bytes after folder cascades", async () => {
    const f = fixture();
    await approve(f);
    const checkpoint = f.ops.checkpoints({ grantId: f.viewer.grantId }).checkpoints[0]!;
    const other = f.store.createSession({ pillar: "image", folderId: null, title: "Shared original", modelId: "fixture" });
    const turn = f.store.appendTurn({ sessionId: other.id, role: "assistant", content: "", mediaRef: f.source });
    const viewer = f.ops.open({ sessionId: other.id, turnId: turn.id });
    expect(() => f.ops.restore({ grantId: viewer.grantId, checkpointId: checkpoint.id, expectedRevision: 0 })).toThrow("FORBIDDEN");
    const before = f.ops.open(f.selected).recipe;
    writeFileSync(f.source, Buffer.concat([PNG, Buffer.from("changed")]));
    expect(() => f.ops.restore({ grantId: f.viewer.grantId, checkpointId: checkpoint.id, expectedRevision: 0 })).toThrow("SOURCE_CHANGED");
    writeFileSync(f.source, PNG);
    expect(f.ops.open(f.selected).recipe).toEqual(before);
    f.ops.revokeSession(f.session.id);
    f.store.deleteFolder(f.folder.id);
    expect(f.store.listTurns(f.session.id)).toEqual([]);
    expect(readFileSync(f.source)).toEqual(PNG);
    expect(f.ops.open({ sessionId: other.id, turnId: turn.id }).png).toBe(PNG.toString("base64"));
    const db = new Database(f.dbPath);
    expect(db.prepare("SELECT count(*) AS n FROM studio_image_edit_checkpoints").get()).toEqual({ n: 0 });
    db.close();
  });

  it("revokes pending asks before preparation and rejects same-session wrong-turn recovery", async () => {
    const f = fixture();
    await approve(f, "first");
    const checkpoint = f.ops.checkpoints({ grantId: f.viewer.grantId }).checkpoints[0]!;
    const pending = await request(f, "pending");
    f.ops.restore({ grantId: f.viewer.grantId, checkpointId: checkpoint.id, expectedRevision: 0 });
    expect((await f.inbox.approve(pending.ask.id)).ok).toBe(false);
    expect(pending.status()).toEqual({ state: "denied" });
    expect(f.ops.checkpoints({ grantId: f.viewer.grantId }).checkpoints).toHaveLength(1);
    const secondTurn = f.store.appendTurn({ sessionId: f.session.id, role: "assistant", content: "same source", mediaRef: f.source });
    const viewer = f.ops.open({ sessionId: f.session.id, turnId: secondTurn.id });
    expect(() => f.ops.restore({ grantId: viewer.grantId, checkpointId: checkpoint.id, expectedRevision: 0 })).toThrow("FORBIDDEN");
  });

  it("lists bounded metadata pages without evicting older recovery history", async () => {
    const f = fixture();
    for (let i = 0; i < 52; i += 1) await approve(f, `run-${i}`);
    const page = f.ops.checkpoints({ grantId: f.viewer.grantId }).checkpoints;
    expect(page).toHaveLength(50);
    const older = f.ops.checkpoints({ grantId: f.viewer.grantId, beforeId: page.at(-1)!.id }).checkpoints;
    expect(older).toHaveLength(2);
    expect(new Set([...page, ...older].map((entry) => entry.id)).size).toBe(52);
    expect(page[0]).not.toHaveProperty("recipe");
    expect(f.ops.restore({ grantId: f.viewer.grantId, checkpointId: older.at(-1)!.id, expectedRevision: 0 }).recipe.revision).toBe(1);
    expect(f.ops.checkpoints({ grantId: f.viewer.grantId, beforeId: page.at(-1)!.id }).checkpoints).toEqual(older);
  });
});
