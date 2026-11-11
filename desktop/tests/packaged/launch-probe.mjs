#!/usr/bin/env node
/**
 * Launch a built Nexus executable, read the four pillar selectors and the
 * WebView requests, and judge that probe with bundle.smoke.mjs.
 * The shell also prints sidecar stderr when spawn fails, which the CI log keeps.
 *
 * Usage: node launch-probe.mjs <path-to-nexus-shell.exe>
 *
 * v2.16.2 Phase 2 (T007) adds an owned launch mode for the packaged image-edit
 * check (`launchOwned`). The route smoke above is unchanged when this file is
 * run directly. An owned launch runs the executable inside a Windows job
 * object that ends every process in it when its last handle closes, so the
 * app, its WebView2 browser and its sidecar stop with the job even if the
 * runner is interrupted. The debugging port is chosen per run, and a target is
 * accepted only when the process listening on it belongs to that job.
 */
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import net from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

function psQuote(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Route smoke (existing CLI behavior)
// ---------------------------------------------------------------------------

async function runRouteSmoke(exe) {
  const port = 9333;
  const selectors = ["chat-page", "coding-page", "image-model-select", "video-lab-page"];
  const routes = ["/chatbot", "/coding", "/images", "/videos"];
  const userData = path.join(tmpdir(), `nexus-webview-probe-${Date.now()}`);
  mkdirSync(userData, { recursive: true });
  const logs = [];

  const browserArgs = `--remote-debugging-port=${port} --remote-allow-origins=* --disable-gpu`;
  const pidFile = path.join(userData, "pid.txt");
  const started = spawnSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-Command",
      [
        "$psi = New-Object System.Diagnostics.ProcessStartInfo",
        `$psi.FileName = ${psQuote(exe)}`,
        "$psi.UseShellExecute = $false",
        `$psi.EnvironmentVariables['WEBVIEW2_USER_DATA_FOLDER'] = ${psQuote(userData)}`,
        `$psi.EnvironmentVariables['WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS'] = ${psQuote(browserArgs)}`,
        "$p = [System.Diagnostics.Process]::Start($psi)",
        `Set-Content -LiteralPath ${psQuote(pidFile)} -Value $p.Id`,
      ].join("; "),
    ],
    { stdio: "ignore", timeout: 20000, windowsHide: true },
  );
  let appPid = 0;
  try {
    appPid = Number(readFileSync(pidFile, "utf8").trim());
  } catch {
    appPid = 0;
  }
  const spawnError = started.status === 0 && appPid > 0 ? "" : started.error?.message || "process start failed";

  function webViewRunning() {
    const listed = spawnSync("tasklist", ["/FI", "IMAGENAME eq msedgewebview2.exe", "/FO", "CSV"], {
      encoding: "utf8",
      windowsHide: true,
    });
    return (listed.stdout || "").includes("msedgewebview2.exe");
  }

  async function waitForPage() {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      if (spawnError) break;
      try {
        const list = await (await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(2000) })).json();
        const page = list.find(
          (item) =>
            item.type === "page" &&
            item.webSocketDebuggerUrl &&
            typeof item.url === "string" &&
            item.url !== "about:blank",
        );
        if (page) return page;
      } catch {
        // The debug port opens after the webview does.
      }
      await delay(1000);
    }
    const tail = logs.join("").slice(-4000);
    throw new Error(
      `webview debug port ${port} did not open; pid=${appPid || "none"}; webview2=${webViewRunning()}; spawn=${spawnError || "none"}; log:\n${tail}`,
    );
  }

  try {
    process.stderr.write(`launching pid=${appPid || "none"}\n`);
    const page = await waitForPage();
    process.stderr.write(`debug port open ${page.url}\n`);
    const { ws, urls, evalJs } = await connectDevtools(page);
    const present = new Set();
    for (const route of routes) {
      await evalJs(`(() => {
        const link = [...document.querySelectorAll("a")].find((el) => el.getAttribute("href") === ${JSON.stringify(route)});
        if (link) link.click();
        return location.href;
      })()`);
      await delay(1500);
      const found = await evalJs(
        `(() => {
          const ids = ${JSON.stringify(selectors)};
          return ids.filter((id) => [...document.querySelectorAll("[data-testid]")].some((el) => el.getAttribute("data-testid") === id));
        })()`,
      );
      for (const id of found ?? []) present.add(id);
    }
    ws.close();
    const reportPath = path.join(mkdtempSync(path.join(tmpdir(), "nexus-window-probe-")), "report.json");
    writeFileSync(
      reportPath,
      JSON.stringify({
        launched: true,
        timedOut: false,
        selectors: [...present],
        connections: [...urls],
      }),
    );
    const smoke = path.join(path.dirname(fileURLToPath(import.meta.url)), "bundle.smoke.mjs");
    const judged = spawnSync(process.execPath, [smoke, reportPath, exe], { encoding: "utf8", windowsHide: true });
    process.stdout.write(judged.stdout || "");
    process.stderr.write(judged.stderr || "");
    process.exitCode = judged.status ?? 1;
  } catch (err) {
    process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
    process.exitCode = 1;
  } finally {
    if (appPid > 0) spawnSync("taskkill", ["/PID", String(appPid), "/T", "/F"], { timeout: 15000, windowsHide: true });
  }
}

// ---------------------------------------------------------------------------
// DevTools connection (shared)
// ---------------------------------------------------------------------------

export async function connectDevtools(page, { timeoutMs = 10000 } = {}) {
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  const urls = new Set();
  ws.addEventListener("message", (ev) => {
    const data = JSON.parse(ev.data);
    if (data.method === "Network.requestWillBeSent") urls.add(data.params.request.url);
    if (data.id && pending.has(data.id)) pending.get(data.id)(data);
  });
  function send(method, params) {
    const msgId = ++id;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(msgId);
        reject(new Error(`devtools ${method} timed out`));
      }, timeoutMs);
      pending.set(msgId, (data) => {
        clearTimeout(timer);
        pending.delete(msgId);
        resolve(data);
      });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }
  async function evalJs(expression) {
    const res = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (res.result?.exceptionDetails) throw new Error(JSON.stringify(res.result.exceptionDetails));
    return res.result?.result?.value;
  }
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("webview socket timed out")), timeoutMs);
    ws.addEventListener("open", () => {
      clearTimeout(timer);
      resolve();
    });
    ws.addEventListener("error", () => {
      clearTimeout(timer);
      reject(new Error("webview socket failed"));
    });
  });
  await send("Network.enable");
  return { ws, urls, evalJs, send };
}

// ---------------------------------------------------------------------------
// Owned launch (v2.16.2)
// ---------------------------------------------------------------------------

/** Stage timeouts, registered before any behavioral run. */
export const STAGE_TIMEOUTS_MS = Object.freeze({
  ownerStart: 30_000,
  debugPort: 60_000,
  page: 30_000,
  stop: 15_000,
});

/** Run `promise` under a named stage timeout; the error names the stage. */
export async function withStage(stage, ms, promise) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`stage-timeout: ${stage} exceeded ${ms} ms`)), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export function sha256OfFile(file) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

/** Refuse anything but the exact pinned executable. */
export function checkExecutable(exe, expectedSha256) {
  if (!exe || !existsSync(exe)) throw new Error(`executable-missing: ${exe}`);
  if (!/^[0-9a-f]{64}$/.test(String(expectedSha256 ?? ""))) {
    throw new Error("executable-identity-unpinned: an expected SHA-256 is required");
  }
  const actual = sha256OfFile(exe);
  if (actual !== expectedSha256) {
    throw new Error(`executable-identity-mismatch: ${exe} is ${actual}, expected ${expectedSha256}`);
  }
  return actual;
}

/** Bind a loopback port to prove it is free, then release it for the app. */
export function checkPortFree(port, host = "127.0.0.1") {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", (error) => reject(new Error(`port-collision: ${host}:${port} is in use (${error.code})`)));
    server.listen(port, host, () => server.close(() => resolve(port)));
  });
}

/** An unused loopback port chosen by the OS for this run. */
export function pickFreePort(host = "127.0.0.1") {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, host, () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

/**
 * The PID serving a loopback TCP port, from `netstat -ano`. WebView2's
 * debugging server can appear only as the server end of an established
 * connection, so a loopback socket whose LOCAL address is the port counts in
 * either state. Callers query right after a successful request to the port.
 */
export function listenerPid(port, run = spawnSync) {
  const out = run("netstat", ["-ano", "-p", "TCP"], { encoding: "utf8", windowsHide: true }).stdout || "";
  for (const line of out.split(/\r?\n/)) {
    const cols = line.trim().split(/\s+/);
    if (cols.length < 5 || !["LISTENING", "ESTABLISHED"].includes(cols[3])) continue;
    if (!/^(127\.0\.0\.1|0\.0\.0\.0):\d+$/.test(cols[1])) continue;
    if (Number(cols[1].split(":").pop()) === port) return Number(cols[4]);
  }
  return 0;
}

/**
 * Accept a debugging target only when its listener belongs to the owned job.
 * A listener outside the job is another app or profile and is never driven.
 */
export function checkTargetOwnership(listener, jobPids) {
  if (!listener) throw new Error("target-unowned: nothing is listening on the debugging port");
  if (!jobPids.includes(listener)) {
    throw new Error(`target-unowned: port listener pid ${listener} is not in the owned job (${jobPids.join(",")})`);
  }
  return listener;
}

// Test-only job owner. It holds the only job handle; when this PowerShell
// process exits for any reason, Windows ends every process in the job.
const JOB_OWNER_CS = `
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Text;

public static class NexusOwnedLaunch {
  const uint JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x00002000;
  const int JobObjectBasicProcessIdList = 3;
  const int JobObjectExtendedLimitInformation = 9;
  const uint CREATE_SUSPENDED = 0x00000004;
  const uint CREATE_UNICODE_ENVIRONMENT = 0x00000400;

  [StructLayout(LayoutKind.Sequential)] struct IO_COUNTERS { public ulong a, b, c, d, e, f; }
  [StructLayout(LayoutKind.Sequential)] struct BASIC_LIMIT {
    public long PerProcessUserTimeLimit, PerJobUserTimeLimit; public uint LimitFlags;
    public UIntPtr MinimumWorkingSetSize, MaximumWorkingSetSize; public uint ActiveProcessLimit;
    public UIntPtr Affinity; public uint PriorityClass, SchedulingClass;
  }
  [StructLayout(LayoutKind.Sequential)] struct EXTENDED_LIMIT {
    public BASIC_LIMIT Basic; public IO_COUNTERS Io;
    public UIntPtr ProcessMemoryLimit, JobMemoryLimit, PeakProcessMemoryUsed, PeakJobMemoryUsed;
  }
  [StructLayout(LayoutKind.Sequential)] struct STARTUPINFO {
    public int cb; public IntPtr lpReserved, lpDesktop, lpTitle;
    public int dwX, dwY, dwXSize, dwYSize, dwXCountChars, dwYCountChars, dwFillAttribute;
    public uint dwFlags; public short wShowWindow, cbReserved2; public IntPtr lpReserved2, hStdInput, hStdOutput, hStdError;
  }
  [StructLayout(LayoutKind.Sequential)] struct PROCESS_INFORMATION { public IntPtr hProcess, hThread; public uint dwProcessId, dwThreadId; }

  [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)] static extern IntPtr CreateJobObject(IntPtr a, string n);
  [DllImport("kernel32.dll", SetLastError = true)] static extern bool SetInformationJobObject(IntPtr j, int c, IntPtr i, uint s);
  [DllImport("kernel32.dll", SetLastError = true)] static extern bool QueryInformationJobObject(IntPtr j, int c, IntPtr i, uint s, IntPtr r);
  [DllImport("kernel32.dll", SetLastError = true)] static extern bool AssignProcessToJobObject(IntPtr j, IntPtr p);
  [DllImport("kernel32.dll", SetLastError = true)] static extern bool TerminateJobObject(IntPtr j, uint code);
  [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)] static extern bool CreateProcess(string app, StringBuilder cmd, IntPtr pa, IntPtr ta, bool inherit, uint flags, IntPtr env, string cwd, ref STARTUPINFO si, out PROCESS_INFORMATION pi);
  [DllImport("kernel32.dll", SetLastError = true)] static extern uint ResumeThread(IntPtr t);
  [DllImport("kernel32.dll", SetLastError = true)] static extern bool CloseHandle(IntPtr h);

  static IntPtr job = IntPtr.Zero;

  public static uint Start(string exe, string cwd) {
    job = CreateJobObject(IntPtr.Zero, null);
    if (job == IntPtr.Zero) throw new Win32Exception(Marshal.GetLastWin32Error(), "CreateJobObject");
    var limits = new EXTENDED_LIMIT();
    limits.Basic.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
    int size = Marshal.SizeOf(typeof(EXTENDED_LIMIT));
    IntPtr buf = Marshal.AllocHGlobal(size);
    try {
      Marshal.StructureToPtr(limits, buf, false);
      if (!SetInformationJobObject(job, JobObjectExtendedLimitInformation, buf, (uint)size))
        throw new Win32Exception(Marshal.GetLastWin32Error(), "SetInformationJobObject");
    } finally { Marshal.FreeHGlobal(buf); }
    var si = new STARTUPINFO(); si.cb = Marshal.SizeOf(typeof(STARTUPINFO));
    PROCESS_INFORMATION pi;
    var cmd = new StringBuilder("\\"" + exe + "\\"");
    if (!CreateProcess(exe, cmd, IntPtr.Zero, IntPtr.Zero, false, CREATE_SUSPENDED | CREATE_UNICODE_ENVIRONMENT, IntPtr.Zero, cwd, ref si, out pi))
      throw new Win32Exception(Marshal.GetLastWin32Error(), "CreateProcess");
    try {
      if (!AssignProcessToJobObject(job, pi.hProcess))
        throw new Win32Exception(Marshal.GetLastWin32Error(), "AssignProcessToJobObject");
      ResumeThread(pi.hThread);
      return pi.dwProcessId;
    } finally { CloseHandle(pi.hThread); CloseHandle(pi.hProcess); }
  }

  public static uint[] Pids() {
    int max = 1024; int size = 8 + IntPtr.Size * max;
    IntPtr buf = Marshal.AllocHGlobal(size);
    try {
      if (!QueryInformationJobObject(job, JobObjectBasicProcessIdList, buf, (uint)size, IntPtr.Zero))
        throw new Win32Exception(Marshal.GetLastWin32Error(), "QueryInformationJobObject");
      int count = Marshal.ReadInt32(buf, 4);
      var pids = new uint[count];
      for (int i = 0; i < count; i++) pids[i] = (uint)Marshal.ReadIntPtr(buf, 8 + i * IntPtr.Size).ToInt64();
      return pids;
    } finally { Marshal.FreeHGlobal(buf); }
  }

  public static void Stop() { TerminateJobObject(job, 1); }
}
`;

const JOB_OWNER_PS1 = `
$ErrorActionPreference = 'Stop'
try {
  Add-Type -TypeDefinition (Get-Content -Raw -LiteralPath $env:NEXUS_OWNED_CS) -Language CSharp | Out-Null
  $appPid = [NexusOwnedLaunch]::Start($env:NEXUS_OWNED_EXE, $env:NEXUS_OWNED_CWD)
  [Console]::Out.WriteLine((@{ event = 'started'; appPid = $appPid } | ConvertTo-Json -Compress))
} catch {
  [Console]::Out.WriteLine((@{ event = 'error'; message = $_.Exception.Message } | ConvertTo-Json -Compress))
  exit 3
}
while ($null -ne ($line = [Console]::In.ReadLine())) {
  if ($line -eq 'pids') {
    [Console]::Out.WriteLine((@{ event = 'pids'; pids = @([NexusOwnedLaunch]::Pids()) } | ConvertTo-Json -Compress))
  } elseif ($line -eq 'stop') {
    [NexusOwnedLaunch]::Stop()
    $deadline = (Get-Date).AddSeconds(10)
    do { Start-Sleep -Milliseconds 200; $left = @([NexusOwnedLaunch]::Pids()) } while ($left.Count -gt 0 -and (Get-Date) -lt $deadline)
    [Console]::Out.WriteLine((@{ event = 'stopped'; remaining = $left } | ConvertTo-Json -Compress))
    exit 0
  }
}
exit 0
`;

/**
 * Start `exe` inside a new owned job with `env`. Returns a handle with the
 * app PID, the job's live PIDs, the owner PID and `stop()`. The caller passes
 * the debugging port through `env.WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS`.
 */
export async function startOwnedJob({ exe, env, cwd, workDir }) {
  mkdirSync(workDir, { recursive: true });
  const csPath = path.join(workDir, "owned-launch.cs");
  const psPath = path.join(workDir, "owned-launch.ps1");
  writeFileSync(csPath, JOB_OWNER_CS);
  writeFileSync(psPath, JOB_OWNER_PS1);
  const owner = spawn(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", psPath],
    {
      env: { ...env, NEXUS_OWNED_CS: csPath, NEXUS_OWNED_EXE: exe, NEXUS_OWNED_CWD: cwd },
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    },
  );
  const waiters = [];
  let buffer = "";
  let stderr = "";
  owner.stderr.on("data", (d) => {
    stderr += d;
  });
  owner.stdout.on("data", (d) => {
    buffer += d;
    let nl;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      let msg;
      try {
        msg = JSON.parse(line);
      } catch {
        continue;
      }
      const index = waiters.findIndex((w) => w.event === msg.event || msg.event === "error");
      if (index >= 0) waiters.splice(index, 1)[0].resolve(msg);
    }
  });
  const exited = new Promise((resolve) => owner.once("exit", (code) => resolve(code)));
  const next = (event) =>
    new Promise((resolve, reject) => {
      waiters.push({ event, resolve });
      exited.then((code) => reject(new Error(`job-owner-exited (${code}) before ${event}: ${stderr.slice(-800)}`)));
    });
  const started = await withStage("owner-start", STAGE_TIMEOUTS_MS.ownerStart, next("started"));
  if (started.event === "error") throw new Error(`owned-launch-failed: ${started.message}`);
  const appPid = Number(started.appPid);
  return {
    appPid,
    ownerPid: owner.pid,
    async pids() {
      owner.stdin.write("pids\n");
      const reply = await withStage("job-pids", 10_000, next("pids"));
      return (Array.isArray(reply.pids) ? reply.pids : [reply.pids]).map(Number).filter(Boolean);
    },
    async stop() {
      owner.stdin.write("stop\n");
      const reply = await withStage("stop", STAGE_TIMEOUTS_MS.stop, next("stopped"));
      await exited;
      return { remaining: [].concat(reply.remaining ?? []).map(Number).filter(Boolean) };
    },
    /** Simulate runner interruption: end the owner without asking it to stop. */
    killOwner() {
      owner.kill();
      return exited;
    },
    exited,
  };
}

/** True when a PID is a live process, read from `tasklist`. */
export function pidAlive(pid) {
  const out = spawnSync("tasklist", ["/FI", `PID eq ${pid}`, "/FO", "CSV", "/NH"], {
    encoding: "utf8",
    windowsHide: true,
  }).stdout || "";
  return out.includes(`"${pid}"`);
}

/** Wait for the owned app's debugging page and prove the listener is in the job. */
export async function waitForOwnedPage(handle, port) {
  return withStage(
    "debug-port",
    STAGE_TIMEOUTS_MS.debugPort,
    (async () => {
      for (;;) {
        try {
          const list = await (await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(2000) })).json();
          const page = list.find(
            (item) => item.type === "page" && item.webSocketDebuggerUrl && typeof item.url === "string" && item.url !== "about:blank",
          );
          if (page) {
            const listener = checkTargetOwnership(listenerPid(port), await handle.pids());
            return { page, listener };
          }
        } catch (error) {
          if (error instanceof Error && error.message.startsWith("target-unowned")) throw error;
        }
        await delay(1000);
      }
    })(),
  );
}

/**
 * Launch `exe` in the owned profile `env` on a fresh debugging port. Returns
 * the job handle, the port, the page and the listener PID.
 */
export async function launchOwned({ exe, expectedSha256, env, workDir }) {
  checkExecutable(exe, expectedSha256);
  const port = await checkPortFree(await pickFreePort());
  const browserArgs = `--remote-debugging-port=${port} --remote-allow-origins=http://127.0.0.1:${port} --disable-gpu`;
  const launchEnv = { ...env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: browserArgs };
  const handle = await startOwnedJob({ exe, env: launchEnv, cwd: path.dirname(exe), workDir });
  try {
    const { page, listener } = await waitForOwnedPage(handle, port);
    return { handle, port, page, listener };
  } catch (error) {
    await handle.stop().catch(() => handle.killOwner());
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const exe = process.argv[2];
  if (!exe) {
    process.stderr.write("usage: node launch-probe.mjs <nexus-shell.exe>\n");
    process.exit(2);
  }
  if (!existsSync(exe)) {
    process.stderr.write(`missing executable: ${exe}\n`);
    process.exit(2);
  }
  await runRouteSmoke(exe);
}
