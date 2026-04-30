import { describe, expect, it } from "vitest";

import { hasSessionUser, isAuthRoute, isProtectedPath, isPublicPath, loginRedirectUrl } from "@/lib/auth/routes";

describe("auth route helpers", () => {
  it("detects auth routes and public framework assets", () => {
    expect(isAuthRoute("/login")).toBe(true);
    expect(isAuthRoute("/register")).toBe(true);
    expect(isPublicPath("/api/auth/session")).toBe(true);
    expect(isPublicPath("/_next/static/chunk.js")).toBe(true);
    expect(isPublicPath("/favicon.ico")).toBe(true);
  });

  it("protects app and API v1 product routes", () => {
    expect(isProtectedPath("/")).toBe(true);
    expect(isProtectedPath("/habits")).toBe(true);
    expect(isProtectedPath("/api/v1/habits")).toBe(true);
  });

  it("preserves callback URL for deep links with query strings", () => {
    const url = loginRedirectUrl("https://app.example.com/habits/123?tab=notes");

    expect(url.pathname).toBe("/login");
    expect(url.searchParams.get("callbackUrl")).toBe("/habits/123?tab=notes");
  });

  it("omits callbackUrl for root to avoid noisy redirects", () => {
    const url = loginRedirectUrl("https://app.example.com/");

    expect(url.pathname).toBe("/login");
    expect(url.searchParams.has("callbackUrl")).toBe(false);
  });

  it("requires a session user instead of accepting any auth wrapper object", () => {
    expect(hasSessionUser(null)).toBe(false);
    expect(hasSessionUser({})).toBe(false);
    expect(hasSessionUser({ user: null })).toBe(false);
    expect(hasSessionUser({ user: { id: "user_1" } })).toBe(true);
  });
});
