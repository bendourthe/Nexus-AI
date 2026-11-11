import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  checkExecutable,
  checkPortFree,
  checkTargetOwnership,
  listenerPid,
  withStage,
} from "../../../desktop/tests/packaged/launch-probe.mjs";
import {
  allocateOwnedRoot,
  assertOwnedPaths,
  isInside,
  ownedEnvironment,
  removeOwnedRoot,
} from "../../../desktop/tests/packaged/seed-image.mjs";
import { compareSnapshots, snapshot } from "../../../desktop/tests/packaged/image-edit-flow.mjs";

// v2.16.2 Phase 2 (T007/T008): the packaged image-edit helpers refuse a wrong
// executable, a target outside the owned job, a busy port, an unresponsive
// stage, an occupied or aliased root and any store path outside the root.

const cleanups: (() => void)[] = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()?.();
});

function tempDir(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), prefix));
  cleanups.push(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

describe("packaged launcher guards", () => {
  it("refuses an executable whose hash does not match the pinned identity", () => {
    const dir = tempDir("exe-");
    const exe = path.join(dir, "nexus-shell.exe");
    fs.writeFileSync(exe, "not the pinned build");
    expect(() => checkExecutable(exe, "0".repeat(64))).toThrow(/^executable-identity-mismatch/);
    expect(() => checkExecutable(exe, undefined)).toThrow(/^executable-identity-unpinned/);
    expect(() => checkExecutable(path.join(dir, "missing.exe"), "0".repeat(64))).toThrow(/^executable-missing/);
  });

  it("refuses a debugging target served by a process outside the owned job", () => {
    expect(() => checkTargetOwnership(4242, [100, 200])).toThrow(/^target-unowned: port listener pid 4242/);
    expect(() => checkTargetOwnership(0, [100])).toThrow(/^target-unowned: nothing is listening/);
    expect(checkTargetOwnership(200, [100, 200])).toBe(200);
  });

  it("reads the serving pid from the port's local socket, not the client end", () => {
    const netstat = [
      "  TCP    127.0.0.1:49675        127.0.0.1:60248        ESTABLISHED     7492",
      "  TCP    127.0.0.1:60248        127.0.0.1:49675        ESTABLISHED     28364",
      "  TCP    127.0.0.1:9333         0.0.0.0:0              LISTENING       555",
    ].join("\r\n");
    const run = () => ({ stdout: netstat });
    expect(listenerPid(49675, run as never)).toBe(7492);
    expect(listenerPid(9333, run as never)).toBe(555);
    expect(listenerPid(1234, run as never)).toBe(0);
  });

  it("refuses a debugging port that another process already holds", async () => {
    const server = net.createServer();
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
    cleanups.push(() => server.close());
    const { port } = server.address() as net.AddressInfo;
    await expect(checkPortFree(port)).rejects.toThrow(/^port-collision/);
  });

  it("fails an unresponsive stage with the stage name instead of waiting forever", async () => {
    const never = new Promise(() => undefined);
    await expect(withStage("debug-port", 50, never)).rejects.toThrow("stage-timeout: debug-port exceeded 50 ms");
  });
});

describe("owned profile guards", () => {
  it("refuses an occupied root before writing anything", () => {
    const occupied = tempDir("occupied-");
    expect(() => allocateOwnedRoot(occupied)).toThrow(/^owned-root-occupied/);
    expect(fs.readdirSync(occupied)).toEqual([]);
  });

  it("allocates a fresh exclusive root and removes only an owned one", () => {
    const root = allocateOwnedRoot();
    cleanups.push(() => fs.rmSync(root, { recursive: true, force: true }));
    expect(fs.readdirSync(root)).toEqual(["nexus-test-owner.json"]);
    const foreign = tempDir("foreign-");
    expect(() => removeOwnedRoot(foreign)).toThrow(/^not-owned/);
    removeOwnedRoot(root);
    expect(fs.existsSync(root)).toBe(false);
  });

  it("points every child profile variable inside the root and drops inherited Nexus overrides", () => {
    const root = path.join(os.tmpdir(), "nexus-owned-env");
    const env = ownedEnvironment(root, { NEXUS_HOME: "C:/real", WEBVIEW2_USER_DATA_FOLDER: "C:/real/wv", PATH: "x" }, "C:/node.exe");
    for (const key of ["USERPROFILE", "HOME", "APPDATA", "LOCALAPPDATA", "TEMP", "TMP", "WEBVIEW2_USER_DATA_FOLDER"]) {
      expect(isInside(root, env[key]), key).toBe(true);
    }
    expect(env.NEXUS_HOME).toBeUndefined();
    expect(env.NEXUS_NODE_PATH).toBe("C:/node.exe");
    expect(env.PATH).toBe("x");
  });

  it("refuses resolved store paths that escape the root or a home that is not the child's", () => {
    const root = path.join(os.tmpdir(), "nexus-owned-paths");
    const home = path.join(root, "home");
    expect(() => assertOwnedPaths({ osHomedir: home, sessionsDb: path.join(os.homedir(), ".nexus", "x.db") }, root, { USERPROFILE: home })).toThrow(/^owned-path-escape: sessionsDb/);
    expect(() => assertOwnedPaths({ osHomedir: os.homedir() }, root, { USERPROFILE: home })).toThrow(/os\.homedir\(\) resolved/);
    expect(() => assertOwnedPaths({ osHomedir: home, sessionsDb: path.join(home, ".nexus", "s.db") }, root, { USERPROFILE: home })).not.toThrow();
  });

  it("treats a sibling with a shared prefix as outside the root", () => {
    expect(isInside("C:/tmp/root", "C:/tmp/root-evil/x")).toBe(false);
    expect(isInside("C:/tmp/root", "C:/tmp/root/x")).toBe(true);
  });
});

describe("real-profile preservation snapshot", () => {
  it("detects a changed, added or removed sentinel", () => {
    const dir = tempDir("sentinel-");
    const file = path.join(dir, "sessions.db");
    fs.writeFileSync(file, "one");
    const absent = path.join(dir, "absent");
    const before = snapshot([file, absent, dir]);
    expect(compareSnapshots(before, snapshot([file, absent, dir]))).toEqual([]);
    fs.writeFileSync(file, "two!");
    fs.writeFileSync(absent, "now here");
    expect(compareSnapshots(before, snapshot([file, absent, dir])).sort()).toEqual([absent, dir, file].sort());
  });
});
