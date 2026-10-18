/**
 * v2.14.0 T008 -- spoken replies synthesized from the sidecar's reply stream.
 *
 * A scripted LLM streams the reply and a scripted audio runtime records every
 * text it is asked to synthesize, so these tests prove what reaches speech
 * synthesis (never reasoning or secrets), in what order, and how errors,
 * cancels and ownership behave.
 */

import { randomUUID } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import type {
  AudioRuntimeClient,
  AudioSpeakSegment,
  AudioSpeakStreamResult,
} from "../../core/audio/AudioRuntimeClient";
import type { LLMClient } from "../../modules/coding/llm/types";
import { createChatMessageHandler } from "../sidecar/src/chat/chatMessageHandler";
import { VoiceJobRegistry } from "../sidecar/src/chat/voiceJobs";
import { requireModel } from "../sidecar/src/coding/models";
import { createHandlerContext, dispatch } from "../sidecar/src/handlers";
import { ChatSessionSendMessageRequest } from "../sidecar/src/protocol";

/** A scripted runtime: one segment per text, optionally held until released. */
class ScriptedAudio implements AudioRuntimeClient {
  readonly spoken: string[] = [];
  readonly cancelled: string[] = [];
  hold: Promise<void> | null = null;
  failOn: string | null = null;
  async health() {
    return { ok: true, stt: { available: true, reason: "x" }, tts: { available: true, reason: "x" }, platform: "x" };
  }
  async transcribe() {
    return { transcript: "", origin: "stt_transcript" as const };
  }
  async speak() {
    return { audioBase64: "AA==", mimeType: "audio/wav" };
  }
  async speakStream(
    input: { jobId: string; text: string },
    onSegment: (s: AudioSpeakSegment) => void,
  ): Promise<AudioSpeakStreamResult> {
    this.spoken.push(input.text);
    if (this.failOn && input.text.includes(this.failOn)) throw new Error("synthesis failed");
    if (this.hold) await this.hold;
    if (this.cancelled.includes(input.jobId)) return { status: "cancelled", segments: 0 };
    onSegment({ seq: 0, audioBase64: Buffer.from(input.text).toString("base64"), mimeType: "audio/wav" });
    return { status: "completed", segments: 1 };
  }
  async cancelSpeak(jobId: string) {
    this.cancelled.push(jobId);
  }
  async shutdown() {}
}

function scriptedLlm(tokens: string[], opts: { failAfter?: number; thinking?: string[] } = {}): LLMClient {
  return {
    async checkHealth() {
      return true;
    },
    async listModels() {
      return [];
    },
    async *streamChat() {
      for (const t of opts.thinking ?? []) yield { message: { role: "assistant", content: "", thinking: t }, done: false };
      let n = 0;
      for (const t of tokens) {
        if (opts.failAfter !== undefined && n++ >= opts.failAfter) throw new Error("model crashed");
        yield { message: { role: "assistant", content: t }, done: false };
      }
      yield { message: { role: "assistant", content: "" }, done: true };
    },
  };
}

async function runVoiceTurn(tokens: string[], audio: ScriptedAudio, opts: Parameters<typeof scriptedLlm>[1] = {}) {
  const registry = new VoiceJobRegistry(() => audio);
  const job = registry.open("s1", randomUUID());
  const runner = createChatMessageHandler({ llm: scriptedLlm(tokens, opts) });
  const events = await runner({
    sessionId: "s1",
    model: requireModel("gemma4:e4b"),
    messages: [{ role: "user", content: "hi" }],
    voice: job,
  });
  await vi.waitFor(() => expect(registry.drain("s1", job.id, -1).state).not.toBe("running"));
  return { events, job, registry };
}

const decode = (segs: readonly { audioBase64: string }[]) =>
  segs.map((s) => Buffer.from(s.audioBase64, "base64").toString());

describe("voice turns in the chat handler", () => {
  it("synthesizes each complete sentence in order and drains them by seq", async () => {
    const audio = new ScriptedAudio();
    const { job, registry } = await runVoiceTurn(["An interface ", "describes a shape. It lists ", "fields. Done"], audio);
    expect(audio.spoken).toEqual(["An interface describes a shape.", "It lists fields.", "Done"]);
    const drained = registry.drain("s1", job.id, -1);
    expect(drained.state).toBe("completed");
    expect(drained.segments.map((s) => s.seq)).toEqual([0, 1, 2]);
    expect(decode(drained.segments)).toEqual(audio.spoken);
    // Acknowledged segments are released.
    expect(registry.drain("s1", job.id, 1).segments.map((s) => s.seq)).toEqual([2]);
  });

  it("starts synthesis before the reply finishes", async () => {
    const audio = new ScriptedAudio();
    let firstSpokenBeforeEnd = false;
    const llm: LLMClient = {
      async checkHealth() {
        return true;
      },
      async listModels() {
        return [];
      },
      async *streamChat() {
        yield { message: { role: "assistant", content: "First sentence. " }, done: false };
        await new Promise((r) => setTimeout(r, 20));
        firstSpokenBeforeEnd = audio.spoken.length === 1;
        yield { message: { role: "assistant", content: "Second." }, done: false };
        yield { message: { role: "assistant", content: "" }, done: true };
      },
    };
    const registry = new VoiceJobRegistry(() => audio);
    const job = registry.open("s1", randomUUID());
    await createChatMessageHandler({ llm })({
      sessionId: "s1",
      model: requireModel("gemma4:e4b"),
      messages: [{ role: "user", content: "hi" }],
      voice: job,
    });
    expect(firstSpokenBeforeEnd).toBe(true);
  });

  it("never sends reasoning, secrets, code or URLs to synthesis", async () => {
    const audio = new ScriptedAudio();
    // nexus-check-allow-next-line: no-secret-patterns -- fake fixture for redaction tests
    const key = "AKIAABCDEFGHIJKLMNOP";
    await runVoiceTurn(
      [
        "<think>hidden plan</think>Your key AKIAABCD",
        "EFGHIJKLMNOP. leaked. Example:\n```ts\nconst secret = 1;\n```\n",
        "See [the docs](https://example.com/a). Bye.",
      ],
      audio,
      { thinking: ["ollama reasoning field"] },
    );
    const all = audio.spoken.join(" ");
    expect(all).not.toMatch(/hidden plan|ollama reasoning|const secret|example\.com|https?:/);
    expect(all).not.toContain(key.slice(0, 10));
    expect(all).toContain("<redacted>");
    expect(all).toContain("Code is on screen.");
    expect(all).toContain("the docs");
  });

  it("asks the model to skip reasoning only on voice turns", async () => {
    const requests: Array<Record<string, unknown>> = [];
    const llm: LLMClient = {
      async checkHealth() {
        return true;
      },
      async listModels() {
        return [];
      },
      async *streamChat(request) {
        requests.push(request as unknown as Record<string, unknown>);
        yield { message: { role: "assistant", content: "Hi." }, done: false };
        yield { message: { role: "assistant", content: "" }, done: true };
      },
    };
    const registry = new VoiceJobRegistry(() => new ScriptedAudio());
    const runner = createChatMessageHandler({ llm });
    const base = { sessionId: "s1", model: requireModel("gemma4:e4b"), messages: [{ role: "user" as const, content: "hi" }] };
    await runner({ ...base, voice: registry.open("s1", randomUUID()) });
    await runner(base);
    expect(requests[0]).toMatchObject({ think: false });
    expect(requests[1]).not.toHaveProperty("think");
  });

  it("ends the voice job with an error when the model fails mid-reply", async () => {
    const audio = new ScriptedAudio();
    const { events, job, registry } = await runVoiceTurn(["One. ", "Two. ", "Three."], audio, { failAfter: 1 });
    expect(events.at(-1)).toMatchObject({ kind: "done" });
    const drained = registry.drain("s1", job.id, -1);
    expect(drained.state).toBe("error");
    expect(audio.spoken.join(" ")).not.toContain("Three");
  });

  it("ends the job with an error when synthesis fails", async () => {
    const audio = new ScriptedAudio();
    audio.failOn = "Two";
    const { job, registry } = await runVoiceTurn(["One. Two. Three. Four."], audio);
    expect(registry.drain("s1", job.id, -1)).toMatchObject({ state: "error", error: "synthesis failed" });
    expect(audio.spoken).not.toContain("Three.");
  });
});

describe("VoiceJobRegistry", () => {
  it("rejects a reused job id, even after the job finished", () => {
    const registry = new VoiceJobRegistry(() => new ScriptedAudio());
    const id = randomUUID();
    registry.open("s1", id).endReply();
    expect(() => registry.open("s1", id)).toThrow(/already used/);
  });

  it("answers drain and cancel identically for unknown and foreign jobs", () => {
    const audio = new ScriptedAudio();
    const registry = new VoiceJobRegistry(() => audio);
    const job = registry.open("owner", randomUUID());
    job.pushSentence("Hello there.");
    const foreign = registry.drain("intruder", job.id, -1);
    const unknown = registry.drain("intruder", randomUUID(), -1);
    expect(foreign).toEqual(unknown);
    expect(foreign).toEqual({ state: "unknown", segments: [] });
    registry.cancel("intruder", job.id);
    expect(registry.drain("owner", job.id, -1).state).not.toBe("cancelled");
  });

  it("cancel stops synthesis and further sentences, and settles once", async () => {
    const audio = new ScriptedAudio();
    let release!: () => void;
    audio.hold = new Promise<void>((r) => (release = r));
    const registry = new VoiceJobRegistry(() => audio);
    const job = registry.open("s1", randomUUID());
    job.pushSentence("First.");
    job.pushSentence("Second.");
    await vi.waitFor(() => expect(audio.spoken).toEqual(["First."]));
    registry.cancel("s1", job.id);
    registry.cancel("s1", job.id);
    job.pushSentence("Third.");
    job.endReply();
    release();
    await new Promise((r) => setTimeout(r, 10));
    expect(audio.cancelled).toEqual([`${job.id}:0`]);
    expect(audio.spoken).toEqual(["First."]);
    expect(registry.drain("s1", job.id, -1).state).toBe("cancelled");
  });

  // v2.14.0 Phase 5 deep pass (adversarial finding 4).
  it("bounds undrained segments, not the total of a long reply", async () => {
    const audio = new ScriptedAudio();
    const registry = new VoiceJobRegistry(() => audio);
    const job = registry.open("s1", randomUUID());
    let acked = -1;
    for (let i = 0; i < 250; i++) {
      job.pushSentence(`Sentence ${i}.`);
      await vi.waitFor(() => expect(audio.spoken).toHaveLength(i + 1));
      acked = registry.drain("s1", job.id, acked).segments.at(-1)?.seq ?? acked;
    }
    job.endReply();
    await vi.waitFor(() => expect(registry.drain("s1", job.id, acked).state).toBe("completed"));

    const stalled = new VoiceJobRegistry(() => new ScriptedAudio());
    const undrained = stalled.open("s1", randomUUID());
    for (let i = 0; i < 201; i++) undrained.pushSentence(`Sentence ${i}.`);
    undrained.endReply();
    await vi.waitFor(() => expect(stalled.drain("s1", undrained.id, -1).state).not.toBe("running"));
    expect(stalled.drain("s1", undrained.id, -1)).toMatchObject({ state: "error", error: expect.stringMatching(/segment bound/) });
  });

  it("evicts finished jobs after their drain window", () => {
    let now = 0;
    const registry = new VoiceJobRegistry(() => new ScriptedAudio(), () => now);
    const job = registry.open("s1", randomUUID());
    job.cancel();
    now += 6 * 60_000;
    expect(registry.drain("s1", job.id, -1)).toEqual({ state: "unknown", segments: [] });
    expect(registry.size()).toBe(0);
  });
});

describe("voice IPC validation", () => {
  it("accepts only a UUID job id and rejects unknown voice fields", () => {
    const base = { sessionId: "s1", message: "hi" };
    expect(ChatSessionSendMessageRequest.safeParse({ ...base, voice: { jobId: randomUUID() } }).success).toBe(true);
    expect(ChatSessionSendMessageRequest.safeParse({ ...base, voice: { jobId: "1234" } }).success).toBe(false);
    expect(
      ChatSessionSendMessageRequest.safeParse({ ...base, voice: { jobId: randomUUID(), extra: 1 } }).success,
    ).toBe(false);
  });

  it("drain and cancel answer through the handlers; a reused id fails the send", async () => {
    const audio = new ScriptedAudio();
    const ctx = createHandlerContext({ pid: 1, platform: process.platform });
    ctx.audio = audio;
    const { sessionId } = (await dispatch("chat.session.start", { modelId: "gemma4:e4b" }, ctx)) as { sessionId: string };
    const jobId = randomUUID();
    await dispatch("chat.session.sendMessage", { sessionId, message: "Hello there.", voice: { jobId } }, ctx);
    await vi.waitFor(async () => {
      const d = (await dispatch("audio.speakDrain", { sessionId, jobId, afterSeq: -1 }, ctx)) as { state: string };
      expect(d.state).toBe("completed");
    });
    expect(await dispatch("audio.speakCancel", { sessionId, jobId }, ctx)).toEqual({ ok: true });
    expect(await dispatch("audio.speakCancel", { sessionId, jobId: randomUUID() }, ctx)).toEqual({ ok: true });
    await expect(
      dispatch("chat.session.sendMessage", { sessionId, message: "Again.", voice: { jobId } }, ctx),
    ).rejects.toThrow(/already used/);
    await expect(dispatch("audio.speakDrain", { sessionId, jobId: "bad", afterSeq: -1 }, ctx)).rejects.toThrow();
  });

  // v2.14.0 Phase 5 deep pass (adversarial finding 5).
  it("ends the voice job when the turn is rejected before it runs", async () => {
    const ctx = createHandlerContext({ pid: 1, platform: process.platform });
    ctx.audio = new ScriptedAudio();
    const { sessionId } = (await dispatch("chat.session.start", { modelId: "gemma4:e4b" }, ctx)) as { sessionId: string };
    ctx.studio = {
      scheduler: {
        enqueue: async () => {
          throw new Error("scheduler stopped");
        },
      },
    } as unknown as NonNullable<typeof ctx.studio>;
    const jobId = randomUUID();
    await expect(
      dispatch("chat.session.sendMessage", { sessionId, message: "Hello there.", voice: { jobId } }, ctx),
    ).rejects.toThrow(/scheduler stopped/);
    expect(await dispatch("audio.speakDrain", { sessionId, jobId, afterSeq: -1 }, ctx)).toMatchObject({
      state: "error",
      error: "scheduler stopped",
    });
  });

  it("caps one-shot synthesis text at 8,000 characters", async () => {
    const ctx = createHandlerContext({ pid: 1, platform: process.platform });
    ctx.audio = new ScriptedAudio();
    await expect(dispatch("audio.speak", { text: "a".repeat(8001) }, ctx)).rejects.toThrow();
    await expect(dispatch("audio.speak", { text: "a".repeat(8000) }, ctx)).resolves.toBeTruthy();
  });
});
