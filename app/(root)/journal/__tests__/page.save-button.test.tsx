import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

describe("JournalPage Save entry button state", () => {
  beforeEach(() => {
    setStore(makeStore({ journal: [] }));
    render(<JournalPage />);
    fireEvent.click(screen.getByRole("button", { name: "New entry" }));
  });

  it("disables Save entry when the title is empty", () => {
    // Given: the compose form is open with no title

    // When: the title field has not been filled
    const saveBtn = screen.getByRole("button", { name: "Save entry" }) as HTMLButtonElement;

    // Then: the button is disabled
    expect(saveBtn.disabled).toBe(true);
  });

  it("disables Save entry when the title contains only whitespace", () => {
    // Given: the user types only spaces into the title
    fireEvent.change(screen.getByPlaceholderText("What happened today?"), {
      target: { value: "   " },
    });

    // When: Save entry is checked
    const saveBtn = screen.getByRole("button", { name: "Save entry" }) as HTMLButtonElement;

    // Then: the button remains disabled — title.trim() is empty
    expect(saveBtn.disabled).toBe(true);
  });

  it("enables Save entry once the title has non-whitespace content", () => {
    // Given: the user types a valid title
    fireEvent.change(screen.getByPlaceholderText("What happened today?"), {
      target: { value: "A" },
    });

    // When: the button state is evaluated
    const saveBtn = screen.getByRole("button", { name: "Save entry" }) as HTMLButtonElement;

    // Then: the button is enabled
    expect(saveBtn.disabled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Saving a new entry — preset moods
// ---------------------------------------------------------------------------

