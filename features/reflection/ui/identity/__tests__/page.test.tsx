import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Habit } from "@/lib/types";

const storeMock = vi.hoisted(() => ({
  habits: [] as Habit[],
  identity: { statement: "I show up", values: ["Curious", "Calm"] },
  setIdentity: vi.fn(),
}));

vi.mock("@/components/StoreProvider", () => ({
  useStoreContext: () => storeMock,
}));

import { IdentityView } from "../IdentityView";

function habitWithVotes(id: string, identity: string, votes: number): Habit {
  const history: Record<string, boolean> = {};
  for (let day = 1; day <= votes; day += 1) history[`2030-01-${String(day).padStart(2, "0")}`] = true;
  history["2030-02-01"] = false; // a missed day is not a vote
  return { id, name: `Habit ${id}`, identity, history } as unknown as Habit;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  storeMock.habits = [];
  storeMock.identity = { statement: "I show up", values: ["Curious", "Calm"] };
});

describe("IdentityView", () => {
  describe("identity statement", () => {
    it("invites a first statement, saves it, and shows it read-only afterwards", () => {
      // Given: no statement yet
      storeMock.identity = { statement: "", values: [] };
      const { rerender } = render(<IdentityView />);
      expect(screen.getByRole("heading", { name: "No identity statement yet" })).toBeTruthy();

      // When: the user writes and saves a statement
      fireEvent.click(screen.getByRole("button", { name: "Write your statement" }));
      fireEvent.change(screen.getByLabelText("Your statement"), {
        target: { value: "I am someone who follows through" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Save statement" }));
      storeMock.identity = { statement: "I am someone who follows through", values: [] };
      rerender(<IdentityView />);

      // Then: it is persisted and displayed with an Edit action
      expect(storeMock.setIdentity).toHaveBeenCalledWith({
        statement: "I am someone who follows through",
        values: [],
      });
      expect(screen.queryByRole("button", { name: "Save statement" })).toBeNull();
      expect(screen.getByRole("button", { name: "Edit statement" })).toBeTruthy();
      expect(screen.getByText("I am someone who follows through")).toBeTruthy();
    });

    it("discards an edited statement when Cancel is clicked", () => {
      // Given: an existing statement opened for editing
      render(<IdentityView />);
      fireEvent.click(screen.getByRole("button", { name: "Edit statement" }));
      fireEvent.change(screen.getByLabelText("Your statement"), { target: { value: "Changed" } });

      // When: the user cancels
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

      // Then: nothing is saved and the original statement shows
      expect(storeMock.setIdentity).not.toHaveBeenCalled();
      expect(screen.getByText("I show up")).toBeTruthy();
    });
  });

  describe("core values", () => {
    it("allows core values to be removed", () => {
      // Given: two values
      render(<IdentityView />);

      // When: the user removes one
      fireEvent.click(screen.getByRole("button", { name: "Remove core value Calm" }));

      // Then: only the other remains
      expect(storeMock.setIdentity).toHaveBeenCalledWith({ statement: "I show up", values: ["Curious"] });
    });

    it("adds a trimmed value with Enter and ignores case-insensitive duplicates", () => {
      // Given: the values card
      render(<IdentityView />);
      const input = screen.getByLabelText("Add a value");

      // When: the user submits an existing value in different case
      fireEvent.change(input, { target: { value: "calm" } });

      // Then: Add is disabled and the duplicate is explained inline
      expect((screen.getByRole("button", { name: "Add" }) as HTMLButtonElement).disabled).toBe(true);
      expect(screen.getByRole("alert").textContent).toContain("already one of your values");

      // When: the user types a new value and presses Enter
      fireEvent.change(input, { target: { value: "  Brave  " } });
      fireEvent.submit(input.closest("form")!);

      // Then: it is appended, trimmed
      expect(storeMock.setIdentity).toHaveBeenCalledWith({
        statement: "I show up",
        values: ["Curious", "Calm", "Brave"],
      });
    });
  });

  describe("vote ledger", () => {
    it("tallies completed check-ins per identity, highest first, with a total", () => {
      // Given: two habits for one identity and one for another
      storeMock.habits = [
        habitWithVotes("a", "a runner", 2),
        habitWithVotes("b", "a reader", 5),
        habitWithVotes("c", "a runner", 1),
      ];
      render(<IdentityView />);

      // Then: identities are ranked by votes and the total counts only completed days
      const ledger = within(screen.getByRole("region", { name: "Vote ledger" }));
      const rows = ledger.getAllByRole("listitem");
      expect(rows[0].textContent).toContain("I am a reader");
      expect(rows[0].textContent).toContain("5 votes");
      expect(rows[1].textContent).toContain("I am a runner");
      expect(rows[1].textContent).toContain("3 votes");
      expect(ledger.getByText(/votes total/).textContent).toBe("8 votes total");
    });

    it("explains how votes work and links to Today when there are none", () => {
      // Given: no check-ins yet
      render(<IdentityView />);

      // Then: an empty state with a next step is shown
      const ledger = within(screen.getByRole("region", { name: "Vote ledger" }));
      expect(ledger.getByRole("heading", { name: "No votes cast yet" })).toBeTruthy();
      expect(ledger.getByRole("link", { name: "Check in today" }).getAttribute("href")).toBe("/");
    });
  });
});
