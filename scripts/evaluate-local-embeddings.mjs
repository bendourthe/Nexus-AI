import { readFileSync, writeFileSync, openSync, closeSync, unlinkSync, mkdirSync, realpathSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { build } from "esbuild";
import { loadEvaluation, ownedPath, sha256, EvaluationError } from "../lib/embedding-eval.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function jsonRequest(baseUrl, path, body, method = "POST") {
  const response = await fetch(baseUrl + path, {
    ...(body ? { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(60000), redirect: "error",
  });
  if (!response.ok) throw new EvaluationError("RUNTIME_REQUEST_FAILED", path + ": " + response.status);
  return response.json();
}

async function provision(baseUrl, recipe, ceiling, evidence) {
  const response = await fetch("https://registry.ollama.ai/v2/library/embeddinggemma-2/manifests/270m",
    { signal: AbortSignal.timeout(60000), redirect: "error" });
  if (!response.ok) throw new EvaluationError("PROVISION_UNAVAILABLE", "Candidate manifest unavailable.");
  const bytes = Buffer.from(await response.arrayBuffer());
  const manifest = JSON.parse(bytes);
  const total = [manifest.config, ...manifest.layers].reduce((sum, layer) => {
    if (!Number.isSafeInteger(layer.size) || layer.size < 0) throw new EvaluationError("INVALID_MANIFEST", "Invalid layer size.");
    return sum + layer.size;
  }, 0);
  if (total > ceiling) throw new EvaluationError("PROVISION_LIMIT", "Candidate exceeds frozen provisioning ceiling.");
  const digest = sha256(bytes);
  evidence.provision = { digest, manifestBytes: bytes.length, artifactBytes: total, pulledName: recipe.model, completed: false };
  if (recipe.digest && recipe.digest !== digest) throw new EvaluationError("MODEL_CHANGED", "Candidate manifest differs from pin.");
  // The API accepts tags. Verify its resolved digest before any scoring.
  const pull = await fetch(baseUrl + "/api/pull", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: recipe.model, stream: true }),
    signal: AbortSignal.timeout(15 * 60000), redirect: "error",
  });
  if (!pull.ok) throw new EvaluationError("PROVISION_FAILED", "Pull refused: " + pull.status);
  let buffer = "";
  let complete = false;
  for await (const part of pull.body) {
    buffer += Buffer.from(part).toString("utf8");
    if (buffer.length > 1024 * 1024) throw new EvaluationError("PROVISION_FAILED", "Unbounded pull response.");
    const lines = buffer.split("\n");
    buffer = lines.pop();
    for (const line of lines.filter(Boolean)) {
      const event = JSON.parse(line);
      if (event.error) throw new EvaluationError(event.error.includes("requires a newer version") ? "RUNTIME_TOO_OLD" : "PROVISION_FAILED", event.error);
      if (event.total > ceiling) throw new EvaluationError("PROVISION_LIMIT", "Pull crossed byte ceiling.");
      if (event.status === "success") complete = true;
    }
  }
  if (buffer.trim()) {
    const event = JSON.parse(buffer);
    if (event.error) throw new EvaluationError(event.error.includes("requires a newer version") ? "RUNTIME_TOO_OLD" : "PROVISION_FAILED", event.error);
    complete ||= event.status === "success";
  }
  if (!complete) throw new EvaluationError("PROVISION_FAILED", "Pull did not confirm success.");
  return { digest, manifestBytes: bytes.length, artifactBytes: total, pulledName: recipe.model, completed: true };
}

export async function run(args) {
  const options = {};
  for (let index = 0; index < args.length; index++) {
    const key = args[index];
    if (key === "--provision" || key === "--validate-only") options[key] = true;
    else if (["--contract", "--output"].includes(key) && args[index + 1] && !args[index + 1].startsWith("--")) options[key] = args[++index];
    else throw new EvaluationError("INVALID_ARGUMENT", "Unknown or incomplete argument: " + key);
  }
  if (!options["--contract"]) throw new EvaluationError("INVALID_ARGUMENT", "--contract is required.");
  const loaded = loadEvaluation(root, options["--contract"]);
  if (options["--validate-only"]) return { disposition: "PASS", fixtureManifestSha256: loaded.manifestSha256, contractSha256: loaded.contractSha256 };
  if (!options["--output"]) throw new EvaluationError("INVALID_ARGUMENT", "--output is required.");
  const output = ownedPath(root, options["--output"]);
  ownedPath(realpathSync(root), realpathSync(dirname(output)));
  if (existsSync(output)) throw new EvaluationError("OUTPUT_EXISTS", "Refusing to overwrite prior evidence.");
  const leasePath = join(tmpdir(), "nexus-local-embedding-evaluation.lock");
  let lease;
  try { lease = openSync(leasePath, "wx"); } catch {
    throw new EvaluationError("RUN_BUSY", "Another evaluation owns the host lease; inspect its process before removing stale lease.");
  }
  const baseUrl = "http://127.0.0.1:11434";
  const id = randomUUID();
  const working = join(root, ".nexus-hub", "embedding-eval-" + id);
  const aliases = { baseline: "nexus-eval-" + id + "-baseline:latest", candidate: "nexus-eval-" + id + "-candidate:latest" };
  const created = [];
  const report = { schemaVersion: 1, observedAt: new Date().toISOString(), contractSha256: loaded.contractSha256,
    fixtureManifestSha256: loaded.manifestSha256, recommendation: "RETAIN", disposition: "HOLD",
    gates: { quality: "HOLD", latency: "HOLD", rejection: "HOLD", vectors: "HOLD", resources: "HOLD",
      tiers: "HOLD", coexistence: "HOLD", offline: "HOLD", terms: "HOLD", context: "HOLD" },
    limitations: ["Required cpu/8/12/24 tiers unmeasured.", "Pinned distribution terms/PUP discrepancy unresolved.",
      "OS-level non-loopback containment and packaged consumer observation not proven.", "Whole-runtime peak RAM and coding coexistence not proven."] };
  try {
    mkdirSync(working, { recursive: true });
    writeFileSync(lease, JSON.stringify({ pid: process.pid, id, root, started: report.observedAt }));
    report.runtime = await jsonRequest(baseUrl, "/api/version");
    const resident = (await jsonRequest(baseUrl, "/api/ps")).models ?? [];
    let tags = (await jsonRequest(baseUrl, "/api/tags")).models ?? [];
    let candidate = tags.find((model) => model.name === loaded.contract.candidate.model);
    if (!candidate && options["--provision"]) {
      report.provision = await provision(baseUrl, loaded.contract.candidate, loaded.contract.measurement.maxProvisionBytes, report);
      tags = (await jsonRequest(baseUrl, "/api/tags")).models ?? [];
      candidate = tags.find((model) => model.name === loaded.contract.candidate.model);
      if (candidate?.digest !== report.provision.digest) throw new EvaluationError("MODEL_CHANGED", "Pulled tag differs from preflight manifest.");
    }
    if (!candidate) throw new EvaluationError("MODEL_UNAVAILABLE", "Candidate is absent; explicit --provision initiates bounded installation.");
    const baseline = tags.find((model) => model.name === loaded.contract.baseline.model);
    if (!baseline || baseline.digest !== loaded.contract.baseline.digest) throw new EvaluationError("MODEL_CHANGED", "Baseline digest differs from frozen pin.");
    if (!/^[a-f0-9]{64}$/.test(candidate.digest) || (loaded.contract.candidate.digest && candidate.digest !== loaded.contract.candidate.digest)) {
      throw new EvaluationError("MODEL_CHANGED", "Invalid or changed candidate identity.");
    }
    if (candidate.size > loaded.contract.measurement.maxProvisionBytes) throw new EvaluationError("PROVISION_LIMIT", "Installed candidate exceeds byte ceiling.");
    report.identities = { baseline, candidate };
    report.modelMetadata = {
      baseline: await jsonRequest(baseUrl, "/api/show", { model: baseline.name }),
      candidate: await jsonRequest(baseUrl, "/api/show", { model: candidate.name }),
    };
    if (resident.length) throw new EvaluationError("HOST_BUSY", "Candidate identity verified, but loaded models occupy the runtime; no scoring or unload of another session.");
    const digests = { baseline: baseline.digest, candidate: candidate.digest };
    writeFileSync(join(working, "model-pins.json"), JSON.stringify({ digests, aliases, fixtureManifestSha256: loaded.manifestSha256 }, null, 2), { flag: "wx" });
    for (const [arm, source] of [["baseline", baseline.name], ["candidate", candidate.name]]) {
      if (tags.some((model) => model.name === aliases[arm])) throw new EvaluationError("ALIAS_EXISTS", "Refusing to overwrite an existing model alias.");
      await jsonRequest(baseUrl, "/api/copy", { source, destination: aliases[arm] });
      created.push(aliases[arm]);
    }
    const pinnedTags = (await jsonRequest(baseUrl, "/api/tags")).models ?? [];
    for (const arm of ["baseline", "candidate"]) {
      if (pinnedTags.find((model) => model.name === aliases[arm])?.digest !== digests[arm]) throw new EvaluationError("MODEL_CHANGED", "Owned alias digest mismatch.");
    }
    const workerOutput = join(working, "raw-results.json");
    const bundle = join(working, "runtime.cjs");
    await build({ entryPoints: [join(root, "scripts/evaluate-local-embeddings.runtime.mjs")], outfile: bundle,
      bundle: true, platform: "node", format: "cjs", packages: "external", logLevel: "silent",
      alias: { vscode: join(root, "desktop/sidecar/src/shims/vscode.ts") } });
    const code = await new Promise((resolveCode, reject) => {
      const worker = spawn(process.execPath, [bundle], {
        cwd: root, stdio: ["ignore", "ignore", "inherit"], windowsHide: true,
        env: { ...process.env, NEXUS_EMBEDDING_EVAL_CONFIG: JSON.stringify({ root, contractPath: options["--contract"], baseUrl, aliases, digests, workerOutput }) },
      });
      const timer = setTimeout(() => { worker.kill(); reject(new EvaluationError("RUN_TIMEOUT", "Evaluation exceeded 45 minutes.")); }, loaded.contract.measurement.maxRunMinutes * 60000);
      worker.on("error", (error) => { clearTimeout(timer); reject(error); });
      worker.on("close", (status) => { clearTimeout(timer); resolveCode(status); });
    });
    report.raw = JSON.parse(readFileSync(workerOutput));
    if (code !== 0 || report.raw.error) throw new EvaluationError(report.raw.error?.code ?? "WORKER_FAILED", report.raw.error?.message ?? "Runtime worker failed.");
    for (const gate of ["quality", "latency", "rejection"]) report.gates[gate] = report.raw.comparison[gate];
    report.gates.vectors = "PASS";
    const vramSamples = report.raw.residency.flatMap((sample) => sample.models.map((model) => model.size_vram ?? 0));
    report.sampledEmbeddingVramBytes = Math.max(0, ...vramSamples);
    if (report.sampledEmbeddingVramBytes > loaded.contract.resourceCeilings.embeddingGpuBytes
      || report.raw.processRamSampledBytes > loaded.contract.resourceCeilings.evaluationProcessRamBytes) {
      report.gates.resources = "FAIL";
    }
    report.disposition = Object.values(report.gates).includes("FAIL") ? "FAIL" : "HOLD";
  } catch (error) {
    report.error = { code: error.code ?? "EVALUATION_FAILURE", message: error.message };
    if (["INVALID_VECTOR", "ROW_COUNT_MISMATCH", "CORPUS_MUTATED", "UNKNOWN_ROW"].includes(error.code)) {
      report.gates.vectors = "FAIL";
      report.disposition = "FAIL";
    }
  } finally {
    report.cleanup = [];
    for (const model of created.reverse()) {
      try {
        await jsonRequest(baseUrl, "/api/embed", { model, input: [], keep_alive: 0 });
        await jsonRequest(baseUrl, "/api/delete", { model }, "DELETE");
        report.cleanup.push({ model, removed: true });
      } catch (error) { report.cleanup.push({ model, removed: false, error: error.message }); }
    }
    try {
      writeFileSync(output, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
    } finally {
      closeSync(lease);
      unlinkSync(leasePath);
    }
  }
  return { disposition: report.disposition, recommendation: report.recommendation, error: report.error, output: options["--output"] };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run(process.argv.slice(2)).then((result) => {
    process.stdout.write(JSON.stringify(result) + "\n");
  }).catch((error) => {
    process.stderr.write(JSON.stringify({ disposition: "HOLD", error: { code: error.code ?? "INVALID_INPUT", message: error.message } }) + "\n");
    process.exitCode = 2;
  });
}
