## 1. Phase 1 — Observability and Postgres trim (low risk, can ship alone)

- [x] 1.1 Branch: `chore/cost-optimize-phase-1`
- [x] 1.2 In `infra/modules/monitoring.bicep`, set `retentionInDays: 14` on the Log Analytics workspace and add `workspaceCapping: { dailyQuotaGb: json('0.2') }`. Add a parameter `logDailyQuotaGb` with default `0.2` so the cap is reviewable in `main.bicep`.
- [x] 1.3 In `infra/modules/appService.bicep`, remove the `AppServiceConsoleLogs` and `AppServiceHTTPLogs` entries from the `appServiceDiagnostics` `logs` array. Keep `AppServiceAppLogs` and `AppServiceAuditLogs`.
- [x] 1.4 In `infra/modules/postgres.bicep`, change `storageSizeGB: 32` → `storageSizeGB: 20` and `autoGrow: 'Enabled'` → `autoGrow: 'Disabled'`. Add a parameter so the value is reviewable in `main.bicep`. **NOTE discovered during implementation:** Azure Postgres Flexible Server storage can only grow in-place; the existing 32 GB dev server will not shrink to 20 GB via Bicep deploy. The 20 GB default applies to fresh deploys only. To actually reclaim storage on the existing server, dump → recreate server at 20 GB → restore (tracked as follow-up task 1.4a).
- [ ] 1.4a (Follow-up) Reclaim Postgres storage on the existing dev server by `pg_dump` → delete server → re-deploy Bicep (which now defaults to 20 GB) → `pg_restore`. Saves ~$1.50/mo. Only worth doing during a planned dev-env reset because it incurs ~5 min of downtime.
- [x] 1.5 Compile + lint Bicep locally: `az bicep build --file infra/main.bicep`. Fix any warnings introduced.
- [ ] 1.6 Run `az deployment sub what-if` against the dev subscription, paste the diff into the PR description. Confirm only the four expected resources are touched. **(Deferred — requires logged-in Azure CLI; run before deploy.)**
- [ ] 1.7 Add a CI step to `.github/workflows/ci-cd.yml` that runs the what-if and fails if any storage tier, SKU, or retention parameter is increased without an `[infra:approved]` label on the PR. **(Deferred to follow-up — optional hardening.)**
- [ ] 1.8 Deploy to dev via existing CI. Confirm in Azure Portal: workspace retention is 14d, daily cap is 0.2 GB, App Service diagnostics no longer lists the two dropped categories, Postgres storage is 20 GB with autoGrow off. **(User-driven — runs in CI after merge.)**
- [ ] 1.9 Smoke test: `curl https://<front-door-host>/api/healthz` returns 200; trigger a synthetic exception and confirm the existing `Atomicly dev uncaught exception` alert still fires. **(User-driven — post-deploy.)**
- [x] 1.10 Update `infra/README.md` with the new defaults and the daily-cap rationale. Update `docs/architecture/security.md` only if the security posture changed (it should not have).

## 2. Phase 2 — Container Apps origin (architectural)

- [ ] 2.1 Branch: `refactor/cost-optimize-phase-2-container-apps`
- [ ] 2.2 Wire `infra/modules/containerApp.bicep` into `infra/main.bicep` alongside the existing App Service (both running, App Service still receives traffic).
- [ ] 2.3 Add a Container Apps Environment in `main.bicep` (workload profile: Consumption). Reuse the existing Log Analytics workspace.
- [ ] 2.4 Configure the Container App ingress with `external: true`, `transport: 'auto'`, `targetPort: 3000`, `minReplicas: 0`, `maxReplicas: 3`, scale rule `http` with `concurrentRequests: 20`.
- [ ] 2.5 Grant the Container App's user-assigned managed identity `AcrPull` on the existing ACR.
- [ ] 2.6 Grant the Container App's managed identity Key Vault `Secrets User` and migrate the existing `DATABASE_URL` / `AUTH_SECRET` / `AUTH_URL` / `NEXT_PUBLIC_APP_URL` secret references.
- [ ] 2.7 Deploy. Smoke test the Container App directly via its `*.azurecontainerapps.io` hostname: `/api/healthz` returns 200, login + create habit round-trip works.
- [ ] 2.8 Measure cold-start latency from a 5-minute-idle state. Assert ≤ 5 seconds end-to-end (spec requirement). Document the measured value in the PR.

## 3. Phase 2 — Cloudflare Free edge (architectural)

- [ ] 3.1 Buy or transfer a domain (open question in design.md). Add the domain to Cloudflare Free.
- [ ] 3.2 Issue a scoped Cloudflare API token (Zone:DNS:Edit + Zone:WAF:Edit + Zone:Cache Rules:Edit) limited to the new zone. Store in Azure Key Vault as `CLOUDFLARE-API-TOKEN` and in GitHub Actions secrets as `CLOUDFLARE_API_TOKEN`. Store the zone ID similarly.
- [ ] 3.3 Write `infra/scripts/configure-cloudflare.ps1` (idempotent) that, given the zone ID + token, applies: managed WAF ruleset = on, custom rate-limit rule (30 req / 60s per IP, equivalent to the current Azure WAF rule), custom rule blocking known scanner user-agents (port the `BlockScannerUserAgents` list), DNS A/CNAME for the apex pointing to the Container App, "Full (strict)" TLS mode, Authenticated Origin Pulls enabled with the Cloudflare-issued origin certificate uploaded to the Container App custom domain.
- [ ] 3.4 Upload the Cloudflare origin certificate to the Container App as a custom-domain TLS binding; configure the Container App to require the certificate (mTLS).
- [ ] 3.5 In `lib/security/headers.ts`, replace the `X-Azure-FDID` enforcement helper with a Cloudflare-equivalent: verify the request carries the Authenticated-Origin-Pulls client cert metadata header that the Container Apps platform forwards, AND the source IP belongs to Cloudflare's published egress ranges (fetched at build time, cached in `lib/security/cloudflare-ips.ts`).
- [ ] 3.6 In `proxy.ts`, swap the FDID call site for the new Cloudflare check. Keep the timing-safe rejection semantics.
- [ ] 3.7 Update tests in `lib/security/__tests__/*` to match. Tier-1 unit tests must cover: valid Cloudflare proof passes, missing proof returns 403, valid-looking proof from an unlisted IP returns 403, IP-list refresh fallback uses cached value when network is unavailable.
- [ ] 3.8 Add an end-to-end smoke test (a one-off `infra/scripts/verify-origin-lockdown.ps1`) that curls the Container App's `*.azurecontainerapps.io` hostname from a non-Cloudflare IP and asserts HTTP 403 or TLS failure. Run it from the GitHub Actions runner (which is not a Cloudflare IP) post-deploy. Fail the deploy if the assertion fails.
- [ ] 3.9 Cut DNS over: point the apex at the Container App (via Cloudflare). Verify in the browser. Verify the existing security headers (CSP nonce, HSTS, X-Frame-Options, etc.) still render correctly.
- [ ] 3.10 Soak for 7 days. Watch Application Insights for 5xx spikes and origin-bypass log events.
- [ ] 3.11 After soak: in `infra/main.bicep`, delete the `frontDoor`, `wafPolicy`, `appService`, `appServicePlan` modules and their outputs. Delete `infra/modules/frontDoor.bicep`, `wafPolicy.bicep`, `appService.bicep`, `appServicePlan.bicep`. Confirm `az deployment sub what-if` reports the four resources being destroyed and no others.
- [ ] 3.12 Update `.github/workflows/ci-cd.yml`: remove the post-deploy step that sets the App Service `X-Azure-FDID` IP restriction; add a step that invokes `configure-cloudflare.ps1`.

## 4. Documentation and skills

- [ ] 4.1 Update `docs/architecture/security.md`: new edge diagram (Cloudflare → Container App), new origin-pinning section (Authenticated Origin Pulls + Cloudflare IP allowlist), updated residual-risk list (note that the Postgres + Key Vault public-endpoint risks are unchanged by this change).
- [ ] 4.2 Update `infra/README.md`: new cost table (~$5–10/mo at zero traffic), updated deploy flow, new env vars / secrets list.
- [ ] 4.3 Update `.agents/skills/atomic-habit-security/SKILL.md`: replace Front Door / FDID language with Cloudflare / Authenticated Origin Pulls language.
- [ ] 4.4 Update `.agents/skills/atomic-habit-forward-deploy-engineer/SKILL.md`: replace App Service + Front Door bullets with Container Apps + Cloudflare bullets, update the cost guidance.
- [ ] 4.5 Update top-level `AGENTS.md`: security paragraph mentioning Front Door must be updated to mention Cloudflare.
- [ ] 4.6 Update `CLAUDE.md` / `.github/copilot-instructions.md` if either mentions Front Door.

## 5. Validation gate (run before every push in either phase)

- [ ] 5.1 `npm exec vitest run`
- [ ] 5.2 `npm run typecheck`
- [ ] 5.3 `npm run lint:app`
- [ ] 5.4 `npm run build`
- [ ] 5.5 `az bicep build --file infra/main.bicep`
- [ ] 5.6 `az deployment sub what-if` (paste diff into PR)

## 6. Archive

- [ ] 6.1 After Phase 2 has soaked for 7 days and all tasks above are checked, run `openspec archive cost-optimize-azure-infra` to fold the modified `deployment-architecture` requirements into `openspec/specs/deployment-architecture/spec.md`.
