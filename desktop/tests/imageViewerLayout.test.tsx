/**
 * v2.4.11 -- the image viewer's layout contract.
 *
 * Two operator asks, both about where things sit rather than what they do:
 * the editing controls are centred in the toolbar, and the "which version?"
 * prompt is centred and only as wide as its own content (it was a fixed 18rem
 * box with left-aligned text). jsdom cannot paint, but it reports the inline
 * styles that decide both, which is exactly what regressed.
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ImageViewer } from "../src/shared/studio/ImageViewer";

afterEach(cleanup);

const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function open(): void {
  render(
    <ImageViewer
      src={PNG}
      alt="Generated image"
      downloadName="nexus-test"
      onClose={() => {}}
      testId="viewer"
    />,
  );
}

describe("image viewer toolbar", () => {
  it("centres the editing controls", () => {
    open();
    const toolbar = screen.getByTestId("viewer-toolbar");
    expect(toolbar.style.justifyContent).toBe("center");
    // Copy / Save / Close are taken out of the flow so their width cannot
    // pull the centred group off centre.
    const pinned = screen.getByTestId("viewer-close").parentElement;
    expect(pinned?.style.position).toBe("absolute");
    expect(pinned?.style.right).not.toBe("");
  });
});

describe("save-version prompt", () => {
  it("centres its text and buttons and fits its content", () => {
    open();
    // An untouched image saves straight through; a mark makes the viewer ask
    // which version, which is the dialog under test.
    fireEvent.change(screen.getByTestId("viewer-brightness"), {
      target: { value: "120" },
    });
    fireEvent.click(screen.getByTestId("viewer-save"));

    const box = screen.getByTestId("viewer-choice-edited").parentElement
      ?.parentElement as HTMLElement;
    expect(box.style.width).toBe("max-content");
    expect(box.style.alignItems).toBe("center");
    const buttons = screen.getByTestId("viewer-choice-edited")
      .parentElement as HTMLElement;
    expect(buttons.style.justifyContent).toBe("center");
  });
});
