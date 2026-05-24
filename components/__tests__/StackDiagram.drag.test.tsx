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
});

