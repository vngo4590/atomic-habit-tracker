import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HuePicker } from "@/components/HuePicker";

afterEach(() => cleanup());

describe("HuePicker", () => {
  // Given: a hue value
  // When: the picker renders
  // Then: it exposes an accessible slider with the hue as its current value.
  it("renders an accessible slider reflecting the current hue", () => {
    render(<HuePicker hue={120} onChange={() => {}} ariaLabel="Custom accent hue" />);

    const slider = screen.getByRole("slider", { name: "Custom accent hue" });
    expect(slider.getAttribute("aria-valuemin")).toBe("0");
    expect(slider.getAttribute("aria-valuemax")).toBe("360");
    expect(slider.getAttribute("aria-valuenow")).toBe("120");
    // The numeric readout is visible alongside the track.
    expect(screen.getByText(/120°/)).toBeTruthy();
  });

  // Given: a focused slider
  // When: the user presses ArrowRight
  // Then: the hue advances by one and both onChange (live) and onCommit fire.
  it("increments the hue by 1 on ArrowRight and commits", () => {
    const onChange = vi.fn();
    const onCommit = vi.fn();
    render(<HuePicker hue={120} onChange={onChange} onCommit={onCommit} />);

    fireEvent.keyDown(screen.getByRole("slider"), { key: "ArrowRight" });

    expect(onChange).toHaveBeenCalledWith(121);
    expect(onCommit).toHaveBeenCalledWith(121);
  });

  // Given: a focused slider
  // When: the user presses Shift+ArrowRight
  // Then: the hue jumps by 10 (a coarse step) rather than 1.
  it("uses a coarse step of 10 when Shift is held", () => {
    const onChange = vi.fn();
    render(<HuePicker hue={120} onChange={onChange} />);

    fireEvent.keyDown(screen.getByRole("slider"), { key: "ArrowRight", shiftKey: true });

    expect(onChange).toHaveBeenCalledWith(130);
  });

  // Given: the hue sits at the minimum
  // When: the user presses ArrowLeft
  // Then: the value clamps to 0 instead of going negative.
  it("clamps at the lower bound of 0", () => {
    const onChange = vi.fn();
    render(<HuePicker hue={0} onChange={onChange} />);

    fireEvent.keyDown(screen.getByRole("slider"), { key: "ArrowLeft" });

    expect(onChange).toHaveBeenCalledWith(0);
  });

  // Given: the hue sits at the maximum
  // When: the user presses ArrowRight
  // Then: the value clamps to 360 instead of overflowing.
  it("clamps at the upper bound of 360", () => {
    const onChange = vi.fn();
    render(<HuePicker hue={360} onChange={onChange} />);

    fireEvent.keyDown(screen.getByRole("slider"), { key: "ArrowRight" });

    expect(onChange).toHaveBeenCalledWith(360);
  });

  // Given: a focused slider
  // When: the user presses Home or End
  // Then: the hue jumps straight to the spectrum's ends.
  it("jumps to the ends with Home and End", () => {
    const onChange = vi.fn();
    render(<HuePicker hue={200} onChange={onChange} />);

    const slider = screen.getByRole("slider");
    fireEvent.keyDown(slider, { key: "Home" });
    expect(onChange).toHaveBeenLastCalledWith(0);

    fireEvent.keyDown(slider, { key: "End" });
    expect(onChange).toHaveBeenLastCalledWith(360);
  });

  // Given: a focused slider
  // When: the user presses a non-navigation key
  // Then: nothing changes (the handler ignores it).
  it("ignores keys that are not navigation keys", () => {
    const onChange = vi.fn();
    const onCommit = vi.fn();
    render(<HuePicker hue={120} onChange={onChange} onCommit={onCommit} />);

    fireEvent.keyDown(screen.getByRole("slider"), { key: "a" });

    expect(onChange).not.toHaveBeenCalled();
    expect(onCommit).not.toHaveBeenCalled();
  });
});
