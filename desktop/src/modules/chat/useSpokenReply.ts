/**
 * v2.14.0 T009 -- play a reply's segments as the sidecar synthesizes them.
 *
 * A voice turn sends `voice: { jobId }` with the chat message; the sidecar
 * speaks the reply sentence by sentence while the model is still writing. This
 * controller owns that job: it polls `audio.speakDrain` (the same drain
 * pattern diffusion and OCR jobs use), plays segments in order, and feeds the
 * voice loop `segment-queued`, `queue-drained` and `reply-stream-ended` so the
 * loop never goes idle between sentences. Aborting (barge-in, a new turn,
 * unmount) stops playback and calls `audio.speakCancel`, so synthesis stops
 * too. Barge-in stops speech only; the model's generation continues.
 */

import { useCallback, useEffect, useRef, type MutableRefObject } from "react";

import type { AudioClient, SpokenSegment } from "./audioClient";
import type { VoiceLoopEvent } from "./voiceLoop";

/**
 * Drain poll interval. 100 ms keeps the added wait per segment well under the
 * 300 ms gap gate while costing one IPC round trip per tick; the measured
 * value is recorded in the v2.14.0 Phase 2 evidence.
 */
export const SPOKEN_REPLY_POLL_MS = 100;

export type PlayAudio = (url: string, signal: AbortSignal) => Promise<void>;

export interface SpokenReplyOptions {
  readonly audioClient: AudioClient;
  readonly dispatchVoice: (event: VoiceLoopEvent) => void;
  /** ChatPage's TTS abort slot: the voice loop aborts it on barge-in. */
  readonly abortRef: MutableRefObject<AbortController | null>;
  readonly play?: PlayAudio;
  readonly pollIntervalMs?: number;
  readonly newJobId?: () => string;
  readonly sleep?: (ms: number, signal: AbortSignal) => Promise<void>;
}

export const playWithAudioElement: PlayAudio = (url, signal) =>
  new Promise<void>((resolve, reject) => {
    const audio = new Audio(url);
    const stop = () => {
      audio.pause();
      resolve();
    };
    signal.addEventListener("abort", stop, { once: true });
    audio.onended = () => resolve();
    audio.onerror = () => reject(new Error("tts playback failed"));
    void audio.play();
  });

const abortableSleep = (ms: number, signal: AbortSignal): Promise<void> =>
  new Promise((resolve) => {
    if (signal.aborted) return resolve();
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });

interface ActiveJob {
  readonly sessionId: string;
  readonly jobId: string;
  readonly controller: AbortController;
  replyDone: boolean;
}

export class SpokenReplyController {
  private active: ActiveJob | null = null;

  constructor(private readonly options: SpokenReplyOptions) {}

  /** Start a job for `sessionId`, cancelling any previous one. Returns its id. */
  begin(sessionId: string): string {
    this.abort();
    const jobId = (this.options.newJobId ?? (() => crypto.randomUUID()))();
    const controller = new AbortController();
    const job: ActiveJob = { sessionId, jobId, controller, replyDone: false };
    this.active = job;
    this.options.abortRef.current = controller;
    controller.signal.addEventListener(
      "abort",
      () => {
        void this.options.audioClient.speakCancel(sessionId, jobId).catch(() => undefined);
      },
      { once: true },
    );
    void this.run(job);
    return jobId;
  }

  /** The chat turn returned: a job the sidecar never saw is over. */
  replyFinished(): void {
    if (this.active) this.active.replyDone = true;
  }

  abort(): void {
    const job = this.active;
    this.active = null;
    if (!job) return;
    if (this.options.abortRef.current === job.controller) this.options.abortRef.current = null;
    job.controller.abort();
  }

  private async run(job: ActiveJob): Promise<void> {
    const { audioClient, dispatchVoice } = this.options;
    const signal = job.controller.signal;
    const queue: SpokenSegment[] = [];
    let afterSeq = -1;
    let failed = false;
    let firstPlayback = true;
    let playing: Promise<void> | null = null;
    const fail = (message: string) => {
      if (failed || signal.aborted) return;
      failed = true;
      dispatchVoice({ type: "error", message });
      if (this.active === job) this.abort();
    };
    const playQueue = async () => {
      while (queue.length > 0 && !signal.aborted) {
        const segment = queue.shift()!;
        if (firstPlayback) {
          firstPlayback = false;
          // v2.14.0 T001 anchor: time to first audio in the packaged app.
          performance.mark("nexus:voice:first-playback");
        }
        try {
          await (this.options.play ?? playWithAudioElement)(
            `data:${segment.mimeType};base64,${segment.audioBase64}`,
            signal,
          );
        } catch (err) {
          fail(err instanceof Error ? err.message : String(err));
          return;
        }
      }
      if (!signal.aborted) dispatchVoice({ type: "queue-drained" });
    };
    const kick = () => {
      if (!playing) {
        playing = playQueue().finally(() => {
          playing = null;
          if (queue.length > 0 && !signal.aborted && !failed) kick();
        });
      }
    };

    while (!signal.aborted && !failed) {
      let drained;
      try {
        drained = await audioClient.speakDrain(job.sessionId, job.jobId, afterSeq);
      } catch (err) {
        fail(err instanceof Error ? err.message : String(err));
        return;
      }
      if (signal.aborted) return;
      for (const segment of drained.segments) {
        if (segment.seq <= afterSeq) continue;
        afterSeq = segment.seq;
        queue.push(segment);
        dispatchVoice({ type: "segment-queued" });
      }
      if (queue.length > 0) kick();
      if (drained.state === "error") {
        fail(drained.error ?? "voice reply failed");
        return;
      }
      const ended =
        drained.state === "completed" ||
        drained.state === "cancelled" ||
        (drained.state === "unknown" && job.replyDone);
      if (ended) {
        dispatchVoice({ type: "reply-stream-ended" });
        return;
      }
      await (this.options.sleep ?? abortableSleep)(this.options.pollIntervalMs ?? SPOKEN_REPLY_POLL_MS, signal);
    }
  }
}

/** React wrapper: one controller per page, cancelled on unmount. */
export function useSpokenReply(options: SpokenReplyOptions): SpokenReplyController {
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const controllerRef = useRef<SpokenReplyController | null>(null);
  const get = useCallback((): SpokenReplyController => {
    if (!controllerRef.current) {
      // Read options lazily so the latest play/dispatch are always used.
      controllerRef.current = new SpokenReplyController({
        get audioClient() {
          return optionsRef.current.audioClient;
        },
        get dispatchVoice() {
          return optionsRef.current.dispatchVoice;
        },
        get abortRef() {
          return optionsRef.current.abortRef;
        },
        get play() {
          return optionsRef.current.play;
        },
        get pollIntervalMs() {
          return optionsRef.current.pollIntervalMs;
        },
        get newJobId() {
          return optionsRef.current.newJobId;
        },
        get sleep() {
          return optionsRef.current.sleep;
        },
      });
    }
    return controllerRef.current;
  }, []);
  useEffect(() => () => controllerRef.current?.abort(), []);
  return get();
}
