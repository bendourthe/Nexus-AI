/**
 * v1.15.0 Phase 5 (Issue 5) -- MessageBubble media / attachment rendering.
 */

import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { MessageBubble } from "../src/shared/chat/MessageBubble";
import type { ChatMessage } from "../src/shared/chat/types";
import { STUDIO_PENDING_CAPTIONS } from "../src/components/agentState/captionRotator";

afterEach(() => cleanup());

describe("MessageBubble media", () => {
  it("renders user attachments as thumbnails", () => {
    const msg: ChatMessage = {
      id: "u1",
      role: "user",
      content: "edit this",
      attachments: ["data:image/png;base64,AAA"],
    };
    render(<MessageBubble message={msg} />);
    expect(screen.getByTestId("message-attachment-u1-0")).toBeInTheDocument();
  });

  it("renders a generated image for an assistant media message", () => {
    const msg: ChatMessage = {
      id: "a1",
      role: "assistant",
      content: "",
      media: { kind: "image", src: "data:image/png;base64,BBB" },
    };
    render(<MessageBubble message={msg} />);
    expect(
      (screen.getByTestId("message-media-a1") as HTMLImageElement).getAttribute(
        "src",
      ),
    ).toBe("data:image/png;base64,BBB");
    expect(screen.getByTestId("message-media-a1")).toHaveStyle({
      display: "block",
      maxHeight: "40vh",
      objectFit: "contain",
    });
    expect(
      screen.getByTestId("message-media-a1").getAttribute("style") ?? "",
    ).not.toMatch(/min-height:\s*8rem/);
    expect(screen.getByTestId("message-bubble-a1")).toHaveStyle({
      width: "fit-content",
    });
  });

  it("shows a pending indicator with progress", () => {
    const msg: ChatMessage = {
      id: "a2",
      role: "assistant",
      content: "",
      pending: true,
      progress: { step: 1, total: 4 },
    };
    render(<MessageBubble message={msg} />);
    expect(screen.getByTestId("message-pending-a2")).toBeInTheDocument();
    // v2.2.9 T006: chat pending is a rotating-caption pill with one stable name.
    const orb = screen.getByRole("img", { name: "Generating reply" });
    expect(orb).toHaveAttribute("data-orb-size", "bubble");
    expect(orb).toHaveAttribute("data-orb-pill", "true");
    expect(orb.querySelector("canvas")?.style.height).toBe("48px");
    expect(screen.getByTestId("message-pending-a2")).toHaveStyle({
      width: "100%",
    });
    expect(screen.queryByTestId("message-bubble-a2")).toBeNull();
    expect(
      screen.getByText(/^(Thinking|Searching|Working|Solving)\.\.\.$/),
    ).toBeInTheDocument();
    expect(screen.queryByText("Generating...")).toBeNull();
  });

  it("generates with the chat pill animation and the studio word pool", () => {
    // v2.4.8 follow-up (2026-09-08): once the model is loaded, the studios use
    // the same rotating-caption pill Chat and Agents use, with their own words,
    // and keep the step bar under it. The hero orb belongs to loading alone.
    const msg: ChatMessage = {
      id: "studio-pending",
      role: "assistant",
      content: "",
      pending: true,
      activity: "image-generation",
      progress: { step: 1, total: 20, stage: "generating" },
    };
    render(<MessageBubble message={msg} />);
    const orb = screen.getByRole("img", { name: /generating media/i });
    expect(orb).toHaveAttribute("data-orb-size", "bubble");
    expect(orb).toHaveAttribute("data-orb-pill", "true");
    // v2.4.4 Phase 5.3: studio pending rotates Creating / Crafting /
    // Generating; the single static "Shaping" read as a stuck word.
    expect(screen.queryByText("Shaping...")).toBeNull();
    expect(STUDIO_PENDING_CAPTIONS).toContain(
      screen.getByTestId("agent-state-orb-caption").textContent,
    );
    // The counted step, not a leftover load bar, is what the bar reports.
    expect(
      screen
        .getByTestId("model-load-progress-studio-pending")
        .querySelector('[role="progressbar"]'),
    ).toHaveAttribute("aria-valuenow", "5");
    // v2.4.9 operator ask: "When an image or video is generated, the animation
    // should be aligned left, just like in chat and agents mode." The studio
    // pending row no longer centers itself or reserves a 12rem hero block.
    const pendingStyle = screen
      .getByTestId("message-pending-studio-pending")
      .getAttribute("style");
    expect(pendingStyle).not.toContain("min-height: 12rem");
    expect(pendingStyle).toContain("align-items: flex-start");
    expect(pendingStyle).not.toContain("align-items: center");
    expect(screen.queryByTestId("message-bubble-studio-pending")).toBeNull();
  });

  // v2.4.8 Phase 8: operator report 2026-09-07 -- after switching to Images the
  // GPU idled while weights loaded, yet the bubble already read "Creating...".
  it("shows Loading model until the runtime reports generating or a counted step", () => {
    const base: ChatMessage = {
      id: "studio-loading",
      role: "assistant",
      content: "",
      pending: true,
      activity: "image-generation",
    };
    const { rerender } = render(<MessageBubble message={base} />);
    expect(screen.getByRole("img", { name: "Loading model" })).toHaveAttribute(
      "data-orb-size",
      "hero",
    );
    expect(screen.getByTestId("agent-state-orb-caption").textContent).toBe(
      "Loading model...",
    );
    // A heartbeat with no stage keeps loading.
    rerender(
      <MessageBubble
        message={{ ...base, progress: { step: 0, total: 0, stage: "loading" } }}
      />,
    );
    expect(screen.getByTestId("agent-state-orb-caption").textContent).toBe(
      "Loading model...",
    );
    // The runtime's generating stage flips to the studio captions.
    rerender(
      <MessageBubble
        message={{ ...base, progress: { step: 0, total: 0, stage: "generating" } }}
      />,
    );
    expect(screen.queryByText("Loading model...")).toBeNull();
    expect(STUDIO_PENDING_CAPTIONS).toContain(
      screen.getByTestId("agent-state-orb-caption").textContent,
    );
    expect(screen.getByRole("img", { name: /generating media/i })).toHaveAttribute(
      "data-orb-pill",
      "true",
    );
    // So does a counted step even without a stage.
    rerender(<MessageBubble message={{ ...base, progress: { step: 2, total: 20 } }} />);
    expect(screen.queryByText("Loading model...")).toBeNull();
    // Chat pending is untouched: no Loading model on a text reply.
    rerender(
      <MessageBubble
        message={{ id: "chat", role: "assistant", content: "", pending: true }}
      />,
    );
    expect(screen.queryByText("Loading model...")).toBeNull();
  });

  // v2.4.8 follow-up (2026-09-07): a job parked behind another module used to
  // read "Loading model..." for twenty minutes at 0% GPU. The sidecar now says
  // `queued` and names the holder; the runtime reports weight bytes while it
  // really loads, which the bubble renders as a bar with a time estimate.
  it("says Waiting for GPU and names the holder while the job is queued", () => {
    const base: ChatMessage = {
      id: "studio-queued",
      role: "assistant",
      content: "",
      pending: true,
      activity: "image-generation",
    };
    const { rerender } = render(
      <MessageBubble
        message={{
          ...base,
          progress: { step: 0, total: 0, stage: "queued", blockedBy: "chat" },
        }}
      />,
    );
    // Plain words: the caption says what we are waiting for, and a second
    // line says what is still running. No module names in parentheses.
    expect(screen.getByTestId("agent-state-orb-caption").textContent).toBe(
      "Waiting for the GPU to free up...",
    );
    expect(screen.getByTestId("model-queued-detail-studio-queued").textContent).toBe(
      "A chat reply is still being written.",
    );
    expect(screen.getByRole("img", { name: "Waiting for GPU" })).toBeInTheDocument();
    rerender(
      <MessageBubble
        message={{
          ...base,
          progress: { step: 0, total: 0, stage: "queued", blockedBy: "image" },
        }}
      />,
    );
    expect(screen.getByTestId("model-queued-detail-studio-queued").textContent).toBe(
      "Another image is still being generated.",
    );
    rerender(
      <MessageBubble
        message={{ ...base, progress: { step: 0, total: 0, stage: "queued" } }}
      />,
    );
    expect(screen.getByTestId("agent-state-orb-caption").textContent).toBe(
      "Waiting for the GPU to free up...",
    );
    expect(screen.queryByTestId("model-queued-detail-studio-queued")).toBeNull();
  });

  it("renders a byte-level bar with percent and time left while the model loads", () => {
    const base: ChatMessage = {
      id: "studio-bytes",
      role: "assistant",
      content: "",
      pending: true,
      activity: "image-generation",
      // The sampling cost model a studio always attaches; it must stay out of
      // the loading phase's wording entirely.
      estimateSeconds: 60,
    };
    const { rerender } = render(
      <MessageBubble
        message={{
          ...base,
          progress: {
            step: 0,
            total: 0,
            stage: "loading",
            loadedBytes: 2_000,
            totalBytes: 5_000,
            etaS: 12.4,
          },
        }}
      />,
    );
    expect(screen.getByTestId("agent-state-orb-caption").textContent).toBe(
      "Loading model 40%",
    );
    // v2.4.9: the bar is a styled div with the progressbar role, not a raw
    // <progress>, and its width is a fixed track that no longer depends on the
    // caption under it (operator report: "the bar appears at different width
    // during the process").
    const bar = screen
      .getByTestId("model-load-progress-studio-bytes")
      .querySelector('[role="progressbar"]');
    expect(bar).not.toBeNull();
    expect(bar).toHaveAttribute("aria-valuenow", "40");
    expect(bar).toHaveAttribute("data-determinate", "true");
    // Elapsed and time left share ONE row (operator ask).
    expect(
      screen.getByTestId("generation-clock-studio-bytes").textContent,
    ).toContain("about 12 s left");
    // The generation figure never describes the load: while loading, the only
    // estimate on screen is the load's own (operator report: a video read
    // "usually about 18 min" while it was still reading weights).
    expect(screen.queryByText(/generating usually takes/)).toBeNull();
    // Minutes once the estimate passes a minute.
    rerender(
      <MessageBubble
        message={{
          ...base,
          progress: {
            step: 0,
            total: 0,
            stage: "loading",
            loadedBytes: 500,
            totalBytes: 5_000,
            etaS: 150,
          },
        }}
      />,
    );
    expect(screen.getByTestId("agent-state-orb-caption").textContent).toBe(
      "Loading model 10%",
    );
    expect(
      screen.getByTestId("generation-clock-studio-bytes").textContent,
    ).toContain("about 3 min left");
    rerender(
      <MessageBubble
        message={{
          ...base,
          progress: {
            step: 0,
            total: 0,
            stage: "loading",
            loadedBytes: 5_000,
            totalBytes: 5_000,
            etaS: 0,
          },
        }}
      />,
    );
    expect(screen.getByTestId("agent-state-orb-caption").textContent).toBe(
      "Loading model 100%",
    );
    // The generating stage drops the load fraction: a full byte count is not a
    // full sampling bar (operator report: a video showed a full bar the instant
    // sampling began). The bar stays on screen, now indeterminate, because a
    // job with nothing measured yet must still show one (operator screenshots
    // 6 and 7: 37 seconds of bare caption, then a bar with 1 s left).
    rerender(
      <MessageBubble
        message={{
          ...base,
          progress: {
            step: 0,
            total: 0,
            stage: "generating",
            loadedBytes: 5_000,
            totalBytes: 5_000,
          },
        }}
      />,
    );
    const generatingBar = screen
      .getByTestId("model-load-progress-studio-bytes")
      .querySelector('[role="progressbar"]');
    expect(generatingBar).not.toBeNull();
    expect(generatingBar).toHaveAttribute("data-determinate", "false");
    expect(screen.queryByText("Loading model 100%")).toBeNull();
    expect(
      screen.getByTestId("model-load-progress-studio-bytes-hint").textContent,
    ).toContain("generating usually takes about 1 min");
  });

  it("replaces undecodable generated media with a visible failure", () => {
    const onMediaError = vi.fn();
    const msg: ChatMessage = {
      id: "bad-media",
      role: "assistant",
      content: "",
      media: { kind: "image", src: "data:image/png;base64,bad" },
    };
    render(<MessageBubble message={msg} onMediaError={onMediaError} />);
    fireEvent.error(screen.getByTestId("message-media-bad-media"));
    expect(
      screen.getByText(
        /Generation failed: generated image could not be displayed/,
      ),
    ).toBeInTheDocument();
    expect(onMediaError).toHaveBeenCalledWith(msg);
  });

  it("leaves a plain-text message unchanged (no media nodes)", () => {
    const msg: ChatMessage = { id: "t1", role: "assistant", content: "hello" };
    render(<MessageBubble message={msg} />);
    expect(screen.getByText("hello")).toBeInTheDocument();
    expect(screen.queryByTestId("message-media-t1")).toBeNull();
    expect(screen.queryByTestId("message-pending-t1")).toBeNull();
    expect(screen.getByTestId("message-bubble-t1")).toHaveStyle({
      width: "fit-content",
    });
  });

  it("opens a preview dialog from compact media and closes it", () => {
    const msg: ChatMessage = {
      id: "preview-1",
      role: "assistant",
      content: "",
      media: { kind: "image", src: "data:image/png;base64,BBB" },
    };
    render(<MessageBubble message={msg} />);
    fireEvent.click(screen.getByTestId("message-media-preview-1"));
    expect(
      screen.getByTestId("message-media-dialog-preview-1"),
    ).toBeInTheDocument();
    // v2.4.9: an image opens the editor-capable viewer, whose close button is
    // namespaced under the dialog's own test id.
    fireEvent.click(screen.getByTestId("message-media-dialog-preview-1-close"));
    expect(screen.queryByTestId("message-media-dialog-preview-1")).toBeNull();
  });
});
