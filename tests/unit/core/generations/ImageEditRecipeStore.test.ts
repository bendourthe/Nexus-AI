import { afterEach, describe, expect, it } from "vitest";
import { createHash, randomUUID } from "node:crypto";
import { linkSync, mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { StudioSessionStore, type ImageEditCheckpoint } from "../../../../core/generations/StudioSessionStore.js";
import { ImageEditRecipeStore, type ImageEditAccess } from "../../../../core/generations/ImageEditRecipeStore.js";
import { createImageEditRecipe, deriveImageEditState, reduceImageEditRecipe, type ImageEditIdentity } from "../../../../core/image/ImageEditRecipe.js";

const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGP4DwQACfsD/fteaysAAAAASUVORK5CYII=", "base64");
const hash = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
const actor = { callerId: "fixture-ui", runId: "fixture-run", grantId: "fixture-owned-image" };
const roots: string[] = [];
const sessions: StudioSessionStore[] = [];
const adjustment = { kind: "adjustments", values: { brightness: 120, contrast: 130, saturation: 80, sharpness: 25 } };

function checkpointMetadata(): Omit<ImageEditCheckpoint, "recipe"> {
  return { id: randomUUID(), requestId: randomUUID(), approvalId: randomUUID(),
    callerId: actor.callerId, runId: actor.runId, createdAt: 1000 };
}

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

describe("hard-linked sources", () => {
  it("refuses a source with more than one link, which can name a file kept elsewhere", () => {
    const f = fixture();
    linkSync(f.source, join(f.root, "outside-copy.png"));
    expect(() => f.recipes.describe(f.session.id, f.turn.id)).toThrow(expect.objectContaining({ code: "FORBIDDEN" }));
  });
});

describe("durable approval checkpoints", () => {
  it("recovers the complete approval-time redo branch across database close/reopen at a new revision", () => {
    const f = fixture();
    let approved = f.recipes.commit(f.identity, actor, adjustment, 0);
    approved = f.recipes.commit(f.identity, actor, { kind: "mark", mark: {
      kind: "text", color: "#ffffff", size: 32, text: "Recover this", x: 0, y: 0,
    } }, approved.revision);
    approved = f.recipes.commit(f.identity, actor, { kind: "undo" }, approved.revision);
    const metadata = checkpointMetadata();
    const checkpoint = f.recipes.captureCheckpoint(f.identity, metadata);
    expect(checkpoint).toEqual({ ...metadata, recipe: approved });
    expect(approved.cursor).toBe(1);
    expect(approved.commands).toHaveLength(2);
    expect(f.recipes.load(f.identity, actor)).toEqual(approved);

    const branched = f.recipes.commit(f.identity, actor, { kind: "reset" }, approved.revision);
    expect(deriveImageEditState(branched).marks).toEqual([]);
    expect(branched.commands).not.toContainEqual(approved.commands[1]);
    f.owner.close();
    const owner = new StudioSessionStore(f.db);
    sessions.push(owner);
    const reopened = new ImageEditRecipeStore(owner, f.media, f.authorize);
    const restored = reopened.restoreCheckpoint(f.identity, actor, checkpoint.id, branched.revision);
    expect(restored).toEqual({ ...approved, revision: branched.revision + 1 });
    const redone = reopened.commit(f.identity, actor, { kind: "redo" }, restored.revision);
    expect(deriveImageEditState(redone).marks).toEqual([expect.objectContaining({ text: "Recover this" })]);
    expect(owner.withImageRecipe(f.session.id, f.turn.id, (scope) => scope.findCheckpoint(checkpoint.id))).toEqual(checkpoint);
    expect(readFileSync(f.source)).toEqual(png);
  });

  it("captures revision zero without changing live state and keeps one immutable snapshot per attempt", () => {
    const f = fixture();
    const metadata = checkpointMetadata();
    const first = f.recipes.captureCheckpoint(f.identity, metadata);
    expect(first.recipe).toEqual(createImageEditRecipe(f.identity, 1, 1));
    expect(f.owner.withImageRecipe(f.session.id, f.turn.id, (scope) => ({ revision: scope.storedRevision, json: scope.recipeJson })))
      .toEqual({ revision: 0, json: null });
    const edited = f.recipes.commit(f.identity, actor, adjustment, 0);
    expect(f.recipes.captureCheckpoint(f.identity, { ...metadata, createdAt: 2000 })).toEqual(first);
    expect(f.recipes.listCheckpoints(f.identity, actor)).toEqual([{
      id: metadata.id, createdAt: 1000, callerId: actor.callerId, runId: actor.runId, revision: 0, cursor: 0, commands: 0,
    }]);
    expect(() => f.recipes.captureCheckpoint(f.identity, { ...metadata, approvalId: "another-approval" }))
      .toThrow(expect.objectContaining({ code: "FORBIDDEN" }));
    const retry = f.recipes.captureCheckpoint(f.identity, checkpointMetadata());
    expect(retry.id).not.toBe(first.id);
    expect(retry.recipe).toEqual(edited);
    expect(f.recipes.listCheckpoints(f.identity, actor)).toHaveLength(2);
    expect(f.recipes.load(f.identity, actor)).toEqual(edited);
  });

  it.each([
    { id: "" }, { requestId: "x".repeat(257) }, { approvalId: "" },
    { callerId: "" }, { runId: "" }, { createdAt: -1 }, { createdAt: 1.5 },
  ])("rejects invalid approval metadata %j without creating recovery data", (invalid) => {
    const f = fixture();
    expect(() => f.recipes.captureCheckpoint(f.identity, { ...checkpointMetadata(), ...invalid }))
      .toThrow(expect.objectContaining({ code: "INVALID_RECIPE" }));
    expect(f.recipes.listCheckpoints(f.identity, actor)).toEqual([]);
    expect(f.recipes.load(f.identity, actor).revision).toBe(0);
  });

  it("returns bounded ordered metadata pages scoped to the selected turn and refuses a foreign cursor", () => {
    const f = fixture();
    const captured: ImageEditCheckpoint[] = [];
    for (let index = 0; index < 52; index += 1) {
      captured.push(f.recipes.captureCheckpoint(f.identity, { ...checkpointMetadata(), createdAt: 1000 + index }));
    }
    const page = f.recipes.listCheckpoints(f.identity, actor);
    expect(page).toHaveLength(50);
    expect(page.map((entry) => entry.id)).toEqual(captured.slice(2).reverse().map((entry) => entry.id));
    expect(page[0]).toEqual({ id: captured[51]!.id, createdAt: 1051, callerId: actor.callerId,
      runId: actor.runId, revision: 0, cursor: 0, commands: 0 });
    const older = f.recipes.listCheckpoints(f.identity, actor, page.at(-1)!.id);
    expect(older.map((entry) => entry.id)).toEqual([captured[1]!.id, captured[0]!.id]);
    expect(f.recipes.listCheckpoints(f.identity, actor, older.at(-1)!.id)).toEqual([]);

    const other = f.owner.appendTurn({ sessionId: f.session.id, role: "assistant", content: "other turn", mediaRef: f.source });
    const foreignIdentity = { ...f.identity, studioTurnId: other.id };
    const foreign = f.recipes.captureCheckpoint(foreignIdentity, checkpointMetadata());
    expect(f.owner.withImageRecipe(f.session.id, other.id, (scope) => scope.checkpoints()).map((entry) => entry.id)).toEqual([foreign.id]);
    expect(f.recipes.listCheckpoints(f.identity, actor, foreign.id)).toEqual([]);
    expect(f.recipes.listCheckpoints(f.identity, actor, "missing-cursor")).toEqual([]);
    expect(f.recipes.listCheckpoints(f.identity, actor)).toEqual(page);
    expect(f.recipes.restoreCheckpoint(f.identity, actor, captured[0]!.id, 0).revision).toBe(1);
    expect(f.recipes.listCheckpoints(f.identity, actor)).toEqual(page);
  });

  it("enforces restore revision, checkpoint ownership and caller authority without replacing live state", () => {
    const f = fixture();
    const checkpoint = f.recipes.captureCheckpoint(f.identity, checkpointMetadata());
    const saved = f.recipes.commit(f.identity, actor, adjustment, 0);
    const metadata = f.recipes.listCheckpoints(f.identity, actor);
    expect(() => f.recipes.restoreCheckpoint(f.identity, actor, checkpoint.id, 0))
      .toThrow(expect.objectContaining({ code: "REVISION_CONFLICT" }));
    expect(() => f.recipes.restoreCheckpoint(f.identity, actor, "missing-checkpoint", saved.revision))
      .toThrow(expect.objectContaining({ code: "FORBIDDEN" }));
    for (const denied of [{ ...actor, callerId: "other" }, { ...actor, runId: "other" }, { ...actor, grantId: "other" }]) {
      expect(() => f.recipes.listCheckpoints(f.identity, denied)).toThrow(expect.objectContaining({ code: "FORBIDDEN" }));
      expect(() => f.recipes.restoreCheckpoint(f.identity, denied, checkpoint.id, saved.revision))
        .toThrow(expect.objectContaining({ code: "FORBIDDEN" }));
    }
    const otherSession = f.owner.createSession({ folderId: null, pillar: "image", title: "Other", modelId: "fixture" });
    const otherTurn = f.owner.appendTurn({ sessionId: otherSession.id, role: "assistant", content: "shared source", mediaRef: f.source });
    const otherIdentity = { ...f.identity, studioSessionId: otherSession.id, studioTurnId: otherTurn.id };
    const otherActor = { ...actor, grantId: "other-viewer" };
    const otherRecipes = new ImageEditRecipeStore(f.owner, f.media, (access, identity) => access.grantId === otherActor.grantId
      && identity.studioSessionId === otherSession.id && identity.studioTurnId === otherTurn.id && identity.sourceSha256 === f.identity.sourceSha256);
    expect(otherRecipes.listCheckpoints(otherIdentity, otherActor)).toEqual([]);
    expect(() => otherRecipes.restoreCheckpoint(otherIdentity, otherActor, checkpoint.id, 0))
      .toThrow(expect.objectContaining({ code: "FORBIDDEN" }));
    expect(otherRecipes.load(otherIdentity, otherActor).revision).toBe(0);
    expect(f.recipes.load(f.identity, actor)).toEqual(saved);
    expect(f.recipes.listCheckpoints(f.identity, actor)).toEqual(metadata);
  });

  it("rejects changed source bytes during checkpoint capture, listing and recovery without changing stored history", () => {
    const f = fixture();
    const checkpoint = f.recipes.captureCheckpoint(f.identity, checkpointMetadata());
    const saved = f.recipes.commit(f.identity, actor, adjustment, 0);
    writeFileSync(f.source, Buffer.concat([png, Buffer.from("changed original")]));
    for (const operation of [
      () => f.recipes.captureCheckpoint(f.identity, checkpointMetadata()),
      () => f.recipes.listCheckpoints(f.identity, actor),
      () => f.recipes.restoreCheckpoint(f.identity, actor, checkpoint.id, saved.revision),
    ]) expect(operation).toThrow(expect.objectContaining({ code: "SOURCE_CHANGED" }));
    writeFileSync(f.source, png);
    expect(f.recipes.load(f.identity, actor)).toEqual(saved);
    expect(f.owner.withImageRecipe(f.session.id, f.turn.id, (scope) => scope.findCheckpoint(checkpoint.id))).toEqual(checkpoint);
    expect(f.recipes.listCheckpoints(f.identity, actor)).toHaveLength(1);
  });

  it("rolls back recovery when authorization is revoked after its recipe write", () => {
    const f = fixture();
    const checkpoint = f.recipes.captureCheckpoint(f.identity, checkpointMetadata());
    const saved = f.recipes.commit(f.identity, actor, adjustment, 0);
    let checks = 0;
    const revoked = new ImageEditRecipeStore(f.owner, f.media, (access, identity) => ++checks < 3 && f.authorize(access, identity));
    expect(() => revoked.restoreCheckpoint(f.identity, actor, checkpoint.id, saved.revision))
      .toThrow(expect.objectContaining({ code: "FORBIDDEN" }));
    expect(checks).toBe(3);
    expect(f.recipes.load(f.identity, actor)).toEqual(saved);
    expect(f.owner.withImageRecipe(f.session.id, f.turn.id, (scope) => scope.findCheckpoint(checkpoint.id))).toEqual(checkpoint);
    expect(readFileSync(f.source)).toEqual(png);
  });

  it("rolls back recovery when source ownership changes between validation and acknowledgment", () => {
    const f = fixture();
    const checkpoint = f.recipes.captureCheckpoint(f.identity, checkpointMetadata());
    const saved = f.recipes.commit(f.identity, actor, adjustment, 0);
    let checks = 0;
    const racing = new ImageEditRecipeStore(f.owner, f.media, (access, identity) => {
      if (++checks === 2) writeFileSync(f.source, Buffer.concat([png, Buffer.from("changed during restore")]));
      return f.authorize(access, identity);
    });
    expect(() => racing.restoreCheckpoint(f.identity, actor, checkpoint.id, saved.revision))
      .toThrow(expect.objectContaining({ code: "SOURCE_CHANGED" }));
    writeFileSync(f.source, png);
    expect(f.recipes.load(f.identity, actor)).toEqual(saved);
    expect(f.owner.withImageRecipe(f.session.id, f.turn.id, (scope) => scope.findCheckpoint(checkpoint.id))).toEqual(checkpoint);
  });

  it("rolls back the checkpoint and recipe together when the owning SQLite transaction fails", () => {
    const f = fixture();
    const recipe = createImageEditRecipe(f.identity, 1, 1);
    const metadata = checkpointMetadata();
    expect(() => f.owner.withImageRecipe(f.session.id, f.turn.id, (scope) => {
      scope.checkpoint({ ...metadata, recipe });
      scope.commit(reduceImageEditRecipe(recipe, adjustment, 0), 0);
      throw new Error("transaction aborted after both writes");
    })).toThrow("transaction aborted after both writes");
    expect(f.recipes.listCheckpoints(f.identity, actor)).toEqual([]);
    expect(f.recipes.load(f.identity, actor)).toEqual(recipe);
    expect(readFileSync(f.source)).toEqual(png);
  });

  it("fails closed on an injected checkpoint storage failure and retries against the current recipe", () => {
    const f = fixture();
    const saved = f.recipes.commit(f.identity, actor, adjustment, 0);
    const injector = new Database(f.db);
    injector.exec("CREATE TRIGGER reject_checkpoint BEFORE INSERT ON studio_image_edit_checkpoints BEGIN SELECT RAISE(ABORT, 'injected checkpoint failure'); END");
    try {
      expect(() => f.recipes.captureCheckpoint(f.identity, checkpointMetadata()))
        .toThrow(expect.objectContaining({ code: "STORAGE_UNAVAILABLE" }));
      expect(f.recipes.listCheckpoints(f.identity, actor)).toEqual([]);
      expect(f.recipes.load(f.identity, actor)).toEqual(saved);
    } finally {
      injector.exec("DROP TRIGGER reject_checkpoint");
      injector.close();
    }
    const edited = f.recipes.commit(f.identity, actor, { kind: "reset" }, saved.revision);
    expect(f.recipes.captureCheckpoint(f.identity, checkpointMetadata()).recipe).toEqual(edited);
  });

  it("refuses corrupted checkpoint recipes rather than overwriting current edits", () => {
    const f = fixture();
    const checkpoint = f.recipes.captureCheckpoint(f.identity, checkpointMetadata());
    const saved = f.recipes.commit(f.identity, actor, adjustment, 0);
    const corruptor = new Database(f.db);
    try {
      for (const [recipe, code] of [
        [{ ...checkpoint.recipe, cursor: 10 }, "INVALID_RECIPE"],
        [{ ...checkpoint.recipe, identity: { ...checkpoint.recipe.identity, sourceSha256: "b".repeat(64) } }, "SOURCE_CHANGED"],
      ] as const) {
        corruptor.prepare("UPDATE studio_image_edit_checkpoints SET checkpoint_json = ? WHERE id = ?")
          .run(JSON.stringify({ ...checkpoint, recipe }), checkpoint.id);
        expect(() => f.recipes.restoreCheckpoint(f.identity, actor, checkpoint.id, saved.revision))
          .toThrow(expect.objectContaining({ code }));
        expect(f.recipes.load(f.identity, actor)).toEqual(saved);
      }
    } finally { corruptor.close(); }
    expect(readFileSync(f.source)).toEqual(png);
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
