import { describe, expect, it } from "vitest";
import {
  createImageEditRecipe, deriveImageEditState, IMAGE_EDIT_LIMITS, imageEditCapabilities,
  parseImageEditRecipe, reduceImageEditRecipe, type ImageEditRecipe,
} from "../../../../core/image/ImageEditRecipe.js";

const identity = { studioSessionId: "session-one", studioTurnId: "image-one", sourceSha256: "a".repeat(64) };
const initial = () => createImageEditRecipe(identity, 2048, 2048);
const adjustment = { kind: "adjustments", values: { brightness: 120, contrast: 140, saturation: 80, sharpness: 25 } };
const stroke = { kind: "mark", mark: { kind: "stroke", color: "#ff0000", size: 8, points: [{ x: 2, y: 3 }, { x: 4, y: 5 }] } };
const text = { kind: "mark", mark: { kind: "text", color: "#fff", size: 32, text: "Nexus", x: 6, y: 7 } };
const apply = (recipe: ImageEditRecipe, action: unknown) => reduceImageEditRecipe(recipe, action, recipe.revision);

describe("bounded image edit recipe", () => {
  it("undoes and redoes adjustments, marks and reset in one retained history", () => {
    const base = initial();
    const adjusted = apply(base, adjustment);
    const painted = apply(apply(adjusted, stroke), text);
    expect(deriveImageEditState(painted)).toEqual({ adjustments: adjustment.values, marks: [stroke.mark, text.mark] });
    const reset = apply(painted, { kind: "reset" });
    expect(deriveImageEditState(reset)).toEqual({ adjustments: { brightness: 100, contrast: 100, saturation: 100, sharpness: 0 }, marks: [] });
    const undone = apply(reset, { kind: "undo" });
    expect(deriveImageEditState(undone)).toEqual(deriveImageEditState(painted));
    expect(undone.commands).toHaveLength(4);
    expect(imageEditCapabilities(undone).canRedo).toBe(true);
    const redone = apply(undone, { kind: "redo" });
    expect(deriveImageEditState(redone)).toEqual(deriveImageEditState(reset));
    expect(redone.revision).toBe(6);
    expect(base.commands).toEqual([]);
  });

  it("branches redo only on a valid proposed command and never mutates the prior state", () => {
    const previous = apply(apply(initial(), adjustment), { kind: "undo" });
    const snapshot = JSON.stringify(previous);
    expect(() => apply(previous, { kind: "adjustments", values: { ...adjustment.values, sharpness: NaN } })).toThrow();
    expect(JSON.stringify(previous)).toBe(snapshot);
    expect(imageEditCapabilities(previous).canRedo).toBe(true);
    const next = apply(previous, stroke);
    expect(next.commands).toEqual([stroke]);
    expect(imageEditCapabilities(next).canRedo).toBe(false);
    expect(JSON.stringify(previous)).toBe(snapshot);
  });

  it("refuses stale revisions and unavailable undo/redo", () => {
    expect(() => reduceImageEditRecipe(initial(), adjustment, 1)).toThrow("another editor");
    expect(() => apply(initial(), { kind: "undo" })).toThrow("undone");
    expect(() => apply(initial(), { kind: "redo" })).toThrow("redone");
  });

  it.each([
    { kind: "adjustments", values: { ...adjustment.values, brightness: 19 } },
    { kind: "adjustments", values: { ...adjustment.values, contrast: Infinity } },
    { kind: "adjustments", values: { ...adjustment.values, saturation: -1 } },
    { kind: "adjustments", values: { ...adjustment.values, sharpness: 101 } },
    { ...stroke, mark: { ...stroke.mark, color: "#abcde" } },
    { ...stroke, mark: { ...stroke.mark, points: [{ x: -1, y: 0 }] } },
    { ...text, mark: { ...text.mark, text: "x".repeat(4097) } },
    { ...stroke, mark: { ...stroke.mark, size: 0.5 } },
    { ...stroke, mark: { ...stroke.mark, size: 65 } },
    { ...text, mark: { ...text.mark, size: 3 } },
    { ...text, mark: { ...text.mark, size: 257 } },
    { kind: "unknown" },
  ])("refuses malformed/out-of-range commands", (action) => {
    expect(() => apply(initial(), action)).toThrow();
  });

  it("accepts the viewer's brush and text size bounds and reports them as capabilities", () => {
    for (const size of [1, 64]) expect(() => apply(initial(), { ...stroke, mark: { ...stroke.mark, size } })).not.toThrow();
    for (const size of [4, 256]) expect(() => apply(initial(), { ...text, mark: { ...text.mark, size } })).not.toThrow();
    expect(imageEditCapabilities(initial()).markSizes).toEqual({ stroke: [1, 64], text: [4, 256] });
  });

  it("refuses marks outside their actual source dimensions", () => {
    expect(() => apply(createImageEditRecipe(identity, 1, 1), stroke)).toThrow("outside");
  });

  it("bounds all retained commands, including the redo branch", () => {
    const recipe = parseImageEditRecipe({ ...initial(), commands: Array(1000).fill({ kind: "reset" }), cursor: 1000 });
    expect(() => apply(recipe, adjustment)).toThrow("limit");
    const undone = apply(recipe, { kind: "undo" });
    expect(undone.commands).toHaveLength(1000);
    expect(apply(undone, adjustment).commands).toHaveLength(1000);
  });

  it("bounds total stroke points across retained history", () => {
    const mark = { ...stroke.mark, points: Array(50000).fill({ x: 1, y: 1 }) };
    const recipe = apply(apply(initial(), { kind: "mark", mark }), { kind: "mark", mark });
    expect(() => apply(recipe, stroke)).toThrow("100000");
    const undo = apply(recipe, { kind: "undo" });
    expect(() => parseImageEditRecipe({ ...undo, commands: [...undo.commands, stroke] })).toThrow("100000");
  });

  it("bounds serialized UTF-8 bytes and rejects unknown schema/history", () => {
    expect(() => parseImageEditRecipe({ ...initial(), schemaVersion: 2 })).toThrow();
    expect(() => parseImageEditRecipe({ ...initial(), cursor: 1 })).toThrow();
    expect(() => parseImageEditRecipe({ ...initial(), extra: "x".repeat(IMAGE_EDIT_LIMITS.serializedBytes) })).toThrow("8 MiB");
  });

  it("round-trips complete history, cursor and revision without derived-state drift", () => {
    const recipe = apply(apply(apply(initial(), adjustment), text), { kind: "undo" });
    const reopened = parseImageEditRecipe(JSON.parse(JSON.stringify(recipe)));
    expect(reopened).toEqual(recipe);
    expect(deriveImageEditState(reopened)).toEqual({ adjustments: adjustment.values, marks: [] });
    expect(imageEditCapabilities(reopened)).toMatchObject({ canUndo: true, canRedo: true, revision: 3 });
  });
});
