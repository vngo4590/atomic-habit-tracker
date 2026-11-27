import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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

import { WeeklyReviewView } from "../WeeklyReviewView";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  storeMock.habits = [];
  storeMock.weeklyReview = { wentWell: "", smallestFix: "", identityVote: "" };
  storeMock.weeklyReviews = [];
});

const currentWeekKey = () => dateAdd(todayKey(), -6);

describe("WeeklyReviewView", () => {
  it("starts an empty week from an inviting intro and saves the current week", () => {
    // Given: no review saved for this week
    render(<WeeklyReviewView />);
    expect(screen.getByRole("heading", { name: "Reflect on this week" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Save review" })).toBeNull();

    // When: the user starts the review, answers the first question and walks to the end
    fireEvent.click(screen.getByRole("button", { name: "Write this week's review" }));
    fireEvent.change(screen.getByLabelText("What went well? Why?"), { target: { value: "Kept the morning habit" } });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Save review" }));

    // Then: the answers are saved against this week and the user is told
    expect(storeMock.setWeeklyReview).toHaveBeenCalledWith(currentWeekKey(), {
      wentWell: "Kept the morning habit",
      smallestFix: "",
      identityVote: "",
    });
    expect(storeMock.showToast).toHaveBeenCalledWith("Weekly review saved", expect.any(String));
  });

  it("shows the saved current review and collapsed past reviews, then loads older ones", () => {
    // Given: this week's review plus six earlier weeks
    storeMock.weeklyReview = { wentWell: "Current win", smallestFix: "Current fix", identityVote: "Current identity" };
    storeMock.weeklyReviews = [
      makeReview(currentWeekKey(), storeMock.weeklyReview),
      ...Array.from({ length: 6 }, (_, index) => makeReview(dateAdd(currentWeekKey(), -7 * (index + 1)))),
    ];

    render(<WeeklyReviewView />);

    // Then: the summary shows this week's answers and no intro
    expect(screen.getByRole("heading", { name: "This week's review" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Write this week's review" })).toBeNull();

    // And: five past weeks are listed collapsed, with a control for the sixth
    const past = within(screen.getByRole("region", { name: /Past reviews/ }));
    expect(past.getAllByRole("button", { expanded: false })).toHaveLength(5);
    fireEvent.click(past.getByRole("button", { name: "Show 1 older" }));
    expect(past.getAllByRole("button", { expanded: false })).toHaveLength(6);
    expect(past.queryByRole("button", { name: /older/ })).toBeNull();
  });

  it("expands a past review and edits it from there", () => {
    // Given: one past review
    const pastReview = makeReview(dateAdd(currentWeekKey(), -7));
    storeMock.weeklyReviews = [pastReview];
    render(<WeeklyReviewView />);

    // When: the user expands it, chooses Edit, jumps to the last step and changes the answer
    const row = screen.getByRole("button", { expanded: false });
    fireEvent.click(row);
    expect(row.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: /^Edit review for Week of/ }));
    fireEvent.click(screen.getByRole("button", { name: "Next week" }));
    fireEvent.change(screen.getByLabelText("Who did I vote to become this week?"), { target: { value: "Patient teammate" } });
    fireEvent.click(screen.getByRole("button", { name: "Save review" }));

    // Then: only that week's identity answer changes
    expect(storeMock.setWeeklyReview).toHaveBeenCalledWith(pastReview.weekStartKey, {
      wentWell: pastReview.wentWell,
      smallestFix: pastReview.smallestFix,
      identityVote: "Patient teammate",
    });
  });

  it("explains that past reviews collect here when there are none", () => {
    // Given / When: no reviews at all
    render(<WeeklyReviewView />);

    // Then: the archive shows a gentle empty message
    expect(screen.getByText(/No past reviews yet/)).toBeTruthy();
  });

  describe("review wizard", () => {
    it("moves one question at a time with Back and Next, keeping answers", () => {
      // Given: the wizard is open on step 1
      render(<WeeklyReviewView />);
      fireEvent.click(screen.getByRole("button", { name: "Write this week's review" }));
      expect(screen.getByText("Step 1 of 3")).toBeTruthy();
      expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
      fireEvent.change(screen.getByLabelText("What went well? Why?"), { target: { value: "Showed up" } });

      // When: the user goes forward
      fireEvent.click(screen.getByRole("button", { name: "Next" }));

      // Then: the second question is shown and focused
      expect(screen.getByText("Step 2 of 3")).toBeTruthy();
      const fix = screen.getByLabelText("What didn't? What's the smallest fix?");
      expect(document.activeElement).toBe(fix);

      // When: the user goes back
      fireEvent.click(screen.getByRole("button", { name: "Back" }));

      // Then: the first answer is still there
      expect((screen.getByLabelText("What went well? Why?") as HTMLTextAreaElement).value).toBe("Showed up");
    });

    it("marks the current step in the progress indicator and lets the user jump to a step", () => {
      // Given: the wizard is open
      render(<WeeklyReviewView />);
      fireEvent.click(screen.getByRole("button", { name: "Write this week's review" }));
      const progress = within(screen.getByRole("list", { name: "Review progress" }));
      expect(progress.getByRole("button", { name: "Wins" }).getAttribute("aria-current")).toBe("step");

      // When: the user picks the last step directly
      fireEvent.click(progress.getByRole("button", { name: "Next week" }));

      // Then: it becomes current and Save replaces Next
      expect(progress.getByRole("button", { name: "Next week" }).getAttribute("aria-current")).toBe("step");
      expect(screen.getByRole("button", { name: "Save review" })).toBeTruthy();
      expect(screen.queryByRole("button", { name: "Next" })).toBeNull();
    });

    it("discards the draft when Cancel is clicked", () => {
      // Given: a partly written review
      render(<WeeklyReviewView />);
      fireEvent.click(screen.getByRole("button", { name: "Write this week's review" }));
      fireEvent.change(screen.getByLabelText("What went well? Why?"), { target: { value: "Draft" } });

      // When: the user cancels
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

      // Then: nothing is saved and the intro returns
      expect(storeMock.setWeeklyReview).not.toHaveBeenCalled();
      expect(screen.getByRole("heading", { name: "Reflect on this week" })).toBeTruthy();
    });
  });

  describe("last-7-day snapshot", () => {
    it("shows one bar per day for the last seven days", () => {
      // Given / When: the page renders
      render(<WeeklyReviewView />);

      // Then: seven labelled day bars are listed under "Last 7 days"
      const snapshot = within(screen.getByRole("region", { name: "Last 7 days" }));
      expect(snapshot.getAllByRole("listitem", { name: /: \d+%$/ })).toHaveLength(7);
    });

    it("displays correct completion percentage in the header", () => {
      // Given: a daily habit done on 4 of the last 7 days
      const today = todayKey();
      const days = Array.from({ length: 7 }, (_, i) => dateAdd(today, i - 6));
      const history: Record<string, boolean> = {};
      days.slice(0, 4).forEach((day) => {
        history[day] = true;
      });
      storeMock.habits = [makeHabit("h1", history)];

      render(<WeeklyReviewView />);

      // Then: 4 done out of 7 possible = 57%
      expect(screen.getByText(/4 \/ 7 check-ins · 57%/)).toBeTruthy();
    });
  });

  describe("markdown rendering of review entries", () => {
    it("renders markdown formatting in the current week's saved answers", async () => {
      // Given: this week's review uses markdown
      storeMock.weeklyReview = {
        wentWell: "**Bold win** with formatting",
        smallestFix: "- step one\n- step two",
        identityVote: "Become _disciplined_",
      };
      storeMock.weeklyReviews = [makeReview(currentWeekKey(), storeMock.weeklyReview)];

      render(<WeeklyReviewView />);

      // Then: the lazily loaded renderer produces real elements
      expect((await screen.findByText("Bold win")).tagName).toBe("STRONG");
      expect(screen.getByText("step one").tagName).toBe("LI");
      expect(screen.getByText("step two").tagName).toBe("LI");
      expect(screen.getByText("disciplined").tagName).toBe("EM");
    });

    it("wraps long current-week answers in a Read more / Read less toggle", () => {
      // Given: one long answer and two short ones
      const longAnswer = "A really long reflection. ".repeat(15); // ~375 chars
      storeMock.weeklyReview = { wentWell: longAnswer, smallestFix: "short fix", identityVote: "short vote" };
      storeMock.weeklyReviews = [makeReview(currentWeekKey(), storeMock.weeklyReview)];

      render(<WeeklyReviewView />);

      // Then: only the long answer gets a toggle, and it switches label
      const toggles = screen.getAllByRole("button", { name: /read more/i });
      expect(toggles.length).toBe(1);
      fireEvent.click(toggles[0]);
      expect(screen.getByRole("button", { name: /read less/i })).toBeTruthy();
    });

    it("shows a plain-text one-line preview for collapsed past reviews", () => {
      // Given: a past review whose first answer contains markdown
      storeMock.weeklyReviews = [
        makeReview(dateAdd(currentWeekKey(), -7), { wentWell: "**bold lead** then [a link](https://x.test)" }),
      ];

      render(<WeeklyReviewView />);

      // Then: the preview reads as prose without markdown syntax
      const row = screen.getByRole("button", { expanded: false });
      expect(row.textContent).toContain("bold lead then a link");
      expect(row.textContent).not.toContain("**");
    });

    it("renders markdown in the expanded past review answers", async () => {
      // Given: a past review with markdown in its fix and identity answers
      storeMock.weeklyReviews = [
        makeReview(dateAdd(currentWeekKey(), -7), {
          wentWell: "summary",
          smallestFix: "**fix in bold**",
          identityVote: "_voter_",
        }),
      ];
      render(<WeeklyReviewView />);

      // When: the user expands it
      fireEvent.click(screen.getByRole("button", { expanded: false }));

      // Then: each answer renders formatted markdown
      expect((await screen.findByText("fix in bold")).tagName).toBe("STRONG");
      expect(screen.getByText("voter").tagName).toBe("EM");
    });
  });
});