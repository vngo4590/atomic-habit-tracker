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
| SQLi / RCE / path traversal | Prisma parameterised queries + OWASP WAF rules |
| Bots / scrapers | Front Door Bot Manager rule set |
| Volumetric DDoS (L3/L4) | Front Door global edge absorption |
| Application DDoS (L7) | WAF rate-limit rules + app rate limiter |
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

## Infrastructure Controls (Azure Bicep)

### Azure Front Door + WAF (`infra/modules/frontDoor.bicep`, `wafPolicy.bicep`)

The outermost shield, running at the Microsoft global edge before traffic
reaches the origin:

- **Network DDoS (L3/L4):** absorbed by the Front Door anycast edge.
- **WAF rate limiting (custom rules):** strict auth-endpoint limit
  (40 req / 5 min / IP) + global limit (600 req / min / IP).
- **OWASP managed rules:** Default Rule Set (DRS) 2.1 in Block mode — SQLi, XSS,
  RCE, path traversal, etc.
- **Bot Manager rule set:** classifies and blocks bad bots.

> **SKU tradeoff:** OWASP + Bot Manager managed rule sets are **Premium-only**.
> The default `frontDoorSku` is `Premium_AzureFrontDoor` (≈ $330/mo) to satisfy
> the "extremely safe" requirement. Deploying `Standard_AzureFrontDoor`
> (≈ $35/mo) is still valid — the Bicep derives `enableManagedRules` from the
> SKU, so a Standard deployment keeps custom rate-limit rules but drops managed
> rules. Choose per environment: Standard is acceptable for dev/preview.

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

## Validation

- App-layer controls: `npm exec vitest run lib/security lib/auth lib/contracts`.
- Full gate: `npm run typecheck && npm run lint:app && npm exec vitest run && npm run build`.
- Bicep: validated in CI (`az bicep build` / `az deployment sub validate`); no
  local `az`/`bicep` CLI is assumed.
