import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import AnalyticsPage from "@/app/(root)/analytics/page";
import HabitsPage from "@/app/(root)/habits/page";
import HallOfFamePage from "@/app/(root)/hall-of-fame/page";
import IdentityPage from "@/app/(root)/identity/page";
import JournalPage from "@/app/(root)/journal/page";
import ReviewPage from "@/app/(root)/review/page";
import { TodayView } from "@/features/habits/ui";

import {
  makeHabit,
  paramsMock,
  resetUiStateMocks,
  routerMock,
  storeMock,
  teardownUiStateDom,
} from "./_ui-states-helpers";

// vi.mock is only hoisted within the file that contains it, so each
// split file installs its own next/navigation + StoreProvider + auth
// action mocks.
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

beforeEach(() => {
  resetUiStateMocks();
});

afterEach(() => {
  teardownUiStateDom();
});

describe("Empty States", () => {
  it("Today page with no habits shows the first-run onboarding with a Create your first habit CTA", () => {
    // Given: a brand-new user with zero habits
    storeMock.habits = [];

    // When: the Today page renders
    render(<TodayView />);

    // Then: the three onboarding steps and the single primary CTA are visible
    expect(screen.getByRole("heading", { name: "Build your first habit in three small steps" })).toBeTruthy();
    expect(screen.getByText("Pick a habit")).toBeTruthy();
    expect(screen.getByText("Tie it to who you want to become")).toBeTruthy();
    expect(screen.getByText("Check in daily")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Create your first habit" }).getAttribute("href")).toBe("/habits/new");
  });

  it("Habits page with no habits shows the empty library message", () => {
    // Given: no habits exist in the store
    storeMock.habits = [];

    // When: the Habits page renders
    render(<HabitsPage />);

    // Then: the empty library message and CTA appear
    expect(screen.getByText("No habits in your account yet.")).toBeTruthy();
    expect(screen.getAllByText("New habit").length).toBeGreaterThanOrEqual(1);
  });

  it("Analytics page with no habits shows zeroed stats and empty sections", () => {
    // Given: no habits exist
    storeMock.habits = [];

    // When: the Analytics page renders
    render(<AnalyticsPage />);

    // Then: stats cards show zeroed or placeholder values
    expect(screen.getByText("0%")).toBeTruthy();
    expect(screen.getAllByText("0").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("No streaks yet")).toBeTruthy();
    expect(screen.getByText("No weekday data yet")).toBeTruthy();
  });

  it("Journal page with no entries shows prompt cards", () => {
    // Given: the journal is empty
    storeMock.journal = [];

    // When: the Journal page renders
    render(<JournalPage />);

    // Then: the three prompt cards are visible
    expect(screen.getByText("What habit felt automatic today?")).toBeTruthy();
    expect(screen.getByText("Where did friction show up?")).toBeTruthy();
    expect(screen.getByText("What is one tiny adjustment for tomorrow?")).toBeTruthy();
  });

  it("Review page with no past reviews shows the empty message", () => {
    // Given: no weekly reviews have been saved
    storeMock.weeklyReviews = [];

    // When: the Review page renders
    render(<ReviewPage />);

    // Then: the past-reviews section shows the empty copy
    expect(screen.getByText(/No past reviews yet\./)).toBeTruthy();
  });

  it("Hall of Fame with no habits explains how induction works", () => {
    // Given: no habits exist
    storeMock.habits = [];

    // When: the Hall of Fame page renders
    render(<HallOfFamePage />);

    // Then: the inducted section explains the 66-day review instead of a bare list
    expect(screen.getByText("No inducted habits yet")).toBeTruthy();
    expect(screen.getByText(/After 66 days a habit becomes ready for review/)).toBeTruthy();
  });

  it("Identity page with empty statement invites the user to write one", () => {
    // Given: the identity statement is blank
    storeMock.identity = { statement: "", values: [] };

    // When: the Identity page renders
    render(<IdentityPage />);

    // Then: the empty state and its call to action are visible
    expect(screen.getByText("No identity statement yet")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Write your statement" })).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Today page search ordering (mobile visibility regression)

/** Open the secondary search panel and type a query. */
function searchToday(query: string) {
  if (!screen.queryByPlaceholderText("Search habits...")) {
    fireEvent.click(screen.getByRole("button", { name: "Search habits" }));
  }
  fireEvent.change(screen.getByPlaceholderText("Search habits..."), { target: { value: query } });
}

describe("Today page search ordering", () => {
  // Given: the user has at least one habit so search can return results
  // When: they open search and type a query
  // Then: the "Search results" section appears in the DOM before the
  //       secondary insights (streak / sparkline), so on mobile the results
  //       are visible without scrolling past them.
  it("renders the search results section before the insights when searching", () => {
    storeMock.habits = [makeHabit({ id: "h1", name: "Read", identity: "reader" })];

    render(<TodayView />);
    searchToday("Read");

    const resultsHeading = screen.getByRole("heading", { name: "Search results" });
    const insights = screen.getByText("Longest active streak");

    // DOCUMENT_POSITION_FOLLOWING means the insights follow the results.
    const relation = resultsHeading.compareDocumentPosition(insights);
    expect(relation & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  // Given: a user with habits but the search query matches nothing
  // When: they type a non-matching query
  // Then: the "No results" message appears before the insights so it is
  //       visible on mobile.
  it("renders the no-results message before the insights when search has no matches", () => {
    storeMock.habits = [makeHabit({ id: "h1", name: "Read" })];

    render(<TodayView />);
    searchToday("xyz-no-match");

    const emptyMessage = screen.getByText(/No habits match/);
    const insights = screen.getByText("Longest active streak");
    const relation = emptyMessage.compareDocumentPosition(insights);
    expect(relation & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  // Given: a user has habits scheduled for today and uses the search bar
  // When: they type a query (matching or not)
  // Then: today's habit list remains visible so they can still check off
  //       today's habits without clearing the search.
  it("keeps today's habit list visible while searching", () => {
    storeMock.habits = [
      makeHabit({ id: "h1", name: "Read", schedule: "Daily" }),
      makeHabit({ id: "h2", name: "Run", schedule: "Daily" }),
    ];

    render(<TodayView />);

    // Sanity: today's list is visible before any search.
    expect(screen.getByRole("heading", { name: "Today's habits" })).toBeTruthy();

    searchToday("Read");
    expect(screen.getByRole("heading", { name: "Today's habits" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Search results" })).toBeTruthy();

    // Even a query that matches nothing must not hide today's list.
    searchToday("xyz-no-match");
    expect(screen.getByRole("heading", { name: "Today's habits" })).toBeTruthy();
    expect(screen.getByText(/No habits match/)).toBeTruthy();
  });
});
