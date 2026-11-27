import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

describe("JournalView compose form", () => {
  beforeEach(() => {
    setStore(makeStore({ journal: [] }));
  });

  it("shows the composer with all fields as soon as the page opens", () => {
    // Given: the page in its default state
    render(<JournalView />);

    // Then: the title input, mood chips, reflection textarea and Save button are ready to use
    expect(screen.getByRole("region", { name: "How did today go?" })).toBeTruthy();
    expect(screen.getByLabelText("Title")).toBeTruthy();
    expect(screen.getByLabelText("Reflection")).toBeTruthy();
    expect(screen.getByRole("group", { name: "Mood" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Good day/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /So-so/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Hard/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Custom/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Save entry" })).toBeTruthy();
  });

  it("keeps the prompt shortcuts visible beside the composer", () => {
    // Given: the page in its default state
    render(<JournalView />);

    // Then: the prompt shortcuts are offered as starting points
    expect(screen.getByRole("button", { name: "What habit felt automatic today?" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Where did friction show up?" })).toBeTruthy();
  });

  it("pre-fills the title field and focuses the reflection when a prompt shortcut is clicked", () => {
    // Given: the page in default state
    render(<JournalView />);

    // When: the user clicks a prompt shortcut
    fireEvent.click(screen.getByText("What habit felt automatic today?"));

    // Then: the prompt becomes the title and the reflection is ready for typing
    const titleInput = screen.getByPlaceholderText("What happened today?") as HTMLInputElement;
    expect(titleInput.value).toBe("What habit felt automatic today?");
    expect(document.activeElement).toBe(screen.getByLabelText("Reflection"));
  });

  it("starts with an empty title and the Good day mood selected", () => {
    // Given: the page in default state
    render(<JournalView />);

    // Then: the title is empty and Good day is the pressed mood
    const titleInput = screen.getByPlaceholderText("What happened today?") as HTMLInputElement;
    expect(titleInput.value).toBe("");
    expect(screen.getByRole("button", { name: /Good day/ }).getAttribute("aria-pressed")).toBe("true");
  });
});
