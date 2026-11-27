import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { testJournalEntry } from "@/lib/test/fixtures";

import { JournalView } from "../JournalView";
import { makeStore, setStore, storeRef } from "./helpers";

vi.mock("@/components/StoreProvider", () => ({
  useStoreContext: () => storeRef.current,
}));

afterEach(() => {
  cleanup();
});

describe("JournalView empty state and week sections", () => {
  it("invites the first entry and moves focus to the title field from the empty state", () => {
    // Given: an empty journal
    setStore(makeStore({ journal: [] }));
    render(<JournalView />);
    expect(screen.getByRole("heading", { name: "Your journal is empty" })).toBeTruthy();

    // When: the user follows the empty-state call to action
    fireEvent.click(screen.getByRole("button", { name: "Write your first entry" }));

    // Then: the composer's title field is focused and ready for typing
    expect(document.activeElement).toBe(screen.getByLabelText("Title"));
  });

  it("hides the empty state once entries exist and groups them under week headings", () => {
    // Given: two entries in different calendar weeks
    setStore(makeStore({
      journal: [
        testJournalEntry({ id: "j1", date: "2030-01-10", title: "Later" }),
        testJournalEntry({ id: "j2", date: "2030-01-02", title: "Earlier" }),
      ],
    }));
    render(<JournalView />);

    // Then: no empty state, and each entry sits in its own week section
    expect(screen.queryByRole("heading", { name: "Your journal is empty" })).toBeNull();
    expect(screen.getAllByRole("article")).toHaveLength(2);
    const weekHeadings = screen
      .getAllByRole("heading", { level: 2 })
      .filter((heading) => heading.textContent !== "How did today go?");
    expect(weekHeadings).toHaveLength(2);
  });
});
