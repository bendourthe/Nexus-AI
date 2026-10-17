/**
 * v2.14.0 T009 -- segment playback for spoken replies, and the voice loop's
 * streamed-reply events.
 */

import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { AudioClient, SpokenDrainResult } from "../src/modules/chat/audioClient";
import { SpokenReplyController, useSpokenReply } from "../src/modules/chat/useSpokenReply";
import {
  INITIAL_VOICE_LOOP,
  reduceVoiceLoop,
  type VoiceLoopEvent,
  type VoiceLoopState,
} from "../src/modules/chat/voiceLoop";

const seg = (seq: number) => ({ seq, audioBase64: `A${seq}`, mimeType: "audio/wav" });

/** A drain script: each call returns the next scripted result (last repeats). */
function scriptedAudio(script: SpokenDrainResult[]) {
  const drains: number[] = [];
  const cancels: string[] = [];
  let i = 0;
  const client: AudioClient = {
    transcribe: async () => ({ transcript: "", origin: "stt_transcript" as const }),
    speak: async () => ({ audioBase64: "", mimeType: "audio/wav" }),
    health: async () => ({ sttInstalled: true, ttsInstalled: true, sttReason: "", ttsReason: "" }),
    async speakDrain(_s, _j, afterSeq) {
      drains.push(afterSeq);
      const r = script[Math.min(i++, script.length - 1)]!;
      return { ...r, segments: r.segments.filter((s) => s.seq > afterSeq) };
    },
    async speakCancel(_s, jobId) {
      cancels.push(jobId);
    },
  };
  return { client, drains, cancels };
}

function harness(script: SpokenDrainResult[], play?: (url: string, signal: AbortSignal) => Promise<void>) {
  const audio = scriptedAudio(script);
  const events: VoiceLoopEvent[] = [];
  const played: string[] = [];
  const abortRef = { current: null as AbortController | null };
  let id = 0;
  const controller = new SpokenReplyController({
    audioClient: audio.client,
    dispatchVoice: (e) => events.push(e),
    abortRef,
    play:
      play ??
      (async (url) => {
        played.push(url);
      }),
    pollIntervalMs: 1,
    newJobId: () => `job-${++id}`,
  });
  return { ...audio, events, played, abortRef, controller };
}

const types = (events: VoiceLoopEvent[]) => events.map((e) => e.type);

describe("SpokenReplyController", () => {
  it("plays segments in order across several drains, then ends once", async () => {
    const h = harness([
      { state: "running", segments: [] },
      { state: "running", segments: [seg(0)] },
      { state: "running", segments: [seg(0), seg(1)] },
      { state: "completed", segments: [seg(1), seg(2)] },
    ]);
    h.controller.begin("s1");
    await vi.waitFor(() => expect(types(h.events)).toContain("reply-stream-ended"));
    await vi.waitFor(() => expect(h.played).toEqual(["data:audio/wav;base64,A0", "data:audio/wav;base64,A1", "data:audio/wav;base64,A2"]));
    expect(types(h.events).filter((t) => t === "segment-queued")).toHaveLength(3);
    expect(types(h.events).filter((t) => t === "reply-stream-ended")).toHaveLength(1);
    // Each drain acknowledges what was already fetched.
    expect(h.drains).toEqual([-1, -1, 0, 1]);
  });

  it("does not let the loop go idle in a gap between sentences", async () => {
    const h = harness([
      { state: "running", segments: [seg(0)] },
      { state: "running", segments: [] },
      { state: "running", segments: [] },
      { state: "completed", segments: [seg(1)] },
    ]);
    h.controller.begin("s1");
    await vi.waitFor(() => expect(h.played).toHaveLength(2));
    await vi.waitFor(() => expect(types(h.events).at(-1)).toBe("queue-drained"));
    let state: VoiceLoopState = { ...INITIAL_VOICE_LOOP, phase: "awaiting-reply" };
    const phases: string[] = [];
    for (const e of h.events) {
      state = reduceVoiceLoop(state, e);
      phases.push(state.phase);
    }
    // Speaking throughout; idle only after the stream ended and the queue drained.
    expect(phases.slice(0, -1).every((p) => p === "speaking")).toBe(true);
    expect(phases.at(-1)).toBe("idle");
  });

  it("barge-in through the abort slot stops playback and cancels synthesis", async () => {
    let release!: () => void;
    const h = harness([{ state: "running", segments: [seg(0), seg(1)] }], (_url, signal) =>
      new Promise<void>((resolve) => {
        release = resolve;
        signal.addEventListener("abort", () => resolve(), { once: true });
      }),
    );
    h.controller.begin("s1");
    await vi.waitFor(() => expect(h.abortRef.current).not.toBeNull());
    await vi.waitFor(() => expect(types(h.events)).toContain("segment-queued"));
    // ChatPage's dispatchVoice aborts this slot when barge-in leaves "speaking".
    h.abortRef.current!.abort();
    release?.();
    await vi.waitFor(() => expect(h.cancels).toEqual(["job-1"]));
    expect(types(h.events)).not.toContain("queue-drained");
  });

  it("a new turn cancels the previous job before starting", async () => {
    const h = harness([{ state: "running", segments: [] }]);
    expect(h.controller.begin("s1")).toBe("job-1");
    expect(h.controller.begin("s1")).toBe("job-2");
    await vi.waitFor(() => expect(h.cancels).toEqual(["job-1"]));
    h.controller.abort();
  });

  it("reports a playback error once and stops the queue", async () => {
    let calls = 0;
    const h = harness([{ state: "completed", segments: [seg(0), seg(1), seg(2)] }], async () => {
      calls += 1;
      throw new Error("tts playback failed");
    });
    h.controller.begin("s1");
    await vi.waitFor(() => expect(types(h.events)).toContain("error"));
    await new Promise((r) => setTimeout(r, 10));
    expect(types(h.events).filter((t) => t === "error")).toHaveLength(1);
    expect(calls).toBe(1);
    expect(h.cancels).toEqual(["job-1"]);
  });

  it("reports a drain error or a job error once", async () => {
    const h = harness([{ state: "error", segments: [], error: "synthesis failed" }]);
    h.controller.begin("s1");
    await vi.waitFor(() => expect(h.events).toContainEqual({ type: "error", message: "synthesis failed" }));
    await new Promise((r) => setTimeout(r, 10));
    expect(types(h.events).filter((t) => t === "error")).toHaveLength(1);
  });

  it("ends a job the sidecar never saw once the turn returns", async () => {
    const h = harness([{ state: "unknown", segments: [] }]);
    h.controller.begin("s1");
    await new Promise((r) => setTimeout(r, 10));
    expect(types(h.events)).not.toContain("reply-stream-ended");
    h.controller.replyFinished();
    await vi.waitFor(() => expect(types(h.events)).toContain("reply-stream-ended"));
  });
});

describe("useSpokenReply", () => {
  it("cancels the active job on unmount", async () => {
    const audio = scriptedAudio([{ state: "running", segments: [] }]);
    const abortRef = { current: null as AbortController | null };
    let controller: SpokenReplyController | null = null;
    function Probe() {
      controller = useSpokenReply({
        audioClient: audio.client,
        dispatchVoice: () => undefined,
        abortRef,
        pollIntervalMs: 1,
        newJobId: () => "j-unmount",
      });
      return null;
    }
    const view = render(<Probe />);
    controller!.begin("s1");
    view.unmount();
    await vi.waitFor(() => expect(audio.cancels).toEqual(["j-unmount"]));
  });
});

describe("voice loop streamed-reply events", () => {
  const run = (from: VoiceLoopState, events: VoiceLoopEvent["type"][]) =>
    events.reduce((s, type) => reduceVoiceLoop(s, { type } as VoiceLoopEvent), from);
  const awaiting: VoiceLoopState = { ...INITIAL_VOICE_LOOP, phase: "awaiting-reply" };

  it("starts speaking on the first segment, even before the reply returns", () => {
    expect(run(awaiting, ["segment-queued"]).phase).toBe("speaking");
    expect(run(INITIAL_VOICE_LOOP, ["segment-queued"]).phase).toBe("speaking");
  });

  it("returns to idle only when the stream ended and the queue drained, in either order", () => {
    expect(run(awaiting, ["segment-queued", "queue-drained"]).phase).toBe("speaking");
    expect(run(awaiting, ["segment-queued", "reply-stream-ended"]).phase).toBe("speaking");
    expect(run(awaiting, ["segment-queued", "queue-drained", "reply-stream-ended"]).phase).toBe("idle");
    expect(run(awaiting, ["segment-queued", "reply-stream-ended", "queue-drained"]).phase).toBe("idle");
    expect(run(awaiting, ["segment-queued", "queue-drained", "segment-queued", "reply-stream-ended"]).phase).toBe(
      "speaking",
    );
  });

  it("accepts barge-in once speech has started while the reply is still awaited", () => {
    const speaking = run(awaiting, ["segment-queued"]);
    expect(reduceVoiceLoop(speaking, { type: "barge-in" }).phase).toBe("recording");
    expect(reduceVoiceLoop(speaking, { type: "speech-start" }).phase).toBe("recording");
    // Before speech starts there is nothing to interrupt.
    expect(reduceVoiceLoop(awaiting, { type: "barge-in" }).phase).toBe("awaiting-reply");
  });

  it("ends the wait when a reply produced nothing to speak", () => {
    expect(run(awaiting, ["reply-stream-ended"]).phase).toBe("idle");
  });

  it("ignores late segments after barge-in", () => {
    const recording = reduceVoiceLoop(run(awaiting, ["segment-queued"]), { type: "barge-in" });
    expect(reduceVoiceLoop(recording, { type: "segment-queued" }).phase).toBe("recording");
  });
});
