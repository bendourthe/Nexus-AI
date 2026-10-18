/**
 * v2.0.0 Phase 1 -- Chat voice-loop state machine (Airi A1).
 *
 * Pure reducer: no DOM, no MediaRecorder, no TTS. ChatPage drives capture,
 * STT, and playback from these states. Capture indicator is visible whenever
 * the mic is open (PTT or VAD). Barge-in stops TTS when the user starts
 * speaking.
 *
 * v2.14.0 T009 -- a reply is spoken as its segments arrive. `segment-queued`
 * starts speaking, also while the reply is still being awaited, so barge-in
 * works as soon as speech starts. `queue-drained` and `reply-stream-ended`
 * record the two halves of "done": the loop returns to idle only when the
 * reply stream has ended AND the playback queue is empty, never in the gap
 * between two sentences.
 */

export type VoiceCaptureMode = "ptt" | "vad";

export type VoiceLoopPhase =
  | "idle"
  | "recording"
  | "transcribing"
  | "awaiting-reply"
  | "speaking"
  | "interrupted";

export interface VoiceLoopState {
  readonly phase: VoiceLoopPhase;
  readonly mode: VoiceCaptureMode;
  readonly captureVisible: boolean;
  readonly lastError: string | null;
  /** v2.14.0: no more segments will arrive for the current reply. */
  readonly replyStreamEnded: boolean;
  /** v2.14.0: every queued segment has finished playing. */
  readonly queueDrained: boolean;
}

export type VoiceLoopEvent =
  | { readonly type: "set-mode"; readonly mode: VoiceCaptureMode }
  | { readonly type: "ptt-down" }
  | { readonly type: "ptt-up" }
  | { readonly type: "vad-start" }
  | { readonly type: "vad-stop" }
  | { readonly type: "speech-start" }
  | { readonly type: "silence" }
  | { readonly type: "transcript-ready" }
  | { readonly type: "reply-ready" }
  | { readonly type: "tts-started" }
  | { readonly type: "tts-ended" }
  | { readonly type: "barge-in" }
  | { readonly type: "segment-queued" }
  | { readonly type: "queue-drained" }
  | { readonly type: "reply-stream-ended" }
  | { readonly type: "error"; readonly message: string }
  | { readonly type: "reset" };

export const INITIAL_VOICE_LOOP: VoiceLoopState = {
  phase: "idle",
  mode: "ptt",
  captureVisible: false,
  lastError: null,
  replyStreamEnded: false,
  queueDrained: true,
};

function withCapture(state: VoiceLoopState, phase: VoiceLoopPhase, visible: boolean): VoiceLoopState {
  return { ...state, phase, captureVisible: visible, lastError: null };
}

export function reduceVoiceLoop(state: VoiceLoopState, event: VoiceLoopEvent): VoiceLoopState {
  switch (event.type) {
    case "set-mode":
      if (state.phase !== "idle" && state.phase !== "interrupted") return state;
      return { ...state, mode: event.mode, lastError: null };
    case "ptt-down":
      if (state.mode !== "ptt") return state;
      if (state.phase === "speaking") {
        return withCapture({ ...state, mode: "ptt" }, "recording", true);
      }
      if (state.phase === "idle" || state.phase === "interrupted") {
        return withCapture(state, "recording", true);
      }
      return state;
    case "ptt-up":
      if (state.mode !== "ptt" || state.phase !== "recording") return state;
      return withCapture(state, "transcribing", false);
    case "vad-start":
      if (state.mode !== "vad") return state;
      if (state.phase === "idle" || state.phase === "interrupted" || state.phase === "speaking") {
        return withCapture(state, "recording", true);
      }
      return state;
    case "vad-stop":
    case "silence":
      if (state.mode !== "vad" || state.phase !== "recording") return state;
      return withCapture(state, "transcribing", false);
    case "speech-start":
      if (state.phase === "speaking") {
        return withCapture(state, "recording", true);
      }
      return state;
    case "transcript-ready":
      if (state.phase !== "transcribing") return state;
      return withCapture(state, "awaiting-reply", false);
    case "reply-ready":
      if (state.phase !== "awaiting-reply") return state;
      return withCapture(state, "speaking", false);
    case "tts-started":
      if (state.phase !== "speaking" && state.phase !== "awaiting-reply") return state;
      return withCapture(state, "speaking", false);
    case "tts-ended":
      if (state.phase !== "speaking") return state;
      return withCapture(state, "idle", false);
    case "barge-in":
      if (state.phase !== "speaking") return state;
      return withCapture(state, "recording", true);
    case "segment-queued":
      // A typed turn can start speaking from idle; a voice turn from awaiting-reply.
      if (state.phase !== "idle" && state.phase !== "awaiting-reply" && state.phase !== "speaking") return state;
      return {
        ...withCapture(state, "speaking", false),
        queueDrained: false,
        replyStreamEnded: state.phase === "speaking" ? state.replyStreamEnded : false,
      };
    case "queue-drained":
      if (state.phase !== "speaking") return state;
      if (state.replyStreamEnded) return { ...withCapture(state, "idle", false), queueDrained: true, replyStreamEnded: false };
      return { ...state, queueDrained: true };
    case "reply-stream-ended":
      if (state.phase === "speaking" && state.queueDrained) {
        return { ...withCapture(state, "idle", false), replyStreamEnded: false };
      }
      if (state.phase === "speaking") return { ...state, replyStreamEnded: true };
      // Nothing was spoken (an empty or reasoning-only reply): stop waiting.
      if (state.phase === "awaiting-reply") return withCapture(state, "idle", false);
      return state;
    case "error":
      return { ...state, phase: "idle", captureVisible: false, lastError: event.message };
    case "reset":
      return { ...INITIAL_VOICE_LOOP, mode: state.mode };
    default:
      return state;
  }
}

/** Mic is open: the capture indicator must be visible. */
export function isMicOpen(state: VoiceLoopState): boolean {
  return state.captureVisible && state.phase === "recording";
}

/** Barge-in should abort in-flight TTS. */
export function shouldStopTts(prev: VoiceLoopState, next: VoiceLoopState): boolean {
  return prev.phase === "speaking" && next.phase !== "speaking";
}
