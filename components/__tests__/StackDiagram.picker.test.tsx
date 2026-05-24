import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { StackDiagram, STACK_PICKER_DEFAULT_LIMIT } from "@/components/StackDiagram";
import type { Habit } from "@/lib/types";

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
});

