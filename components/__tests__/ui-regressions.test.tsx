import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EditableLaw } from "@/components/EditableLaw";
import { HabitJournalStream } from "@/components/HabitJournalStream";
import { HistoryWall } from "@/components/HistoryWall";
import { LoopDiagram } from "@/components/LoopDiagram";
import { NotesManager } from "@/components/NotesManager";
import { applyAppearance } from "@/lib/appearance";
import type { Habit } from "@/lib/types";

let storage: Map<string, string>;

beforeEach(() => {
  storage = new Map();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: vi.fn((key: string) => storage.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
      removeItem: vi.fn((key: string) => storage.delete(key)),
      clear: vi.fn(() => storage.clear()),
    },
  });
});

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.style.removeProperty("--accent");
  document.documentElement.style.removeProperty("--accent-2");
  document.documentElement.style.removeProperty("--accent-soft");
  window.localStorage.clear();
});

function makeHabit(patch: Partial<Habit> = {}): Habit {
  return {
    id: "habit_1",
    name: "Read",
    emoji: "•",
    cue: "",
    craving: "",
    response: "Read one page",
    reward: "",
    loopCue: "",
    loopCraving: "",
    loopResponse: "Read one page",
    loopReward: "",
    twoMin: "",
    identity: "reader",
    environment: "",
    schedule: "Daily",
    time: "Morning",
    contract: "",
    contractPartners: [],
    history: {},
    notes: [],
    createdAt: "2030-01-01",
    ...patch,
  };
}

describe("UI regressions", () => {
  it("applies saved appearance preferences to the document", () => {
    applyAppearance("dark", 145);

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.style.getPropertyValue("--accent")).toBe("oklch(62% 0.13 145)");
    expect(document.documentElement.style.getPropertyValue("--accent-soft")).toBe("oklch(28% 0.05 145)");
    expect(window.localStorage.getItem("atomicly:theme")).toBe("dark");
    expect(window.localStorage.getItem("atomicly:accent")).toBe("145");
  });

  it("distinguishes an empty law placeholder from saved user text", () => {
    const onSave = vi.fn();
    const { rerender } = render(
      <EditableLaw
        label="1. Make it obvious"
        hint="Cue"
        value=""
        placeholder="When 7am, after I pour coffee..."
        onSave={onSave}
      />,
    );

    expect(screen.getByText("Not set yet")).toBeTruthy();
    fireEvent.click(screen.getByText("When 7am, after I pour coffee..."));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "After coffee, open the book" } });
    fireEvent.click(screen.getByText("Save"));
    expect(onSave).toHaveBeenCalledWith("After coffee, open the book");

    rerender(
      <EditableLaw
        label="1. Make it obvious"
        hint="Cue"
        value="After coffee, open the book"
        placeholder="When 7am, after I pour coffee..."
        onSave={onSave}
      />,
    );
    expect(screen.queryByText("Not set yet")).toBeNull();
    expect(screen.getByText("After coffee, open the book")).toBeTruthy();
  });

  it("renders history as read-only check-in evidence", () => {
    const habit = makeHabit({ history: { "2030-01-01": true } });
    render(<HistoryWall habit={habit} />);

    expect(screen.getByText("Each square is a day logged from your habit check-ins.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /toggle/i })).toBeNull();
  });

  it("lets the habit loop response be edited independently", () => {
    const onUpdate = vi.fn();
    render(<LoopDiagram habit={makeHabit()} onUpdate={onUpdate} />);

    fireEvent.click(screen.getByRole("button", { name: "Read one page" }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Read two pages" } });
    fireEvent.click(screen.getByText("Save"));

    expect(onUpdate).toHaveBeenCalledWith({ loopResponse: "Read two pages" });
  });

  it("allows standalone habit notes to be edited", () => {
    const onUpdateNotes = vi.fn();
    render(
      <NotesManager
        habit={makeHabit({
          notes: [{ id: "note_1", body: "Original note", createdAt: "2030-01-03" }],
        })}
        onUpdateNotes={onUpdateNotes}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit note" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Edit note body" }), { target: { value: "Updated note" } });
    fireEvent.click(screen.getByText("Save note"));

    expect(onUpdateNotes).toHaveBeenCalledWith([{ id: "note_1", body: "Updated note", createdAt: "2030-01-03" }]);
  });

  it("allows habit journal entries to edit mood emoji and note", () => {
    const onSaveEntry = vi.fn();
    render(
      <HabitJournalStream
        habit={makeHabit({
          history: {
            "2030-01-02": { done: true, mood: 2, journal: "Rushed through it" },
          },
        })}
        onSaveEntry={onSaveEntry}
        onClearEntry={vi.fn()}
      />,
    );

    expect(screen.getByText("😕")).toBeTruthy();
    fireEvent.click(screen.getByText("Edit"));
    fireEvent.click(screen.getByText("😄"));
    fireEvent.change(screen.getByPlaceholderText("Add a note for this check-in."), { target: { value: "Felt much better after staging the book" } });
    fireEvent.click(screen.getByText("Save entry"));

    expect(onSaveEntry).toHaveBeenCalledWith("2030-01-02", {
      mood: 5,
      journal: "Felt much better after staging the book",
    });
  });
});
