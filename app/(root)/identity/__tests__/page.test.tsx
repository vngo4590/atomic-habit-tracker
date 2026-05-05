import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const storeMock = vi.hoisted(() => ({
  habits: [],
  identity: { statement: "I show up", values: ["Curious", "Calm"] },
  setIdentity: vi.fn(),
}));

vi.mock("@/components/StoreProvider", () => ({
  useStoreContext: () => storeMock,
}));

import IdentityPage from "@/app/(root)/identity/page";

describe("IdentityPage", () => {
  it("allows core values to be removed", () => {
    render(<IdentityPage />);

    fireEvent.click(screen.getByRole("button", { name: "Remove core value Calm" }));

    expect(storeMock.setIdentity).toHaveBeenCalledWith({
      statement: "I show up",
      values: ["Curious"],
    });
  });
});
