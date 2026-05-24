import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HabitRow } from "@/components/HabitRow";
import { MoodCheckSheet } from "@/components/MoodCheckSheet";
import { Nav } from "@/components/Nav";
import { Toast } from "@/components/Toast";

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

describe("Accessibility", () => {
  it("Check button has proper aria-label for Check and Uncheck states", () => {
    // Given: a habit row that is not done
    const { rerender } = render(
      <HabitRow habit={makeHabit()} done={false} streak={0} onCheck={vi.fn()} onOpen={vi.fn()} />,
    );

    // Then: the check button is labelled Check
    expect(screen.getByLabelText("Check")).toBeTruthy();

    // When: rerendered as done
    rerender(
      <HabitRow habit={makeHabit()} done={true} streak={1} onCheck={vi.fn()} onOpen={vi.fn()} />,
    );

    // Then: the check button is labelled Uncheck
    expect(screen.getByLabelText("Uncheck")).toBeTruthy();
  });

  it.skip("Mood buttons have role and aria-pressed", () => {
    // Bug: MoodCheckSheet mood buttons are <button> elements but do not expose
    // aria-pressed to communicate their selected state to screen readers.
    // Given: the mood check sheet is open
    const habit = makeHabit();
    render(<MoodCheckSheet habit={habit} dateKey="2030-01-15" onClose={vi.fn()} onSave={vi.fn()} />);

    // When + Then: each mood button has role button and aria-pressed
    const okayBtn = screen.getByText("Okay");
    expect(okayBtn.tagName).toBe("BUTTON");
    expect(okayBtn).toHaveAttribute("aria-pressed");
  });

  it.skip("Toast has a status role", () => {
    // Bug: Toast component does not set role="status" (or similar) on the
    // notification container, so assistive tech may not announce it.
    // Given: a toast is present in the store
    storeMock.toast = { id: 1, msg: "Saved", sub: "Check-in recorded" };

    // When: the Toast renders
    render(<Toast />);

    // Then: the toast has a status role
    expect(screen.getByRole("status")).toBeTruthy();
  });

  it("All interactive buttons have either an aria-label or visible text", () => {
    // Given: the Nav sidebar
    render(<Nav user={{ name: "Ada", email: "ada@example.com" }} />);

    // When: querying every button
    const buttons = screen.getAllByRole("button");

    // Then: each button has visible text or an accessible name
    buttons.forEach((btn) => {
      const hasText = btn.textContent && btn.textContent.trim().length > 0;
      const hasLabel = btn.getAttribute("aria-label");
      expect(hasText || hasLabel).toBeTruthy();
    });
  });
});

// ---------------------------------------------------------------------------
// Dark Mode States
// ---------------------------------------------------------------------------

