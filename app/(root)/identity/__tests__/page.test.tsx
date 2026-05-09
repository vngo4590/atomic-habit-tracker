import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const storeMock = vi.hoisted(() => ({
  habits: [],
  identity: { statement: "I show up", values: ["Curious", "Calm"] },
  setIdentity: vi.fn(),
}));

vi.mock("@/components/StoreProvider", () => ({
  useStoreContext: () => storeMock,
}));

import IdentityPage from "@/app/(root)/identity/page";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  storeMock.habits = [];
  storeMock.identity = { statement: "I show up", values: ["Curious", "Calm"] };
});

describe("IdentityPage", () => {
  it("shows the saved statement as read-only after saving", () => {
    storeMock.identity = { statement: "", values: [] };
    const { rerender } = render(<IdentityPage />);

    expect(screen.getByText("No identity statement yet. Click this section to write one.")).toBeTruthy();

    fireEvent.click(screen.getByText("No identity statement yet. Click this section to write one."));
    fireEvent.change(screen.getAllByRole("textbox")[0], { target: { value: "I am someone who follows through" } });
    fireEvent.click(screen.getByRole("button", { name: "Save statement" }));
    storeMock.identity = { statement: "I am someone who follows through", values: [] };
    rerender(<IdentityPage />);

    expect(storeMock.setIdentity).toHaveBeenCalledWith({
      statement: "I am someone who follows through",
      values: [],
    });
    expect(screen.queryByRole("button", { name: "Save statement" })).toBeNull();
    expect(screen.getByText("Click the statement to edit it.")).toBeTruthy();
    expect(screen.getByText("I am someone who follows through")).toBeTruthy();
  });

  it("allows core values to be removed", () => {
    render(<IdentityPage />);

    fireEvent.click(screen.getByRole("button", { name: "Remove core value Calm" }));

    expect(storeMock.setIdentity).toHaveBeenCalledWith({
      statement: "I show up",
      values: ["Curious"],
    });
  });
});
