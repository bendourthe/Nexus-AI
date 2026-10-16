#!/usr/bin/env node
/**
 * v2.13.0 Phase 5 -- run the durable image viewer in headless Edge and check
 * preview/export pixel equality, real sharpening, and original-byte downloads.
 *
 * Edge is Chromium, the engine behind the desktop's WebView2. No new test
 * dependency: esbuild is already installed and Edge ships with Windows.
 *
 *   node desktop/tests/webview/image-edit-pixels.mjs [--browser <path>] [--out <dir>]
 *
 * Exits 0 when every check passes, 1 on a failed check, 2 when it cannot run.
 */

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const option = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};

const browser =
  option("--browser") ??
  [
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  ].find((candidate) => existsSync(candidate));
if (!browser) {
  console.error("image-edit-pixels: no Edge/Chromium browser found; pass --browser <path>.");
  process.exit(2);
}

const out = option("--out") ?? mkdtempSync(path.join(tmpdir(), "nexus-image-edit-pixels-"));
mkdirSync(out, { recursive: true });

const { build } = await import("esbuild");
await build({
  entryPoints: [path.join(here, "imageEditPixels.entry.tsx")],
  bundle: true,
  format: "iife",
  platform: "browser",
  jsx: "automatic",
  outfile: path.join(out, "page.js"),
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "error",
});
writeFileSync(
  path.join(out, "index.html"),
  '<!doctype html><html><head><meta charset="utf-8"></head><body><script src="page.js"></script></body></html>',
);

// Edge is a GUI-subsystem program on Windows, so --dump-dom never reaches a
// piped stdout. Read the result over the DevTools protocol instead (Node's
// built-in WebSocket; the port is loopback-only and the profile is temporary).
const profile = path.join(out, "profile");
const child = spawn(
  browser,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--remote-debugging-address=127.0.0.1",
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    pathToFileURL(path.join(out, "index.html")).href,
  ],
  { stdio: "ignore" },
);
const deadline = Date.now() + 90_000;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let result;
try {
  const portFile = path.join(profile, "DevToolsActivePort");
  while (!existsSync(portFile)) {
    if (Date.now() > deadline) throw new Error("the browser never opened its DevTools port");
    await sleep(100);
  }
  const port = readFileSync(portFile, "utf8").split(/\r?\n/)[0];
  let page;
  while (!page) {
    if (Date.now() > deadline) throw new Error("no page target appeared");
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    page = targets.find((t) => t.type === "page" && t.url.endsWith("index.html"));
    if (!page) await sleep(100);
  }
  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = () => reject(new Error("DevTools socket failed"));
  });
  let id = 0;
  const pending = new Map();
  socket.onmessage = (event) => {
    const message = JSON.parse(String(event.data));
    if (!Number.isSafeInteger(message.id)) return;
    const settle = pending.get(message.id);
    if (typeof settle !== "function") return;
    pending.delete(message.id);
    settle(message);
  };
  const evaluate = (expression) => new Promise((resolve) => {
    id += 1;
    pending.set(id, resolve);
    socket.send(JSON.stringify({ id, method: "Runtime.evaluate", params: { expression, returnByValue: true } }));
  });
  for (;;) {
    if (Date.now() > deadline) throw new Error("the page produced no result");
    const reply = await evaluate("document.getElementById('result')?.textContent ?? ''");
    const text = reply?.result?.result?.value;
    if (text) {
      result = JSON.parse(text);
      break;
    }
    await sleep(250);
  }
  socket.close();
} catch (error) {
  console.error(`image-edit-pixels: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 2;
} finally {
  child.kill();
}
if (!result) process.exit(2);
writeFileSync(path.join(out, "result.json"), `${JSON.stringify(result, null, 2)}\n`);

const failures = [];
if (!result.ok) failures.push(`page error: ${result.error}`);
else {
  if (result.previewVsExport.differing !== 0) failures.push(`preview and export differ in ${result.previewVsExport.differing} channel values`);
  if (result.viewerVsCommandExport?.differing !== 0) failures.push(`viewer and command exports differ in ${result.viewerVsCommandExport?.differing} channel values`);
  if (!result.sharpening.readback) failures.push("sharpening could not read the canvas back");
  if (result.sharpening.differing === 0) failures.push("sharpening changed no pixels");
  if (result.original.downloadedSha256 !== result.original.sourceSha256) failures.push("the original download is not the source bytes");
  if (result.exportedType !== "image/png") failures.push(`export type ${result.exportedType}`);
}
console.log(JSON.stringify({ ...result, out, failures }, null, 2));
process.exit(failures.length === 0 ? 0 : 1);
