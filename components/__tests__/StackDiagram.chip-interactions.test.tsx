import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { StackDiagram } from "@/components/StackDiagram";

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
});

