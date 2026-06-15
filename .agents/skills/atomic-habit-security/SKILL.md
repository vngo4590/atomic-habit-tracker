---
name: atomic-habit-security
description: Source-of-truth security skill for Atomicly. Use when adding or reviewing authentication, security headers/CSP, rate limiting, CSRF protection, input validation, secret handling, or the Azure edge/WAF/origin-lockdown infrastructure. Covers the threat model, every implemented control (app + infra), where each lives, the test expectations, and the documented residual risks. Read before touching proxy.ts, lib/security/*, lib/auth/*, or infra WAF/ingress/Postgres modules.
---

# Atomicly Security

Defence-in-depth controls for Atomicly. The full rationale and threat model live
in `docs/architecture/security.md` — read it for the "why". This skill is the
quick map of **what exists, where, and how to extend it safely.**

## Golden Rules

- **Enforce request-level security in `proxy.ts`.** Next.js 16 uses `proxy.ts`,
  NOT `middleware.ts`. The existing `auth()` wrapper there is the single
  enforcement point for headers, CSP, rate limiting, and the CSRF guard. Extend
  it; never add a parallel `middleware.ts`.
- **Never weaken the CSP casually.** `script-src` uses a per-request nonce +
  `'strict-dynamic'`. `style-src` uses `'unsafe-inline'` *without* a nonce on
  purpose (Framer Motion / Tailwind emit inline `style` attributes; a style
  nonce would disable `'unsafe-inline'` and break the UI). Any new inline
  `<script>` must receive the nonce via `headers()` → `x-nonce`.
- **Auth lookups must be timing-safe.** `lib/auth/credentials.ts` always runs a
  bcrypt compare (against `DUMMY_PASSWORD_HASH` for unknown users). Do not add an
  early `return null` before the compare — it reintroduces an email-enumeration
  timing oracle.
- **Passwords are capped at 72 UTF-8 bytes** (`lib/contracts/auth.ts`) because
  bcrypt truncates beyond that. Keep the byte-length (not char-length) refine.
- **Default Front Door SKU is Standard, not Premium.** `Standard_AzureFrontDoor`
  (≈ $35/mo) keeps custom rate-limit + scanner-UA block rules but drops the
  Premium-only managed OWASP DRS + Bot Manager rule sets (gated behind
  `enableManagedRules`). The bot-scoring gap is compensated by Cloudflare
  Turnstile on auth; do not assume managed-signature WAF coverage exists unless
  the SKU is set to Premium. The WAF-policy SKU must match the Front Door SKU.
- **Turnstile is fail-safe-off, fail-closed.** `lib/security/turnstile.ts` is a
  no-op (`true`) when `TURNSTILE_SECRET_KEY` is unset (keeps dev/test keyless),
  but when configured it rejects on missing/invalid token. Never make it throw
  on the happy path or swallow a verification failure into `true`.
- **The WAF must never be bypassable.** App Service ingress is denied by default
  and allows only the `AzureFrontDoor.Backend` service tag; CI pins it to our
  Front Door instance via `X-Azure-FDID`. If you change Front Door, keep this
  lockdown intact.
- **No secrets in code, images, logs, or app settings.** Secrets live in Key
  Vault, injected via managed identity. Mask any sensitive deployment output in
  CI (`::add-mask::`) and never `echo` raw deployment outputs.

## Where Controls Live

| Concern | File(s) |
| --- | --- |
| Enforcement point (headers, CSP, rate limit, CSRF, auth redirect) | `proxy.ts` |
| Security header set + HSTS + CSP builder + nonce | `lib/security/headers.ts` |
| In-memory rate limiter + client-IP resolution | `lib/security/rate-limit.ts` |
| Rate-limit budgets + request classification + same-origin guard | `lib/security/policy.ts` |
| Nonce applied to inline no-flash script | `app/layout.tsx` |
| Disable `x-powered-by` | `next.config.ts` (`poweredByHeader: false`) |
| Password hashing + dummy hash | `lib/auth/password.ts` |
| Timing-safe credential check | `lib/auth/credentials.ts` |
| Password schema (72-byte cap) | `lib/contracts/auth.ts` |
| Per-account login throttle (exponential backoff) | `lib/security/login-throttle.ts` |
| Cloudflare Turnstile verification (server) | `lib/security/turnstile.ts` |
| Turnstile widget (client, auth form) | `components/TurnstileWidget.tsx`, `components/AuthForm.tsx` |
| Turnstile bot gate in login/register actions | `lib/actions/auth.ts` |
| WAF policy (custom scanner/UA blocks + rate limits; managed rules Premium-only) | `infra/modules/wafPolicy.bicep` |
| Front Door + WAF association + `frontDoorId` output | `infra/modules/frontDoor.bicep` |
| App Service ingress lockdown | `infra/modules/appService.bicep` |
| Postgres TLS enforcement | `infra/modules/postgres.bicep` |
| X-Azure-FDID origin pinning + output masking | `.github/workflows/ci-cd.yml` |
| Threat model + residual risks | `docs/architecture/security.md` |

## Extending Safely

- **New API route that mutates state:** it is automatically covered by the
  same-origin guard and rate limiter via `proxy.ts` classification
  (`classifyRateLimit`). If the path prefix is new, confirm it classifies as
  `api` (or `auth`) so it gets a budget.
- **New inline script in a layout/page:** read the nonce with
  `(await headers()).get("x-nonce")` and pass `nonce={nonce}`. Reading
  `headers()` forces dynamic rendering — fine, the app is auth-gated.
- **New WAF rule:** add to `customRules.rules` in `wafPolicy.bicep`.
  `rateLimitDurationInMinutes` accepts only `1` or `5` (custom `MatchRule`s have
  no such limit). Managed rule sets are Premium-only — keep them gated behind
  `enableManagedRules`. Custom rules (rate-limit + scanner/UA blocks) work on
  any SKU. Do not block generic HTTP-library UAs (curl/python-requests/
  go-http-client) — `/api/v1/*` serves programmatic/mobile clients.
- **Adding a bot challenge to a new auth-like action:** call
  `verifyTurnstileToken` server-side and reject on failure, mirroring
  `passesBotChallenge` in `lib/actions/auth.ts`. If a new page must render the
  widget, also pass `{ turnstile: true }` to `buildContentSecurityPolicy` for
  that response path so the Cloudflare host is allowed on
  `script-src`/`connect-src`/`frame-src`. Env vars:
  `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (public) + `TURNSTILE_SECRET_KEY` (server).
- **Tightening Postgres / Key Vault networking:** this is the VNet + private
  endpoint workstream (residual risk #1/#3). Do NOT remove the
  `AllowAllAzureServices` firewall rule or set Key Vault `defaultAction: Deny`
  without VNet integration first — it breaks connectivity.

## Test Expectations

Every security control is unit-tested. After any change run:

```
npm exec vitest run lib/security lib/auth lib/contracts
```

Tests live in `lib/security/__tests__/`, `lib/auth/__tests__/`, and
`lib/contracts/__tests__/auth.test.ts`. When adding a control, add a test that
asserts the **observable security outcome** (e.g. "returns 429 after N
requests", "verify is called with the dummy hash for unknown users", "CSP
contains the request nonce"), not the implementation detail.

## Validation Before Push

```
npm run typecheck && npm run lint:app && npm exec vitest run && npm run build
```

Bicep is validated in CI (`az bicep build` / `az deployment sub validate`);
assume no local `az`/`bicep` CLI. Flag Bicep changes as CI-validated only.

## Residual Risks (track, do not silently ignore)

1. Postgres public endpoint (needs VNet + private endpoint).
2. In-memory rate limiting is per-instance (backstop to the global WAF limit;
   shared store needed if scaling out beyond one worker).
3. Key Vault public network access (same VNet workstream as #1).
4. HSTS not preloaded (deliberate until a stable apex domain exists).
5. No managed-signature WAF on the default Standard SKU (set Premium to restore
   OWASP DRS + Bot Manager); mitigated by parameterised queries, Zod, CSP,
   scanner-UA blocks, and Turnstile.
6. In-memory login throttle is per-instance (backstop behind Turnstile + the WAF
   auth-rate-limit; shared store needed if scaling out).

See `docs/architecture/security.md` for the full reasoning.
