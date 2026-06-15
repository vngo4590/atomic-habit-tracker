import { afterEach, describe, expect, it, vi } from "vitest";

import { isTurnstileEnabled, verifyTurnstileToken } from "@/lib/security/turnstile";

/** Builds a minimal fetch Response stand-in for siteverify. */
function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as unknown as Response;
}

describe("verifyTurnstileToken", () => {
  afterEach(() => {
    delete process.env.TURNSTILE_SECRET_KEY;
    vi.restoreAllMocks();
  });

  it("is a no-op that passes when Turnstile is not configured", async () => {
    // Given no secret configured and a missing token
    const fetchImpl = vi.fn();

    // When verifying
    const result = await verifyTurnstileToken(null, "1.2.3.4", { fetchImpl, secret: undefined });

    // Then it passes without ever calling Cloudflare
    expect(result).toBe(true);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("fails closed when enabled but the client sent no token", async () => {
    // Given Turnstile is configured but the form had no token
    const fetchImpl = vi.fn();

    const result = await verifyTurnstileToken("", "1.2.3.4", { fetchImpl, secret: "sk" });

    // Then it rejects without calling Cloudflare
    expect(result).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("returns true and forwards the IP when Cloudflare confirms the token", async () => {
    // Given a valid token and a configured secret
    const fetchImpl = vi.fn(async () => jsonResponse({ success: true }));

    const result = await verifyTurnstileToken("good-token", "9.9.9.9", { fetchImpl, secret: "sk" });

    // Then verification succeeds and the request carries secret/response/remoteip
    expect(result).toBe(true);
    const init = (fetchImpl.mock.calls[0] as unknown[])[1] as RequestInit;
    const body = (init.body as URLSearchParams).toString();
    expect(body).toContain("secret=sk");
    expect(body).toContain("response=good-token");
    expect(body).toContain("remoteip=9.9.9.9");
  });

  it("returns false when Cloudflare rejects the token", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ success: false, "error-codes": ["invalid-input-response"] }));

    const result = await verifyTurnstileToken("bad-token", undefined, { fetchImpl, secret: "sk" });

    expect(result).toBe(false);
  });

  it("fails closed when the siteverify API returns a non-OK status", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({}, false, 500));

    const result = await verifyTurnstileToken("token", undefined, { fetchImpl, secret: "sk" });

    expect(result).toBe(false);
  });

  it("fails closed when the fetch throws", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("network down");
    });

    const result = await verifyTurnstileToken("token", undefined, { fetchImpl, secret: "sk" });

    expect(result).toBe(false);
  });

  it("omits remoteip when the IP is the unknown sentinel", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ success: true }));

    await verifyTurnstileToken("token", "unknown", { fetchImpl, secret: "sk" });

    const init = (fetchImpl.mock.calls[0] as unknown[])[1] as RequestInit;
    const body = (init.body as URLSearchParams).toString();
    expect(body).not.toContain("remoteip");
  });
});

describe("isTurnstileEnabled", () => {
  afterEach(() => {
    delete process.env.TURNSTILE_SECRET_KEY;
  });

  it("is false without a secret and true with one", () => {
    delete process.env.TURNSTILE_SECRET_KEY;
    expect(isTurnstileEnabled()).toBe(false);

    process.env.TURNSTILE_SECRET_KEY = "sk";
    expect(isTurnstileEnabled()).toBe(true);
  });
});
