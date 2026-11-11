#!/usr/bin/env node
/**
 * v2.16.2 packaged image-edit check (plan gates B3-B6).
 *
 * Usage:
 *   node desktop/tests/packaged/image-edit-flow.mjs --exe <nexus-shell.exe> --sha256 <exe sha256>
 *        --out <new output dir> [--mode preflight] [--node <node.exe>] [--png <fixture>]
 *
 * Modes:
 *   preflight  Phase 2 (B3): refuse an occupied or escaping root before any
 *              write, seed an owned profile through the real store, launch the
 *              pinned executable inside an owned job, prove the debugging
 *              listener, the sidecar and the seeded session belong to that
 *              profile, stop and relaunch it, prove an interrupted runner
 *              leaves nothing running, and prove the real profile unchanged.
 *
 * Exit 0 only when every check passed. Any unproven prerequisite is a
 * nonzero HOLD with the failed stage named; nothing is skipped as a pass.
 * The report is written to <out>/report.json; the owned root is kept on
 * failure for review and removed on success.
 */
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { connectDevtools, launchOwned, pidAlive } from "./launch-probe.mjs";
import {
  allocateOwnedRoot,
  assertOwnedPaths,
  isInside,
  removeOwnedRoot,
  seedOwnedProfile,
  sha256File,
} from "./seed-image.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_PNG = path.join(HERE, "fixtures", "edit-source.png");

/** The maintainer's real Nexus data, observed by size, time and content hash. */
export function realProfileSentinels(home = os.homedir(), localAppData = process.env.LOCALAPPDATA ?? "") {
  return [
    path.join(home, ".nexus", "generations", "sessions.db"),
    path.join(home, ".nexus", "generations", "images"),
    path.join(home, ".nexus", "settings.json"),
    path.join(home, ".nexus-ai", "catalog"),
    localAppData ? path.join(localAppData, "ai.nexus.shell") : "",
  ].filter(Boolean);
}

export function snapshot(paths) {
  const out = {};
  for (const target of paths) {
    try {
      const stat = fs.statSync(target);
      out[target] = stat.isFile()
        ? { kind: "file", size: stat.size, mtimeMs: stat.mtimeMs, sha256: sha256File(target) }
        : { kind: "dir", mtimeMs: stat.mtimeMs, entries: fs.readdirSync(target).length };
    } catch {
      out[target] = { kind: "absent" };
    }
  }
  return out;
}

export function compareSnapshots(before, after) {
  return Object.keys(before).filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
}

function processNames(pids) {
  if (pids.length === 0) return {};
  const out = {};
  const listed = spawnList();
  for (const pid of pids) out[pid] = listed[pid] ?? "unknown";
  return out;
}

function spawnList() {
  const csv = spawnSync("tasklist", ["/FO", "CSV", "/NH"], { encoding: "utf8", windowsHide: true }).stdout || "";
  const map = {};
  for (const line of csv.split(/\r?\n/)) {
    const cols = line.split('","').map((c) => c.replace(/^"|"$/g, ""));
    if (cols.length >= 2 && /^\d+$/.test(cols[1])) map[Number(cols[1])] = cols[0];
  }
  return map;
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
    appPid: launched.handle.appPid,
    ownerPid: launched.handle.ownerPid,
    port: launched.port,
    listenerPid: launched.listener,
    jobPids: pids,
    processNames: names,
    sidecarPids,
    webviewPids,
    pageUrl: launched.page.url,
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
  report.stops.push({ label, stoppedPids: pids, remaining, stillAlive: alive, portClosed: closed });
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

    manifest = await seedOwnedProfile({ exe, nodeExe, png });
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

    const workDir = path.join(manifest.root, "launcher");
    launched = await launchOwned({ exe, expectedSha256: sha256, env, workDir });
    await observeLaunch("first", launched, manifest, report);
    report.ownedArtifacts = {
      webview2Populated: fs.existsSync(env.WEBVIEW2_USER_DATA_FOLDER) && fs.readdirSync(env.WEBVIEW2_USER_DATA_FOLDER).length > 0,
      nexusHomeEntries: fs.readdirSync(manifest.paths.nexusHome),
    };
    await stopAndVerify("first", launched, report);
    launched = undefined;

    launched = await launchOwned({ exe, expectedSha256: sha256, env, workDir });
    await observeLaunch("relaunch", launched, manifest, report);
    await stopAndVerify("relaunch", launched, report);
    launched = undefined;

    launched = await launchOwned({ exe, expectedSha256: sha256, env, workDir });
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
  const mode = argValue("--mode") ?? "preflight";
  const nodeExe = argValue("--node") ?? path.join(process.env.LOCALAPPDATA ?? "", "Nexus", "runtime", "node", "node.exe");
  const png = argValue("--png") ?? DEFAULT_PNG;
  if (!exe || !sha256 || !outArg) {
    process.stderr.write("usage: node image-edit-flow.mjs --exe <exe> --sha256 <hex> --out <new dir> [--mode preflight]\n");
    process.exit(2);
  }
  if (mode !== "preflight") {
    process.stderr.write(`unsupported mode: ${mode}\n`);
    process.exit(2);
  }
  const out = path.resolve(outArg);
  if (fs.existsSync(out)) {
    process.stderr.write(`output-occupied: ${out} already exists\n`);
    process.exit(2);
  }
  fs.mkdirSync(out, { recursive: true });
  const report = await runPreflight({ exe: path.resolve(exe), sha256, out, nodeExe, png: path.resolve(png) });
  process.stdout.write(`${JSON.stringify({ ok: report.ok, verdict: report.verdict, error: report.error ?? null, report: path.join(out, "report.json") })}\n`);
  process.exit(report.ok ? 0 : 1);
}
