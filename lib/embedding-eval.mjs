import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve, relative, isAbsolute } from "node:path";

export class EvaluationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "EvaluationError";
    this.code = code;
  }
}

export const sha256 = (value) => createHash("sha256").update(value).digest("hex");

function requireValue(condition, code, message) {
  if (!condition) throw new EvaluationError(code, message);
}

export function ownedPath(root, path) {
  const target = resolve(root, path);
  const suffix = relative(root, target);
  requireValue(suffix && !suffix.startsWith("..") && !isAbsolute(suffix),
    "PATH_OUTSIDE_ROOT", "Evaluation paths must stay inside the checkout.");
  return target;
}

export function loadEvaluation(root, contractPath) {
  const bytes = readFileSync(ownedPath(root, contractPath));
  requireValue(sha256(bytes) === "059e58aac528d2df1c6b5ee5e54e3f23e83fc685ad6ceea7da8e76a9c1e37177",
    "CONTRACT_CHANGED", "Frozen contract bytes changed.");
  const contract = JSON.parse(bytes.toString("utf8"));
  requireValue(contract.schemaVersion === 1 && contract.release === "2.13.0",
    "INVALID_CONTRACT", "Expected the frozen v2.13 evaluation contract.");
  for (const arm of [contract.baseline, contract.candidate]) {
    requireValue(arm?.dimension === 768 && Number.isInteger(arm.contextTokens) && arm.contextTokens >= 2048
      && typeof arm.model === "string" && /^[a-z0-9][a-z0-9:._/-]+$/i.test(arm.model),
    "INVALID_CONTRACT", "Invalid model recipe.");
  }
  requireValue(/^[a-f0-9]{64}$/.test(contract.baseline.digest)
    && (contract.candidate.digest === null || /^[a-f0-9]{64}$/.test(contract.candidate.digest)),
  "INVALID_CONTRACT", "Invalid pinned model digest.");
  requireValue(contract.measurement?.warmRepetitions === 30 && contract.measurement.coldLoads === 5
    && contract.measurement.bootstrapSamples === 10000 && contract.measurement.maxRunMinutes === 45
    && contract.measurement.perRequestTimeoutMs === 60000 && contract.measurement.maxProvisionBytes === 536870912
    && contract.retrieval?.limit === 5 && contract.retrieval.method === "rrf"
    && contract.retrieval.rejection.cosineThreshold === 0.65,
  "INVALID_CONTRACT", "Frozen measurement settings changed.");
  const manifestPath = ownedPath(root, contract.fixtureManifest);
  const manifestBytes = readFileSync(manifestPath);
  requireValue(sha256(manifestBytes) === contract.fixtureManifestSha256,
    "FIXTURE_CHANGED", "Fixture manifest hash changed.");
  const manifest = JSON.parse(manifestBytes);
  const fixtureRoot = resolve(manifestPath, "..");
  for (const [name, digest] of Object.entries(manifest.fixtures)) {
    requireValue(sha256(readFileSync(ownedPath(fixtureRoot, name))) === digest,
      "FIXTURE_CHANGED", "Fixture bytes changed: " + name);
  }
  const fixture = JSON.parse(readFileSync(resolve(fixtureRoot, "held-out.json")));
  requireValue(fixture.chunks.length === 20 && fixture.queries.length === 100,
    "INVALID_FIXTURE", "Expected twenty chunks and one hundred held-out queries.");
  const ids = new Set();
  const sourceSnapshots = [];
  for (const chunk of fixture.chunks) {
    requireValue(typeof chunk.id === "string" && !ids.has(chunk.id), "INVALID_FIXTURE", "Duplicate chunk.");
    ids.add(chunk.id);
    requireValue(sha256(chunk.text) === chunk.excerptSha256, "FIXTURE_CHANGED", "Excerpt changed: " + chunk.id);
    // Permit only Git's LF/CRLF checkout representation of the pinned source.
    const matches = (source) => {
      const lf = source.toString("utf8").replaceAll("\r\n", "\n");
      return [source, lf, lf.replaceAll("\n", "\r\n")].some((bytes) => sha256(bytes) === chunk.sourceSha256);
    };
    const source = readFileSync(ownedPath(root, chunk.source));
    let materializedFrom = "checkout";
    if (!matches(source)) {
      let baseline;
      try {
        baseline = execFileSync("git", ["show", contract.baselineHead + ":" + chunk.source],
          { cwd: root, maxBuffer: 8 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
      } catch {
        throw new EvaluationError("SOURCE_CHANGED", "Source changed and pinned baseline is unavailable: " + chunk.source);
      }
      requireValue(matches(baseline), "SOURCE_CHANGED", "Pinned source changed: " + chunk.source);
      materializedFrom = "git-baseline";
    }
    sourceSnapshots.push({ source: chunk.source, sourceSha256: chunk.sourceSha256, materializedFrom, baselineHead: contract.baselineHead });
  }
  const queries = new Set();
  for (const query of fixture.queries) {
    requireValue(!queries.has(query.id) && typeof query.text === "string"
      && ["answerable", "hard-negative", "unanswerable"].includes(query.category)
      && Array.isArray(query.relevant) && query.relevant.every((id) => ids.has(id))
      && (query.category === "unanswerable" ? query.relevant.length === 0 : query.relevant.length > 0),
    "INVALID_FIXTURE", "Invalid relevance label.");
    queries.add(query.id);
  }
  return { contract, fixture, sourceSnapshots, contractSha256: sha256(bytes), manifestSha256: sha256(manifestBytes) };
}

export function validateVector(vector, dimension = 768) {
  requireValue(Array.isArray(vector) && vector.length === dimension
    && vector.every((value) => typeof value === "number" && Number.isFinite(value)),
  "INVALID_VECTOR", "Missing, nonfinite or mixed-dimensional genuine embedding.");
  const norm = Math.hypot(...vector);
  requireValue(Number.isFinite(norm) && norm > 0, "INVALID_VECTOR", "Zero embedding.");
  return norm;
}

export function cosine(left, right) {
  const l = validateVector(left, left.length);
  const r = validateVector(right, left.length);
  return left.reduce((sum, value, index) => sum + value * right[index], 0) / (l * r);
}

export function p95(values) {
  requireValue(values.length > 0 && values.every((value) => Number.isFinite(value) && value >= 0),
    "INVALID_SAMPLE", "Latency samples must be finite and nonnegative.");
  return [...values].sort((a, b) => a - b)[Math.ceil(values.length * 0.95) - 1];
}

export function pairedInterval(differences, seed, samples = 10000) {
  requireValue(differences.length > 0 && differences.every(Number.isFinite),
    "INVALID_SAMPLE", "Paired samples are required.");
  let state = seed >>> 0;
  const next = () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const means = [];
  for (let iteration = 0; iteration < samples; iteration++) {
    let total = 0;
    for (let index = 0; index < differences.length; index++) {
      total += differences[Math.floor(next() * differences.length)];
    }
    means.push(total / differences.length * 100);
  }
  means.sort((a, b) => a - b);
  return { lower: means[Math.floor(samples * 0.025)], upper: means[Math.ceil(samples * 0.975) - 1] };
}

export function compareArms(baseline, candidate, fixture, contract) {
  const score = (arm, query, accepted) => {
    const result = arm.queries.find((entry) => entry.id === query.id);
    requireValue(result && Array.isArray(result.top5) && typeof result.accepted === "boolean",
      "INCOMPLETE_RUN", "Missing paired query: " + query.id);
    return (!accepted || result.accepted) && query.relevant.some((id) => result.top5.includes(id)) ? 1 : 0;
  };
  const answers = fixture.queries.filter((query) => query.category === "answerable");
  // Primary quality is raw retrieval recall. Accepted recall is reported separately.
  const diffs = answers.map((query) => score(candidate, query, false) - score(baseline, query, false));
  const groupDiffs = [...new Set(answers.map((query) => query.group))].map((group) => {
    const members = answers.filter((query) => query.group === group);
    return members.reduce((sum, query) => sum + score(candidate, query, false) - score(baseline, query, false), 0) / members.length;
  });
  const interval = pairedInterval(diffs, contract.measurement.bootstrapSeed);
  const groupInterval = pairedInterval(groupDiffs, contract.measurement.bootstrapSeed);
  const recall = (arm, category, accepted = false) => {
    const queries = fixture.queries.filter((query) => query.category === category);
    return queries.reduce((sum, query) => sum + score(arm, query, accepted), 0) / queries.length * 100;
  };
  const noAnswer = (arm) => fixture.queries.filter((query) => query.category === "unanswerable")
    .filter((query) => arm.queries.find((result) => result.id === query.id)?.accepted).length;
  // Require all labels in each arm, including non-answerable rows, before reporting.
  for (const arm of [baseline, candidate]) {
    requireValue(arm.queries.length === fixture.queries.length && new Set(arm.queries.map((q) => q.id)).size === fixture.queries.length,
      "INCOMPLETE_RUN", "Incomplete or duplicate result labels.");
    for (const query of fixture.queries) score(arm, query, false);
  }
  const gain = diffs.reduce((sum, value) => sum + value, 0) / diffs.length * 100;
  const latencyRatio = p95(candidate.warmMilliseconds) / p95(baseline.warmMilliseconds);
  return {
    primary: "Raw recall@5 on 60 answerable queries; accepted recall reported separately, fixed before scoring.",
    baselineRecallAt5: recall(baseline, "answerable"),
    candidateRecallAt5: recall(candidate, "answerable"),
    baselineAcceptedRecallAt5: recall(baseline, "answerable", true),
    candidateAcceptedRecallAt5: recall(candidate, "answerable", true),
    gainPercentagePoints: gain, paired95: interval, sourceGroup95: groupInterval, latencyRatio,
    hardNegatives: { baselineRecallAt5: recall(baseline, "hard-negative"), candidateRecallAt5: recall(candidate, "hard-negative") },
    noAnswerAccepted: { baseline: noAnswer(baseline), candidate: noAnswer(candidate) },
    quality: gain >= contract.gate.minimumRecallAt5GainPercentagePoints && interval.lower > 0 ? "PASS" : "FAIL",
    latency: latencyRatio <= contract.gate.maximumP95LatencyRatio ? "PASS" : "FAIL",
    rejection: noAnswer(candidate) <= noAnswer(baseline) ? "PASS" : "FAIL",
  };
}
