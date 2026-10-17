import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AudioStreamError,
  ChildProcessAudioRuntime,
  InMemoryAudioRuntime,
  SPEAK_STREAM_MAX_SEGMENTS,
  type AudioSpeakSegment,
} from "../../../../core/audio/AudioRuntimeClient.js";

interface Req {
  id: number;
  method: string;
  params: { jobId?: string; text?: string };
}

/** A scripted audio runtime: `onRequest` decides what each request emits. */
function scriptedChild(onRequest: (req: Req, send: (msg: unknown) => void, child: FakeChild) => void) {
  const child = new EventEmitter() as FakeChild;
  child.stdin = new PassThrough();
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.requests = [];
  child.kill = () => true;
  const send = (msg: unknown) => child.stdout.write(`${JSON.stringify(msg)}\n`);
  let buffered = "";
  child.stdin.on("data", (buf: Buffer) => {
    buffered += String(buf);
    let i: number;
    while ((i = buffered.indexOf("\n")) >= 0) {
      const line = buffered.slice(0, i).trim();
      buffered = buffered.slice(i + 1);
      if (!line) continue;
      const req = JSON.parse(line) as Req;
      child.requests.push(req);
      onRequest(req, send, child);
    }
  });
  return child;
}

type FakeChild = EventEmitter & {
  stdin: PassThrough;
  stdout: PassThrough;
  stderr: PassThrough;
  kill: () => boolean;
  requests: Req[];
};

const segment = (jobId: string, seq: number, audio = "UklGRg==") => ({
  jsonrpc: "2.0",
  method: "speak.segment",
  params: { jobId, seq, audioBase64: audio, mimeType: "audio/wav" },
});

function runtimeWith(child: FakeChild, streamIdleTimeoutMs = 2000) {
  return new ChildProcessAudioRuntime({
    spawnFn: (() => child) as unknown as typeof import("node:child_process").spawn,
    requestTimeoutMs: 2000,
    streamIdleTimeoutMs,
  });
}

afterEach(() => {
  vi.useRealTimers();
});

describe("ChildProcessAudioRuntime.speakStream", () => {
  it("delivers segments in order, then resolves once with the terminal state", async () => {
    const child = scriptedChild((req, send) => {
      if (req.method !== "speak.stream") return;
      const jobId = req.params.jobId!;
      send(segment(jobId, 0));
      send(segment(jobId, 1));
      send(segment(jobId, 2));
      send({ jsonrpc: "2.0", id: req.id, result: { jobId, status: "completed", segments: 3 } });
    });
    const runtime = runtimeWith(child);
    const seen: AudioSpeakSegment[] = [];
    const result = await runtime.speakStream({ jobId: "j1", text: "One. Two. Three." }, (s) => seen.push(s));
    expect(seen.map((s) => s.seq)).toEqual([0, 1, 2]);
    expect(result).toEqual({ status: "completed", segments: 3 });
    expect(child.requests[0]).toMatchObject({ method: "speak.stream", params: { jobId: "j1", text: "One. Two. Three." } });
    await runtime.shutdown();
  });

  it("drops and counts notifications for unknown jobs", async () => {
    const child = scriptedChild((req, send) => {
      if (req.method !== "speak.stream") return;
      send(segment("someone-else", 0));
      send({ jsonrpc: "2.0", method: "speak.segment", params: { jobId: "j1" } });
      send(segment("j1", 0));
      send({ jsonrpc: "2.0", id: req.id, result: { status: "completed", segments: 1 } });
    });
    const runtime = runtimeWith(child);
    const seen: number[] = [];
    await runtime.speakStream({ jobId: "j1", text: "Hi." }, (s) => seen.push(s.seq));
    expect(seen).toEqual([0]);
    expect(runtime.droppedNotifications).toBe(2);
    await runtime.shutdown();
  });

  it("ends an idle stream with a typed timeout reset by each segment, and cancels it", async () => {
    const child = scriptedChild((req, send) => {
      if (req.method === "speak.stream") {
        setTimeout(() => send(segment(req.params.jobId!, 0)), 30);
        setTimeout(() => send(segment(req.params.jobId!, 1)), 60);
        // ...then silence: no further segment and no terminal message.
      }
      if (req.method === "speak.cancel") send({ jsonrpc: "2.0", id: req.id, result: { ok: true } });
    });
    const runtime = runtimeWith(child, 50);
    const seen: number[] = [];
    const err = await runtime.speakStream({ jobId: "j1", text: "Hi." }, (s) => seen.push(s.seq)).catch((e) => e);
    expect(err).toBeInstanceOf(AudioStreamError);
    expect((err as AudioStreamError).code).toBe("idle-timeout");
    // Both segments arrived within 50 ms of the previous one, so the timer was reset.
    expect(seen).toEqual([0, 1]);
    await vi.waitFor(() => expect(child.requests.some((r) => r.method === "speak.cancel")).toBe(true));
    await runtime.shutdown();
  });

  it("rejects every open stream once when the child exits", async () => {
    const child = scriptedChild(() => undefined);
    const runtime = runtimeWith(child);
    const settled: string[] = [];
    const a = runtime
      .speakStream({ jobId: "a", text: "A." }, () => undefined)
      .then(
        () => settled.push("a:resolved"),
        (e: AudioStreamError) => settled.push(`a:${e.code}`),
      );
    const b = runtime
      .speakStream({ jobId: "b", text: "B." }, () => undefined)
      .then(
        () => settled.push("b:resolved"),
        (e: AudioStreamError) => settled.push(`b:${e.code}`),
      );
    await vi.waitFor(() => expect(child.requests.length).toBe(2));
    child.emit("exit", 1);
    child.emit("exit", 1);
    await Promise.all([a, b]);
    expect(settled.sort()).toEqual(["a:runtime-exited", "b:runtime-exited"]);
  });

  it("ends a job that exceeds the segment bound with an error and cancels it", async () => {
    const child = scriptedChild((req, send) => {
      if (req.method === "speak.stream") {
        for (let i = 0; i <= SPEAK_STREAM_MAX_SEGMENTS; i++) send(segment(req.params.jobId!, i));
      }
      if (req.method === "speak.cancel") send({ jsonrpc: "2.0", id: req.id, result: { ok: true } });
    });
    const runtime = runtimeWith(child);
    let delivered = 0;
    const err = await runtime.speakStream({ jobId: "j1", text: "x" }, () => delivered++).catch((e) => e);
    expect((err as AudioStreamError).code).toBe("overflow");
    expect(delivered).toBe(SPEAK_STREAM_MAX_SEGMENTS);
    await vi.waitFor(() => expect(child.requests.some((r) => r.method === "speak.cancel")).toBe(true));
    await runtime.shutdown();
  });

  it("turns a runtime error into a typed rejection and clears the job", async () => {
    const child = scriptedChild((req, send) => {
      if (req.method === "speak.stream") send({ jsonrpc: "2.0", id: req.id, error: { message: "TTS weights are not installed." } });
    });
    const runtime = runtimeWith(child);
    const err = await runtime.speakStream({ jobId: "j1", text: "x" }, () => undefined).catch((e) => e);
    expect((err as AudioStreamError).code).toBe("runtime-error");
    expect((err as Error).message).toMatch(/not installed/);
    // The id is free again once the job is cleared.
    const again = runtime.speakStream({ jobId: "j1", text: "x" }, () => undefined).catch((e) => e);
    expect(((await again) as AudioStreamError).message).toMatch(/not installed/);
    await runtime.shutdown();
  });

  it("refuses a second open stream with the same job id", async () => {
    const child = scriptedChild(() => undefined);
    const runtime = runtimeWith(child);
    const first = runtime.speakStream({ jobId: "dup", text: "x" }, () => undefined).catch(() => undefined);
    await expect(runtime.speakStream({ jobId: "dup", text: "y" }, () => undefined)).rejects.toThrow(/already open/);
    await runtime.shutdown();
    await first;
  });

  it("settles each racing outcome exactly once: cancel then terminal then exit", async () => {
    const child = scriptedChild((req, send) => {
      if (req.method === "speak.cancel") {
        send({ jsonrpc: "2.0", id: req.id, result: { ok: true } });
        const stream = child.requests.find((r) => r.method === "speak.stream")!;
        send({ jsonrpc: "2.0", id: stream.id, result: { status: "cancelled", segments: 0 } });
        child.emit("exit", 0);
      }
    });
    const runtime = runtimeWith(child);
    const outcomes: string[] = [];
    const done = runtime.speakStream({ jobId: "j1", text: "x" }, () => undefined).then(
      (r) => outcomes.push(r.status),
      (e: AudioStreamError) => outcomes.push(e.code),
    );
    await vi.waitFor(() => expect(child.requests.length).toBe(1));
    await runtime.cancelSpeak("j1");
    await done;
    expect(outcomes).toEqual(["cancelled"]);
  });

  it("rejects open streams on shutdown and leaves request/response calls unchanged", async () => {
    const child = scriptedChild((req, send) => {
      if (req.method === "transcribe") send({ jsonrpc: "2.0", id: req.id, result: { transcript: "hello" } });
    });
    const runtime = runtimeWith(child);
    const open = runtime.speakStream({ jobId: "j1", text: "x" }, () => undefined).catch((e: AudioStreamError) => e.code);
    expect((await runtime.transcribe({ audioBase64: "AAAA" })).transcript).toContain("hello");
    await runtime.shutdown();
    expect(await open).toBe("shutdown");
  });
});

describe("InMemoryAudioRuntime.speakStream", () => {
  it("emits one segment and honors a cancel issued right after the call", async () => {
    const runtime = new InMemoryAudioRuntime();
    const seen: number[] = [];
    expect(await runtime.speakStream({ jobId: "a", text: "Hi." }, (s) => seen.push(s.seq))).toEqual({
      status: "completed",
      segments: 1,
    });
    const pending = runtime.speakStream({ jobId: "b", text: "Bye." }, (s) => seen.push(s.seq));
    await runtime.cancelSpeak("b");
    expect(await pending).toEqual({ status: "cancelled", segments: 0 });
    expect(seen).toEqual([0]);
    expect(runtime.streamed).toEqual(["Hi.", "Bye."]);
  });
});
