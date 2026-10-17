#!/usr/bin/env node
/**
 * v2.14.0 T001 -- measure the desktop voice loop. Local only; NOT part of CI.
 *
 * Drives the built sidecar (desktop/sidecar/dist/main.js) over its existing
 * stdio JSON-RPC transport: no new listener and no debug method. Each turn
 * replays a synthetic utterance fixture through
 *   audio.transcribe -> chat.session.sendMessage -> audio.speak
 * and records per-stage wall time plus the model's time to first token from
 * metrics.inference. "Time to first audio" (plan Goals) runs from the
 * transcription request to the first audio bytes leaving the sidecar.
 *
 * Traces hold timings, counts and byte sizes only: never transcript, reply
 * text or audio.
 *
 * Usage (repo root, on the reference host, after `npm run build:sidecar`):
 *   node scripts/measure-voice-latency.mjs --model gemma4:12b \
 *     --fixtures tests/fixtures/voice/ \
 *     --output docs/releases/v2/v2.14/development/voice-latency-baseline.json
 *
 * Flags: --mode baseline|streamed, --warm N (20), --cold N (5),
 * --barge-in N (0; streamed only), --stage-timeout-ms N (180000),
 * --fixture <id> (repeatable).
 *
 * Streamed mode (v2.14.0 Phase 2) sends the turn with `voice: { jobId }` and
 * polls `audio.speakDrain` every SPOKEN_REPLY_POLL_MS, as the webview does.
 * First audio is the first segment received; segments are scheduled back to
 * back as the webview plays them, which gives the silent gap before each
 * segment and the time to last audio. Barge-in runs cancel after the first
 * segment and time how long the sidecar takes to report the job cancelled.
 * Exit codes: 0 measured; 1 a run failed; 2 refused (lock held, bad args,
 * missing sidecar bundle).
 */

import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { closeSync, existsSync, openSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

export const STAGES = ["transcribe", "modelFirstToken", "modelComplete", "synthesis", "firstAudio"];
export const MODES = ["baseline", "streamed"];
const LOCK_NAME = "nexus-measure-voice-latency.lock";
/** Mirrors desktop/src/modules/chat/useSpokenReply.ts SPOKEN_REPLY_POLL_MS. */
export const SPOKEN_REPLY_POLL_MS = 100;

// ---------------------------------------------------------------- pure helpers

/** Nearest-rank percentile over finite numbers; null for an empty sample. */
export function percentile(values, p) {
  const xs = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (xs.length === 0) return null;
  const rank = Math.ceil((p / 100) * xs.length);
  return xs[Math.min(Math.max(rank, 1), xs.length) - 1];
}

/** p50/p95/min/max/n for one metric across the measured (status ok) turns. */
export function summarize(values) {
  const xs = values.filter((v) => Number.isFinite(v));
  return {
    n: xs.length,
    p50: percentile(xs, 50),
    p95: percentile(xs, 95),
    min: xs.length ? Math.min(...xs) : null,
    max: xs.length ? Math.max(...xs) : null,
  };
}

/** Duration in ms of a PCM WAV, read from its header; null if not a RIFF/WAVE. */
export function wavDurationMs(bytes) {
  if (bytes.length < 44 || bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WAVE") {
    return null;
  }
  let offset = 12;
  let byteRate = null;
  while (offset + 8 <= bytes.length) {
    const id = bytes.toString("ascii", offset, offset + 4);
    const size = bytes.readUInt32LE(offset + 4);
    if (id === "fmt ") byteRate = bytes.readUInt32LE(offset + 16);
    if (id === "data") return byteRate ? Math.round((size / byteRate) * 1000) : null;
    offset += 8 + size + (size % 2);
  }
  return null;
}

/**
 * Derive one turn's stage spans (ms, relative to the transcription request)
 * from raw marks. `ttftMs` is the model-reported time to first token for the
 * chat request. In baseline mode the first audio bytes leave the sidecar when
 * audio.speak returns the whole WAV.
 */
export function turnSpans(marks, ttftMs, audioDurationMs) {
  const t0 = marks.transcribeStart;
  const rel = (t) => Math.round(t - t0);
  const firstAudio = rel(marks.firstAudio);
  return {
    transcribe: rel(marks.transcribeEnd),
    modelFirstToken: Number.isFinite(ttftMs) ? Math.round(rel(marks.chatStart) + ttftMs) : null,
    modelComplete: rel(marks.chatEnd),
    synthesis: Math.round(marks.speakEnd - marks.speakStart),
    firstAudio,
    timeToFirstAudio: firstAudio,
    timeToLastAudio: Number.isFinite(audioDurationMs) ? firstAudio + audioDurationMs : null,
  };
}

/**
 * The model's time to first token for this turn: the newest metrics.inference
 * record written at or after the chat request started (the only inference in
 * that window). The registry's order is not relied on, and the model name is
 * not matched because records carry the runtime tag, not the catalog id. Null
 * when the turn left no record (never a stale one).
 */
export function ttftForTurn(recent, chatStartEpochMs) {
  const own = (recent ?? []).filter((r) => r.at >= chatStartEpochMs);
  if (own.length === 0) return null;
  const newest = own.reduce((a, b) => (b.at > a.at ? b : a));
  return Number.isFinite(newest.ttftMs) ? newest.ttftMs : null;
}

/**
 * Back-to-back playback of segments that arrive at `atMs` (relative to the
 * turn start) and last `durationMs`. Returns when the first starts, the silent
 * gap before each later segment, and when the last one ends.
 */
export function playbackSchedule(arrivals) {
  if (arrivals.length === 0) return { firstStart: null, gaps: [], end: null };
  let end = arrivals[0].atMs + arrivals[0].durationMs;
  const gaps = [];
  for (const segment of arrivals.slice(1)) {
    const start = Math.max(segment.atMs, end);
    gaps.push(start - end);
    end = start + segment.durationMs;
  }
  return { firstStart: arrivals[0].atMs, gaps, end };
}

/** Reduce a list of turn records to per-fixture, per-temperature statistics. */
export function aggregate(turns) {
  const groups = new Map();
  for (const turn of turns) {
    const key = `${turn.fixture}:${turn.temperature}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(turn);
  }
  const out = {};
  for (const [key, group] of groups) {
    const ok = group.filter((t) => t.status === "ok");
    const metrics = [...STAGES, "timeToFirstAudio", "timeToLastAudio"];
    out[key] = {
      runs: group.length,
      ok: ok.length,
      failures: group.filter((t) => t.status !== "ok").map((t) => ({ status: t.status, stage: t.stage ?? null })),
      stats: {
        ...Object.fromEntries(metrics.map((m) => [m, summarize(ok.map((t) => t.spans?.[m]))])),
        interSegmentGap: summarize(ok.flatMap((t) => t.gapsMs ?? [])),
        bargeInCancel: summarize(ok.map((t) => t.bargeIn?.cancelMs)),
      },
    };
  }
  return out;
}

/** Fields allowed in a trace. Anything else (text, audio) is dropped. */
const TRACE_FIELDS = new Set([
  "fixture",
  "temperature",
  "run",
  "status",
  "stage",
  "reason",
  "spans",
  "counts",
  "gapsMs",
  "bargeIn",
]);
export function sanitizeTurn(turn) {
  return Object.fromEntries(Object.entries(turn).filter(([k]) => TRACE_FIELDS.has(k)));
}

export function parseArgs(argv) {
  const opts = {
    mode: "baseline",
    warm: 20,
    cold: 5,
    bargeIn: 0,
    stageTimeoutMs: 180_000,
    fixtures: "tests/fixtures/voice/",
    output: null,
    model: null,
    only: [],
  };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const value = argv[i + 1];
    const take = () => {
      if (value === undefined) throw new Error(`${flag} needs a value`);
      i++;
      return value;
    };
    if (flag === "--mode") opts.mode = take();
    else if (flag === "--warm") opts.warm = Number(take());
    else if (flag === "--cold") opts.cold = Number(take());
    else if (flag === "--barge-in") opts.bargeIn = Number(take());
    else if (flag === "--stage-timeout-ms") opts.stageTimeoutMs = Number(take());
    else if (flag === "--fixtures") opts.fixtures = take();
    else if (flag === "--output") opts.output = take();
    else if (flag === "--model") opts.model = take();
    else if (flag === "--fixture") opts.only.push(take());
    else throw new Error(`unknown flag ${flag}`);
  }
  if (!MODES.includes(opts.mode)) throw new Error(`--mode must be one of ${MODES.join(", ")}`);
  for (const k of ["warm", "cold", "bargeIn", "stageTimeoutMs"]) {
    if (!Number.isInteger(opts[k]) || opts[k] < 0) throw new Error(`--${k} must be a non-negative integer`);
  }
  if (!opts.output) throw new Error("--output is required");
  if (!opts.model) throw new Error("--model is required");
  if (opts.bargeIn > 0 && opts.mode !== "streamed") throw new Error("--barge-in needs --mode streamed");
  return opts;
}

/** Exclusive lock so two runs never share the audio runtime or the GPU. */
export function acquireLock(dir = tmpdir()) {
  const lockPath = path.join(dir, LOCK_NAME);
  let fd;
  try {
    fd = openSync(lockPath, "wx");
  } catch (err) {
    if (err && err.code === "EEXIST") return null;
    throw err;
  }
  writeFileSync(fd, String(process.pid));
  closeSync(fd);
  return () => rmSync(lockPath, { force: true });
}

// ---------------------------------------------------------------- sidecar I/O

export class StageTimeout extends Error {
  constructor(stage) {
    super(`${stage} timed out`);
    this.stage = stage;
  }
}

/**
 * The bundle's native modules (better-sqlite3) are built for the Node runtime
 * the installer provisions, so spawn that one, as the desktop shell does.
 */
export function sidecarNode(runtimeConfigPath = path.join(homedir(), ".nexus", "runtime.json")) {
  try {
    const nodePath = JSON.parse(readFileSync(runtimeConfigPath, "utf8")).nodePath;
    if (typeof nodePath === "string" && existsSync(nodePath)) return nodePath;
  } catch {
    // No runtime.json in a dev checkout: fall back to this Node.
  }
  return process.execPath;
}

function startSidecar(repoRoot) {
  const sidecar = path.join(repoRoot, "desktop/sidecar/dist/main.js");
  // Measure the checkout's audio runtime, not the installed copy, so baseline
  // and streamed runs exercise the code under test. Explicit env wins over
  // runtime.json in the sidecar.
  const env = { ...process.env, NEXUS_AUDIO_CWD: process.env.NEXUS_AUDIO_CWD ?? repoRoot };
  const child = spawn(sidecarNode(), [sidecar], { stdio: ["pipe", "pipe", "ignore"], env });
  const pending = new Map();
  let nextId = 1;
  let buffer = "";
  child.stdout.on("data", (chunk) => {
    buffer += chunk.toString();
    let index;
    while ((index = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, index).trim();
      buffer = buffer.slice(index + 1);
      if (!line.startsWith("{")) continue;
      let msg;
      try {
        msg = JSON.parse(line);
      } catch {
        continue;
      }
      const entry = pending.get(msg.id);
      if (!entry) continue;
      pending.delete(msg.id);
      clearTimeout(entry.timer);
      if (msg.error) entry.reject(new Error(msg.error.message ?? "rpc error"));
      else entry.resolve(msg.result);
    }
  });
  child.on("exit", () => {
    for (const entry of pending.values()) entry.reject(new Error("sidecar exited"));
    pending.clear();
  });
  const rpc = (method, params, timeoutMs, stage) =>
    new Promise((resolve, reject) => {
      const id = nextId++;
      const timer = setTimeout(() => {
        if (pending.delete(id)) reject(new StageTimeout(stage ?? method));
      }, timeoutMs);
      pending.set(id, { resolve, reject, timer });
      child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params: params ?? {} })}\n`);
    });
  const stop = () =>
    new Promise((resolve) => {
      if (child.exitCode !== null) return resolve();
      child.once("exit", () => resolve());
      child.stdin.end();
      setTimeout(() => child.kill(), 5000).unref();
    });
  return { rpc, stop };
}

export async function runTurn(sidecar, opts, fixture) {
  const { rpc } = sidecar;
  const timeout = opts.stageTimeoutMs;
  const marks = {};
  let stage = "transcribe";
  try {
    marks.transcribeStart = performance.now();
    const heard = await rpc("audio.transcribe", { audioBase64: fixture.audioBase64, mimeType: "audio/wav" }, timeout, stage);
    marks.transcribeEnd = performance.now();

    stage = "modelComplete";
    const session = await rpc("chat.session.start", { modelId: opts.model }, timeout, stage);
    marks.chatStart = performance.now();
    const chatStartEpoch = Date.now();
    const turn = await rpc("chat.session.sendMessage", { sessionId: session.sessionId, message: heard.transcript }, timeout, stage);
    marks.chatEnd = performance.now();
    const events = turn.events ?? [];
    const done = events.find((e) => e.kind === "done");
    if (done?.finishReason?.startsWith("error")) {
      return { status: "error", stage, reason: "model-error" };
    }
    // Baseline speaks the whole visible reply, as ChatPage.playReply does today.
    const reply = events.filter((e) => e.kind === "token").map((e) => e.text).join("");
    const metrics = await rpc("metrics.inference", {}, timeout, "metrics");
    const ttftMs = ttftForTurn(metrics.recent, chatStartEpoch);

    stage = "synthesis";
    marks.speakStart = performance.now();
    const spoken = await rpc("audio.speak", { text: reply }, timeout, stage);
    marks.speakEnd = performance.now();
    marks.firstAudio = marks.speakEnd;

    const audio = Buffer.from(spoken.audioBase64, "base64");
    const audioDurationMs = wavDurationMs(audio);
    return {
      status: "ok",
      spans: turnSpans(marks, ttftMs, audioDurationMs),
      counts: {
        transcriptChars: heard.transcript.length,
        replyChars: reply.length,
        tokenEvents: events.filter((e) => e.kind === "token").length,
        audioBytes: audio.length,
        audioDurationMs,
      },
    };
  } catch (err) {
    if (err instanceof StageTimeout) return { status: "timeout", stage: err.stage };
    return { status: "error", stage, reason: err instanceof Error ? err.message.slice(0, 160) : "unknown" };
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * One streamed voice turn: the sidecar speaks the reply while it streams and
 * this polls the job like the webview. With `bargeIn`, cancel after the first
 * segment and time the sidecar's acknowledgement of the cancel.
 */
export async function runStreamedTurn(sidecar, opts, fixture, { bargeIn = false, poll = SPOKEN_REPLY_POLL_MS } = {}) {
  const { rpc } = sidecar;
  const timeout = opts.stageTimeoutMs;
  const marks = {};
  let stage = "transcribe";
  try {
    marks.transcribeStart = performance.now();
    const heard = await rpc("audio.transcribe", { audioBase64: fixture.audioBase64, mimeType: "audio/wav" }, timeout, stage);
    marks.transcribeEnd = performance.now();

    stage = "modelComplete";
    const session = await rpc("chat.session.start", { modelId: opts.model }, timeout, stage);
    const jobId = randomUUID();
    marks.chatStart = performance.now();
    const chatStartEpoch = Date.now();
    let chatError = null;
    const chat = rpc(
      "chat.session.sendMessage",
      { sessionId: session.sessionId, message: heard.transcript, voice: { jobId } },
      timeout,
      stage,
    ).then(
      (turn) => {
        marks.chatEnd = performance.now();
        return turn;
      },
      (err) => {
        chatError = err;
        return null;
      },
    );

    stage = "synthesis";
    const arrivals = [];
    let afterSeq = -1;
    let state = "unknown";
    let cancelSentAt = null;
    let cancelMs = null;
    const deadline = performance.now() + timeout;
    for (;;) {
      const drained = await rpc("audio.speakDrain", { sessionId: session.sessionId, jobId, afterSeq }, timeout, stage);
      const now = performance.now();
      for (const segment of drained.segments) {
        if (segment.seq <= afterSeq) continue;
        afterSeq = segment.seq;
        const durationMs = wavDurationMs(Buffer.from(segment.audioBase64, "base64")) ?? 0;
        arrivals.push({ atMs: now - marks.transcribeStart, durationMs });
      }
      state = drained.state;
      if (bargeIn && cancelSentAt === null && arrivals.length > 0) {
        cancelSentAt = performance.now();
        await rpc("audio.speakCancel", { sessionId: session.sessionId, jobId }, timeout, "cancel");
      }
      if (cancelSentAt !== null && state === "cancelled") {
        cancelMs = Math.round(performance.now() - cancelSentAt);
        break;
      }
      if (state === "completed" || state === "cancelled" || state === "error") break;
      if (state === "unknown" && marks.chatEnd !== undefined) break;
      if (performance.now() > deadline) throw new StageTimeout(stage);
      await sleep(cancelSentAt !== null ? 10 : poll);
    }
    const turn = await chat;
    if (chatError) throw chatError;
    const events = turn?.events ?? [];
    const done = events.find((e) => e.kind === "done");
    if (state === "error") return { status: "error", stage: "synthesis", reason: "voice-job-error" };
    if (done?.finishReason?.startsWith("error")) return { status: "error", stage: "modelComplete", reason: "model-error" };
    if (arrivals.length === 0) return { status: "error", stage: "synthesis", reason: "no-segments" };
    const metrics = await rpc("metrics.inference", {}, timeout, "metrics");
    const ttftMs = ttftForTurn(metrics.recent, chatStartEpoch);
    const schedule = playbackSchedule(arrivals);
    const firstAudio = Math.round(schedule.firstStart);
    const rel = (t) => Math.round(t - marks.transcribeStart);
    const tokens = events.filter((e) => e.kind === "token");
    return {
      status: "ok",
      spans: {
        transcribe: rel(marks.transcribeEnd),
        modelFirstToken: Number.isFinite(ttftMs) ? Math.round(rel(marks.chatStart) + ttftMs) : null,
        modelComplete: rel(marks.chatEnd),
        // Streamed synthesis overlaps generation: first to last segment received.
        synthesis: Math.round(arrivals[arrivals.length - 1].atMs - arrivals[0].atMs),
        firstAudio,
        timeToFirstAudio: firstAudio,
        timeToLastAudio: bargeIn ? null : Math.round(schedule.end),
      },
      gapsMs: bargeIn ? [] : schedule.gaps.map((g) => Math.round(g)),
      ...(bargeIn ? { bargeIn: { cancelMs, state } } : {}),
      counts: {
        transcriptChars: heard.transcript.length,
        replyChars: tokens.map((e) => e.text).join("").length,
        tokenEvents: tokens.length,
        segments: arrivals.length,
        audioDurationMs: arrivals.reduce((sum, a) => sum + a.durationMs, 0),
      },
    };
  } catch (err) {
    if (err instanceof StageTimeout) return { status: "timeout", stage: err.stage };
    return { status: "error", stage, reason: err instanceof Error ? err.message.slice(0, 160) : "unknown" };
  }
}

function loadFixtures(dir, only) {
  const manifest = JSON.parse(readFileSync(path.join(dir, "manifest.json"), "utf8"));
  return manifest.fixtures
    .filter((f) => only.length === 0 || only.includes(f.id))
    .map((f) => ({ id: f.id, audioBase64: readFileSync(path.join(dir, f.wav)).toString("base64") }));
}

async function measure(opts, repoRoot) {
  const turnFn = opts.mode === "streamed" ? runStreamedTurn : runTurn;
  const fixtures = loadFixtures(path.resolve(repoRoot, opts.fixtures), opts.only);
  const turns = [];
  const record = (turn) => {
    turns.push(sanitizeTurn(turn));
    process.stderr.write(`${turn.fixture} ${turn.temperature} #${turn.run} ${turn.status}${turn.spans ? ` ttfa=${turn.spans.timeToFirstAudio}ms` : ""}\n`);
  };

  // Probe availability first: missing weights or runtime is "not measured".
  const probe = startSidecar(repoRoot);
  let health;
  try {
    health = await probe.rpc("audio.health", {}, opts.stageTimeoutMs, "health");
  } finally {
    await probe.stop();
  }
  if (!health?.stt?.available || !health?.tts?.available) {
    return {
      status: "not_measured",
      reason: !health?.stt?.available ? "stt-unavailable" : "tts-unavailable",
      turns: [],
      summary: {},
    };
  }

  for (const fixture of fixtures) {
    // Cold: a fresh sidecar per run, so the audio runtime spawns and the
    // engines construct inside the measured turn. Ollama keeps the model
    // resident across runs; model load is reported separately by T002.
    for (let run = 1; run <= opts.cold; run++) {
      const sidecar = startSidecar(repoRoot);
      try {
        record({ fixture: fixture.id, temperature: "cold", run, ...(await turnFn(sidecar, opts, fixture)) });
      } finally {
        await sidecar.stop();
      }
    }
    // Warm: one discarded warm-up turn, then the measured runs on one sidecar.
    const sidecar = startSidecar(repoRoot);
    try {
      await turnFn(sidecar, opts, fixture);
      for (let run = 1; run <= opts.warm; run++) {
        record({ fixture: fixture.id, temperature: "warm", run, ...(await turnFn(sidecar, opts, fixture)) });
      }
      for (let run = 1; run <= opts.bargeIn; run++) {
        record({
          fixture: fixture.id,
          temperature: "barge-in",
          run,
          ...(await runStreamedTurn(sidecar, opts, fixture, { bargeIn: true })),
        });
      }
    } finally {
      await sidecar.stop();
    }
  }
  return { status: "measured", turns, summary: aggregate(turns) };
}

async function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    process.stderr.write(`measure-voice-latency: ${err.message}\n`);
    process.exit(2);
  }
  const repoRoot = process.cwd();
  if (!existsSync(path.join(repoRoot, "desktop/sidecar/dist/main.js"))) {
    process.stderr.write("measure-voice-latency: build the sidecar first (npm run build:sidecar)\n");
    process.exit(2);
  }
  const release = acquireLock();
  if (!release) {
    process.stderr.write("measure-voice-latency: another run holds the audio runtime; refusing to start\n");
    process.exit(2);
  }
  const onSignal = () => {
    release();
    process.exit(130);
  };
  process.once("SIGINT", onSignal);
  try {
    const started = new Date().toISOString();
    const result = await measure(opts, repoRoot);
    const report = {
      schemaVersion: 1,
      tool: "scripts/measure-voice-latency.mjs",
      mode: opts.mode,
      model: opts.model,
      startedAt: started,
      finishedAt: new Date().toISOString(),
      host: { platform: process.platform, runtimeConfig: existsSync(path.join(homedir(), ".nexus", "runtime.json")) },
      runsPerFixture: { warm: opts.warm, cold: opts.cold, bargeIn: opts.bargeIn },
      pollIntervalMs: opts.mode === "streamed" ? SPOKEN_REPLY_POLL_MS : null,
      ...result,
    };
    writeFileSync(path.resolve(repoRoot, opts.output), `${JSON.stringify(report, null, 2)}\n`);
    process.stderr.write(`wrote ${opts.output} (${result.status})\n`);
    const failed = result.turns.some((t) => t.status !== "ok");
    process.exitCode = failed ? 1 : 0;
  } finally {
    release();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
