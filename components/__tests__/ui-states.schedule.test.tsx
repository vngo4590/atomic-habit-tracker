import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

describe("Schedule-aware Today counts", () => {
  it("Today widget counts only habits scheduled for today in denominator", () => {
    // Given: a Monday where only the Weekdays habit is scheduled
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-18T12:00:00Z")); // Monday

    const today = "2026-05-18";
    storeMock.habits = [
      makeHabit({ id: "h1", schedule: "Weekdays", history: { [today]: true }, identity: "professional" }),
      makeHabit({ id: "h2", schedule: "Weekends", history: {}, identity: "relaxer" }),
    ];

    // When: the Today page renders
    render(<TodayPage />);

    // Then: the widget shows 1/1 (only the Weekdays habit counts)
    expect(screen.getByText("/1")).toBeTruthy();
    expect(screen.getByText("All done - well done.")).toBeTruthy();
    expect(screen.getByText("A clean sweep.")).toBeTruthy();

    // And: the identity vote section only shows the scheduled+done habit
    expect(screen.getByText("professional")).toBeTruthy();
    expect(screen.queryByText("relaxer")).toBeNull();

    vi.useRealTimers();
  });

  it("Today widget shows remaining count for undone scheduled habits only", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-18T12:00:00Z")); // Monday

    const today = "2026-05-18";
    storeMock.habits = [
      makeHabit({ id: "h1", schedule: "Weekdays", history: { [today]: true }, identity: "professional" }),
      makeHabit({ id: "h2", schedule: "Weekdays", history: {}, identity: "focused" }),
      makeHabit({ id: "h3", schedule: "Weekends", history: {}, identity: "relaxer" }),
    ];

    render(<TodayPage />);

    // Then: 1/2 with 1 habit remaining (only the two Weekdays habits count)
    expect(screen.getByText("/2")).toBeTruthy();
    expect(screen.getByText("1 habits remaining")).toBeTruthy();

    vi.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// Loading / Transition States
// ---------------------------------------------------------------------------

