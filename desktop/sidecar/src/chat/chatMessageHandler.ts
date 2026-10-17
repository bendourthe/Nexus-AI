// v1.7.0 -- Local Chatbot Explorer: the non-agentic chat message handler.
//
// Where the Coding pillar runs a full agent loop, the Chat pillar is a plain
// chatbot: send the conversation to a local model and stream the reply. This
// handler wraps the vscode-free `createHeadlessOllamaClient` (no tools, no
// loop) and maps stream chunks onto the `token` / `done` IPC event union.
// Never throws -- an LLM failure is surfaced as a trailing `done` event.
//
// v2.2.7 Phase 2 -- collect Ollama/OpenAI usage onto the done event. Missing
// usage stays omitted (null at persist), never invented as 0.

import { createHeadlessOllamaClient } from "../../../../modules/coding/llm/headlessOllamaClient.js";
import { redactSecrets } from "../../../../core/observability/redactSecrets.js";
import { createReasoningSplitter, createSpeakableProjector } from "../../../../core/chat/speakable.js";
import type { LLMClient, LLMMessage } from "../../../../modules/coding/llm/types.js";
import type { ChatSessionEventT } from "../protocol.js";
import type { SidecarModelEntry } from "../coding/models.js";
import {
  collectUsage,
  doneUsageFields,
  newUsage,
  turnUsageFromCollected,
} from "../serving/chatCore.js";
import type { VoiceJob } from "./voiceJobs.js";

export interface ChatRunnerInput {
  readonly sessionId: string;
  readonly model: SidecarModelEntry;
  /** Full conversation so far (system + prior turns + the new user message). */
  readonly messages: readonly LLMMessage[];
  readonly signal?: AbortSignal;
  /** v2.14.0 T008 -- speak the reply sentence by sentence while it streams. */
  readonly voice?: VoiceJob;
}

/**
 * Whether the model's chat template opens reasoning inside the prompt. Read
 * from the catalog entry when it declares it (v2.14.0 T012); default false.
 */
function reasoningOpensInPrompt(model: SidecarModelEntry): boolean {
  return (model as { reasoningOpensInPrompt?: unknown }).reasoningOpensInPrompt === true;
}

/** Runs one chat turn and returns the mapped IPC event stream. */
export type ChatRunner = (input: ChatRunnerInput) => Promise<readonly ChatSessionEventT[]>;

export interface ChatMessageHandlerOptions {
  /** Override the LLM port (tests inject a scripted client; default: Ollama). */
  readonly llm?: LLMClient;
}

const MAX_REASONING_TEXT_CHARS = 65_536;

/**
 * Build the production chat runner. Streams the conversation through the local
 * model and collects token events; a fresh client call per turn. Errors become
 * a `done` event with an `error: ...` reason so the IPC contract always holds.
 */
export function createChatMessageHandler(
  options: ChatMessageHandlerOptions = {},
): ChatRunner {
  const llm = options.llm ?? createHeadlessOllamaClient();
  return async (input) => {
    const events: ChatSessionEventT[] = [];
    const usage = newUsage();
    let thinking = "";
    // v2.4.8 Phase 1 (T002): the visible reply is accumulated so the provider
    // total can be split between reasoning and output by text proportion.
    let reply = "";
    let reasoningCaptured = 0;
    const voice = input.voice;
    const splitter = voice
      ? createReasoningSplitter({ reasoningOpensInPrompt: reasoningOpensInPrompt(input.model) })
      : null;
    const projector = voice ? createSpeakableProjector() : null;
    const speak = (sentences: readonly string[]) => {
      for (const sentence of sentences) voice?.pushSentence(sentence);
    };
    try {
      for await (const chunk of llm.streamChat(
        {
          model: input.model.id,
          messages: [...input.messages],
          stream: true,
          // v2.14.0 (owner decision, Phase 2 rework): a spoken reply skips the
          // model's hidden reasoning pass, which delayed the first visible
          // token by 16-21 s on the 16 GB tier. Typed turns are unchanged.
          ...(voice ? { think: false } : {}),
        },
        input.signal,
      )) {
        collectUsage(chunk, usage);
        const thinkDelta = chunk.message?.thinking ?? "";
        if (thinkDelta) {
          thinking += thinkDelta;
          const safeDelta = redactSecrets(thinkDelta).slice(
            0,
            Math.max(MAX_REASONING_TEXT_CHARS - reasoningCaptured, 0),
          );
          if (safeDelta) {
            events.push({ kind: "reasoning_delta", text: safeDelta });
            reasoningCaptured += safeDelta.length;
          }
        }
        const delta = chunk.message?.content ?? "";
        if (delta) {
          reply += delta;
          events.push({ kind: "token", text: delta });
          if (splitter && projector) speak(projector.push(splitter.push(delta).visible));
        }
        if (chunk.done) break;
      }
      if (splitter && projector) {
        speak(projector.push(splitter.end().visible));
        speak(projector.end());
        voice?.endReply();
      }
      events.push({
        kind: "done",
        finishReason: "stop",
        ...doneUsageFields(turnUsageFromCollected(usage, thinking, reply)),
      });
    } catch (err) {
      // A cancelled turn stops synthesis and further sentences; any other
      // failure ends the voice job with a terminal error.
      if (input.signal?.aborted) voice?.cancel();
      else voice?.fail("the reply failed before it finished");
      events.push({
        kind: "done",
        finishReason: `error: ${err instanceof Error ? err.message : String(err)}`,
        ...doneUsageFields(turnUsageFromCollected(usage, thinking, reply)),
      });
    }
    return events;
  };
}
