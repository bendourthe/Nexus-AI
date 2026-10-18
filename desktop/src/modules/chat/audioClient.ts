/**
 * v2.0.0 Phase 1 -- renderer client for local STT / TTS.
 *
 * Wraps sidecar `audio.*` IPC. Tests inject `createInMemoryAudioClient`.
 */

import { ipcCall } from "../../lib/ipc";
import { STT_TRANSCRIPT_ORIGIN } from "./transcriptProvenance";

export interface AudioTranscribeResult {
  readonly transcript: string;
  readonly origin: typeof STT_TRANSCRIPT_ORIGIN;
}

export interface AudioSpeakResult {
  readonly audioBase64: string;
  readonly mimeType: string;
}

export interface AudioHealthResult {
  readonly sttInstalled: boolean;
  readonly ttsInstalled: boolean;
  readonly sttReason: string;
  readonly ttsReason: string;
}

/** v2.14.0 T009 -- one ready segment of a reply spoken by the sidecar. */
export interface SpokenSegment {
  readonly seq: number;
  readonly audioBase64: string;
  readonly mimeType: string;
}

export type SpokenJobState = "unknown" | "running" | "completed" | "cancelled" | "error";

export interface SpokenDrainResult {
  readonly state: SpokenJobState;
  readonly segments: readonly SpokenSegment[];
  readonly error?: string;
}

export interface AudioClient {
  transcribe(audioBase64: string, mimeType?: string): Promise<AudioTranscribeResult>;
  speak(text: string): Promise<AudioSpeakResult>;
  health(): Promise<AudioHealthResult>;
  /** Segments after `afterSeq` (-1 for all) and the job's state. */
  speakDrain(sessionId: string, jobId: string, afterSeq: number): Promise<SpokenDrainResult>;
  /** Stop the sidecar's synthesis for this job. */
  speakCancel(sessionId: string, jobId: string): Promise<void>;
}

export function createIpcAudioClient(): AudioClient {
  return {
    async transcribe(audioBase64, mimeType) {
      const reply = await ipcCall<AudioTranscribeResult>("audio.transcribe", {
        audioBase64,
        ...(mimeType ? { mimeType } : {}),
      });
      if (!reply.ok) throw new Error(reply.message);
      return reply.value;
    },
    async speak(text) {
      const reply = await ipcCall<AudioSpeakResult>("audio.speak", { text });
      if (!reply.ok) throw new Error(reply.message);
      return reply.value;
    },
    async speakDrain(sessionId, jobId, afterSeq) {
      const reply = await ipcCall<SpokenDrainResult>("audio.speakDrain", { sessionId, jobId, afterSeq });
      if (!reply.ok) throw new Error(reply.message);
      return reply.value;
    },
    async speakCancel(sessionId, jobId) {
      await ipcCall<{ ok: true }>("audio.speakCancel", { sessionId, jobId });
    },
    async health() {
      const reply = await ipcCall<{
        stt: { available: boolean; reason: string };
        tts: { available: boolean; reason: string };
      }>("audio.health", {});
      if (!reply.ok) {
        return {
          sttInstalled: false,
          ttsInstalled: false,
          sttReason: reply.message,
          ttsReason: reply.message,
        };
      }
      return {
        sttInstalled: reply.value.stt.available,
        ttsInstalled: reply.value.tts.available,
        sttReason: reply.value.stt.reason,
        ttsReason: reply.value.tts.reason,
      };
    },
  };
}

export interface InMemoryAudioClientOptions {
  readonly transcript?: string;
  readonly speakAudioBase64?: string;
  readonly sttInstalled?: boolean;
  readonly ttsInstalled?: boolean;
  /** Segments every voice job yields (one drain), then the job completes. */
  readonly spokenSegments?: readonly string[];
}

export function createInMemoryAudioClient(opts: InMemoryAudioClientOptions = {}): AudioClient & {
  readonly transcribeCalls: string[];
  readonly speakCalls: string[];
  readonly drainCalls: Array<{ jobId: string; afterSeq: number }>;
  readonly cancelCalls: string[];
} {
  const transcribeCalls: string[] = [];
  const speakCalls: string[] = [];
  const drainCalls: Array<{ jobId: string; afterSeq: number }> = [];
  const cancelCalls: string[] = [];
  const spoken = opts.spokenSegments ?? ["UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA="];
  const sttInstalled = opts.sttInstalled ?? true;
  const ttsInstalled = opts.ttsInstalled ?? true;
  return {
    transcribeCalls,
    speakCalls,
    drainCalls,
    cancelCalls,
    async speakDrain(_sessionId, jobId, afterSeq) {
      drainCalls.push({ jobId, afterSeq });
      if (cancelCalls.includes(jobId)) return { state: "cancelled", segments: [] };
      const segments = spoken
        .map((audioBase64, seq) => ({ seq, audioBase64, mimeType: "audio/wav" }))
        .filter((s) => s.seq > afterSeq);
      return { state: "completed", segments };
    },
    async speakCancel(_sessionId, jobId) {
      cancelCalls.push(jobId);
    },
    async transcribe(audioBase64) {
      transcribeCalls.push(audioBase64);
      if (!sttInstalled) throw new Error("STT weights are not installed");
      const transcript = opts.transcript ?? `[origin:stt_transcript]\nin-memory transcript`;
      return { transcript, origin: STT_TRANSCRIPT_ORIGIN };
    },
    async speak(text) {
      speakCalls.push(text);
      if (!ttsInstalled) throw new Error("TTS weights are not installed");
      return {
        audioBase64: opts.speakAudioBase64 ?? "UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=",
        mimeType: "audio/wav",
      };
    },
    async health() {
      return {
        sttInstalled,
        ttsInstalled,
        sttReason: sttInstalled ? "in-memory" : "missing",
        ttsReason: ttsInstalled ? "in-memory" : "missing",
      };
    },
  };
}
