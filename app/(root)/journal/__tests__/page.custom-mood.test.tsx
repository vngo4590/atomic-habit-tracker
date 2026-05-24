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

describe("JournalPage custom mood picker", () => {
  beforeEach(() => {
    setStore(makeStore({ journal: [] }));
    render(<JournalPage />);
    fireEvent.click(screen.getByRole("button", { name: "New entry" }));
  });

  it("shows the emoji grid and mood label input when Custom is clicked", () => {
    // Given: the compose form is open

    // When: the user clicks the Custom chip
    fireEvent.click(screen.getByRole("button", { name: /Custom/ }));

    // Then: the picker panel is visible with step labels, emoji grid, and label input
    expect(screen.getByText("1. Pick an emoji (or type your own)")).toBeTruthy();
    expect(screen.getByText("2. Name your mood")).toBeTruthy();
    expect(screen.getByPlaceholderText("e.g. Energized, Calm, Grateful")).toBeTruthy();
    expect(screen.getByText("😊")).toBeTruthy();
    expect(screen.getByText("🌟")).toBeTruthy();
  });

  it("closes the picker when Custom is clicked a second time", () => {
    // Given: the picker is open
    fireEvent.click(screen.getByRole("button", { name: /Custom/ }));
    expect(screen.getByPlaceholderText("e.g. Energized, Calm, Grateful")).toBeTruthy();

    // When: the user clicks Custom again to dismiss
    fireEvent.click(screen.getByRole("button", { name: /Custom/ }));

    // Then: the picker is hidden
    expect(screen.queryByPlaceholderText("e.g. Energized, Calm, Grateful")).toBeNull();
  });

  it("highlights an emoji in the grid when clicked and keeps the picker open", () => {
    // Given: the picker is open
    fireEvent.click(screen.getByRole("button", { name: /Custom/ }));

    // When: the user clicks an emoji in the grid
    fireEvent.click(screen.getByText("🌟"));

    // Then: the picker stays open (emoji selection does not close the panel)
    expect(screen.getByPlaceholderText("e.g. Energized, Calm, Grateful")).toBeTruthy();
  });

  it("deselects the emoji when the same grid emoji is clicked a second time", () => {
    // Given: an emoji is selected in the picker
    fireEvent.click(screen.getByRole("button", { name: /Custom/ }));
    fireEvent.click(screen.getByText("🌟"));

    // When: the user clicks the same emoji again (use getAllByText — preview span also shows 🌟)
    const gridButton = screen.getAllByText("🌟").find((el) => el.tagName === "BUTTON") as HTMLElement;
    fireEvent.click(gridButton);

    // Then: the emoji preview next to the label input disappears
    // (the emoji span is only rendered when customEmoji is non-empty)
    expect(screen.queryByText("🌟", { selector: "span" })).toBeNull();
  });

  it("shows the selected emoji as a preview beside the label input", () => {
    // Given: the picker is open
    fireEvent.click(screen.getByRole("button", { name: /Custom/ }));

    // When: the user selects an emoji
    fireEvent.click(screen.getByText("🥳"));

    // Then: a preview span appears showing the chosen emoji next to the label input
    // (there will be at least one instance — in the grid button and in the preview span)
    const instances = screen.getAllByText("🥳");
    expect(instances.length).toBeGreaterThan(1);
  });

  it("keeps the Use button disabled when neither emoji nor label is provided", () => {
    // Given: the picker is open with no selection and no label typed
    fireEvent.click(screen.getByRole("button", { name: /Custom/ }));

    // When: the button state is evaluated
    const useBtn = screen.getByRole("button", { name: "Use" }) as HTMLButtonElement;

    // Then: Use is disabled
    expect(useBtn.disabled).toBe(true);
  });

  it("enables the Use button when only an emoji is selected (no label required)", () => {
    // Given: the picker is open and the user selects only an emoji
    fireEvent.click(screen.getByRole("button", { name: /Custom/ }));
    fireEvent.click(screen.getByText("🌟"));

    // When: the button state is evaluated
    const useBtn = screen.getByRole("button", { name: "Use" }) as HTMLButtonElement;

    // Then: Use is enabled — emoji alone is sufficient
    expect(useBtn.disabled).toBe(false);
  });

  it("enables the Use button when only a label is typed (no emoji required)", () => {
    // Given: the picker is open with only a typed label
    fireEvent.click(screen.getByRole("button", { name: /Custom/ }));
    fireEvent.change(screen.getByPlaceholderText("e.g. Energized, Calm, Grateful"), {
      target: { value: "Grateful" },
    });

    // When: the button state is evaluated
    const useBtn = screen.getByRole("button", { name: "Use" }) as HTMLButtonElement;

    // Then: Use is enabled — label alone is sufficient
    expect(useBtn.disabled).toBe(false);
  });

  it("keeps the Use button disabled when the label is whitespace-only and no emoji is selected", () => {
    // Given: the picker is open with only whitespace in the label field
    fireEvent.click(screen.getByRole("button", { name: /Custom/ }));
    fireEvent.change(screen.getByPlaceholderText("e.g. Energized, Calm, Grateful"), {
      target: { value: "   " },
    });

    // When: the button state is evaluated
    const useBtn = screen.getByRole("button", { name: "Use" }) as HTMLButtonElement;

    // Then: the button remains disabled — trimmed label is empty and no emoji selected
    expect(useBtn.disabled).toBe(true);
  });

  it("closes the picker when Use is clicked with a valid selection", () => {
    // Given: the picker has an emoji selected and a label typed
    fireEvent.click(screen.getByRole("button", { name: /Custom/ }));
    fireEvent.click(screen.getByText("🌟"));
    fireEvent.change(screen.getByPlaceholderText("e.g. Energized, Calm, Grateful"), {
      target: { value: "Energized" },
    });

    // When: the user clicks Use
    fireEvent.click(screen.getByRole("button", { name: "Use" }));

    // Then: the picker closes
    expect(screen.queryByPlaceholderText("e.g. Energized, Calm, Grateful")).toBeNull();
  });

  it("closes the picker when Enter is pressed in the label input", () => {
    // Given: the picker has a label typed
    fireEvent.click(screen.getByRole("button", { name: /Custom/ }));
    fireEvent.change(screen.getByPlaceholderText("e.g. Energized, Calm, Grateful"), {
      target: { value: "Calm" },
    });

    // When: the user presses Enter
    fireEvent.keyDown(screen.getByPlaceholderText("e.g. Energized, Calm, Grateful"), { key: "Enter" });

    // Then: the picker closes
    expect(screen.queryByPlaceholderText("e.g. Energized, Calm, Grateful")).toBeNull();
  });

  it("closes the picker when a preset mood chip is clicked while it is open", () => {
    // Given: the emoji picker is open
    fireEvent.click(screen.getByRole("button", { name: /Custom/ }));
    expect(screen.getByPlaceholderText("e.g. Energized, Calm, Grateful")).toBeTruthy();

    // When: the user clicks a preset chip instead
    fireEvent.click(screen.getByRole("button", { name: /Hard/ }));

    // Then: the picker closes
    expect(screen.queryByPlaceholderText("e.g. Energized, Calm, Grateful")).toBeNull();
  });

});

// ---------------------------------------------------------------------------
// Custom mood — keyboard emoji input
// ---------------------------------------------------------------------------

