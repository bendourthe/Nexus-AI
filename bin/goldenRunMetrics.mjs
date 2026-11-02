// v2.14.0 T013 -- golden-run sampler options and per-turn metrics.
//
// `--options <file>` sends Ollama sampler options with every model request;
// `--metrics <file>` records, per task, each model turn's duration, the time
// to the first tool call, codec parse failures, and the model's peak resident
// memory split between VRAM and system RAM (offload) from Ollama's /api/ps.
// Without these flags the golden runner behaves exactly as before.

import { readFileSync } from "node:fs";

/** Sampler options the runner forwards; Ollama spells the penalty `repeat_penalty`. */
export const ALLOWED_OPTIONS = Object.freeze(["temperature", "top_p", "top_k", "min_p", "repeat_penalty", "num_ctx", "num_gpu"]);

/** Read and validate an options file. Throws with a reason; never partially applies. */
export function loadGoldenOptions(path) {
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    throw new Error(`--options ${path}: not readable JSON (${err instanceof Error ? err.message : String(err)})`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`--options ${path}: must be a JSON object`);
  }
  for (const [key, value] of Object.entries(parsed)) {
    if (!ALLOWED_OPTIONS.includes(key)) throw new Error(`--options ${path}: unknown option "${key}"`);
    if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`--options ${path}: "${key}" must be a number`);
    if (key === "num_gpu" && (!Number.isInteger(value) || value < 0)) throw new Error(`--options ${path}: "num_gpu" must be a non-negative integer`);
  }
  return parsed;
}

/** Peak resident memory of one model from /api/ps samples. */
export function peakMemory(samples) {
  const usable = samples.filter((s) => Number.isFinite(s.size) && Number.isFinite(s.sizeVram));
  if (usable.length === 0) return { status: "not_measured" };
  const peak = usable.reduce((a, b) => (b.size > a.size ? b : a));
  return {
    status: "measured",
    peakResidentBytes: peak.size,
    peakVramBytes: Math.max(...usable.map((s) => s.sizeVram)),
    peakRamBytes: Math.max(...usable.map((s) => Math.max(0, s.size - s.sizeVram))),
    offloaded: usable.some((s) => s.size > s.sizeVram),
    samples: usable.length,
  };
}

/** One /api/ps reading for `model`, or null when Ollama cannot be read. */
export async function readOllamaPs(model, { baseUrl = "http://127.0.0.1:11434", fetchFn = fetch } = {}) {
  try {
    const res = await fetchFn(`${baseUrl}/api/ps`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) return null;
    const body = await res.json();
    const entry = (body.models ?? []).find((m) => m.name === model || m.model === model);
    return entry ? { size: entry.size, sizeVram: entry.size_vram } : null;
  } catch {
    return null;
  }
}

/**
 * Collects per-task metrics. `wrapLlm` times each model call; `onEvent` reads
 * the headless session's events; `beginTask`/`endTask` bracket one task and
 * sample memory every `sampleMs` while it runs.
 */
export function createMetricsCollector({ model, now = () => performance.now(), sampleMs = 1000, readPs = readOllamaPs } = {}) {
  const tasks = [];
  let current = null;
  let timer = null;

  const sample = async () => {
    if (!current) return;
    const reading = await readPs(model);
    if (reading && current) current.memorySamples.push(reading);
  };

  return {
    wrapLlm(llm) {
      return {
        ...llm,
        checkHealth: (...a) => llm.checkHealth(...a),
        listModels: (...a) => llm.listModels(...a),
        async *streamChat(request, signal) {
          const start = now();
          let first = null;
          try {
            for await (const chunk of llm.streamChat(request, signal)) {
              if (first === null) first = now() - start;
              yield chunk;
            }
          } finally {
            current?.turns.push({ turnMs: Math.round(now() - start), firstChunkMs: first === null ? null : Math.round(first) });
          }
        },
      };
    },
    onEvent(event) {
      if (!current) return;
      if (event.kind === "toolCall" && current.firstToolCallMs === null) {
        current.firstToolCallMs = Math.round(now() - current.startedAt);
      }
      if (event.kind === "toolParseFailure") current.codecParseFailures += event.count;
    },
    beginTask(id) {
      current = { id, startedAt: now(), firstToolCallMs: null, codecParseFailures: 0, turns: [], memorySamples: [] };
      void sample();
      timer = setInterval(() => void sample(), sampleMs);
      timer.unref?.();
    },
    endTask(result) {
      if (timer) clearInterval(timer);
      timer = null;
      if (!current) return;
      const { memorySamples, startedAt, ...rest } = current;
      tasks.push({
        ...rest,
        passed: result.passed,
        failures: result.failures,
        taskMs: Math.round(now() - startedAt),
        memory: peakMemory(memorySamples),
      });
      current = null;
    },
    report(extra) {
      return { schemaVersion: 1, ...extra, tasks };
    },
  };
}
