import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — must be hoisted so they apply before the module under test imports.
// ---------------------------------------------------------------------------

const redirectMock = vi.hoisted(() => vi.fn());
const getCurrentUserMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: getCurrentUserMock,
}));

vi.mock("@/lib/actions/auth", () => ({
  loginAction: vi.fn(),
}));

// Import the component *after* mocks are registered.
import LoginPage from "@/app/(auth)/login/page";

afterEach(() => {
  cleanup();
  redirectMock.mockClear();
  getCurrentUserMock.mockClear();
});

describe("LoginPage", () => {
  // -------------------------------------------------------------------------
  // Authenticated users should be redirected away from the login page.
  // -------------------------------------------------------------------------
  it("redirects an authenticated user to / when no callbackUrl is provided", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "u1", name: "Alex", email: "a@b.com", image: null, passwordHash: "hash" });

    await LoginPage({ searchParams: Promise.resolve({}) });

    expect(redirectMock).toHaveBeenCalledTimes(1);
    expect(redirectMock).toHaveBeenCalledWith("/");
  });

  it("redirects an authenticated user to the provided callbackUrl", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "u1", name: "Alex", email: "a@b.com", image: null, passwordHash: "hash" });

    await LoginPage({ searchParams: Promise.resolve({ callbackUrl: "/journal" }) });

    expect(redirectMock).toHaveBeenCalledTimes(1);
    expect(redirectMock).toHaveBeenCalledWith("/journal");
  });

  // -------------------------------------------------------------------------
  // Open-redirect protection: external URLs must be ignored.
  // -------------------------------------------------------------------------
  it("redirects to / when callbackUrl is an external URL", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "u1", name: "Alex", email: "a@b.com", image: null, passwordHash: "hash" });

    await LoginPage({
      searchParams: Promise.resolve({ callbackUrl: "https://evil.com" }),
    });

    expect(redirectMock).toHaveBeenCalledTimes(1);
    expect(redirectMock).toHaveBeenCalledWith("/");
  });

  it("redirects to / when callbackUrl is a protocol-relative URL", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "u1", name: "Alex", email: "a@b.com", image: null, passwordHash: "hash" });

    await LoginPage({
      searchParams: Promise.resolve({ callbackUrl: "//evil.com" }),
    });

    expect(redirectMock).toHaveBeenCalledTimes(1);
    expect(redirectMock).toHaveBeenCalledWith("/");
  });

  // -------------------------------------------------------------------------
  // Unauthenticated users should see the login form.
  // -------------------------------------------------------------------------
  it("renders the login form for an unauthenticated user", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    const jsx = await LoginPage({ searchParams: Promise.resolve({}) });
    render(jsx);

    // Then: the login form is visible and redirect was NOT called.
    expect(redirectMock).not.toHaveBeenCalled();
    expect(screen.getByText("Sign in to Atomicly")).toBeTruthy();
    expect(screen.getByText("Welcome back")).toBeTruthy();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeTruthy();
    // And: the password field exposes its show/hide visibility toggle.
    expect(screen.getByRole("button", { name: "Show password" })).toBeTruthy();
  });

  it("renders the login form when auth returns a session without a user", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    const jsx = await LoginPage({ searchParams: Promise.resolve({}) });
    render(jsx);

    expect(redirectMock).not.toHaveBeenCalled();
    expect(screen.getByText("Sign in to Atomicly")).toBeTruthy();
  });
});
