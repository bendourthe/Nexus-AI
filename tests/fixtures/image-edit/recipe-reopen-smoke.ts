import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { StudioSessionStore } from "../../../core/generations/StudioSessionStore.js";
import { ImageEditRecipeStore } from "../../../core/generations/ImageEditRecipeStore.js";
import { deriveImageEditState, type ImageEditIdentity, type ImageEditRecipe } from "../../../core/image/ImageEditRecipe.js";

const [mode, path] = process.argv.slice(2);
if (!["create", "reopen"].includes(mode) || !path) throw new Error("Use create or reopen with an owned disposable root.");
const root = resolve(path);
const actor = { callerId: "functional-fixture", runId: "functional-run", grantId: "selected-fixture-image" };
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGP4DwQACfsD/fteaysAAAAASUVORK5CYII=", "base64");
const hash = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
const manifestPath = join(root, "manifest.json");
let identity: ImageEditIdentity;
let expected: ImageEditRecipe | null = null;
if (mode === "create") {
  if (existsSync(manifestPath) || existsSync(join(root, "sessions.db")) || existsSync(join(root, "source.png"))) {
    throw new Error("Refusing to overwrite existing smoke data.");
  }
  mkdirSync(root, { recursive: true });
  writeFileSync(join(root, "source.png"), png, { flag: "wx" });
} else {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as { identity: ImageEditIdentity; recipe: ImageEditRecipe };
  identity = manifest.identity;
  expected = manifest.recipe;
}
const owner = new StudioSessionStore(join(root, "sessions.db"));
try {
  if (mode === "create") {
    const session = owner.createSession({ pillar: "image", folderId: null, title: "Functional image", modelId: "fixture" });
    const turn = owner.appendTurn({ sessionId: session.id, role: "assistant", content: "image", mediaRef: join(root, "source.png") });
    identity = { studioSessionId: session.id, studioTurnId: turn.id, sourceSha256: hash(png) };
  }
  const recipes = new ImageEditRecipeStore(owner, root, (access, requested) =>
    access.callerId === actor.callerId && access.runId === actor.runId && access.grantId === actor.grantId
    && requested.studioSessionId === identity.studioSessionId && requested.studioTurnId === identity.studioTurnId
    && requested.sourceSha256 === identity.sourceSha256);
  let recipe = recipes.load(identity!, actor);
  if (mode === "create") {
    for (const command of [
      { kind: "adjustments", values: { brightness: 120, contrast: 130, saturation: 80, sharpness: 25 } },
      { kind: "mark", mark: { kind: "stroke", color: "#ff0000", size: 8, points: [{ x: 0, y: 0 }, { x: 1, y: 1 }] } },
      { kind: "mark", mark: { kind: "text", color: "#ffffff", size: 32, text: "Nexus", x: 0, y: 0 } },
      { kind: "undo" }, { kind: "redo" }, { kind: "undo" },
    ]) recipe = recipes.commit(identity!, actor, command, recipe.revision);
    writeFileSync(manifestPath, JSON.stringify({ identity: identity!, recipe }, null, 2), { flag: "wx" });
  } else {
    if (JSON.stringify(recipe) !== JSON.stringify(expected)) throw new Error("Reopened recipe/history/cursor differs.");
    recipe = recipes.commit(identity!, actor, { kind: "redo" }, recipe.revision);
    if (deriveImageEditState(recipe).marks.length !== 2) throw new Error("Restart redo did not restore text.");
  }
  const currentHash = hash(readFileSync(join(root, "source.png")));
  if (currentHash !== identity!.sourceSha256) throw new Error("Source bytes changed.");
  process.stdout.write(JSON.stringify({ mode, pid: process.pid, revision: recipe.revision, cursor: recipe.cursor,
    commands: recipe.commands.length, marks: deriveImageEditState(recipe).marks.length, originalSha256: currentHash,
    sameSource: true, scope: "Built store facade in separate processes; fixture-owned grant, no UI or human issuer claim." }) + "\n");
} finally {
  owner.close();
}
