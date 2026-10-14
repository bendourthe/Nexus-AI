import { mkdtempSync, writeFileSync, rmSync, existsSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { createOllamaClient } from "../modules/coding/llm/OllamaClient.ts";
import { MemorySubsystem } from "../src/storage/MemorySubsystem.ts";
import { loadEvaluation, validateVector, cosine, EvaluationError, compareArms } from "../lib/embedding-eval.mjs";

async function main() {
const config = JSON.parse(process.env.NEXUS_EMBEDDING_EVAL_CONFIG);
const { contract, fixture } = loadEvaluation(config.root, config.contractPath);
const realFetch = globalThis.fetch;
const requests = [];
const commonContext = Math.min(contract.baseline.contextTokens, contract.candidate.contextTokens);
let processRamSampledBytes = process.memoryUsage().rss;
let residency = [];

// Instrument the genuine adapter request without altering application defaults.
// This is a JavaScript request boundary, not OS-level egress containment.
globalThis.fetch = async (input, init = {}) => {
  const url = new URL(typeof input === "string" ? input : input.url);
  if (url.origin !== config.baseUrl) throw new EvaluationError("NON_LOOPBACK_REQUEST", "Unexpected inference destination.");
  let options = init;
  if (url.pathname === "/api/embed" && init.body) {
    const body = JSON.parse(init.body);
    body.options = { ...body.options, num_ctx: commonContext };
    body.truncate = false;
    options = { ...init, body: JSON.stringify(body), redirect: "error" };
    requests.push({ model: body.model, contextTokens: commonContext, truncate: false });
  }
  return realFetch(input, { ...options, redirect: "error" });
};

async function management(path, body) {
  const response = await fetch(config.baseUrl + path, {
    ...(body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(contract.measurement.perRequestTimeoutMs),
  });
  if (!response.ok) throw new EvaluationError("RUNTIME_REQUEST_FAILED", path + ": " + response.status);
  return response.json();
}

async function sample() {
  processRamSampledBytes = Math.max(processRamSampledBytes, process.memoryUsage().rss);
  const response = await management("/api/ps");
  if ((response.models ?? []).some((entry) => !Object.values(config.aliases).includes(entry.name))) {
    throw new EvaluationError("HOST_BUSY", "Another session loaded a model during evaluation.");
  }
  residency.push({ at: new Date().toISOString(), models: response.models ?? [] });
}

async function unload(model) {
  await management("/api/embed", { model, input: [], keep_alive: 0 });
  const loaded = (await management("/api/ps")).models ?? [];
  if (loaded.some((entry) => entry.name === model)) {
    throw new EvaluationError("COLD_LOAD_NOT_PROVEN", "Owned evaluation model is still resident.");
  }
}

async function evaluateArm(name, model, recipe) {
  const root = mkdtempSync(join(tmpdir(), "nexus-embedding-" + name + "-"));
  const client = createOllamaClient({ baseUrl: config.baseUrl, timeoutMs: contract.measurement.perRequestTimeoutMs });
  let kind = "code";
  let chunk = null;
  let lastVector = null;
  let vectorFailure = null;
  const norms = [];
  const port = Object.create(client);
  port.embed = async (text) => {
    const prepared = name === "candidate"
      ? chunk ? "title: " + chunk.title + " | text: " + text : recipe.queryPrefixes[kind] + text
      : text;
    try {
      const result = await client.embed(prepared, model);
      const norm = validateVector(result.embedding, recipe.dimension);
      if (!result.available) throw new EvaluationError("MODEL_UNAVAILABLE", "Embedding model unavailable.");
      norms.push(norm);
      lastVector = result.embedding;
      return result;
    } catch (error) {
      vectorFailure = error;
      throw error;
    }
  };
  const coldMilliseconds = [];
  const warmMilliseconds = [];
  const queries = [];
  const rows = new Map();
  const nativeNow = Date.now;
  let memory;
  try {
    for (let repetition = 0; repetition < contract.measurement.coldLoads; repetition++) {
      await unload(model);
      const start = performance.now();
      await port.embed("Where does Nexus store local memories?");
      coldMilliseconds.push(performance.now() - start);
      await sample();
    }
    // Freeze recency in ranking and insertion; timeouts retain the native clock.
    Date.now = () => contract.retrieval.clockEpochMs;
    memory = new MemorySubsystem({
      dbPath: join(root, "memory.db"), llmClient: port, embeddingModel: model,
      hnsw: { indexPath: join(root, "memory.hnsw"), threshold: contract.retrieval.primaryHnswThreshold },
    });
    if (!memory.isReady) throw new EvaluationError("MEMORY_UNAVAILABLE", "Disposable memory composition failed.");
    for (const entry of fixture.chunks) {
      chunk = entry;
      const saved = await memory.memoryStore.save(entry.text, "fact");
      if (vectorFailure) throw vectorFailure;
      validateVector(saved.embedding);
      if (saved.content !== entry.text) throw new EvaluationError("CORPUS_MUTATED", "Storage changed frozen input: " + entry.id);
      rows.set(saved.id, entry.id);
    }
    chunk = null;
    if (memory.memoryStore.count() !== fixture.chunks.length) throw new EvaluationError("ROW_COUNT_MISMATCH", "Unexpected corpus row count.");
    const search = async (query) => {
      kind = query.kind;
      lastVector = null;
      const start = performance.now();
      const ranked = await memory.memoryStore.searchHybrid(query.text, contract.retrieval.limit, contract.retrieval.method);
      const milliseconds = performance.now() - start;
      if (vectorFailure) throw vectorFailure;
      validateVector(lastVector);
      const top5 = ranked.map((result) => {
        validateVector(result.entry.embedding);
        const id = rows.get(result.entry.id);
        if (!id) throw new EvaluationError("UNKNOWN_ROW", "Retrieval escaped the frozen corpus.");
        return id;
      });
      const maxCosine = ranked.length ? Math.max(...ranked.map((result) => cosine(lastVector, result.entry.embedding))) : -1;
      return { id: query.id, top5, accepted: maxCosine >= contract.retrieval.rejection.cosineThreshold, maxCosine, milliseconds };
    };
    for (let repetition = 0; repetition < contract.measurement.warmRepetitions; repetition++) {
      warmMilliseconds.push((await search(fixture.queries[0])).milliseconds);
      if (repetition % 5 === 0) await sample();
    }
    for (const query of fixture.queries) {
      queries.push(await search(query));
      if (queries.length % 10 === 0) {
        await sample();
        process.stderr.write(name + ": " + queries.length + "/100 queries\n");
      }
    }
    const primaryIndexAbsent = !existsSync(join(root, "memory.hnsw"));
    // The facade chooses the native HNSW path at threshold 1; preserve the same rows.
    memory.close();
    memory = new MemorySubsystem({
      dbPath: join(root, "memory.db"), llmClient: port, embeddingModel: model,
      hnsw: { indexPath: join(root, "memory.hnsw"), threshold: contract.retrieval.supplementalHnswThreshold },
    });
    if (!memory.isReady) throw new EvaluationError("MEMORY_UNAVAILABLE", "Supplemental facade failed.");
    const supplemental = await search(fixture.queries[0]);
    const indexPersisted = existsSync(join(root, "memory.hnsw")) && statSync(join(root, "memory.hnsw")).size > 0;
    return { name, model, digest: config.digests[name], rowCount: rows.size, corpusHashes: fixture.chunks.map((c) => c.excerptSha256),
      coldMilliseconds, warmMilliseconds, queries, norms,
      supplemental: { ...supplemental, primaryIndexAbsent, indexPersisted, disposition: indexPersisted ? "PASS" : "HOLD" } };
  } finally {
    Date.now = nativeNow;
    memory?.close();
    rmSync(root, { recursive: true, force: true });
    await unload(model);
  }
}

try {
  const baseline = await evaluateArm("baseline", config.aliases.baseline, contract.baseline);
  const candidate = await evaluateArm("candidate", config.aliases.candidate, contract.candidate);
  const comparison = compareArms(baseline, candidate, fixture, contract);
  writeFileSync(config.workerOutput, JSON.stringify({ baseline, candidate, comparison, requests, residency,
    commonContextTokens: commonContext, processRamSampledBytes,
    instrumentation: "Actual OllamaClient and MemorySubsystem; only request context/truncation and recipe prefix instrumentation.",
    resourceLimitations: "RSS covers evaluator only, not total Ollama peak RAM. Residency is sampled, not a guaranteed peak.",
    offlineLimitations: "JS request guard only; no process-level non-loopback proof.",
  }, null, 2) + "\n", { flag: "wx" });
} catch (error) {
  writeFileSync(config.workerOutput, JSON.stringify({ error: { code: error.code ?? "RUNTIME_FAILURE", message: error.message },
    requests, residency, processRamSampledBytes }, null, 2) + "\n", { flag: "wx" });
  process.exitCode = 2;
} finally {
  globalThis.fetch = realFetch;
}
}

main().catch((error) => {
  process.stderr.write(JSON.stringify({ code: error.code ?? "WORKER_START_FAILED", message: error.message }) + "\n");
  process.exitCode = 2;
});
