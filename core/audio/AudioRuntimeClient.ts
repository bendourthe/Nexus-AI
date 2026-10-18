/**
 * v2.0.0 Phase 1 -- Node client for the local STT/TTS runtime.
 *
 * Mirrors `core/documents/OcrRuntimeClient` (line-delimited JSON-RPC over a
 * Python child) without job polling: transcribe and speak are request/response.
 * v2.14.0 T006 adds `speakStream`: the runtime's `speak.segment` notifications
 * are routed by job id and the request's response is the terminal state.
 * Weights come from the installer catalog path (`faster-whisper-large-v3`,
 * `kokoro-82m`). No outbound calls.
 */

import {
  type ChildProcessWithoutNullStreams,
  type SpawnOptions,
  spawn,
} from "node:child_process";
import { createInterface, type Interface } from "node:readline";

import { prepareSttTranscript, STT_TRANSCRIPT_ORIGIN } from "./transcript.js";

export interface AudioHealth {
  readonly ok: boolean;
  readonly stt: { readonly available: boolean; readonly reason: string };
  readonly tts: { readonly available: boolean; readonly reason: string };
  readonly platform: string;
}

export interface AudioTranscribeResult {
  readonly transcript: string;
  readonly origin: typeof STT_TRANSCRIPT_ORIGIN;
}

export interface AudioSpeakResult {
  readonly audioBase64: string;
  readonly mimeType: string;
}

/** v2.14.0 T006 -- one synthesized segment of a streamed reply. */
export interface AudioSpeakSegment {
  readonly seq: number;
  readonly audioBase64: string;
  readonly mimeType: string;
}

export interface AudioSpeakStreamResult {
  readonly status: "completed" | "cancelled";
  readonly segments: number;
}

/** Frozen bounds (docs/releases/v2/v2.14/development/gates.md). */
export const SPEAK_STREAM_IDLE_TIMEOUT_MS = 30_000;
export const SPEAK_STREAM_MAX_SEGMENTS = 200;
export const SPEAK_STREAM_MAX_BYTES = 64 * 1024 * 1024;

export class AudioStreamError extends Error {
  constructor(
    readonly code: "idle-timeout" | "overflow" | "runtime-exited" | "shutdown" | "runtime-error",
    message: string,
  ) {
    super(message);
    this.name = "AudioStreamError";
  }
}

export interface AudioRuntimeClient {
  health(): Promise<AudioHealth>;
  transcribe(input: { audioBase64: string; mimeType?: string }): Promise<AudioTranscribeResult>;
  speak(input: { text: string }): Promise<AudioSpeakResult>;
  /**
   * v2.14.0 T006 -- synthesize `text`, delivering each segment to `onSegment`
   * in order as it is ready. Resolves once with the terminal state; rejects
   * once with an AudioStreamError. A newer stream pre-empts this one in the
   * runtime, so callers sequence their streams.
   */
  speakStream(
    input: { jobId: string; text: string },
    onSegment: (segment: AudioSpeakSegment) => void,
  ): Promise<AudioSpeakStreamResult>;
  /** Cancel a stream by job id; unknown and finished ids are a no-op. */
  cancelSpeak(jobId: string): Promise<void>;
  shutdown(): Promise<void>;
}

const STUB_WAV_B64 =
  "UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=";

/**
 * In-memory client for tests and `NEXUS_AUDIO_INMEMORY=1`. Never spawns Python.
 */
export class InMemoryAudioRuntime implements AudioRuntimeClient {
  lastTranscribe: { audioBase64: string; mimeType?: string } | null = null;
  lastSpeak: { text: string } | null = null;
  sttAvailable = true;
  ttsAvailable = true;
  transcribeImpl: ((audioBase64: string) => string) | null = null;

  async health(): Promise<AudioHealth> {
    return {
      ok: this.sttAvailable || this.ttsAvailable,
      stt: {
        available: this.sttAvailable,
        reason: this.sttAvailable ? "in-memory" : "stt unavailable",
      },
      tts: {
        available: this.ttsAvailable,
        reason: this.ttsAvailable ? "in-memory" : "tts unavailable",
      },
      platform: "in-memory",
    };
  }

  async transcribe(input: { audioBase64: string; mimeType?: string }): Promise<AudioTranscribeResult> {
    this.lastTranscribe = input;
    if (!this.sttAvailable) {
      throw new Error("STT weights are not installed. Install faster-whisper-large-v3 from Settings > Models.");
    }
    const raw = this.transcribeImpl
      ? this.transcribeImpl(input.audioBase64)
      : "in-memory transcript";
    return prepareSttTranscript(raw);
  }

  async speak(input: { text: string }): Promise<AudioSpeakResult> {
    this.lastSpeak = input;
    if (!this.ttsAvailable) {
      throw new Error("TTS weights are not installed. Install kokoro-82m from Settings > Models.");
    }
    return { audioBase64: STUB_WAV_B64, mimeType: "audio/wav" };
  }

  /** Texts passed to speakStream, in order, for assertions. */
  readonly streamed: string[] = [];
  private readonly cancelled = new Set<string>();

  async speakStream(
    input: { jobId: string; text: string },
    onSegment: (segment: AudioSpeakSegment) => void,
  ): Promise<AudioSpeakStreamResult> {
    this.streamed.push(input.text);
    if (!this.ttsAvailable) {
      throw new AudioStreamError(
        "runtime-error",
        "TTS weights are not installed. Install kokoro-82m from Settings > Models.",
      );
    }
    // Yield first so a cancel issued right after the call is observed.
    await Promise.resolve();
    if (this.cancelled.delete(input.jobId)) return { status: "cancelled", segments: 0 };
    onSegment({ seq: 0, audioBase64: STUB_WAV_B64, mimeType: "audio/wav" });
    return { status: "completed", segments: 1 };
  }

  async cancelSpeak(jobId: string): Promise<void> {
    this.cancelled.add(jobId);
  }

  async shutdown(): Promise<void> {
    this.lastTranscribe = null;
    this.lastSpeak = null;
  }
}

interface OpenStream {
  readonly rpcId: number;
  readonly onSegment: (segment: AudioSpeakSegment) => void;
  readonly resolve: (value: AudioSpeakStreamResult) => void;
  readonly reject: (err: AudioStreamError) => void;
  timer: ReturnType<typeof setTimeout>;
  segments: number;
  bytes: number;
}

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (err: Error) => void;
}

export interface AudioChildProcessOptions {
  readonly command?: string;
  readonly args?: readonly string[];
  readonly cwd?: string;
  readonly env?: NodeJS.ProcessEnv;
  readonly spawnFn?: typeof spawn;
  readonly requestTimeoutMs?: number;
  /** v2.14.0: idle timeout for a stream, reset by every segment. */
  readonly streamIdleTimeoutMs?: number;
}

export class ChildProcessAudioRuntime implements AudioRuntimeClient {
  private child: ChildProcessWithoutNullStreams | null = null;
  private rl: Interface | null = null;
  private readonly pending = new Map<number, PendingRequest>();
  private nextId = 1;
  private readonly requestTimeoutMs: number;
  private readonly streamIdleTimeoutMs: number;
  private readonly streams = new Map<string, OpenStream>();
  /** Segment notifications for no open stream (late, foreign or malformed). */
  droppedNotifications = 0;

  constructor(private readonly options: AudioChildProcessOptions = {}) {
    this.requestTimeoutMs = options.requestTimeoutMs ?? 120_000;
    this.streamIdleTimeoutMs = options.streamIdleTimeoutMs ?? SPEAK_STREAM_IDLE_TIMEOUT_MS;
  }

  private ensureSpawned(): ChildProcessWithoutNullStreams {
    if (this.child) return this.child;
    const spawnFn = this.options.spawnFn ?? spawn;
    const command = this.options.command ?? "python";
    const args = [...(this.options.args ?? ["-m", "runtimes.audio.main"])];
    const spawnOpts: SpawnOptions = {
      cwd: this.options.cwd,
      env: this.options.env ?? process.env,
      stdio: ["pipe", "pipe", "pipe"],
    };
    const child = spawnFn(command, args, spawnOpts) as ChildProcessWithoutNullStreams;
    this.child = child;
    const rl = createInterface({ input: child.stdout, crlfDelay: Infinity });
    this.rl = rl;
    rl.on("line", (line: string) => this.handleLine(line));
    // Streams first: their terminal requests are also in `pending`, and
    // failing them there would report a generic error instead of the cause.
    child.on("exit", () => {
      this.failStreams(new AudioStreamError("runtime-exited", "audio-runtime-exited"));
      this.failPending(new Error("audio-runtime-exited"));
      this.child = null;
      this.rl = null;
    });
    child.on("error", (err: Error) => {
      this.failStreams(new AudioStreamError("runtime-error", err.message));
      this.failPending(err);
    });
    return child;
  }

  private failPending(err: Error): void {
    for (const [, p] of this.pending) p.reject(err);
    this.pending.clear();
  }

  /** Reject every open stream exactly once and clear its state. */
  private failStreams(err: AudioStreamError): void {
    const open = [...this.streams.values()];
    this.streams.clear();
    for (const stream of open) {
      clearTimeout(stream.timer);
      this.pending.delete(stream.rpcId);
      stream.reject(err);
    }
  }

  private handleSegment(params: unknown): void {
    const p = (params ?? {}) as Record<string, unknown>;
    const jobId = typeof p.jobId === "string" ? p.jobId : null;
    const stream = jobId ? this.streams.get(jobId) : undefined;
    if (
      !jobId ||
      !stream ||
      typeof p.seq !== "number" ||
      typeof p.audioBase64 !== "string"
    ) {
      this.droppedNotifications += 1;
      return;
    }
    stream.segments += 1;
    stream.bytes += p.audioBase64.length;
    if (stream.segments > SPEAK_STREAM_MAX_SEGMENTS || stream.bytes > SPEAK_STREAM_MAX_BYTES) {
      this.endStream(jobId, new AudioStreamError("overflow", "audio stream exceeded its bounds"));
      void this.cancelSpeak(jobId);
      return;
    }
    this.armIdle(jobId, stream);
    stream.onSegment({
      seq: p.seq,
      audioBase64: p.audioBase64,
      mimeType: typeof p.mimeType === "string" ? p.mimeType : "audio/wav",
    });
  }

  private armIdle(jobId: string, stream: OpenStream): void {
    clearTimeout(stream.timer);
    stream.timer = setTimeout(() => {
      this.endStream(
        jobId,
        new AudioStreamError("idle-timeout", `audio.speak.stream: no segment for ${this.streamIdleTimeoutMs}ms`),
      );
      void this.cancelSpeak(jobId);
    }, this.streamIdleTimeoutMs);
  }

  private endStream(jobId: string, outcome: AudioStreamError | AudioSpeakStreamResult): void {
    const stream = this.streams.get(jobId);
    if (!stream) return;
    this.streams.delete(jobId);
    this.pending.delete(stream.rpcId);
    clearTimeout(stream.timer);
    if (outcome instanceof AudioStreamError) stream.reject(outcome);
    else stream.resolve(outcome);
  }

  private handleLine(line: string): void {
    if (!line.trim()) return;
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(line) as Record<string, unknown>;
    } catch {
      return;
    }
    if (parsed.method === "speak.segment" && parsed.id === undefined) {
      this.handleSegment(parsed.params);
      return;
    }
    if (typeof parsed.id !== "number") return;
    const entry = this.pending.get(parsed.id);
    if (!entry) return;
    this.pending.delete(parsed.id);
    if (parsed.error && typeof parsed.error === "object") {
      const errObj = parsed.error as { message?: string };
      entry.reject(new Error(errObj.message ?? "audio-runtime-error"));
    } else {
      entry.resolve(parsed.result ?? null);
    }
  }

  private call<T>(method: string, params: Record<string, unknown>): Promise<T> {
    const child = this.ensureSpawned();
    const id = this.nextId++;
    const payload = JSON.stringify({ jsonrpc: "2.0", id, method, params });
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.pending.delete(id)) {
          reject(new Error(`audio.${method}: timeout after ${this.requestTimeoutMs}ms`));
        }
      }, this.requestTimeoutMs);
      this.pending.set(id, {
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value as T);
        },
        reject: (err) => {
          clearTimeout(timer);
          reject(err);
        },
      });
      child.stdin.write(payload + "\n");
    });
  }

  async health(): Promise<AudioHealth> {
    return this.call<AudioHealth>("health", {});
  }

  async transcribe(input: { audioBase64: string; mimeType?: string }): Promise<AudioTranscribeResult> {
    const raw = await this.call<{ transcript?: string }>("transcribe", {
      audioBase64: input.audioBase64,
      ...(input.mimeType ? { mimeType: input.mimeType } : {}),
    });
    return prepareSttTranscript(raw.transcript ?? "");
  }

  async speak(input: { text: string }): Promise<AudioSpeakResult> {
    return this.call<AudioSpeakResult>("speak", { text: input.text });
  }

  speakStream(
    input: { jobId: string; text: string },
    onSegment: (segment: AudioSpeakSegment) => void,
  ): Promise<AudioSpeakStreamResult> {
    const { jobId } = input;
    if (this.streams.has(jobId)) {
      return Promise.reject(new AudioStreamError("runtime-error", "audio stream job id already open"));
    }
    const child = this.ensureSpawned();
    const rpcId = this.nextId++;
    return new Promise<AudioSpeakStreamResult>((resolve, reject) => {
      const stream: OpenStream = {
        rpcId,
        onSegment,
        resolve,
        reject,
        timer: setTimeout(() => undefined, 0),
        segments: 0,
        bytes: 0,
      };
      this.streams.set(jobId, stream);
      this.armIdle(jobId, stream);
      // The terminal message is the JSON-RPC response to this request.
      this.pending.set(rpcId, {
        resolve: (value) => {
          const r = (value ?? {}) as { status?: unknown; segments?: unknown };
          this.endStream(jobId, {
            status: r.status === "cancelled" ? "cancelled" : "completed",
            segments: typeof r.segments === "number" ? r.segments : stream.segments,
          });
        },
        reject: (err) => this.endStream(jobId, new AudioStreamError("runtime-error", err.message)),
      });
      child.stdin.write(
        JSON.stringify({ jsonrpc: "2.0", id: rpcId, method: "speak.stream", params: { jobId, text: input.text } }) +
          "\n",
      );
    });
  }

  async cancelSpeak(jobId: string): Promise<void> {
    if (!this.child) return;
    try {
      await this.call<{ ok: boolean }>("speak.cancel", { jobId });
    } catch {
      // A runtime that is gone has nothing left to cancel.
    }
  }

  async shutdown(): Promise<void> {
    this.failStreams(new AudioStreamError("shutdown", "audio-runtime-shutdown"));
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
    if (this.child) {
      const child = this.child;
      this.child = null;
      try {
        child.stdin.end();
      } catch {
        // already closed
      }
      child.kill();
    }
    this.failPending(new Error("audio-runtime-shutdown"));
  }
}
