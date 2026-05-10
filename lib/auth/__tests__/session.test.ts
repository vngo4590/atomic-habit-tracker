import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  findAuthUserById: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
}));

vi.mock("@/auth", () => ({
  auth: mocks.auth,
}));

vi.mock("@/lib/repositories/users", () => ({
  findAuthUserById: mocks.findAuthUserById,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

describe("session helpers", () => {
  beforeEach(() => {
    mocks.auth.mockReset();
    mocks.findAuthUserById.mockReset();
    mocks.redirect.mockClear();
  });

  it("returns null when there is no authenticated session", async () => {
    mocks.auth.mockResolvedValue(null);
    const { getCurrentUser } = await import("@/lib/auth/session");

    await expect(getCurrentUser()).resolves.toBeNull();
    expect(mocks.findAuthUserById).not.toHaveBeenCalled();
  });

  it("returns null when the JWT user no longer exists in the database", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "deleted_user" } });
    mocks.findAuthUserById.mockResolvedValue(null);
    const { getCurrentUser } = await import("@/lib/auth/session");

    await expect(getCurrentUser()).resolves.toBeNull();
    expect(mocks.findAuthUserById).toHaveBeenCalledWith("deleted_user");
  });

  it("redirects stale or invalid account sessions back to login", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "deleted_user" } });
    mocks.findAuthUserById.mockResolvedValue(null);
    const { requireCurrentUser } = await import("@/lib/auth/session");

    await expect(requireCurrentUser()).rejects.toThrow("redirect:/login");
    expect(mocks.redirect).toHaveBeenCalledWith("/login");
  });
});
