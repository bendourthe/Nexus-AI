import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  acquireLock,
  aggregate,
  parseArgs,
  percentile,
  playbackSchedule,
  runStreamedTurn,
  runTurn,
  sanitizeTurn,
  StageTimeout,
  sidecarNode,
  summarize,
  ttftForTurn,
  turnSpans,
  wavDurationMs,
} from "../../../scripts/measure-voice-latency.mjs";

function wav(dataBytes: number, byteRate = 48_000): Buffer {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + dataBytes, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(byteRate / 2, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(dataBytes, 40);
  return Buffer.concat([header, Buffer.alloc(dataBytes)]);
}

describe("measure-voice-latency statistics", () => {
  it("computes nearest-rank percentiles and ignores non-finite values", () => {
    const xs = [5, 1, 4, 2, 3, Number.NaN, null as unknown as number];
    expect(percentile(xs, 50)).toBe(3);
    expect(percentile(xs, 95)).toBe(5);
    expect(percentile([], 50)).toBeNull();
    expect(summarize([10, 20, 30])).toEqual({ n: 3, p50: 20, p95: 30, min: 10, max: 30 });
  });

  it("reads WAV duration from the header and rejects non-WAV bytes", () => {
    expect(wavDurationMs(wav(48_000))).toBe(1000);
    expect(wavDurationMs(Buffer.from("not a wav file at all, nope, not even close"))).toBeNull();
  });

  it("derives spans relative to the transcription request", () => {
    const spans = turnSpans(
      { transcribeStart: 100, transcribeEnd: 600, chatStart: 650, chatEnd: 2650, speakStart: 2700, speakEnd: 3700, firstAudio: 3700 },
      400,
      2000,
    );
    expect(spans).toEqual({
      transcribe: 500,
      modelFirstToken: 950,
      modelComplete: 2550,
      synthesis: 1000,
      firstAudio: 3600,
      timeToFirstAudio: 3600,
      timeToLastAudio: 5600,
    });
    expect(turnSpans({ transcribeStart: 0, transcribeEnd: 1, chatStart: 1, chatEnd: 2, speakStart: 2, speakEnd: 3, firstAudio: 3 }, null, null))
      .toMatchObject({ modelFirstToken: null, timeToLastAudio: null });
  });

  it("takes the newest inference record of this turn, never a stale one", () => {
    const recent = [
      { at: 5_000, ttftMs: 111 },
      { at: 9_000, ttftMs: 333 },
      { at: 7_000, ttftMs: 222 },
    ];
    expect(ttftForTurn(recent, 6_000)).toBe(333);
    expect(ttftForTurn(recent, 10_000)).toBeNull();
    expect(ttftForTurn(undefined, 0)).toBeNull();
  });

  it("aggregates only ok turns and lists failures by stage", () => {
    const ok = (ttfa: number) => ({ fixture: "medium", temperature: "warm", status: "ok", spans: { timeToFirstAudio: ttfa } });
    const summary = aggregate([
      ok(1000),
      ok(3000),
      { fixture: "medium", temperature: "warm", status: "timeout", stage: "synthesis" },
    ]);
    const group = summary["medium:warm"];
    expect(group.runs).toBe(3);
    expect(group.ok).toBe(2);
    expect(group.failures).toEqual([{ status: "timeout", stage: "synthesis" }]);
    expect(group.stats.timeToFirstAudio).toMatchObject({ n: 2, p50: 1000, p95: 3000 });
  });
});

describe("measure-voice-latency trace rule", () => {
  it("drops transcript, reply text and audio from a turn record", () => {
    const turn = sanitizeTurn({
      fixture: "short",
      temperature: "warm",
      run: 1,
      status: "ok",
      spans: { timeToFirstAudio: 1 },
      counts: { replyChars: 31 },
      transcript: "secret words",
      reply: "the reply",
      audioBase64: "UklGRg==",
    });
    expect(Object.keys(turn).sort()).toEqual(["counts", "fixture", "run", "spans", "status", "temperature"]);
    expect(JSON.stringify(turn)).not.toMatch(/secret words|the reply|UklGRg/);
  });
});

describe("measure-voice-latency turn outcomes", () => {
  const opts = { stageTimeoutMs: 1000, model: "m" };
  const fixture = { id: "short", audioBase64: "AA==" };
  function scripted(overrides: Record<string, () => unknown>) {
    const defaults: Record<string, () => unknown> = {
      "audio.transcribe": () => ({ transcript: "hello" }),
      "chat.session.start": () => ({ sessionId: "s1" }),
      "chat.session.sendMessage": () => ({ events: [{ kind: "token", text: "Hi there." }, { kind: "done", finishReason: "stop" }] }),
      "metrics.inference": () => ({ recent: [{ at: Date.now() + 1, ttftMs: 5 }] }),
      "audio.speak": () => ({ audioBase64: wav(4800).toString("base64") }),
    };
    return {
      rpc: async (method: string) => (overrides[method] ?? defaults[method])!(),
    };
  }

  it("records a typed timeout with its stage, never a zero duration", async () => {
    const sidecar = scripted({
      "audio.speak": () => {
        throw new StageTimeout("synthesis");
      },
    });
    const turn = await runTurn(sidecar, opts, fixture);
    expect(turn).toEqual({ status: "timeout", stage: "synthesis" });
  });

  it("reports a model error as an error at the model stage", async () => {
    const sidecar = scripted({
      "chat.session.sendMessage": () => ({ events: [{ kind: "done", finishReason: "error: boom" }] }),
    });
    expect(await runTurn(sidecar, opts, fixture)).toEqual({ status: "error", stage: "modelComplete", reason: "model-error" });
  });

  it("measures a complete turn with counts only", async () => {
    const turn = await runTurn(scripted({}), opts, fixture);
    expect(turn.status).toBe("ok");
    expect(turn.counts).toMatchObject({ transcriptChars: 5, replyChars: 9, tokenEvents: 1, audioDurationMs: 100 });
    expect(JSON.stringify(sanitizeTurn({ fixture: "short", ...turn }))).not.toContain("Hi there");
  });
});

describe("measure-voice-latency streamed mode", () => {
  it("schedules segments back to back and reports the silent gap before each", () => {
    expect(playbackSchedule([])).toEqual({ firstStart: null, gaps: [], end: null });
    // Second segment arrives during the first (no gap); third arrives late (400 ms gap).
    expect(
      playbackSchedule([
        { atMs: 1000, durationMs: 2000 },
        { atMs: 1500, durationMs: 1000 },
        { atMs: 4400, durationMs: 500 },
      ]),
    ).toEqual({ firstStart: 1000, gaps: [0, 400], end: 4900 });
  });

  function streamedSidecar(script: { segmentsPerDrain: number[]; cancelAfter?: number }) {
    let drains = 0;
    let cancelled = false;
    const calls: string[] = [];
    let seq = 0;
    return {
      calls,
      rpc: async (method: string) => {
        calls.push(method);
        if (method === "audio.transcribe") return { transcript: "hello" };
        if (method === "chat.session.start") return { sessionId: "s1" };
        if (method === "chat.session.sendMessage") {
          await new Promise((r) => setTimeout(r, 15));
          return { events: [{ kind: "token", text: "One. Two." }, { kind: "done", finishReason: "stop" }] };
        }
        if (method === "audio.speakCancel") {
          cancelled = true;
          return { ok: true };
        }
        if (method === "audio.speakDrain") {
          if (cancelled) return { state: "cancelled", segments: [] };
          const n = script.segmentsPerDrain[drains++] ?? 0;
          const segments = Array.from({ length: n }, () => ({ seq: seq++, audioBase64: wav(4800).toString("base64") }));
          const last = drains >= script.segmentsPerDrain.length;
          return { state: last ? "completed" : "running", segments };
        }
        if (method === "metrics.inference") return { recent: [{ at: Date.now() + 1, ttftMs: 5 }] };
        throw new Error(`unexpected ${method}`);
      },
    };
  }

  it("measures a streamed turn from the first segment, with gaps and a voice job id", async () => {
    const sidecar = streamedSidecar({ segmentsPerDrain: [0, 1, 1] });
    const turn = await runStreamedTurn(sidecar, { stageTimeoutMs: 1000, model: "m" }, { id: "short", audioBase64: "AA==" }, { poll: 1 });
    expect(turn.status).toBe("ok");
    expect(turn.counts).toMatchObject({ segments: 2, audioDurationMs: 200 });
    expect(turn.gapsMs).toHaveLength(1);
    expect(turn.spans.timeToFirstAudio).toBe(turn.spans.firstAudio);
    expect(turn.spans.timeToLastAudio).toBeGreaterThanOrEqual(turn.spans.firstAudio + 200);
    expect(sidecar.calls).toContain("chat.session.sendMessage");
  });

  it("times a barge-in cancel until the job reports cancelled", async () => {
    const sidecar = streamedSidecar({ segmentsPerDrain: [1, 1, 1, 1] });
    const turn = await runStreamedTurn(sidecar, { stageTimeoutMs: 1000, model: "m" }, { id: "long", audioBase64: "AA==" }, { bargeIn: true, poll: 1 });
    expect(turn.status).toBe("ok");
    expect(turn.bargeIn).toMatchObject({ state: "cancelled" });
    expect(turn.bargeIn.cancelMs).toBeGreaterThanOrEqual(0);
    expect(sidecar.calls.filter((c) => c === "audio.speakCancel")).toHaveLength(1);
  });

  it("aggregates inter-segment gaps and barge-in cancel latency", () => {
    const summary = aggregate([
      { fixture: "medium", temperature: "warm", status: "ok", spans: {}, gapsMs: [0, 100] },
      { fixture: "medium", temperature: "warm", status: "ok", spans: {}, gapsMs: [300] },
      { fixture: "long", temperature: "barge-in", status: "ok", spans: {}, bargeIn: { cancelMs: 120 } },
    ]);
    expect(summary["medium:warm"].stats.interSegmentGap).toMatchObject({ n: 3, p95: 300 });
    expect(summary["long:barge-in"].stats.bargeInCancel).toMatchObject({ n: 1, p50: 120 });
  });

  it("rejects barge-in runs outside streamed mode", () => {
    expect(() => parseArgs(["--model", "m", "--output", "o", "--barge-in", "2"])).toThrow(/streamed/);
    expect(parseArgs(["--model", "m", "--output", "o", "--mode", "streamed", "--barge-in", "2"]).bargeIn).toBe(2);
  });
});

describe("measure-voice-latency arguments and lock", () => {
  it("requires output and model, and rejects unknown modes and flags", () => {
    expect(parseArgs(["--model", "m", "--output", "o.json"])).toMatchObject({ mode: "baseline", warm: 20, cold: 5 });
    expect(() => parseArgs(["--output", "o.json"])).toThrow(/--model/);
    expect(() => parseArgs(["--model", "m"])).toThrow(/--output/);
    expect(() => parseArgs(["--model", "m", "--output", "o", "--mode", "live"])).toThrow(/--mode/);
    expect(() => parseArgs(["--model", "m", "--output", "o", "--warm", "-1"])).toThrow(/warm/);
    expect(() => parseArgs(["--bogus"])).toThrow(/unknown flag/);
  });

  it("refuses a second run while the lock is held, and frees it on release", () => {
    const dir = mkdtempSync(join(tmpdir(), "voice-lock-"));
    const release = acquireLock(dir);
    expect(release).toBeTypeOf("function");
    expect(acquireLock(dir)).toBeNull();
    release!();
    const again = acquireLock(dir);
    expect(again).toBeTypeOf("function");
    again!();
  });

  it("spawns the installed Node when runtime.json names one, else this Node", () => {
    const dir = mkdtempSync(join(tmpdir(), "voice-node-"));
    const cfg = join(dir, "runtime.json");
    writeFileSync(cfg, JSON.stringify({ nodePath: process.execPath }));
    expect(sidecarNode(cfg)).toBe(process.execPath);
    writeFileSync(cfg, JSON.stringify({ nodePath: join(dir, "missing-node.exe") }));
    expect(sidecarNode(cfg)).toBe(process.execPath);
    expect(sidecarNode(join(dir, "absent.json"))).toBe(process.execPath);
  });
});
