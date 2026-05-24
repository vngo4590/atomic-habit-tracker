import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import JournalPage from "@/app/(root)/journal/page";
import { makeStore, setStore, storeRef } from "./helpers";

// Install the StoreProvider mock for this test file. The factory reads
// from storeRef.current (shared mutable container in ./helpers.ts) so
// each test can swap the snapshot via setStore() in its Arrange step.
vi.mock("@/components/StoreProvider", () => ({
  useStoreContext: () => storeRef.current,
}));

afterEach(() => {
  cleanup();
});

describe("JournalPage canceling the compose form", () => {
  it("restores the prompt cards and hides the form when Cancel is clicked", () => {
    // Given: the compose form is open
    setStore(makeStore({ journal: [] }));
    render(<JournalPage />);
    fireEvent.click(screen.getByRole("button", { name: "New entry" }));

    // When: the user clicks Cancel
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    // Then: the form disappears and the prompt shortcuts return
    expect(screen.queryByPlaceholderText("What happened today?")).toBeNull();
    expect(screen.getByText("What habit felt automatic today?")).toBeTruthy();
  });

  it("does not call addJournal when the form is canceled with a partially filled title", () => {
    // Given: the user has typed a title but then cancels
    const addJournal = vi.fn();
    setStore(makeStore({ journal: [], addJournal }));
    render(<JournalPage />);
    fireEvent.click(screen.getByRole("button", { name: "New entry" }));
    fireEvent.change(screen.getByPlaceholderText("What happened today?"), {
      target: { value: "Abandoned entry" },
    });

    // When: the user cancels
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    // Then: no journal entry is persisted
    expect(addJournal).not.toHaveBeenCalled();
  });

  it("clears the emoji picker when the form is canceled", () => {
    // Given: the emoji picker is open
    setStore(makeStore({ journal: [] }));
    render(<JournalPage />);
    fireEvent.click(screen.getByRole("button", { name: "New entry" }));
    fireEvent.click(screen.getByRole("button", { name: /Custom/ }));
    expect(screen.getByPlaceholderText("e.g. Energized, Calm, Grateful")).toBeTruthy();

    // When: the user cancels
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    // Then: the picker is gone with the rest of the form
    expect(screen.queryByPlaceholderText("e.g. Energized, Calm, Grateful")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Editing an existing entry
// ---------------------------------------------------------------------------

