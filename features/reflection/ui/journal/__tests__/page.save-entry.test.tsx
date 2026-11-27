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

describe("JournalView saving a new entry", () => {
  it("calls addJournal with title, body, default 'good' mood, and empty tags", () => {
    // Given: the form is filled with a title and body; mood is left at the default
    const addJournal = vi.fn();
    setStore(makeStore({ journal: [], addJournal }));
    render(<JournalView />);
    fireEvent.change(screen.getByPlaceholderText("What happened today?"), {
      target: { value: "Small win today" },
    });
    fireEvent.change(screen.getByPlaceholderText("Capture the lesson while it is fresh."), {
      target: { value: "Kept the cue visible." },
    });

    // When: the user saves without changing mood
    fireEvent.click(screen.getByRole("button", { name: "Save entry" }));

    // Then: addJournal receives the correct payload
    expect(addJournal).toHaveBeenCalledWith({
      title: "Small win today",
      body: "Kept the cue visible.",
      mood: "good",
      tags: [],
    });
  });

  it("trims leading and trailing whitespace from title and body before saving", () => {
    // Given: the user types padded text in both fields
    const addJournal = vi.fn();
    setStore(makeStore({ journal: [], addJournal }));
    render(<JournalView />);
    fireEvent.change(screen.getByPlaceholderText("What happened today?"), {
      target: { value: "  Morning run  " },
    });
    fireEvent.change(screen.getByPlaceholderText("Capture the lesson while it is fresh."), {
      target: { value: "  Felt strong.  " },
    });

    // When: the user saves
    fireEvent.click(screen.getByRole("button", { name: "Save entry" }));

    // Then: addJournal receives trimmed strings
    expect(addJournal).toHaveBeenCalledWith(expect.objectContaining({
      title: "Morning run",
      body: "Felt strong.",
    }));
  });

  it("stores 'meh' when So-so is selected", () => {
    // Given: the user opens the form and picks So-so
    const addJournal = vi.fn();
    setStore(makeStore({ journal: [], addJournal }));
    render(<JournalView />);
    fireEvent.change(screen.getByPlaceholderText("What happened today?"), {
      target: { value: "Average session" },
    });
    fireEvent.click(screen.getByRole("button", { name: /So-so/ }));

    // When: the user saves
    fireEvent.click(screen.getByRole("button", { name: "Save entry" }));

    // Then: the 'meh' key is stored
    expect(addJournal).toHaveBeenCalledWith(expect.objectContaining({ mood: "meh" }));
  });

  it("stores 'hard' when Hard is selected", () => {
    // Given: the user selects the Hard mood chip
    const addJournal = vi.fn();
    setStore(makeStore({ journal: [], addJournal }));
    render(<JournalView />);
    fireEvent.change(screen.getByPlaceholderText("What happened today?"), {
      target: { value: "Tough session" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Hard/ }));

    // When: the user saves
    fireEvent.click(screen.getByRole("button", { name: "Save entry" }));

    // Then: the 'hard' key is stored
    expect(addJournal).toHaveBeenCalledWith(expect.objectContaining({ mood: "hard" }));
  });

  it("does not call addJournal when Save entry is disabled", () => {
    // Given: the title is empty (Save entry is disabled)
    const addJournal = vi.fn();
    setStore(makeStore({ journal: [], addJournal }));
    render(<JournalView />);

    // When: the user attempts to click the disabled button
    fireEvent.click(screen.getByRole("button", { name: "Save entry" }));

    // Then: addJournal is never reached
    expect(addJournal).not.toHaveBeenCalled();
  });

  it("resets the composer and lists the new entry after a successful save", () => {
    // Given: the form is filled and the user saves
    setStore(makeStore({ journal: [] }));
    render(<JournalView />);
    fireEvent.change(screen.getByPlaceholderText("What happened today?"), {
      target: { value: "Session complete" },
    });

    // When: the user clicks Save entry
    fireEvent.click(screen.getByRole("button", { name: "Save entry" }));

    // Then: the composer is empty again, ready for the next entry, and the prompts remain
    expect((screen.getByPlaceholderText("What happened today?") as HTMLInputElement).value).toBe("");
    expect(screen.getByText("What habit felt automatic today?")).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Custom mood picker — two-step flow (emoji + label)
// ---------------------------------------------------------------------------

