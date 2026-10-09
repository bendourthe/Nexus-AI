/**
 * v2.12.0 Phase 2 -- window-aware tool output.
 *
 * Document tools used to size their output as a fixed share of the context
 * window, so results piled up until the model lost the question. This module
 * sizes each call from the room left: the window minus what the conversation
 * already holds. Both agent loops keep a `TurnLedger`, and both channels'
 * document tools call `remainingBudgetChars`, so the same inputs give the same
 * budget everywhere.
 *
 * No dependency on either loop, the extension, or the sidecar.
 */

/** Characters per token used to turn token counts into character budgets. */
export const CHARS_PER_TOKEN = 4;
/** Tokens left free for the model's answer when a tool sizes its output. */
export const RESERVE_TOKENS = 1024;
/** No document tool returns less than this, even in a nearly full window. */
export const FLOOR_CHARS = 512;
/**
 * A prompt count this close to the window may mean the backend truncated the
 * prompt to fit, so the count understates what was asked; treat it as full.
 */
export const TRUNCATION_MARGIN_TOKENS = 64;
/** Share of the window one `parse_document` result may take, as a section read does. */
export const PARSE_DOCUMENT_CONTEXT_SHARE = 0.25;

/** Fixed-share budget: today's ceiling, used alone when no usage count is known. */
export function budgetChars(contextTokens: number, share: number): number {
  return Math.max(FLOOR_CHARS, Math.floor(contextTokens * CHARS_PER_TOKEN * share));
}

export interface RemainingBudget {
  /** Characters this call may return. */
  readonly chars: number;
  /** True when the room left is at or below the floor; the tool tells the model. */
  readonly nearlyFull: boolean;
}

/**
 * Budget for one tool call: the fixed share as a ceiling, the room left in the
 * window (minus the answer reserve) below that, and the floor beneath both.
 * With no usage count, the fixed share alone, as before v2.12.0.
 */
export function remainingBudgetChars(
  contextTokens: number,
  usedTokens: number | null | undefined,
  share: number,
  floorChars: number = FLOOR_CHARS,
): RemainingBudget {
  const ceiling = budgetChars(contextTokens, share);
  if (typeof usedTokens !== "number" || !Number.isFinite(usedTokens) || usedTokens < 0) {
    return { chars: ceiling, nearlyFull: false };
  }
  const used = usedTokens >= contextTokens - TRUNCATION_MARGIN_TOKENS ? contextTokens : usedTokens;
  const room = (contextTokens - used - RESERVE_TOKENS) * CHARS_PER_TOKEN;
  return { chars: Math.min(ceiling, Math.max(floorChars, room)), nearlyFull: room <= floorChars };
}

/** The sentence a tool appends when it was sized against a nearly full window. */
export const NEARLY_FULL_NOTE =
  "The context window is nearly full: this result was cut to the minimum. Answer from what you have, or ask the user to start a new session.";

/**
 * Cut `text` to at most `chars` characters without splitting a surrogate pair.
 * Returns the kept text and how many characters were withheld.
 */
export function truncateToBudget(text: string, chars: number): { readonly text: string; readonly withheld: number } {
  if (text.length <= chars) return { text, withheld: 0 };
  let end = Math.max(0, chars);
  const code = text.charCodeAt(end - 1);
  if (end > 0 && code >= 0xd800 && code <= 0xdbff) end -= 1;
  return { text: text.slice(0, end), withheld: text.length - end };
}

/**
 * The `parse_document` result in both channels: the header, the (already
 * redacted) body cut to the remaining budget, and plain notes after the body
 * saying how much was withheld and whether the window is nearly full.
 */
export function sizeParsedDocument(
  header: string,
  body: string,
  contextTokens: number,
  usedTokens: number | null | undefined,
): string {
  const budget = remainingBudgetChars(contextTokens, usedTokens, PARSE_DOCUMENT_CONTEXT_SHARE);
  const cut = truncateToBudget(body, budget.chars);
  const notes = [
    cut.withheld > 0
      ? `[parse_document output truncated: ${cut.withheld} characters withheld to fit the context window. Use document_outline and document_read_section to read a long document by section, or a smaller max_pages.]`
      : "",
    budget.nearlyFull ? NEARLY_FULL_NOTE : "",
  ].filter((l) => l.length > 0);
  return `${header}${cut.text}${notes.length > 0 ? `\n\n${notes.join("\n")}` : ""}`;
}

/** Final-chunk counters, as Ollama (`prompt_eval_count`) or an OpenAI-shaped runtime (`usage`) reports them. */
export interface TurnCounters {
  readonly prompt_eval_count?: number;
  readonly eval_count?: number;
  readonly usage?: { readonly prompt_tokens?: number; readonly completion_tokens?: number };
}

function finiteCount(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

/**
 * Per-turn token ledger. After each model turn the loop reports the prompt the
 * backend counted and the response it generated; afterwards every message the
 * loop appends (a tool result) is recorded. `usedTokens` is then the reported
 * count plus what was appended since, or the caller's character estimate of the
 * whole history, whichever is larger: an estimate catches a backend that sends
 * no count, or one that counts only the uncached part of the prompt.
 */
export class TurnLedger {
  private reported: number | null = null;
  private appendedChars = 0;
  private lastPrompt: number | null = null;

  /** Call once per completed model turn with the final chunk's counters. */
  turnCompleted(counters: TurnCounters | undefined, responseChars: number): void {
    const prompt = finiteCount(counters?.prompt_eval_count) ?? finiteCount(counters?.usage?.prompt_tokens);
    const response =
      finiteCount(counters?.eval_count) ??
      finiteCount(counters?.usage?.completion_tokens) ??
      Math.ceil(responseChars / CHARS_PER_TOKEN);
    // A turn without a count keeps the earlier report: the estimate still applies.
    if (prompt !== null) {
      this.lastPrompt = prompt;
      this.reported = prompt + response;
      this.appendedChars = 0;
    } else if (this.reported !== null) {
      this.appendedChars += responseChars;
    }
  }

  /** Call for every message appended after the last reported turn. */
  record(chars: number): void {
    if (this.reported !== null) this.appendedChars += Math.max(0, chars);
  }

  /** Tokens already in the window for the next call, given the history's total characters. */
  usedTokens(historyChars: number): number {
    const estimate = Math.ceil(Math.max(0, historyChars) / CHARS_PER_TOKEN);
    if (this.reported === null) return estimate;
    return Math.max(this.reported + Math.ceil(this.appendedChars / CHARS_PER_TOKEN), estimate);
  }

  /** Keep document tools on their fixed share until a backend prompt count is known. */
  toolBudgetTokens(historyChars: number): number | undefined {
    return this.reported === null ? undefined : this.usedTokens(historyChars);
  }

  possiblyTruncated(contextTokens: number): boolean {
    return this.lastPrompt !== null && this.lastPrompt >= contextTokens - TRUNCATION_MARGIN_TOKENS;
  }

  reset(): void {
    this.reported = null;
    this.appendedChars = 0;
    this.lastPrompt = null;
  }
}
