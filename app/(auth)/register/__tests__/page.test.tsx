import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — must be hoisted so they apply before the module under test imports.
// ---------------------------------------------------------------------------

const redirectMock = vi.hoisted(() => vi.fn());
const authMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/actions/auth", () => ({
  registerAction: vi.fn(),
}));

// Import the component *after* mocks are registered.
import RegisterPage from "@/app/(auth)/register/page";

afterEach(() => {
  cleanup();
  redirectMock.mockClear();
  authMock.mockClear();
});

describe("RegisterPage", () => {
  // -------------------------------------------------------------------------
  // Authenticated users should be redirected away from the register page.
  // -------------------------------------------------------------------------
  it("redirects an authenticated user to / when no callbackUrl is provided", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", name: "Alex" } });

    await RegisterPage({ searchParams: Promise.resolve({}) });

    expect(redirectMock).toHaveBeenCalledTimes(1);
    expect(redirectMock).toHaveBeenCalledWith("/");
  });

  it("redirects an authenticated user to the provided callbackUrl", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", name: "Alex" } });

    await RegisterPage({
      searchParams: Promise.resolve({ callbackUrl: "/habits" }),
    });

    expect(redirectMock).toHaveBeenCalledTimes(1);
    expect(redirectMock).toHaveBeenCalledWith("/habits");
  });

  // -------------------------------------------------------------------------
  // Open-redirect protection: external URLs must be ignored.
  // -------------------------------------------------------------------------
  it("redirects to / when callbackUrl is an external URL", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", name: "Alex" } });

    await RegisterPage({
      searchParams: Promise.resolve({ callbackUrl: "https://evil.com" }),
    });

    expect(redirectMock).toHaveBeenCalledTimes(1);
    expect(redirectMock).toHaveBeenCalledWith("/");
  });

  it("redirects to / when callbackUrl is a protocol-relative URL", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", name: "Alex" } });

    await RegisterPage({
      searchParams: Promise.resolve({ callbackUrl: "//evil.com" }),
    });

    expect(redirectMock).toHaveBeenCalledTimes(1);
    expect(redirectMock).toHaveBeenCalledWith("/");
  });

  // -------------------------------------------------------------------------
  // Unauthenticated users should see the registration form.
  // -------------------------------------------------------------------------
  it("renders the registration form for an unauthenticated user", async () => {
    authMock.mockResolvedValue(null);

    const jsx = await RegisterPage({ searchParams: Promise.resolve({}) });
    render(jsx);

    // Then: the registration form is visible and redirect was NOT called.
    expect(redirectMock).not.toHaveBeenCalled();
    expect(screen.getByText("Create your account")).toBeTruthy();
    expect(screen.getByText("Start clean")).toBeTruthy();
    expect(screen.getByRole("button", { name: /create account/i })).toBeTruthy();
  });

  it("renders the registration form when auth returns a session without a user", async () => {
    authMock.mockResolvedValue({ user: null });

    const jsx = await RegisterPage({ searchParams: Promise.resolve({}) });
    render(jsx);

    expect(redirectMock).not.toHaveBeenCalled();
    expect(screen.getByText("Create your account")).toBeTruthy();
  });
});
