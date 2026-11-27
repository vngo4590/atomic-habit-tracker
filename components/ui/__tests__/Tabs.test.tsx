import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Tab, TabList, TabPanel, Tabs } from "@/components/ui/Tabs";

afterEach(() => cleanup());

/** Three-tab fixture mirroring the Reflect hub (Journal | Review | Archive). */
function renderTabs(onValueChange?: (value: string) => void) {
  return render(
    <Tabs defaultValue="journal" onValueChange={onValueChange}>
      <TabList aria-label="Reflect">
        <Tab value="journal">Journal</Tab>
        <Tab value="review">Weekly review</Tab>
        <Tab value="archive">Archive</Tab>
      </TabList>
      <TabPanel value="journal">Journal body</TabPanel>
      <TabPanel value="review">Review body</TabPanel>
      <TabPanel value="archive">Archive body</TabPanel>
    </Tabs>,
  );
}

describe("Tabs", () => {
  // Given: a tab group with Journal selected
  // When: it renders
  // Then: only the selected tab is in the Tab order and it is wired to its panel.
  it("exposes a single tab stop wired to the visible panel", () => {
    renderTabs();

    const journal = screen.getByRole("tab", { name: "Journal" });
    const review = screen.getByRole("tab", { name: "Weekly review" });
    expect(journal.getAttribute("aria-selected")).toBe("true");
    expect(journal.tabIndex).toBe(0);
    expect(review.tabIndex).toBe(-1);

    const panel = screen.getByRole("tabpanel");
    expect(panel.textContent).toBe("Journal body");
    expect(journal.getAttribute("aria-controls")).toBe(panel.id);
    expect(panel.getAttribute("aria-labelledby")).toBe(journal.id);
  });

  // Given: focus on the first tab
  // When: the user presses ArrowRight
  // Then: focus and selection move to the next tab and its panel shows.
  it("moves focus and selection to the next tab on ArrowRight", () => {
    const onValueChange = vi.fn();
    renderTabs(onValueChange);
    const journal = screen.getByRole("tab", { name: "Journal" });
    journal.focus();

    fireEvent.keyDown(journal, { key: "ArrowRight" });

    const review = screen.getByRole("tab", { name: "Weekly review" });
    expect(document.activeElement).toBe(review);
    expect(review.getAttribute("aria-selected")).toBe("true");
    expect(review.tabIndex).toBe(0);
    expect(screen.getByRole("tabpanel").textContent).toBe("Review body");
    expect(onValueChange).toHaveBeenCalledWith("review");
  });

  // Given: focus on the first tab
  // When: the user presses ArrowLeft
  // Then: selection wraps around to the last tab.
  it("wraps from the first tab to the last on ArrowLeft", () => {
    renderTabs();
    const journal = screen.getByRole("tab", { name: "Journal" });
    journal.focus();

    fireEvent.keyDown(journal, { key: "ArrowLeft" });

    const archive = screen.getByRole("tab", { name: "Archive" });
    expect(document.activeElement).toBe(archive);
    expect(archive.getAttribute("aria-selected")).toBe("true");
  });

  // Given: focus on the first tab
  // When: the user presses End, then Home
  // Then: selection jumps to the last tab and back to the first.
  it("jumps to the last and first tabs with End and Home", () => {
    renderTabs();
    const journal = screen.getByRole("tab", { name: "Journal" });
    journal.focus();

    fireEvent.keyDown(journal, { key: "End" });
    expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Archive" }));

    fireEvent.keyDown(document.activeElement as Element, { key: "Home" });
    expect(document.activeElement).toBe(journal);
    expect(journal.getAttribute("aria-selected")).toBe("true");
  });

  // Given: a tab group
  // When: the user clicks a different tab
  // Then: that tab becomes selected and its panel is shown.
  it("selects a tab on click", () => {
    renderTabs();

    fireEvent.click(screen.getByRole("tab", { name: "Archive" }));

    expect(screen.getByRole("tab", { name: "Archive" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tabpanel").textContent).toBe("Archive body");
  });
});
