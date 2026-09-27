import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BranchControl } from "../src/shared/chat/BranchControl";
import { MessageList } from "../src/shared/chat/MessageList";

describe("BranchControl", () => {
  it("is keyboard reachable and labelled, and surfaces a failed persist", () => {
    const onBranch = vi.fn();
    render(
      <BranchControl
        messageId="m2"
        canBranch
        siblings={[
          { id: "a", label: "Original", active: false },
          { id: "b", label: "Branch", active: true },
        ]}
        onBranch={onBranch}
        onSelect={() => undefined}
        error="Could not save the branch"
      />,
    );
    const button = screen.getByRole("button", { name: "Branch from here" });
    button.focus();
    expect(button).toHaveFocus();
    fireEvent.click(button);
    expect(onBranch).toHaveBeenCalledWith("m2");
    expect(screen.getByRole("group", { name: "Branch 2 of 2" })).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toBe("Could not save the branch");
  });

  it("hides the switcher on a thread with no siblings", () => {
    render(
      <MessageList
        messages={[{ id: "m1", role: "user", content: "hello" }]}
        branchForMessage={() => ({
          canBranch: true,
          siblings: [],
          onBranch: () => undefined,
          onSelect: () => undefined,
        })}
      />,
    );
    expect(screen.getByRole("button", { name: "Branch from here" })).toBeTruthy();
    expect(screen.queryByRole("group")).toBeNull();
  });
});
