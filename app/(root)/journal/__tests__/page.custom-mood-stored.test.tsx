import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

describe("JournalPage custom mood stored value", () => {
  it("stores 'emoji label' when both an emoji and a label are provided", () => {
    // Given: the user picks an emoji and types a label
    const addJournal = vi.fn();
    setStore(makeStore({ journal: [], addJournal }));
    render(<JournalPage />);
    fireEvent.click(screen.getByRole("button", { name: "New entry" }));
    fireEvent.change(screen.getByPlaceholderText("What happened today?"), {
      target: { value: "Inspired session" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Custom/ }));
    fireEvent.click(screen.getByText("🌟"));
    fireEvent.change(screen.getByPlaceholderText("e.g. Energized, Calm, Grateful"), {
      target: { value: "Energized" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Use" }));

    // When: the user saves
    fireEvent.click(screen.getByRole("button", { name: "Save entry" }));

    // Then: the combined 'emoji label' string is stored as the mood
    expect(addJournal).toHaveBeenCalledWith(expect.objectContaining({ mood: "🌟 Energized" }));
  });

  it("stores just the emoji when only an emoji is selected and no label is typed", () => {
    // Given: the user selects an emoji but leaves the label empty
    const addJournal = vi.fn();
    setStore(makeStore({ journal: [], addJournal }));
    render(<JournalPage />);
    fireEvent.click(screen.getByRole("button", { name: "New entry" }));
    fireEvent.change(screen.getByPlaceholderText("What happened today?"), {
      target: { value: "Quick note" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Custom/ }));
    fireEvent.click(screen.getByText("💪"));
    fireEvent.click(screen.getByRole("button", { name: "Use" }));

    // When: the user saves
    fireEvent.click(screen.getByRole("button", { name: "Save entry" }));

    // Then: just the emoji is stored as the mood
    expect(addJournal).toHaveBeenCalledWith(expect.objectContaining({ mood: "💪" }));
  });

  it("stores just the label when only text is typed and no emoji is selected", () => {
    // Given: the user types a mood label without selecting an emoji
    const addJournal = vi.fn();
    setStore(makeStore({ journal: [], addJournal }));
    render(<JournalPage />);
    fireEvent.click(screen.getByRole("button", { name: "New entry" }));
    fireEvent.change(screen.getByPlaceholderText("What happened today?"), {
      target: { value: "Morning walk" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Custom/ }));
    fireEvent.change(screen.getByPlaceholderText("e.g. Energized, Calm, Grateful"), {
      target: { value: "Calm and focused" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Use" }));

    // When: the user saves
    fireEvent.click(screen.getByRole("button", { name: "Save entry" }));

    // Then: the label text is stored as the mood (no leading space)
    expect(addJournal).toHaveBeenCalledWith(expect.objectContaining({ mood: "Calm and focused" }));
  });

  it("trims whitespace from the label before combining with the emoji", () => {
    // Given: the user types a padded label
    const addJournal = vi.fn();
    setStore(makeStore({ journal: [], addJournal }));
    render(<JournalPage />);
    fireEvent.click(screen.getByRole("button", { name: "New entry" }));
    fireEvent.change(screen.getByPlaceholderText("What happened today?"), {
      target: { value: "Good morning" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Custom/ }));
    fireEvent.click(screen.getByText("😊"));
    fireEvent.change(screen.getByPlaceholderText("e.g. Energized, Calm, Grateful"), {
      target: { value: "  Happy  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Use" }));
    fireEvent.click(screen.getByRole("button", { name: "Save entry" }));

    // When: the entry is saved
    // Then: the mood is trimmed before combining
    expect(addJournal).toHaveBeenCalledWith(expect.objectContaining({ mood: "😊 Happy" }));
  });

  it("stores the preset key when a preset is chosen after a custom mood was applied", () => {
    // Given: the user applies a custom mood then changes their mind to a preset
    const addJournal = vi.fn();
    setStore(makeStore({ journal: [], addJournal }));
    render(<JournalPage />);
    fireEvent.click(screen.getByRole("button", { name: "New entry" }));
    fireEvent.change(screen.getByPlaceholderText("What happened today?"), {
      target: { value: "Changed my mind" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Custom/ }));
    fireEvent.click(screen.getByText("🥳"));
    fireEvent.click(screen.getByRole("button", { name: "Use" }));

    // When: the user then clicks a preset mood chip
    fireEvent.click(screen.getByRole("button", { name: /Good day/ }));
    fireEvent.click(screen.getByRole("button", { name: "Save entry" }));

    // Then: the preset key ('good') is stored, not the custom emoji
    expect(addJournal).toHaveBeenCalledWith(expect.objectContaining({ mood: "good" }));
  });
});

// ---------------------------------------------------------------------------
// Picker pre-population when reopening with an existing custom mood
// ---------------------------------------------------------------------------

