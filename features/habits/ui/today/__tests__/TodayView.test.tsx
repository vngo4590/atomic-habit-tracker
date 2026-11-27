import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  makeHabit,
  paramsMock,
  resetUiStateMocks,
  routerMock,
  storeMock,
} from "@/components/__tests__/_ui-states-helpers";
import { dateAdd, todayKey } from "@/lib/helpers";

import { TodayView } from "../TodayView";

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
  usePathname: () => "/",
  useParams: () => paramsMock.current,
}));

vi.mock("@/components/StoreProvider", () => ({
  useStoreContext: () => storeMock,
}));

vi.mock("@/lib/actions/auth", () => ({
  logoutAction: vi.fn(),
  updateProfileAction: vi.fn(),
  changePasswordAction: vi.fn(),
}));

const today = todayKey();

beforeEach(() => {
  resetUiStateMocks();
});

afterEach(() => {
  cleanup();
});

describe("TodayView header", () => {
  it("greets the user by first name and shows today's progress", () => {
    // Given: two daily habits, one already done
    storeMock.habits = [
      makeHabit({ id: "h1", name: "Read", history: { [today]: true } }),
      makeHabit({ id: "h2", name: "Run" }),
    ];

    // When: Today renders for Ada
    render(<TodayView userName="Ada" />);

    // Then: the h1 greets her and the ring reports 1 of 2
    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/, Ada$/);
    expect(screen.getByText("1 of 2 done")).toBeTruthy();
    expect(screen.getByRole("progressbar", { name: "Today's habits completed" }).getAttribute("aria-valuenow")).toBe(
      "50",
    );
  });

  it("does not duplicate the New habit action outside the empty state", () => {
    storeMock.habits = [makeHabit({ id: "h1" })];
    render(<TodayView />);
    expect(screen.queryByRole("link", { name: /new habit/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /new habit/i })).toBeNull();
  });
});

describe("TodayView focus list", () => {
  it("checks a habit in with one tap and opens the mood sheet", () => {
    // Given: one undone daily habit
    storeMock.habits = [makeHabit({ id: "h1", name: "Read" })];
    render(<TodayView />);

    // When: the user taps its check circle
    fireEvent.click(screen.getByRole("button", { name: "Mark Read done" }));

    // Then: the optimistic toggle fires and the mood sheet asks how it went
    expect(storeMock.toggleHabit).toHaveBeenCalledWith("h1");
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("links each habit row to its detail page", () => {
    storeMock.habits = [makeHabit({ id: "h1", name: "Read" })];
    render(<TodayView />);
    expect(screen.getByRole("link", { name: /Read/ }).getAttribute("href")).toBe("/habits/h1");
  });
});

describe("TodayView completed list", () => {
  it("lists finished habits under Completed (n) and undoes them", () => {
    // Given: one habit done today and one still to do
    storeMock.habits = [
      makeHabit({ id: "h1", name: "Read", history: { [today]: true } }),
      makeHabit({ id: "h2", name: "Run" }),
    ];
    render(<TodayView />);

    // Then: the main list only holds the undone habit...
    const focus = screen.getByRole("region", { name: "Today's habits" });
    expect(within(focus).queryByText("Read")).toBeNull();
    expect(within(focus).getByText("Run")).toBeTruthy();

    // ...and the done habit sits in the collapsible Completed list
    expect(screen.getByText("Completed (1)")).toBeTruthy();

    // When: the user taps Undo
    fireEvent.click(screen.getByRole("button", { name: "Undo Read" }));

    // Then: today's check-in is toggled back off without asking for a mood
    expect(storeMock.toggleHabit).toHaveBeenCalledWith("h1");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("TodayView empty states", () => {
  it("shows a calm all-done state with the completed list open", () => {
    storeMock.habits = [makeHabit({ id: "h1", name: "Read", history: { [today]: true } })];
    render(<TodayView />);

    expect(screen.getByRole("heading", { name: "All done for today" })).toBeTruthy();
    expect(screen.getByText(/You cast 1 vote/)).toBeTruthy();
    expect(screen.getByTestId("completed-list").hasAttribute("open")).toBe(true);
  });

  it("shows a rest day with the next scheduled habit when nothing is due today", () => {
    // Given: the only habit is scheduled for tomorrow's weekday alone
    const [y, m, d] = dateAdd(today, 1).split("-").map(Number);
    const tomorrowDay = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date(y, m - 1, d).getDay()];
    storeMock.habits = [makeHabit({ id: "h1", name: "Stretch", schedule: tomorrowDay })];

    render(<TodayView />);

    expect(screen.getByRole("heading", { name: "Rest day" })).toBeTruthy();
    expect(screen.getByText(/Next up: Stretch, tomorrow\./)).toBeTruthy();
    expect(screen.getByRole("link", { name: "See all habits" }).getAttribute("href")).toBe("/habits");
  });

  it("first-run onboarding offers exactly one primary CTA and hides search", () => {
    storeMock.habits = [];
    render(<TodayView />);

    expect(screen.getByRole("link", { name: "Create your first habit" }).getAttribute("href")).toBe("/habits/new");
    expect(screen.queryByRole("button", { name: "Search habits" })).toBeNull();
    expect(screen.queryByText("Longest active streak")).toBeNull();
  });
});

describe("TodayView search", () => {
  it("opens from the header, searches all habits, and closes on Escape", () => {
    // Given: a daily habit (it is always scheduled, so search shows it)
    storeMock.habits = [makeHabit({ id: "h1", name: "Read" })];
    render(<TodayView />);

    // When: the user opens search and types
    const toggle = screen.getByRole("button", { name: "Search habits" });
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    const input = screen.getByRole("searchbox", { name: "Search all habits" });
    fireEvent.change(input, { target: { value: "rea" } });

    // Then: matching habits are listed under Search results
    const results = screen.getByRole("heading", { name: "Search results" }).parentElement!.parentElement!;
    expect(within(results).getByText("Read")).toBeTruthy();

    // When: Escape is pressed, the panel closes and focus returns to the toggle
    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByRole("searchbox")).toBeNull();
    expect(document.activeElement).toBe(toggle);
  });
});
