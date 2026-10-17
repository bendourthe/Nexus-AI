import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  acquireLock,
  aggregate,
  parseArgs,
  percentile,
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
