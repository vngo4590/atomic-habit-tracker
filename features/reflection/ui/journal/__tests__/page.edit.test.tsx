import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { testJournalEntry } from "@/lib/test/fixtures";

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

/** Open the inline editor on the (only) entry card and return it. */
function openEditor(title: string) {
  fireEvent.click(screen.getByRole("button", { name: `Edit ${title}` }));
  return within(screen.getByRole("region", { name: "Edit entry" }));
}

describe("JournalView editing an existing entry", () => {
  it("populates the inline editor with the existing entry's title and body when Edit is clicked", () => {
    // Given: an existing journal entry
    setStore(makeStore({
      journal: [testJournalEntry({ id: "j1", title: "Original title", body: "Original body", mood: "meh" })],
    }));
    render(<JournalView />);

    // When: the user clicks Edit on the entry card
    const editor = openEditor("Original title");

    // Then: the inline editor is pre-filled with the entry values and mood
    expect((editor.getByLabelText("Title") as HTMLInputElement).value).toBe("Original title");
    expect((editor.getByLabelText("Reflection") as HTMLTextAreaElement).value).toBe("Original body");
    expect(editor.getByRole("button", { name: /So-so/ }).getAttribute("aria-pressed")).toBe("true");
  });

  it("shows 'Save changes' and 'Cancel' in the inline editor", () => {
    // Given: an entry is opened for editing
    setStore(makeStore({ journal: [testJournalEntry({ id: "j1", title: "Entry" })] }));
    render(<JournalView />);

    // When: Edit is clicked
    const editor = openEditor("Entry");

    // Then: the editor's actions reflect the edit context
    expect(editor.getByRole("button", { name: "Save changes" })).toBeTruthy();
    expect(editor.getByRole("button", { name: "Cancel" })).toBeTruthy();
    expect(editor.queryByRole("button", { name: "Save entry" })).toBeNull();
  });

  it("calls updateJournal with the patched values and does not call addJournal", () => {
    // Given: an entry is loaded into the editor and the user changes the title and mood
    const updateJournal = vi.fn();
    const addJournal = vi.fn();
    setStore(makeStore({
      journal: [testJournalEntry({ id: "j1", title: "Original", mood: "good" })],
      addJournal,
      updateJournal,
    }));
    render(<JournalView />);
    const editor = openEditor("Original");
    fireEvent.change(editor.getByLabelText("Title"), { target: { value: "Updated title" } });
    fireEvent.click(editor.getByRole("button", { name: /Hard/ }));

    // When: the user saves the changes
    fireEvent.click(editor.getByRole("button", { name: "Save changes" }));

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
    render(<JournalView />);
    const editor = openEditor("Entry to edit");
    fireEvent.click(editor.getByRole("button", { name: /Custom/ }));
    fireEvent.click(editor.getByText("💪"));
    fireEvent.change(editor.getByPlaceholderText("e.g. Energized, Calm, Grateful"), {
      target: { value: "Motivated" },
    });
    fireEvent.click(editor.getByRole("button", { name: "Use" }));

    // When: the user saves
    fireEvent.click(editor.getByRole("button", { name: "Save changes" }));

    // Then: the combined mood is forwarded to updateJournal
    expect(updateJournal).toHaveBeenCalledWith("j1", expect.objectContaining({ mood: "💪 Motivated" }));
  });

  it("closes the inline editor after a successful edit", () => {
    // Given: an entry is edited
    setStore(makeStore({ journal: [testJournalEntry({ id: "j1", title: "Original" })] }));
    render(<JournalView />);
    const editor = openEditor("Original");
    fireEvent.change(editor.getByLabelText("Title"), { target: { value: "Revised" } });

    // When: the user clicks Save changes
    fireEvent.click(editor.getByRole("button", { name: "Save changes" }));

    // Then: the editor is gone and the card shows the revised title
    expect(screen.queryByRole("region", { name: "Edit entry" })).toBeNull();
    expect(screen.getByRole("heading", { level: 3, name: "Revised" })).toBeTruthy();
  });

  it("discards edits when Cancel is clicked", () => {
    // Given: an entry is being edited
    const updateJournal = vi.fn();
    setStore(makeStore({ journal: [testJournalEntry({ id: "j1", title: "Original" })], updateJournal }));
    render(<JournalView />);
    const editor = openEditor("Original");
    fireEvent.change(editor.getByLabelText("Title"), { target: { value: "Never saved" } });

    // When: the user cancels
    fireEvent.click(editor.getByRole("button", { name: "Cancel" }));

    // Then: nothing is saved and the original card returns
    expect(updateJournal).not.toHaveBeenCalled();
    expect(screen.queryByRole("region", { name: "Edit entry" })).toBeNull();
    expect(screen.getByRole("heading", { level: 3, name: "Original" })).toBeTruthy();
  });
});
