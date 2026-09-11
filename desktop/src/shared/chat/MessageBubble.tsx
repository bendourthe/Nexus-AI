/**
 * v1.0.0 Phase 4.4 -- shared message bubble.
 *
 * v2.2.2: user right / assistant left is owned by MessageList. The bubble
 * itself is fit-content, max 80% of the transcript pane, with no You /
 * Assistant labels on normal turns. Tool cards keep their name.
 */

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  formatDuration,
  jobPhase,
  MODEL_LOAD_SECONDS,
  phaseFraction,
  progressLines,
  type JobPhase,
} from "./generationProgress";
import { GenerationProgressBar } from "./GenerationProgressBar";
import { GenerationFailureCard } from "../studio/GenerationFailureCard";
import { ImageViewer } from "../studio/ImageViewer";
import type { ChatMessage, ToolCard } from "./types";
import { AgentStateOrb } from "../../components/agentState/AgentStateOrb";
import {
  bubbleTokenMetadata,
  formatBubbleTime,
  parseMessageTime,
} from "./transcriptChrome";
import { ReasoningDisclosure } from "./ReasoningDisclosure";
import {
  MediaRuntimeRecoveryCard,
  Sam2RecoveryCard,
} from "../../components/GenerationCanvas";

const COMPACT_MEDIA_STYLE: CSSProperties = {
  display: "block",
  width: "auto",
  maxWidth: "100%",
  maxHeight: "40vh",
  height: "auto",
  objectFit: "contain",
  background: "transparent",
  borderRadius: "var(--radius-md)",
  marginTop: "var(--space-2)",
  cursor: "zoom-in",
};

export interface MessageBubbleProps {
  message: ChatMessage;
  /** When false, tool-call cards are omitted from the rendered output. */
  enableTools?: boolean;
  /** Lets the owning Studio clear actions and cached output after decode failure. */
  onMediaError?: (message: ChatMessage) => void;
  /** v2.2.4 Phase 4 -- extra studio actions inside the media lightbox. */
  renderPreviewExtra?: (message: ChatMessage) => ReactNode;
  /**
   * v2.4.9 -- per-message actions rendered ON the timestamp row.
   *
   * Operator ask: "could the copy/save/enhance buttons appear on the same line
   * as the time of the response?" They used to sit on their own row below the
   * media via `renderAfter`.
   */
  metaActions?: ReactNode;
  /** v2.2.7 Phase 4 -- tests pin `en-US`; production uses the host locale. */
  locale?: string;
  onRepairMediaRuntime?: (message: ChatMessage) => void;
  onCancelMediaRepair?: (message: ChatMessage) => void;
  onOpenMediaRepairLog?: (message: ChatMessage) => void;
  onInstallSam2?: (message: ChatMessage) => void;
  onPaintSam2Mask?: (message: ChatMessage) => void;
  onOpenSam2Settings?: (message: ChatMessage) => void;
  onRetrySam2?: (message: ChatMessage) => void;
  sam2InstallDisabled?: boolean;
}

export function MessageBubble({
  message,
  enableTools = true,
  onMediaError,
  renderPreviewExtra,
  metaActions,
  locale,
  onRepairMediaRuntime,
  onCancelMediaRepair,
  onOpenMediaRepairLog,
  onInstallSam2,
  onPaintSam2Mask,
  onOpenSam2Settings,
  onRetrySam2,
  sam2InstallDisabled = false,
}: MessageBubbleProps): JSX.Element {
  const [mediaFailed, setMediaFailed] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  useEffect(() => setMediaFailed(false), [message.media?.src]);
  useEffect(() => {
    if (!previewOpen) return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") setPreviewOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [previewOpen]);
  const studioPending = isStudioPending(message);
  const caption = captionFor(message);
  const purePending = Boolean(
    message.pending &&
    !message.content &&
    !message.media &&
    (!message.toolCards || message.toolCards.length === 0),
  );
  if (purePending) {
    return <PendingMessage message={message} studioPending={studioPending} />;
  }
  return (
    <div
      data-testid={`message-shell-${message.id}`}
      style={{
        width: "fit-content",
        maxWidth: message.media ? "min(100%, 28rem)" : "80%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {message.role === "assistant" ? (
        <ReasoningDisclosure
          messageId={message.id}
          text={message.reasoningText}
          tokenCount={message.reasoningTokens}
        />
      ) : null}
      <article
        data-testid={`message-bubble-${message.id}`}
        data-role={message.role}
        style={bubbleStyle(message)}
      >
        {message.pending ? null : (
          <BubbleMeta
            message={message}
            locale={locale}
            {...(metaActions ? { actions: metaActions } : {})}
          />
        )}
        {message.mediaRecovery ? (
          <MediaRuntimeRecoveryCard
            {...message.mediaRecovery}
            onRepair={() => onRepairMediaRuntime?.(message)}
            onCancel={() => onCancelMediaRepair?.(message)}
            onOpenLog={() => onOpenMediaRepairLog?.(message)}
          />
        ) : null}
        {message.sam2Recovery ? (
          <Sam2RecoveryCard
            {...message.sam2Recovery}
            installDisabled={sam2InstallDisabled}
            onInstall={() => onInstallSam2?.(message)}
            onPaintMask={() => onPaintSam2Mask?.(message)}
            onOpenSettings={() => onOpenSam2Settings?.(message)}
            onRetry={() => onRetrySam2?.(message)}
          />
        ) : null}
        {caption}
        {message.content && (
          <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{message.content}</p>
        )}
        {message.attachments && message.attachments.length > 0 && (
          <div
            data-testid={`message-attachments-${message.id}`}
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "var(--space-1)",
              marginTop: "var(--space-2)",
            }}
          >
            {message.attachments.map((src, i) => (
              <img
                key={i}
                src={src}
                alt="Attachment"
                data-testid={`message-attachment-${message.id}-${i}`}
                style={{
                  maxWidth: 96,
                  maxHeight: 96,
                  borderRadius: "var(--radius-sm)",
                  objectFit: "cover",
                }}
              />
            ))}
          </div>
        )}
        {message.pending && (
          <div
            data-testid={`message-pending-${message.id}`}
            style={{
              marginTop: studioPending ? 0 : "var(--space-2)",
              color: "var(--fg-muted)",
              display: "flex",
              flexDirection: "column",
              alignItems: isLoadingModel(message) ? "center" : "flex-start",
              justifyContent: isLoadingModel(message) ? "center" : "flex-start",
              gap: "var(--space-2)",
              width: isLoadingModel(message) ? "100%" : "26rem",
              maxWidth: "100%",
              overflow: "visible",
              // v2.4.4 Phase 1.1: the transcript gutter on MessageList is the
              // only left offset. Adding one here again is what pushed the pill
              // inches into the pane.
              paddingLeft: 0,
            }}
          >
            <PendingWork message={message} studioPending={studioPending} />
          </div>
        )}
        {message.failure ? (
          <GenerationFailureCard
            failure={message.failure}
            testId={`generation-failure-${message.id}`}
          />
        ) : null}
        {mediaFailed ? (
          <p
            data-testid={`message-media-error-${message.id}`}
            style={{ color: "var(--danger, #f87171)", margin: 0 }}
          >
            Generation failed: generated {message.media?.kind ?? "media"} could
            not be displayed.
          </p>
        ) : message.media ? (
          <>
            {message.media.kind === "image" ? (
              <img
                data-testid={`message-media-${message.id}`}
                src={message.media.src}
                alt={message.content || "Generated image"}
                onClick={(event) => {
                  event.stopPropagation();
                  setPreviewOpen(true);
                }}
                onError={() => {
                  setMediaFailed(true);
                  onMediaError?.(message);
                }}
                style={COMPACT_MEDIA_STYLE}
              />
            ) : (
              <video
                data-testid={`message-media-${message.id}`}
                src={message.media.src}
                controls
                onClick={(event) => {
                  event.stopPropagation();
                  setPreviewOpen(true);
                }}
                onError={() => {
                  setMediaFailed(true);
                  onMediaError?.(message);
                }}
                style={COMPACT_MEDIA_STYLE}
              />
            )}
            {previewOpen ? (
              // v2.4.9: images open in the editor-capable viewer; video keeps
              // the simple lightbox (a clip has nothing to paint on).
              message.media?.kind === "image" ? (
                <ImageViewer
                  src={message.media.src}
                  alt={message.content || "Generated image"}
                  downloadName={`nexus-${message.id}`}
                  onClose={() => setPreviewOpen(false)}
                  testId={`message-media-dialog-${message.id}`}
                  {...(renderPreviewExtra
                    ? { extra: renderPreviewExtra(message) }
                    : {})}
                />
              ) : (
                <MediaLightbox
                  message={message}
                  extra={renderPreviewExtra?.(message)}
                  onClose={() => setPreviewOpen(false)}
                />
              )
            ) : null}
          </>
        ) : null}
        {enableTools && message.toolCards && message.toolCards.length > 0 && (
          <ul
            data-testid={`message-bubble-tools-${message.id}`}
            style={{
              listStyle: "none",
              padding: 0,
              margin: "var(--space-2) 0 0",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-1)",
            }}
          >
            {message.toolCards.map((card) => (
              <li key={card.callId}>
                <ToolCardView card={card} />
              </li>
            ))}
          </ul>
        )}
      </article>
    </div>
  );
}

function PendingMessage({
  message,
  studioPending,
}: {
  message: ChatMessage;
  studioPending: boolean;
}): JSX.Element {
  /*
   * v2.4.9, second operator pass: alignment is decided by PHASE, not by tab.
   *
   * "The loading animation should be centered for all modes ... which should
   * only apply to the model generation animation, not the loading."
   *
   * The first pass made everything left-aligned, which fixed the studio/chat
   * mismatch but flattened this distinction with it. Loading (and its queued /
   * clearing preludes) is a centered hero block on every tab; generating is
   * the left-aligned pill on every tab.
   */
  const centered = isLoadingModel(message);
  return (
    <div
      data-testid={`message-pending-${message.id}`}
      role="status"
      aria-label={studioPending ? "Generating media" : "Generating reply"}
      style={{
        color: "var(--fg-muted)",
        display: "flex",
        flexDirection: "column",
        // v2.4.9 second pass: PHASE decides alignment, not tab. Loading is a
        // centered hero block everywhere; generating is the left-aligned pill
        // everywhere. A fixed basis (not `fit-content`) keeps the bar one
        // width in both phases -- `fit-content` is what leaked caption length
        // back into the bar the first time.
        alignItems: centered ? "center" : "flex-start",
        justifyContent: centered ? "center" : "flex-start",
        gap: "var(--space-2)",
        width: centered ? "100%" : "26rem",
        maxWidth: "100%",
        // v2.4.4 Phase 1.1 (T001): no inline padding here. The pending row is
        // an assistant row and takes its left margin from the list gutter, the
        // same one a completed assistant bubble sits on.
        paddingInline: 0,
        boxSizing: "border-box",
        overflow: "visible",
      }}
    >
      <PendingWork message={message} studioPending={studioPending} />
    </div>
  );
}

/**
 * v2.4.8 Phase 8 -- a studio job is "loading the model" until the runtime says
 * otherwise. Operator report (2026-09-07): after switching from Chat to Images
 * the GPU sat idle for a while before the first sample, and the bubble already
 * read "Creating...". Weights moving onto the GPU are not creation. The
 * runtime now emits `stage: "loading"` before a pipeline is built and
 * `stage: "generating"` once it is on the device; before any event, or while
 * the stage is still `loading` with no step counted, the orb shows
 * "Loading model...". A counted step or the `generating` stage flips it to the
 * studio captions.
 *
 * v2.4.8 follow-up (2026-09-07): the sidecar now reports `queued` while the
 * job waits for the GPU behind another module, and the runtime reports the
 * weight bytes read while `loading`. Both are still "not creating yet"; the
 * caption names which one it is, and a byte-level bar shows how far along.
 */
export function isLoadingModel(message: ChatMessage): boolean {
  return pendingPhase(message) !== "generating";
}

/**
 * v2.4.8 follow-up (2026-09-08) -- which phase a pending message is in.
 *
 * Operator report: loading and generating looked the same, so a number shown
 * during one read as a promise about the other. The phase is decided in one
 * place and drives everything the operator sees: the animation (a fixed
 * "Loading model" caption on a hero orb, then the rotating-caption pill the
 * chatbot uses), the bar's meaning (weight bytes, then sampling steps) and the
 * wording of the estimate under it.
 */
export function pendingPhase(message: ChatMessage): JobPhase {
  return jobPhase(message.progress, isStudioPending(message));
}

/**
 * The pending animation and its progress block, one per phase.
 *
 * Loading (and its queued / clearing preludes) is a centered hero orb with a
 * fixed caption. Generating is the chat pill -- the same rotating-caption
 * animation on every tab -- drawing words from the studio pool on Images and
 * Videos and from the chat pool on Chat and Agents.
 */
function PendingWork({
  message,
  studioPending,
}: {
  message: ChatMessage;
  studioPending: boolean;
}): JSX.Element {
  const phase = pendingPhase(message);
  const generating = phase === "generating";
  return (
    <>
      <AgentStateOrb
        activity={generating ? (message.activity ?? "chat-streaming") : "model-loading"}
        size={generating ? "bubble" : "hero"}
        showCaption
        rotateCaptions={generating}
        captionPool={studioPending ? "studio" : "chat"}
        {...(generating ? {} : { caption: loadingCaption(message) })}
        accessibleName={
          generating
            ? studioPending
              ? "Generating media"
              : "Generating reply"
            : loadingAccessibleName(message)
        }
        surfaceId={`message-${message.id}`}
      />
      <GenerationProgress message={message} phase={phase} />
    </>
  );
}

/**
 * Plain-language reasons the GPU is busy, by the scheduler module holding it.
 * Operator feedback (2026-09-07): "(Images is using it)" read as jargon; say
 * what is still running instead.
 */
const GPU_HOLDER_DETAIL: Record<string, string> = {
  chat: "A chat reply is still being written.",
  coding: "An agent task is still running.",
  image: "Another image is still being generated.",
  video: "Another video is still being generated.",
};

/** The line under the caption: an explicit note, else who holds the GPU. */
export function queuedDetail(progress: LoadProgress | undefined): string | null {
  if (progress?.detail) return progress.detail;
  if (progress?.stage !== "queued" || !progress.blockedBy) return null;
  return GPU_HOLDER_DETAIL[progress.blockedBy] ?? null;
}

type LoadProgress = NonNullable<ChatMessage["progress"]>;

/** Whole-number percent of weight bytes read, or null before any byte count. */
export function loadPercent(progress: LoadProgress | undefined): number | null {
  if (!progress || !progress.totalBytes || progress.totalBytes <= 0) return null;
  if (typeof progress.loadedBytes !== "number") return null;
  const ratio = progress.loadedBytes / progress.totalBytes;
  return Math.min(100, Math.max(0, Math.round(ratio * 100)));
}

/** "about 12 s left" / "about 2 min left", or null without a usable estimate. */
export function loadEtaLabel(progress: LoadProgress | undefined): string | null {
  const eta = progress?.etaS;
  if (typeof eta !== "number" || !Number.isFinite(eta) || eta <= 0) return null;
  // Units are spelled out app-wide (v2.4.9); formatDuration owns the wording.
  return `about ${formatDuration(eta)} left`;
}

export function loadingCaption(message: ChatMessage): string {
  const progress = message.progress;
  if (progress?.stage === "queued") return "Waiting for the GPU to free up...";
  if (progress?.stage === "clearing") return "Clearing the GPU...";
  const pct = loadPercent(progress);
  return pct === null ? "Loading model..." : `Loading model ${pct}%`;
}

function loadingAccessibleName(message: ChatMessage): string {
  const stage = message.progress?.stage;
  if (stage === "queued") return "Waiting for GPU";
  return stage === "clearing" ? "Clearing the GPU" : "Loading model";
}

/**
 * v2.4.8 follow-up (2026-09-07) -- one progress block for a running job.
 *
 * Operator report: a Wan video sat on a rotating word for fifteen minutes with
 * no bar, no clock and no idea whether it was working. This renders whichever
 * measurement the job currently has -- weight bytes while the model loads,
 * sampling steps once it is generating -- plus a running clock, so silence is
 * never the only signal. The bar is as wide as the caption above it.
 */
function GenerationProgress({
  message,
  phase,
}: {
  message: ChatMessage;
  phase: JobPhase;
}): JSX.Element | null {
  const progress = message.progress;
  const detail = queuedDetail(progress);
  // A plain chat reply has nothing to measure: no phase to load, no steps and
  // no cost model. It keeps the bare pill rather than gaining a stopwatch.
  const measurable =
    phase !== "generating" ||
    Boolean(progress && progress.total > 0 && progress.step > 0) ||
    Boolean(message.estimateSeconds);
  const phaseElapsed = usePhaseElapsed(
    message.id,
    phase,
    message.timestamp,
    measurable && !detail,
  );

  if (!measurable) return null;
  if (detail) {
    return (
      <span
        data-testid={`model-queued-detail-${message.id}`}
        style={{ color: "var(--fg-muted)", fontSize: "var(--text-xs)" }}
      >
        {detail}
      </span>
    );
  }

  const fraction = phaseFraction(progress);
  const lines = progressLines({
    progress,
    phase,
    phaseElapsed,
    estimateSeconds: phaseEstimateSeconds(message, phase),
  });

  // v2.4.9: the bar renders from the first frame. It used to appear only once
  // a fraction existed, which on a cold image model meant 37 seconds of bare
  // caption and then a bar with one second left on it (operator screenshots
  // 6 and 7). `fraction === null` is now the indeterminate sweep, not "no bar".
  return (
    <GenerationProgressBar
      testId={`model-load-progress-${message.id}`}
      clockTestId={`generation-clock-${message.id}`}
      fraction={fraction}
      position={lines.position}
      elapsed={lines.elapsed}
      remaining={lines.remaining}
      hint={lines.hint}
      accentVar={PHASE_ACCENT_VAR[phase] ?? "--accent-chatbot"}
    />
  );
}

/**
 * One accent per phase so the bar reads as part of the surface it sits on:
 * loading is the neutral chat accent, sampling takes the module's colour via
 * the caller. Kept here (not inline) so every tab resolves it the same way.
 */
const PHASE_ACCENT_VAR: Partial<Record<JobPhase, string>> = {
  queued: "--fg-muted",
  clearing: "--fg-muted",
  loading: "--accent-chatbot",
  generating: "--accent-chatbot",
};

/**
 * The up-front figure for the phase being shown, never for the whole job.
 *
 * Operator report (2026-09-08): a video showed "usually about 18 min" while it
 * was loading weights, so the load looked like it would take 18 minutes. The
 * sampling figure belongs to sampling; the load has its own, from the model's
 * size where the caller knows it.
 */
function phaseEstimateSeconds(message: ChatMessage, phase: JobPhase): number | undefined {
  if (phase === "generating") return message.estimateSeconds;
  if (phase !== "loading") return undefined;
  return message.loadEstimateSeconds ?? MODEL_LOAD_SECONDS;
}

/**
 * Seconds spent in the current phase.
 *
 * Each phase gets its own clock so a measured rate describes that phase alone:
 * the load estimate is not diluted by sampling time and the sampling estimate
 * does not carry the load. The loading clock anchors on the message timestamp
 * when there is one, so it survives a re-render; later phases anchor on the
 * moment the phase was first seen.
 */
function usePhaseElapsed(
  messageId: string,
  phase: JobPhase,
  startedAt: string | undefined,
  active: boolean,
): number | null {
  const anchorRef = useRef<{ key: string; at: number } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [active, messageId, phase]);
  if (!active) return null;
  const key = `${messageId}:${phase}`;
  if (anchorRef.current?.key !== key) {
    const started = startedAt ? Date.parse(startedAt) : NaN;
    const anchor =
      phase === "loading" && Number.isFinite(started) ? Math.min(started, Date.now()) : Date.now();
    anchorRef.current = { key, at: anchor };
  }
  return Math.max(0, (now - anchorRef.current.at) / 1000);
}

/**
 * " (00:00:42)" after the timestamp, or "" when unmeasured.
 *
 * One fixed HH:MM:SS shape on every mode, so a column of replies lines up and
 * a 10-second chat turn is directly comparable to a 20-minute video without
 * the reader parsing "2 min 5 s" against "42 s".
 *
 * A turn under a second still gets nothing: the brackets exist to make real
 * work legible, not to decorate every row.
 */
export function formatGenerationDuration(seconds: number | undefined): string {
  const clock = formatHhMmSs(seconds);
  return clock ? ` (${clock})` : "";
}

/** "HH:MM:SS", or "" when there is nothing worth reporting. */
export function formatHhMmSs(seconds: number | undefined): string {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < 1) return "";
  const whole = Math.floor(seconds);
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const rest = whole % 60;
  const pad = (value: number): string => String(value).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(rest)}`;
}

function BubbleMeta({
  message,
  locale,
  actions,
}: {
  message: ChatMessage;
  locale?: string;
  /** v2.4.9 -- studio actions share the timestamp row instead of a row below. */
  actions?: ReactNode;
}): JSX.Element | null {
  const when = parseMessageTime(message.timestamp);
  const tokens = bubbleTokenMetadata(message);
  // Nothing known: no empty chrome row above the text.
  if (!when && !tokens && !actions) return null;
  return (
    <div
      data-testid={`message-meta-${message.id}`}
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: "var(--space-4)",
        marginBottom: "var(--space-2)",
        color: "var(--fg-muted)",
        fontSize: "var(--text-xs)",
      }}
    >
      {when ? (
        <time
          data-testid={`message-time-${message.id}`}
          dateTime={when.toISOString()}
        >
          {formatBubbleTime(when, locale)}
          {formatGenerationDuration(message.generationSeconds)}
        </time>
      ) : null}
      {actions ? (
        <span
          data-testid={`message-meta-actions-${message.id}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "var(--space-1)",
            marginLeft: "auto",
          }}
        >
          {actions}
        </span>
      ) : null}
      {tokens && message.role === "user" ? (
        <span
          data-testid={`message-tokens-${message.id}`}
          style={{ fontStyle: "italic", marginLeft: "auto" }}
        >
          {tokens.label}
        </span>
      ) : tokens ? (
        <span
          data-testid={`message-tokens-${message.id}`}
          tabIndex={0}
          title={tokens.detail}
          aria-label={`${tokens.label}. ${tokens.detail}`}
          style={{ fontStyle: "italic", marginLeft: "auto" }}
        >
          {tokens.label}
        </span>
      ) : null}
    </div>
  );
}

function ToolCardView({ card }: { card: ToolCard }): JSX.Element {
  return (
    <div
      data-testid={`tool-card-${card.callId}`}
      style={{
        border: "1px solid var(--border-1)",
        padding: "var(--space-2)",
        borderRadius: "var(--radius-md)",
        backgroundColor: "var(--bg-1)",
      }}
    >
      <header>
        <strong>{card.name}</strong>
      </header>
      <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>{card.args}</pre>
      {card.result !== null && (
        <p style={{ margin: "var(--space-1) 0 0", color: "var(--fg-muted)" }}>
          -&gt; {card.result}
        </p>
      )}
    </div>
  );
}

function captionFor(message: ChatMessage): ReactNode {
  if (message.role === "system") {
    return (
      <header
        style={{
          marginBottom: "var(--space-1)",
          color: "var(--fg-muted)",
          fontSize: "var(--text-xs)",
        }}
      >
        System
      </header>
    );
  }
  if (message.origin === "stt_transcript") {
    return (
      <span
        data-testid={`message-origin-${message.id}`}
        style={{ color: "var(--fg-muted)", fontSize: "var(--text-xs)" }}
      >
        origin:stt_transcript
      </span>
    );
  }
  return null;
}

function MediaLightbox({
  message,
  extra,
  onClose,
}: {
  message: ChatMessage;
  extra?: ReactNode;
  onClose: () => void;
}): JSX.Element {
  const media = message.media;
  let previewNode: HTMLElement | null = null;
  return (
    <div
      data-testid={`message-media-dialog-${message.id}`}
      role="dialog"
      aria-modal="true"
      aria-label="Generated media preview"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "color-mix(in srgb, #000 72%, transparent)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-4)",
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          maxWidth: "min(96vw, 64rem)",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
          background: "var(--bg-1)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-3)",
        }}
      >
        {media?.kind === "image" ? (
          <img
            ref={(node) => {
              previewNode = node;
            }}
            src={media.src}
            alt={message.content || "Generated image"}
            style={{
              maxWidth: "90vw",
              maxHeight: "70vh",
              objectFit: "contain",
            }}
          />
        ) : media ? (
          <video
            ref={(node) => {
              previewNode = node;
            }}
            src={media.src}
            controls
            autoPlay
            style={{ maxWidth: "90vw", maxHeight: "70vh" }}
          />
        ) : null}
        <div
          style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}
        >
          <button
            type="button"
            data-testid={`message-media-fullscreen-${message.id}`}
            onClick={() => {
              if (
                previewNode &&
                typeof previewNode.requestFullscreen === "function"
              ) {
                void previewNode.requestFullscreen();
              }
            }}
          >
            Fullscreen
          </button>
          <a
            data-testid={`message-media-download-${message.id}`}
            href={media?.src}
            download={
              media?.kind === "video"
                ? `nexus-${message.id}.mp4`
                : `nexus-${message.id}.png`
            }
          >
            Download
          </a>
          {media?.kind === "image" ? (
            <button
              type="button"
              data-testid={`message-media-copy-${message.id}`}
              onClick={() => void copyImageSrc(media.src)}
            >
              Copy image
            </button>
          ) : null}
          {extra}
          <button
            type="button"
            data-testid={`message-media-close-${message.id}`}
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

async function copyImageSrc(src: string): Promise<void> {
  try {
    const blob = await (await fetch(src)).blob();
    const clipboard =
      typeof navigator !== "undefined" ? navigator.clipboard : undefined;
    if (
      clipboard &&
      typeof ClipboardItem !== "undefined" &&
      typeof clipboard.write === "function"
    ) {
      await clipboard.write([
        new ClipboardItem({ [blob.type || "image/png"]: blob }),
      ]);
      return;
    }
    if (clipboard && typeof clipboard.writeText === "function") {
      await clipboard.writeText(src);
    }
  } catch {
    // Clipboard permission or jsdom gaps must not crash the transcript.
  }
}

function isStudioPending(message: ChatMessage): boolean {
  return Boolean(
    message.pending &&
    (message.activity === "image-generation" ||
      message.activity === "video-generation"),
  );
}

function bubbleStyle(message: ChatMessage): CSSProperties {
  const user = message.role === "user";
  const system = message.role === "system";
  const studioPending = isStudioPending(message);
  if (studioPending) {
    return {
      width: "100%",
      maxWidth: "100%",
      minHeight: "12rem",
      boxSizing: "border-box",
      padding: 0,
      border: "none",
      backgroundColor: "transparent",
      color: "var(--fg-0)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    };
  }
  return {
    width: "fit-content",
    maxWidth: "100%",
    boxSizing: "border-box",
    padding: "var(--space-2) var(--space-3)",
    borderRadius: "var(--radius-lg, 12px)",
    border: "1px solid var(--bubble-border, var(--border-1))",
    backgroundColor: system
      ? "transparent"
      : user
        ? "var(--bubble-user, var(--bg-2))"
        : "var(--bubble-assistant, var(--bg-1))",
    color: "var(--fg-0)",
  };
}
