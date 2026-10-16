import { z } from "zod";

export const IMAGE_EDIT_LIMITS = Object.freeze({
  serializedBytes: 8 * 1024 * 1024,
  commands: 1000,
  strokePoints: 100000,
  textCharacters: 4096,
  width: 2048,
  height: 2048,
  pixels: 4194304,
});

export const IMAGE_ADJUSTMENT_RANGES = Object.freeze({
  brightness: [20, 200] as const,
  contrast: [20, 200] as const,
  saturation: [0, 200] as const,
  sharpness: [0, 100] as const,
});

// The viewer's brush slider is 1-64 and it draws text at four times the brush size.
export const IMAGE_MARK_SIZE_RANGES = Object.freeze({
  stroke: [1, 64] as const,
  text: [4, 256] as const,
});

export const NEUTRAL_IMAGE_ADJUSTMENTS = Object.freeze({
  brightness: 100, contrast: 100, saturation: 100, sharpness: 0,
});

export type ImageEditErrorCode =
  | "INVALID_RECIPE" | "LIMIT_EXCEEDED" | "REVISION_CONFLICT"
  | "NO_UNDO" | "NO_REDO" | "FORBIDDEN" | "IMAGE_NOT_FOUND"
  | "SOURCE_CHANGED" | "UNSUPPORTED_SOURCE" | "STORAGE_UNAVAILABLE";

export class ImageEditError extends Error {
  constructor(readonly code: ImageEditErrorCode, message: string) {
    super(message);
    this.name = "ImageEditError";
  }
}

const finite = z.number().finite();
const coordinate = finite.min(0).max(2048);
const color = z.string().regex(/^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
const strokeSize = finite.min(IMAGE_MARK_SIZE_RANGES.stroke[0]).max(IMAGE_MARK_SIZE_RANGES.stroke[1]);
const textSize = finite.min(IMAGE_MARK_SIZE_RANGES.text[0]).max(IMAGE_MARK_SIZE_RANGES.text[1]);
const identitySchema = z.object({
  studioSessionId: z.string().min(1).max(256),
  studioTurnId: z.string().min(1).max(256),
  sourceSha256: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();
const adjustmentSchema = z.object({
  brightness: finite.min(20).max(200),
  contrast: finite.min(20).max(200),
  saturation: finite.min(0).max(200),
  sharpness: finite.min(0).max(100),
}).strict();
const pointSchema = z.object({ x: coordinate, y: coordinate }).strict();
const markSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("stroke"), color, size: strokeSize,
    points: z.array(pointSchema).min(1).max(IMAGE_EDIT_LIMITS.strokePoints),
  }).strict(),
  z.object({
    kind: z.literal("text"), color, size: textSize,
    text: z.string().min(1).max(IMAGE_EDIT_LIMITS.textCharacters),
    x: coordinate, y: coordinate,
  }).strict(),
]);
const committedCommandSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("adjustments"), values: adjustmentSchema }).strict(),
  z.object({ kind: z.literal("mark"), mark: markSchema }).strict(),
  z.object({ kind: z.literal("reset") }).strict(),
]);
const actionSchema = z.union([
  committedCommandSchema,
  z.object({ kind: z.literal("undo") }).strict(),
  z.object({ kind: z.literal("redo") }).strict(),
]);
const recipeSchema = z.object({
  schemaVersion: z.literal(1), identity: identitySchema,
  width: z.number().int().min(1).max(IMAGE_EDIT_LIMITS.width),
  height: z.number().int().min(1).max(IMAGE_EDIT_LIMITS.height),
  revision: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  commands: z.array(committedCommandSchema).max(IMAGE_EDIT_LIMITS.commands),
  cursor: z.number().int().min(0).max(IMAGE_EDIT_LIMITS.commands),
}).strict();

export type ImageEditIdentity = z.infer<typeof identitySchema>;
export type ImageAdjustments = z.infer<typeof adjustmentSchema>;
export type EditMark = z.infer<typeof markSchema>;
export type ImageEditCommand = z.infer<typeof committedCommandSchema>;
export type ImageEditAction = z.infer<typeof actionSchema>;
export type ImageEditRecipe = z.infer<typeof recipeSchema>;
export interface ImageEditState {
  readonly adjustments: ImageAdjustments;
  readonly marks: readonly EditMark[];
}

function invalid(issues: readonly { code: string }[]): never {
  if (issues.some((issue) => issue.code === "too_big")) {
    throw new ImageEditError("LIMIT_EXCEEDED", "The edit exceeds an image recipe limit.");
  }
  throw new ImageEditError("INVALID_RECIPE", "The image edit contains invalid or unsupported data.");
}

export function parseImageEditRecipe(input: unknown): ImageEditRecipe {
  let serialized: string | undefined;
  try { serialized = JSON.stringify(input); } catch {
    throw new ImageEditError("INVALID_RECIPE", "The image recipe must be serializable.");
  }
  if (serialized === undefined) throw new ImageEditError("INVALID_RECIPE", "Missing image recipe.");
  if (new TextEncoder().encode(serialized).byteLength > IMAGE_EDIT_LIMITS.serializedBytes) {
    throw new ImageEditError("LIMIT_EXCEEDED", "The image recipe exceeds 8 MiB.");
  }
  const parsed = recipeSchema.safeParse(input);
  if (!parsed.success) invalid(parsed.error.issues);
  const recipe = parsed.data;
  if (recipe.cursor > recipe.commands.length || recipe.width * recipe.height > IMAGE_EDIT_LIMITS.pixels) {
    throw new ImageEditError("INVALID_RECIPE", "The image recipe has invalid dimensions or history.");
  }
  let points = 0;
  for (const command of recipe.commands) {
    if (command.kind !== "mark") continue;
    const mark = command.mark;
    const coordinates = mark.kind === "stroke" ? mark.points : [mark];
    if (coordinates.some((point) => point.x > recipe.width || point.y > recipe.height)) {
      throw new ImageEditError("INVALID_RECIPE", "A mark lies outside its source image.");
    }
    if (mark.kind === "stroke") points += mark.points.length;
  }
  if (points > IMAGE_EDIT_LIMITS.strokePoints) {
    throw new ImageEditError("LIMIT_EXCEEDED", "Retained history exceeds 100000 stroke points.");
  }
  return recipe;
}

export function createImageEditRecipe(identity: ImageEditIdentity, width: number, height: number): ImageEditRecipe {
  return parseImageEditRecipe({ schemaVersion: 1, identity, width, height, revision: 0, commands: [], cursor: 0 });
}

export function deriveImageEditState(input: ImageEditRecipe): ImageEditState {
  const recipe = parseImageEditRecipe(input);
  let adjustments: ImageAdjustments = { ...NEUTRAL_IMAGE_ADJUSTMENTS };
  let marks: EditMark[] = [];
  for (const command of recipe.commands.slice(0, recipe.cursor)) {
    if (command.kind === "adjustments") adjustments = { ...command.values };
    else if (command.kind === "mark") marks.push(command.mark);
    else {
      adjustments = { ...NEUTRAL_IMAGE_ADJUSTMENTS };
      marks = [];
    }
  }
  return { adjustments, marks };
}

export function reduceImageEditRecipe(input: ImageEditRecipe, actionInput: unknown, expectedRevision: number): ImageEditRecipe {
  const recipe = parseImageEditRecipe(input);
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision !== recipe.revision) {
    throw new ImageEditError("REVISION_CONFLICT", "The image was changed by another editor. Reload its recipe.");
  }
  const parsed = actionSchema.safeParse(actionInput);
  if (!parsed.success) invalid(parsed.error.issues);
  const action = parsed.data;
  const revision = recipe.revision + 1;
  if (action.kind === "undo") {
    if (recipe.cursor === 0) throw new ImageEditError("NO_UNDO", "No committed edit can be undone.");
    return parseImageEditRecipe({ ...recipe, revision, cursor: recipe.cursor - 1 });
  }
  if (action.kind === "redo") {
    if (recipe.cursor === recipe.commands.length) throw new ImageEditError("NO_REDO", "No committed edit can be redone.");
    return parseImageEditRecipe({ ...recipe, revision, cursor: recipe.cursor + 1 });
  }
  // A proposed branch never mutates the prior recipe; persistence decides commit.
  const commands = [...recipe.commands.slice(0, recipe.cursor), action];
  return parseImageEditRecipe({ ...recipe, revision, commands, cursor: commands.length });
}

export function imageEditCapabilities(recipe: ImageEditRecipe) {
  const validated = parseImageEditRecipe(recipe);
  return {
    revision: validated.revision, ranges: IMAGE_ADJUSTMENT_RANGES, markSizes: IMAGE_MARK_SIZE_RANGES,
    values: deriveImageEditState(validated).adjustments,
    canUndo: validated.cursor > 0, canRedo: validated.cursor < validated.commands.length,
    limits: IMAGE_EDIT_LIMITS,
  };
}
