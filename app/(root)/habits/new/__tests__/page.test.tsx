import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Habit } from "@/lib/types";

const routerMock = vi.hoisted(() => ({
  push: vi.fn(),
}));

const storeMock = vi.hoisted(() => ({
  habits: [] as Habit[],
  formationVerdicts: [] as Array<{ habitId: string; formed: boolean }>,
  identity: { statement: "", values: [] as string[] },
  addHabit: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

vi.mock("@/components/StoreProvider", () => ({
  useStoreContext: () => storeMock,
}));

import NewHabitPage from "@/app/(root)/habits/new/page";

const next = () => fireEvent.click(screen.getByRole("button", { name: "Next" }));

/** Fill the name step and advance to the identity step. */
function toIdentityStep(name = "read one page") {
  fireEvent.change(screen.getByPlaceholderText("read one page"), { target: { value: name } });
  next();
}

/** Identity chips are the suggestion buttons in the identity step. */
function identityChips(): string[] {
  const group = screen.queryByTestId("identity-suggestions");
  if (!group) return [];
  return within(group)
    .getAllByRole("button")
    .map((el) => el.textContent ?? "");
}

/** Walk the whole wizard and land on the review step. */
function completeWizard({ name, cue = "", identity }: { name: string; cue?: string; identity: string }) {
  toIdentityStep(name);
  fireEvent.change(screen.getByPlaceholderText("a reader"), { target: { value: identity } });
  next();
  fireEvent.change(screen.getByPlaceholderText("after I pour my coffee"), { target: { value: cue } });
  next();
  fireEvent.click(screen.getByRole("button", { name: "Skip" }));
}

beforeEach(() => {
  storeMock.habits = [];
  storeMock.formationVerdicts = [];
  storeMock.addHabit.mockClear();
  routerMock.push.mockClear();
});

afterEach(() => {
  cleanup();
});

describe("NewHabitPage wizard", () => {
  it("starts on the habit step and blocks Next with an inline error until a habit is entered", () => {
    // Given: the wizard on step one
    render(<NewHabitPage />);
    expect(screen.getByText("Step 1 of 5")).toBeTruthy();

    // When: the user tries to continue without typing anything
    next();

    // Then: they stay on the step and see an error next to the field
    expect(screen.getByRole("alert").textContent).toMatch(/add what you'll do/i);
    expect(screen.getByText("Step 1 of 5")).toBeTruthy();
  });

  it("fills the habit from a one-tap example", () => {
    // Given: the first step
    render(<NewHabitPage />);
    // When: the user taps an example
    fireEvent.click(screen.getByRole("button", { name: "do 10 push-ups" }));
    // Then: the field holds it
    expect((screen.getByPlaceholderText("read one page") as HTMLInputElement).value).toBe("do 10 push-ups");
  });

  it("renders all seven day toggles, a legend and no select elements on the cue step", () => {
    // Given: the user reaches the cue & schedule step
    const { container } = render(<NewHabitPage />);
    toIdentityStep();
    fireEvent.change(screen.getByPlaceholderText("a reader"), { target: { value: "a reader" } });
    next();

    // Then: every weekday is a toggle and the legend explains the states
    for (const day of ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]) {
      expect(screen.getByRole("button", { name: day })).toBeTruthy();
    }
    expect(screen.getByLabelText("Day selector legend")).toBeTruthy();
    expect(screen.getByText("Scheduled")).toBeTruthy();
    expect(screen.getByText("Off")).toBeTruthy();
    // And: the cue is free text, not a dropdown
    expect(container.querySelectorAll("select").length).toBe(0);
  });

  it("stores the cue exactly as the user typed it, including the connector", () => {
    // Given: a user who typed the whole cue clause
    render(<NewHabitPage />);
    completeWizard({ name: "read one page", cue: "after I pour my coffee", identity: "a reader" });

    // When: they create the habit from the review step
    fireEvent.click(screen.getByRole("button", { name: "Create habit" }));

    // Then: the law cue leads with the typed connector and the loop cue is verbatim
    expect(storeMock.addHabit).toHaveBeenCalledTimes(1);
    const created = storeMock.addHabit.mock.calls[0][0];
    expect(created.cue).toBe("After I pour my coffee.");
    expect(created.loopCue).toBe("after I pour my coffee");
    expect(routerMock.push).toHaveBeenCalledWith("/habits");
  });

  it("supplies a 'when' for a bare cue that lacks a connector", () => {
    render(<NewHabitPage />);
    completeWizard({ name: "read one page", cue: "I pour my coffee", identity: "a reader" });
    fireEvent.click(screen.getByRole("button", { name: "Create habit" }));
    const created = storeMock.addHabit.mock.calls[0][0];
    expect(created.cue).toBe("When I pour my coffee.");
    expect(created.loopCue).toBe("I pour my coffee");
  });

  it("previews the composed habit sentence on the review step", () => {
    render(<NewHabitPage />);
    completeWizard({ name: "read one page", cue: "after I pour my coffee", identity: "a reader" });
    expect(screen.getByTestId("habit-sentence-preview").textContent).toBe(
      "I'll read one page after I pour my coffee — so I can become a reader.",
    );
  });

  it("shows habit-derived identities as chips but excludes core values", () => {
    // Given: core values plus habits with their own identities
    storeMock.identity = { statement: "I am disciplined.", values: ["Discipline", "Health"] };
    storeMock.habits = [
      { id: "h1", name: "Read", identity: "a reader" },
      { id: "h2", name: "Run", identity: "a runner" },
    ] as Habit[];
    render(<NewHabitPage />);
    // When: the user reaches the identity step
    toIdentityStep();
    // Then: only habit-derived identities are offered
    const chips = identityChips();
    expect(chips).toEqual(expect.arrayContaining(["a reader", "a runner"]));
    expect(chips).not.toContain("Discipline");
    expect(chips).not.toContain("Health");
  });

  it("only shows the top 5 most-used identities by default", () => {
    storeMock.habits = [
      { id: "h1", name: "Read", identity: "a reader" },
      { id: "h2", name: "Read 2", identity: "a reader" },
      { id: "h3", name: "Run", identity: "a runner" },
      { id: "h4", name: "Meditate", identity: "mindful" },
      { id: "h5", name: "Write", identity: "writer" },
      { id: "h6", name: "Lift", identity: "athlete" },
      { id: "h7", name: "Sleep", identity: "rested" },
    ] as Habit[];
    render(<NewHabitPage />);
    toIdentityStep();
    const chips = identityChips();
    expect(chips).toHaveLength(5);
    expect(chips[0]).toBe("a reader");
    expect(chips).not.toContain("rested");
  });

  it("filters identity chips as the user types, and fills the field on tap", () => {
    storeMock.habits = [
      { id: "h1", name: "Read", identity: "a reader" },
      { id: "h2", name: "Run", identity: "a runner" },
      { id: "h3", name: "Write", identity: "writer" },
    ] as Habit[];
    render(<NewHabitPage />);
    toIdentityStep();
    const input = screen.getByPlaceholderText("a reader") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "run" } });
    expect(identityChips()).toEqual(["a runner"]);

    fireEvent.click(screen.getByRole("button", { name: "a runner" }));
    expect(input.value).toBe("a runner");

    fireEvent.change(input, { target: { value: "pilot" } });
    expect(identityChips()).toEqual([]);
  });

  it("blocks the identity step until an identity is entered", () => {
    render(<NewHabitPage />);
    toIdentityStep();
    next();
    expect(screen.getByRole("alert").textContent).toMatch(/who this habit helps you become/i);
    expect(screen.getByText("Step 2 of 5")).toBeTruthy();
  });

  it("uses custom four-law wording from the optional step", () => {
    // Given: a user who opens "Make it stick" and writes their own reward
    render(<NewHabitPage />);
    toIdentityStep();
    fireEvent.change(screen.getByPlaceholderText("a reader"), { target: { value: "a reader" } });
    next();
    next();
    fireEvent.change(screen.getByLabelText("4. Make it satisfying"), { target: { value: "Tick the box." } });

    // When: they continue and create
    next();
    fireEvent.click(screen.getByRole("button", { name: "Create habit" }));

    // Then: their wording is kept while the others use the defaults
    const created = storeMock.addHabit.mock.calls[0][0];
    expect(created.reward).toBe("Tick the box.");
    expect(created.twoMin).toBe("Just read one page for two minutes.");
  });

  it("returns to an earlier step from the review's Edit button", () => {
    render(<NewHabitPage />);
    completeWizard({ name: "read one page", identity: "a reader" });
    fireEvent.click(screen.getByRole("button", { name: "Edit identity" }));
    expect(screen.getByText("Step 2 of 5")).toBeTruthy();
    expect((screen.getByPlaceholderText("a reader") as HTMLInputElement).value).toBe("a reader");
  });

  // -------------------------------------------------------------------------
  // Active-habit cap UX
  // -------------------------------------------------------------------------
  it("disables creation and explains the cap when the user has 3 active habits", () => {
    // Given: three active (non-inducted) habits
    storeMock.habits = [
      { id: "h1", name: "Read", identity: "a reader" },
      { id: "h2", name: "Run", identity: "a runner" },
      { id: "h3", name: "Write", identity: "a writer" },
    ] as Habit[];
    render(<NewHabitPage />);

    // Then: the cap message and its help tip are shown up front
    expect(screen.getByText(/reached the maximum of 3 active habits/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Why can't I add a habit?" })).toBeTruthy();

    // And: even with every answer filled in, Create stays disabled
    completeWizard({ name: "meditate", identity: "calm" });
    const createButton = screen.getByRole("button", { name: "Create habit" }) as HTMLButtonElement;
    expect(createButton.disabled).toBe(true);
    fireEvent.click(createButton);
    expect(storeMock.addHabit).not.toHaveBeenCalled();
  });

  it("keeps creation available when one of three habits is inducted (frees a slot)", () => {
    storeMock.habits = [
      { id: "h1", name: "Read", identity: "a reader" },
      { id: "h2", name: "Run", identity: "a runner" },
      { id: "h3", name: "Write", identity: "a writer" },
    ] as Habit[];
    storeMock.formationVerdicts = [{ habitId: "h2", formed: true }];
    render(<NewHabitPage />);

    expect(screen.queryByText(/reached the maximum of 3 active habits/i)).toBeNull();
    completeWizard({ name: "meditate", identity: "calm" });
    const createButton = screen.getByRole("button", { name: "Create habit" }) as HTMLButtonElement;
    expect(createButton.disabled).toBe(false);
    fireEvent.click(createButton);
    expect(storeMock.addHabit).toHaveBeenCalledTimes(1);
  });

  it("keeps the heading help tip explaining the habit cap", () => {
    render(<NewHabitPage />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(within(heading).getByRole("button", { name: "How many habits can I have?" })).toBeTruthy();
  });
});
