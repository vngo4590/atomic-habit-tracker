import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { StackContextProvider } from "./_stack-test-utils";
import { StackDiagram } from "@/components/StackDiagram";
import type { Habit } from "@/lib/types";

function makeHabit(id: string, stackNextId?: string | null): Habit {
  return {
    id,
    name: `Habit ${id}`,
    emoji: "•",
    cue: "",
    craving: "",
    response: "",
    reward: "",
    loopCue: "",
    loopCraving: "",
    loopResponse: "",
    loopReward: "",
    twoMin: "",
    identity: "tester",
    environment: "",
    schedule: "Daily",
    time: "Morning",
    stackNextId: stackNextId ?? null,
    contract: "",
    contractPartners: [],
    history: {},
    notes: [],
    createdAt: "2030-01-01",
  };
}

afterEach(() => {
  cleanup();
});

describe("StackDiagram", () => {
  it("shows empty state for a solo habit", () => {
    const habit = makeHabit("solo");
    render(
      <StackContextProvider habits={[habit]}>
        <StackDiagram habit={habit} habits={[habit]} />
      </StackContextProvider>,
    );

    expect(screen.getByText("This habit is not part of a stack.")).toBeTruthy();
  });

  it("renders the chain with position label and current habit highlighted", () => {
    const habits = [makeHabit("root", "a"), makeHabit("a", "b"), makeHabit("b")];
    render(
      <StackContextProvider habits={habits}>
        <StackDiagram habit={habits[1]} habits={habits} />
      </StackContextProvider>,
    );

    expect(screen.getByText("Step 2 of 3")).toBeTruthy();
    const chips = screen.getAllByTestId("stack-chain-chip");
    expect(chips).toHaveLength(3);
    expect(within(chips[0]).getByText("Habit root")).toBeTruthy();
    expect(within(chips[1]).getByText("Habit a")).toBeTruthy();
    expect(within(chips[2]).getByText("Habit b")).toBeTruthy();
  });

  it("calls applyStackMutation with the picked solo as source and the current habit as anchor when linking after", async () => {
    const applyStackMutation = vi.fn().mockResolvedValue(undefined);
    const habits = [makeHabit("a"), makeHabit("b")];
    render(
      <StackContextProvider habits={habits} applyStackMutation={applyStackMutation}>
        <StackDiagram habit={habits[0]} habits={habits} />
      </StackContextProvider>,
    );

    fireEvent.click(screen.getByText("Link after…"));
    // Picker offers solo habits; click b.
    fireEvent.click(screen.getByTestId("stack-link-option-b"));

    // Anchor = the current habit (a). Source = the picked standalone (b).
    expect(applyStackMutation).toHaveBeenCalledWith({
      kind: "insert",
      habitId: "b",
      position: "after",
      targetId: "a",
    });
  });

  it("allows adding a standalone before a chain member (top insertion)", async () => {
    // Existing chain: root -> mid -> tail. Open root and link a solo before it.
    const applyStackMutation = vi.fn().mockResolvedValue(undefined);
    const habits = [
      makeHabit("root", "mid"),
      makeHabit("mid", "tail"),
      makeHabit("tail"),
      makeHabit("standalone"),
    ];
    render(
      <StackContextProvider habits={habits} applyStackMutation={applyStackMutation}>
        <StackDiagram habit={habits[0]} habits={habits} />
      </StackContextProvider>,
    );

    fireEvent.click(screen.getByText("Link before…"));
    fireEvent.click(screen.getByTestId("stack-link-option-standalone"));

    expect(applyStackMutation).toHaveBeenCalledWith({
      kind: "insert",
      habitId: "standalone",
      position: "before",
      targetId: "root",
    });
  });

  it("allows adding a standalone after a mid-chain member", async () => {
    const applyStackMutation = vi.fn().mockResolvedValue(undefined);
    const habits = [
      makeHabit("root", "mid"),
      makeHabit("mid", "tail"),
      makeHabit("tail"),
      makeHabit("standalone"),
    ];
    render(
      <StackContextProvider habits={habits} applyStackMutation={applyStackMutation}>
        <StackDiagram habit={habits[1]} habits={habits} />
      </StackContextProvider>,
    );

    fireEvent.click(screen.getByText("Link after…"));
    fireEvent.click(screen.getByTestId("stack-link-option-standalone"));

    expect(applyStackMutation).toHaveBeenCalledWith({
      kind: "insert",
      habitId: "standalone",
      position: "after",
      targetId: "mid",
    });
  });

  it("allows adding a standalone after the tail of a chain (bottom insertion)", async () => {
    const applyStackMutation = vi.fn().mockResolvedValue(undefined);
    const habits = [
      makeHabit("root", "tail"),
      makeHabit("tail"),
      makeHabit("standalone"),
    ];
    render(
      <StackContextProvider habits={habits} applyStackMutation={applyStackMutation}>
        <StackDiagram habit={habits[1]} habits={habits} />
      </StackContextProvider>,
    );

    fireEvent.click(screen.getByText("Link after…"));
    fireEvent.click(screen.getByTestId("stack-link-option-standalone"));

    expect(applyStackMutation).toHaveBeenCalledWith({
      kind: "insert",
      habitId: "standalone",
      position: "after",
      targetId: "tail",
    });
  });

  it("offers the picker even when the current habit is a chain member", () => {
    // root -> tail, plus a standalone. Open the mid-chain member.
    const habits = [
      makeHabit("root", "tail"),
      makeHabit("tail"),
      makeHabit("standalone"),
    ];
    render(
      <StackContextProvider habits={habits}>
        <StackDiagram habit={habits[0]} habits={habits} />
      </StackContextProvider>,
    );
    fireEvent.click(screen.getByText("Link after…"));
    // The picker excludes chain members and includes the standalone.
    expect(screen.queryByTestId("stack-link-option-tail")).toBeNull();
    expect(screen.queryByTestId("stack-link-option-root")).toBeNull();
    expect(screen.getByTestId("stack-link-option-standalone")).toBeTruthy();
  });

  it("filters the selector list by the search input", () => {
    const habits = [
      makeHabit("a"),
      { ...makeHabit("b"), name: "Stretch" },
      { ...makeHabit("c"), name: "Read" },
    ];
    render(
      <StackContextProvider habits={habits}>
        <StackDiagram habit={habits[0]} habits={habits} />
      </StackContextProvider>,
    );

    fireEvent.click(screen.getByText("Link after…"));

    const search = screen.getByTestId("stack-link-search") as HTMLInputElement;
    fireEvent.change(search, { target: { value: "stre" } });

    expect(screen.queryByTestId("stack-link-option-b")).toBeTruthy();
    expect(screen.queryByTestId("stack-link-option-c")).toBeNull();
  });

  it("excludes habits already in a stack from the selector", () => {
    // a -> b, c is solo. Picker should only offer c.
    const habits = [makeHabit("a", "b"), makeHabit("b"), makeHabit("c")];
    render(
      <StackContextProvider habits={habits}>
        <StackDiagram habit={makeHabit("z")} habits={[...habits, makeHabit("z")]} />
      </StackContextProvider>,
    );

    fireEvent.click(screen.getByText("Link after…"));
    expect(screen.queryByTestId("stack-link-option-a")).toBeNull();
    expect(screen.queryByTestId("stack-link-option-b")).toBeNull();
    expect(screen.queryByTestId("stack-link-option-c")).toBeTruthy();
  });

  it("opens a modal and cancels the operation when applyStackMutation rejects", async () => {
    const applyStackMutation = vi.fn().mockRejectedValue(
      new Error("Linking these habits would create a circular stack."),
    );
    const habits = [makeHabit("a"), makeHabit("b")];
    render(
      <StackContextProvider habits={habits} applyStackMutation={applyStackMutation}>
        <StackDiagram habit={habits[0]} habits={habits} />
      </StackContextProvider>,
    );

    fireEvent.click(screen.getByText("Link after…"));
    fireEvent.click(screen.getByTestId("stack-link-option-b"));

    // Microtask flush for the rejected promise.
    await Promise.resolve();
    await Promise.resolve();

    const modal = await screen.findByTestId("modal");
    expect(modal).toBeTruthy();
    expect(within(modal).getByText(/circular stack/i)).toBeTruthy();

    // Acknowledging closes the modal — the user knows the operation was cancelled.
    fireEvent.click(screen.getByTestId("modal-primary"));
    await waitFor(() => expect(screen.queryByTestId("modal")).toBeNull());
  });

  it("cancels link mode when Cancel is clicked", () => {
    const habits = [makeHabit("a"), makeHabit("b")];
    render(
      <StackContextProvider habits={habits}>
        <StackDiagram habit={habits[0]} habits={habits} />
      </StackContextProvider>,
    );

    fireEvent.click(screen.getByText("Link after…"));
    expect(screen.getByText("Cancel")).toBeTruthy();
    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.queryByText("Cancel")).toBeNull();
  });

  it("calls applyStackMutation when removing from stack", () => {
    const applyStackMutation = vi.fn().mockResolvedValue(undefined);
    const habits = [makeHabit("root", "a"), makeHabit("a")];
    render(
      <StackContextProvider habits={habits} applyStackMutation={applyStackMutation}>
        <StackDiagram habit={habits[1]} habits={habits} />
      </StackContextProvider>,
    );

    fireEvent.click(screen.getByText("Remove from stack"));

    expect(applyStackMutation).toHaveBeenCalledWith({ kind: "remove", habitId: "a" });
  });
});
