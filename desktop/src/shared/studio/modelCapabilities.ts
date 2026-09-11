/**
 * v2.4.9 -- what each image / video model can actually be asked for.
 *
 * WHY THIS FILE EXISTS
 *
 * Two operator failures had the same root cause: the studio forms offered
 * settings the selected model could not honour, and the user only found out
 * after waiting.
 *
 *  1. A 4096x4096 image failed instantly with a raw Zod dump. The resolution
 *     list was gated on the HOST'S VRAM TIER alone, so a 16 GB card was
 *     offered 4K -- but `sidecar/src/protocol.ts` caps width and height at
 *     2048, so that option could never succeed on any machine.
 *  2. A Wan 2.1 T2V 1.3B video was requested at 720p for 8 seconds and failed
 *     after TEN MINUTES. That model's catalog entry declares a 480p local path
 *     and `maxVideoSeconds: 5` / `maxVideoFrames: 81`; both settings were out
 *     of range before the job ever started.
 *
 * So capability is a property of the MODEL, not of the host, and it has to be
 * declared somewhere the form can read before it submits. This is that file:
 * one entry per catalog model, plus a family fallback so a model added to the
 * catalog without an entry here degrades to something safe rather than
 * offering everything.
 *
 * Host VRAM still matters -- it decides whether a model runs well -- but it is
 * a SECOND filter applied on top of these, never a substitute for them.
 *
 * Keep in sync with: `core/registry/catalog.json` (visualTokenBudget) and
 * `desktop/sidecar/src/protocol.ts` (the hard schema caps).
 */

/**
 * The sidecar's own schema caps, mirrored so the UI can never offer a value
 * the protocol rejects. `protocol.ts` is the authority; these are asserted
 * against it in tests.
 */
export const SIDECAR_MAX_IMAGE_DIMENSION = 2048;
export const SIDECAR_MIN_IMAGE_DIMENSION = 64;

export interface ResolutionChoice {
  /** Stable option value, always `${width}x${height}`. */
  readonly value: string;
  readonly label: string;
  readonly width: number;
  readonly height: number;
}

export interface NumericRange {
  readonly min: number;
  readonly max: number;
  readonly step?: number;
}

export interface ImageModelCapabilities {
  readonly kind: "image";
  /** Every resolution this model can be asked for, widest support first. */
  readonly resolutions: readonly ResolutionChoice[];
  /** Free-form width/height bounds for the numeric fields. */
  readonly dimension: NumericRange;
  /** Sampling steps this model accepts. */
  readonly steps: NumericRange;
  /**
   * CFG scale range, or null when the model is distilled / guidance-free and
   * the control should be disabled rather than silently ignored.
   */
  readonly cfgScale: NumericRange | null;
  /** Samplers the runtime can build for this model; empty means "any". */
  readonly samplers: readonly string[];
  /** One-step draft ("Fast preview") is only real on a distilled model. */
  readonly supportsFastPreview: boolean;
  readonly supportsNegativePrompt: boolean;
  readonly supportsLoras: boolean;
  readonly supportsControlNet: boolean;
  readonly supportsImageInput: boolean;
  /** Shown when a control is disabled, so "why" is never a mystery. */
  readonly notes?: Readonly<Record<string, string>>;
}

export interface VideoModelCapabilities {
  readonly kind: "video";
  readonly resolutions: readonly ResolutionChoice[];
  /** Selectable clip lengths in seconds -- a dropdown, never a free field. */
  readonly durationsSeconds: readonly number[];
  readonly fps: readonly number[];
  /** Hard frame ceiling from the catalog's `visualTokenBudget`. */
  readonly maxFrames: number;
  readonly steps: NumericRange;
  readonly cfgScale: NumericRange | null;
  readonly samplers: readonly string[];
  readonly supportsNegativePrompt: boolean;
  readonly supportsImageToVideo: boolean;
  readonly notes?: Readonly<Record<string, string>>;
}

export type ModelCapabilities = ImageModelCapabilities | VideoModelCapabilities;

function res(width: number, height: number, label?: string): ResolutionChoice {
  return {
    value: `${width}x${height}`,
    label: label ?? `${width} x ${height}`,
    width,
    height,
  };
}

const SQUARE_512 = res(512, 512);
const SQUARE_768 = res(768, 768);
const SQUARE_1024 = res(1024, 1024);
const SQUARE_2048 = res(2048, 2048, "2048 x 2048 (2K)");
const PORTRAIT_SDXL = res(832, 1216, "832 x 1216 (portrait)");
const LANDSCAPE_SDXL = res(1216, 832, "1216 x 832 (landscape)");

const VIDEO_480P = res(854, 480, "480p (854x480)");
const VIDEO_720P = res(1280, 720, "720p (1280x720)");

/**
 * SDXL fine-tunes. Trained at 1024x1024; the 832/1216 pair is the standard
 * non-square bucket. 2048 is reachable but slow, and is the protocol ceiling.
 */
const SDXL_IMAGE: ImageModelCapabilities = {
  kind: "image",
  resolutions: [SQUARE_1024, PORTRAIT_SDXL, LANDSCAPE_SDXL, SQUARE_768, SQUARE_512, SQUARE_2048],
  dimension: { min: SIDECAR_MIN_IMAGE_DIMENSION, max: SIDECAR_MAX_IMAGE_DIMENSION, step: 8 },
  steps: { min: 1, max: 80, step: 1 },
  cfgScale: { min: 1, max: 20, step: 0.5 },
  samplers: ["euler", "euler-ancestral", "dpm-solver", "ddim"],
  supportsFastPreview: false,
  supportsNegativePrompt: true,
  supportsLoras: true,
  supportsControlNet: true,
  supportsImageInput: true,
  notes: {
    supportsFastPreview:
      "One-step draft needs a distilled model. Pick SANA Sprint for instant previews.",
  },
};

/** SANA 1.6B at its native 1024px checkpoint. */
const SANA_1024: ImageModelCapabilities = {
  kind: "image",
  resolutions: [SQUARE_1024, SQUARE_768, SQUARE_512],
  dimension: { min: SIDECAR_MIN_IMAGE_DIMENSION, max: 1024, step: 8 },
  steps: { min: 1, max: 50, step: 1 },
  cfgScale: { min: 1, max: 10, step: 0.5 },
  samplers: ["flow-dpm-solver", "flow-euler"],
  supportsFastPreview: false,
  supportsNegativePrompt: true,
  supportsLoras: false,
  supportsControlNet: false,
  supportsImageInput: false,
  notes: {
    dimension: "This SANA checkpoint is trained at 1024px. Pick the 2K or 4K checkpoint to go larger.",
  },
};

/** SANA 1.6B 2K checkpoint. */
const SANA_2K: ImageModelCapabilities = {
  ...SANA_1024,
  resolutions: [SQUARE_2048, SQUARE_1024, SQUARE_768],
  dimension: { min: SIDECAR_MIN_IMAGE_DIMENSION, max: SIDECAR_MAX_IMAGE_DIMENSION, step: 8 },
  notes: {
    dimension: `Capped at ${SIDECAR_MAX_IMAGE_DIMENSION}px: the generation service rejects anything larger.`,
  },
};

/**
 * SANA 1.6B 4K. The checkpoint is native-4096, but the sidecar schema caps a
 * request at 2048, so 4K is NOT offered: an option that always fails is worse
 * than no option. This is the entry that produced the operator's raw Zod dump.
 */
const SANA_4K: ImageModelCapabilities = {
  ...SANA_2K,
  notes: {
    dimension:
      `This checkpoint is trained for 4096px, but the local generation service ` +
      `caps a request at ${SIDECAR_MAX_IMAGE_DIMENSION}px, so 2K is the ceiling here.`,
  },
};

/** SANA Sprint: one-step distilled. Guidance-free, so CFG is disabled. */
const SANA_SPRINT: ImageModelCapabilities = {
  kind: "image",
  resolutions: [SQUARE_1024, SQUARE_768, SQUARE_512],
  dimension: { min: SIDECAR_MIN_IMAGE_DIMENSION, max: 1024, step: 8 },
  steps: { min: 1, max: 4, step: 1 },
  cfgScale: null,
  samplers: ["flow-dpm-solver"],
  supportsFastPreview: true,
  supportsNegativePrompt: false,
  supportsLoras: false,
  supportsControlNet: false,
  supportsImageInput: false,
  notes: {
    cfgScale: "SANA Sprint is distilled and guidance-free, so CFG scale has no effect.",
    supportsNegativePrompt: "A one-step distilled model ignores the negative prompt.",
    steps: "SANA Sprint is tuned for 1-4 steps; more steps do not improve it.",
  },
};

/**
 * Wan 2.1 T2V 1.3B. Catalog: `maxVideoFrames: 81`, `maxVideoSeconds: 5`, and a
 * supported LOCAL path at 480p on 13 GB+. 720p is not offered: the operator's
 * 720p / 8 s request ran for ten minutes and then failed.
 */
const WAN_21_T2V: VideoModelCapabilities = {
  kind: "video",
  resolutions: [VIDEO_480P],
  durationsSeconds: [2, 3, 4, 5],
  fps: [12, 16, 24],
  maxFrames: 81,
  steps: { min: 10, max: 50, step: 1 },
  cfgScale: { min: 1, max: 12, step: 0.5 },
  samplers: ["flow-dpm-solver", "flow-euler"],
  supportsNegativePrompt: true,
  supportsImageToVideo: false,
  notes: {
    resolutions: "Wan 2.1 1.3B has a supported local path at 480p. Pick Wan 2.2 TI2V 5B for 720p.",
    durationsSeconds: "This model is trained for clips up to 5 seconds (81 frames).",
    supportsImageToVideo: "This is a text-to-video checkpoint. Pick Wan 2.2 TI2V for image-to-video.",
  },
};

/** Wan 2.2 TI2V 5B: 720p24 on a 24 GB card, text AND image to video. */
const WAN_22_TI2V: VideoModelCapabilities = {
  kind: "video",
  resolutions: [VIDEO_720P, VIDEO_480P],
  durationsSeconds: [2, 3, 4, 5],
  fps: [16, 24],
  maxFrames: 121,
  steps: { min: 10, max: 50, step: 1 },
  cfgScale: { min: 1, max: 12, step: 0.5 },
  samplers: ["flow-dpm-solver", "flow-euler"],
  supportsNegativePrompt: true,
  supportsImageToVideo: true,
};

/** SANA-Video 2B at 720p. */
const SANA_VIDEO: VideoModelCapabilities = {
  kind: "video",
  resolutions: [VIDEO_720P, VIDEO_480P],
  durationsSeconds: [2, 3, 4],
  fps: [24],
  maxFrames: 96,
  steps: { min: 10, max: 40, step: 1 },
  cfgScale: { min: 1, max: 10, step: 0.5 },
  samplers: ["flow-dpm-solver"],
  supportsNegativePrompt: true,
  supportsImageToVideo: false,
  notes: {
    fps: "SANA-Video is trained at 24 fps.",
  },
};

/** LongCat avatar video: image-driven, fixed short clips. */
const LONGCAT_AVATAR: VideoModelCapabilities = {
  kind: "video",
  resolutions: [VIDEO_480P],
  durationsSeconds: [2, 3, 4, 5],
  fps: [24],
  maxFrames: 121,
  steps: { min: 10, max: 40, step: 1 },
  cfgScale: { min: 1, max: 10, step: 0.5 },
  samplers: ["flow-dpm-solver"],
  supportsNegativePrompt: true,
  supportsImageToVideo: true,
};

/** Exact catalog id -> capabilities. */
const BY_MODEL_ID: Readonly<Record<string, ModelCapabilities>> = {
  // Image
  "realvisxl-v5": SDXL_IMAGE,
  "juggernaut-xl-v9": SDXL_IMAGE,
  "sana-1.6b-1024": SANA_1024,
  "sana-1.6b-int4": SANA_1024,
  "sana-1.6b-2k": SANA_2K,
  "sana-1.6b-4k": SANA_4K,
  "sana-sprint-1024": SANA_SPRINT,
  // Video
  "wan2.1-t2v-1.3b": WAN_21_T2V,
  "wan2.2-ti2v-5b": WAN_22_TI2V,
  "sana-video-2b-720p": SANA_VIDEO,
  "longcat-video-avatar-1.5": LONGCAT_AVATAR,
};

/**
 * Family fallback for a catalog model with no entry above.
 *
 * Deliberately conservative: an unknown model gets the narrow, universally
 * safe option set rather than everything, so a catalog addition can never
 * re-introduce an offer the backend rejects.
 */
const BY_FAMILY: Readonly<Record<string, ModelCapabilities>> = {
  sdxl: SDXL_IMAGE,
  sana: SANA_1024,
  "sana-sprint": SANA_SPRINT,
  wan: WAN_21_T2V,
  "sana-video": SANA_VIDEO,
  longcat: LONGCAT_AVATAR,
};

const FALLBACK_IMAGE: ImageModelCapabilities = {
  kind: "image",
  resolutions: [SQUARE_1024, SQUARE_768, SQUARE_512],
  dimension: { min: SIDECAR_MIN_IMAGE_DIMENSION, max: 1024, step: 8 },
  steps: { min: 1, max: 50, step: 1 },
  cfgScale: { min: 1, max: 20, step: 0.5 },
  samplers: [],
  supportsFastPreview: false,
  supportsNegativePrompt: true,
  supportsLoras: false,
  supportsControlNet: false,
  supportsImageInput: false,
};

const FALLBACK_VIDEO: VideoModelCapabilities = {
  kind: "video",
  resolutions: [VIDEO_480P],
  durationsSeconds: [2, 3, 4],
  fps: [24],
  maxFrames: 81,
  steps: { min: 10, max: 40, step: 1 },
  cfgScale: { min: 1, max: 12, step: 0.5 },
  samplers: [],
  supportsNegativePrompt: true,
  supportsImageToVideo: false,
};

/**
 * True when `modelId` has an EXPLICIT entry, not a family or floor fallback.
 *
 * The fallbacks are deliberately safe, which is also what makes them easy to
 * ship by accident: a catalog model nobody described still produces a working
 * form. `modelCapabilities.test.ts` uses this to fail when a new image or
 * video model arrives with no entry, so the silence is caught at build time
 * rather than by a user meeting an unexpectedly narrow option list.
 */
export function hasExplicitCapabilities(
  modelId: string,
  kind: "image" | "video",
): boolean {
  const exact = BY_MODEL_ID[modelId];
  return Boolean(exact && exact.kind === kind);
}

/** Capabilities for `modelId`, by exact id, then family, then a safe floor. */
export function capabilitiesFor(
  modelId: string | undefined,
  kind: "image" | "video",
  family?: string,
): ModelCapabilities {
  const exact = modelId ? BY_MODEL_ID[modelId] : undefined;
  if (exact && exact.kind === kind) return exact;
  // Fall back on the family prefix of the id ("sana-sprint-1024" -> sana-sprint)
  // before the coarse catalog family, so a sprint id never lands on plain SANA.
  const candidates = [family, ...derivedFamilies(modelId)].filter(Boolean) as string[];
  for (const candidate of candidates) {
    const hit = BY_FAMILY[candidate];
    if (hit && hit.kind === kind) return hit;
  }
  return kind === "image" ? FALLBACK_IMAGE : FALLBACK_VIDEO;
}

/** Longest-first family guesses from a hyphenated model id. */
function derivedFamilies(modelId: string | undefined): string[] {
  if (!modelId) return [];
  const parts = modelId.split("-");
  const out: string[] = [];
  for (let take = parts.length; take > 0; take -= 1) {
    out.push(parts.slice(0, take).join("-"));
  }
  return out;
}

export function imageCapabilitiesFor(
  modelId: string | undefined,
  family?: string,
): ImageModelCapabilities {
  return capabilitiesFor(modelId, "image", family) as ImageModelCapabilities;
}

export function videoCapabilitiesFor(
  modelId: string | undefined,
  family?: string,
): VideoModelCapabilities {
  return capabilitiesFor(modelId, "video", family) as VideoModelCapabilities;
}

/** The note explaining why `field` is limited or disabled, when there is one. */
export function capabilityNote(
  caps: ModelCapabilities,
  field: string,
): string | undefined {
  return caps.notes?.[field];
}

/** Clamp a number into a range, honouring its step granularity. */
export function clampToRange(value: number, range: NumericRange): number {
  const step = range.step ?? 1;
  const bounded = Math.min(range.max, Math.max(range.min, value));
  const snapped = Math.round(bounded / step) * step;
  return Math.min(range.max, Math.max(range.min, snapped));
}

/**
 * Pull a model's settings back inside what it supports.
 *
 * Called whenever the selected model changes, so switching from SDXL at 2048
 * to SANA Sprint cannot leave an unsupported size in the form and fail at
 * submit. Returns only the fields that had to move, plus a human list of what
 * changed so the UI can say so instead of silently rewriting the user's input.
 */
export function reconcileImageValues(
  values: { width: number; height: number; steps: number; cfgScale: number; fastPreview?: boolean },
  caps: ImageModelCapabilities,
): { patch: Partial<typeof values>; changed: string[] } {
  const patch: Partial<typeof values> = {};
  const changed: string[] = [];

  const fits = caps.resolutions.some(
    (r) => r.width === values.width && r.height === values.height,
  );
  if (!fits) {
    const width = clampToRange(values.width, caps.dimension);
    const height = clampToRange(values.height, caps.dimension);
    if (width !== values.width || height !== values.height) {
      const target = caps.resolutions[0];
      patch.width = target ? target.width : width;
      patch.height = target ? target.height : height;
      changed.push(`size set to ${patch.width} x ${patch.height}`);
    }
  }

  const steps = clampToRange(values.steps, caps.steps);
  if (steps !== values.steps) {
    patch.steps = steps;
    changed.push(`steps set to ${steps}`);
  }

  if (caps.cfgScale) {
    const cfg = clampToRange(values.cfgScale, caps.cfgScale);
    if (cfg !== values.cfgScale) {
      patch.cfgScale = cfg;
      changed.push(`CFG scale set to ${cfg}`);
    }
  }

  if (values.fastPreview && !caps.supportsFastPreview) {
    patch.fastPreview = false;
    changed.push("one-step draft turned off");
  }

  return { patch, changed };
}

/** The video equivalent: duration, fps and resolution back inside range. */
export function reconcileVideoValues(
  values: { width: number; height: number; durationSeconds: number; fps: number; steps: number },
  caps: VideoModelCapabilities,
): { patch: Partial<typeof values>; changed: string[] } {
  const patch: Partial<typeof values> = {};
  const changed: string[] = [];

  const fits = caps.resolutions.some(
    (r) => r.width === values.width && r.height === values.height,
  );
  if (!fits) {
    const target = caps.resolutions[0];
    if (target) {
      patch.width = target.width;
      patch.height = target.height;
      changed.push(`resolution set to ${target.label}`);
    }
  }

  if (!caps.fps.includes(values.fps)) {
    const target = caps.fps[caps.fps.length - 1];
    if (typeof target === "number") {
      patch.fps = target;
      changed.push(`frame rate set to ${target} fps`);
    }
  }

  const fps = patch.fps ?? values.fps;
  const allowed = allowedDurations(caps, fps);
  if (!allowed.includes(values.durationSeconds)) {
    const target = nearestDuration(values.durationSeconds, allowed);
    if (target !== null) {
      patch.durationSeconds = target;
      changed.push(`duration set to ${target} s`);
    }
  }

  const steps = clampToRange(values.steps, caps.steps);
  if (steps !== values.steps) {
    patch.steps = steps;
    changed.push(`steps set to ${steps}`);
  }

  return { patch, changed };
}

/**
 * Durations this model can actually render at `fps`.
 *
 * A clip is frames, not seconds: 5 s at 24 fps is 120 frames, which a
 * 81-frame model cannot do. The dropdown therefore narrows as fps rises,
 * instead of offering a length that will fail after ten minutes of work.
 */
export function allowedDurations(
  caps: VideoModelCapabilities,
  fps: number,
): readonly number[] {
  if (!fps || fps <= 0) return caps.durationsSeconds;
  const fitting = caps.durationsSeconds.filter(
    (seconds) => Math.round(seconds * fps) <= caps.maxFrames,
  );
  // Never return an empty dropdown: the shortest option is always offered.
  if (fitting.length > 0) return fitting;
  const shortest = caps.durationsSeconds[0];
  return typeof shortest === "number" ? [shortest] : [];
}

function nearestDuration(value: number, allowed: readonly number[]): number | null {
  if (allowed.length === 0) return null;
  return allowed.reduce((best, candidate) =>
    Math.abs(candidate - value) < Math.abs(best - value) ? candidate : best,
  );
}
