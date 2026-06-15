"use client";

import Script from "next/script";

/**
 * Cloudflare Turnstile widget — the client half of the bot challenge.
 *
 * Renders nothing unless `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is configured, so local
 * development and tests (which have no key) behave exactly as before. When a key
 * is present, Turnstile's script renders a challenge and injects a hidden
 * `cf-turnstile-response` field into the enclosing <form>; the server action then
 * verifies that token via `lib/security/turnstile.ts`.
 */
export function TurnstileWidget() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (!siteKey) {
    return null;
  }

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
        async
        defer
      />
      {/* `cf-turnstile` is the global class Turnstile's script looks for. */}
      <div className="cf-turnstile" data-sitekey={siteKey} data-theme="auto" />
    </>
  );
}
