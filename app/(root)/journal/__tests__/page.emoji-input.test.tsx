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

describe("JournalPage custom emoji keyboard input", () => {
  it("allows typing a custom emoji that is not in the preset grid", () => {
    // Given: the picker is open
    const addJournal = vi.fn();
    setStore(makeStore({ journal: [], addJournal }));
    render(<JournalPage />);
    fireEvent.click(screen.getByRole("button", { name: "New entry" }));
    fireEvent.change(screen.getByPlaceholderText("What happened today?"), {
      target: { value: "Party time" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Custom/ }));

    // When: the user types a custom emoji and a label
    fireEvent.change(screen.getByLabelText("Custom emoji"), {
      target: { value: "🎉" },
    });
    fireEvent.change(screen.getByPlaceholderText("e.g. Energized, Calm, Grateful"), {
      target: { value: "Celebratory" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Use" }));
    fireEvent.click(screen.getByRole("button", { name: "Save entry" }));

    // Then: the custom emoji and label are stored together
    expect(addJournal).toHaveBeenCalledWith(
      expect.objectContaining({ mood: "🎉 Celebratory" }),
    );
  });

  it("allows a keyboard-typed emoji without any label", () => {
    // Given: the picker is open
    const addJournal = vi.fn();
    setStore(makeStore({ journal: [], addJournal }));
    render(<JournalPage />);
    fireEvent.click(screen.getByRole("button", { name: "New entry" }));
    fireEvent.change(screen.getByPlaceholderText("What happened today?"), {
      target: { value: "Big win" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Custom/ }));

    // When: the user types only a custom emoji and clicks Use
    fireEvent.change(screen.getByLabelText("Custom emoji"), {
      target: { value: "🏆" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Use" }));
    fireEvent.click(screen.getByRole("button", { name: "Save entry" }));

    // Then: just the typed emoji is stored as the mood
    expect(addJournal).toHaveBeenCalledWith(
      expect.objectContaining({ mood: "🏆" }),
    );
  });
});

// ---------------------------------------------------------------------------
// Custom mood — what gets stored in addJournal
// ---------------------------------------------------------------------------

