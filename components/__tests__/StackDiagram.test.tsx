import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { StackContextProvider } from "./_stack-test-utils";
import { StackDiagram, STACK_PICKER_DEFAULT_LIMIT } from "@/components/StackDiagram";
import type { Habit } from "@/lib/types";

// Mock next/navigation so tests can render the client component without a
// Next App Router context, and inspect navigation calls.
const routerPush = vi.fn();
const routerBack = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPush,
    back: routerBack,
    replace: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

beforeEach(() => {
  routerPush.mockReset();
  routerBack.mockReset();
});

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

  it("calls applyStackMutation with the picked solo as source and the current habit as anchor when linking after (solo+solo)", async () => {
    // Current habit (a) is solo. Picked (b) is also solo. The natural reading
    // of "Link after…" applies: picked is inserted AFTER the current anchor
    // → chain a → b.
    const applyStackMutation = vi.fn().mockResolvedValue(undefined);
    const habits = [makeHabit("a"), makeHabit("b")];
    render(
      <StackContextProvider habits={habits} applyStackMutation={applyStackMutation}>
        <StackDiagram habit={habits[0]} habits={habits} />
      </StackContextProvider>,
    );

    fireEvent.click(screen.getByText("Link after…"));
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

  it("excludes chain members from the selector when the current habit is in a chain", () => {
    // Chain a -> b, plus solo c. View mid-chain habit b. Picker should only
    // offer c (the standalone). This is the in-chain branch of the picker.
    const habits = [makeHabit("a", "b"), makeHabit("b"), makeHabit("c")];
    render(
      <StackContextProvider habits={habits}>
        <StackDiagram habit={habits[0]} habits={habits} />
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

  describe("picker default-limit + expand", () => {
    /** Build the anchor habit plus N solo candidates with predictable names. */
    function buildHabits(soloCount: number): Habit[] {
      const anchor = makeHabit("anchor");
      const solos = Array.from({ length: soloCount }, (_, i) => {
        const id = `solo-${String(i).padStart(2, "0")}`;
        return { ...makeHabit(id), name: `Solo ${String(i).padStart(2, "0")}` };
      });
      return [anchor, ...solos];
    }

    it("shows at most the default limit of options when the candidate pool exceeds it", () => {
      // 15 standalone habits → picker shows only the first STACK_PICKER_DEFAULT_LIMIT.
      const habits = buildHabits(15);
      render(
        <StackContextProvider habits={habits}>
          <StackDiagram habit={habits[0]} habits={habits} />
        </StackContextProvider>,
      );

      fireEvent.click(screen.getByText("Link after…"));
      const options = within(screen.getByTestId("stack-link-options")).getAllByRole("button");
      expect(options).toHaveLength(STACK_PICKER_DEFAULT_LIMIT);

      // The Show-all affordance is offered with an accurate hidden-count.
      const showAll = screen.getByTestId("stack-link-show-all");
      expect(showAll.textContent).toContain("15");
      expect(showAll.textContent).toContain("5 more");
    });

    it("hides the Show-all affordance when the candidate pool is at or below the limit", () => {
      // Exactly STACK_PICKER_DEFAULT_LIMIT solos → no overflow, no Show-all.
      const habits = buildHabits(STACK_PICKER_DEFAULT_LIMIT);
      render(
        <StackContextProvider habits={habits}>
          <StackDiagram habit={habits[0]} habits={habits} />
        </StackContextProvider>,
      );

      fireEvent.click(screen.getByText("Link after…"));
      expect(screen.queryByTestId("stack-link-show-all")).toBeNull();
      expect(screen.queryByTestId("stack-link-show-less")).toBeNull();
      const options = within(screen.getByTestId("stack-link-options")).getAllByRole("button");
      expect(options).toHaveLength(STACK_PICKER_DEFAULT_LIMIT);
    });

    it("expands to reveal every candidate when Show-all is clicked, then collapses again", () => {
      const habits = buildHabits(13);
      render(
        <StackContextProvider habits={habits}>
          <StackDiagram habit={habits[0]} habits={habits} />
        </StackContextProvider>,
      );

      fireEvent.click(screen.getByText("Link after…"));
      fireEvent.click(screen.getByTestId("stack-link-show-all"));

      // Expanded: every candidate is rendered.
      const expandedOptions = within(screen.getByTestId("stack-link-options")).getAllByRole("button");
      expect(expandedOptions).toHaveLength(13);
      // Show-all is gone; Show-less takes over.
      expect(screen.queryByTestId("stack-link-show-all")).toBeNull();
      const showLess = screen.getByTestId("stack-link-show-less");

      fireEvent.click(showLess);
      const collapsedOptions = within(screen.getByTestId("stack-link-options")).getAllByRole("button");
      expect(collapsedOptions).toHaveLength(STACK_PICKER_DEFAULT_LIMIT);
      expect(screen.queryByTestId("stack-link-show-all")).toBeTruthy();
    });

    it("typing in the search input narrows the list and resets the expansion", () => {
      // 12 solos: solo-00..solo-11. "11" matches only solo-11.
      const habits = buildHabits(12);
      render(
        <StackContextProvider habits={habits}>
          <StackDiagram habit={habits[0]} habits={habits} />
        </StackContextProvider>,
      );

      fireEvent.click(screen.getByText("Link after…"));
      // First, expand so we can verify the search collapses things back.
      fireEvent.click(screen.getByTestId("stack-link-show-all"));
      expect(screen.queryByTestId("stack-link-show-less")).toBeTruthy();

      const search = screen.getByTestId("stack-link-search") as HTMLInputElement;
      fireEvent.change(search, { target: { value: "11" } });

      // After typing, the search reset expansion and the list now holds 1 entry.
      const options = within(screen.getByTestId("stack-link-options")).getAllByRole("button");
      expect(options).toHaveLength(1);
      expect(options[0].textContent).toContain("Solo 11");
      // No expand/collapse buttons because the filtered count is well under the limit.
      expect(screen.queryByTestId("stack-link-show-all")).toBeNull();
      expect(screen.queryByTestId("stack-link-show-less")).toBeNull();
    });

    it("clears search and collapses back to the limit after Cancel", () => {
      const habits = buildHabits(13);
      render(
        <StackContextProvider habits={habits}>
          <StackDiagram habit={habits[0]} habits={habits} />
        </StackContextProvider>,
      );

      fireEvent.click(screen.getByText("Link after…"));
      fireEvent.click(screen.getByTestId("stack-link-show-all"));
      fireEvent.click(screen.getByText("Cancel"));

      // Re-open: should be back to the default capped view.
      fireEvent.click(screen.getByText("Link after…"));
      const options = within(screen.getByTestId("stack-link-options")).getAllByRole("button");
      expect(options).toHaveLength(STACK_PICKER_DEFAULT_LIMIT);
      expect(screen.queryByTestId("stack-link-show-all")).toBeTruthy();
    });

    it("collapses back to the limit after a successful link", async () => {
      const applyStackMutation = vi.fn().mockResolvedValue(undefined);
      const habits = buildHabits(13);
      render(
        <StackContextProvider habits={habits} applyStackMutation={applyStackMutation}>
          <StackDiagram habit={habits[0]} habits={habits} />
        </StackContextProvider>,
      );

      fireEvent.click(screen.getByText("Link after…"));
      fireEvent.click(screen.getByTestId("stack-link-show-all"));
      // Pick any option in the expanded list.
      fireEvent.click(screen.getByTestId("stack-link-option-solo-12"));
      expect(applyStackMutation).toHaveBeenCalledWith({
        kind: "insert",
        habitId: "solo-12",
        position: "after",
        targetId: "anchor",
      });

      // Re-open: expansion must have reset.
      fireEvent.click(screen.getByText("Link after…"));
      // 12 solos remain (solo-12 in the test pool doesn't really get added without a real store,
      // but the expansion state itself must be reset regardless of the mock outcome).
      expect(screen.queryByTestId("stack-link-show-all")).toBeTruthy();
    });
  });

  describe("chain chip interactions", () => {
    it("navigates to a non-current chip's habit page via router.push when clicked", () => {
      const habits = [makeHabit("a", "b"), makeHabit("b", "c"), makeHabit("c")];
      render(
        <StackContextProvider habits={habits}>
          <StackDiagram habit={habits[0]} habits={habits} />
        </StackContextProvider>,
      );

      fireEvent.click(screen.getByTestId("stack-chip-link-b"));
      expect(routerPush).toHaveBeenCalledWith("/habits/b");
    });

    it("does not navigate when the current habit's own chip is clicked", () => {
      const habits = [makeHabit("a", "b"), makeHabit("b")];
      render(
        <StackContextProvider habits={habits}>
          <StackDiagram habit={habits[0]} habits={habits} />
        </StackContextProvider>,
      );

      fireEvent.click(screen.getByTestId("stack-chip-link-a"));
      expect(routerPush).not.toHaveBeenCalled();
    });

    it("calls applyStackMutation with { kind: 'remove' } when the chip's X is clicked", () => {
      const applyStackMutation = vi.fn().mockResolvedValue(undefined);
      const habits = [makeHabit("a", "b"), makeHabit("b", "c"), makeHabit("c")];
      render(
        <StackContextProvider habits={habits} applyStackMutation={applyStackMutation}>
          <StackDiagram habit={habits[0]} habits={habits} />
        </StackContextProvider>,
      );

      fireEvent.click(screen.getByTestId("stack-chip-remove-b"));
      expect(applyStackMutation).toHaveBeenCalledWith({ kind: "remove", habitId: "b" });
    });

    it("X click does not also navigate (stopPropagation works)", () => {
      const applyStackMutation = vi.fn().mockResolvedValue(undefined);
      const habits = [makeHabit("a", "b"), makeHabit("b", "c"), makeHabit("c")];
      render(
        <StackContextProvider habits={habits} applyStackMutation={applyStackMutation}>
          <StackDiagram habit={habits[0]} habits={habits} />
        </StackContextProvider>,
      );

      fireEvent.click(screen.getByTestId("stack-chip-remove-b"));
      expect(applyStackMutation).toHaveBeenCalledWith({ kind: "remove", habitId: "b" });
      expect(routerPush).not.toHaveBeenCalled();
    });

    it("X click on the current habit's chip removes the current habit", () => {
      const applyStackMutation = vi.fn().mockResolvedValue(undefined);
      const habits = [makeHabit("a", "b"), makeHabit("b", "c"), makeHabit("c")];
      render(
        <StackContextProvider habits={habits} applyStackMutation={applyStackMutation}>
          <StackDiagram habit={habits[1]} habits={habits} />
        </StackContextProvider>,
      );

      fireEvent.click(screen.getByTestId("stack-chip-remove-b"));
      expect(applyStackMutation).toHaveBeenCalledWith({ kind: "remove", habitId: "b" });
    });

    it("shows an error modal when X removal rejects", async () => {
      const applyStackMutation = vi
        .fn()
        .mockRejectedValue(new Error("Server unreachable"));
      const habits = [makeHabit("a", "b"), makeHabit("b", "c"), makeHabit("c")];
      render(
        <StackContextProvider habits={habits} applyStackMutation={applyStackMutation}>
          <StackDiagram habit={habits[0]} habits={habits} />
        </StackContextProvider>,
      );

      fireEvent.click(screen.getByTestId("stack-chip-remove-b"));
      const modal = await screen.findByTestId("modal");
      expect(within(modal).getByText(/Server unreachable/i)).toBeTruthy();
    });
  });

  describe("drag reorder", () => {
    it("renders chips inside a Reorder.Group list with stable item testids", () => {
      const habits = [makeHabit("a", "b"), makeHabit("b", "c"), makeHabit("c")];
      render(
        <StackContextProvider habits={habits}>
          <StackDiagram habit={habits[0]} habits={habits} />
        </StackContextProvider>,
      );

      expect(screen.getByTestId("stack-chain-list")).toBeTruthy();
      expect(screen.getByTestId("stack-chip-item-a")).toBeTruthy();
      expect(screen.getByTestId("stack-chip-item-b")).toBeTruthy();
      expect(screen.getByTestId("stack-chip-item-c")).toBeTruthy();
    });

    it("X removal on a mid-chain chip uses the right habitId so the chain heals around it", () => {
      // Server-side stackRemovePatches handles re-linking; this test just
      // verifies the UI emits the correct mutation argument.
      const applyStackMutation = vi.fn().mockResolvedValue(undefined);
      const habits = [makeHabit("a", "b"), makeHabit("b", "c"), makeHabit("c", "d"), makeHabit("d")];
      render(
        <StackContextProvider habits={habits} applyStackMutation={applyStackMutation}>
          <StackDiagram habit={habits[0]} habits={habits} />
        </StackContextProvider>,
      );

      fireEvent.click(screen.getByTestId("stack-chip-remove-c"));
      expect(applyStackMutation).toHaveBeenCalledTimes(1);
      expect(applyStackMutation).toHaveBeenCalledWith({ kind: "remove", habitId: "c" });
    });
  });

  describe("solo habit joining an existing chain", () => {
    it("picker offers chain members (not just standalones) when the current habit is solo", () => {
      // Chain a -> b -> c, plus solo S. Open S's Stack tab.
      // Under the new symmetric picker, every other habit is selectable.
      const habits = [
        makeHabit("a", "b"),
        makeHabit("b", "c"),
        makeHabit("c"),
        makeHabit("S"),
      ];
      render(
        <StackContextProvider habits={habits}>
          <StackDiagram habit={habits[3]} habits={habits} />
        </StackContextProvider>,
      );

      fireEvent.click(screen.getByText("Link after…"));
      // All three chain members appear as candidates.
      expect(screen.getByTestId("stack-link-option-a")).toBeTruthy();
      expect(screen.getByTestId("stack-link-option-b")).toBeTruthy();
      expect(screen.getByTestId("stack-link-option-c")).toBeTruthy();
      // The current habit itself is never offered.
      expect(screen.queryByTestId("stack-link-option-S")).toBeNull();
    });

    it("inserts current solo AFTER a picked chain member (mid-chain join)", () => {
      // Picking b with "Link after" should insert S immediately after b:
      // result chain a -> b -> S -> c.
      const applyStackMutation = vi.fn().mockResolvedValue(undefined);
      const habits = [
        makeHabit("a", "b"),
        makeHabit("b", "c"),
        makeHabit("c"),
        makeHabit("S"),
      ];
      render(
        <StackContextProvider habits={habits} applyStackMutation={applyStackMutation}>
          <StackDiagram habit={habits[3]} habits={habits} />
        </StackContextProvider>,
      );

      fireEvent.click(screen.getByText("Link after…"));
      fireEvent.click(screen.getByTestId("stack-link-option-b"));

      // habitId = the solo (S, the inserted one); targetId = the anchor (b).
      expect(applyStackMutation).toHaveBeenCalledWith({
        kind: "insert",
        habitId: "S",
        position: "after",
        targetId: "b",
      });
    });

    it("inserts current solo BEFORE a picked chain member (top-of-chain join)", () => {
      // Picking a with "Link before" should put S at the top: S -> a -> b -> c.
      const applyStackMutation = vi.fn().mockResolvedValue(undefined);
      const habits = [
        makeHabit("a", "b"),
        makeHabit("b", "c"),
        makeHabit("c"),
        makeHabit("S"),
      ];
      render(
        <StackContextProvider habits={habits} applyStackMutation={applyStackMutation}>
          <StackDiagram habit={habits[3]} habits={habits} />
        </StackContextProvider>,
      );

      fireEvent.click(screen.getByText("Link before…"));
      fireEvent.click(screen.getByTestId("stack-link-option-a"));

      expect(applyStackMutation).toHaveBeenCalledWith({
        kind: "insert",
        habitId: "S",
        position: "before",
        targetId: "a",
      });
    });

    it("inserts current solo AFTER the tail of a chain", () => {
      const applyStackMutation = vi.fn().mockResolvedValue(undefined);
      const habits = [
        makeHabit("a", "b"),
        makeHabit("b", "c"),
        makeHabit("c"),
        makeHabit("S"),
      ];
      render(
        <StackContextProvider habits={habits} applyStackMutation={applyStackMutation}>
          <StackDiagram habit={habits[3]} habits={habits} />
        </StackContextProvider>,
      );

      fireEvent.click(screen.getByText("Link after…"));
      fireEvent.click(screen.getByTestId("stack-link-option-c"));

      // S inserted after tail c → a -> b -> c -> S.
      expect(applyStackMutation).toHaveBeenCalledWith({
        kind: "insert",
        habitId: "S",
        position: "after",
        targetId: "c",
      });
    });

    it("search still narrows the picker when the current habit is solo", () => {
      // Solo S with a chain and another solo; search should filter across
      // both kinds of candidates (chain members + standalones).
      const habits = [
        { ...makeHabit("a", "b"), name: "Apple" },
        { ...makeHabit("b"), name: "Banana" },
        { ...makeHabit("c"), name: "Cherry" },
        makeHabit("S"),
      ];
      render(
        <StackContextProvider habits={habits}>
          <StackDiagram habit={habits[3]} habits={habits} />
        </StackContextProvider>,
      );

      fireEvent.click(screen.getByText("Link after…"));
      const search = screen.getByTestId("stack-link-search") as HTMLInputElement;
      fireEvent.change(search, { target: { value: "ban" } });

      expect(screen.queryByTestId("stack-link-option-b")).toBeTruthy();
      expect(screen.queryByTestId("stack-link-option-a")).toBeNull();
      expect(screen.queryByTestId("stack-link-option-c")).toBeNull();
    });

    it("shows the solo-current empty-state copy when no other habits exist", () => {
      const habits = [makeHabit("S")];
      render(
        <StackContextProvider habits={habits}>
          <StackDiagram habit={habits[0]} habits={habits} />
        </StackContextProvider>,
      );
      // Solo with no other habits → diagram shows the "not part of a stack"
      // empty state, no picker. Smoke-check that.
      expect(screen.getByText("This habit is not part of a stack.")).toBeTruthy();
    });

    it("surfaces server rejection in a modal when solo→chain insert is invalid", async () => {
      const applyStackMutation = vi.fn().mockRejectedValue(
        new Error("This habit is already part of a stack."),
      );
      const habits = [makeHabit("a", "b"), makeHabit("b"), makeHabit("S")];
      render(
        <StackContextProvider habits={habits} applyStackMutation={applyStackMutation}>
          <StackDiagram habit={habits[2]} habits={habits} />
        </StackContextProvider>,
      );

      fireEvent.click(screen.getByText("Link after…"));
      fireEvent.click(screen.getByTestId("stack-link-option-b"));

      await Promise.resolve();
      await Promise.resolve();

      const modal = await screen.findByTestId("modal");
      expect(within(modal).getByText(/already part of a stack/i)).toBeTruthy();
    });
  });

  describe("mobile-friendly chain layout", () => {
    // Given: a habit is part of a multi-item chain
    // When: the StackDiagram renders the chain list
    // Then: the Reorder.Group uses the 'stack-chain-list' class for mobile
    //       overflow control and to prevent the global flex-wrap override
    it("applies the stack-chain-list class to the chain Reorder.Group", () => {
      const habits = [makeHabit("root", "a"), makeHabit("a", "b"), makeHabit("b")];
      render(
        <StackContextProvider habits={habits}>
          <StackDiagram habit={habits[0]} habits={habits} />
        </StackContextProvider>,
      );

      const chainList = screen.getByTestId("stack-chain-list");
      expect(chainList.classList.contains("stack-chain-list")).toBe(true);
    });

    // Given: a chain with many items
    // When: rendered on a mobile viewport
    // Then: all chip items have flexShrink: 0 to prevent compression
    it("renders chain chips with flexShrink 0 to prevent compression", () => {
      const habits = [
        makeHabit("h1", "h2"),
        makeHabit("h2", "h3"),
        makeHabit("h3", "h4"),
        makeHabit("h4", "h5"),
        makeHabit("h5"),
      ];
      render(
        <StackContextProvider habits={habits}>
          <StackDiagram habit={habits[0]} habits={habits} />
        </StackContextProvider>,
      );

      const chips = screen.getAllByTestId("stack-chain-chip");
      expect(chips.length).toBe(5);
      // Each chip's parent Reorder.Item carries the .chipItem class from
      // StackDiagram.module.css, which sets flex-shrink: 0. We assert the
      // class rather than the computed style because jsdom does not
      // resolve external CSS modules at runtime.
      chips.forEach((chip) => {
        const reorderItem = chip.closest("[data-testid^='stack-chip-item']");
        expect(reorderItem).toBeTruthy();
        expect((reorderItem as HTMLElement).className).toMatch(/chipItem/);
      });
    });
  });
});
