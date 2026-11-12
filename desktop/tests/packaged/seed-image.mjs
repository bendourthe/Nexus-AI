#!/usr/bin/env node
/**
 * v2.16.2 Phase 2 (T006): owned profile allocation and Image Studio fixture
 * seeding for the packaged image-edit check.
 *
 * Everything here is test-only. The profile is a new exclusive folder; every
 * store path is resolved by the candidate's own storage code (bundled from
 * source and run under the app's Node runtime) and must sit inside that folder
 * before anything is written. Seeding uses the production write path for a
 * generated image: `persistGeneratedPng` into the generated-images root, then
 * `StudioSessionStore.createSession` and an assistant `appendTurn` naming it.
 * No SQLite rows are written by hand and no authorizer is installed.
 *
 * Usage: node seed-image.mjs --exe <nexus-shell.exe> --node <node.exe> --png <file> [--root <new empty dir>]
 */
import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(HERE, "..", "..", "..");
const OWNER_FILE = "nexus-test-owner.json";

export function sha256File(file) {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

/** True when `child` is `root` or a descendant, compared after resolution. */
export function isInside(root, child) {
  const rel = path.relative(path.resolve(root), path.resolve(child));
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

/**
 * Allocate a new exclusive owned root. With `requested`, the folder must not
 * exist yet (an occupied root is refused before any write); without it, a
 * fresh temporary folder is created. The owner file is written exclusively,
 * so two runs can never share a root.
 */
export function allocateOwnedRoot(requested) {
  let root;
  if (requested) {
    const absolute = path.resolve(requested);
    if (fs.existsSync(absolute)) {
      throw new Error(`owned-root-occupied: ${absolute} already exists`);
    }
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.mkdirSync(absolute);
    root = absolute;
  } else {
    root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "nexus-owned-"));
  }
  const real = fs.realpathSync(root);
  if (real !== root) {
    throw new Error(`owned-root-aliased: ${root} resolves to ${real}`);
  }
  if (fs.readdirSync(root).length !== 0) {
    throw new Error(`owned-root-occupied: ${root} is not empty`);
  }
  fs.writeFileSync(
    path.join(root, OWNER_FILE),
    JSON.stringify({ pid: process.pid, runId: randomUUID(), createdAt: new Date().toISOString() }),
    { flag: "wx" },
  );
  return root;
}

/**
 * The child-only environment for the owned profile. The shell reads
 * USERPROFILE/HOME, Node's `os.homedir()` reads USERPROFILE, WebView2 honors
 * WEBVIEW2_USER_DATA_FOLDER, and APPDATA/LOCALAPPDATA/TEMP cover the rest.
 * NEXUS_NODE_PATH keeps the app on the runtime it was built for, because the
 * provisioned runtime lives under the real LOCALAPPDATA.
 */
export function ownedEnvironment(root, base, nodeExe) {
  const home = path.join(root, "home");
  const env = { ...base };
  for (const key of Object.keys(env)) {
    if (/^(NEXUS_|WEBVIEW2_)/i.test(key)) delete env[key];
  }
  Object.assign(env, {
    USERPROFILE: home,
    HOME: home,
    HOMEDRIVE: path.parse(home).root.replace(/\\$/, ""),
    HOMEPATH: home.slice(path.parse(home).root.length - 1),
    APPDATA: path.join(home, "AppData", "Roaming"),
    LOCALAPPDATA: path.join(home, "AppData", "Local"),
    TEMP: path.join(root, "tmp"),
    TMP: path.join(root, "tmp"),
    WEBVIEW2_USER_DATA_FOLDER: path.join(root, "webview2"),
    NEXUS_NODE_PATH: nodeExe,
  });
  return env;
}

export function createOwnedFolders(env) {
  for (const key of ["USERPROFILE", "APPDATA", "LOCALAPPDATA", "TEMP", "WEBVIEW2_USER_DATA_FOLDER"]) {
    fs.mkdirSync(env[key], { recursive: true });
  }
}

// The seeder entry is bundled from the candidate source, so path resolution
// and the store schema come from the same code the executable was built from.
const SEED_ENTRY = `
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { catalogRoot, nexusAiHome, nexusHome } from "./core/storage/paths";
import { resolveSessionsDbPath } from "./core/generations/paths";
import { StudioSessionStore } from "./core/generations/StudioSessionStore";
import { generatedImagesRoot, persistGeneratedPng } from "./desktop/sidecar/src/studio/generatedImages";

const [mode, pngPath] = process.argv.slice(2);
const home = os.homedir();
const paths = {
  osHomedir: home,
  nexusHome: nexusHome(),
  nexusAiHome: nexusAiHome(),
  hubCatalog: catalogRoot(),
  sessionsDb: resolveSessionsDbPath(),
  generatedImages: generatedImagesRoot(),
};
if (mode === "paths") {
  process.stdout.write(JSON.stringify({ paths }) + "\\n");
} else if (mode === "seed") {
  const bytes = fs.readFileSync(pngPath);
  const saved = persistGeneratedPng(bytes.toString("base64"), paths.generatedImages);
  if (!saved) throw new Error("fixture-not-png");
  fs.mkdirSync(path.dirname(paths.sessionsDb), { recursive: true });
  const store = new StudioSessionStore(paths.sessionsDb);
  try {
    const session = store.createSession({ pillar: "image", folderId: null, title: "v2.16.2 packaged edit fixture", modelId: "fixture" });
    const turn = store.appendTurn({ sessionId: session.id, role: "assistant", content: "Synthetic fixture image for the packaged edit check.", mediaRef: saved.outputPath });
    process.stdout.write(JSON.stringify({ paths, saved, sessionId: session.id, turnId: turn.id }) + "\\n");
  } finally {
    store.close();
  }
} else {
  throw new Error("usage: <paths|seed> [png]");
}
`;

/** Bundle the seeder entry from source into `outDir`; better-sqlite3 stays external. */
export async function buildSeeder(outDir) {
  const { build } = await import("esbuild");
  const outfile = path.join(outDir, "seeder.cjs");
  await build({
    stdin: { contents: SEED_ENTRY, resolveDir: REPO_ROOT, loader: "ts", sourcefile: "seed-entry.ts" },
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "node22",
    outfile,
    external: ["better-sqlite3"],
    logLevel: "silent",
  });
  return outfile;
}

/**
 * Candidate identity for the seeder and the executable: the source commit,
 * whether the tree that feeds both is clean, and the packaged files' hashes.
 * A dirty tree cannot prove the executable and seeder share a build.
 */
export function candidateIdentity(exe) {
  const git = (...args) =>
    spawnSync("git", ["-C", REPO_ROOT, ...args], { encoding: "utf8", windowsHide: true }).stdout.trim();
  // `modules` is bundled into the sidecar too (for example the built-in skills).
  const dirty = git("status", "--porcelain", "--", "core", "modules", "desktop/sidecar/src", "desktop/src", "desktop/src-tauri/src");
  const exeDir = path.dirname(exe);
  const sidecarMain = path.join(exeDir, "sidecar", "dist", "main.js");
  const nativeModule = path.join(exeDir, "sidecar", "dist", "node_modules", "better-sqlite3", "build", "Release", "better_sqlite3.node");
  for (const required of [exe, sidecarMain, nativeModule]) {
    if (!fs.existsSync(required)) throw new Error(`candidate-incomplete: ${required} missing`);
  }
  return {
    sourceCommit: git("rev-parse", "HEAD"),
    sourceClean: dirty === "",
    exeSha256: sha256File(exe),
    sidecarMainSha256: sha256File(sidecarMain),
    nativeModuleSha256: sha256File(nativeModule),
    nativeModulesDir: path.join(exeDir, "sidecar", "dist", "node_modules"),
  };
}

function runSeeder(seeder, args, env, identity, nodeExe) {
  const result = spawnSync(nodeExe, [seeder, ...args], {
    encoding: "utf8",
    env: { ...env, NODE_PATH: identity.nativeModulesDir },
    windowsHide: true,
    timeout: 60_000,
  });
  if (result.status !== 0) {
    const detail = `${result.stderr || ""}${result.error?.message || ""}`.trim().slice(-1500);
    if (/NODE_MODULE_VERSION|ERR_DLOPEN_FAILED/.test(detail)) {
      throw new Error(`native-abi-unavailable: ${detail}`);
    }
    throw new Error(`seeder-failed (${result.status ?? "no status"}): ${detail}`);
  }
  return JSON.parse(result.stdout.trim().split("\n").pop());
}

/** Every resolved store path must be inside the owned root and match the child home. */
export function assertOwnedPaths(paths, root, env) {
  const problems = [];
  if (path.resolve(paths.osHomedir) !== path.resolve(env.USERPROFILE)) {
    problems.push(`os.homedir() resolved ${paths.osHomedir}, expected ${env.USERPROFILE}`);
  }
  for (const [name, value] of Object.entries(paths)) {
    if (!isInside(root, value)) problems.push(`${name} escapes the owned root: ${value}`);
  }
  if (problems.length > 0) throw new Error(`owned-path-escape: ${problems.join("; ")}`);
}

/** Allocate, resolve, prove and seed. Returns the manifest the flow records. */
export async function seedOwnedProfile({ exe, nodeExe, png, root: requestedRoot }) {
  if (!fs.existsSync(png)) throw new Error(`fixture-missing: ${png}`);
  const identity = candidateIdentity(exe);
  if (!identity.sourceClean) {
    throw new Error("candidate-mismatch: the source tree that builds the executable has uncommitted changes");
  }
  const root = allocateOwnedRoot(requestedRoot);
  const env = ownedEnvironment(root, process.env, nodeExe);
  createOwnedFolders(env);
  const seeder = await buildSeeder(path.join(root, "tmp"));
  const resolved = runSeeder(seeder, ["paths"], env, identity, nodeExe);
  assertOwnedPaths(resolved.paths, root, env);
  const seeded = runSeeder(seeder, ["seed", png], env, identity, nodeExe);
  assertOwnedPaths(seeded.paths, root, env);
  const originalSha256 = sha256File(png);
  if (seeded.saved.outputHash !== originalSha256 || sha256File(seeded.saved.outputPath) !== originalSha256) {
    throw new Error("fixture-copy-mismatch: the seeded image does not match the fixture bytes");
  }
  return {
    root,
    env,
    identity,
    paths: seeded.paths,
    fixture: { path: png, sha256: originalSha256, seededPath: seeded.saved.outputPath },
    sessionId: seeded.sessionId,
    turnId: seeded.turnId,
    seederSha256: sha256File(seeder),
  };
}

/**
 * Remove an owned root. Refuses a folder without this run's owner file and
 * never follows a link out of it (`rm` removes links, not their targets).
 */
export function removeOwnedRoot(root) {
  const owner = path.join(root, OWNER_FILE);
  if (!fs.existsSync(owner)) throw new Error(`not-owned: ${root} has no owner file`);
  if (fs.lstatSync(root).isSymbolicLink()) throw new Error(`not-owned: ${root} is a link`);
  fs.rmSync(root, { recursive: true, force: true });
}

function argValue(name) {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : undefined;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const exe = argValue("--exe");
  const nodeExe = argValue("--node");
  const png = argValue("--png");
  if (!exe || !nodeExe || !png) {
    process.stderr.write("usage: node seed-image.mjs --exe <exe> --node <node.exe> --png <file> [--root <dir>]\n");
    process.exit(2);
  }
  try {
    const manifest = await seedOwnedProfile({ exe, nodeExe, png, root: argValue("--root") });
    const { env, ...printable } = manifest;
    process.stdout.write(`${JSON.stringify(printable)}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}
