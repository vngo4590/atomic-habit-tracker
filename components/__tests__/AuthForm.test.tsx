import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/logger-client", () => ({
  clientLogger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import type { AuthFormState } from "@/lib/contracts/auth";

import { AuthForm } from "../AuthForm";

function renderForm(action: (state: AuthFormState, data: FormData) => Promise<AuthFormState>, includeName = false) {
  return render(
    <AuthForm
      action={action}
      eyebrow="Start clean"
      title="Create your account"
      submitLabel="Create account"
      includeName={includeName}
      footer={<a href="/login">Sign in</a>}
    />,
  );
}

async function submit() {
  await act(async () => {
    fireEvent.submit(screen.getByRole("button", { name: "Create account" }).closest("form")!);
  });
}

describe("AuthForm", () => {
  afterEach(cleanup);

  it("labels every field for the register flow", () => {
    // Given the register form
    renderForm(vi.fn(), true);

    // Then name, email and password are all reachable by their labels
    expect(screen.getByLabelText("Name").getAttribute("name")).toBe("name");
    expect(screen.getByLabelText("Email").getAttribute("name")).toBe("email");
    expect(screen.getByLabelText("Password").getAttribute("name")).toBe("password");
  });

  it("shows server validation errors inline on the field they belong to", async () => {
    // Given a server that rejects the password
    const action = vi.fn().mockResolvedValue({
      ok: false,
      message: "Please fix the highlighted fields.",
      errors: { password: ["Password must include a symbol."] },
    });
    renderForm(action, true);

    // When the user submits
    await submit();

    // Then the password field is marked invalid and described by the error…
    const password = screen.getByLabelText("Password");
    expect(password.getAttribute("aria-invalid")).toBe("true");
    const describedBy = password.getAttribute("aria-describedby") ?? "";
    const descriptions = describedBy
      .split(" ")
      .map((id) => document.getElementById(id)?.textContent ?? "")
      .join(" ");
    expect(descriptions).toContain("Password must include a symbol.");

    // …and the form-level message is announced as an alert
    expect(screen.getByText("Please fix the highlighted fields.").getAttribute("role")).toBe("alert");
  });

  it("keeps the user on the form when the request is rejected before reaching the server", async () => {
    // Given the proxy rate limiter answers 429, so the action call throws
    renderForm(vi.fn().mockRejectedValue(new Error("An unexpected response was received from the server.")), true);

    // When the user submits
    await submit();

    // Then a readable alert replaces the crash page
    expect(screen.getByRole("alert").textContent).toContain("couldn't reach the server");
  });
});
