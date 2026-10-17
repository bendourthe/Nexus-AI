import { describe, expect, it } from "vitest";

import {
  CODE_CUE,
  TABLE_CUE,
  createReasoningSplitter,
  MAX_SPOKEN_SENTENCE_CHARS,
  createSpeakableProjector,
  speakableProjection,
  speakableSentences,
  splitSentences,
} from "../../../../core/chat/speakable.js";

/** Deterministic PRNG so failures reproduce. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function randomChunks(text: string, seed: number): string[] {
  const next = rng(seed);
  const out: string[] = [];
  let i = 0;
  while (i < text.length) {
    const n = 1 + Math.floor(next() * 12);
    out.push(text.slice(i, i + n));
    i += n;
  }
  return out;
}

function streamSentences(text: string, chunks: readonly string[]): string[] {
  const projector = createSpeakableProjector();
  const spoken: string[] = [];
  for (const chunk of chunks) spoken.push(...projector.push(chunk));
  spoken.push(...projector.end());
  return spoken;
}

const AWS = "AKIAABCDEFGHIJKLMNOP";
const GITHUB = `ghp_${"a1B2c3D4e5".repeat(4)}`;
const JWT = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dBjftJeZ4CVPmB92K27uhbUJU1p1r_wW1gFWFOEjXk";
const SECRETS = [AWS, GITHUB, JWT];

const REPLIES = [
  "A TypeScript interface describes the shape of an object. It lists property names. The compiler checks values.",
  `Your key ${AWS}. Rotate it now. The token ${GITHUB} was also pasted. And ${JWT}. Done.`,
  "Here is an example:\n```ts\ninterface User { id: number }\n```\nSee the [TypeScript handbook](https://www.typescriptlang.org/docs/) for more. That's all.",
  "Compare them:\n| a | b |\n|---|---|\n| 1 | 2 |\n\nThe left column wins. Visit https://example.com/x?y=1 later.",
  "Use e.g. a map, i.e. a dictionary. It costs 3.5 ms on average. Dr. Smith agrees! Really? Yes.",
  "Calling a tool <|tool_call>call:read_file{path:<|\"|>a.ts<|\"|>}<tool_call|> now. Then <|tool_call_start|>[read_file(path='b')]<|tool_call_end|> again. Finished.",
  "-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA\n-----END RSA PRIVATE KEY-----\nNever paste keys. Ok.",
];

describe("speakable projection", () => {
  it("speaks code and tables as cues and links by label, never by URL", () => {
    const spoken = speakableProjection(REPLIES[2]!);
    expect(spoken).toContain(CODE_CUE);
    expect(spoken).toContain("TypeScript handbook");
    expect(spoken).not.toMatch(/https?:|typescriptlang|interface User/);
    const table = speakableProjection(REPLIES[3]!);
    expect(table).toContain(TABLE_CUE);
    expect(table).not.toMatch(/\|/);
    expect(table).not.toMatch(/example\.com/);
  });

  it("redacts secrets, including across a sentence period", () => {
    for (const secret of SECRETS) expect(speakableProjection(REPLIES[1]!)).not.toContain(secret);
    expect(speakableProjection(REPLIES[6]!)).not.toMatch(/MIIEow|PRIVATE KEY/);
  });

  it("removes Gemma 4 and LFM tool-call spans", () => {
    const spoken = speakableProjection(REPLIES[5]!);
    expect(spoken).not.toMatch(/tool_call|read_file|a\.ts/);
    expect(spoken).toMatch(/Finished\./);
  });

  it("does not split on abbreviations, initials or decimals", () => {
    expect(splitSentences("Use e.g. a map. It costs 3.5 ms. Dr. Smith agrees! Ok")).toEqual([
      "Use e.g. a map.",
      "It costs 3.5 ms.",
      "Dr. Smith agrees!",
      "Ok",
    ]);
  });

  it.each(REPLIES.map((reply, i) => [i, reply] as const))(
    "streaming in random chunks speaks exactly the whole-reply projection (reply %i)",
    (_i, reply) => {
      const whole = streamSentences(reply, [reply]);
      for (let seed = 1; seed <= 200; seed++) {
        const spoken = streamSentences(reply, randomChunks(reply, seed));
        expect(spoken).toEqual(whole);
        for (const secret of SECRETS) {
          for (const s of spoken) expect(s).not.toContain(secret.slice(0, 12));
        }
      }
    },
  );

  it("emits a complete sentence before the reply ends", () => {
    const projector = createSpeakableProjector();
    expect(projector.push("First sentence here.")).toEqual([]);
    expect(projector.push(" Second")).toEqual(["First sentence here."]);
    expect(projector.end()).toEqual(["Second"]);
  });

  it("holds an unterminated fence until it closes or the stream ends", () => {
    const projector = createSpeakableProjector();
    expect(projector.push("Look:\n```ts\nconst x = 1;\n")).toEqual([]);
    expect(projector.end().join(" ")).toContain(CODE_CUE);
    expect(projector.emitted.join(" ")).not.toContain("const x");
  });

  it("never speaks a secret that arrives split across chunks", () => {
    const projector = createSpeakableProjector();
    const spoken = [
      ...projector.push("The key is AKIAABCD"),
      ...projector.push("EFGHIJKLMNOP. Next sentence. "),
      ...projector.end(),
    ];
    expect(spoken.join(" ")).not.toContain("AKIA");
    expect(spoken.join(" ")).toContain("<redacted>");
  });
  // v2.14.0 Phase 5 deep pass: adversarial findings 1 to 3.
  it("never speaks a secret wrapped in underscore emphasis", () => {
    for (const reply of [`Key _${AWS}_ here. Done.`, `Token __${GITHUB}__ now. Done.`]) {
      const spoken = speakableProjection(reply);
      expect(spoken).not.toContain(AWS);
      expect(spoken).not.toContain(GITHUB);
      expect(spoken).toContain("<redacted>");
    }
  });

  it("never speaks a secret split by a tool-call span glued inside it", () => {
    const reply = `Here ${GITHUB.slice(0, 20)}<|tool_call>x<tool_call|>${GITHUB.slice(20)} it is. Done.`;
    for (const seed of [1, 2, 3]) {
      const spoken = streamSentences(reply, randomChunks(reply, seed)).join(" ");
      expect(spoken).not.toContain(GITHUB.slice(4, 20));
      expect(spoken).toContain("<redacted>");
    }
  });

  it("splits a sentence too long for one synthesis request at whitespace, identically when streamed", () => {
    const list = Array.from({ length: 400 }, (_, i) => `- item number ${i}`).join(String.fromCharCode(10));
    const whole = speakableSentences(list, true);
    expect(whole.length).toBeGreaterThan(5);
    expect(Math.max(...whole.map((s) => s.length))).toBeLessThanOrEqual(MAX_SPOKEN_SENTENCE_CHARS);
    expect(whole.join(" ")).toBe(speakableProjection(list));
    for (const seed of [4, 5]) expect(streamSentences(list, randomChunks(list, seed))).toEqual(whole);
  });
});

describe("reasoning splitter", () => {
  it("passes text with no markers through unchanged when the prompt opens nothing", () => {
    const split = createReasoningSplitter({ reasoningOpensInPrompt: false });
    expect(split.push("Hello there.").visible).toBe("Hello there.");
    expect(split.end()).toEqual({ visible: "", reasoning: "", reasoningOnly: false });
  });

  it("removes well-formed think blocks, holding a tag split across chunks", () => {
    const split = createReasoningSplitter({ reasoningOpensInPrompt: false });
    const parts = ["Hi <th", "ink>secret plan</thi", "nk> world."];
    const visible = parts.map((p) => split.push(p).visible).join("") + split.end().visible;
    expect(visible).toBe("Hi  world.");
  });

  it("withholds everything until the first closer when the prompt opens reasoning (LFM-style orphan closer)", () => {
    const split = createReasoningSplitter({ reasoningOpensInPrompt: true });
    const a = split.push("let me think about 391");
    const b = split.push(" = 17 x 23</think>No, 391 is not prime.");
    expect(a.visible).toBe("");
    expect(a.reasoning + b.reasoning).toBe("let me think about 391 = 17 x 23");
    expect(b.visible).toBe("No, 391 is not prime.");
  });

  it("yields nothing visible and flags reasoning-only when the closer never arrives", () => {
    const split = createReasoningSplitter({ reasoningOpensInPrompt: true });
    expect(split.push("still thinking").visible).toBe("");
    expect(split.end()).toMatchObject({ visible: "", reasoningOnly: true });
  });

  it("leaves Gemma 4 output unchanged", () => {
    const split = createReasoningSplitter({ reasoningOpensInPrompt: false });
    const text = "<|tool_call>call:read_file{path:<|\"|>a.ts<|\"|>}<tool_call|> The answer is 4.";
    const visible = randomChunks(text, 7).map((c) => split.push(c).visible).join("") + split.end().visible;
    expect(visible).toBe(text);
  });

  it("recognizes think tags in any letter case", () => {
    const split = createReasoningSplitter({ reasoningOpensInPrompt: false });
    const a = split.push("<Think>plan</THINK>Hi");
    const e = split.end();
    expect(a.visible + e.visible).toBe("Hi");
    expect(a.reasoning + e.reasoning).toBe("plan");
  });

  it("splits identically for any chunking", () => {
    const text = "a<think>b</think>c<think>d</think>e";
    for (let seed = 1; seed <= 100; seed++) {
      const split = createReasoningSplitter({ reasoningOpensInPrompt: false });
      let visible = "";
      let reasoning = "";
      for (const c of randomChunks(text, seed)) {
        const d = split.push(c);
        visible += d.visible;
        reasoning += d.reasoning;
      }
      const e = split.end();
      expect(visible + e.visible).toBe("ace");
      expect(reasoning + e.reasoning).toBe("bd");
    }
  });
});
