import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import HabitDetailPage from "@/app/(root)/habits/[id]/page";
import { dateAdd, todayKey } from "@/lib/helpers";

import {
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

describe("Error States", () => {
  it("Habit detail page shows Habit not found with a back button when the id is missing", () => {
    // Given: the store contains no matching habit and the param is a missing id
    storeMock.habits = [];
    paramsMock.current = { id: "missing-id" };

    // When: the detail page renders
    render(<HabitDetailPage />);

    // Then: the not-found message and back button are visible
    expect(screen.getByText("Habit not found.")).toBeTruthy();
    expect(screen.getByText("Back")).toBeTruthy();
  });

  it("dateAdd handles invalid date keys gracefully without throwing", () => {
    // Given: an invalid date key string
    const invalid = "not-a-date";

    // When + Then: calling dateAdd does not throw
    expect(() => dateAdd(invalid, 1)).not.toThrow();
    expect(() => todayKey(invalid)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Visual States
// ---------------------------------------------------------------------------

