import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — hoisted so they apply before the component under test imports them.
// ---------------------------------------------------------------------------

const changePasswordActionMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/actions/auth", () => ({
  changePasswordAction: changePasswordActionMock,
}));

vi.mock("@/lib/logger-client", () => ({
  clientLogger: { info: vi.fn(), error: vi.fn() },
}));

// Render framer-motion's motion.button as a plain button so jsdom can drive it.
vi.mock("framer-motion", () => ({
  motion: {
    button: (p: Record<string, unknown>) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { children, whileTap, ...props } = p;
      return <button {...props}>{children as React.ReactNode}</button>;
    },
  },
}));

import { ChangePasswordForm } from "@/app/(root)/settings/ChangePasswordForm";

afterEach(() => {
  cleanup();
  changePasswordActionMock.mockReset();
});

/**
 * Harness mirroring the Settings page wiring: a Change/Cancel toggle that
 * mounts ChangePasswordForm only while `changingPassword` is true, and unmounts
 * it on the "Done"/close path. This reproduces the exact reopen behaviour the
 * bug fix relies on (fresh mount = fresh useActionState).
 */
function Harness() {
  const [changingPassword, setChangingPassword] = useState(false);
  return (
    <div>
      <button onClick={() => setChangingPassword((open) => !open)}>
        {changingPassword ? "Cancel" : "Change"}
      </button>
      {changingPassword && <ChangePasswordForm onDone={() => setChangingPassword(false)} />}
    </div>
  );
}

describe("ChangePasswordForm reopen flow", () => {
  // Given: a user successfully changed their password once and closed the panel
  // When: they reopen the change-password panel
  // Then: a fresh empty form is shown, not the stale "Password changed." row.
  it("shows a fresh empty form when reopened after a successful change", async () => {
    changePasswordActionMock.mockResolvedValue({ ok: true, message: "" });
    render(<Harness />);

    // Open the panel for the first time.
    fireEvent.click(screen.getByRole("button", { name: "Change" }));
    expect(screen.getByText("Current password")).toBeTruthy();

    // Submit the form — the mocked action reports success.
    await act(async () => {
      fireEvent.submit(screen.getByText("Change password").closest("form")!);
    });

    // The success row appears.
    await waitFor(() => expect(screen.getByText("Password changed.")).toBeTruthy());

    // Click "Done" to close the panel (unmounts the form).
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.queryByText("Password changed.")).toBeNull();

    // Reopen the panel.
    fireEvent.click(screen.getByRole("button", { name: "Change" }));

    // A fresh empty form is shown again; the stale success row is gone.
    expect(screen.getByText("Current password")).toBeTruthy();
    expect(screen.getByText("New password")).toBeTruthy();
    expect(screen.queryByText("Password changed.")).toBeNull();
  });

  // Given: an open change-password form
  // When: it first renders
  // Then: each field has its own independent show/hide toggle.
  it("renders an independent visibility toggle for each field", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Change" }));

    // Two password fields => two "Show password" toggles.
    expect(screen.getAllByRole("button", { name: "Show password" })).toHaveLength(2);
  });
});
