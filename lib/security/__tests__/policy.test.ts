import { describe, expect, it } from "vitest";

import { classifyRateLimit, isAllowedCrossOrigin } from "@/lib/security/policy";

describe("classifyRateLimit", () => {
  it("throttles POSTs to the auth surface with the strict bucket", () => {
    // Given POSTs to the credential callback and the auth forms
    expect(classifyRateLimit("/api/auth/callback/credentials", "POST")).toBe("auth");
    expect(classifyRateLimit("/login", "POST")).toBe("auth");
    expect(classifyRateLimit("/register", "post")).toBe("auth");
  });

  it("does not throttle GETs to the auth surface", () => {
    // Given a GET to the login page (just rendering the form)
    expect(classifyRateLimit("/login", "GET")).toBeNull();
  });

  it("throttles the versioned API surface with the api bucket", () => {
    // Given any method against /api/v1
    expect(classifyRateLimit("/api/v1/habits", "GET")).toBe("api");
    expect(classifyRateLimit("/api/v1/habits", "POST")).toBe("api");
  });

  it("leaves ordinary page navigations unthrottled", () => {
    // Given a normal page request
    expect(classifyRateLimit("/", "GET")).toBeNull();
    expect(classifyRateLimit("/pet", "GET")).toBeNull();
  });
});

describe("isAllowedCrossOrigin", () => {
  it("allows safe methods regardless of origin", () => {
    // Given a cross-origin GET (reads are not CSRF-sensitive)
    expect(isAllowedCrossOrigin("GET", "/api/v1/habits", "https://evil.com", "app.test")).toBe(
      true,
    );
  });

  it("allows unsafe requests with no Origin header (non-browser clients)", () => {
    // Given a native/mobile POST that omits Origin
    expect(isAllowedCrossOrigin("POST", "/api/v1/habits", null, "app.test")).toBe(true);
  });

  it("allows same-origin unsafe requests", () => {
    // Given a browser POST whose Origin matches the host
    expect(
      isAllowedCrossOrigin("POST", "/api/v1/habits", "https://app.test", "app.test"),
    ).toBe(true);
  });

  it("rejects cross-origin unsafe requests to the API", () => {
    // Given a browser POST from a different site (classic CSRF)
    expect(
      isAllowedCrossOrigin("POST", "/api/v1/habits", "https://evil.com", "app.test"),
    ).toBe(false);
  });

  it("rejects a malformed Origin header", () => {
    // Given a hostile/garbage Origin value
    expect(isAllowedCrossOrigin("POST", "/api/v1/habits", "not a url", "app.test")).toBe(false);
  });

  it("ignores non-API paths", () => {
    // Given an unsafe request to a non-API path (handled elsewhere)
    expect(isAllowedCrossOrigin("POST", "/login", "https://evil.com", "app.test")).toBe(true);
  });
});
