import { cleanup, render, screen } from "@testing-library/react";
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

