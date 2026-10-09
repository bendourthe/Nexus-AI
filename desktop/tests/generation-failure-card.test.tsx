import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { GenerationFailureCard } from "../src/shared/studio/GenerationFailureCard";
import type { GenerationFailure } from "../src/shared/studio/generationError";

const failure: GenerationFailure = {
  headline: "Generation could not be completed",
  summary: "The model ran out of memory",
  hint: "Choose a smaller image size",
  detail: "local executor: allocation failed at frame 7",
  kind: "out-of-memory",
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("generation failure actions", () => {
  it("keeps the trace behind an accessible details toggle", () => {
    render(<GenerationFailureCard failure={failure} testId="failed-image" />);
    expect(screen.getByTestId("failed-image")).toHaveAttribute("data-failure-kind", "out-of-memory");
    expect(screen.getByText(failure.headline)).toBeInTheDocument();
    expect(screen.getByText(failure.summary!)).toBeInTheDocument();
    expect(screen.getByText(failure.hint!)).toBeInTheDocument();
    expect(screen.queryByText(failure.detail)).toBeNull();
    const toggle = screen.getByRole("button", { name: "Show details" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(screen.getByText(failure.detail)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hide details" })).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(screen.getByRole("button", { name: "Hide details" }));
    expect(screen.queryByText(failure.detail)).toBeNull();
  });

  it("copies the original trace and resets its confirmation after two seconds", async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    render(<GenerationFailureCard failure={failure} />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Copy details" })));
    expect(writeText).toHaveBeenCalledOnce();
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining(failure.detail));
    expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByRole("button", { name: "Copy details" })).toBeInTheDocument();
  });

  it("opens readable details when clipboard access is denied", async () => {
    vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
    render(<GenerationFailureCard failure={{ ...failure, summary: null, hint: null }} />);
    expect(screen.queryByTestId("generation-failure-summary")).toBeNull();
    expect(screen.queryByTestId("generation-failure-hint")).toBeNull();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Copy details" })));
    expect(screen.getByText(failure.detail)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hide details" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.queryByRole("button", { name: "Copied" })).toBeNull();
  });
});
