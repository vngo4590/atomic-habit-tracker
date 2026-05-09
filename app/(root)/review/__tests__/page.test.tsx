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
});
