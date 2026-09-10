/**
 * v2.4.9 -- turn a raw generation failure into something a person can act on.
 *
 * Operator report: asking for a 4K image printed a forty-line Zod dump into
 * the transcript ("code": "too_big", "maximum": 2048, "path": ["width"] ...).
 * A second run asked Wan 2.1 for 720p / 8 s, ran for ten minutes, then said
 * "Local model did not finish in time. Check Ollama is running" -- advice that
 * has nothing to do with a diffusion video job.
 *
 * So a failure now has three parts:
 *   headline -- one sentence, always the same shape ("could not be completed")
 *   summary  -- WHAT was wrong, in the user's vocabulary ("2048 x 2048 is the
 *               largest size this model accepts")
 *   detail   -- the untouched original, behind a copy button, for a bug report
 *
 * Recognition is pattern-based and falls through to a generic summary, so an
 * unrecognized error still renders as a proper card rather than a wall of JSON.
 */

export interface GenerationFailure {
  /** Always present. One sentence, no jargon. */
  readonly headline: string;
  /** The specific reason, when one could be identified. */
  readonly summary: string | null;
  /** What the user can do next, when there is a concrete action. */
  readonly hint: string | null;
  /** The raw text, verbatim, for the copy button. */
  readonly detail: string;
  /** Coarse class, for testing and telemetry. */
  readonly kind: GenerationFailureKind;
}

export type GenerationFailureKind =
  | "size-too-large"
  | "invalid-setting"
  | "timeout"
  | "out-of-memory"
  | "runtime-unavailable"
  | "cancelled"
  | "unknown";

interface ZodIssue {
  readonly code?: string;
  readonly maximum?: number;
  readonly minimum?: number;
  readonly path?: unknown[];
  readonly message?: string;
}

/** Field name -> the word a person would use for it. */
const FIELD_WORDS: Readonly<Record<string, string>> = {
  width: "width",
  height: "height",
  durationSeconds: "duration",
  fps: "frame rate",
  steps: "steps",
  cfgScale: "CFG scale",
  numFrames: "frame count",
};

/**
 * Zod issues arrive embedded in a message string. Pull them out without
 * assuming the whole message is JSON: the sidecar prefixes it with its own
 * text ("sidecar request error: [ ... ]").
 */
function parseZodIssues(raw: string): ZodIssue[] {
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start < 0 || end <= start) return [];
  try {
    const parsed: unknown = JSON.parse(raw.slice(start, end + 1));
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is ZodIssue => typeof item === "object" && item !== null);
  } catch {
    return [];
  }
}

function fieldWord(issue: ZodIssue): string | null {
  const first = Array.isArray(issue.path) ? issue.path[0] : undefined;
  if (typeof first !== "string") return null;
  return FIELD_WORDS[first] ?? first;
}

const TIMEOUT_RE = /did not finish in time|timed? ?out|deadline exceeded/i;
const OOM_RE = /out of memory|CUDA out of memory|OutOfMemoryError|allocat\w* \d+ (MiB|GiB)/i;
const UNAVAILABLE_RE =
  /econnrefused|enotfound|socket hang up|fetch failed|runtime (not )?(available|running)|sidecar (is )?not running/i;
const CANCELLED_RE = /cancell?ed|aborted by user|interrupted by app restart/i;

/**
 * Classify a raw generation error into a card the transcript can render.
 *
 * `context` lets the caller say which studio it was, so a timeout on a video
 * job never suggests checking Ollama (which serves chat, not diffusion).
 */
export function describeGenerationFailure(
  error: unknown,
  context: { readonly surface: "image" | "video" | "chat" | "coding"; readonly modelName?: string },
): GenerationFailure {
  const detail = error instanceof Error ? (error.stack ?? error.message) : String(error);
  const raw = error instanceof Error ? error.message : String(error);
  const noun = context.surface === "video" ? "video" : context.surface === "image" ? "image" : "reply";
  const headline = `Your ${noun} could not be generated.`;

  // 1. Schema rejections. These are the ones that produced the raw JSON dump.
  const issues = parseZodIssues(raw);
  if (issues.length > 0) {
    const tooBig = issues.filter((i) => i.code === "too_big" && typeof i.maximum === "number");
    const dimensionIssues = tooBig.filter((i) => {
      const first = Array.isArray(i.path) ? i.path[0] : undefined;
      return first === "width" || first === "height";
    });
    if (dimensionIssues.length > 0) {
      const max = dimensionIssues[0]?.maximum;
      return {
        headline,
        summary:
          `The size you asked for is larger than this model accepts. ` +
          `The largest supported dimension is ${max} pixels.`,
        hint: `Pick a smaller resolution (${max} x ${max} or below) and try again.`,
        detail,
        kind: "size-too-large",
      };
    }
    const first = issues[0];
    const field = first ? fieldWord(first) : null;
    return {
      headline,
      summary: field
        ? `The ${field} setting is not valid for this model.`
        : "One of the generation settings is not valid for this model.",
      hint: "Reset the advanced settings, or pick a different model.",
      detail,
      kind: "invalid-setting",
    };
  }

  // 2. Timeouts. The old copy blamed Ollama on every surface.
  if (TIMEOUT_RE.test(raw)) {
    const isMedia = context.surface === "image" || context.surface === "video";
    return {
      headline,
      summary: isMedia
        ? `The ${noun} took longer than the time limit and was stopped.`
        : "The model did not respond in time.",
      hint: isMedia
        ? "Try a shorter clip, a smaller resolution, or fewer steps. A model running past its supported size gets dramatically slower."
        : "Check that the local model runtime is running and the weights are loaded.",
      detail,
      kind: "timeout",
    };
  }

  // 3. VRAM.
  if (OOM_RE.test(raw)) {
    return {
      headline,
      summary: "The GPU ran out of memory part-way through.",
      hint: "Lower the resolution or step count, or close other GPU work and try again.",
      detail,
      kind: "out-of-memory",
    };
  }

  // 4. The runtime is not there at all.
  if (UNAVAILABLE_RE.test(raw)) {
    return {
      headline,
      summary: "The local generation service is not reachable.",
      hint: "Restart Nexus. If it keeps happening, check the installation log.",
      detail,
      kind: "runtime-unavailable",
    };
  }

  // 5. Deliberate stops are not failures worth alarming about.
  if (CANCELLED_RE.test(raw)) {
    return {
      headline: `Your ${noun} was cancelled.`,
      summary: null,
      hint: null,
      detail,
      kind: "cancelled",
    };
  }

  return {
    headline,
    summary: firstSentence(raw),
    hint: "Copy the details below if you need to report this.",
    detail,
    kind: "unknown",
  };
}

/** The first readable sentence of a raw message, capped so it stays a summary. */
function firstSentence(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // A JSON blob has no useful "first sentence"; the copy button carries it.
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return null;
  const cut = trimmed.split(/(?<=[.!?])\s/)[0] ?? trimmed;
  return cut.length > 200 ? `${cut.slice(0, 197)}...` : cut;
}

/** The clipboard payload: the summary a human reads plus the raw trace. */
export function failureClipboardText(failure: GenerationFailure): string {
  const parts = [failure.headline];
  if (failure.summary) parts.push(failure.summary);
  if (failure.hint) parts.push(failure.hint);
  parts.push("", "--- details ---", failure.detail);
  return parts.join("\n");
}

/**
 * One readable line for a stored transcript row.
 *
 * The failure CARD is a live UI affordance (copy button, expandable trace); a
 * persisted turn is plain text that has to still make sense months later, so
 * it keeps the headline and the reason and drops the chrome.
 */
export function failureTranscriptText(failure: GenerationFailure): string {
  return failure.summary ? `${failure.headline} ${failure.summary}` : failure.headline;
}
