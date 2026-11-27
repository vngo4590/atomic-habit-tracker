import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { JournalView } from "../JournalView";
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

describe("JournalView clearing the composer", () => {
  it("only offers Clear once the draft has content", () => {
    // Given: an untouched composer
    setStore(makeStore({ journal: [] }));
    render(<JournalView />);
    expect(screen.queryByRole("button", { name: "Clear" })).toBeNull();

    // When: the user types a title
    fireEvent.change(screen.getByPlaceholderText("What happened today?"), {
      target: { value: "Draft" },
    });

    // Then: Clear becomes available
    expect(screen.getByRole("button", { name: "Clear" })).toBeTruthy();
  });

  it("empties the draft and does not call addJournal when Clear is clicked", () => {
    // Given: the user has typed a title and body
    const addJournal = vi.fn();
    setStore(makeStore({ journal: [], addJournal }));
    render(<JournalView />);
    fireEvent.change(screen.getByPlaceholderText("What happened today?"), {
      target: { value: "Abandoned entry" },
    });
    fireEvent.change(screen.getByPlaceholderText("Capture the lesson while it is fresh."), {
      target: { value: "Some thoughts" },
    });

    // When: the user clears the draft
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));

    // Then: nothing is persisted and the fields are empty again
    expect(addJournal).not.toHaveBeenCalled();
    expect((screen.getByPlaceholderText("What happened today?") as HTMLInputElement).value).toBe("");
    expect((screen.getByPlaceholderText("Capture the lesson while it is fresh.") as HTMLTextAreaElement).value).toBe(
      "",
    );
  });

  it("closes the custom mood picker when the draft is cleared", () => {
    // Given: the custom mood picker is open on a dirty draft
    setStore(makeStore({ journal: [] }));
    render(<JournalView />);
    fireEvent.change(screen.getByPlaceholderText("What happened today?"), {
      target: { value: "Draft" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Custom/ }));
    expect(screen.getByPlaceholderText("e.g. Energized, Calm, Grateful")).toBeTruthy();

    // When: the user clears the draft
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));

    // Then: the picker is gone and Good day is selected again
    expect(screen.queryByPlaceholderText("e.g. Energized, Calm, Grateful")).toBeNull();
    expect(screen.getByRole("button", { name: /Good day/ }).getAttribute("aria-pressed")).toBe("true");
  });
});
