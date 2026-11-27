import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FormationQuestionnaire } from "@/components/FormationQuestionnaire";
import type { Habit } from "@/lib/types";

const habit = { id: "h_read", name: "Read one page", emoji: "📖" } as Habit;

describe("FormationQuestionnaire (Hall of Fame induction review)", () => {
  afterEach(() => {
    cleanup();
  });

  describe("accessibility", () => {
    it("is announced as a modal dialog named after the habit under review", () => {
      // Given a habit has reached its 66-day formation review
      render(<FormationQuestionnaire habit={habit} onClose={vi.fn()} onSubmit={vi.fn()} />);

      // Then screen-reader users hear a modal dialog titled with the habit name
      const dialog = screen.getByRole("dialog", { name: "Read one page" });
      expect(dialog.getAttribute("aria-modal")).toBe("true");
    });

    it("labels each rating row with its question and the reflection box with its label", () => {
      // Given the questionnaire is open
      render(<FormationQuestionnaire habit={habit} onClose={vi.fn()} onSubmit={vi.fn()} />);

      // Then every question is a named group of five rating buttons
      const group = screen.getByRole("group", { name: "The cue is obvious in my environment." });
      expect(within(group).getAllByRole("button")).toHaveLength(5);

      // And the reflection textarea is reachable by its visible label
      expect(screen.getByLabelText("Reflection").tagName).toBe("TEXTAREA");
    });

    it("marks the chosen rating as pressed", () => {
      // Given the questionnaire is open
      render(<FormationQuestionnaire habit={habit} onClose={vi.fn()} onSubmit={vi.fn()} />);
      const group = screen.getByRole("group", { name: "Missing it feels noticeable." });

      // When the user rates the question 4
      fireEvent.click(within(group).getByRole("button", { name: "4" }));

      // Then only that rating reports itself as selected
      expect(within(group).getByRole("button", { name: "4" }).getAttribute("aria-pressed")).toBe("true");
      expect(within(group).getByRole("button", { name: "3" }).getAttribute("aria-pressed")).toBe("false");
    });
  });

  describe("induction verdict", () => {
    it("keeps the verdict buttons disabled until all five questions are rated, then inducts the habit", () => {
      // Given the questionnaire is open
      const onSubmit = vi.fn();
      render(<FormationQuestionnaire habit={habit} onClose={vi.fn()} onSubmit={onSubmit} />);
      const induct = screen.getByRole("button", { name: "Induct to Hall of Fame" }) as HTMLButtonElement;
      expect(induct.disabled).toBe(true);

      // When the user rates every question 5
      for (const group of screen.getAllByRole("group")) {
        fireEvent.click(within(group).getByRole("button", { name: "5" }));
      }

      // Then induction is enabled and submits a formed verdict with the average score
      expect(induct.disabled).toBe(false);
      fireEvent.click(induct);
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ habitId: "h_read", formed: true, score: 5 }));
    });
  });
});
