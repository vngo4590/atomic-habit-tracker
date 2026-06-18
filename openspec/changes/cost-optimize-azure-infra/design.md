## Context

The Atomicly dev environment on Azure currently bills ~$75–90/mo despite having zero real users. Cost drivers are sized for production-scale traffic that does not exist:

- **Azure Front Door Standard + WAF policy** (~$35/mo) — fixed base fee regardless of traffic.
- **App Service Plan B1 always-on** (~$13/mo) — Linux Basic is the floor for App Service Linux containers; no scale-to-zero option exists on this tier.
- **PostgreSQL Flexible B1ms + 32 GB** (~$15/mo) — burstable is already the cheapest, but storage is over-provisioned and autoGrow is on.
- **Log Analytics + App Insights** ($5–20/mo, variable) — four verbose App Service diagnostic categories plus Front Door access logs, no daily cap, 30-day retention.
- **ACR Basic** (~$5/mo) — image registry.

The product still requires the security floor documented in `docs/architecture/security.md`: a WAF in front of the origin, DDoS absorption at the edge, TLS termination outside the application, origin lockdown so the platform-provided hostname cannot be hit directly, and rate limiting before requests reach Node.

Stakeholder: the project owner is funding this out of pocket and has explicitly traded raw scale headroom for a low monthly floor.

## Goals / Non-Goals

**Goals:**
- Drop monthly Azure spend from ~$75–90/mo to ~$5–10/mo at zero traffic.
- Preserve every existing security control: WAF, DDoS, TLS termination, origin lockdown, rate limiting, structured logging, alerts.
- Keep every change in version-controlled Bicep and CI workflow so the cost floor is auditable.
- Phase the rollout so Phase 1 (logs + storage trims) is safe to deploy on its own and Phase 2 (Container Apps + Cloudflare) can be deferred or reverted independently.

**Non-Goals:**
- Migrating off Azure for compute and database. App Service / Container Apps and PostgreSQL Flexible Server stay.
- Closing the Postgres public-endpoint or Key Vault public-access residual risks; those belong to a separate networking change.
- Provisioning a production environment. The current change continues to target the `dev` environment.
- Adding new product features. This change is infra-and-edge only.

## Decisions

### Decision 1: Replace Azure Front Door + Azure WAF policy with Cloudflare Free

**Choice:** Use Cloudflare Free as the public edge. Configure a managed WAF rule set (free tier OWASP-equivalent), a custom rate-limit rule equivalent to the current Azure WAF rule, a "Block known scanners" rule equivalent to the current `BlockScannerUserAgents` rule, Cloudflare DNS pointing the production hostname at the App / Container App, and Authenticated Origin Pulls (mTLS) to the origin.

**Alternatives considered:**
- *Keep Azure Front Door Standard.* Reliable, integrated, but ~$35/mo fixed regardless of traffic and ~$35/mo dwarfs every other line on the bill.
- *Use Azure Front Door Premium with managed OWASP DRS.* Better security but ~$330/mo. Indefensible at zero users.
- *No edge at all; expose App Service hostname directly behind app-layer rate limiting.* Loses WAF and DDoS protection, violates the security spec.

**Why Cloudflare Free wins for this scale:**
- $0/mo base cost.
- Managed WAF rule set on the free plan covers the OWASP top-10 categories.
- Free-plan rate limiting (10k requests/mo) is more than enough at zero users.
- Authenticated Origin Pulls gives a per-request authenticity proof equivalent to `X-Azure-FDID`.
- Cloudflare publishes their egress IP ranges in a stable, machine-readable form, so an Azure NSG / App Service IP restriction can lock the origin to those ranges with the same rigor as `AzureFrontDoor.Backend`.

### Decision 2: Replace App Service B1 with Azure Container Apps (consumption plan, minReplicas: 0)

**Choice:** Wire the existing `infra/modules/containerApp.bicep` into `main.bicep`. Compute scales from 0 → maxReplicas based on HTTP request concurrency. Pull image from ACR with the existing user-assigned managed identity.

**Alternatives considered:**
- *App Service B1 (status quo).* Always-on, no scale-to-zero on Linux Basic, $13/mo floor.
- *App Service free F1.* No Linux container support, no custom domains, no always-on.
- *Azure Functions.* Wrong runtime model for a Next.js server, would force significant app rewrites.
- *Self-hosted on a VM.* Cheaper at any traffic level, but operating-cost (patching, monitoring) makes total cost-of-ownership worse for a solo project.

**Why Container Apps consumption wins:**
- Native scale-to-zero, billed per-second only when serving requests.
- Pulls from the existing ACR with a managed identity (no auth rewiring).
- Already designed-for in this repo (`containerApp.bicep` exists with `minReplicas: 0`, the original intent was to keep both options open).
- Cold start ~1–3s, acceptable for a personal-scale app.

### Decision 3: Trim observability rather than redesign it

**Choice:** Keep Log Analytics + App Insights. Drop `AppServiceConsoleLogs` and `AppServiceHTTPLogs` diagnostic categories (App Insights already captures application traces and request telemetry from the SDK). Drop retention 30 → 14 days. Add a 0.2 GB/day workspace ingestion cap. Keep all three existing alert queries (error rate spike, auth failure spike, uncaught exception).

**Alternatives considered:**
- *Self-host Loki/Grafana.* Adds operational overhead and a new compute target — net cost-negative for a solo project.
- *Remove App Insights entirely.* Loses the alert rules and request telemetry — violates "preserve every existing security control".

### Decision 4: Phase the rollout

**Phase 1 (low risk, no breaking changes):** observability trims + Postgres storage trim. Pure Bicep parameter changes, fully reversible by editing one file.

**Phase 2 (architectural, breaking for infra):** add Container Apps, swap origin from App Service to Container App, swap edge from Front Door to Cloudflare. Phase 2 ships as one atomic deploy because the origin-lockdown header changes from `X-Azure-FDID` to Cloudflare's Authenticated Origin Pulls, and we don't want a window where neither lockdown is active.

## Risks / Trade-offs

- **[Cold start latency on Container Apps]** → Mitigation: the app's existing health endpoint (`/api/healthz`) is light enough to act as a warmup probe; set `minReplicas: 0` with a Cloudflare cache rule on static assets so most browser-visible latency is masked. Document the tradeoff in `docs/architecture/security.md`.
- **[Cloudflare account is a single point of failure controlled outside Azure]** → Mitigation: store the Cloudflare zone ID and API token in Key Vault. Document a runbook that re-creates the Cloudflare config from Bicep-equivalent Terraform-or-API-script in `infra/scripts/`.
- **[Authenticated Origin Pulls misconfiguration silently leaves the origin open to direct hits]** → Mitigation: Phase 2's smoke test MUST include a direct curl to the origin's platform hostname from an external IP and assert HTTP 403; this is a CI check, not a manual step.
- **[Cloudflare Free's free-tier rate-limit ceiling (10k requests/mo on advanced rules) could become a constraint if the project grows]** → Mitigation: revisit when monthly request volume exceeds 5k; upgrading to Cloudflare Pro ($20/mo) is still cheaper than Front Door Standard.
- **[Daily Log Analytics cap could drop logs during an incident — exactly when they matter most]** → Mitigation: 0.2 GB/day is ~10x current normal traffic; set a capacity alert at 80% so an operator notices before the cap engages. The cap is a parameter, easy to raise temporarily.
- **[Postgres storage trim from 32 → 20 GB]** → only safe because current usage is well under 1 GB; abort if `pg_database_size('atomicly')` exceeds 15 GB at deploy time. Add a Bicep precondition / CI gate.

## Migration Plan

**Phase 1 (this change can land independently):**
1. Edit `infra/modules/monitoring.bicep`: add `dailyQuotaGb: 0.2` to the Log Analytics workspace, drop retention 30 → 14 days.
2. Edit `infra/modules/appService.bicep`: remove `AppServiceConsoleLogs` and `AppServiceHTTPLogs` from the diagnostic settings (keep `AppServiceAppLogs` and `AppServiceAuditLogs`).
3. Edit `infra/modules/postgres.bicep`: `storageSizeGB: 20`, `autoGrow: 'Disabled'`.
4. Validate locally with `az deployment sub what-if`. Deploy via existing CI.
5. Smoke test: confirm app still serves traffic, alerts still fire on synthetic events.

**Phase 2 (separate session, larger):**
6. Provision Cloudflare zone (manual, one-time): create account, add domain, issue scoped API token, copy zone ID.
7. Add Cloudflare token + zone ID to Key Vault and GitHub Actions secrets.
8. Wire `infra/modules/containerApp.bicep` into `main.bicep` alongside the existing App Service (both running, no traffic cut over yet).
9. Add `infra/scripts/configure-cloudflare.ps1` (or `.sh`) to apply WAF rules, rate limits, scanner-UA block, and origin DNS via the Cloudflare API. Idempotent.
10. Update `proxy.ts` and `lib/security/headers.ts` to validate Cloudflare's authenticity proof (Authenticated Origin Pulls client cert metadata exposed via the platform, OR `CF-Connecting-IP` + a rotating secret header) instead of `X-Azure-FDID`. Keep tests green.
11. Cut DNS over to Cloudflare; the new origin is the Container App.
12. Once verified for ≥7 days: remove `frontDoor.bicep`, `wafPolicy.bicep`, `appService.bicep`, `appServicePlan.bicep` from `main.bicep` and delete the resources.
13. Update `docs/architecture/security.md`, `infra/README.md`, and the `atomic-habit-security` skill.

**Rollback:**
- Phase 1: revert the Bicep edits and re-deploy. ~5 minutes.
- Phase 2 partial (before DNS cut-over): both edges coexist; cancel by leaving DNS pointed at Front Door and deleting the Container App.
- Phase 2 after DNS cut-over: re-point DNS at Front Door (TTL ≤ 300s), re-deploy `appService.bicep` and `frontDoor.bicep` from git. RTO ~15 minutes.

## Open Questions

- Should the production hostname be a Cloudflare-managed apex (e.g. `atomicly.app`) or stay on a free `*.azurecontainerapps.io` fronted by Cloudflare via a CNAME? The cheapest path is a real domain ($10/yr) because Cloudflare Free requires a domain you control; this needs the user to decide.
- Daily Log Analytics cap default: 0.2 GB/day is a guess based on no-user traffic. Revisit after 1 week of Phase-1 metrics.
- Do we want a scheduled GitHub Action that stops the Postgres server overnight (further ~30% Postgres saving)? Defer to a follow-up change; orthogonal to this proposal.
