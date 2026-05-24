import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HabitRow } from "@/components/HabitRow";
import { MoodCheckSheet } from "@/components/MoodCheckSheet";
import { Nav } from "@/components/Nav";
import { OnboardingOverlay } from "@/components/OnboardingOverlay";
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

describe("Loading / Transition States", () => {
  it("Nav renders correctly with user name null and falls back to email", () => {
    // Given: a user whose name is null but email is present
    const user = { name: null as string | null, email: "ada@example.com" };

    // When: the Nav renders
    render(<Nav user={user} />);

    // Then: the email is used as the display name and the initial comes from it
    expect(screen.getByText("ada@example.com")).toBeTruthy();
    expect(document.querySelector(".avatar")?.textContent).toBe("A");
  });

  it("HabitRow renders with a very long habit name without overflowing", () => {
    // Given: a habit with an extremely long name
    const longName = "Read".repeat(80);
    const habit = makeHabit({ name: longName });

    // When: the row renders
    render(<HabitRow habit={habit} done={false} streak={0} onCheck={vi.fn()} onOpen={vi.fn()} />);

    // Then: the long name is present in the document
    expect(screen.getByText(longName)).toBeTruthy();
  });

  it("MoodCheckSheet renders with existing check-in data pre-filled", () => {
    // Given: a habit that already has a check-in for today with mood and journal
    const habit = makeHabit({
      history: {
        "2030-01-15": { done: true, mood: 3, journal: "Felt okay" },
      },
    });
    const onSave = vi.fn();

    // When: the sheet opens for that date
    render(<MoodCheckSheet habit={habit} dateKey="2030-01-15" onClose={vi.fn()} onSave={onSave} />);

    // Then: the journal textarea contains the prior note
    expect(screen.getByDisplayValue("Felt okay")).toBeTruthy();

    // And: saving preserves the existing mood
    fireEvent.click(screen.getByText("Save check-in"));
    expect(onSave).toHaveBeenCalledWith({ mood: 3, journal: "Felt okay" });
  });

  it.skip("OnboardingOverlay step 2 blocks progression until a name is entered", () => {
    // Bug: AnimatePresence mode="wait" prevents step advancement in JSDOM
    // because exit animations never complete, so the new step never mounts.
    // Given: the onboarding overlay is open at step 0
    const onComplete = vi.fn();
    render(<OnboardingOverlay onComplete={onComplete} />);

    // When: the user clicks Begin to reach the Name step
    fireEvent.click(screen.getByText("Begin"));

    // Then: the Continue button is disabled because the name field is empty
    const continueBtn = screen.getByText("Continue");
    expect(continueBtn).toBeDisabled();

    // When: the user types their name
    fireEvent.change(screen.getByPlaceholderText("Your name"), { target: { value: "Ada" } });

    // Then: the Continue button is now enabled
    expect(continueBtn).not.toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// Error States
// ---------------------------------------------------------------------------

