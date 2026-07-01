# Security Architecture

This document describes the defence-in-depth controls protecting Atomicly, the
threat model they address, and the residual risks that remain. It is the source
of truth for "why is this security control here?" questions.

## Threat Model

Atomicly is an authenticated, multi-user web app. The assets worth protecting:

- **User credentials** (email + password hashes).
- **User session integrity** (JWT cookies — preventing hijack/forgery).
- **User-owned data** (habits, journal entries, identity votes, pets).
- **Service availability** (resisting volumetric and application-layer floods).

Primary adversaries and attacks we defend against:

| Threat | Control(s) |
| --- | --- |
| Credential stuffing / brute force | Edge WAF rate limit + app rate limit + bcrypt cost |
| Email enumeration via timing | Timing-safe dummy bcrypt compare |
| Password truncation collisions | UTF-8 72-byte cap before bcrypt |
| Cross-site scripting (XSS) | Strict nonce-based CSP |
| Cross-site request forgery (CSRF) | Auth.js built-ins + same-origin guard in proxy |
| Clickjacking | `frame-ancestors 'none'` + `X-Frame-Options: DENY` |
| SQLi / RCE / path traversal | Prisma parameterised queries + Zod validation (+ OWASP WAF rules on Premium) |
| Bots / scrapers | Cloudflare Turnstile on auth + scanner-UA WAF block rules (+ Bot Manager on Premium) |
| Volumetric DDoS (L3/L4) | Front Door global edge absorption |
| Application DDoS (L7) | WAF rate-limit rules + app rate limiter |
| Targeted credential brute force | Per-account exponential-backoff login throttle |
| WAF bypass via direct origin hit | App Service ingress locked to our Front Door |
| Plaintext data interception | HTTPS-only + HSTS + Postgres `require_secure_transport` |
| Info leakage | `x-powered-by` disabled, deployment outputs masked in CI |

## App-Layer Controls

All app-layer controls are enforced in `proxy.ts` (Next.js 16 uses `proxy.ts`,
not `middleware.ts`) and the auth modules. They are unit-tested under
`lib/security/__tests__/` and `lib/auth/__tests__/`.

### Security headers (`lib/security/headers.ts`)

Applied to every response:

- **Content-Security-Policy** — per-request nonce on `script-src` plus
  `'strict-dynamic'`; `style-src 'unsafe-inline'` (required by Framer Motion /
  Tailwind server-rendered inline styles — a nonce there would *disable*
  `'unsafe-inline'`); `frame-ancestors 'none'`; `object-src 'none'`;
  `base-uri 'self'`. `'unsafe-eval'` is added only in development.
  The nonce is generated per request, stamped onto the request header
  (`x-nonce`) so Server Components can read it via `headers()`, and onto the
  response CSP header. `app/layout.tsx` reads the nonce and applies it to the
  inline no-flash theme `<script>`.
- **Strict-Transport-Security** — `max-age=63072000; includeSubDomains`
  (no `preload`; opt into the preload list deliberately, not by accident).
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Permitted-Cross-Domain-Policies: none`
- A restrictive `Permissions-Policy`.

### Rate limiting (`lib/security/rate-limit.ts`, `lib/security/policy.ts`)

Two in-memory fixed-window limiters keyed by client IP:

- **Auth endpoints** (`/api/auth/*`, `/login`, `/register`): 10 requests / 5 min.
- **API endpoints** (`/api/*`): 100 requests / minute.

Exceeding the budget returns `429` with a `Retry-After` header. Client IP is
resolved from `x-azure-clientip` (Front Door), then `x-forwarded-for`, then
`x-real-ip`. This is a **second line of defence** behind the WAF rate limit; see
residual risks for the single-instance caveat.

### CSRF / same-origin guard (`lib/security/policy.ts`)

State-changing requests (`POST`/`PUT`/`PATCH`/`DELETE`) to API routes must have
an `Origin` that matches the `Host`. Auth.js already protects its own routes;
this guard covers the cookie-authenticated `/api/v1/*` routes. Non-browser
clients that omit `Origin` are allowed (they are not subject to ambient-cookie
CSRF).

### Authentication hardening

- **Password hashing:** `bcryptjs` (`lib/auth/password.ts`).
- **Timing-safe lookup:** `lib/auth/credentials.ts` always runs a bcrypt compare
  — against `DUMMY_PASSWORD_HASH` for unknown/passwordless users — so response
  time does not reveal whether an email exists (email-enumeration defence).
- **72-byte cap:** `lib/contracts/auth.ts` rejects passwords whose UTF-8 byte
  length exceeds 72, because bcrypt silently truncates beyond 72 bytes (longer
  passwords would otherwise share a hash prefix).
- **Per-account login throttle:** `lib/security/login-throttle.ts` applies
  exponential backoff (30s → 1m → 2m … capped at 15 min) after repeated failed
  logins for a **real** account, decaying after 30 min of no failures.
  `lib/auth/credentials.ts` checks the lock *before* the DB lookup and records a
  failure only when a known account is given the wrong password. This means an
  attacker cannot (a) enumerate accounts via lock state, nor (b) lock out
  arbitrary unknown emails. Progressive backoff (vs a hard lock) bounds the
  lock-out-the-victim DoS. State is in-memory/per-instance (same caveat as the
  rate limiter).
- **Session revocation gate:** `isSessionRevoked` (`lib/auth/session-policy.ts`)
- **Session revocation gate:** `isSessionRevoked` (`lib/auth/session-policy.ts`)
  rejects any JWT whose issue time (`authTime`) is strictly **before** the user's
  revocation cutoff (`sessionsValidFrom`). "Sign out everywhere"
  (`signOutEverywhereAction`) advances the cutoff to **now**, which revokes
  **all** devices — including the current one — by design. A **self-service
  password change** (`changePasswordAction`) instead sets the cutoff to the
  **current device's own `authTime`** (read via `getCurrentSession()`). Because
  the gate uses a strict `<`, the initiating device (`authTime == cutoff`)
  survives on its **existing** cookie — no cookie is re-issued — so the user can
  change their password repeatedly in-session, and every session minted **before**
  this device's login is revoked. Not re-issuing a cookie is what makes this
  **race-free**: an earlier implementation bumped the cutoff to `now` and
  re-minted the current cookie (via next-auth's `unstable_update`), but on a real
  HTTPS deployment that fresh cookie lost a propagation race against the immediate
  post-action RSC revalidation and stranded the current device on `/login`.
  **Accepted trade-off:** anchoring the cutoff to the current `authTime` means an
  **other** device that logged in *more recently* than the initiating device
  (a newer `authTime`) is **not** revoked. Fully revoking those too would require
  either the racy cookie re-issue above or a richer per-session identifier
  (stamp a stable `sid` into the JWT, mark it exempt, and set the cutoff to `now`)
  — a token + Prisma-migration change we deliberately deferred. For full
  revocation of all devices use "Sign out everywhere" first. The user-facing
  copy reflects this honestly ("You're still signed in on this device") rather
  than claiming all other devices were signed out.

### Bot challenge — Cloudflare Turnstile (`lib/security/turnstile.ts`, `components/TurnstileWidget.tsx`)

A free, privacy-friendly CAPTCHA alternative gating login and registration —
the compensating control for the lack of Front Door **Bot Manager** on the
Standard SKU.

- `loginAction` / `registerAction` (`lib/actions/auth.ts`) call
  `verifyTurnstileToken` server-side and reject with "Bot verification failed"
  when the challenge token is missing or invalid.
- **Fail-safe-off:** with no `TURNSTILE_SECRET_KEY` set, verification is a no-op
  that returns `true`, so local/dev/test work keyless. When a secret *is*
  configured, verification **fails closed** (a missing token, non-OK response,
  or fetch error all reject).
- The widget (`<TurnstileWidget />` in `components/AuthForm.tsx`) renders only
  when `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set.
- **CSP coupling:** `buildContentSecurityPolicy(nonce, isDev, { turnstile })`
  widens the policy to allow `https://challenges.cloudflare.com` on
  `script-src`/`connect-src`/`frame-src` **only** when Turnstile is enabled, so
  the CSP stays maximally strict in keyless deployments. (`'strict-dynamic'`
  already covers the nonce-loaded script transitively, but `frame-src` and
  `connect-src` are not governed by it, so Cloudflare's host is named there.)

## Infrastructure Controls (Azure Bicep)

### Azure Front Door + WAF (`infra/modules/frontDoor.bicep`, `wafPolicy.bicep`)

The outermost shield, running at the Microsoft global edge before traffic
reaches the origin:

- **Network DDoS (L3/L4):** absorbed by the Front Door anycast edge.
- **WAF rate limiting (custom rules):** strict auth-endpoint limit
  (40 req / 5 min / IP) + global limit (600 req / min / IP).
- **Custom scanner-block rules (any SKU):** `blockScannerUserAgents` blocks
  offensive-security tool User-Agents (sqlmap, nikto, nmap, masscan, nessus,
  dirbuster, gobuster, wpscan, acunetix, havij, fimap, zmeu, jorgee, netsparker,
  w3af) and `blockEmptyUserAgent` blocks requests with no User-Agent. Generic
  HTTP-library UAs (curl, python-requests, go-http-client) are **deliberately
  not** blocked because `/api/v1/*` is a versioned API for programmatic/mobile
  callers.
- **OWASP managed rules (Premium only):** Default Rule Set (DRS) 2.1 in Block
  mode — SQLi, XSS, RCE, path traversal, etc.
- **Bot Manager rule set (Premium only):** classifies and blocks bad bots.

> **SKU tradeoff — default is Standard.** The default `frontDoorSku` is
> `Standard_AzureFrontDoor` (≈ $35/mo) rather than `Premium_AzureFrontDoor`
> (≈ $330/mo). The Bicep derives `enableManagedRules` from the SKU, so Standard
> keeps custom rate-limit + scanner-block rules and drops the **managed** OWASP
> DRS and Bot Manager rule sets. Those managed rules are largely redundant given
> Prisma parameterised queries + Zod validation + strict CSP; the real loss is
> Bot Manager's scoring, which we compensate for with **Cloudflare Turnstile**
> on the auth endpoints. The remaining residual gap is managed-signature /
> zero-day WAF coverage (see Residual Risks). Set `frontDoorSku` to
> `Premium_AzureFrontDoor` to re-enable managed rules where the spend is
> justified (the WAF-policy SKU follows the same param and must match).

### Origin lockdown (`infra/modules/appService.bicep` + CI)

A WAF is worthless if attackers can hit the origin directly. Two layers:

1. **Bicep:** `ipSecurityRestrictionsDefaultAction: 'Deny'` + an allow rule for
   only the `AzureFrontDoor.Backend` service tag. `scmIpSecurityRestrictionsUseMain`
   extends this to the SCM/Kudu site.
2. **CI (`.github/workflows/ci-cd.yml`):** a post-deploy step adds an
   `X-Azure-FDID` header restriction pinning ingress to **our specific** Front
   Door instance (not just any Azure Front Door). This is done in CI rather than
   Bicep because the Front Door ID is only known after the Front Door exists
   (avoids a circular dependency). The Front Door ID is exported as a deployment
   output and masked in logs.

### Transport encryption

- App Service: `httpsOnly`, TLS 1.2 minimum, FTPS disabled.
- Postgres: `require_secure_transport = ON` set explicitly
  (`infra/modules/postgres.bicep`); the app connects with `sslmode=require`.

### Secret management

- Secrets (`DATABASE_URL`, `AUTH_SECRET`, Postgres admin password) live in Key
  Vault and are injected at runtime via the App Service system-assigned managed
  identity. No secrets in the image or app settings.
- ACR has the admin user and anonymous pull disabled.
- CI uses Azure OIDC federated credentials (no long-lived cloud secrets in
  GitHub).

## Residual Risks & Follow-ups

These are known gaps, deliberately deferred because they cannot be safely
implemented/validated without a live deployment or because they are large
changes. Track them as hardening follow-ups.

1. **Postgres public endpoint.** The server still has a public endpoint gated by
   the `AllowAllAzureServices` firewall rule (required for App Service → DB over
   the public endpoint without VNet integration). The hardened end-state is VNet
   integration + a private endpoint (the networking module already provisions a
   delegated Postgres subnet). Removing the rule before that is in place would
   break connectivity.
2. **In-memory rate limiting.** `lib/security/rate-limit.ts` state is per
   instance and resets on restart. It is correct for a single App Service worker
   (the current configuration: `numberOfWorkers: 1`) and is a *backstop* to the
   WAF rate limit, which is global. Scaling out requires a shared store (e.g.
   Redis) for accurate app-layer limits.
3. **Key Vault public network access.** `networkAcls.defaultAction: Allow` is
   kept so the App Service can reach it over its public outbound path.
   Tightening to a private endpoint is the same VNet workstream as #1.
4. **HSTS preload.** Intentionally not preloaded; revisit once a stable apex
   custom domain is in place.
5. **No managed-signature WAF on Standard SKU.** The default Standard Front Door
   omits the OWASP DRS managed rules, so there is no signature-based / zero-day
   WAF coverage at the edge. This is mitigated in depth (parameterised queries,
   Zod validation, strict CSP, scanner-UA block rules) but not equivalent. Set
   `frontDoorSku: 'Premium_AzureFrontDoor'` to restore it where justified.
6. **Turnstile vs Bot Manager.** Turnstile challenges only the auth endpoints,
   not all traffic, and provides weaker continuous bot scoring than Front Door
   Bot Manager. It requires `NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY`
   to be set in the environment; when unset it is a no-op (fail-safe-off).
7. **In-memory login throttle.** Like the rate limiter, `login-throttle.ts`
   state is per instance and resets on restart — correct for `numberOfWorkers: 1`
   and a backstop behind Turnstile + the WAF auth-rate-limit. Scaling out needs a
   shared store.

## Validation

- App-layer controls: `npm exec vitest run lib/security lib/auth lib/contracts`.
- Full gate: `npm run typecheck && npm run lint:app && npm exec vitest run && npm run build`.
- Bicep: validated in CI (`az bicep build` / `az deployment sub validate`); no
  local `az`/`bicep` CLI is assumed.
