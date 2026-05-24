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

  it("defaults to the 26-week view with oldest-first ordering", () => {
    // Given: a habit with no history
    const habit = makeHabit();

    // When: the wall renders
    render(<HistoryWall habit={habit} />);

    // Then: the 26-week heading and view controls are shown, and the default
    //       order labels read "26 WEEKS AGO" on the left and "TODAY" on the right
    expect(screen.getByRole("heading", { name: "26-week wall" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "26 weeks" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Oldest first" }).getAttribute("aria-pressed")).toBe("true");
    const footer = screen.getByText("26 WEEKS AGO").parentElement!;
    expect(Array.from(footer.children).map((c) => c.textContent)).toEqual(["26 WEEKS AGO", "TODAY"]);
  });

  it("switches to the This week view when the user clicks the toggle", () => {
    // Given: a habit detail page showing the default wall
    const habit = makeHabit();
    render(<HistoryWall habit={habit} />);

    // When: the user clicks the "This week" range button
    fireEvent.click(screen.getByRole("button", { name: "This week" }));

    // Then: the heading switches to "This week" and the older footer label
    //       updates to "6 DAYS AGO"
    expect(screen.getByRole("heading", { name: "This week" })).toBeTruthy();
    expect(screen.getByText("6 DAYS AGO")).toBeTruthy();
    expect(screen.getByRole("button", { name: "This week" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("flips the wall ordering when the user clicks Newest first", () => {
    // Given: the wall in its default oldest-first ordering
    const habit = makeHabit();
    render(<HistoryWall habit={habit} />);
    const footer = screen.getByText("26 WEEKS AGO").parentElement!;
    const orderedBefore = Array.from(footer.children).map((c) => c.textContent);

    // When: the user clicks Newest first
    fireEvent.click(screen.getByRole("button", { name: "Newest first" }));

    // Then: TODAY now appears on the left and 26 WEEKS AGO on the right
    const orderedAfter = Array.from(footer.children).map((c) => c.textContent);
    expect(orderedBefore).toEqual(["26 WEEKS AGO", "TODAY"]);
    expect(orderedAfter).toEqual(["TODAY", "26 WEEKS AGO"]);
  });

  it("renders a simple binary legend rather than a multi-step gradient", () => {
    // Given: the wall mounted with the user-friendly legend
    render(<HistoryWall habit={makeHabit()} />);

    // Then: only DONE, MISSED, and TODAY swatches appear; no confusing
    //       intermediate shades (the user reported these were misleading
    //       since one habit can only be done once per day)
    const legend = screen.getByLabelText("Wall legend");
    expect(legend.textContent).toContain("DONE");
    expect(legend.textContent).toContain("MISSED");
    expect(legend.textContent).toContain("TODAY");
    expect(legend.textContent).not.toContain("LESS");
    expect(legend.textContent).not.toContain("MORE");
  });

  it("sizes the wall grid so it fits the container instead of overflowing horizontally", () => {
    // Given: the wall in its default 26-week view
    const { container } = render(<HistoryWall habit={makeHabit()} />);

    // When: we look at the inline style of the grid element
    // The component renders one grid <div> inside the wall wrapper. We
    // can locate it as the parent of the first column (the first child of
    // a column is a `.dot` cell, so the grid is the cell's grandparent).
    const firstCell = container.querySelector('[aria-label$="missed"], [aria-label$="done"]');
    expect(firstCell).toBeTruthy();
    const grid = firstCell!.parentElement!.parentElement!;

    // Then: the grid declares the number of columns and a max cell size via
    //       CSS variables so it can shrink to fit narrow phones without
    //       overflowing under the main container (bug reported in mobile).
    //       The default 26-week view passes --cols=26 and --max-cell=12px.
    const style = grid.getAttribute("style") ?? "";
    expect(style).toContain("--cols");
    expect(style).toContain("26");
    expect(style).toContain("--max-cell");
    expect(style).toContain("12px");

    // And: switching to the week view bumps --cols to 7 and grows the max
    //      cell size to 20px so the few dots are still readable on desktop.
    fireEvent.click(screen.getByRole("button", { name: "This week" }));
    const newCell = container.querySelector('[aria-label$="missed"], [aria-label$="done"]')!;
    const newGrid = newCell.parentElement!.parentElement!;
    const newStyle = newGrid.getAttribute("style") ?? "";
    expect(newStyle).toContain("7");
    expect(newStyle).toContain("20px");
  });

  it("does not wrap the grid in the legacy overflow-clipping scroll container", () => {
    // Given: a HistoryWall rendered with default props
    const { container } = render(<HistoryWall habit={makeHabit()} />);

    // When: we inspect the element wrapping the grid columns
    const firstCell = container.querySelector('[aria-label$="missed"], [aria-label$="done"]')!;
    const grid = firstCell.parentElement!.parentElement!;
    const wrapper = grid.parentElement!;

    // Then: the wrapper does NOT carry the legacy `.history-wall-scroll`
    //       class. That class triggered overflow-x: auto on mobile, which
    //       implicitly forced overflow-y to a non-visible value per the
    //       CSS Overflow spec and clipped the bottom row's `.today` outline
    //       under the card edge — the actual cause of the "blocks look
    //       cut off underneath" bug the user reported.
    expect(wrapper.classList.contains("history-wall-scroll")).toBe(false);
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

  // Given: a saved habit note containing markdown formatting (bold, list, link)
  // When: NotesManager renders the read view
  // Then: each markdown token becomes its matching HTML element so users see
  //       the formatted result the same way they do on the journal/review
  //       surfaces. This proves the markdown render is wired for habit notes.
  it("renders saved habit notes as markdown (bold, list, link)", () => {
    render(
      <NotesManager
        habit={makeHabit({
          notes: [
            {
              id: "note_md",
              createdAt: "2030-01-03",
              body: "**bold lead**\n\n- step one\n- step two\n\n[atomicly](https://atomicly.local)",
            },
          ],
        })}
        onUpdateNotes={vi.fn()}
      />,
    );

    expect(screen.getByText("bold lead").tagName).toBe("STRONG");
    expect(screen.getByText("step one").tagName).toBe("LI");
    expect(screen.getByText("step two").tagName).toBe("LI");
    const link = screen.getByText("atomicly");
    expect(link.tagName).toBe("A");
    expect(link.getAttribute("href")).toBe("https://atomicly.local");
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
