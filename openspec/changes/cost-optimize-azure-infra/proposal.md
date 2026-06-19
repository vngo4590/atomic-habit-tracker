## Why

The current Azure dev deployment costs ~$75–90/mo despite the app having no users. The biggest line items (Azure Front Door Standard ~$35/mo, App Service B1 always-on ~$13/mo, verbose Log Analytics ingestion) are sized for production traffic that does not exist. We need a cost floor that scales with actual usage while preserving the security posture documented in `docs/architecture/security.md` (WAF, DDoS protection, TLS, origin lockdown, edge rate limiting).

## What Changes

- **BREAKING (infra-only):** Replace Azure Front Door Standard + Azure WAF policy with **Cloudflare Free** as the public edge. WAF, DDoS, CDN, and rate limiting move to Cloudflare. Origin lockdown moves from `AzureFrontDoor.Backend` service tag + `X-Azure-FDID` pinning to **Cloudflare IP allowlist + Authenticated Origin Pulls (mTLS)**.
- **BREAKING (infra-only):** Replace Azure App Service Plan B1 + Web App with **Azure Container Apps** in the consumption plan with `minReplicas: 0` (scale-to-zero). The repo already ships `infra/modules/containerApp.bicep`; wire it into `main.bicep`.
- Trim PostgreSQL Flexible Server storage from 32 GB → 20 GB and disable autoGrow.
- Trim Log Analytics: drop `AppServiceConsoleLogs` and `AppServiceHTTPLogs` diagnostic categories (App Insights already captures app traces), drop retention from 30 → 14 days, set a daily ingestion cap (default 0.2 GB/day).
- Update `proxy.ts` and `lib/security/headers.ts` to validate the Cloudflare-equivalent origin-pinning header (`CF-Connecting-IP` + `Cf-Visitor` + verified-origin-pull client cert metadata) instead of `X-Azure-FDID`.
- Update `docs/architecture/security.md` and the `atomic-habit-security` skill to reflect the new edge.
- CI/CD (`.github/workflows/ci-cd.yml`): remove Front-Door-ID post-deploy step, add Cloudflare zone configuration step (Terraform-free, via API tokens).
- Phase rollout so each phase is independently revertable.

## Capabilities

### New Capabilities
None — this change reshapes the existing deployment topology without introducing new product behaviour.

### Modified Capabilities
- `deployment-architecture`: edge tier, compute tier, observability ingestion budget, and origin-pinning mechanism are all changing.

## Impact

- **Code:** `proxy.ts`, `lib/security/headers.ts` (origin-pin header swap), `lib/security/__tests__/*` (test fixtures).
- **Infra (Bicep):** `infra/main.bicep`, `infra/modules/appService.bicep` (deprecated/removed in Phase 2), `infra/modules/appServicePlan.bicep` (removed Phase 2), `infra/modules/frontDoor.bicep` (removed Phase 2), `infra/modules/wafPolicy.bicep` (removed Phase 2), `infra/modules/postgres.bicep` (storage trim), `infra/modules/monitoring.bicep` (log trim + daily cap), `infra/modules/containerApp.bicep` (wired into main).
- **CI/CD:** `.github/workflows/ci-cd.yml` (drop FDID step, add Cloudflare API step, swap App Service deploy for Container Apps deploy).
- **Docs:** `docs/architecture/security.md`, `infra/README.md`, `.agents/skills/atomic-habit-security/SKILL.md`, `.agents/skills/atomic-habit-forward-deploy-engineer/SKILL.md`, top-level `AGENTS.md` security paragraph.
- **External dependency:** Cloudflare account (free plan) controlling the production hostname's DNS. Account must be created and a scoped API token issued before Phase 2.
- **Cost:** ~$75–90/mo → ~$5–10/mo at zero traffic; scales linearly with Container Apps requests + Postgres storage + Log Analytics ingestion above the cap.
- **Security delta:** equivalent at this scale. We trade Microsoft-edge WAF for Cloudflare-edge WAF; both deny-by-default at the origin via different headers/IP allowlists. Residual risks (Postgres public endpoint, Key Vault public access) are unchanged by this change.
