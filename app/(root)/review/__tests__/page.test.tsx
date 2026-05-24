import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { dateAdd, todayKey } from "@/lib/helpers";
import type { Habit, WeeklyReview } from "@/lib/types";

function makeReview(weekStartKey: string, patch: Partial<WeeklyReview> = {}): WeeklyReview {
  return {
    weekStartKey,
    wentWell: `Wins for ${weekStartKey}`,
    smallestFix: `Fix for ${weekStartKey}`,
    identityVote: `Vote for ${weekStartKey}`,
    updatedAt: `${weekStartKey}T00:00:00.000Z`,
    ...patch,
  };
}

function makeHabit(id: string, history: Record<string, boolean> = {}): Habit {
  return {
    id,
    name: `Habit ${id}`,
    identity: "test identity",
    emoji: "🎯",
    cue: "test cue",
    craving: "test craving",
    response: "test response",
    reward: "test reward",
    loopCue: "",
    loopCraving: "",
    loopResponse: "",
    loopReward: "",
    twoMin: "",
    environment: "",
    schedule: "Daily",
    time: "morning",
    contract: "",
    contractPartners: [],
    history,
    notes: [],
    stackNextId: null,
    createdAt: "2024-01-01T00:00:00.000Z",
  };
}

const storeMock = vi.hoisted(() => ({
  habits: [] as Habit[],
  completionRate: vi.fn(() => 0.75),
  showToast: vi.fn(),
  weeklyReview: { wentWell: "", smallestFix: "", identityVote: "" },
  weeklyReviews: [] as WeeklyReview[],
  setWeeklyReview: vi.fn(),
}));

vi.mock("@/components/StoreProvider", () => ({
  useStoreContext: () => storeMock,
}));

import ReviewPage from "@/app/(root)/review/page";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  storeMock.habits = [];
  storeMock.weeklyReview = { wentWell: "", smallestFix: "", identityVote: "" };
  storeMock.weeklyReviews = [];
});

describe("ReviewPage", () => {
  it("starts empty reviews from an animated intro and saves the current week", () => {
    const weekStartKey = dateAdd(todayKey(), -6);
    render(<ReviewPage />);

    expect(screen.getByRole("button", { name: "Write this week's review" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Save review" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Write this week's review" }));
    fireEvent.change(screen.getByLabelText("What went well? Why?"), { target: { value: "Kept the morning habit" } });
    fireEvent.click(screen.getByRole("button", { name: "Save review" }));

    expect(storeMock.setWeeklyReview).toHaveBeenCalledWith(weekStartKey, {
      wentWell: "Kept the morning habit",
      smallestFix: "",
      identityVote: "",
    });
  });

  it("shows saved current and past reviews, then pages into the archive", () => {
    const weekStartKey = dateAdd(todayKey(), -6);
    storeMock.weeklyReview = {
      wentWell: "Current win",
      smallestFix: "Current fix",
      identityVote: "Current identity",
    };
    storeMock.weeklyReviews = [
      makeReview(weekStartKey, storeMock.weeklyReview),
      ...Array.from({ length: 6 }, (_, index) => makeReview(dateAdd(weekStartKey, -7 * (index + 1)))),
    ];

    render(<ReviewPage />);

    expect(screen.getByText("This week's review")).toBeTruthy();
    expect(screen.getByText("Current win")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Write this week's review" })).toBeNull();
    expect(screen.getByRole("button", { name: "Read more" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Read more" }));
    expect(screen.getByText("Review archive")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Page 2 / 2")).toBeTruthy();
  });

  it("can edit a past review from the archive summary", () => {
    const weekStartKey = dateAdd(todayKey(), -6);
    const pastReview = makeReview(dateAdd(weekStartKey, -7));
    storeMock.weeklyReviews = [pastReview];

    render(<ReviewPage />);

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Who did I vote to become this week?"), { target: { value: "Patient teammate" } });
    fireEvent.click(screen.getByRole("button", { name: "Save review" }));

    expect(storeMock.setWeeklyReview).toHaveBeenCalledWith(pastReview.weekStartKey, {
      wentWell: pastReview.wentWell,
      smallestFix: pastReview.smallestFix,
      identityVote: "Patient teammate",
    });
  });

  describe("mobile-friendly layout classes", () => {
    // Given: the review page renders the 7-day progress grid
    // When: we inspect the rendered DOM
    // Then: it uses the review-week-grid class for responsive control
    it("renders the 7-day grid with the review-week-grid class", () => {
      render(<ReviewPage />);
      const weekGrid = document.querySelector(".review-week-grid");
      expect(weekGrid).toBeTruthy();
    });

    // Given: the review page renders individual day cards
    // When: we inspect the rendered DOM
    // Then: each card uses the review-day-card class for compact mobile sizing
    it("renders exactly 7 day cards with the review-day-card class", () => {
      render(<ReviewPage />);
      const dayCards = document.querySelectorAll(".review-day-card");
      expect(dayCards.length).toBe(7);
    });

    // Given: the review page renders wins and slips sections
    // When: we inspect the rendered DOM
    // Then: they are wrapped in the review-insights-grid for responsive stacking
    it("renders wins/slips in the review-insights-grid container", () => {
      render(<ReviewPage />);
      const insightsGrid = document.querySelector(".review-insights-grid");
      expect(insightsGrid).toBeTruthy();
      // Should contain both the Wins and Slips sections
      const sections = insightsGrid?.querySelectorAll(".card");
      expect(sections?.length).toBe(2);
    });

    // Given: the review page has past reviews
    // When: we inspect the rendered DOM
    // Then: each row uses the review-past-row class for mobile collapse
    it("renders past review rows with the review-past-row class", () => {
      const weekStartKey = dateAdd(todayKey(), -6);
      storeMock.weeklyReviews = [
        makeReview(dateAdd(weekStartKey, -7)),
        makeReview(dateAdd(weekStartKey, -14)),
      ];

      render(<ReviewPage />);
      const pastRows = document.querySelectorAll(".review-past-row");
      expect(pastRows.length).toBe(2);
    });

    // Given: the review page renders the bar chart within day cards
    // When: we inspect the rendered DOM
    // Then: bar containers use the review-day-bar-container class
    it("renders progress bars with the review-day-bar-container class", () => {
      render(<ReviewPage />);
      const barContainers = document.querySelectorAll(".review-day-bar-container");
      expect(barContainers.length).toBe(7);
    });
  });

  describe("habit completion display", () => {
    // Given: user has habits with history on some review days
    // When: the review page renders
    // Then: completion stats reflect the real data
    it("displays correct completion percentage in the header", () => {
      const today = todayKey();
      const days = Array.from({ length: 7 }, (_, i) => dateAdd(today, i - 6));
      const history: Record<string, boolean> = {};
      // Mark habit as done on 4 of the 7 days
      days.slice(0, 4).forEach((day) => { history[day] = true; });

      storeMock.habits = [makeHabit("h1", history)];

      render(<ReviewPage />);
      // 4 done out of 7 possible = 57%
      expect(screen.getByText(/4 \/ 7 check-ins/)).toBeTruthy();
      expect(screen.getByText(/57%/)).toBeTruthy();
    });
  });

  describe("markdown rendering of review entries", () => {
    // Given: the current week's review has markdown formatting in its answers
    // When: the review page renders the read-only display
    // Then: each answer is rendered via the shared MarkdownText component,
    //       producing the matching block-level HTML (strong, list items, etc.)
    it("renders markdown formatting in the current week's saved answers", () => {
      const weekStartKey = dateAdd(todayKey(), -6);
      storeMock.weeklyReview = {
        wentWell: "**Bold win** with formatting",
        smallestFix: "- step one\n- step two",
        identityVote: "Become _disciplined_",
      };
      storeMock.weeklyReviews = [makeReview(weekStartKey, storeMock.weeklyReview)];

      render(<ReviewPage />);

      // Bold markdown -> <strong>
      const strong = screen.getByText("Bold win");
      expect(strong.tagName).toBe("STRONG");
      // List markdown -> two <li> children inside an <ul>
      expect(screen.getByText("step one").tagName).toBe("LI");
      expect(screen.getByText("step two").tagName).toBe("LI");
      // Italic markdown -> <em>
      const em = screen.getByText("disciplined");
      expect(em.tagName).toBe("EM");
    });

    // Given: a past review with markdown in smallestFix and identityVote
    // When: the user expands the archive to read full entries
    // Then: the expanded "Fix:" and "Vote:" detail values also render markdown
    it("renders markdown in the expanded archive detail values", () => {
      const weekStartKey = dateAdd(todayKey(), -6);
      const pastReview = makeReview(dateAdd(weekStartKey, -7), {
        wentWell: "summary",
        smallestFix: "**fix in bold**",
        identityVote: "_voter_",
      });
      // Need >5 past reviews for the "Read more" button to appear.
      storeMock.weeklyReviews = [
        pastReview,
        ...Array.from({ length: 5 }, (_, index) => makeReview(dateAdd(weekStartKey, -7 * (index + 2)))),
      ];

      render(<ReviewPage />);
      fireEvent.click(screen.getByRole("button", { name: "Read more" }));

      expect(screen.getByText("fix in bold").tagName).toBe("STRONG");
      expect(screen.getByText("voter").tagName).toBe("EM");
    });
  });
});
