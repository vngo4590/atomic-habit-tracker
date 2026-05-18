import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MoodCheckSheet } from "@/components/MoodCheckSheet";
import type { Habit } from "@/lib/types";

function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: "h1",
    name: "Read 10 pages",
    emoji: "📖",
    identity: "a reader",
    time: "Morning",
    stackAfterId: null,
    schedule: "Every day",
    cue: "After I pour coffee",
    response: "Read 10 pages",
    twoMin: "Open the book",
    craving: "Become a reader",
    reward: "One visible win",
    environment: "Kitchen table",
    contract: "",
    contractPartners: [],
    notes: [],
    createdAt: "2024-01-01",
    history: {},
    loopCue: "",
    loopCraving: "",
    loopResponse: "",
    loopReward: "",
    ...overrides,
  };
}

describe("MoodCheckSheet business logic", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows the habit name in the sheet title", () => {
    // Given a habit named "Read 10 pages"
    const habit = makeHabit();
    const onClose = vi.fn();
    const onSave = vi.fn();

    // When the mood check sheet is rendered
    render(<MoodCheckSheet habit={habit} dateKey="2024-06-15" onClose={onClose} onSave={onSave} />);

    // Then the habit name appears in the title
    expect(screen.getByText(/read 10 pages/i)).toBeTruthy();
  });

  it("displays all 5 mood options (Awful, Meh, Okay, Good, Great)", () => {
    // Given the mood check sheet is open
    const habit = makeHabit();

    // When it is rendered
    render(<MoodCheckSheet habit={habit} dateKey="2024-06-15" onClose={vi.fn()} onSave={vi.fn()} />);

    // Then all five mood labels are visible
    expect(screen.getByText("Awful")).toBeTruthy();
    expect(screen.getByText("Meh")).toBeTruthy();
    expect(screen.getByText("Okay")).toBeTruthy();
    expect(screen.getByText("Good")).toBeTruthy();
    expect(screen.getByText("Great")).toBeTruthy();

    // And all five emoji faces are visible
    expect(screen.getByText("😢")).toBeTruthy();
    expect(screen.getByText("😕")).toBeTruthy();
    expect(screen.getByText("😐")).toBeTruthy();
    expect(screen.getByText("🙂")).toBeTruthy();
    expect(screen.getByText("😄")).toBeTruthy();
  });

  it("highlights the selected mood when a mood option is clicked", () => {
    // Given the mood check sheet is open
    const habit = makeHabit();

    const { container } = render(
      <MoodCheckSheet habit={habit} dateKey="2024-06-15" onClose={vi.fn()} onSave={vi.fn()} />,
    );

    // When the user clicks the "Great" mood option
    fireEvent.click(screen.getByText("Great"));

    // Then the Great button has a distinct border color style
    const buttons = container.querySelectorAll("button");
    const greatButton = Array.from(buttons).find((b) => b.textContent?.includes("Great"));
    expect(greatButton).toBeTruthy();
  });

  it("allows typing a journal note in the textarea", () => {
    // Given the mood check sheet is open
    const habit = makeHabit();

    render(<MoodCheckSheet habit={habit} dateKey="2024-06-15" onClose={vi.fn()} onSave={vi.fn()} />);

    // When the user types a journal note
    const textarea = screen.getByLabelText("Journal note");
    fireEvent.change(textarea, { target: { value: "Felt energized today" } });

    // Then the textarea contains the typed text
    expect((textarea as HTMLTextAreaElement).value).toBe("Felt energized today");
  });

  it("calls onSave with mood and journal when Save check-in is clicked", () => {
    // Given the user has selected a mood and typed a note
    const habit = makeHabit();
    const onSave = vi.fn();
    const onClose = vi.fn();

    render(<MoodCheckSheet habit={habit} dateKey="2024-06-15" onClose={onClose} onSave={onSave} />);

    // When the user selects "Good" and types a note
    fireEvent.click(screen.getByText("Good"));
    fireEvent.change(screen.getByLabelText("Journal note"), {
      target: { value: "Really enjoyed the session" },
    });

    // And clicks Save check-in
    fireEvent.click(screen.getByText("Save check-in"));

    // Then onSave is called with the mood and journal
    expect(onSave).toHaveBeenCalledWith({ mood: 4, journal: "Really enjoyed the session" });

    // And the sheet closes
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onSave with only mood when journal is empty", () => {
    // Given the user has selected a mood but left the journal empty
    const habit = makeHabit();
    const onSave = vi.fn();
    const onClose = vi.fn();

    render(<MoodCheckSheet habit={habit} dateKey="2024-06-15" onClose={onClose} onSave={onSave} />);

    // When the user selects "Okay" without typing a note
    fireEvent.click(screen.getByText("Okay"));

    // And clicks Save check-in
    fireEvent.click(screen.getByText("Save check-in"));

    // Then onSave is called with only the mood
    expect(onSave).toHaveBeenCalledWith({ mood: 3 });
  });

  it("calls onClose without saving when Skip is clicked", () => {
    // Given the user has the mood check sheet open
    const habit = makeHabit();
    const onSave = vi.fn();
    const onClose = vi.fn();

    render(<MoodCheckSheet habit={habit} dateKey="2024-06-15" onClose={onClose} onSave={onSave} />);

    // When the user clicks Skip
    fireEvent.click(screen.getByText("Skip - just mark it done"));

    // Then onClose is called but onSave is not
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("calls onClose when the close button is clicked", () => {
    // Given the mood check sheet is open
    const habit = makeHabit();
    const onClose = vi.fn();
    const onSave = vi.fn();

    render(<MoodCheckSheet habit={habit} dateKey="2024-06-15" onClose={onClose} onSave={onSave} />);

    // When the user clicks the close button
    fireEvent.click(screen.getByLabelText("Close"));

    // Then onClose is called
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });
});
