#!/usr/bin/env node
/**
 * v2.16.2 packaged image-edit check (plan gates B3-B6).
 *
 * Usage:
 *   node desktop/tests/packaged/image-edit-flow.mjs --exe <nexus-shell.exe> --sha256 <exe sha256>
 *        --out <new output dir> [--mode edit|preflight] [--control lost-persistence|source-mutation]
 *        [--node <node.exe>] [--png <fixture>]
 *
 * Modes:
 *   preflight  Phase 2 (B3): refuse an occupied or escaping root before any
 *              write, seed an owned profile through the real store, launch the
 *              pinned executable inside an owned job, prove the debugging
 *              listener, the sidecar and the seeded session belong to that
 *              profile, stop and relaunch it, prove an interrupted runner
 *              leaves nothing running, and prove the real profile unchanged.
 *   edit       Phase 3 (B4-B6, default): the same owned profile, then the
 *              ordinary UI path: open Image Studio, open the seeded session,
 *              open its viewer with Edit, raise Brightness with real arrow-key
 *              input, wait for "Edits saved", save the edited version, stop the
 *              owned app, relaunch the same artifact and profile, reopen the
 *              viewer and read the persisted Brightness back. The saved PNG is
 *              compared with pixels computed from the fixture, and the source
 *              image bytes and the real profile must be unchanged.
 *
 * Controls (edit mode only) inject one defect so the check must fail:
 *   lost-persistence  restore the owned store to its pre-edit copy before the restart
 *   source-mutation   change one byte of the seeded source image after the save
 *
 * Exit codes: 0 only for a fully observed pass that the behavioral judge in
 * smoke.mjs accepts; 1 for a failed observation; 2 when a prerequisite is
 * missing or malformed. One JSON line goes to stdout; the full report is
 * <out>/report.json. The owned root is kept on failure and removed on a pass.
 */
import { spawn, spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { inflateSync } from "node:zlib";
import { fileURLToPath, pathToFileURL } from "node:url";

import { connectDevtools, launchOwned, pidAlive, withStage } from "./launch-probe.mjs";
import {
  allocateOwnedRoot,
  assertOwnedPaths,
  isInside,
  removeOwnedRoot,
  seedOwnedProfile,
  sha256File,
} from "./seed-image.mjs";
import { BEHAVIORAL_SCHEMA, evaluateBehavioralReport } from "./smoke.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_PNG = path.join(HERE, "fixtures", "edit-source.png");
const SESSION_TITLE = "v2.16.2 packaged edit fixture";

/** Action timeouts, registered before any behavioral run (launch timeouts live in launch-probe). */
export const ACTION_TIMEOUTS_MS = Object.freeze({ route: 30_000, open: 30_000, save: 30_000, download: 30_000 });
/** The edit: ten ArrowRight steps on the Brightness slider, from neutral 100 to 110. */
export const BRIGHTNESS_STEPS = 10;
export const NEUTRAL_BRIGHTNESS = 100;
/** Per-channel tolerance for browser rounding when comparing rendered pixels. */
export const PIXEL_TOLERANCE = 2;

const PREREQUISITE_ERRORS = [
  "executable-missing",
  "executable-identity-unpinned",
  "executable-identity-mismatch",
  "candidate-incomplete",
  "candidate-mismatch",
  "native-abi-unavailable",
  "fixture-missing",
  "fixture-not-png",
  "owned-launch-failed",
  "job-owner-exited",
  "port-collision",
  "download-pin-unavailable",
  "target-unowned: nothing is listening",
];

/** 2 for a missing or malformed prerequisite, 1 for any other failed observation. */
export function exitCodeFor(message) {
  return PREREQUISITE_ERRORS.some((prefix) => String(message).startsWith(prefix)) ? 2 : 1;
}

// ---------------------------------------------------------------------------
// Real-profile preservation
// ---------------------------------------------------------------------------

/** The maintainer's real Nexus data, observed by size, time and content hash. */
export function realProfileSentinels(home = os.homedir(), localAppData = process.env.LOCALAPPDATA ?? "") {
  return [
    path.join(home, ".nexus", "generations", "sessions.db"),
    path.join(home, ".nexus", "generations", "images"),
    path.join(home, ".nexus", "generations", "exports"),
    path.join(home, ".nexus", "settings.json"),
    path.join(home, ".nexus-ai", "catalog"),
    localAppData ? path.join(localAppData, "ai.nexus.shell") : "",
    path.join(home, "Downloads"),
  ].filter(Boolean);
}

export function snapshot(paths) {
  const out = {};
  for (const target of paths) {
    try {
      const stat = fs.statSync(target);
      out[target] = stat.isFile()
        ? { kind: "file", size: stat.size, mtimeMs: stat.mtimeMs, sha256: sha256File(target) }
        : { kind: "dir", manifest: directoryManifest(target) };
    } catch {
      out[target] = { kind: "absent" };
    }
  }
  return out;
}

/**
 * Digest of every entry under `dir` (relative path, size, mtime), so an
 * in-place overwrite deep in a sentinel folder is detected, not only a change
 * to the folder itself. Links are listed, never followed.
 */
export function directoryManifest(dir, limit = 50_000) {
  const rows = [];
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (rows.length >= limit) throw new Error(`sentinel-too-large: ${dir} has more than ${limit} entries`);
      const full = path.join(current, entry.name);
      const stat = fs.lstatSync(full);
      rows.push(`${path.relative(dir, full)}|${stat.isDirectory() ? "d" : stat.size}|${Math.trunc(stat.mtimeMs)}`);
      if (entry.isDirectory() && !entry.isSymbolicLink()) walk(full);
    }
  };
  walk(dir);
  rows.sort();
  return { entries: rows.length, sha256: createHash("sha256").update(rows.join("\n")).digest("hex") };
}

export function compareSnapshots(before, after) {
  return Object.keys(before).filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
}

// ---------------------------------------------------------------------------
// PNG decoding and the expected render (test-only, 8-bit RGB/RGBA)
// ---------------------------------------------------------------------------

/** Decode an 8-bit, non-interlaced RGB or RGBA PNG into RGBA pixels. */
export function decodePng(bytes) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (bytes.length < 8 || !bytes.subarray(0, 8).equals(signature)) throw new Error("png-invalid: bad signature");
  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = -1;
  const idat = [];
  let first = true;
  while (offset + 8 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString("ascii", offset + 4, offset + 8);
    if (offset + 12 + length > bytes.length) throw new Error(`png-invalid: truncated ${type} chunk`);
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    if (first && type !== "IHDR") throw new Error("png-invalid: IHDR must come first");
    first = false;
    if (type === "IHDR") {
      if (length !== 13) throw new Error(`png-invalid: IHDR length ${length}`);
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      const depth = data[8];
      colorType = data[9];
      if (depth !== 8 || ![2, 6].includes(colorType) || data[12] !== 0) {
        throw new Error(`png-unsupported: depth ${depth}, color type ${colorType}, interlace ${data[12]}`);
      }
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
    offset += 12 + length;
  }
  const channels = colorType === 6 ? 4 : 3;
  const stride = width * channels;
  if (width === 0 || height === 0) throw new Error("png-invalid: missing or empty IHDR");
  const raw = inflateSync(Buffer.concat(idat));
  if (raw.length !== height * (stride + 1)) {
    throw new Error(`png-invalid: ${raw.length} decoded bytes, expected ${height * (stride + 1)}`);
  }
  const pixels = new Uint8Array(width * height * 4);
  let previous = new Uint8Array(stride);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const row = new Uint8Array(stride);
    for (let i = 0; i < stride; i += 1) {
      const left = i >= channels ? row[i - channels] : 0;
      const up = previous[i];
      const upLeft = i >= channels ? previous[i - channels] : 0;
      let predicted = 0;
      if (filter === 1) predicted = left;
      else if (filter === 2) predicted = up;
      else if (filter === 3) predicted = (left + up) >> 1;
      else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        predicted = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
      } else if (filter !== 0) {
        throw new Error(`png-invalid: filter ${filter}`);
      }
      row[i] = (line[i] + predicted) & 0xff;
    }
    for (let x = 0; x < width; x += 1) {
      const o = (y * width + x) * 4;
      pixels[o] = row[x * channels];
      pixels[o + 1] = row[x * channels + 1];
      pixels[o + 2] = row[x * channels + 2];
      pixels[o + 3] = channels === 4 ? row[x * channels + 3] : 255;
    }
    previous = row;
  }
  return { width, height, pixels };
}

/**
 * Compare a rendered PNG with the fixture under a brightness-only edit. CSS
 * `brightness(N%)` multiplies each color channel by N/100 and clamps; the
 * viewer applies contrast and saturation at 100% (identity) and no sharpening.
 */
export function compareBrightnessRender(originalBytes, renderedBytes, brightness, tolerance = PIXEL_TOLERANCE) {
  const original = decodePng(originalBytes);
  const rendered = decodePng(renderedBytes);
  if (original.width !== rendered.width || original.height !== rendered.height) {
    return { ok: false, reason: `size ${rendered.width}x${rendered.height}, expected ${original.width}x${original.height}` };
  }
  let maxDelta = 0;
  let mismatched = 0;
  let changed = 0;
  for (let i = 0; i < original.pixels.length; i += 4) {
    let pixelOff = false;
    for (let c = 0; c < 3; c += 1) {
      const expected = Math.min(255, Math.round((original.pixels[i + c] * brightness) / 100));
      const delta = Math.abs(rendered.pixels[i + c] - expected);
      maxDelta = Math.max(maxDelta, delta);
      if (delta > tolerance) pixelOff = true;
      if (rendered.pixels[i + c] !== original.pixels[i + c]) changed += 1;
    }
    if (rendered.pixels[i + 3] !== 255) pixelOff = true;
    if (pixelOff) mismatched += 1;
  }
  return {
    ok: mismatched === 0 && changed > 0,
    width: original.width,
    height: original.height,
    brightness,
    tolerance,
    maxDelta,
    mismatchedPixels: mismatched,
    changedChannels: changed,
  };
}

// ---------------------------------------------------------------------------
// Owned-launch observation (shared with preflight)
// ---------------------------------------------------------------------------

function processNames(pids) {
  const csv = spawnSync("tasklist", ["/FO", "CSV", "/NH"], { encoding: "utf8", windowsHide: true }).stdout || "";
  const listed = {};
  for (const line of csv.split(/\r?\n/)) {
    const cols = line.split('","').map((c) => c.replace(/^"|"$/g, ""));
    if (cols.length >= 2 && /^\d+$/.test(cols[1])) listed[Number(cols[1])] = cols[0];
  }
  return Object.fromEntries(pids.map((pid) => [pid, listed[pid] ?? "unknown"]));
}

async function portClosed(port) {
  try {
    await fetch(`http://127.0.0.1:${port}/json/version`, { signal: AbortSignal.timeout(1500) });
    return false;
  } catch {
    return true;
  }
}

async function readSeededSession(page, sessionId) {
  const { ws, evalJs } = await connectDevtools(page);
  try {
    // Ask the app's own IPC, the same path the UI uses, for the image tree.
    // The sidecar may still be starting; each attempt is bounded in the page.
    let last = "no reply";
    for (let attempt = 0; attempt < 30; attempt += 1) {
      let reply;
      try {
        reply = await evalJs(`(async () => {
          const internals = window.__TAURI_INTERNALS__;
          if (!internals || typeof internals.invoke !== "function") return "ERROR no tauri invoke";
          const call = internals.invoke("ipc_call", { method: "studio.session.tree", params: { pillar: "image" } });
          const limit = new Promise((resolve) => setTimeout(() => resolve("ERROR ipc timeout"), 5000));
          try {
            const tree = await Promise.race([call, limit]);
            return typeof tree === "string" ? tree : JSON.stringify(tree);
          } catch (error) { return "ERROR " + String(error); }
        })()`);
      } catch (error) {
        reply = `ERROR ${error instanceof Error ? error.message : String(error)}`;
      }
      if (typeof reply === "string" && !reply.startsWith("ERROR")) {
        return { found: reply.includes(sessionId), tree: reply.slice(0, 2000) };
      }
      last = String(reply);
      await new Promise((r) => setTimeout(r, 1500));
    }
    return { found: false, tree: `ipc unavailable (${last})` };
  } finally {
    ws.close();
  }
}

async function observeLaunch(label, launched, manifest, report) {
  const pids = await launched.handle.pids();
  const names = processNames(pids);
  const sidecarPids = pids.filter((pid) => /^node(\.exe)?$/i.test(names[pid] ?? ""));
  const webviewPids = pids.filter((pid) => /msedgewebview2/i.test(names[pid] ?? ""));
  const session = await readSeededSession(launched.page, manifest.sessionId);
  const entry = {
    label,
    at: new Date().toISOString(),
    appPid: launched.handle.appPid,
    ownerPid: launched.handle.ownerPid,
    port: launched.port,
    listenerPid: launched.listener,
    jobPids: pids,
    processNames: names,
    sidecarPids,
    webviewPids,
    seededSessionVisible: session.found,
  };
  report.launches.push(entry);
  const problems = [];
  if (sidecarPids.length === 0) problems.push("no sidecar node process in the owned job");
  if (webviewPids.length === 0) problems.push("no WebView2 process in the owned job");
  if (!session.found) problems.push(`seeded session not visible through app IPC: ${session.tree}`);
  if (problems.length) throw new Error(`launch-${label}: ${problems.join("; ")}`);
  return entry;
}

async function stopAndVerify(label, launched, report) {
  const pids = await launched.handle.pids();
  const { remaining } = await launched.handle.stop();
  const alive = pids.filter((pid) => pidAlive(pid));
  const closed = await portClosed(launched.port);
  report.stops.push({ label, at: new Date().toISOString(), stoppedPids: pids, remaining, stillAlive: alive, portClosed: closed });
  if (remaining.length || alive.length || !closed) {
    throw new Error(`stop-${label}: remaining=${remaining} alive=${alive} portClosed=${closed}`);
  }
}

/** Runner-interruption control: end the owner only, then expect the job gone. */
async function interruptionControl(launched, report) {
  const pids = await launched.handle.pids();
  const bystander = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { stdio: "ignore", windowsHide: true });
  try {
    await launched.handle.killOwner();
    let alive = pids;
    for (let i = 0; i < 50 && alive.length; i += 1) {
      await new Promise((r) => setTimeout(r, 200));
      alive = pids.filter((pid) => pidAlive(pid));
    }
    const closed = await portClosed(launched.port);
    const bystanderAlive = pidAlive(bystander.pid);
    report.interruption = { ownedPids: pids, stillAlive: alive, portClosed: closed, unrelatedPid: bystander.pid, unrelatedAlive: bystanderAlive };
    if (alive.length || !closed || !bystanderAlive) {
      throw new Error(`interruption-control: alive=${alive} portClosed=${closed} unrelatedAlive=${bystanderAlive}`);
    }
  } finally {
    bystander.kill();
  }
}

/** Refusals that must happen before any seed or launch. */
function refusalControls(report) {
  const results = {};
  const occupied = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "nexus-occupied-"));
  try {
    allocateOwnedRoot(occupied);
    results.occupiedRoot = "NOT REFUSED";
  } catch (error) {
    results.occupiedRoot = String(error.message);
  } finally {
    fs.rmSync(occupied, { recursive: true, force: true });
  }
  const fakeRoot = path.join(os.tmpdir(), "nexus-owned-control");
  try {
    assertOwnedPaths(
      { osHomedir: path.join(fakeRoot, "home"), sessionsDb: path.join(os.homedir(), ".nexus", "generations", "sessions.db") },
      fakeRoot,
      { USERPROFILE: path.join(fakeRoot, "home") },
    );
    results.escapingPath = "NOT REFUSED";
  } catch (error) {
    results.escapingPath = String(error.message);
  }
  report.refusals = results;
  if (!results.occupiedRoot.startsWith("owned-root-occupied") || !results.escapingPath.startsWith("owned-path-escape")) {
    throw new Error(`refusal-controls: ${JSON.stringify(results)}`);
  }
}

async function seedAndProve({ exe, sha256, nodeExe, png }, report) {
  const manifest = await seedOwnedProfile({ exe, nodeExe, png });
  const { env, ...printable } = manifest;
  report.seed = printable;
  report.ownedRoot = manifest.root;
  report.ownedEnvironment = Object.fromEntries(
    ["USERPROFILE", "HOME", "APPDATA", "LOCALAPPDATA", "TEMP", "WEBVIEW2_USER_DATA_FOLDER", "NEXUS_NODE_PATH"].map((k) => [k, env[k]]),
  );
  for (const key of ["USERPROFILE", "APPDATA", "LOCALAPPDATA", "TEMP", "WEBVIEW2_USER_DATA_FOLDER"]) {
    if (!isInside(manifest.root, env[key])) throw new Error(`owned-path-escape: ${key}=${env[key]}`);
  }
  if (manifest.identity.exeSha256 !== sha256) {
    throw new Error(`executable-identity-mismatch: seeded candidate ${manifest.identity.exeSha256}, expected ${sha256}`);
  }
  return manifest;
}

// ---------------------------------------------------------------------------
// Ordinary UI driving (edit mode)
// ---------------------------------------------------------------------------

const VIEWER = '[role="dialog"][aria-label="Image viewer"]';

async function waitFor(evalJs, expression, stage, ms) {
  return withStage(
    stage,
    ms,
    (async () => {
      for (;;) {
        const value = await evalJs(expression).catch(() => null);
        if (value) return value;
        await new Promise((r) => setTimeout(r, 300));
      }
    })(),
  );
}

/** Real keyboard input through the browser's input pipeline. */
async function pressKey(send, key, keyCode, times) {
  for (let i = 0; i < times; i += 1) {
    await send("Input.dispatchKeyEvent", { type: "keyDown", key, code: key, windowsVirtualKeyCode: keyCode });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key, code: key, windowsVirtualKeyCode: keyCode });
    await new Promise((r) => setTimeout(r, 120));
  }
}

/** Open Image Studio, the seeded session and its viewer through the UI. */
async function openViewer(evalJs) {
  await waitFor(
    evalJs,
    `(() => { const link = [...document.querySelectorAll("a")].find((el) => el.getAttribute("href") === "/images"); if (!link) return false; link.click(); return true; })()`,
    "route-images",
    ACTION_TIMEOUTS_MS.route,
  );
  await waitFor(
    evalJs,
    `(() => { const row = [...document.querySelectorAll('[role="treeitem"]')].find((el) => (el.textContent || "").includes(${JSON.stringify(SESSION_TITLE)})); if (!row) return false; row.click(); return true; })()`,
    "open-session",
    ACTION_TIMEOUTS_MS.route,
  );
  await waitFor(
    evalJs,
    `(() => { const edit = document.querySelector('button[aria-label="Edit"]'); if (!edit) return false; edit.click(); return true; })()`,
    "open-viewer",
    ACTION_TIMEOUTS_MS.open,
  );
  // The durable viewer is ready when the slider exists and saved edits have loaded.
  return Number(
    await waitFor(
      evalJs,
      `(() => {
        const viewer = document.querySelector(${JSON.stringify(VIEWER)});
        const slider = viewer && viewer.querySelector('input[aria-label="Brightness"]');
        const status = viewer && viewer.querySelector('[role="status"]');
        const text = status ? status.textContent || "" : "";
        if (!slider || text.includes("Loading saved edits")) return null;
        if (/could not|unavailable|changed|conflict|error/i.test(text)) return "ERROR " + text;
        return slider.value;
      })()`,
      "viewer-ready",
      ACTION_TIMEOUTS_MS.open,
    ).then((value) => {
      if (String(value).startsWith("ERROR")) throw new Error(`viewer-unavailable: ${String(value).slice(6)}`);
      return value;
    }),
  );
}

async function viewerStatus(evalJs) {
  return evalJs(`(() => { const s = document.querySelector(${JSON.stringify(VIEWER)} + ' [role="status"]'); return s ? s.textContent || "" : ""; })()`);
}

/** Raise Brightness with arrow keys and wait for the persisted acknowledgment. */
async function editBrightness(evalJs, send, expected) {
  await evalJs(`document.querySelector(${JSON.stringify(VIEWER)} + ' input[aria-label="Brightness"]').focus()`);
  await pressKey(send, "ArrowRight", 39, BRIGHTNESS_STEPS);
  await waitFor(
    evalJs,
    `(() => {
      const viewer = document.querySelector(${JSON.stringify(VIEWER)});
      const slider = viewer && viewer.querySelector('input[aria-label="Brightness"]');
      const status = viewer && viewer.querySelector('[role="status"]');
      return slider && Number(slider.value) === ${expected} && status && (status.textContent || "").includes("Edits saved");
    })()`,
    "save-acknowledged",
    ACTION_TIMEOUTS_MS.save,
  );
  // The acknowledgment must still hold after the last debounced commit.
  await new Promise((r) => setTimeout(r, 1500));
  const status = await viewerStatus(evalJs);
  if (!status.includes("Edits saved")) throw new Error(`save-not-held: status "${status}"`);
  return status;
}

/** Save the edited version through the viewer into an owned download folder. */
async function saveEdited(evalJs, send, downloadDir) {
  fs.mkdirSync(downloadDir, { recursive: true });
  // WebView2 downloads go to the Windows Downloads known folder, which does
  // not follow USERPROFILE; pin them inside the owned root for this page.
  try {
    await send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: downloadDir });
  } catch (browserError) {
    try {
      await send("Page.setDownloadBehavior", { behavior: "allow", downloadPath: downloadDir });
    } catch (pageError) {
      // Without a pin the download would go to the real Downloads folder.
      throw new Error(`download-pin-unavailable: ${browserError.message}; ${pageError.message}`);
    }
  }
  await evalJs(`document.querySelector(${JSON.stringify(VIEWER)} + ' button[aria-label="Save image"]').click()`);
  await waitFor(
    evalJs,
    `(() => { const choice = document.querySelector('[role="dialog"][aria-label="Save which version"] [data-testid$="-choice-edited"]'); if (!choice) return false; choice.click(); return true; })()`,
    "save-version-choice",
    ACTION_TIMEOUTS_MS.save,
  );
  return withStage(
    "download",
    ACTION_TIMEOUTS_MS.download,
    (async () => {
      for (;;) {
        const done = fs.readdirSync(downloadDir).filter((f) => f.endsWith(".png"));
        if (done.length === 1) return path.join(downloadDir, done[0]);
        if (done.length > 1) throw new Error(`download-ambiguous: ${done.join(", ")}`);
        await new Promise((r) => setTimeout(r, 300));
      }
    })(),
  );
}

/** Copy the owned generations store so a control can restore the pre-edit state. */
function copyStore(manifest, to) {
  fs.cpSync(path.dirname(manifest.paths.sessionsDb), to, { recursive: true });
}

function restoreStore(manifest, from) {
  const dir = path.dirname(manifest.paths.sessionsDb);
  if (!isInside(manifest.root, dir)) throw new Error(`owned-path-escape: ${dir}`);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.cpSync(from, dir, { recursive: true });
}

function phase(report, name, status, detail = {}) {
  report.phases[name] = { status, at: new Date().toISOString(), ...detail };
}

export async function runEdit({ exe, sha256, out, nodeExe, png, control = null }) {
  const runId = randomUUID();
  const expected = NEUTRAL_BRIGHTNESS + BRIGHTNESS_STEPS;
  const report = {
    schemaVersion: BEHAVIORAL_SCHEMA,
    mode: "edit",
    control,
    runId,
    startedAt: new Date().toISOString(),
    executable: { path: exe, sha256 },
    phases: {},
    launches: [],
    stops: [],
    recipe: { expected: { brightness: expected }, observed: {} },
  };
  let manifest;
  let launched;
  let errorMessage = null;
  const sentinels = realProfileSentinels();
  let before = null;
  try {
    refusalControls(report);
    phase(report, "refusals", "pass");
    before = snapshot(sentinels);

    manifest = await seedAndProve({ exe, sha256, nodeExe, png }, report);
    report.candidate = {
      commit: manifest.identity.sourceCommit,
      sourceClean: manifest.identity.sourceClean,
      sidecarMainSha256: manifest.identity.sidecarMainSha256,
      nativeModuleSha256: manifest.identity.nativeModuleSha256,
    };
    report.ownedProfile = {
      root: manifest.root,
      ownerRunId: JSON.parse(fs.readFileSync(path.join(manifest.root, "nexus-test-owner.json"), "utf8")).runId,
    };
    report.fixture = { sha256: manifest.fixture.sha256, sessionId: manifest.sessionId, turnId: manifest.turnId };
    phase(report, "seed", "pass");
    const preEdit = path.join(manifest.root, "control-pre-edit-store");
    copyStore(manifest, preEdit);

    const workDir = path.join(manifest.root, "launcher");
    launched = await launchOwned({ exe, expectedSha256: sha256, env: manifest.env, workDir });
    await observeLaunch("edit", launched, manifest, report);
    // WebView2 must be writing into the owned folder, not the real profile.
    const ownedWebView = manifest.env.WEBVIEW2_USER_DATA_FOLDER;
    if (!fs.existsSync(ownedWebView) || fs.readdirSync(ownedWebView).length === 0) {
      throw new Error(`owned-path-escape: WebView2 wrote nothing under ${ownedWebView}`);
    }
    phase(report, "launch", "pass");
    {
      const { ws, evalJs, send } = await connectDevtools(launched.page);
      try {
        report.recipe.observed.beforeEdit = { brightness: await openViewer(evalJs) };
        if (report.recipe.observed.beforeEdit.brightness !== NEUTRAL_BRIGHTNESS) {
          throw new Error(`unexpected-start-state: brightness ${report.recipe.observed.beforeEdit.brightness}`);
        }
        phase(report, "open", "pass");
        const status = await editBrightness(evalJs, send, expected);
        report.recipe.observed.afterSave = { brightness: expected, status };
        phase(report, "edit", "pass");
        report.exportPath = await saveEdited(evalJs, send, path.join(manifest.root, "downloads"));
        phase(report, "export", "pass", { file: path.basename(report.exportPath) });
      } finally {
        ws.close();
      }
    }
    await stopAndVerify("edit", launched, report);
    launched = undefined;
    phase(report, "stop", "pass");

    if (control === "lost-persistence") restoreStore(manifest, preEdit);
    if (control === "source-mutation") {
      const bytes = fs.readFileSync(manifest.fixture.seededPath);
      bytes[bytes.length - 20] ^= 0xff;
      fs.writeFileSync(manifest.fixture.seededPath, bytes);
    }

    launched = await launchOwned({ exe, expectedSha256: sha256, env: manifest.env, workDir });
    await observeLaunch("restart", launched, manifest, report);
    phase(report, "relaunch", "pass");
    {
      const { ws, evalJs } = await connectDevtools(launched.page);
      try {
        const reread = await openViewer(evalJs);
        report.recipe.observed.afterRestart = { brightness: reread };
        if (reread !== expected) throw new Error(`persisted-edit-lost: brightness ${reread} after restart, expected ${expected}`);
        phase(report, "readBack", "pass");
      } finally {
        ws.close();
      }
    }
    await stopAndVerify("restart", launched, report);
    launched = undefined;

    const render = compareBrightnessRender(fs.readFileSync(png), fs.readFileSync(report.exportPath), expected);
    report.render = { ...render, exportSha256: sha256File(report.exportPath) };
    if (!render.ok) throw new Error(`render-mismatch: ${JSON.stringify(render)}`);
    phase(report, "render", "pass");

    const fixtureNow = sha256File(png);
    const seededNow = sha256File(manifest.fixture.seededPath);
    report.sourcePreservation = { fixtureSha256: fixtureNow, seededSha256: seededNow, expectedSha256: manifest.fixture.sha256 };
    if (fixtureNow !== manifest.fixture.sha256 || seededNow !== manifest.fixture.sha256) {
      throw new Error("source-changed: the source image bytes changed");
    }
    phase(report, "sourcePreservation", "pass");

    const changed = compareSnapshots(before, snapshot(sentinels));
    report.realProfileChanged = changed;
    if (changed.length) throw new Error(`real-profile-changed: ${changed.join(", ")}`);
    phase(report, "realProfile", "pass");
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : String(error);
  } finally {
    if (launched) await launched.handle.stop().catch(() => launched.handle.killOwner());
  }
  // A failed run still reports whether it touched the real profile.
  if (before && report.realProfileChanged === undefined) {
    report.realProfileChanged = compareSnapshots(before, snapshot(sentinels));
    if (report.realProfileChanged.length) {
      errorMessage = `real-profile-changed: ${report.realProfileChanged.join(", ")} (after: ${errorMessage})`;
    }
  }
  report.finishedAt = new Date().toISOString();
  report.error = errorMessage;
  const judged = evaluateBehavioralReport(report, { exeSha256: sha256, runId });
  report.judge = judged;
  report.ok = errorMessage === null && judged.ok;
  report.verdict = report.ok ? "PASS" : errorMessage && exitCodeFor(errorMessage) === 2 ? "UNAVAILABLE" : "FAIL";
  report.exitCode = report.ok ? 0 : errorMessage ? exitCodeFor(errorMessage) : 1;
  fs.writeFileSync(path.join(out, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  if (report.ok && manifest) {
    if (report.exportPath) fs.copyFileSync(report.exportPath, path.join(out, "edited.png"));
    removeOwnedRoot(manifest.root);
    report.ownedRootRemoved = true;
    fs.writeFileSync(path.join(out, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  }
  return report;
}

export async function runPreflight({ exe, sha256, out, nodeExe, png }) {
  const report = { mode: "preflight", startedAt: new Date().toISOString(), exe, launches: [], stops: [] };
  let manifest;
  let launched;
  let ok = false;
  try {
    refusalControls(report);
    const sentinels = realProfileSentinels();
    const before = snapshot(sentinels);
    report.realProfileBefore = before;
    manifest = await seedAndProve({ exe, sha256, nodeExe, png }, report);

    const workDir = path.join(manifest.root, "launcher");
    launched = await launchOwned({ exe, expectedSha256: sha256, env: manifest.env, workDir });
    await observeLaunch("first", launched, manifest, report);
    report.ownedArtifacts = {
      webview2Populated:
        fs.existsSync(manifest.env.WEBVIEW2_USER_DATA_FOLDER) && fs.readdirSync(manifest.env.WEBVIEW2_USER_DATA_FOLDER).length > 0,
      nexusHomeEntries: fs.readdirSync(manifest.paths.nexusHome),
    };
    await stopAndVerify("first", launched, report);
    launched = undefined;

    launched = await launchOwned({ exe, expectedSha256: sha256, env: manifest.env, workDir });
    await observeLaunch("relaunch", launched, manifest, report);
    await stopAndVerify("relaunch", launched, report);
    launched = undefined;

    launched = await launchOwned({ exe, expectedSha256: sha256, env: manifest.env, workDir });
    await interruptionControl(launched, report);
    launched = undefined;

    const after = snapshot(sentinels);
    report.realProfileAfter = after;
    const changed = compareSnapshots(before, after);
    report.realProfileChanged = changed;
    if (changed.length) throw new Error(`real-profile-changed: ${changed.join(", ")}`);

    const fixtureNow = sha256File(png);
    const seededNow = sha256File(manifest.fixture.seededPath);
    report.fixtureAfter = { fixtureSha256: fixtureNow, seededSha256: seededNow };
    if (fixtureNow !== manifest.fixture.sha256 || seededNow !== manifest.fixture.sha256) {
      throw new Error("fixture-changed: the source image bytes changed");
    }
    ok = true;
  } catch (error) {
    report.error = error instanceof Error ? error.message : String(error);
  } finally {
    if (launched) await launched.handle.stop().catch(() => launched.handle.killOwner());
    report.ok = ok;
    report.verdict = ok ? "PASS" : "HOLD";
    report.exitCode = ok ? 0 : exitCodeFor(report.error);
    report.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(out, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
    if (ok && manifest) {
      removeOwnedRoot(manifest.root);
      report.ownedRootRemoved = true;
      fs.writeFileSync(path.join(out, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
    }
  }
  return report;
}

function argValue(name) {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : undefined;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const exe = argValue("--exe");
  const sha256 = argValue("--sha256");
  const outArg = argValue("--out");
  const mode = argValue("--mode") ?? "edit";
  const control = argValue("--control") ?? null;
  const nodeExe = argValue("--node") ?? path.join(process.env.LOCALAPPDATA ?? "", "Nexus", "runtime", "node", "node.exe");
  const png = argValue("--png") ?? DEFAULT_PNG;
  const usage = "usage: node image-edit-flow.mjs --exe <exe> --sha256 <hex> --out <new dir> [--mode edit|preflight] [--control lost-persistence|source-mutation]\n";
  if (!exe || !sha256 || !outArg || !["edit", "preflight"].includes(mode)) {
    process.stderr.write(usage);
    process.exit(2);
  }
  if (control !== null && (mode !== "edit" || !["lost-persistence", "source-mutation"].includes(control))) {
    process.stderr.write(usage);
    process.exit(2);
  }
  const out = path.resolve(outArg);
  if (fs.existsSync(out)) {
    process.stderr.write(`output-occupied: ${out} already exists\n`);
    process.exit(2);
  }
  fs.mkdirSync(out, { recursive: true });
  const options = { exe: path.resolve(exe), sha256, out, nodeExe, png: path.resolve(png) };
  const report = mode === "edit" ? await runEdit({ ...options, control }) : await runPreflight(options);
  process.stdout.write(
    `${JSON.stringify({ ok: report.ok, verdict: report.verdict, control: report.control ?? null, error: report.error ?? null, report: path.join(out, "report.json") })}\n`,
  );
  process.exit(report.exitCode);
}
