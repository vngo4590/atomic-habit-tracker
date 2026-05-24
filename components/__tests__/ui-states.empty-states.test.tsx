import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import AnalyticsPage from "@/app/(root)/analytics/page";
import HabitsPage from "@/app/(root)/habits/page";
import HallOfFamePage from "@/app/(root)/hall-of-fame/page";
import IdentityPage from "@/app/(root)/identity/page";
import JournalPage from "@/app/(root)/journal/page";
import ReviewPage from "@/app/(root)/review/page";
import TodayPage from "@/app/(root)/page";

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
  it("Today page with no habits shows the Design your first daily vote CTA", () => {
    // Given: a brand-new user with zero habits
    storeMock.habits = [];

    // When: the Today page renders
    render(<TodayPage />);

    // Then: the empty-state CTA is visible
    expect(screen.getByText("Design your first daily vote.")).toBeTruthy();
    expect(screen.getByText("Create habit")).toBeTruthy();
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

  it("Analytics page with no habits shows 0 or - for all stats", () => {
    // Given: no habits exist
    storeMock.habits = [];

    // When: the Analytics page renders
    render(<AnalyticsPage />);

    // Then: stats cards show zeroed or placeholder values
    expect(screen.getByText("0%")).toBeTruthy();
    expect(screen.getAllByText("0").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("-")).toBeTruthy();
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
    expect(screen.getByText("No past reviews yet.")).toBeTruthy();
  });

  it("Hall of Fame with no habits shows the not-ready message", () => {
    // Given: no habits exist
    storeMock.habits = [];

    // When: the Hall of Fame page renders
    render(<HallOfFamePage />);

    // Then: the ready-for-review section shows the empty copy
    expect(screen.getByText("No habits have reached 66 days yet.")).toBeTruthy();
  });

  it("Identity page with empty statement shows placeholder text", () => {
    // Given: the identity statement is blank
    storeMock.identity = { statement: "", values: [] };

    // When: the Identity page renders
    render(<IdentityPage />);

    // Then: the placeholder prompt is visible
    expect(screen.getByText("No identity statement yet. Click this section to write one.")).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Today page search ordering (mobile visibility regression)

describe("Today page search ordering", () => {
  // Given: the user has at least one habit so search can return results
  // When: they type a query into the search input
  // Then: the "Search results" section appears in the DOM before the stats
  //       row, so on mobile (where each card stacks full-width) the results
  //       are visible without scrolling past stats + identity banner.
  it("renders the search results section before the stats row when searching", () => {
    storeMock.habits = [makeHabit({ id: "h1", name: "Read", identity: "reader" })];

    render(<TodayPage />);

    fireEvent.change(screen.getByPlaceholderText("Search habits..."), {
      target: { value: "Read" },
    });

    const resultsHeading = screen.getByRole("heading", { name: "Search results" });
    // The Today completion stat card uses the "Today" eyebrow label as its
    // identifying header. Locate the card itself by walking up from there.
    const todayEyebrow = screen.getAllByText("Today").find((node) => node.className.includes("eyebrow"));
    expect(todayEyebrow).toBeTruthy();
    const statsCard = todayEyebrow!.closest(".card");
    expect(statsCard).toBeTruthy();

    // DOCUMENT_POSITION_FOLLOWING means statsCard follows resultsHeading.
    const relation = resultsHeading.compareDocumentPosition(statsCard!);
    expect(relation & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  // Given: a user with habits but the search query matches nothing
  // When: they type a non-matching query
  // Then: the "No results" empty state appears before the stats row so it is
  //       visible on mobile.
  it("renders the no-results empty state before the stats row when search has no matches", () => {
    storeMock.habits = [makeHabit({ id: "h1", name: "Read" })];

    render(<TodayPage />);

    fireEvent.change(screen.getByPlaceholderText("Search habits..."), {
      target: { value: "xyz-no-match" },
    });

    const emptyHeading = screen.getByText(/No habits match/);
    const todayEyebrow = screen.getAllByText("Today").find((node) => node.className.includes("eyebrow"));
    expect(todayEyebrow).toBeTruthy();
    const statsCard = todayEyebrow!.closest(".card");
    expect(statsCard).toBeTruthy();

    const relation = emptyHeading.compareDocumentPosition(statsCard!);
    expect(relation & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  // Given: a user has habits scheduled for today and uses the search bar
  // When: they type a query (matching or not)
  // Then: the today "Habits" list section remains visible so they can still
  //       check off today's habits without clearing the search.
  it("keeps today's habit list visible while searching", () => {
    storeMock.habits = [
      makeHabit({ id: "h1", name: "Read", schedule: "Daily" }),
      makeHabit({ id: "h2", name: "Run", schedule: "Daily" }),
    ];

    render(<TodayPage />);

    // Sanity: today's list is visible before any search.
    expect(screen.getByRole("heading", { name: "Habits" })).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText("Search habits..."), {
      target: { value: "Read" },
    });

    // Today's "Habits" heading is still present alongside the "Search
    // results" section.
    expect(screen.getByRole("heading", { name: "Habits" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Search results" })).toBeTruthy();

    // Even a query that matches nothing must not hide today's list.
    fireEvent.change(screen.getByPlaceholderText("Search habits..."), {
      target: { value: "xyz-no-match" },
    });
    expect(screen.getByRole("heading", { name: "Habits" })).toBeTruthy();
    expect(screen.getByText(/No habits match/)).toBeTruthy();
  });
});