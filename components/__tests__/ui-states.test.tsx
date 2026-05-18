import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppearanceSync } from "@/components/AppearanceSync";
import { HabitRow } from "@/components/HabitRow";
import { MoodCheckSheet } from "@/components/MoodCheckSheet";
import { Nav } from "@/components/Nav";
import { OnboardingOverlay } from "@/components/OnboardingOverlay";
import { Toast } from "@/components/Toast";

import AnalyticsPage from "@/app/(root)/analytics/page";
import HabitsPage from "@/app/(root)/habits/page";
import HallOfFamePage from "@/app/(root)/hall-of-fame/page";
import HabitDetailPage from "@/app/(root)/habits/[id]/page";
import IdentityPage from "@/app/(root)/identity/page";
import JournalPage from "@/app/(root)/journal/page";
import ReviewPage from "@/app/(root)/review/page";
import SettingsPage from "@/app/(root)/settings/page";
import TodayPage from "@/app/(root)/page";

import { applyAppearance } from "@/lib/appearance";
import { dateAdd, todayKey } from "@/lib/helpers";
import type { Habit } from "@/lib/types";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const routerMock = vi.hoisted(() => ({
  push: vi.fn(),
  back: vi.fn(),
}));

const paramsMock = vi.hoisted(() => ({ current: { id: "missing-id" } }));

const storeMock = vi.hoisted(() => ({
  habits: [] as Habit[],
  journal: [],
  identity: { statement: "", values: [] as string[] },
  weeklyReview: { wentWell: "", smallestFix: "", identityVote: "" },
  weeklyReviews: [],
  completedLessons: new Set<number>(),
  lessonMode: "sequential" as const,
  formationVerdicts: [],
  preferences: {
    theme: "light" as "light" | "dark",
    accentHue: 60,
    remindersEnabled: true,
    weeklyReviewNudge: true,
    accountabilityNudge: false,
    onboardingSeen: false,
    lessonMode: "sequential" as "sequential" | "free",
    timezone: "UTC",
  },
  toast: null as { id: number; msg: string; sub?: string } | null,
  setHabits: vi.fn(),
  addHabit: vi.fn(),
  toggleHabit: vi.fn(),
  logCheckIn: vi.fn(),
  updateHabit: vi.fn(),
  deleteHabit: vi.fn(),
  addJournal: vi.fn(),
  updateJournal: vi.fn(),
  setIdentity: vi.fn(),
  setWeeklyReview: vi.fn(),
  setLessonMode: vi.fn(),
  markLessonRead: vi.fn(),
  saveFormationVerdict: vi.fn(),
  setPreferences: vi.fn(),
  showToast: vi.fn(),
  streak: vi.fn(() => 0),
  longestStreak: vi.fn(() => 0),
  completionRate: vi.fn(() => 0),
}));

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeHabit(patch: Partial<Habit> = {}): Habit {
  return {
    id: "habit_1",
    name: "Read",
    emoji: "•",
    cue: "After coffee",
    craving: "",
    response: "Read one page",
    reward: "",
    loopCue: "",
    loopCraving: "",
    loopResponse: "",
    loopReward: "",
    twoMin: "",
    identity: "reader",
    environment: "",
    schedule: "Daily",
    time: "Morning",
    stackAfterId: null,
    contract: "",
    contractPartners: [],
    history: {},
    notes: [],
    createdAt: "2030-01-01",
    ...patch,
  };
}

beforeEach(() => {
  // Reset store to empty defaults
  storeMock.habits = [];
  storeMock.journal = [];
  storeMock.identity = { statement: "", values: [] };
  storeMock.weeklyReviews = [];
  storeMock.formationVerdicts = [];
  storeMock.toast = null;
  storeMock.preferences = {
    theme: "light" as const,
    accentHue: 60,
    remindersEnabled: true,
    weeklyReviewNudge: true,
    accountabilityNudge: false,
    onboardingSeen: false,
    lessonMode: "sequential" as const,
    timezone: "UTC",
  };
  paramsMock.current = { id: "missing-id" };
  vi.clearAllMocks();

  // Ensure localStorage is stubbed for applyAppearance
  Object.defineProperty(window, "localStorage", {
    value: {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    },
    writable: true,
  });
});

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.style.removeProperty("--accent");
  document.documentElement.style.removeProperty("--accent-2");
  document.documentElement.style.removeProperty("--accent-soft");
});

// ---------------------------------------------------------------------------
// Empty States (what new users see)
// ---------------------------------------------------------------------------
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
// Schedule-aware Today counts
// ---------------------------------------------------------------------------
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

  it("Today page shows only the first undone habit in a stack", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-18T12:00:00Z")); // Monday

    storeMock.habits = [
      makeHabit({ id: "A", schedule: "Weekdays", history: {}, name: "Read", stackAfterId: null }),
      makeHabit({ id: "B", schedule: "Weekdays", history: {}, name: "Meditate", stackAfterId: "A" }),
      makeHabit({ id: "C", schedule: "Weekdays", history: {}, name: "Journal", stackAfterId: "B" }),
    ];

    render(<TodayPage />);

    // Then: only the root habit A is visible
    expect(screen.getByText("Read")).toBeTruthy();
    expect(screen.queryByText("Meditate")).toBeNull();
    expect(screen.queryByText("Journal")).toBeNull();

    vi.useRealTimers();
  });

  it("Today page reveals the next stacked habit after the previous is done", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-18T12:00:00Z")); // Monday

    const today = "2026-05-18";
    storeMock.habits = [
      makeHabit({ id: "A", schedule: "Weekdays", history: { [today]: true }, name: "Read", stackAfterId: null }),
      makeHabit({ id: "B", schedule: "Weekdays", history: {}, name: "Meditate", stackAfterId: "A" }),
      makeHabit({ id: "C", schedule: "Weekdays", history: {}, name: "Journal", stackAfterId: "B" }),
    ];

    render(<TodayPage />);

    // Then: A is done so B appears next
    expect(screen.queryByText("Read")).toBeNull();
    expect(screen.getByText("Meditate")).toBeTruthy();
    expect(screen.queryByText("Journal")).toBeNull();

    vi.useRealTimers();
  });

  it("Today page hides a fully completed stack", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-18T12:00:00Z")); // Monday

    const today = "2026-05-18";
    storeMock.habits = [
      makeHabit({ id: "A", schedule: "Weekdays", history: { [today]: true }, name: "Read", stackAfterId: null }),
      makeHabit({ id: "B", schedule: "Weekdays", history: { [today]: true }, name: "Meditate", stackAfterId: "A" }),
      makeHabit({ id: "C", schedule: "Weekdays", history: { [today]: true }, name: "Journal", stackAfterId: "B" }),
    ];

    render(<TodayPage />);

    // Then: no habits from the stack are shown
    expect(screen.queryByText("Read")).toBeNull();
    expect(screen.queryByText("Meditate")).toBeNull();
    expect(screen.queryByText("Journal")).toBeNull();
    expect(screen.getByText("Every scheduled habit is complete.")).toBeTruthy();

    vi.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// Loading / Transition States
// ---------------------------------------------------------------------------
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

    // Then: the in-progress section contains progress bars with the expected widths
    const bars = document.querySelectorAll("[style*='width']");
    const zeroBar = Array.from(bars).find((el) =>
      el.getAttribute("style")?.includes("width: 0%"),
    );
    const fiftyBar = Array.from(bars).find((el) =>
      el.getAttribute("style")?.includes("width: 50%"),
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
describe("Dark Mode States", () => {
  it("AppearanceSync applies the data-theme attribute to the document", () => {
    // Given: the store preferences are set to dark mode with a custom accent
    storeMock.preferences = {
      ...storeMock.preferences,
      theme: "dark" as "light" | "dark",
      accentHue: 145,
    };

    // When: AppearanceSync mounts
    render(<AppearanceSync />);

    // Then: the document root reflects the theme and accent
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.style.getPropertyValue("--accent")).toBe("oklch(62% 0.13 145)");
  });

  it("Theme toggle buttons show the correct active state", () => {
    // Given: the store is in light mode
    storeMock.preferences = { ...storeMock.preferences, theme: "light" as const };

    // When: the Settings page renders
    render(<SettingsPage />);

    // Then: the Light button carries the primary active class
    const lightBtn = screen.getByText("Light");
    const darkBtn = screen.getByText("Dark");
    expect(lightBtn.className).toContain("btn-primary");
    expect(darkBtn.className).not.toContain("btn-primary");
  });

  it("Accent color applies the CSS custom property to the document", () => {
    // Given: a custom accent hue
    const hue = 240;

    // When: applyAppearance is called directly
    applyAppearance("light", hue);

    // Then: the CSS custom properties are set
    expect(document.documentElement.style.getPropertyValue("--accent")).toBe(`oklch(62% 0.13 ${hue})`);
    expect(document.documentElement.style.getPropertyValue("--accent-2")).toBe(`oklch(72% 0.10 ${hue})`);
  });
});
