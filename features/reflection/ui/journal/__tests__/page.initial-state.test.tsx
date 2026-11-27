import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

describe("JournalView initial state", () => {
  beforeEach(() => {
    setStore(makeStore({ journal: [] }));
  });

  it("shows the composer heading and the three prompt shortcuts", () => {
    // Given: no journal entries
    render(<JournalView />);

    // When: the page renders in its default state
    // Then: the composer heading and all three prompts are visible
    expect(screen.getByRole("heading", { level: 2, name: "How did today go?" })).toBeTruthy();
    expect(screen.getByText("What habit felt automatic today?")).toBeTruthy();
    expect(screen.getByText("Where did friction show up?")).toBeTruthy();
    expect(screen.getByText("What is one tiny adjustment for tomorrow?")).toBeTruthy();
  });

  it("displays existing journal entries when the store contains them", () => {
    // Given: two entries already in the journal
    setStore(makeStore({
      journal: [
        testJournalEntry({ id: "j1", title: "First reflection" }),
        testJournalEntry({ id: "j2", title: "Second reflection" }),
      ],
    }));
    render(<JournalView />);

    // When: the page renders
    // Then: both entry titles appear in the list
    expect(screen.getByText("First reflection")).toBeTruthy();
    expect(screen.getByText("Second reflection")).toBeTruthy();
  });

  it("sorts entries newest-first when entries have different dates", () => {
    // Given: an older and a newer entry in any store order
    setStore(makeStore({
      journal: [
        testJournalEntry({ id: "j_old", date: "2030-01-01", title: "Older entry" }),
        testJournalEntry({ id: "j_new", date: "2030-01-10", title: "Newer entry" }),
      ],
    }));
    render(<JournalView />);

    // When: the page renders
    const headings = screen.getAllByRole("heading", { level: 3 });

    // Then: the newest entry appears first (entry titles are level-3 headings under week groups)
    expect(headings[0].textContent).toBe("Newer entry");
    expect(headings[1].textContent).toBe("Older entry");
  });

  it("shows the entry body text when it is non-empty", () => {
    // Given: an entry with a body
    setStore(makeStore({
      journal: [testJournalEntry({ body: "Kept the cue visible all morning." })],
    }));
    render(<JournalView />);

    // When: the page renders
    // Then: the body paragraph is visible
    expect(screen.getByText("Kept the cue visible all morning.")).toBeTruthy();
  });

  it("omits the body paragraph when the entry body is empty", () => {
    // Given: an entry with no body
    setStore(makeStore({ journal: [testJournalEntry({ body: "" })] }));
    render(<JournalView />);

    // When: the page renders
    // Then: no body paragraph is rendered
    expect(within(screen.getByRole("article")).queryByRole("paragraph")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Opening the compose form
// ---------------------------------------------------------------------------

