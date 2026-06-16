/**
 * Security response headers and Content-Security-Policy (CSP) construction.
 *
 * WHAT: Centralises every HTTP security header the app sends, plus a builder for
 * a strict, nonce-based CSP. WHY: Defence-in-depth in the browser — these headers
 * mitigate cross-site scripting (XSS), clickjacking, MIME sniffing, referrer
 * leakage, and cross-origin data theft. Keeping them in one module means there is
 * a single source of truth that `proxy.ts` applies to every response.
 *
 * The CSP is nonce-based per the official Next.js guidance: each request gets a
 * fresh random nonce, only scripts carrying that nonce (plus the scripts they
 * load via 'strict-dynamic') may execute. Inline styles are allowed because
 * Framer Motion and Tailwind emit server-rendered inline `style` attributes.
 */

/**
 * Static headers that are identical on every response. Values are deliberately
 * conservative; loosen only with a documented reason.
 */
export const STATIC_SECURITY_HEADERS: Readonly<Record<string, string>> = {
  // Stop browsers from MIME-sniffing a response away from its declared type.
  "X-Content-Type-Options": "nosniff",
  // Belt-and-braces clickjacking defence for legacy browsers (CSP frame-ancestors
  // is the modern control). DENY: never allow the app inside a frame.
  "X-Frame-Options": "DENY",
  // Only send the origin (not the full path/query) on cross-origin navigations,
  // so URLs containing identifiers never leak to third parties.
  "Referrer-Policy": "strict-origin-when-cross-origin",
  // Disable powerful browser features the app never uses, shrinking attack surface.
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  // Isolate our browsing context so cross-origin windows cannot reference ours
  // (mitigates Spectre-style cross-origin leaks and tab-nabbing).
  "Cross-Origin-Opener-Policy": "same-origin",
  // Block other origins from embedding our resources as no-cors subresources.
  "Cross-Origin-Resource-Policy": "same-origin",
  // Don't leak that we run Next.js (also disabled in next.config, set here too
  // because proxy responses bypass that config).
  "X-DNS-Prefetch-Control": "off",
};

/**
 * HSTS tells browsers to only ever reach this site over HTTPS for two years.
 * WHY no `preload`: preload is effectively irreversible and commits every
 * subdomain; we add it only once a stable custom domain + HTTPS posture is
 * confirmed. Browsers ignore this header on plain-HTTP responses, so it is safe
 * to always send.
 */
export const STRICT_TRANSPORT_SECURITY = "max-age=63072000; includeSubDomains";

/**
 * Generates a cryptographically-random, single-use nonce. Edge/Proxy-safe:
 * uses Web Crypto + btoa rather than Node's Buffer, which is unavailable in the
 * Proxy (Edge) runtime.
 */
export function generateNonce(): string {
  return btoa(crypto.randomUUID());
}

/**
 * Builds the Content-Security-Policy header value for a single request.
 *
 * @param nonce - the per-request nonce that Next.js will stamp onto its scripts.
 * @param isDev - in development React uses `eval` for richer stack traces, so we
 *   must allow 'unsafe-eval'. It is never enabled in production builds.
 * @param options.turnstile - when true, allow Cloudflare Turnstile's script and
 *   challenge iframe. Only enabled when Turnstile is configured, so the policy
 *   stays maximally strict when the bot challenge is off.
 */
export function buildContentSecurityPolicy(
  nonce: string,
  isDev: boolean,
  options: { turnstile?: boolean } = {},
): string {
  // Cloudflare Turnstile serves its widget script and challenge iframe from this
  // origin. script-src host allow-lists are ignored by browsers that honour
  // 'strict-dynamic' (the nonce'd loader transitively trusts it), but listing it
  // helps older browsers; frame-src/connect-src are NOT governed by
  // 'strict-dynamic', so they must name the host explicitly.
  const turnstileHost = "https://challenges.cloudflare.com";
  const scriptExtra = options.turnstile ? ` ${turnstileHost}` : "";
  const frameSrc = options.turnstile ? `frame-src ${turnstileHost}` : "frame-src 'none'";
  const connectExtra = options.turnstile ? ` ${turnstileHost}` : "";

  const directives = [
    // Default to same-origin for any resource type not explicitly listed below.
    "default-src 'self'",
    // Scripts: only our nonce'd scripts and whatever they choose to load
    // ('strict-dynamic'). In modern browsers this makes host allow-lists moot,
    // which is exactly what defeats injected <script src=evil> tags.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${scriptExtra}${isDev ? " 'unsafe-eval'" : ""}`,
    // Styles: nonce is required because Next.js 16 stamps a nonce attribute on
    // every <link rel="stylesheet"> tag, and browsers check it against style-src.
    // 'unsafe-inline' is kept as a fallback for older browsers and does NOT weaken
    // modern browsers (CSP3 ignores 'unsafe-inline' when a nonce is present).
    `style-src 'self' 'nonce-${nonce}' 'unsafe-inline'`,
    // Images may be self-hosted, data URIs (icons), or blobs (generated sprites).
    "img-src 'self' blob: data:",
    // Fonts are bundled by next/font; data: covers inlined glyphs.
    "font-src 'self' data:",
    // XHR/fetch/websocket targets — the app only talks to its own origin (plus
    // Turnstile when enabled).
    `connect-src 'self'${connectExtra}`,
    // No <object>/<embed>/<applet>; these are classic injection vectors.
    "object-src 'none'",
    // Lock the document base URL so injected <base> tags cannot hijack relative URLs.
    "base-uri 'self'",
    // Forms may only post back to our own origin (anti-exfiltration).
    "form-action 'self'",
    // Nobody may frame us (clickjacking) and we frame nobody (except Turnstile).
    "frame-ancestors 'none'",
    frameSrc,
    // Transparently upgrade any stray http subresource to https.
    "upgrade-insecure-requests",
  ];

  return directives.join("; ");
}
