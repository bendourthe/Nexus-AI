// v2.14.0 T008 -- spoken-reply jobs: synthesize from the reply stream.
//
// A chat turn sent with `voice: { jobId }` opens one voice job bound to that
// chat session. As the model streams, the chat handler hands each complete
// speakable sentence to the job, which synthesizes them in order through the
// audio runtime's `speakStream` (one runtime stream at a time, because a newer
// stream pre-empts the active one). Ready segments wait in a bounded buffer
// until the webview drains them with `audio.speakDrain`; `audio.speakCancel`
// stops synthesis and any further sentences.
//
// The job id is a client-generated 128-bit random UUID. Drain and cancel are
// answered identically for unknown, finished-and-evicted and foreign ids, so a
// caller cannot probe for other sessions' jobs.

import type { AudioRuntimeClient, AudioSpeakSegment } from "../../../../core/audio/AudioRuntimeClient.js";

/** Bounds (docs/releases/v2/v2.14/development/gates.md). */
export const VOICE_JOB_MAX_BUFFERED_BYTES = 64 * 1024 * 1024;
export const VOICE_JOB_MAX_SEGMENTS = 200;
/** Remembered ids, so a reused id is rejected even after the job is evicted. */
const MAX_REMEMBERED_IDS = 4096;
/** Finished jobs stay drainable this long, then are evicted. */
const FINISHED_TTL_MS = 5 * 60_000;

export type VoiceJobState = "running" | "completed" | "cancelled" | "error";

export interface VoiceDrainSegment {
  readonly seq: number;
  readonly audioBase64: string;
  readonly mimeType: string;
}

export interface VoiceDrainResult {
  readonly state: VoiceJobState | "unknown";
  readonly segments: readonly VoiceDrainSegment[];
  readonly error?: string;
}

export class VoiceJobError extends Error {}

class VoiceJob {
  state: VoiceJobState = "running";
  error: string | undefined;
  finishedAt: number | undefined;
  private readonly buffer: VoiceDrainSegment[] = [];
  private bufferedBytes = 0;
  private nextSeq = 0;
  private sentenceIndex = 0;
  private readonly queue: string[] = [];
  private replyEnded = false;
  private pumping = false;
  private activeRuntimeJob: string | null = null;

  constructor(
    readonly id: string,
    readonly sessionId: string,
    private readonly audio: () => AudioRuntimeClient,
    private readonly now: () => number,
  ) {}

  /** Queue one complete speakable sentence. Ignored once the job ended. */
  pushSentence(sentence: string): void {
    if (this.state !== "running" || this.replyEnded || !sentence.trim()) return;
    this.queue.push(sentence);
    void this.pump();
  }

  /** The reply stream ended normally: finish after the queued sentences. */
  endReply(): void {
    if (this.state !== "running") return;
    this.replyEnded = true;
    void this.pump();
  }

  /** The reply failed: end with a terminal error and speak nothing more. */
  fail(message: string): void {
    this.finish("error", message);
    this.stopRuntime();
  }

  cancel(): void {
    if (this.state !== "running") return;
    this.finish("cancelled");
    this.stopRuntime();
  }

  drain(afterSeq: number): VoiceDrainResult {
    // The webview acknowledges everything up to afterSeq: release it.
    while (this.buffer.length > 0 && this.buffer[0]!.seq <= afterSeq) {
      this.bufferedBytes -= this.buffer.shift()!.audioBase64.length;
    }
    return {
      state: this.state,
      segments: this.buffer.slice(),
      ...(this.error ? { error: this.error } : {}),
    };
  }

  private finish(state: Exclude<VoiceJobState, "running">, error?: string): void {
    if (this.state !== "running") return;
    this.state = state;
    this.error = error;
    this.finishedAt = this.now();
    this.queue.length = 0;
  }

  private stopRuntime(): void {
    const runtimeJob = this.activeRuntimeJob;
    if (runtimeJob) void this.audio().cancelSpeak(runtimeJob);
  }

  private onSegment(segment: AudioSpeakSegment): void {
    if (this.state !== "running") return;
    // The bound is on undrained segments: a long reply the webview keeps
    // draining may produce more than this many in total.
    if (this.buffer.length >= VOICE_JOB_MAX_SEGMENTS) {
      this.fail("voice job exceeded its segment bound");
      return;
    }
    if (this.bufferedBytes + segment.audioBase64.length > VOICE_JOB_MAX_BUFFERED_BYTES) {
      this.fail("voice job exceeded its buffer bound");
      return;
    }
    this.buffer.push({ seq: this.nextSeq++, audioBase64: segment.audioBase64, mimeType: segment.mimeType });
    this.bufferedBytes += segment.audioBase64.length;
  }

  private async pump(): Promise<void> {
    if (this.pumping) return;
    this.pumping = true;
    try {
      while (this.state === "running") {
        const sentence = this.queue.shift();
        if (sentence === undefined) {
          if (this.replyEnded) this.finish("completed");
          return;
        }
        const runtimeJob = `${this.id}:${this.sentenceIndex++}`;
        this.activeRuntimeJob = runtimeJob;
        try {
          await this.audio().speakStream({ jobId: runtimeJob, text: sentence }, (s) => this.onSegment(s));
        } catch (err) {
          this.fail(err instanceof Error ? err.message : String(err));
          return;
        } finally {
          this.activeRuntimeJob = null;
        }
      }
    } finally {
      this.pumping = false;
    }
  }
}

export class VoiceJobRegistry {
  private readonly jobs = new Map<string, VoiceJob>();
  private readonly usedIds = new Set<string>();

  constructor(
    private readonly audio: () => AudioRuntimeClient,
    private readonly now: () => number = () => Date.now(),
  ) {}

  /** Open a job bound to `sessionId`. Rejects a reused id. */
  open(sessionId: string, jobId: string): VoiceJob {
    this.evictFinished();
    if (this.usedIds.has(jobId)) throw new VoiceJobError("voice jobId was already used");
    this.remember(jobId);
    const job = new VoiceJob(jobId, sessionId, this.audio, this.now);
    this.jobs.set(jobId, job);
    return job;
  }

  drain(sessionId: string, jobId: string, afterSeq: number): VoiceDrainResult {
    this.evictFinished();
    const job = this.owned(sessionId, jobId);
    return job ? job.drain(afterSeq) : { state: "unknown", segments: [] };
  }

  /** Cancel a job owned by `sessionId`. Unknown and foreign ids are a no-op. */
  cancel(sessionId: string, jobId: string): void {
    this.owned(sessionId, jobId)?.cancel();
  }

  /** Test surface: live (not yet evicted) jobs. */
  size(): number {
    return this.jobs.size;
  }

  private owned(sessionId: string, jobId: string): VoiceJob | undefined {
    const job = this.jobs.get(jobId);
    return job && job.sessionId === sessionId ? job : undefined;
  }

  private remember(jobId: string): void {
    this.usedIds.add(jobId);
    if (this.usedIds.size > MAX_REMEMBERED_IDS) {
      const oldest = this.usedIds.values().next().value;
      if (oldest !== undefined) this.usedIds.delete(oldest);
    }
  }

  private evictFinished(): void {
    const cutoff = this.now() - FINISHED_TTL_MS;
    for (const [id, job] of this.jobs) {
      if (job.finishedAt !== undefined && job.finishedAt < cutoff) this.jobs.delete(id);
    }
  }
}

export type { VoiceJob };
