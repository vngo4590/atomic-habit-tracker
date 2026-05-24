import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ExpandableText } from "@/components/ExpandableText";

afterEach(() => cleanup());

describe("ExpandableText", () => {
  // Given: a short source string under the threshold
  // When: the component renders
  // Then: it shows the children as-is with no toggle button (transparent wrapper).
  it("renders short content without a toggle", () => {
    render(
      <ExpandableText source="hello world">
        <p>hello world</p>
      </ExpandableText>,
    );

    expect(screen.getByText("hello world")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /read more/i })).toBeNull();
  });

  // Given: a source string longer than the default character threshold
  // When: the component renders
  // Then: a "Read more" toggle appears and content starts collapsed.
  it("shows the toggle when source length exceeds the threshold", () => {
    const longText = "a".repeat(400);
    render(
      <ExpandableText source={longText}>
        <p>{longText}</p>
      </ExpandableText>,
    );

    const toggle = screen.getByRole("button", { name: /read more/i });
    expect(toggle).toBeTruthy();
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByTestId("expandable-text-body").className).toMatch(/clamped/);
  });

  // Given: a short string but with many newlines (e.g. a markdown list)
  // When: the line count exceeds previewLines + 1
  // Then: the toggle still appears so visually-tall content gets clipped.
  it("shows the toggle when line count is tall even if character count is small", () => {
    const listSource = ["- a", "- b", "- c", "- d", "- e", "- f"].join("\n");
    render(
      <ExpandableText source={listSource} previewLines={3}>
        <pre>{listSource}</pre>
      </ExpandableText>,
    );

    expect(screen.getByRole("button", { name: /read more/i })).toBeTruthy();
  });

  // Given: a long source that triggered the toggle
  // When: the user clicks "Read more"
  // Then: the toggle text switches to "Read less", aria-expanded flips to
  //       true, and the body loses the clamped class.
  it("toggles between Read more and Read less on click", () => {
    const longText = "a".repeat(400);
    render(
      <ExpandableText source={longText}>
        <p>{longText}</p>
      </ExpandableText>,
    );

    const toggle = screen.getByRole("button", { name: /read more/i });
    fireEvent.click(toggle);

    const lessToggle = screen.getByRole("button", { name: /read less/i });
    expect(lessToggle).toBeTruthy();
    expect(lessToggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByTestId("expandable-text-body").className).not.toMatch(/clamped/);

    fireEvent.click(lessToggle);
    expect(screen.getByRole("button", { name: /read more/i })).toBeTruthy();
  });

  // Given: ExpandableText nested inside a parent with its own onClick
  // When: the user clicks the toggle
  // Then: the parent handler does not fire (stopPropagation works), so the
  //       component is safe to drop inside clickable cards.
  it("stops propagation so clicking the toggle does not trigger parent handlers", () => {
    const longText = "a".repeat(400);
    let parentClicked = false;
    render(
      <div onClick={() => { parentClicked = true; }}>
        <ExpandableText source={longText}>
          <p>{longText}</p>
        </ExpandableText>
      </div>,
    );

    fireEvent.click(screen.getByRole("button", { name: /read more/i }));
    expect(parentClicked).toBe(false);
  });

  // Given: a custom previewLines value
  // When: the component renders collapsed
  // Then: the clamped body exposes that value via the CSS custom property so
  //       call sites can theme their clamp without forking the class.
  it("forwards previewLines to the CSS custom property", () => {
    const longText = "a".repeat(400);
    render(
      <ExpandableText source={longText} previewLines={2}>
        <p>{longText}</p>
      </ExpandableText>,
    );

    const body = screen.getByTestId("expandable-text-body");
    // jsdom exposes the inline style as-is; CSS custom props live there too.
    expect(body.getAttribute("style")).toMatch(/--expandable-lines:\s*2/);
  });
});
