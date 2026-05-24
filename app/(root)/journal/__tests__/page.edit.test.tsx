import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import JournalPage from "@/app/(root)/journal/page";
import { testJournalEntry } from "@/lib/test/fixtures";

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

describe("JournalPage editing an existing entry", () => {
  it("populates the form with the existing entry's title and body when Edit is clicked", () => {
    // Given: an existing journal entry
    setStore(makeStore({
      journal: [testJournalEntry({ id: "j1", title: "Original title", body: "Original body", mood: "meh" })],
    }));
    render(<JournalPage />);

    // When: the user clicks Edit on the entry card
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

    // Then: the compose form is pre-filled with the entry values
    const titleInput = screen.getByPlaceholderText("What happened today?") as HTMLInputElement;
    const bodyInput = screen.getByPlaceholderText("Capture the lesson while it is fresh.") as HTMLTextAreaElement;
    expect(titleInput.value).toBe("Original title");
    expect(bodyInput.value).toBe("Original body");
  });

  it("shows 'Save changes' instead of 'Save entry' when editing", () => {
    // Given: an entry is opened for editing
    setStore(makeStore({ journal: [testJournalEntry({ id: "j1" })] }));
    render(<JournalPage />);

    // When: Edit is clicked
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

    // Then: the save button reflects the edit context
    expect(screen.getByRole("button", { name: "Save changes" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Save entry" })).toBeNull();
  });

  it("calls updateJournal with the patched values and does not call addJournal", () => {
    // Given: an entry is loaded into the edit form and the user changes the title and mood
    const updateJournal = vi.fn();
    const addJournal = vi.fn();
    setStore(makeStore({
      journal: [testJournalEntry({ id: "j1", title: "Original", mood: "good" })],
      addJournal,
      updateJournal,
    }));
    render(<JournalPage />);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByPlaceholderText("What happened today?"), {
      target: { value: "Updated title" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Hard/ }));

    // When: the user saves the changes
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    // Then: updateJournal is called with the correct id and patch; addJournal is not touched
    expect(updateJournal).toHaveBeenCalledWith("j1", {
      title: "Updated title",
      body: expect.any(String),
      mood: "hard",
    });
    expect(addJournal).not.toHaveBeenCalled();
  });

  it("saves a combined emoji-label mood when editing an entry", () => {
    // Given: an entry is in edit mode and the user builds a custom mood
    const updateJournal = vi.fn();
    setStore(makeStore({
      journal: [testJournalEntry({ id: "j1", title: "Entry to edit", mood: "good" })],
      updateJournal,
    }));
    render(<JournalPage />);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.click(screen.getByRole("button", { name: /Custom/ }));
    fireEvent.click(screen.getByText("💪"));
    fireEvent.change(screen.getByPlaceholderText("e.g. Energized, Calm, Grateful"), {
      target: { value: "Motivated" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Use" }));

    // When: the user saves
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    // Then: the combined mood is forwarded to updateJournal
    expect(updateJournal).toHaveBeenCalledWith("j1", expect.objectContaining({ mood: "💪 Motivated" }));
  });

  it("closes the form after a successful edit", () => {
    // Given: an entry is edited and saved
    setStore(makeStore({ journal: [testJournalEntry({ id: "j1", title: "Original" })] }));
    render(<JournalPage />);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByPlaceholderText("What happened today?"), {
      target: { value: "Revised" },
    });

    // When: the user clicks Save changes
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    // Then: the compose form is gone
    expect(screen.queryByPlaceholderText("What happened today?")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Entry list mood display (preset backward compat + custom text)
// ---------------------------------------------------------------------------

