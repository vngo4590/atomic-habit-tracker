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

describe("JournalPage opening the compose form", () => {
  beforeEach(() => {
    setStore(makeStore({ journal: [] }));
  });

  it("shows the compose form with all fields after clicking New entry", () => {
    // Given: the page in its default state
    render(<JournalPage />);

    // When: the user clicks New entry
    fireEvent.click(screen.getByRole("button", { name: "New entry" }));

    // Then: the title input, mood chips, reflection textarea, and action buttons appear
    expect(screen.getByPlaceholderText("What happened today?")).toBeTruthy();
    expect(screen.getByPlaceholderText("Capture the lesson while it is fresh.")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Good day/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /So-so/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Hard/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Custom/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Save entry" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeTruthy();
  });

  it("hides the prompt cards when the compose form opens", () => {
    // Given: the page showing prompt cards
    render(<JournalPage />);

    // When: the compose form is opened
    fireEvent.click(screen.getByRole("button", { name: "New entry" }));

    // Then: the prompt shortcuts are replaced by the compose form
    expect(screen.queryByText("What habit felt automatic today?")).toBeNull();
    expect(screen.queryByText("Where did friction show up?")).toBeNull();
  });

  it("pre-fills the title field when a prompt shortcut is clicked", () => {
    // Given: the page in default state
    render(<JournalPage />);

    // When: the user clicks a prompt card
    fireEvent.click(screen.getByText("What habit felt automatic today?"));

    // Then: the compose form opens with the prompt as the title
    const titleInput = screen.getByPlaceholderText("What happened today?") as HTMLInputElement;
    expect(titleInput.value).toBe("What habit felt automatic today?");
  });

  it("opens with an empty title when New entry is clicked", () => {
    // Given: the page in default state
    render(<JournalPage />);

    // When: the user clicks New entry (not a prompt card)
    fireEvent.click(screen.getByRole("button", { name: "New entry" }));

    // Then: the title field is empty
    const titleInput = screen.getByPlaceholderText("What happened today?") as HTMLInputElement;
    expect(titleInput.value).toBe("");
  });
});

// ---------------------------------------------------------------------------
// Title validation and Save entry button state
// ---------------------------------------------------------------------------

