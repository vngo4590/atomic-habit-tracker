import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HabitRow } from "@/components/HabitRow";
import AnalyticsPage from "@/app/(root)/analytics/page";
import HallOfFamePage from "@/app/(root)/hall-of-fame/page";
import HabitDetailPage from "@/app/(root)/habits/[id]/page";
import IdentityPage from "@/app/(root)/identity/page";
import { dateAdd, todayKey } from "@/lib/helpers";

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

describe("Visual States", () => {
  it("Cards render with proper padding and borders", () => {
    // Given: the analytics page which renders multiple cards
    storeMock.habits = [];

    // When: the page renders
    render(<AnalyticsPage />);

    // Then: card elements exist with expected classes
    const cards = document.querySelectorAll(".card");
    expect(cards.length).toBeGreaterThan(0);
    const padded = document.querySelectorAll(".card-pad");
    expect(padded.length).toBeGreaterThan(0);
  });

  it("Chips show active vs inactive states", () => {
    // Given: the identity page with one active core value
    storeMock.identity = { statement: "I am a reader.", values: ["Consistency"] };

    // When: the page renders
    render(<IdentityPage />);

    // Then: the active value chip has the active class
    const activeChips = document.querySelectorAll(".chip.active");
    expect(activeChips.length).toBeGreaterThan(0);
    expect(activeChips[0].textContent).toContain("Consistency");
  });

  it("Active tab has the accent underline class", () => {
    // Given: a habit exists and we are on the detail page
    storeMock.habits = [makeHabit()];
    paramsMock.current = { id: "habit_1" };

    // When: the detail page renders (default tab is overview)
    render(<HabitDetailPage />);

    // Then: the Overview tab carries the active class
    const activeTab = document.querySelector(".tab.active");
    expect(activeTab).toBeTruthy();
    expect(activeTab?.textContent).toBe("Overview");
  });

  it("Progress bars render at 0% and 50% widths", () => {
    // Given: two habits at 0 days and ~33 days old (in-progress)
    const today = todayKey();
    storeMock.habits = [
      makeHabit({ id: "h1", createdAt: today }),
      makeHabit({ id: "h2", createdAt: dateAdd(today, -33) }),
    ];

    // When: the Hall of Fame page renders
    render(<HallOfFamePage />);

    // Then: the in-progress section contains progress bars whose width is
    // driven by the inline --pct CSS variable. The CSS module class
    // (.progressFill) reads `width: var(--pct)` so we assert on the
    // --pct value rather than on a literal `width: ...` declaration.
    const bars = document.querySelectorAll("[style*='--pct']");
    const zeroBar = Array.from(bars).find((el) =>
      el.getAttribute("style")?.includes("--pct: 0%"),
    );
    const fiftyBar = Array.from(bars).find((el) =>
      el.getAttribute("style")?.includes("--pct: 50%"),
    );
    expect(zeroBar).toBeTruthy();
    expect(fiftyBar).toBeTruthy();
  });

  it("Streak pill only renders when streak is greater than 0", () => {
    // Given: a habit row with zero streak
    const { rerender } = render(
      <HabitRow habit={makeHabit()} done={false} streak={0} onCheck={vi.fn()} onOpen={vi.fn()} />,
    );

    // Then: no streak pill is present
    expect(screen.queryByText("0")).toBeNull();

    // When: rerendered with a positive streak
    rerender(
      <HabitRow habit={makeHabit()} done={false} streak={5} onCheck={vi.fn()} onOpen={vi.fn()} />,
    );

    // Then: the streak pill appears
    expect(screen.getByText("5")).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Accessibility
// ---------------------------------------------------------------------------

