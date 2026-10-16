/**
 * v2.13.0 Phase 5 -- the Image Studio viewer over durable edits.
 *
 * The fake sidecar below runs the real shared reducer from core/image, so a
 * passing test means the viewer issues the same commands the sidecar stores.
 * jsdom cannot paint, so pixel equality lives in the WebView pixel check
 * (docs/releases/v2/v2.13/development/v2.13.0-phase5-evidence.md).
 */

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createImageEditRecipe,
  deriveImageEditState,
  reduceImageEditRecipe,
  type ImageEditRecipe,
} from "../../core/image/ImageEditRecipe";
import { ImageViewer } from "../src/shared/studio/ImageViewer";
import {
  toImageEditError,
  type DurableImageEdit,
} from "../src/shared/studio/imageEditClient";

afterEach(cleanup);

const PNG_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGP4DwQACfsD/fteaysAAAAASUVORK5CYII=";
const identity = { studioSessionId: "session-1", studioTurnId: "turn-1", sourceSha256: "a".repeat(64) };

/** A stand-in for the sidecar: one stored recipe, the real reducer, real CAS. */
class FakeSidecar {
  recipe: ImageEditRecipe = createImageEditRecipe(identity, 2048, 2048);
  commits: unknown[] = [];
  failNext: string | null = null;
  hold: Promise<void> | null = null;
  closed: string[] = [];
  private grants = 0;

  edit(): DurableImageEdit {
    return {
      open: async () => ({ grantId: `grant-${(this.grants += 1)}`, identity, recipe: this.recipe, png: PNG_B64 }),
      commit: async (_grant, action, expected) => {
        if (this.hold) await this.hold;
        if (this.failNext) {
          const message = this.failNext;
          this.failNext = null;
          throw toImageEditError(message);
        }
        try {
          this.recipe = reduceImageEditRecipe(this.recipe, action, expected);
        } catch (error) {
          const code = (error as { code: string }).code;
          throw toImageEditError(`${code}: ${(error as Error).message}`);
        }
        this.commits.push(action);
        return this.recipe;
      },
      revision: async () => this.recipe.revision,
      close: async (grant) => {
        this.closed.push(grant);
      },
    };
  }
}

function renderViewer(edit: DurableImageEdit | undefined, onClose = vi.fn()) {
  render(
    <ImageViewer src="data:image/png;base64,AAAA" onClose={onClose} testId="viewer" {...(edit ? { durable: edit } : {})} />,
  );
  return onClose;
}

async function ready(): Promise<void> {
  await waitFor(() => expect(screen.getByTestId("viewer-save-status")).toHaveTextContent("Edits saved"));
}

function drawStroke(): void {
  fireEvent.click(screen.getByTestId("viewer-brush"));
  const overlay = screen.getByTestId("viewer-overlay");
  overlay.setPointerCapture = vi.fn();
  fireEvent.pointerDown(overlay, { clientX: 10, clientY: 10, pointerId: 1 });
  fireEvent.pointerMove(overlay, { clientX: 20, clientY: 30, pointerId: 1 });
  fireEvent.pointerUp(overlay, { pointerId: 1 });
}

describe("durable image viewer", () => {
  it("shows the saved source bytes and commits a slider drag once, on release", async () => {
    const sidecar = new FakeSidecar();
    renderViewer(sidecar.edit());
    await ready();
    expect(screen.getByTestId("viewer-image")).toHaveAttribute("src", `data:image/png;base64,${PNG_B64}`);
    const slider = screen.getByTestId("viewer-brightness");
    fireEvent.change(slider, { target: { value: "120" } });
    fireEvent.change(slider, { target: { value: "140" } });
    fireEvent.change(slider, { target: { value: "160" } });
    expect(sidecar.commits).toHaveLength(0);
    fireEvent.pointerUp(slider);
    await ready();
    expect(sidecar.commits).toEqual([
      { kind: "adjustments", values: { brightness: 160, contrast: 100, saturation: 100, sharpness: 0 } },
    ]);
    expect(slider).toHaveValue("160");
  });

  it("restores values, marks and history on reopen, with undo and redo across both", async () => {
    const sidecar = new FakeSidecar();
    renderViewer(sidecar.edit());
    await ready();
    fireEvent.change(screen.getByTestId("viewer-contrast"), { target: { value: "150" } });
    fireEvent.pointerUp(screen.getByTestId("viewer-contrast"));
    await ready();
    drawStroke();
    await ready();
    expect(deriveImageEditState(sidecar.recipe).marks).toHaveLength(1);
    cleanup();

    renderViewer(sidecar.edit());
    await ready();
    expect(screen.getByTestId("viewer-contrast")).toHaveValue("150");
    fireEvent.click(screen.getByTestId("viewer-undo"));
    await ready();
    expect(deriveImageEditState(sidecar.recipe).marks).toHaveLength(0);
    fireEvent.click(screen.getByTestId("viewer-undo"));
    await ready();
    expect(screen.getByTestId("viewer-contrast")).toHaveValue("100");
    fireEvent.click(screen.getByTestId("viewer-redo"));
    await ready();
    expect(screen.getByTestId("viewer-contrast")).toHaveValue("150");
    // A new edit after undo drops the redo branch.
    fireEvent.click(screen.getByTestId("viewer-reset"));
    await ready();
    expect(screen.getByTestId("viewer-redo")).toBeDisabled();
    expect(sidecar.recipe.commands.map((c) => c.kind)).toEqual(["adjustments", "reset"]);
  });

  it("never claims Saved while a write is pending, and close waits for it", async () => {
    const sidecar = new FakeSidecar();
    let release!: () => void;
    sidecar.hold = new Promise<void>((resolve) => { release = resolve; });
    const onClose = renderViewer(sidecar.edit());
    await ready();
    drawStroke();
    expect(screen.getByTestId("viewer-save-status")).toHaveTextContent("Saving...");
    fireEvent.click(screen.getByTestId("viewer-close"));
    expect(onClose).not.toHaveBeenCalled();
    await act(async () => { release(); });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(sidecar.commits).toHaveLength(1);
  });

  it("rolls back a blocked write, keeps the viewer open, and saves on Retry", async () => {
    const sidecar = new FakeSidecar();
    const onClose = renderViewer(sidecar.edit());
    await ready();
    sidecar.failNext = "STORAGE_UNAVAILABLE: Image edits could not be stored. Retry or reload.";
    fireEvent.change(screen.getByTestId("viewer-saturation"), { target: { value: "40" } });
    fireEvent.pointerUp(screen.getByTestId("viewer-saturation"));
    await waitFor(() => expect(screen.getByTestId("viewer-save-status")).toHaveTextContent("Not saved"));
    expect(screen.getByTestId("viewer-saturation")).toHaveValue("100");
    fireEvent.click(screen.getByTestId("viewer-close"));
    await act(async () => {});
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("viewer-save-status-retry"));
    await ready();
    expect(screen.getByTestId("viewer-saturation")).toHaveValue("40");
    expect(sidecar.recipe.revision).toBe(1);
  });

  it("reports a conflict from another editor and reloads the authoritative recipe", async () => {
    const sidecar = new FakeSidecar();
    renderViewer(sidecar.edit());
    await ready();
    // Another editor commits first.
    sidecar.recipe = reduceImageEditRecipe(sidecar.recipe, { kind: "adjustments", values: { brightness: 50, contrast: 100, saturation: 100, sharpness: 0 } }, 0);
    drawStroke();
    await waitFor(() => expect(screen.getByTestId("viewer-save-status")).toHaveTextContent("changed somewhere else"));
    fireEvent.click(screen.getByTestId("viewer-save-status-reload"));
    await ready();
    expect(screen.getByTestId("viewer-brightness")).toHaveValue("50");
    expect(sidecar.recipe.revision).toBe(1);
  });

  it("falls back to in-memory editing with a visible notice when the image cannot be saved", async () => {
    const edit: DurableImageEdit = {
      open: async () => { throw toImageEditError("LIMIT_EXCEEDED: Source image exceeds the decoded size limit."); },
      commit: vi.fn(), revision: vi.fn(), close: vi.fn(),
    };
    renderViewer(edit);
    await waitFor(() => expect(screen.getByTestId("viewer-save-status")).toHaveTextContent("Edits to this image are not saved"));
    expect(screen.getByTestId("viewer-image")).toHaveAttribute("src", "data:image/png;base64,AAAA");
    drawStroke();
    expect(screen.getByTestId("viewer-undo")).not.toBeDisabled();
    expect(edit.commit).not.toHaveBeenCalled();
  });

  it("keeps Chat attachments in memory with no saved-state line", () => {
    renderViewer(undefined);
    expect(screen.queryByTestId("viewer-save-status")).toBeNull();
    drawStroke();
    expect(screen.getByTestId("viewer-undo")).not.toBeDisabled();
  });

  it("releases its grant when the viewer closes", async () => {
    const sidecar = new FakeSidecar();
    renderViewer(sidecar.edit());
    await ready();
    cleanup();
    await waitFor(() => expect(sidecar.closed).toEqual(["grant-1"]));
  });
});
