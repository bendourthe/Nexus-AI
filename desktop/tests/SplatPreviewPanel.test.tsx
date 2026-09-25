import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SPLAT_HONESTY_COPY } from "../../core/image/SplatProvenance";
import { SplatPreviewPanel } from "../src/modules/image/SplatPreviewPanel";
import { resetSplatContexts } from "../src/modules/image/splatRaster";

function splatBytes(): Uint8Array {
  return new Uint8Array(32);
}

afterEach(() => {
  cleanup();
  resetSplatContexts();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("SplatPreviewPanel", () => {
  it("shows honesty copy, keeps generate disabled, and rejects a remote path without fetching", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    render(
      <SplatPreviewPanel
        sourceMessageId="msg-1"
        sourcePngName="nexus-image-msg-1.png"
        openLocalSplat={async () => ({ path: "https://3daistudio.com/a.splat", bytes: splatBytes(), format: "splat" })}
        onClose={() => undefined}
      />,
    );
    expect(screen.getByText(SPLAT_HONESTY_COPY)).toBeTruthy();
    expect(screen.getByRole("button", { name: "3D generate coming from local backend" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "3D generate coming from local backend" })).toHaveAttribute(
      "title",
      "generator not wired",
    );
    fireEvent.click(screen.getByRole("button", { name: "Open local splat" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/local file/i);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("downloads a splat name that is not the source PNG and leaves bytes alone when the screenshot fails", async () => {
    const bytes = splatBytes();
    const saved: string[] = [];
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/png;base64,aaa");
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    render(
      <SplatPreviewPanel
        sourceMessageId="msg-2"
        sourcePngName="nexus-image-msg-2.png"
        openLocalSplat={async () => ({
          path: "C:/images/preview.splat",
          bytes,
          format: "splat",
          sourceImageHash: "abc",
        })}
        onClose={() => undefined}
        onSaveSplat={(name, payload) => {
          saved.push(name);
          expect(payload).toBe(bytes);
        }}
        onSaveScreenshot={() => {
          throw new Error("disk full");
        }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open local splat" }));
    expect(await screen.findByTestId("splat-preview-file-msg-2")).toHaveTextContent("nexus-image-msg-2-msg-2.splat");
    fireEvent.click(screen.getByRole("button", { name: "Download splat" }));
    expect(saved).toEqual(["nexus-image-msg-2-msg-2.splat"]);
    expect(saved[0]).not.toBe("nexus-image-msg-2.png");
    fireEvent.click(screen.getByRole("button", { name: "Save PNG preview" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/splat file was not changed/i);
    expect(bytes.byteLength).toBe(32);
  });

  it("binds each open panel to its own message", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    render(
      <>
        <SplatPreviewPanel
          sourceMessageId="left"
          sourcePngName="left.png"
          openLocalSplat={async (id) => ({ path: `C:/${id}.splat`, bytes: splatBytes(), format: "splat" })}
          onClose={() => undefined}
        />
        <SplatPreviewPanel
          sourceMessageId="right"
          sourcePngName="right.png"
          openLocalSplat={async (id) => ({ path: `C:/${id}.splat`, bytes: splatBytes(), format: "splat" })}
          onClose={() => undefined}
        />
      </>,
    );
    const dialogs = screen.getAllByRole("dialog");
    fireEvent.click(within(dialogs[0]!).getByRole("button", { name: "Open local splat" }));
    fireEvent.click(within(dialogs[1]!).getByRole("button", { name: "Open local splat" }));
    expect(await screen.findByTestId("splat-preview-file-left")).toHaveTextContent("left-left.splat");
    expect(screen.getByTestId("splat-preview-file-right")).toHaveTextContent("right-right.splat");
    expect(screen.getByTestId("splat-preview-file-left")).not.toHaveTextContent("right-right");
  });

  it("honors reduced motion on the preview canvas", async () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
    );
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    render(
      <SplatPreviewPanel
        sourceMessageId="still"
        sourcePngName="still.png"
        openLocalSplat={async () => ({ path: "C:/still.splat", bytes: splatBytes(), format: "splat" })}
        onClose={() => undefined}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open local splat" }));
    expect(await screen.findByTestId("splat-viewer")).toHaveAttribute("data-reduced-motion", "true");
  });

  it("reads a picked local file without a sidecar reader", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    render(
      <SplatPreviewPanel sourceMessageId="picked" sourcePngName="picked.png" onClose={() => undefined} />,
    );
    const input = screen.getByTestId("splat-file-picked");
    const raw = splatBytes();
    const copy = new ArrayBuffer(raw.byteLength);
    new Uint8Array(copy).set(raw);
    const file = new File([copy], "room.splat");
    fireEvent.change(input, { target: { files: [file] } });
    expect(await screen.findByTestId("splat-preview-file-picked")).toHaveTextContent("picked-picked.splat");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
