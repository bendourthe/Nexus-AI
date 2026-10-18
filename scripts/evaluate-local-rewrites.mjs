import { readFileSync, existsSync, openSync, closeSync, writeSync, fsyncSync, unlinkSync, mkdirSync, lstatSync, statSync, fstatSync, constants } from "node:fs";
import { resolve, dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { execFileSync } from "node:child_process";
import { load, safePath, exclusive, hash, demand, decode, score, requestFor, verifyWire } from "../lib/rewrite-eval.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

export function pinFetch(endpoint, isLoopbackEndpoint) {
  const origin = new URL(endpoint);
  demand(isLoopbackEndpoint(endpoint) && ["127.0.0.1", "[::1]"].includes(origin.hostname) && !origin.username && !origin.password && origin.href === origin.origin + "/", "UNSAFE_ENDPOINT");
  const original = globalThis.fetch;
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(input instanceof Request ? input.url : input);
    demand(url.origin === origin.origin && !url.username && !url.password && ["/api/chat", "/api/tags", "/api/ps", "/api/version"].includes(url.pathname) && !url.search && !url.hash, "REQUEST_REFUSED");
    const response = await original(input, { ...init, redirect: "error" });
    if (!response.body) return response;
    let size = 0;
    const ceiling = url.pathname === "/api/chat" ? 2 * 1024 * 1024 : 1024 * 1024;
    return new Response(response.body.pipeThrough(new TransformStream({ transform(part, controller) {
      size += part.byteLength; demand(size <= ceiling, "RESPONSE_LIMIT"); controller.enqueue(part);
    } })), { status: response.status, statusText: response.statusText, headers: response.headers });
  };
  return () => { globalThis.fetch = original; };
}

function installed(loaded, catalogOverride) {
  const paths = require(join(loaded.root, "out/core/storage/paths.js"));
  const { resolveHubLayout } = require(join(loaded.root, "out/core/storage/hubVersionManifest.js"));
  const catalog = catalogOverride ?? paths.catalogRoot();
  const layout = resolveHubLayout(catalog);
  const skills = safePath(catalog, relative(catalog, paths.hubLayoutDir(catalog, "skills", layout)));
  const selected = safePath(skills, loaded.contract.skill.relativePath);
  demand(!existsSync(join(catalog, "quarantine", loaded.contract.skill.relativePath)), "SKILL_QUARANTINED");
  const body = readFileSync(selected);
  demand(hash(body) === loaded.contract.skill.sha256, "SKILL_CHANGED");
}

async function probe(contract, path, signal) {
  const bounded = signal ? AbortSignal.any([signal, AbortSignal.timeout(5000)]) : AbortSignal.timeout(5000);
  const response = await fetch(contract.endpoint + path, { signal: bounded });
  demand(response.ok, "PROBE_FAILED");
  const bytes = await response.text();
  demand(bytes.length <= 1024 * 1024, "PROBE_LIMIT");
  return JSON.parse(bytes);
}
async function identity(contract, signal) {
  const tags = await probe(contract, "/api/tags", signal);
  const model = tags.models?.find((m) => m.name === contract.model.name);
  demand(model?.digest === contract.model.digest, "MODEL_CHANGED");
  const runtime = await probe(contract, "/api/version", signal);
  demand(runtime.version === contract.model.runtime, "RUNTIME_CHANGED");
  return model.digest;
}

function ledger(loaded) {
  const file = safePath(loaded.root, loaded.contract.ledger, true);
  const fd = openSync(file, constants.O_CREAT | constants.O_APPEND | constants.O_RDWR | (constants.O_NOFOLLOW ?? 0), 0o600);
  const owner = fstatSync(fd);
  let before;
  try {
    demand(owner.isFile() && owner.nlink === 1, "OWNERSHIP_CHANGED");
    safePath(loaded.root, file);
    const current = statSync(file);
    demand(current.dev === owner.dev && current.ino === owner.ino && current.nlink === 1, "OWNERSHIP_CHANGED");
    before = readFileSync(fd, "utf8").trim().split("\n").filter(Boolean).map(JSON.parse);
    demand(before.every((r) => r.contractSha256 === loaded.contractSha256), "LEDGER_MISMATCH");
  } catch (error) { closeSync(fd); throw error; }
  return {
    events: before,
    append(event) {
      const row = { ...event, contractSha256: loaded.contractSha256 }; safePath(loaded.root, file);
      const current = statSync(file);
      demand(current.dev === owner.dev && current.ino === owner.ino && current.nlink === 1, "OWNERSHIP_CHANGED");
      writeSync(fd, JSON.stringify(row) + "\n"); fsyncSync(fd); this.events.push(row);
    },
    close() { closeSync(fd); },
  };
}
function remaining(journal, contract) {
  const starts = journal.events.filter((r) => r.type === "request-start");
  const activeMs = starts.reduce((sum, r) => sum + (journal.events.find((e) => e.type === "request-end" && e.id === r.id)?.durationMs ?? contract.budgets.callMs), 0);
  demand(starts.length < contract.budgets.calls && activeMs + contract.budgets.callMs <= contract.budgets.activeMs, "BUDGET_EXHAUSTED");
}

export async function collect(loaded, group, output, { catalogRoot, leaseRoot = join(homedir(), ".nexus-hub", "runs") } = {}) {
  const { contract } = loaded;
  const { isLoopbackEndpoint } = require(join(loaded.root, "out/modules/coding/llm/loopback.js"));
  const restore = pinFetch(contract.endpoint, isLoopbackEndpoint);
  let sink, journal, lease, leaseIdentity;
  const leasePath = join(leaseRoot, "local-rewrite-evaluation.lock");
  let cancel;
  const interrupted = () => cancel?.abort();
  let signalSeen = false;
  const interrupt = () => { signalSeen = true; interrupted(); };
  try {
    installed(loaded, catalogRoot);
    // Imports happen only after the standalone process has pinned all fetches.
    const { createHeadlessOllamaClient } = require(join(loaded.root, "out/modules/coding/llm/headlessOllamaClient.js"));
    mkdirSync(leaseRoot, { recursive: true });
    safePath(dirname(leaseRoot), leaseRoot);
    try { lease = openSync(leasePath, "wx", 0o600); } catch { throw new Error("RUN_BUSY"); }
    leaseIdentity = fstatSync(lease);
    writeSync(lease, JSON.stringify({ pid: process.pid, started: new Date().toISOString() }));
    journal = ledger(loaded);
    demand(!journal.events.some((r) => r.type === "mode-start" && r.group === group), "MODE_ALREADY_ATTEMPTED");
    if (group === "heldOut") {
      const committed = execFileSync("git", ["show", "HEAD:" + relative(loaded.root, loaded.contractPath).replaceAll("\\", "/")], { cwd: loaded.root, stdio: ["ignore", "pipe", "ignore"] });
      demand(hash(committed) === loaded.contractSha256, "CONTRACT_NOT_COMMITTED");
    }
    sink = exclusive(loaded.root, output);
    journal.append({ type: "mode-start", group });
    sink.append(JSON.stringify({ type: "run", group, observedAt: new Date().toISOString(), contractSha256: loaded.contractSha256, adaptationSha256: contract.adaptationSha256, skillSha256: contract.skill.sha256, modelDigest: contract.model.digest, identityMethod: "observational pre/post tags, not response-bound; concurrent tag flips cannot be excluded" }) + "\n");
    const client = createHeadlessOllamaClient({ baseUrl: contract.endpoint, timeoutMs: contract.budgets.callMs });
    process.on("SIGINT", interrupt); process.on("SIGTERM", interrupt);
    let pilotHold = false;
    if (group === "heldOut") {
      const pilotRecords = readFileSync(safePath(loaded.root, contract.pilot), "utf8").trim().split("\n").map(JSON.parse);
      demand(pilotRecords[0]?.group === "pilot", "PILOT_MISMATCH");
      const pilotScore = score(loaded, pilotRecords);
      pilotHold = pilotScore.rows.some((r) => r.status === "HOLD");
    }
    for (const item of loaded[group]) {
      const result = { type: "result", id: item.id, contractSha256: loaded.contractSha256, status: "error", reason: null, raw: "", rawSha256: null, rewriteSha256: null, wireBase64: "", wireSha256: null, thinking: "", done: false, durationMs: null, promptTokens: null, completionTokens: null, residentBytes: null, memoryMethod: "Ollama api/ps snapshot, not peak", identityBefore: null, identityAfter: null, requestSha256: hash(JSON.stringify(requestFor(contract, item))) };
      if (pilotHold || signalSeen) {
        result.reason = pilotHold ? "PILOT_HOLD_NOT_RUN" : "CANCELLED_NOT_RUN";
        sink.append(JSON.stringify(result) + "\n"); continue;
      }
      const started = performance.now();
      let timer;
      const fetchBefore = globalThis.fetch;
      const wire = [];
      let wireSize = 0;
      let chatBody;
      try {
        cancel = new AbortController();
        timer = setTimeout(() => cancel.abort(), contract.budgets.callMs);
        demand(!signalSeen, "CANCELLED");
        remaining(journal, contract);
        demand(!journal.events.some((r) => r.type === "request-start" && r.id === item.id), "ID_ALREADY_ATTEMPTED");
        result.identityBefore = await identity(contract, cancel.signal);
        const ps = await probe(contract, "/api/ps", cancel.signal);
        demand(Array.isArray(ps.models) && ps.models.every((m) => m.name === contract.model.name), "GPU_WORKLOAD_PRESENT");
        demand(!signalSeen, "CANCELLED");
        result.residentBytes = ps.models.find((m) => m.name === contract.model.name)?.size ?? null;
        journal.append({ type: "request-start", id: item.id, group });
        globalThis.fetch = async (url, init) => {
          const response = await fetchBefore(url, init);
          if (new URL(url instanceof Request ? url.url : url).pathname !== "/api/chat" || !response.body) return response;
          chatBody = response.body.pipeThrough(new TransformStream({ transform(part, controller) {
            wireSize += part.byteLength;
            if (wireSize > 2 * 1024 * 1024) { cancel.abort(); throw new Error("WIRE_LIMIT"); }
            wire.push(Buffer.from(part)); controller.enqueue(part);
          } }));
          return new Response(chatBody, { status: response.status, headers: response.headers });
        };
        for await (const chunk of client.streamChat(requestFor(contract, item), cancel.signal)) {
          demand(!chunk.message.tool_calls?.length && chunk.message.role === "assistant", "TOOLS_REFUSED");
          result.raw += chunk.message.content;
          result.thinking += chunk.message.thinking ?? "";
          demand(Buffer.byteLength(result.raw) + Buffer.byteLength(result.thinking) <= contract.budgets.outputChars, "OUTPUT_LIMIT");
          if (chunk.done) {
            result.done = true;
            result.promptTokens = chunk.prompt_eval_count ?? null;
            result.completionTokens = chunk.eval_count ?? null;
          }
        }
        demand(result.done, "INCOMPLETE_STREAM");
        demand(chatBody, "INCOMPLETE_STREAM");
        // The reused client returns on done; bounded EOF is still required here.
        for await (const _part of chatBody) { /* Capture and validate trailing frames. */ }
        result.wireBase64 = Buffer.concat(wire).toString("base64"); result.wireSha256 = hash(Buffer.concat(wire));
        verifyWire(result, contract);
        const parsed = decode(result.raw);
        result.rewriteSha256 = parsed.rewriteSha256;
        result.identityAfter = await identity(contract, cancel.signal);
        demand(result.promptTokens !== null && result.completionTokens !== null && result.promptTokens + result.completionTokens < contract.options.num_ctx, "CONTEXT_UNPROVEN");
        result.status = "complete";
      } catch (error) {
        cancel?.abort();
        result.reason = /^[A-Z_]+$/.test(error.message) ? error.message : "REQUEST_OR_FORMAT_FAILURE";
        if (group === "pilot") pilotHold = true;
      } finally {
        cancel?.abort(); clearTimeout(timer); globalThis.fetch = fetchBefore; cancel = null;
        result.durationMs = Math.ceil(performance.now() - started);
        result.rawSha256 = hash(result.raw);
        const wireBytes = Buffer.concat(wire); result.wireBase64 = wireBytes.toString("base64"); result.wireSha256 = hash(wireBytes);
        if (journal.events.some((r) => r.type === "request-start" && r.id === item.id)) journal.append({ type: "request-end", id: item.id, durationMs: result.durationMs });
      }
      sink.append(JSON.stringify(result) + "\n");
    }
    return { disposition: "HOLD", group, denominator: loaded[group].length, semantic: "unreviewed" };
  } finally {
    process.off("SIGINT", interrupt); process.off("SIGTERM", interrupt);
    sink?.close(); journal?.close();
    if (lease !== undefined) {
      closeSync(lease);
      if (existsSync(leasePath)) {
        const current = lstatSync(leasePath);
        if (!current.isSymbolicLink() && current.dev === leaseIdentity.dev && current.ino === leaseIdentity.ino) unlinkSync(leasePath);
      }
    }
    restore();
  }
}

export async function run(args, options = {}) {
  const flags = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]; demand(!Object.hasOwn(flags, arg), "DUPLICATE_FLAG");
    if (["--validate-only", "--run-pilot", "--run-baseline"].includes(arg)) flags[arg] = true;
    else if (["--contract", "--score", "--output"].includes(arg) && args[i + 1] && !args[i + 1].startsWith("--")) flags[arg] = args[++i];
    else throw new Error("INVALID_ARGUMENT");
  }
  demand(flags["--contract"] && ["--validate-only", "--run-pilot", "--run-baseline", "--score"].filter((f) => flags[f]).length === 1, "INVALID_ARGUMENT");
  const loaded = load(options.root ?? root, flags["--contract"]);
  if (flags["--validate-only"]) { demand(!flags["--output"], "INVALID_ARGUMENT"); return { disposition: "VALID", pilot: 4, heldOut: 16, contractSha256: loaded.contractSha256, inference: false }; }
  demand(flags["--output"], "OUTPUT_REQUIRED");
  if (flags["--score"]) {
    const bytes = readFileSync(safePath(loaded.root, flags["--score"]));
    demand(bytes.length <= 64 * 1024 * 1024, "EVIDENCE_LIMIT");
    const result = score(loaded, bytes.toString("utf8").trim().split("\n").map(JSON.parse));
    const output = exclusive(loaded.root, flags["--output"]);
    try { output.append(JSON.stringify(result, null, 2) + "\n"); } finally { output.close(); }
    return { disposition: result.disposition, denominator: result.denominator, present: result.present, completedOutputs: result.completedOutputs, missing: result.missing.length };
  }
  return collect(loaded, flags["--run-pilot"] ? "pilot" : "heldOut", flags["--output"], options);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  run(process.argv.slice(2)).then((result) => console.log(JSON.stringify(result))).catch((error) => { console.error(/^[A-Z_]+$/.test(error.message) ? error.message : "EVALUATION_REFUSED"); process.exitCode = 1; });
}
