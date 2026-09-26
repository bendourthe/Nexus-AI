#!/usr/bin/env node
/**
 * Launch a built Nexus executable, read the four pillar selectors and the
 * WebView requests, and judge that probe with bundle.smoke.mjs.
 * The shell also prints sidecar stderr when spawn fails, which the CI log keeps.
 *
 * Usage: node launch-probe.mjs <path-to-nexus-shell.exe>
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const exe = process.argv[2];
if (!exe) {
  process.stderr.write("usage: node launch-probe.mjs <nexus-shell.exe>\n");
  process.exit(2);
}
if (!existsSync(exe)) {
  process.stderr.write(`missing executable: ${exe}\n`);
  process.exit(2);
}

const port = 9333;
const selectors = ["chat-page", "coding-page", "image-model-select", "video-lab-page"];
const routes = ["/chatbot", "/coding", "/images", "/videos"];
const userData = path.join(tmpdir(), `nexus-webview-probe-${Date.now()}`);
mkdirSync(userData, { recursive: true });
const logs = [];

function psQuote(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

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
  { stdio: "ignore", timeout: 20000 },
);
let appPid = 0;
try {
  appPid = Number(readFileSync(pidFile, "utf8").trim());
} catch {
  appPid = 0;
}
let spawnError = started.status === 0 && appPid > 0 ? "" : started.error?.message || "process start failed";

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function webViewRunning() {
  const listed = spawnSync("tasklist", ["/FI", "IMAGENAME eq msedgewebview2.exe", "/FO", "CSV"], {
    encoding: "utf8",
  });
  return (listed.stdout || "").includes("msedgewebview2.exe");
}

async function waitForPage() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (spawnError) break;
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(2000) })).json();
      const page = list.find((item) => item.type === "page" && item.webSocketDebuggerUrl);
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

async function connect(page) {
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
      }, 10000);
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
    const timer = setTimeout(() => reject(new Error("webview socket timed out")), 10000);
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
  return { ws, urls, evalJs };
}

try {
  process.stderr.write(`launching pid=${appPid || "none"}\n`);
  const page = await waitForPage();
  process.stderr.write(`debug port open ${page.url}\n`);
  const { ws, urls, evalJs } = await connect(page);
  const present = new Set();
  for (const route of routes) {
    await evalJs(`(() => {
      const link = [...document.querySelectorAll("a")].find((el) => el.getAttribute("href") === ${JSON.stringify(route)});
      if (link) link.click();
      return location.href;
    })()`);
    await delay(1500);
    const found = await evalJs(
      `(() => ${JSON.stringify(selectors)}.filter((id) => document.querySelector('[data-testid="' + id + '"]')))()`,
    );
    for (const id of found ?? []) present.add(id);
  }
  ws.close();
  const reportPath = path.join(tmpdir(), "nexus-window-probe.json");
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
  const judged = spawnSync(process.execPath, [smoke, reportPath, exe], { encoding: "utf8" });
  process.stdout.write(judged.stdout || "");
  process.stderr.write(judged.stderr || "");
  process.exitCode = judged.status ?? 1;
} catch (err) {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exitCode = 1;
} finally {
  if (appPid > 0) spawnSync("taskkill", ["/PID", String(appPid), "/T", "/F"], { timeout: 15000 });
}
