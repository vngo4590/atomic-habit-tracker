import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import JournalPage from "@/app/(root)/journal/page";
import { testJournalEntry, testStoreContext } from "@/lib/test/fixtures";
import type { StoreState } from "@/lib/types";

// ---------------------------------------------------------------------------
// Mock useStoreContext — the page renders without a full StoreProvider tree.
// ---------------------------------------------------------------------------
let storeCtx: StoreState = testStoreContext();

vi.mock("@/components/StoreProvider", () => ({
  useStoreContext: () => storeCtx,
}));

function makeStore(patch: Partial<StoreState> = {}): StoreState {
  return testStoreContext({ addJournal: vi.fn(), updateJournal: vi.fn(), ...patch });
}

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// Initial render
// ---------------------------------------------------------------------------
describe("JournalPage initial state", () => {
  beforeEach(() => {
    storeCtx = makeStore({ journal: [] });
  });

  it("shows the three prompt shortcut cards and the New entry button", () => {
    // Given: no journal entries
    render(<JournalPage />);

    // When: the page renders in its default state
    // Then: all three prompts and the CTA button are visible
    expect(screen.getByRole("button", { name: "New entry" })).toBeTruthy();
    expect(screen.getByText("What habit felt automatic today?")).toBeTruthy();
    expect(screen.getByText("Where did friction show up?")).toBeTruthy();
    expect(screen.getByText("What is one tiny adjustment for tomorrow?")).toBeTruthy();
  });

  it("displays existing journal entries when the store contains them", () => {
    // Given: two entries already in the journal
    storeCtx = makeStore({
      journal: [
        testJournalEntry({ id: "j1", title: "First reflection" }),
        testJournalEntry({ id: "j2", title: "Second reflection" }),
      ],
    });
    render(<JournalPage />);

    // When: the page renders
    // Then: both entry titles appear in the list
    expect(screen.getByText("First reflection")).toBeTruthy();
    expect(screen.getByText("Second reflection")).toBeTruthy();
  });

  it("sorts entries newest-first when entries have different dates", () => {
    // Given: an older and a newer entry in any store order
    storeCtx = makeStore({
      journal: [
        testJournalEntry({ id: "j_old", date: "2030-01-01", title: "Older entry" }),
        testJournalEntry({ id: "j_new", date: "2030-01-10", title: "Newer entry" }),
      ],
    });
    render(<JournalPage />);

    // When: the page renders
    const headings = screen.getAllByRole("heading", { level: 2 });

    // Then: the newest entry appears first
    expect(headings[0].textContent).toBe("Newer entry");
    expect(headings[1].textContent).toBe("Older entry");
  });

  it("shows the entry body text when it is non-empty", () => {
    // Given: an entry with a body
    storeCtx = makeStore({
      journal: [testJournalEntry({ body: "Kept the cue visible all morning." })],
    });
    render(<JournalPage />);

    // When: the page renders
    // Then: the body paragraph is visible
    expect(screen.getByText("Kept the cue visible all morning.")).toBeTruthy();
  });

  it("omits the body paragraph when the entry body is empty", () => {
    // Given: an entry with no body
    storeCtx = makeStore({ journal: [testJournalEntry({ body: "" })] });
    render(<JournalPage />);

    // When: the page renders
    // Then: no body paragraph is rendered
    expect(screen.queryByRole("paragraph")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Opening the compose form
// ---------------------------------------------------------------------------
describe("JournalPage opening the compose form", () => {
  beforeEach(() => {
    storeCtx = makeStore({ journal: [] });
  });

  it("shows the compose form with all fields after clicking New entry", () => {
    // Given: the page in its default state
    render(<JournalPage />);

    // When: the user clicks New entry
    fireEvent.click(screen.getByRole("button", { name: "New entry" }));

    // Then: the title input, mood chips, reflection textarea, and action buttons appear
    expect(screen.getByPlaceholderText("What happened today?")).toBeTruthy();
    expect(screen.getByPlaceholderText("Capture the lesson while it is fresh.")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Good day/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /So-so/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Hard/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Custom/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Save entry" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeTruthy();
  });

  it("hides the prompt cards when the compose form opens", () => {
    // Given: the page showing prompt cards
    render(<JournalPage />);

    // When: the compose form is opened
    fireEvent.click(screen.getByRole("button", { name: "New entry" }));

    // Then: the prompt shortcuts are replaced by the compose form
    expect(screen.queryByText("What habit felt automatic today?")).toBeNull();
    expect(screen.queryByText("Where did friction show up?")).toBeNull();
  });

  it("pre-fills the title field when a prompt shortcut is clicked", () => {
    // Given: the page in default state
    render(<JournalPage />);

    // When: the user clicks a prompt card
    fireEvent.click(screen.getByText("What habit felt automatic today?"));

    // Then: the compose form opens with the prompt as the title
    const titleInput = screen.getByPlaceholderText("What happened today?") as HTMLInputElement;
    expect(titleInput.value).toBe("What habit felt automatic today?");
  });

  it("opens with an empty title when New entry is clicked", () => {
    // Given: the page in default state
    render(<JournalPage />);

    // When: the user clicks New entry (not a prompt card)
    fireEvent.click(screen.getByRole("button", { name: "New entry" }));

    // Then: the title field is empty
    const titleInput = screen.getByPlaceholderText("What happened today?") as HTMLInputElement;
    expect(titleInput.value).toBe("");
  });
});

// ---------------------------------------------------------------------------
// Title validation and Save entry button state
// ---------------------------------------------------------------------------
describe("JournalPage Save entry button state", () => {
  beforeEach(() => {
    storeCtx = makeStore({ journal: [] });
    render(<JournalPage />);
    fireEvent.click(screen.getByRole("button", { name: "New entry" }));
  });

  it("disables Save entry when the title is empty", () => {
    // Given: the compose form is open with no title

    // When: the title field has not been filled
    const saveBtn = screen.getByRole("button", { name: "Save entry" }) as HTMLButtonElement;

    // Then: the button is disabled
    expect(saveBtn.disabled).toBe(true);
  });

  it("disables Save entry when the title contains only whitespace", () => {
    // Given: the user types only spaces into the title
    fireEvent.change(screen.getByPlaceholderText("What happened today?"), {
      target: { value: "   " },
    });

    // When: Save entry is checked
    const saveBtn = screen.getByRole("button", { name: "Save entry" }) as HTMLButtonElement;

    // Then: the button remains disabled — title.trim() is empty
    expect(saveBtn.disabled).toBe(true);
  });

  it("enables Save entry once the title has non-whitespace content", () => {
    // Given: the user types a valid title
    fireEvent.change(screen.getByPlaceholderText("What happened today?"), {
      target: { value: "A" },
    });

    // When: the button state is evaluated
    const saveBtn = screen.getByRole("button", { name: "Save entry" }) as HTMLButtonElement;

    // Then: the button is enabled
    expect(saveBtn.disabled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Saving a new entry — preset moods
// ---------------------------------------------------------------------------
describe("JournalPage saving a new entry", () => {
  it("calls addJournal with title, body, default 'good' mood, and empty tags", () => {
    // Given: the form is filled with a title and body; mood is left at the default
    const addJournal = vi.fn();
    storeCtx = makeStore({ journal: [], addJournal });
    render(<JournalPage />);
    fireEvent.click(screen.getByRole("button", { name: "New entry" }));
    fireEvent.change(screen.getByPlaceholderText("What happened today?"), {
      target: { value: "Small win today" },
    });
    fireEvent.change(screen.getByPlaceholderText("Capture the lesson while it is fresh."), {
      target: { value: "Kept the cue visible." },
    });

    // When: the user saves without changing mood
    fireEvent.click(screen.getByRole("button", { name: "Save entry" }));

    // Then: addJournal receives the correct payload
    expect(addJournal).toHaveBeenCalledWith({
      title: "Small win today",
      body: "Kept the cue visible.",
      mood: "good",
      tags: [],
    });
  });

  it("trims leading and trailing whitespace from title and body before saving", () => {
    // Given: the user types padded text in both fields
    const addJournal = vi.fn();
    storeCtx = makeStore({ journal: [], addJournal });
    render(<JournalPage />);
    fireEvent.click(screen.getByRole("button", { name: "New entry" }));
    fireEvent.change(screen.getByPlaceholderText("What happened today?"), {
      target: { value: "  Morning run  " },
    });
    fireEvent.change(screen.getByPlaceholderText("Capture the lesson while it is fresh."), {
      target: { value: "  Felt strong.  " },
    });

    // When: the user saves
    fireEvent.click(screen.getByRole("button", { name: "Save entry" }));

    // Then: addJournal receives trimmed strings
    expect(addJournal).toHaveBeenCalledWith(expect.objectContaining({
      title: "Morning run",
      body: "Felt strong.",
    }));
  });

  it("stores 'meh' when So-so is selected", () => {
    // Given: the user opens the form and picks So-so
    const addJournal = vi.fn();
    storeCtx = makeStore({ journal: [], addJournal });
    render(<JournalPage />);
    fireEvent.click(screen.getByRole("button", { name: "New entry" }));
    fireEvent.change(screen.getByPlaceholderText("What happened today?"), {
      target: { value: "Average session" },
    });
    fireEvent.click(screen.getByRole("button", { name: /So-so/ }));

    // When: the user saves
    fireEvent.click(screen.getByRole("button", { name: "Save entry" }));

    // Then: the 'meh' key is stored
    expect(addJournal).toHaveBeenCalledWith(expect.objectContaining({ mood: "meh" }));
  });

  it("stores 'hard' when Hard is selected", () => {
    // Given: the user selects the Hard mood chip
    const addJournal = vi.fn();
    storeCtx = makeStore({ journal: [], addJournal });
    render(<JournalPage />);
    fireEvent.click(screen.getByRole("button", { name: "New entry" }));
    fireEvent.change(screen.getByPlaceholderText("What happened today?"), {
      target: { value: "Tough session" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Hard/ }));

    // When: the user saves
    fireEvent.click(screen.getByRole("button", { name: "Save entry" }));

    // Then: the 'hard' key is stored
    expect(addJournal).toHaveBeenCalledWith(expect.objectContaining({ mood: "hard" }));
  });

  it("does not call addJournal when Save entry is disabled", () => {
    // Given: the title is empty (Save entry is disabled)
    const addJournal = vi.fn();
    storeCtx = makeStore({ journal: [], addJournal });
    render(<JournalPage />);
    fireEvent.click(screen.getByRole("button", { name: "New entry" }));

    // When: the user attempts to click the disabled button
    fireEvent.click(screen.getByRole("button", { name: "Save entry" }));

    // Then: addJournal is never reached
    expect(addJournal).not.toHaveBeenCalled();
  });

  it("closes the compose form and returns to prompt cards after a successful save", () => {
    // Given: the form is filled and the user saves
    storeCtx = makeStore({ journal: [] });
    render(<JournalPage />);
    fireEvent.click(screen.getByRole("button", { name: "New entry" }));
    fireEvent.change(screen.getByPlaceholderText("What happened today?"), {
      target: { value: "Session complete" },
    });

    // When: the user clicks Save entry
    fireEvent.click(screen.getByRole("button", { name: "Save entry" }));

    // Then: the compose form is gone and the page shows prompt cards again
    expect(screen.queryByPlaceholderText("What happened today?")).toBeNull();
    expect(screen.getByText("What habit felt automatic today?")).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Custom mood picker — two-step flow (emoji + label)
// ---------------------------------------------------------------------------
describe("JournalPage custom mood picker", () => {
  beforeEach(() => {
    storeCtx = makeStore({ journal: [] });
    render(<JournalPage />);
    fireEvent.click(screen.getByRole("button", { name: "New entry" }));
  });

  it("shows the emoji grid and mood label input when Custom is clicked", () => {
    // Given: the compose form is open

    // When: the user clicks the Custom chip
    fireEvent.click(screen.getByRole("button", { name: /Custom/ }));

    // Then: the picker panel is visible with step labels, emoji grid, and label input
    expect(screen.getByText("1. Pick an emoji (or type your own)")).toBeTruthy();
    expect(screen.getByText("2. Name your mood")).toBeTruthy();
    expect(screen.getByPlaceholderText("e.g. Energized, Calm, Grateful")).toBeTruthy();
    expect(screen.getByText("😊")).toBeTruthy();
    expect(screen.getByText("🌟")).toBeTruthy();
  });

  it("closes the picker when Custom is clicked a second time", () => {
    // Given: the picker is open
    fireEvent.click(screen.getByRole("button", { name: /Custom/ }));
    expect(screen.getByPlaceholderText("e.g. Energized, Calm, Grateful")).toBeTruthy();

    // When: the user clicks Custom again to dismiss
    fireEvent.click(screen.getByRole("button", { name: /Custom/ }));

    // Then: the picker is hidden
    expect(screen.queryByPlaceholderText("e.g. Energized, Calm, Grateful")).toBeNull();
  });

  it("highlights an emoji in the grid when clicked and keeps the picker open", () => {
    // Given: the picker is open
    fireEvent.click(screen.getByRole("button", { name: /Custom/ }));

    // When: the user clicks an emoji in the grid
    fireEvent.click(screen.getByText("🌟"));

    // Then: the picker stays open (emoji selection does not close the panel)
    expect(screen.getByPlaceholderText("e.g. Energized, Calm, Grateful")).toBeTruthy();
  });

  it("deselects the emoji when the same grid emoji is clicked a second time", () => {
    // Given: an emoji is selected in the picker
    fireEvent.click(screen.getByRole("button", { name: /Custom/ }));
    fireEvent.click(screen.getByText("🌟"));

    // When: the user clicks the same emoji again (use getAllByText — preview span also shows 🌟)
    const gridButton = screen.getAllByText("🌟").find((el) => el.tagName === "BUTTON") as HTMLElement;
    fireEvent.click(gridButton);

    // Then: the emoji preview next to the label input disappears
    // (the emoji span is only rendered when customEmoji is non-empty)
    expect(screen.queryByText("🌟", { selector: "span" })).toBeNull();
  });

  it("shows the selected emoji as a preview beside the label input", () => {
    // Given: the picker is open
    fireEvent.click(screen.getByRole("button", { name: /Custom/ }));

    // When: the user selects an emoji
    fireEvent.click(screen.getByText("🥳"));

    // Then: a preview span appears showing the chosen emoji next to the label input
    // (there will be at least one instance — in the grid button and in the preview span)
    const instances = screen.getAllByText("🥳");
    expect(instances.length).toBeGreaterThan(1);
  });

  it("keeps the Use button disabled when neither emoji nor label is provided", () => {
    // Given: the picker is open with no selection and no label typed
    fireEvent.click(screen.getByRole("button", { name: /Custom/ }));

    // When: the button state is evaluated
    const useBtn = screen.getByRole("button", { name: "Use" }) as HTMLButtonElement;

    // Then: Use is disabled
    expect(useBtn.disabled).toBe(true);
  });

  it("enables the Use button when only an emoji is selected (no label required)", () => {
    // Given: the picker is open and the user selects only an emoji
    fireEvent.click(screen.getByRole("button", { name: /Custom/ }));
    fireEvent.click(screen.getByText("🌟"));

    // When: the button state is evaluated
    const useBtn = screen.getByRole("button", { name: "Use" }) as HTMLButtonElement;

    // Then: Use is enabled — emoji alone is sufficient
    expect(useBtn.disabled).toBe(false);
  });

  it("enables the Use button when only a label is typed (no emoji required)", () => {
    // Given: the picker is open with only a typed label
    fireEvent.click(screen.getByRole("button", { name: /Custom/ }));
    fireEvent.change(screen.getByPlaceholderText("e.g. Energized, Calm, Grateful"), {
      target: { value: "Grateful" },
    });

    // When: the button state is evaluated
    const useBtn = screen.getByRole("button", { name: "Use" }) as HTMLButtonElement;

    // Then: Use is enabled — label alone is sufficient
    expect(useBtn.disabled).toBe(false);
  });

  it("keeps the Use button disabled when the label is whitespace-only and no emoji is selected", () => {
    // Given: the picker is open with only whitespace in the label field
    fireEvent.click(screen.getByRole("button", { name: /Custom/ }));
    fireEvent.change(screen.getByPlaceholderText("e.g. Energized, Calm, Grateful"), {
      target: { value: "   " },
    });

    // When: the button state is evaluated
    const useBtn = screen.getByRole("button", { name: "Use" }) as HTMLButtonElement;

    // Then: the button remains disabled — trimmed label is empty and no emoji selected
    expect(useBtn.disabled).toBe(true);
  });

  it("closes the picker when Use is clicked with a valid selection", () => {
    // Given: the picker has an emoji selected and a label typed
    fireEvent.click(screen.getByRole("button", { name: /Custom/ }));
    fireEvent.click(screen.getByText("🌟"));
    fireEvent.change(screen.getByPlaceholderText("e.g. Energized, Calm, Grateful"), {
      target: { value: "Energized" },
    });

    // When: the user clicks Use
    fireEvent.click(screen.getByRole("button", { name: "Use" }));

    // Then: the picker closes
    expect(screen.queryByPlaceholderText("e.g. Energized, Calm, Grateful")).toBeNull();
  });

  it("closes the picker when Enter is pressed in the label input", () => {
    // Given: the picker has a label typed
    fireEvent.click(screen.getByRole("button", { name: /Custom/ }));
    fireEvent.change(screen.getByPlaceholderText("e.g. Energized, Calm, Grateful"), {
      target: { value: "Calm" },
    });

    // When: the user presses Enter
    fireEvent.keyDown(screen.getByPlaceholderText("e.g. Energized, Calm, Grateful"), { key: "Enter" });

    // Then: the picker closes
    expect(screen.queryByPlaceholderText("e.g. Energized, Calm, Grateful")).toBeNull();
  });

  it("closes the picker when a preset mood chip is clicked while it is open", () => {
    // Given: the emoji picker is open
    fireEvent.click(screen.getByRole("button", { name: /Custom/ }));
    expect(screen.getByPlaceholderText("e.g. Energized, Calm, Grateful")).toBeTruthy();

    // When: the user clicks a preset chip instead
    fireEvent.click(screen.getByRole("button", { name: /Hard/ }));

    // Then: the picker closes
    expect(screen.queryByPlaceholderText("e.g. Energized, Calm, Grateful")).toBeNull();
  });

});

// ---------------------------------------------------------------------------
// Custom mood — keyboard emoji input
// ---------------------------------------------------------------------------
describe("JournalPage custom emoji keyboard input", () => {
  it("allows typing a custom emoji that is not in the preset grid", () => {
    // Given: the picker is open
    const addJournal = vi.fn();
    storeCtx = makeStore({ journal: [], addJournal });
    render(<JournalPage />);
    fireEvent.click(screen.getByRole("button", { name: "New entry" }));
    fireEvent.change(screen.getByPlaceholderText("What happened today?"), {
      target: { value: "Party time" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Custom/ }));

    // When: the user types a custom emoji and a label
    fireEvent.change(screen.getByLabelText("Custom emoji"), {
      target: { value: "🎉" },
    });
    fireEvent.change(screen.getByPlaceholderText("e.g. Energized, Calm, Grateful"), {
      target: { value: "Celebratory" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Use" }));
    fireEvent.click(screen.getByRole("button", { name: "Save entry" }));

    // Then: the custom emoji and label are stored together
    expect(addJournal).toHaveBeenCalledWith(
      expect.objectContaining({ mood: "🎉 Celebratory" }),
    );
  });

  it("allows a keyboard-typed emoji without any label", () => {
    // Given: the picker is open
    const addJournal = vi.fn();
    storeCtx = makeStore({ journal: [], addJournal });
    render(<JournalPage />);
    fireEvent.click(screen.getByRole("button", { name: "New entry" }));
    fireEvent.change(screen.getByPlaceholderText("What happened today?"), {
      target: { value: "Big win" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Custom/ }));

    // When: the user types only a custom emoji and clicks Use
    fireEvent.change(screen.getByLabelText("Custom emoji"), {
      target: { value: "🏆" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Use" }));
    fireEvent.click(screen.getByRole("button", { name: "Save entry" }));

    // Then: just the typed emoji is stored as the mood
    expect(addJournal).toHaveBeenCalledWith(
      expect.objectContaining({ mood: "🏆" }),
    );
  });
});

// ---------------------------------------------------------------------------
// Custom mood — what gets stored in addJournal
// ---------------------------------------------------------------------------
describe("JournalPage custom mood stored value", () => {
  it("stores 'emoji label' when both an emoji and a label are provided", () => {
    // Given: the user picks an emoji and types a label
    const addJournal = vi.fn();
    storeCtx = makeStore({ journal: [], addJournal });
    render(<JournalPage />);
    fireEvent.click(screen.getByRole("button", { name: "New entry" }));
    fireEvent.change(screen.getByPlaceholderText("What happened today?"), {
      target: { value: "Inspired session" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Custom/ }));
    fireEvent.click(screen.getByText("🌟"));
    fireEvent.change(screen.getByPlaceholderText("e.g. Energized, Calm, Grateful"), {
      target: { value: "Energized" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Use" }));

    // When: the user saves
    fireEvent.click(screen.getByRole("button", { name: "Save entry" }));

    // Then: the combined 'emoji label' string is stored as the mood
    expect(addJournal).toHaveBeenCalledWith(expect.objectContaining({ mood: "🌟 Energized" }));
  });

  it("stores just the emoji when only an emoji is selected and no label is typed", () => {
    // Given: the user selects an emoji but leaves the label empty
    const addJournal = vi.fn();
    storeCtx = makeStore({ journal: [], addJournal });
    render(<JournalPage />);
    fireEvent.click(screen.getByRole("button", { name: "New entry" }));
    fireEvent.change(screen.getByPlaceholderText("What happened today?"), {
      target: { value: "Quick note" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Custom/ }));
    fireEvent.click(screen.getByText("💪"));
    fireEvent.click(screen.getByRole("button", { name: "Use" }));

    // When: the user saves
    fireEvent.click(screen.getByRole("button", { name: "Save entry" }));

    // Then: just the emoji is stored as the mood
    expect(addJournal).toHaveBeenCalledWith(expect.objectContaining({ mood: "💪" }));
  });

  it("stores just the label when only text is typed and no emoji is selected", () => {
    // Given: the user types a mood label without selecting an emoji
    const addJournal = vi.fn();
    storeCtx = makeStore({ journal: [], addJournal });
    render(<JournalPage />);
    fireEvent.click(screen.getByRole("button", { name: "New entry" }));
    fireEvent.change(screen.getByPlaceholderText("What happened today?"), {
      target: { value: "Morning walk" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Custom/ }));
    fireEvent.change(screen.getByPlaceholderText("e.g. Energized, Calm, Grateful"), {
      target: { value: "Calm and focused" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Use" }));

    // When: the user saves
    fireEvent.click(screen.getByRole("button", { name: "Save entry" }));

    // Then: the label text is stored as the mood (no leading space)
    expect(addJournal).toHaveBeenCalledWith(expect.objectContaining({ mood: "Calm and focused" }));
  });

  it("trims whitespace from the label before combining with the emoji", () => {
    // Given: the user types a padded label
    const addJournal = vi.fn();
    storeCtx = makeStore({ journal: [], addJournal });
    render(<JournalPage />);
    fireEvent.click(screen.getByRole("button", { name: "New entry" }));
    fireEvent.change(screen.getByPlaceholderText("What happened today?"), {
      target: { value: "Good morning" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Custom/ }));
    fireEvent.click(screen.getByText("😊"));
    fireEvent.change(screen.getByPlaceholderText("e.g. Energized, Calm, Grateful"), {
      target: { value: "  Happy  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Use" }));
    fireEvent.click(screen.getByRole("button", { name: "Save entry" }));

    // When: the entry is saved
    // Then: the mood is trimmed before combining
    expect(addJournal).toHaveBeenCalledWith(expect.objectContaining({ mood: "😊 Happy" }));
  });

  it("stores the preset key when a preset is chosen after a custom mood was applied", () => {
    // Given: the user applies a custom mood then changes their mind to a preset
    const addJournal = vi.fn();
    storeCtx = makeStore({ journal: [], addJournal });
    render(<JournalPage />);
    fireEvent.click(screen.getByRole("button", { name: "New entry" }));
    fireEvent.change(screen.getByPlaceholderText("What happened today?"), {
      target: { value: "Changed my mind" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Custom/ }));
    fireEvent.click(screen.getByText("🥳"));
    fireEvent.click(screen.getByRole("button", { name: "Use" }));

    // When: the user then clicks a preset mood chip
    fireEvent.click(screen.getByRole("button", { name: /Good day/ }));
    fireEvent.click(screen.getByRole("button", { name: "Save entry" }));

    // Then: the preset key ('good') is stored, not the custom emoji
    expect(addJournal).toHaveBeenCalledWith(expect.objectContaining({ mood: "good" }));
  });
});

// ---------------------------------------------------------------------------
// Picker pre-population when reopening with an existing custom mood
// ---------------------------------------------------------------------------
describe("JournalPage custom picker pre-population", () => {
  it("pre-fills the label input from an existing label-only custom mood", () => {
    // Given: a custom label-only mood is already set and the picker is reopened
    const addJournal = vi.fn();
    storeCtx = makeStore({ journal: [], addJournal });
    render(<JournalPage />);
    fireEvent.click(screen.getByRole("button", { name: "New entry" }));
    fireEvent.change(screen.getByPlaceholderText("What happened today?"), {
      target: { value: "Entry" },
    });
    // First: apply "Calm" as a label-only mood
    fireEvent.click(screen.getByRole("button", { name: /Custom/ }));
    fireEvent.change(screen.getByPlaceholderText("e.g. Energized, Calm, Grateful"), {
      target: { value: "Calm" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Use" }));

    // When: the user reopens the picker to adjust the mood
    fireEvent.click(screen.getByRole("button", { name: /Calm/ }));

    // Then: the label input is pre-filled with "Calm"
    const labelInput = screen.getByPlaceholderText("e.g. Energized, Calm, Grateful") as HTMLInputElement;
    expect(labelInput.value).toBe("Calm");
  });

  it("pre-fills emoji and label when reopening a combined emoji-label custom mood", () => {
    // Given: a combined mood "🌟 Energized" is already set and the picker is reopened
    const addJournal = vi.fn();
    storeCtx = makeStore({ journal: [], addJournal });
    render(<JournalPage />);
    fireEvent.click(screen.getByRole("button", { name: "New entry" }));
    fireEvent.change(screen.getByPlaceholderText("What happened today?"), {
      target: { value: "Entry" },
    });
    // First: apply "🌟 Energized"
    fireEvent.click(screen.getByRole("button", { name: /Custom/ }));
    fireEvent.click(screen.getByText("🌟"));
    fireEvent.change(screen.getByPlaceholderText("e.g. Energized, Calm, Grateful"), {
      target: { value: "Energized" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Use" }));

    // When: the user reopens the picker
    fireEvent.click(screen.getByRole("button", { name: /🌟 Energized/ }));

    // Then: the label input is pre-filled with "Energized"
    const labelInput = screen.getByPlaceholderText("e.g. Energized, Calm, Grateful") as HTMLInputElement;
    expect(labelInput.value).toBe("Energized");
  });
});

// ---------------------------------------------------------------------------
// Cancel
// ---------------------------------------------------------------------------
describe("JournalPage canceling the compose form", () => {
  it("restores the prompt cards and hides the form when Cancel is clicked", () => {
    // Given: the compose form is open
    storeCtx = makeStore({ journal: [] });
    render(<JournalPage />);
    fireEvent.click(screen.getByRole("button", { name: "New entry" }));

    // When: the user clicks Cancel
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    // Then: the form disappears and the prompt shortcuts return
    expect(screen.queryByPlaceholderText("What happened today?")).toBeNull();
    expect(screen.getByText("What habit felt automatic today?")).toBeTruthy();
  });

  it("does not call addJournal when the form is canceled with a partially filled title", () => {
    // Given: the user has typed a title but then cancels
    const addJournal = vi.fn();
    storeCtx = makeStore({ journal: [], addJournal });
    render(<JournalPage />);
    fireEvent.click(screen.getByRole("button", { name: "New entry" }));
    fireEvent.change(screen.getByPlaceholderText("What happened today?"), {
      target: { value: "Abandoned entry" },
    });

    // When: the user cancels
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    // Then: no journal entry is persisted
    expect(addJournal).not.toHaveBeenCalled();
  });

  it("clears the emoji picker when the form is canceled", () => {
    // Given: the emoji picker is open
    storeCtx = makeStore({ journal: [] });
    render(<JournalPage />);
    fireEvent.click(screen.getByRole("button", { name: "New entry" }));
    fireEvent.click(screen.getByRole("button", { name: /Custom/ }));
    expect(screen.getByPlaceholderText("e.g. Energized, Calm, Grateful")).toBeTruthy();

    // When: the user cancels
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    // Then: the picker is gone with the rest of the form
    expect(screen.queryByPlaceholderText("e.g. Energized, Calm, Grateful")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Editing an existing entry
// ---------------------------------------------------------------------------
describe("JournalPage editing an existing entry", () => {
  it("populates the form with the existing entry's title and body when Edit is clicked", () => {
    // Given: an existing journal entry
    storeCtx = makeStore({
      journal: [testJournalEntry({ id: "j1", title: "Original title", body: "Original body", mood: "meh" })],
    });
    render(<JournalPage />);

    // When: the user clicks Edit on the entry card
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

    // Then: the compose form is pre-filled with the entry values
    const titleInput = screen.getByPlaceholderText("What happened today?") as HTMLInputElement;
    const bodyInput = screen.getByPlaceholderText("Capture the lesson while it is fresh.") as HTMLTextAreaElement;
    expect(titleInput.value).toBe("Original title");
    expect(bodyInput.value).toBe("Original body");
  });

  it("shows 'Save changes' instead of 'Save entry' when editing", () => {
    // Given: an entry is opened for editing
    storeCtx = makeStore({ journal: [testJournalEntry({ id: "j1" })] });
    render(<JournalPage />);

    // When: Edit is clicked
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

    // Then: the save button reflects the edit context
    expect(screen.getByRole("button", { name: "Save changes" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Save entry" })).toBeNull();
  });

  it("calls updateJournal with the patched values and does not call addJournal", () => {
    // Given: an entry is loaded into the edit form and the user changes the title and mood
    const updateJournal = vi.fn();
    const addJournal = vi.fn();
    storeCtx = makeStore({
      journal: [testJournalEntry({ id: "j1", title: "Original", mood: "good" })],
      addJournal,
      updateJournal,
    });
    render(<JournalPage />);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByPlaceholderText("What happened today?"), {
      target: { value: "Updated title" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Hard/ }));

    // When: the user saves the changes
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    // Then: updateJournal is called with the correct id and patch; addJournal is not touched
    expect(updateJournal).toHaveBeenCalledWith("j1", {
      title: "Updated title",
      body: expect.any(String),
      mood: "hard",
    });
    expect(addJournal).not.toHaveBeenCalled();
  });

  it("saves a combined emoji-label mood when editing an entry", () => {
    // Given: an entry is in edit mode and the user builds a custom mood
    const updateJournal = vi.fn();
    storeCtx = makeStore({
      journal: [testJournalEntry({ id: "j1", title: "Entry to edit", mood: "good" })],
      updateJournal,
    });
    render(<JournalPage />);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.click(screen.getByRole("button", { name: /Custom/ }));
    fireEvent.click(screen.getByText("💪"));
    fireEvent.change(screen.getByPlaceholderText("e.g. Energized, Calm, Grateful"), {
      target: { value: "Motivated" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Use" }));

    // When: the user saves
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    // Then: the combined mood is forwarded to updateJournal
    expect(updateJournal).toHaveBeenCalledWith("j1", expect.objectContaining({ mood: "💪 Motivated" }));
  });

  it("closes the form after a successful edit", () => {
    // Given: an entry is edited and saved
    storeCtx = makeStore({ journal: [testJournalEntry({ id: "j1", title: "Original" })] });
    render(<JournalPage />);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByPlaceholderText("What happened today?"), {
      target: { value: "Revised" },
    });

    // When: the user clicks Save changes
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    // Then: the compose form is gone
    expect(screen.queryByPlaceholderText("What happened today?")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Entry list mood display (preset backward compat + custom text)
// ---------------------------------------------------------------------------
describe("JournalPage entry mood display", () => {
  it("shows 😄 face and 'Good day' label for a 'good' mood entry", () => {
    // Given: an entry stored with the legacy 'good' key
    storeCtx = makeStore({ journal: [testJournalEntry({ mood: "good" })] });
    render(<JournalPage />);

    // When: the page renders
    // Then: the preset emoji and label are shown in the entry card
    expect(screen.getByText("😄")).toBeTruthy();
    expect(screen.getByText(/Good day/)).toBeTruthy();
  });

  it("shows 😐 face and 'So-so' label for a 'meh' mood entry", () => {
    // Given: an entry stored with the legacy 'meh' key
    storeCtx = makeStore({ journal: [testJournalEntry({ mood: "meh" })] });
    render(<JournalPage />);

    // When: the page renders
    // Then: the preset emoji and label are shown
    expect(screen.getByText("😐")).toBeTruthy();
    expect(screen.getByText(/So-so/)).toBeTruthy();
  });

  it("shows 😕 face and 'Hard' label for a 'hard' mood entry", () => {
    // Given: an entry stored with the legacy 'hard' key
    storeCtx = makeStore({ journal: [testJournalEntry({ mood: "hard" })] });
    render(<JournalPage />);

    // When: the page renders
    // Then: the preset emoji and label are shown
    expect(screen.getByText("😕")).toBeTruthy();
    expect(screen.getByText(/Hard/)).toBeTruthy();
  });

  it("shows a combined 'emoji label' custom mood directly in the chip", () => {
    // Given: an entry whose mood was set via the two-step custom picker
    storeCtx = makeStore({ journal: [testJournalEntry({ mood: "🌟 Energized" })] });
    render(<JournalPage />);

    // When: the page renders
    // Then: the full combined string appears in the entry chip
    expect(screen.getByText("🌟 Energized")).toBeTruthy();
  });

  it("shows an emoji-only custom mood in the chip", () => {
    // Given: an entry whose mood is a single emoji (no label)
    storeCtx = makeStore({ journal: [testJournalEntry({ mood: "🥰" })] });
    render(<JournalPage />);

    // When: the page renders
    // Then: the emoji appears as-is in the chip
    expect(screen.getByText("🥰")).toBeTruthy();
  });

  it("shows a label-only custom mood in the chip", () => {
    // Given: an entry whose mood is written text with no emoji
    storeCtx = makeStore({ journal: [testJournalEntry({ mood: "Grateful" })] });
    render(<JournalPage />);

    // When: the page renders
    // Then: the text appears in the chip
    expect(screen.getByText("Grateful")).toBeTruthy();
  });

  it("shows the raw mood string for any unrecognised value without crashing", () => {
    // Given: an entry with an unknown mood key
    storeCtx = makeStore({ journal: [testJournalEntry({ mood: "unknown-value" })] });
    render(<JournalPage />);

    // When: the page renders
    // Then: the raw string is displayed — no crash
    expect(screen.getByText("unknown-value")).toBeTruthy();
  });
});
