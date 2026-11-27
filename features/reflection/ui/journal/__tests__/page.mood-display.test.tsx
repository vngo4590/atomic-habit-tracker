import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { JournalView } from "../JournalView";
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

describe("JournalView entry mood display", () => {
  it("shows 😄 face and 'Good day' label for a 'good' mood entry", () => {
    // Given: an entry stored with the legacy 'good' key
    setStore(makeStore({ journal: [testJournalEntry({ mood: "good" })] }));
    render(<JournalView />);

    // When: the page renders
    // Then: the preset emoji and label are shown on the entry card (not just in the composer) in the entry card
    expect(within(screen.getByRole("article")).getByText("😄")).toBeTruthy();
    expect(within(screen.getByRole("article")).getByText(/Good day/)).toBeTruthy();
  });

  it("shows 😐 face and 'So-so' label for a 'meh' mood entry", () => {
    // Given: an entry stored with the legacy 'meh' key
    setStore(makeStore({ journal: [testJournalEntry({ mood: "meh" })] }));
    render(<JournalView />);

    // When: the page renders
    // Then: the preset emoji and label are shown on the entry card (not just in the composer)
    expect(within(screen.getByRole("article")).getByText("😐")).toBeTruthy();
    expect(within(screen.getByRole("article")).getByText(/So-so/)).toBeTruthy();
  });

  it("shows 😕 face and 'Hard' label for a 'hard' mood entry", () => {
    // Given: an entry stored with the legacy 'hard' key
    setStore(makeStore({ journal: [testJournalEntry({ mood: "hard" })] }));
    render(<JournalView />);

    // When: the page renders
    // Then: the preset emoji and label are shown on the entry card (not just in the composer)
    expect(within(screen.getByRole("article")).getByText("😕")).toBeTruthy();
    expect(within(screen.getByRole("article")).getByText(/Hard/)).toBeTruthy();
  });

  it("shows a combined 'emoji label' custom mood directly in the chip", () => {
    // Given: an entry whose mood was set via the two-step custom picker
    setStore(makeStore({ journal: [testJournalEntry({ mood: "🌟 Energized" })] }));
    render(<JournalView />);

    // When: the page renders
    // Then: the full combined string appears in the entry chip
    expect(within(screen.getByRole("article")).getByText("🌟 Energized")).toBeTruthy();
  });

  it("shows an emoji-only custom mood in the chip", () => {
    // Given: an entry whose mood is a single emoji (no label)
    setStore(makeStore({ journal: [testJournalEntry({ mood: "🥰" })] }));
    render(<JournalView />);

    // When: the page renders
    // Then: the emoji appears as-is in the chip
    expect(within(screen.getByRole("article")).getByText("🥰")).toBeTruthy();
  });

  it("shows a label-only custom mood in the chip", () => {
    // Given: an entry whose mood is written text with no emoji
    setStore(makeStore({ journal: [testJournalEntry({ mood: "Grateful" })] }));
    render(<JournalView />);

    // When: the page renders
    // Then: the text appears in the chip
    expect(within(screen.getByRole("article")).getByText("Grateful")).toBeTruthy();
  });

  it("shows the raw mood string for any unrecognised value without crashing", () => {
    // Given: an entry with an unknown mood key
    setStore(makeStore({ journal: [testJournalEntry({ mood: "unknown-value" })] }));
    render(<JournalView />);

    // When: the page renders
    // Then: the raw string is displayed — no crash
    expect(within(screen.getByRole("article")).getByText("unknown-value")).toBeTruthy();
  });
});

