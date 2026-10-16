// @vitest-environment node
/**
 * v2.13.0 Phase 5 -- sidecar ops for studio.image.* over a real sessions.db
 * file and real PNG bytes, including a simulated process restart.
 */

import { afterEach, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { StudioSessionStore } from "../../../core/generations/StudioSessionStore.js";
import { deriveImageEditState } from "../../../core/image/ImageEditRecipe.js";
import { persistGeneratedPng } from "../../sidecar/src/studio/generatedImages.js";
import { createImageEditOps } from "../../sidecar/src/studio/imageEditRuntime.js";

const PNG_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGP4DwQACfsD/fteaysAAAAASUVORK5CYII=";
const sha = (bytes: Buffer): string => createHash("sha256").update(bytes).digest("hex");
const adjust = { kind: "adjustments", values: { brightness: 130, contrast: 110, saturation: 90, sharpness: 40 } };
const stroke = { kind: "mark", mark: { kind: "stroke", color: "#00ff00", size: 4, points: [{ x: 0, y: 0 }, { x: 1, y: 1 }] } };
const text = { kind: "mark", mark: { kind: "text", color: "#ffffff", size: 16, text: "Saved", x: 0, y: 1 } };

const roots: string[] = [];
const stores: StudioSessionStore[] = [];

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "nexus-image-edit-ops-"));
  roots.push(root);
  const media = join(root, "images");
  const saved = persistGeneratedPng(PNG_B64, media);
  if (!saved) throw new Error("fixture PNG was not saved");
  const db = join(root, "sessions.db");
  const store = new StudioSessionStore(db);
  stores.push(store);
  const session = store.createSession({ pillar: "image", folderId: null, title: "Edit", modelId: "fixture" });
  const turn = store.appendTurn({ sessionId: session.id, role: "assistant", content: "", mediaRef: saved.outputPath });
  return { root, media, db, store, session, turn, saved, ops: createImageEditOps(store, media) };
}

afterEach(() => {
  for (const store of stores.splice(0)) { try { store.close(); } catch { /* closed by a restart test */ } }
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("generated image persistence", () => {
  it("writes a content-addressed PNG once and refuses non-PNG bytes", () => {
    const root = mkdtempSync(join(tmpdir(), "nexus-generated-png-"));
    roots.push(root);
    const first = persistGeneratedPng(PNG_B64, root);
    const second = persistGeneratedPng(PNG_B64, root);
    expect(first).toEqual(second);
    expect(first?.outputHash).toBe(sha(Buffer.from(PNG_B64, "base64")));
    expect(readFileSync(first!.outputPath)).toEqual(Buffer.from(PNG_B64, "base64"));
    expect(readdirSync(root)).toEqual([`${first!.outputHash}.png`]);
    expect(persistGeneratedPng(Buffer.from("not a png").toString("base64"), root)).toBeNull();
  });
});

describe("studio.image.edit ops", () => {
  it("survives a sidecar restart with complete history and an unchanged source", () => {
    const f = fixture();
    const opened = f.ops.open({ sessionId: f.session.id, turnId: f.turn.id });
    expect(opened.identity.sourceSha256).toBe(f.saved.outputHash);
    expect(Buffer.from(opened.png, "base64")).toEqual(Buffer.from(PNG_B64, "base64"));
    let state = f.ops.commit({ grantId: opened.grantId, action: adjust, expectedRevision: 0 });
    state = f.ops.commit({ grantId: opened.grantId, action: stroke, expectedRevision: state.recipe.revision });
    state = f.ops.commit({ grantId: opened.grantId, action: text, expectedRevision: state.recipe.revision });
    state = f.ops.commit({ grantId: opened.grantId, action: { kind: "undo" }, expectedRevision: state.recipe.revision });
    expect(f.ops.revision({ grantId: opened.grantId }).revision).toBe(4);
    f.store.close();

    const reopenedStore = new StudioSessionStore(f.db);
    stores.push(reopenedStore);
    const restarted = createImageEditOps(reopenedStore, f.media);
    expect(() => restarted.commit({ grantId: opened.grantId, action: { kind: "redo" }, expectedRevision: 4 }))
      .toThrow(/^FORBIDDEN: /);
    const reopened = restarted.open({ sessionId: f.session.id, turnId: f.turn.id });
    expect(reopened.recipe).toEqual(state.recipe);
    expect(reopened.capabilities).toMatchObject({ canUndo: true, canRedo: true, revision: 4 });
    const redone = restarted.commit({ grantId: reopened.grantId, action: { kind: "redo" }, expectedRevision: 4 });
    expect(deriveImageEditState(redone.recipe as never)).toMatchObject({
      adjustments: adjust.values,
      marks: [expect.objectContaining({ kind: "stroke" }), expect.objectContaining({ kind: "text", text: "Saved" })],
    });
    expect(sha(readFileSync(f.saved.outputPath))).toBe(f.saved.outputHash);
  });

  it("reports a stale writer as a conflict and keeps the committed recipe", () => {
    const f = fixture();
    const a = f.ops.open({ sessionId: f.session.id, turnId: f.turn.id });
    const b = f.ops.open({ sessionId: f.session.id, turnId: f.turn.id });
    f.ops.commit({ grantId: a.grantId, action: adjust, expectedRevision: 0 });
    expect(() => f.ops.commit({ grantId: b.grantId, action: stroke, expectedRevision: 0 })).toThrow(/^REVISION_CONFLICT: /);
    expect(f.ops.revision({ grantId: b.grantId }).revision).toBe(1);
  });

  it("revokes grants on close and on session deletion", () => {
    const f = fixture();
    const closed = f.ops.open({ sessionId: f.session.id, turnId: f.turn.id });
    f.ops.close({ grantId: closed.grantId });
    expect(() => f.ops.revision({ grantId: closed.grantId })).toThrow(/^FORBIDDEN: /);
    const open = f.ops.open({ sessionId: f.session.id, turnId: f.turn.id });
    f.ops.revokeSession(f.session.id);
    expect(() => f.ops.commit({ grantId: open.grantId, action: adjust, expectedRevision: 0 })).toThrow(/^FORBIDDEN: /);
  });

  it("refuses turns without an owned PNG and a source that changed after editing", () => {
    const f = fixture();
    const bare = f.store.appendTurn({ sessionId: f.session.id, role: "assistant", content: "no media" });
    expect(() => f.ops.open({ sessionId: f.session.id, turnId: bare.id })).toThrow(/^IMAGE_NOT_FOUND: /);
    const outside = join(f.root, "outside.png");
    writeFileSync(outside, Buffer.from(PNG_B64, "base64"));
    const foreign = f.store.appendTurn({ sessionId: f.session.id, role: "assistant", content: "", mediaRef: outside });
    expect(() => f.ops.media({ sessionId: f.session.id, turnId: foreign.id })).toThrow(/^FORBIDDEN: /);

    const opened = f.ops.open({ sessionId: f.session.id, turnId: f.turn.id });
    f.ops.commit({ grantId: opened.grantId, action: adjust, expectedRevision: 0 });
    const changed = Buffer.from(PNG_B64, "base64");
    const at = changed.length - 13;
    changed.writeUInt8(changed.readUInt8(at) ^ 1, at);
    writeFileSync(f.saved.outputPath, changed);
    expect(() => f.ops.open({ sessionId: f.session.id, turnId: f.turn.id })).toThrow(/^SOURCE_CHANGED: /);
  });
});
