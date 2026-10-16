import { afterEach, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { StudioSessionStore } from "../../../../core/generations/StudioSessionStore.js";
import { ImageEditRecipeStore, type ImageEditAccess } from "../../../../core/generations/ImageEditRecipeStore.js";
import { createImageEditRecipe, deriveImageEditState, reduceImageEditRecipe, type ImageEditIdentity } from "../../../../core/image/ImageEditRecipe.js";

const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGP4DwQACfsD/fteaysAAAAASUVORK5CYII=", "base64");
const hash = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
const actor = { callerId: "fixture-ui", runId: "fixture-run", grantId: "fixture-owned-image" };
const roots: string[] = [];
const sessions: StudioSessionStore[] = [];
const adjustment = { kind: "adjustments", values: { brightness: 120, contrast: 130, saturation: 80, sharpness: 25 } };

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "nexus-image-recipe-"));
  roots.push(root);
  const media = join(root, "owned-media");
  mkdirSync(media);
  const source = join(media, "source.png");
  writeFileSync(source, png);
  const db = join(root, "sessions.db");
  const owner = new StudioSessionStore(db);
  sessions.push(owner);
  const session = owner.createSession({ folderId: null, pillar: "image", title: "Recipe fixture", modelId: "local-fixture" });
  const turn = owner.appendTurn({ sessionId: session.id, role: "assistant", content: "image", mediaRef: source });
  const identity = { studioSessionId: session.id, studioTurnId: turn.id, sourceSha256: hash(png) };
  let enabled = true;
  const authorize = (access: ImageEditAccess, requested: ImageEditIdentity) => enabled
    && access.callerId === actor.callerId && access.runId === actor.runId && access.grantId === actor.grantId
    && requested.studioSessionId === identity.studioSessionId && requested.studioTurnId === identity.studioTurnId
    && requested.sourceSha256 === identity.sourceSha256;
  const recipes = new ImageEditRecipeStore(owner, media, authorize);
  return { root, media, source, db, owner, session, turn, identity, authorize, recipes, revoke: () => { enabled = false; } };
}

afterEach(() => {
  for (const owner of sessions.splice(0)) { try { owner.close(); } catch { /* Already closed for reopen evidence. */ } }
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("owned image recipe persistence", () => {
  it("persists all edits and history across database close/reopen with unchanged original bytes", () => {
    const f = fixture();
    let recipe = f.recipes.commit(f.identity, actor, adjustment, 0);
    recipe = f.recipes.commit(f.identity, actor, { kind: "mark", mark: { kind: "stroke", color: "#ff0000", size: 8, points: [{ x: 0, y: 0 }, { x: 1, y: 1 }] } }, recipe.revision);
    recipe = f.recipes.commit(f.identity, actor, { kind: "mark", mark: { kind: "text", color: "#ffffff", size: 32, text: "Nexus", x: 0, y: 0 } }, recipe.revision);
    recipe = f.recipes.commit(f.identity, actor, { kind: "undo" }, recipe.revision);
    f.owner.close();
    const reopenedOwner = new StudioSessionStore(f.db);
    sessions.push(reopenedOwner);
    const reopened = new ImageEditRecipeStore(reopenedOwner, f.media, f.authorize);
    expect(reopened.load(f.identity, actor)).toEqual(recipe);
    const redone = reopened.commit(f.identity, actor, { kind: "redo" }, recipe.revision);
    expect(deriveImageEditState(redone)).toMatchObject({ adjustments: adjustment.values, marks: [expect.objectContaining({ kind: "stroke" }), expect.objectContaining({ kind: "text", text: "Nexus" })] });
    expect(hash(readFileSync(f.source))).toBe(f.identity.sourceSha256);
    expect(reopened.readSource(f.identity, actor).bytes).toEqual(png);
  });

  it("rejects stale concurrent writers and keeps the committed recipe", () => {
    const f = fixture();
    const otherOwner = new StudioSessionStore(f.db);
    sessions.push(otherOwner);
    const other = new ImageEditRecipeStore(otherOwner, f.media, f.authorize);
    expect(other.load(f.identity, actor).revision).toBe(0);
    const committed = f.recipes.commit(f.identity, actor, adjustment, 0);
    expect(() => other.commit(f.identity, actor, { kind: "reset" }, 0)).toThrow("another editor");
    expect(other.load(f.identity, actor)).toEqual(committed);
  });

  it("refuses wrong caller/run/image/hash and revoked grants", () => {
    const f = fixture();
    for (const access of [{ ...actor, callerId: "other" }, { ...actor, runId: "other" }, { ...actor, grantId: "global-token" }]) {
      expect(() => f.recipes.load(f.identity, access)).toThrow("no grant");
    }
    expect(() => f.recipes.load({ ...f.identity, studioTurnId: "other-image" }, actor)).toThrow("no grant");
    expect(() => f.recipes.load({ ...f.identity, sourceSha256: "b".repeat(64) }, actor)).toThrow("no grant");
    f.revoke();
    expect(() => f.recipes.commit(f.identity, actor, adjustment, 0)).toThrow("no grant");
  });

  it("rolls back a write when its grant is revoked before acknowledgment", () => {
    const f = fixture();
    let checks = 0;
    const revoking = new ImageEditRecipeStore(f.owner, f.media, (access, identity) =>
      ++checks < 3 && f.authorize(access, identity));
    expect(() => revoking.commit(f.identity, actor, adjustment, 0)).toThrow("no grant");
    expect(f.recipes.load(f.identity, actor).revision).toBe(0);
  });

  it("refuses changed source without replacing the old recipe", () => {
    const f = fixture();
    const saved = f.recipes.commit(f.identity, actor, adjustment, 0);
    writeFileSync(f.source, Buffer.concat([png, Buffer.from("changed")]));
    expect(() => f.recipes.commit(f.identity, actor, { kind: "reset" }, saved.revision)).toThrow("hash changed");
    writeFileSync(f.source, png);
    expect(f.recipes.load(f.identity, actor)).toEqual(saved);
  });

  it("rolls back when source bytes change during commit", () => {
    const f = fixture();
    let checks = 0;
    const racing = new ImageEditRecipeStore(f.owner, f.media, (access, identity) => {
      if (++checks === 2) writeFileSync(f.source, Buffer.concat([png, Buffer.from("race")]));
      return f.authorize(access, identity);
    });
    expect(() => racing.commit(f.identity, actor, adjustment, 0)).toThrow("hash changed");
    writeFileSync(f.source, png);
    expect(f.recipes.load(f.identity, actor).revision).toBe(0);
  });

  it("cascades recipe deletion through the existing session owner and preserves other image/media", () => {
    const f = fixture();
    f.recipes.commit(f.identity, actor, adjustment, 0);
    const otherSession = f.owner.createSession({ folderId: null, pillar: "image", title: "Other", modelId: "local-fixture" });
    f.owner.appendTurn({ sessionId: otherSession.id, role: "assistant", content: "shared source", mediaRef: f.source });
    f.owner.deleteSession(f.session.id);
    expect(() => f.recipes.load(f.identity, actor)).toThrow("unavailable");
    expect(f.owner.listTurns(otherSession.id)).toHaveLength(1);
    expect(readFileSync(f.source)).toEqual(png);
    const inspection = new Database(f.db);
    try { expect(inspection.prepare("SELECT count(*) AS count FROM studio_image_edit_recipes").get()).toEqual({ count: 0 }); }
    finally { inspection.close(); }
  });

  it("refuses source paths outside the owned generation root", () => {
    const f = fixture();
    const external = join(f.root, "outside.png");
    writeFileSync(external, png);
    const turn = f.owner.appendTurn({ sessionId: f.session.id, role: "assistant", content: "outside", mediaRef: external });
    const identity = { ...f.identity, studioTurnId: turn.id };
    const recipes = new ImageEditRecipeStore(f.owner, f.media, () => true);
    expect(() => recipes.load(identity, actor)).toThrow("outside owned");
  });

  it("refuses a generation-directory junction escaping the owned root", () => {
    const f = fixture();
    const external = join(f.root, "external");
    mkdirSync(external);
    writeFileSync(join(external, "image.png"), png);
    const link = join(f.media, "escape");
    symlinkSync(external, link, "junction");
    const turn = f.owner.appendTurn({ sessionId: f.session.id, role: "assistant", content: "link", mediaRef: join(link, "image.png") });
    const recipes = new ImageEditRecipeStore(f.owner, f.media, () => true);
    expect(() => recipes.load({ ...f.identity, studioTurnId: turn.id }, actor)).toThrow("outside owned");
  });

  it("refuses corrupt persisted metadata instead of overwriting it", () => {
    const f = fixture();
    const saved = f.recipes.commit(f.identity, actor, adjustment, 0);
    const corruptor = new Database(f.db);
    corruptor.prepare("UPDATE studio_image_edit_recipes SET revision = 2 WHERE turn_id = ?").run(f.turn.id);
    try {
      expect(() => f.recipes.load(f.identity, actor)).toThrow("metadata is inconsistent");
      expect(() => f.recipes.commit(f.identity, actor, { kind: "reset" }, saved.revision)).toThrow("metadata is inconsistent");
    } finally {
      corruptor.prepare("UPDATE studio_image_edit_recipes SET revision = 1 WHERE turn_id = ?").run(f.turn.id);
      corruptor.close();
    }
    expect(f.recipes.load(f.identity, actor)).toEqual(saved);
  });

  it("rejects malformed recipes and unsupported source without writing", () => {
    const f = fixture();
    const saved = f.recipes.commit(f.identity, actor, adjustment, 0);
    expect(() => f.recipes.commit(f.identity, actor, { kind: "unexpected", value: NaN }, saved.revision)).toThrow("invalid");
    expect(f.recipes.load(f.identity, actor)).toEqual(saved);
    const raw = Buffer.from("not a PNG image");
    writeFileSync(f.source, raw);
    const recipes = new ImageEditRecipeStore(f.owner, f.media, () => true);
    expect(() => recipes.load({ ...f.identity, sourceSha256: hash(raw) }, actor)).toThrow("PNG source");
  });

  it("rejects video turns even with a matching image grant", () => {
    const f = fixture();
    const video = f.owner.createSession({ folderId: null, pillar: "video", title: "Video", modelId: "local-fixture" });
    const turn = f.owner.appendTurn({ sessionId: video.id, role: "assistant", content: "video", mediaRef: f.source });
    const recipes = new ImageEditRecipeStore(f.owner, f.media, () => true);
    expect(() => recipes.load({ ...f.identity, studioSessionId: video.id, studioTurnId: turn.id }, actor)).toThrow("Image Studio image is unavailable");
  });

  it("preserves committed history when another SQLite writer holds the database", () => {
    const f = fixture();
    const saved = f.recipes.commit(f.identity, actor, adjustment, 0);
    const competing = new Database(f.db);
    competing.exec("BEGIN IMMEDIATE");
    try {
      expect(() => f.recipes.commit(f.identity, actor, { kind: "reset" }, saved.revision)).toThrow("could not be stored");
    } finally {
      competing.exec("ROLLBACK");
      competing.close();
    }
    expect(f.recipes.load(f.identity, actor)).toEqual(saved);
  }, 15000);

  it("rolls back injected storage write failures without losing history", () => {
    const f = fixture();
    const saved = f.recipes.commit(f.identity, actor, adjustment, 0);
    const injector = new Database(f.db);
    injector.exec("CREATE TRIGGER reject_recipe_update BEFORE UPDATE ON studio_image_edit_recipes BEGIN SELECT RAISE(FAIL, 'injected storage failure'); END");
    try { expect(() => f.recipes.commit(f.identity, actor, { kind: "reset" }, saved.revision)).toThrow("could not be stored"); }
    finally { injector.exec("DROP TRIGGER reject_recipe_update"); injector.close(); }
    expect(f.recipes.load(f.identity, actor)).toEqual(saved);
  });
});

describe("recipe store describe and revision", () => {
  it("describes a turn by its verified source hash and tracks the stored revision", () => {
    const f = fixture();
    const described = f.recipes.describe(f.session.id, f.turn.id);
    expect(described.identity).toEqual(f.identity);
    expect(described.source.bytes).toEqual(png);
    expect(f.recipes.revision(f.identity, actor)).toBe(0);
    const saved = f.recipes.commit(f.identity, actor, adjustment, 0);
    expect(f.recipes.revision(f.identity, actor)).toBe(saved.revision);
    expect(() => f.recipes.revision({ ...f.identity, sourceSha256: "b".repeat(64) }, actor)).toThrow();
    f.revoke();
    expect(() => f.recipes.revision(f.identity, actor)).toThrow("no grant");
  });

  it("reports a changed source on revision without reading the image", () => {
    const f = fixture();
    f.recipes.commit(f.identity, actor, adjustment, 0);
    const other = { ...f.identity, sourceSha256: "c".repeat(64) };
    const recipes = new ImageEditRecipeStore(f.owner, f.media, () => true);
    expect(() => recipes.revision(other, actor)).toThrow(expect.objectContaining({ code: "SOURCE_CHANGED" }));
  });
});

describe("StudioSessionStore recipe scope guards", () => {
  const next = (identity: ImageEditIdentity) => reduceImageEditRecipe(createImageEditRecipe(identity, 1, 1), adjustment, 0);

  it("rejects a stale or repeated commit and rolls back the transaction", () => {
    const f = fixture();
    expect(() => f.owner.withImageRecipe(f.session.id, f.turn.id, (scope) => scope.commit(next(f.identity), 1)))
      .toThrow(expect.objectContaining({ code: "REVISION_CONFLICT" }));
    expect(() => f.owner.withImageRecipe(f.session.id, f.turn.id, (scope) => {
      scope.commit(next(f.identity), 0);
      scope.commit(next(f.identity), 0);
    })).toThrow(expect.objectContaining({ code: "REVISION_CONFLICT" }));
    expect(f.recipes.load(f.identity, actor).revision).toBe(0);
  });

  it("refuses a recipe that names another image", () => {
    const f = fixture();
    const foreign = next({ ...f.identity, studioTurnId: "another-turn" });
    expect(() => f.owner.withImageRecipe(f.session.id, f.turn.id, (scope) => scope.commit(foreign, 0)))
      .toThrow(expect.objectContaining({ code: "FORBIDDEN" }));
    expect(f.recipes.load(f.identity, actor).revision).toBe(0);
  });

  it("refuses an asynchronous operation instead of committing outside the transaction", () => {
    const f = fixture();
    expect(() => f.owner.withImageRecipe(f.session.id, f.turn.id, async () => undefined))
      .toThrow(expect.objectContaining({ code: "STORAGE_UNAVAILABLE" }));
  });
});
