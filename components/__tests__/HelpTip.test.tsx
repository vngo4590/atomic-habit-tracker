import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HelpTip } from "@/components/HelpTip";

afterEach(() => cleanup());

describe("HelpTip", () => {
  it("hides the explanatory text until the trigger is activated", () => {
    // Given: a rendered HelpTip
    render(<HelpTip>You can have at most 3 active habits.</HelpTip>);

    // Then: the trigger is present but the help text is not yet shown
    expect(screen.getByRole("button", { name: "Help" })).toBeTruthy();
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("reveals the caller-supplied text when the trigger is clicked", () => {
    // Given: a HelpTip with explanatory content
    render(<HelpTip>Inducting a habit frees a slot.</HelpTip>);

    // When: the user activates the trigger
    fireEvent.click(screen.getByRole("button", { name: "Help" }));

    // Then: the popover text becomes visible
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.textContent).toContain("Inducting a habit frees a slot.");
  });

  it("uses a custom accessible label when provided", () => {
    // Given: a HelpTip with an overridden label
    render(<HelpTip label="Why is this disabled?">Because you are at the cap.</HelpTip>);

    // Then: the trigger exposes that accessible name
    expect(screen.getByRole("button", { name: "Why is this disabled?" })).toBeTruthy();
  });

  it("declares the trigger as type=button so it never submits a surrounding form", () => {
    // Given: a HelpTip nested inside a form with a submit spy
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <HelpTip>Help text</HelpTip>
      </form>,
    );

    // When: the trigger is clicked
    const trigger = screen.getByRole("button", { name: "Help" });
    expect(trigger.getAttribute("type")).toBe("button");
    fireEvent.click(trigger);

    // Then: the form is not submitted
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("reflects its open state via aria-expanded", () => {
    // Given: a rendered HelpTip
    render(<HelpTip>Help text</HelpTip>);
    const trigger = screen.getByRole("button", { name: "Help" });

    // Then: it starts collapsed
    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    // When: opened
    fireEvent.click(trigger);

    // Then: aria-expanded flips to true and associates the popover
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(trigger.getAttribute("aria-describedby")).toBeTruthy();
  });

  it("closes the popover when Escape is pressed", () => {
    // Given: an open HelpTip
    render(<HelpTip>Help text</HelpTip>);
    const trigger = screen.getByRole("button", { name: "Help" });
    fireEvent.click(trigger);
    expect(screen.getByRole("tooltip")).toBeTruthy();

    // When: the user presses Escape
    fireEvent.keyDown(document, { key: "Escape" });

    // Then: the popover closes
    expect(screen.queryByRole("tooltip")).toBeNull();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });
});
