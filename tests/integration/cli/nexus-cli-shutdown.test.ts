import { expect, it } from "vitest";
import { spawn } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repo = fileURLToPath(new URL("../../../", import.meta.url));

it("drains pending metrics and stops polling when a golden task throws", async () => {
  const fixture = mkdtempSync(join(tmpdir(), "nexus-cli-shutdown-"));
  let requests = 0;
  let completed = 0;
  const server = createServer((_request, response) => {
    requests += 1;
    setTimeout(() => {
      response.writeHead(200, { "Content-Type": "application/json", Connection: "close" });
      response.end('{"models":[]}', () => { completed += 1; });
    }, 1500);
  });
  await new Promise<void>((ready) => server.listen(0, "127.0.0.1", ready));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing fixture HTTP port");
  let child: ReturnType<typeof spawn> | undefined;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  try {
    const put = (name: string, body: string) => {
      const target = join(fixture, name);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, body);
    };
    mkdirSync(join(fixture, "bin"));
    for (const name of ["nexus.mjs", "goldenRunMetrics.mjs"]) {
      copyFileSync(join(repo, "bin", name), join(fixture, "bin", name));
    }
    // Substitute only task/driver dependencies; exercise the actual entrypoint and collector.
    put("out/modules/coding/evaluation/goldenTaskLoader.js",
      'exports.loadAllGoldenTasks = () => [{ id: "shutdown-fixture" }];');
    put("out/modules/coding/evaluation/GoldenTaskRunner.js",
      'exports.runGoldenTask = async () => { throw new Error("controlled task failure"); };');
    put("out/modules/coding/runtime/HeadlessAgentDriver.js",
      "exports.HeadlessAgentDriver = class HeadlessAgentDriver {};");
    put("out/modules/coding/llm/headlessOllamaClient.js",
      "exports.createHeadlessOllamaClient = () => ({});");
    put("redirect-ps.mjs", `const original = globalThis.fetch;
globalThis.fetch = (url, options) => original(
  String(url) === "http://127.0.0.1:11434/api/ps" ? "http://127.0.0.1:${address.port}/api/ps" : url,
  options,
);`);
    child = spawn(process.execPath, [
      "--import", pathToFileURL(join(fixture, "redirect-ps.mjs")).href,
      join(fixture, "bin", "nexus.mjs"), "golden", "run", "--mode", "live",
      "--task", "shutdown-fixture", "--metrics", join(fixture, "metrics.json"),
    ], { cwd: fixture, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stdout?.resume();
    child.stderr?.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });
    let timedOut = false;
    deadline = setTimeout(() => { timedOut = true; child?.kill(); }, 8000);
    const code = await new Promise<number | null>((done, reject) => {
      child!.once("error", reject);
      child!.once("close", done);
    });
    expect(timedOut, stderr).toBe(false);
    expect(code, stderr).toBe(2);
    expect(stderr).toContain("nexus: controlled task failure");
    expect(requests).toBe(1);
    expect(completed).toBe(1);
  } finally {
    if (deadline) clearTimeout(deadline);
    if (child && child.exitCode === null && child.signalCode === null) {
      await new Promise<void>((done) => { child!.once("close", () => done()); child!.kill(); });
    }
    server.closeAllConnections();
    await new Promise<void>((done) => server.close(() => done()));
    const contained = relative(resolve(tmpdir()), resolve(fixture));
    if (!contained || contained === ".." || contained.startsWith(`..${sep}`)) {
      throw new Error("Fixture cleanup escaped temporary directory");
    }
    rmSync(fixture, { recursive: true, force: true });
  }
}, 15_000);
