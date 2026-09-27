import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { accountContext } from "../../core/chat/contextAccounting";
import { CompactControl } from "../src/shared/chat/CompactControl";
import { ContextUsage } from "../src/shared/chat/ContextUsage";

describe("context pressure controls", () => {
  it("shows unknown and unaccounted, and disables compact while streaming", () => {
    const account = accountContext({
      categories: [
        { name: "prompt", tokens: 80 },
        { name: "tools", tokens: null },
      ],
      observedTotal: 90,
      windowTokens: 100,
    });
    render(
      <>
        <ContextUsage account={account} />
        <CompactControl
          visible={account.visible}
          streaming
          onCompact={() => undefined}
          onUndo={() => undefined}
          canUndo={false}
        />
      </>,
    );
    expect(screen.getByText(/tools: unknown/)).toBeTruthy();
    expect(screen.getByText("unaccounted: 10")).toBeTruthy();
    expect(screen.getByText("total: 90")).toBeTruthy();
    const button = screen.getByRole("button", { name: /Compact thread, unavailable/ });
    expect(button.hasAttribute("disabled")).toBe(true);
  });

  it("asks for confirmation by calling compact only from the button", () => {
    const onCompact = vi.fn();
    render(
      <CompactControl visible streaming={false} onCompact={onCompact} onUndo={() => undefined} canUndo />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Compact thread" }));
    expect(onCompact).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toMatch(/summarise/);
    fireEvent.click(screen.getByRole("button", { name: "Compact thread" }));
    expect(onCompact).toHaveBeenCalledOnce();
  });
});
