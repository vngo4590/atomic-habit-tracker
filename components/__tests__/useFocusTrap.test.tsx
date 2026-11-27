import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { useFocusTrap } from "@/components/useFocusTrap";

afterEach(cleanup);

function Tour({ onClose }: { onClose: () => void }) {
  const ref = useFocusTrap<HTMLDivElement>(onClose);
  return (
    <div ref={ref} role="dialog" aria-label="Tour">
      <button type="button" autoFocus onClick={onClose}>
        Begin
      </button>
    </div>
  );
}

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Replay tour
      </button>
      {open ? <Tour onClose={() => setOpen(false)} /> : null}
    </>
  );
}

describe("useFocusTrap", () => {
  it("returns focus to the opener even when a dialog child auto-focuses", () => {
    // Given: the user focuses and activates "Replay tour"
    render(<Harness />);
    const replay = screen.getByRole("button", { name: "Replay tour" });
    replay.focus();
    fireEvent.click(replay);

    // When: the dialog opens with an auto-focused button, then Escape closes it
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Begin" }));
    fireEvent.keyDown(document, { key: "Escape" });

    // Then: the dialog is gone and focus is back on "Replay tour"
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(replay);
  });
});
