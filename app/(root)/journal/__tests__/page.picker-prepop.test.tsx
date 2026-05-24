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

describe("JournalPage custom picker pre-population", () => {
  it("pre-fills the label input from an existing label-only custom mood", () => {
    // Given: a custom label-only mood is already set and the picker is reopened
    const addJournal = vi.fn();
    setStore(makeStore({ journal: [], addJournal }));
    render(<JournalPage />);
    fireEvent.click(screen.getByRole("button", { name: "New entry" }));
    fireEvent.change(screen.getByPlaceholderText("What happened today?"), {
      target: { value: "Entry" },
    });
    // First: apply "Calm" as a label-only mood
    fireEvent.click(screen.getByRole("button", { name: /Custom/ }));
    fireEvent.change(screen.getByPlaceholderText("e.g. Energized, Calm, Grateful"), {
      target: { value: "Calm" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Use" }));

    // When: the user reopens the picker to adjust the mood
    fireEvent.click(screen.getByRole("button", { name: /Calm/ }));

    // Then: the label input is pre-filled with "Calm"
    const labelInput = screen.getByPlaceholderText("e.g. Energized, Calm, Grateful") as HTMLInputElement;
    expect(labelInput.value).toBe("Calm");
  });

  it("pre-fills emoji and label when reopening a combined emoji-label custom mood", () => {
    // Given: a combined mood "🌟 Energized" is already set and the picker is reopened
    const addJournal = vi.fn();
    setStore(makeStore({ journal: [], addJournal }));
    render(<JournalPage />);
    fireEvent.click(screen.getByRole("button", { name: "New entry" }));
    fireEvent.change(screen.getByPlaceholderText("What happened today?"), {
      target: { value: "Entry" },
    });
    // First: apply "🌟 Energized"
    fireEvent.click(screen.getByRole("button", { name: /Custom/ }));
    fireEvent.click(screen.getByText("🌟"));
    fireEvent.change(screen.getByPlaceholderText("e.g. Energized, Calm, Grateful"), {
      target: { value: "Energized" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Use" }));

    // When: the user reopens the picker
    fireEvent.click(screen.getByRole("button", { name: /🌟 Energized/ }));

    // Then: the label input is pre-filled with "Energized"
    const labelInput = screen.getByPlaceholderText("e.g. Energized, Calm, Grateful") as HTMLInputElement;
    expect(labelInput.value).toBe("Energized");
  });
});

// ---------------------------------------------------------------------------
// Cancel
// ---------------------------------------------------------------------------

