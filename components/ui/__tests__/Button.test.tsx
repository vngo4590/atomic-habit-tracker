import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Plus } from "lucide-react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";

afterEach(() => cleanup());

describe("Button", () => {
  // Given: a primary button
  // When: the user clicks it
  // Then: the click handler runs and it defaults to type="button" (no accidental form submit).
  it("defaults to type=button and fires onClick", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);

    const button = screen.getByRole("button", { name: "Save" });
    fireEvent.click(button);

    expect(button.getAttribute("type")).toBe("button");
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  // Given: a button in its loading state
  // When: the user tries to click it
  // Then: it is disabled, announces aria-busy and the handler does not run.
  it("disables the button and sets aria-busy while loading", () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Save
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Save" });
    fireEvent.click(button);

    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(onClick).not.toHaveBeenCalled();
  });

  // Given: a button that is not loading
  // When: it renders
  // Then: aria-busy is absent so assistive tech doesn't report pending work.
  it("omits aria-busy when idle", () => {
    render(<Button>Save</Button>);

    expect(screen.getByRole("button", { name: "Save" }).getAttribute("aria-busy")).toBeNull();
  });

  // Given: a button with an href
  // When: it renders
  // Then: it is a real link to that URL, not a <button>.
  it("renders a link when given href", () => {
    render(<Button href="/habits/new">New habit</Button>);

    const link = screen.getByRole("link", { name: "New habit" });
    expect(link.getAttribute("href")).toBe("/habits/new");
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("IconButton", () => {
  // Given: an icon-only button
  // When: it renders
  // Then: its accessible name comes from aria-label and the icon is hidden from AT.
  it("is named by its aria-label", () => {
    const { container } = render(<IconButton aria-label="Add habit" icon={<Plus />} />);

    const button = screen.getByRole("button", { name: "Add habit" });
    expect(button.getAttribute("type")).toBe("button");
    expect(container.querySelector("svg")?.closest("[aria-hidden='true']")).not.toBeNull();
  });

  // Given: an icon button with an href
  // When: it renders
  // Then: it is a labelled link.
  it("renders a labelled link when given href", () => {
    render(<IconButton href="/settings" aria-label="Settings" icon={<Plus />} />);

    expect(screen.getByRole("link", { name: "Settings" }).getAttribute("href")).toBe("/settings");
  });
});
