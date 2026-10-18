import { describe, test, expect, afterEach, beforeAll, vi } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, symlinkSync, existsSync } from "node:fs";
import { resolve, join, relative } from "node:path";
import { spawnSync, execFile } from "node:child_process";
import { promisify } from "node:util";
import { createServer, type Server } from "node:http";
import { buildSync } from "esbuild";
// Development-only ESM helpers intentionally have no TypeScript production surface.
// @ts-expect-error JavaScript evaluator module.
import { load, hash, decode, literalScore, score, requestFor, safePath } from "../../../lib/rewrite-eval.mjs";
// @ts-expect-error JavaScript CLI module.
import { collect, pinFetch } from "../../../scripts/evaluate-local-rewrites.mjs";

const root = resolve(__dirname, "../../..");
const contractFile = "docs/releases/v2/v2.14/development/v2.14.1-rewrite-contract.json";
const script = join(root, "scripts/evaluate-local-rewrites.mjs");
const execute = promisify(execFile);
const temporary: string[] = [];
const servers: Server[] = [];
beforeAll(() => {
  const entries = ["modules/coding/llm/loopback.ts", "modules/coding/llm/headlessOllamaClient.ts", "core/storage/paths.ts", "core/storage/hubVersionManifest.ts"];
  if (entries.some((entry) => !existsSync(join(root, "out", entry.replace(/\.ts$/, ".js"))))) {
    buildSync({ entryPoints: entries.map((entry) => join(root, entry)), outdir: join(root, "out"), outbase: root, bundle: true, platform: "node", format: "cjs", logLevel: "silent" });
  }
});
afterEach(async () => {
  for (const server of servers.splice(0)) { server.closeAllConnections(); await new Promise<void>((done) => server.close(() => done())); }
  for (const path of temporary.splice(0)) rmSync(path, { recursive: true, force: true });
  vi.restoreAllMocks();
});

function sandbox() {
  mkdirSync(join(root, ".nexus-hub"), { recursive: true });
  const dir = mkdtempSync(join(root, ".nexus-hub/rewrite-test-")); temporary.push(dir);
  const contract = JSON.parse(readFileSync(join(root, contractFile), "utf8"));
  const manifest = JSON.parse(readFileSync(join(root, contract.fixtureManifest), "utf8"));
  for (const entry of Object.values(manifest.files) as { path: string; sha256: string }[]) {
    const bytes = readFileSync(join(root, entry.path));
    entry.path = relative(root, join(dir, entry.path.split("/").at(-1)!)).replaceAll("\\", "/");
    writeFileSync(join(root, entry.path), bytes);
  }
  contract.fixtureManifest = relative(root, join(dir, "manifest.json"));
  writeFileSync(join(dir, "manifest.json"), JSON.stringify(manifest));
  contract.fixtureManifestSha256 = hash(readFileSync(join(dir, "manifest.json")));
  contract.ledger = relative(root, join(dir, "ledger.jsonl"));
  contract.pilot = relative(root, join(dir, "pilot.jsonl"));
  const catalogRoot = join(dir, "catalog");
  const skill = join(catalogRoot, "skills", contract.skill.relativePath);
  mkdirSync(resolve(skill, ".."), { recursive: true }); writeFileSync(skill, "Synthetic test skill, not installed guidance.");
  contract.skill.sha256 = hash(readFileSync(skill));
  const file = relative(root, join(dir, "contract.json"));
  const save = () => { const bytes = JSON.stringify(contract); writeFileSync(join(root, file), bytes); writeFileSync(join(root, file + ".sha256"), hash(bytes)); };
  save();
  return { dir, contract, file, save, catalogRoot, leaseRoot: join(dir, "leases") };
}

async function serverFor(s: ReturnType<typeof sandbox>, behavior = "valid") {
  let calls = 0;
  let closed = 0;
  const server = createServer(async (req, res) => {
    if (req.url === "/api/tags" && behavior === "interrupt") { process.emit("SIGINT"); return res.end("{}"); }
    if (req.url === "/api/tags") return res.end(behavior === "oversized-probe" ? "x".repeat(1024 * 1024 + 1) : JSON.stringify({ models: [{ name: s.contract.model.name, digest: behavior === "identity" ? "a".repeat(64) : s.contract.model.digest }] }));
    if (req.url === "/api/version") return res.end(JSON.stringify({ version: s.contract.model.runtime }));
    if (req.url === "/api/ps") return res.end(JSON.stringify({ models: [] }));
    calls++;
    res.on("close", () => closed++);
    if (behavior === "timeout") return;
    let body = ""; for await (const part of req) body += part;
    const draft = JSON.parse(JSON.parse(body).messages[1].content).draft;
    let content = JSON.stringify({ rewrite: draft, changes: [] });
    if (behavior === "format") content = "```json\n" + content + "\n```";
    if (behavior === "cap") content = "x".repeat(12001);
    const row = { message: { role: "assistant", content, ...(behavior === "tool" ? { tool_calls: [{ function: { name: "erase", arguments: {} } }] } : {}), ...(behavior === "thinking" ? { thinking: "internal reasoning" } : {}) }, done: behavior !== "incomplete", done_reason: behavior === "length" ? "length" : "stop", ...(behavior === "usage" ? {} : { prompt_eval_count: 100, eval_count: 20 }), ...(behavior === "wire-error" ? { error: "failed to finish" } : {}) };
    let wire = behavior === "malformed" ? "{broken\n" : JSON.stringify(row) + "\n";
    if (behavior === "duplicate-terminal") wire += wire;
    if (behavior === "duplicate-content") wire = wire.replace('"content":', '"content":"ignored","content":');
    if (behavior === "open") { res.write(wire); return; }
    if (behavior === "delayed-terminal") { res.write(wire); setTimeout(() => res.end(wire), 40); return; }
    res.end(wire);
  });
  servers.push(server); await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const address = server.address(); if (!address || typeof address === "string") throw new Error("No port");
  s.contract.endpoint = `http://127.0.0.1:${address.port}`; s.save();
  return Object.assign(() => calls, { closed: () => closed });
}

describe("local rewrite evaluation boundary", () => {
  test("real CLI validates frozen corpus without runtime or VS Code", () => {
    const result = spawnSync(process.execPath, [script, "--contract", contractFile, "--validate-only"], { cwd: root, encoding: "utf8" });
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({ inference: false, pilot: 4, heldOut: 16 });
  });
  test.each([["--unknown"], ["--contract"], ["--validate-only", "--validate-only"], ["--run-pilot", "--run-baseline"]])("real CLI rejects invalid flags %j", (args) => {
    const result = spawnSync(process.execPath, [script, ...args], { cwd: root, encoding: "utf8" });
    expect(result.status).toBe(1); expect(result.stderr).toMatch(/INVALID_ARGUMENT|DUPLICATE_FLAG/);
  });
  test("changed frozen contract, fixture and rubric are refused", () => {
    const s = sandbox(); writeFileSync(join(root, s.file), "{}"); expect(() => load(root, s.file)).toThrow("CONTRACT_CHANGED");
    s.save(); s.contract.rubric.missing = "PASS"; s.save(); expect(() => load(root, s.file)).toThrow("RUBRIC_CHANGED");
    s.contract.rubricSha256 = hash(JSON.stringify(s.contract.rubric)); s.save();
    writeFileSync(join(s.dir, "held-out.json"), "[]"); expect(() => load(root, s.file)).toThrow("FIXTURE_CHANGED");
  });
  test.each(["http://example.com", "http://localhost:11434", "http://127.0.0.1@evil.invalid", "http://127.0.0.1:11434/other", "file:///etc/passwd"]) ("unsafe endpoint %s refuses before collection", (endpoint) => {
    const s = sandbox(); s.contract.endpoint = endpoint; s.save(); expect(() => load(root, s.file)).toThrow("UNSAFE_ENDPOINT");
  });
  test("path escape and junctions are refused", () => {
    const s = sandbox(); expect(() => safePath(root, "../elsewhere")).toThrow("PATH_ESCAPE");
    const linked = join(s.dir, "junction"); symlinkSync(s.dir, linked, process.platform === "win32" ? "junction" : "dir");
    expect(() => safePath(root, join(linked, "contract.json"))).toThrow("LINK_REFUSED");
  });
  test.each(["plain", '{"rewrite":"x","changes":[],"other":1}', '{"rewrite":["x"],"changes":[]}', '{"rewrite":"x"}', '{"rewrite":"x","rewrite":"y","changes":[]}']) ("strict response refuses %s", (raw) => expect(() => decode(raw)).toThrow());
  test("commentary cannot satisfy rewrite literals, and fact swaps remain unreviewed", () => {
    const item = { literals: [{ text: "Arin", count: 1 }, { text: "12 kg", count: 1 }, { text: "Belen", count: 1 }, { text: "18 kg", count: 1 }], structures: [] };
    const swapped = literalScore(item, "Arin: 18 kg. Belen: 12 kg.");
    expect(swapped.literals.every((o: { pass: boolean }) => o.pass)).toBe(true); expect(swapped.semantic).toBe("unreviewed");
    const parsed = decode(JSON.stringify({ rewrite: "Arin: 18 kg.", changes: ["Belen: 12 kg."] }));
    expect(literalScore(item, parsed.rewrite).literals.filter((o: { pass: boolean }) => !o.pass)).toHaveLength(2);
  });
  test.each(["I did approve it.", "The meter is accurate.", "The trial cured the disease.", "[log](https://evil.invalid)", "| A | 99 L |"]) ("adversarial prose never gains semantic approval: %s", (rewrite) => {
    const item = load(root, contractFile).heldOut[4]; expect(literalScore(item, rewrite).semantic).toBe("unreviewed");
  });
  test("partial runs preserve all missing IDs and reject duplicate or unknown IDs", () => {
    const loaded = load(root, contractFile);
    const head = { type: "run", group: "heldOut", contractSha256: loaded.contractSha256 };
    expect(score(loaded, [head])).toMatchObject({ disposition: "HOLD", denominator: 16, present: 0 });
    const row = { type: "result", id: loaded.heldOut[0].id, contractSha256: loaded.contractSha256, status: "error" };
    expect(() => score(loaded, [head, row, row])).toThrow("DUPLICATE_ID");
    expect(() => score(loaded, [head, { ...row, id: "invented" }])).toThrow("RUN_MISMATCH");
  });
  test("real scoring CLI preserves an existing output", () => {
    const s = sandbox(); const input = join(s.dir, "input.jsonl"); const out = join(s.dir, "score.json");
    writeFileSync(input, JSON.stringify({ type: "run", group: "heldOut", contractSha256: load(root, s.file).contractSha256 }) + "\n");
    const args = [script, "--contract", s.file, "--score", input, "--output", out];
    expect(spawnSync(process.execPath, args, { encoding: "utf8" }).status).toBe(0);
    const before = readFileSync(out); expect(spawnSync(process.execPath, args, { encoding: "utf8" }).status).toBe(1); expect(readFileSync(out)).toEqual(before);
  });
  test.each(["valid", "thinking", "format", "tool", "cap", "incomplete", "usage", "identity", "malformed", "duplicate-terminal", "delayed-terminal", "duplicate-content", "wire-error", "length", "oversized-probe"]) ("existing headless client observes controlled %s response", async (behavior) => {
    const s = sandbox(); const calls = await serverFor(s, behavior);
    const loaded = load(root, s.file); const out = join(s.dir, "pilot.jsonl");
    await collect(loaded, "pilot", out, s);
    const rows = readFileSync(out, "utf8").trim().split("\n").map((line) => JSON.parse(line));
    expect(rows).toHaveLength(5);
    if (["valid", "thinking"].includes(behavior)) {
      expect(calls()).toBe(4); expect(rows.slice(1).every((r) => r.status === "complete")).toBe(true);
      expect(score(loaded, rows).disposition).toBe("HOLD");
      const scored = score(loaded, rows);
      expect(scored.rows.every((r: { status: string; exactPass: boolean }) => r.status === "UNREVIEWED" && r.exactPass)).toBe(true);
      expect(scored.completedOutputs).toBe(4); expect(scored.missing).toEqual([]);
      for (const mutation of ["tools", "counters"]) {
        const changed = structuredClone(rows);
        const frame = JSON.parse(Buffer.from(changed[1].wireBase64, "base64").toString("utf8"));
        if (mutation === "tools") frame.message.tool_calls = {}; else frame.eval_count++;
        const bytes = JSON.stringify(frame) + "\n";
        changed[1].wireBase64 = Buffer.from(bytes).toString("base64"); changed[1].wireSha256 = hash(bytes);
        expect(score(loaded, changed).rows[0].status).toBe("HOLD");
      }
      expect(rows[1].requestSha256).toBe(hash(JSON.stringify(requestFor(loaded.contract, loaded.pilot[0]))));
      rows[1].rewriteSha256 = "0".repeat(64); expect(score(loaded, rows).rows[0].status).toBe("HOLD");
    } else {
      expect(rows[1].status).toBe("error"); expect(rows[2].reason).toBe("PILOT_HOLD_NOT_RUN");
      expect(score(loaded, rows).rows.every((r: { status: string }) => r.status === "HOLD")).toBe(true);
    }
  });
  test.each([307, 308])("redirect %s never sends a body to its destination", async (status) => {
    let received = 0;
    const destination = createServer((_req, res) => { received++; res.end("unexpected"); }); servers.push(destination);
    await new Promise<void>((done) => destination.listen(0, "127.0.0.1", done));
    const address = destination.address(); if (!address || typeof address === "string") throw new Error("No port");
    const redirect = createServer((_req, res) => { res.writeHead(status, { Location: `http://127.0.0.1:${address.port}/api/chat` }); res.end(); }); servers.push(redirect);
    await new Promise<void>((done) => redirect.listen(0, "127.0.0.1", done));
    const from = redirect.address(); if (!from || typeof from === "string") throw new Error("No port");
    const undo = pinFetch(`http://127.0.0.1:${from.port}`, () => true);
    try { await expect(fetch(`http://127.0.0.1:${from.port}/api/chat`, { method: "POST", body: "synthetic draft" })).rejects.toThrow(); } finally { undo(); }
    expect(received).toBe(0);
  });
  test("lease contention refuses without touching prior output", async () => {
    const s = sandbox(); await serverFor(s); mkdirSync(s.leaseRoot); writeFileSync(join(s.leaseRoot, "local-rewrite-evaluation.lock"), "other process");
    const out = join(s.dir, "prior.jsonl"); writeFileSync(out, "keep");
    await expect(collect(load(root, s.file), "pilot", out, s)).rejects.toThrow("RUN_BUSY"); expect(readFileSync(out, "utf8")).toBe("keep");
  });
  test.each(["timeout", "open"])("deadline aborts %s and preserves its spent attempt", async (behavior) => {
    const s = sandbox(); const calls = await serverFor(s, behavior);
    const original = globalThis.setTimeout;
    vi.spyOn(globalThis, "setTimeout").mockImplementation(((callback: (...args: unknown[]) => void, ms?: number, ...args: unknown[]) => original(callback, ms === 120000 ? 250 : ms, ...args)) as typeof setTimeout);
    const out = join(s.dir, "pilot.jsonl"); await collect(load(root, s.file), "pilot", out, s);
    expect(calls()).toBe(1);
    const rows = readFileSync(out, "utf8").trim().split("\n").map(JSON.parse);
    expect(rows[1].status).toBe("error");
    if (behavior === "timeout") expect(rows[1].promptTokens).toBeNull();
    const events = readFileSync(join(root, s.contract.ledger), "utf8").trim().split("\n").map(JSON.parse);
    expect(events.filter((e) => e.type === "request-start")).toHaveLength(1);
    await expect(collect(load(root, s.file), "pilot", join(s.dir, "retry.jsonl"), s)).rejects.toThrow("MODE_ALREADY_ATTEMPTED");
  });
  test("preflight interruption dispatches no chat and spends no request", async () => {
    const s = sandbox(); const calls = await serverFor(s, "interrupt");
    const out = join(s.dir, "pilot.jsonl"); await collect(load(root, s.file), "pilot", out, s);
    expect(calls()).toBe(0);
    const events = readFileSync(join(root, s.contract.ledger), "utf8").trim().split("\n").map(JSON.parse);
    expect(events.filter((e) => e.type === "request-start")).toEqual([]);
  });
  test("uncommitted held-out contracts refuse before dispatch", async () => {
    const s = sandbox(); const calls = await serverFor(s);
    await expect(collect(load(root, s.file), "heldOut", join(s.dir, "run.jsonl"), s)).rejects.toThrow();
    expect(calls()).toBe(0); expect(existsSync(join(s.dir, "run.jsonl"))).toBe(false);
  });
  test("saved baseline retains every held-out identity without implying outputs", () => {
    const loaded = load(root, contractFile);
    const rows = readFileSync(join(root, "docs/releases/v2/v2.14/development/rewrite-eval/run-001.jsonl"), "utf8").trim().split("\n").map(JSON.parse);
    expect(rows.slice(1).map((r) => r.id)).toEqual(loaded.heldOut.map((item: { id: string }) => item.id));
    expect(rows.slice(1).every((r) => r.reason === "PILOT_HOLD_NOT_RUN")).toBe(true);
    expect(score(loaded, rows)).toMatchObject({ denominator: 16, present: 16, completedOutputs: 0, disposition: "HOLD", missing: loaded.heldOut.map((item: { id: string }) => item.id) });
  });
  test("persisted attempts refuse pilot replay across separate Node processes", async () => {
    const s = sandbox(); const calls = await serverFor(s);
    const source = `import {run} from ${JSON.stringify(new URL("../../../scripts/evaluate-local-rewrites.mjs", import.meta.url).href)}; await run(${JSON.stringify(["--contract", s.file, "--run-pilot", "--output", join(s.dir, "pilot.jsonl")])}, ${JSON.stringify({ catalogRoot: s.catalogRoot, leaseRoot: s.leaseRoot })});`;
    await execute(process.execPath, ["--input-type=module", "-e", source], { cwd: root });
    expect(calls()).toBe(4);
    await expect(execute(process.execPath, ["--input-type=module", "-e", source.replace("pilot.jsonl", "replay.jsonl")], { cwd: root })).rejects.toThrow("MODE_ALREADY_ATTEMPTED");
    expect(calls()).toBe(4);
  });
});
