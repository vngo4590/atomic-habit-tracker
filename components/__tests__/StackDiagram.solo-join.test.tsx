import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { StackDiagram, STACK_PICKER_DEFAULT_LIMIT } from "@/components/StackDiagram";

import {
  StackContextProvider,
  makeHabit,
  routerPush,
  routerBack,
} from "./_stack-diagram-test-helpers";

// vi.mock is only hoisted within the file that contains it, so each
// split test file installs its own next/navigation mock.
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

afterEach(() => {
  cleanup();
});

describe("StackDiagram", () => {
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
});

