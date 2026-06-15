/**
 * Cloudflare Turnstile — server-side bot challenge verification.
 *
 * WHAT: A free, privacy-friendly CAPTCHA alternative used on the login and
 * register flows. WHY: It is the highest-leverage, zero-cost defence against
 * automated credential stuffing and fake-account creation — the exact gap left
 * by running Front Door Standard (which lacks the Premium Bot Manager rule set).
 *
 * The widget (rendered client-side) produces a one-time token submitted with the
 * form. The server exchanges that token with Cloudflare's `siteverify` endpoint
 * here. If Turnstile is not configured (no secret key) verification is a no-op
 * that returns `true`, so local development and tests work without keys.
 */

import { logger } from "@/lib/logger";

const log = logger.child({ module: "security.turnstile" });

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Name of the hidden form field the Turnstile widget injects. */
export const TURNSTILE_FIELD = "cf-turnstile-response";

/**
 * True when Turnstile is configured (a secret key is present). When false, the
 * app skips the challenge entirely — keep both keys unset in dev/test.
 */
export function isTurnstileEnabled(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

interface VerifyDeps {
  /** Injectable fetch for testing. Defaults to the global fetch. */
  fetchImpl?: typeof fetch;
  /** Injectable secret for testing. Defaults to the env var. */
  secret?: string;
}

interface SiteVerifyResponse {
  success: boolean;
  "error-codes"?: string[];
}

/**
 * Verifies a Turnstile token against Cloudflare's siteverify API.
 *
 * @param token - the value of the `cf-turnstile-response` form field.
 * @param remoteIp - the client IP, forwarded to Cloudflare for extra signal.
 * @returns `true` if the challenge passed (or Turnstile is disabled), else `false`.
 */
export async function verifyTurnstileToken(
  token: string | null | undefined,
  remoteIp?: string,
  deps: VerifyDeps = {},
): Promise<boolean> {
  const secret = deps.secret ?? process.env.TURNSTILE_SECRET_KEY;

  // Disabled (no secret configured) → do not block. Lets dev/test run keyless.
  if (!secret) {
    return true;
  }

  // Enabled but the client sent no token → fail closed.
  if (!token) {
    log.warn("Turnstile token missing", { event: "security.turnstile.missing_token" });
    return false;
  }

  const fetchImpl = deps.fetchImpl ?? fetch;
  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp && remoteIp !== "unknown") {
    body.set("remoteip", remoteIp);
  }

  try {
    const response = await fetchImpl(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!response.ok) {
      // Network/API problem. Fail closed so a verification outage cannot be used
      // as a bypass, but log it so an operator can react.
      log.error("Turnstile siteverify returned non-OK", {
        event: "security.turnstile.api_error",
        status: response.status,
      });
      return false;
    }

    const result = (await response.json()) as SiteVerifyResponse;
    if (!result.success) {
      log.warn("Turnstile verification failed", {
        event: "security.turnstile.rejected",
        errorCodes: result["error-codes"] ?? [],
      });
    }
    return result.success === true;
  } catch (error) {
    log.error("Turnstile verification threw", {
      event: "security.turnstile.exception",
      error: error instanceof Error ? error.message : "unknown",
    });
    return false;
  }
}
