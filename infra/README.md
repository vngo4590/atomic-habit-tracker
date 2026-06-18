# Atomicly Azure Infrastructure — Dev Environment

This directory contains **Infrastructure as Code (IaC)** for deploying the Atomicly habit tracker to Microsoft Azure.  Everything is defined as Bicep templates and automated through shell scripts and GitHub Actions.

> **Environment:** `dev`  
> **Region:** `australiaeast`  
> **Stack:** Next.js (standalone container) · PostgreSQL · Azure App Service · Front Door

---

## 📐 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              INTERNET                                    │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │   Azure Front Door        │  ← Global edge, HTTPS,
                    │   (Standard SKU)          │    DDoS protection,
                    │   *.azurefd.net           │    TLS termination
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │   Azure App Service       │  ← Linux container
                    │   (B1 Basic)              │    (Next.js standalone)
                    │   Managed Identity        │
                    └─────────────┬─────────────┘
                                  │
            ┌─────────────────────┼─────────────────────┐
            │                     │                     │
   ┌────────▼────────┐  ┌────────▼────────┐  ┌────────▼────────┐
   │  Azure Key      │  │  Azure Container│  │  Azure DB for   │
   │  Vault          │  │  Registry (ACR) │  │  PostgreSQL     │
   │  (secrets)      │  │  (images)       │  │  (Flexible)     │
   └─────────────────┘  └─────────────────┘  └─────────────────┘
```

### Data Flow
1. **User** → Front Door endpoint (HTTPS, any device)
2. **Front Door** → Azure App Service origin (HTTPS only)
3. **App Service** → Key Vault (resolves `DATABASE_URL`, `AUTH_SECRET` at runtime)
4. **App Service** → PostgreSQL Flexible Server (SSL-encrypted, public access locked to Azure services)

---

## 🗂️ Directory Layout

```
infra/
├── main.bicep                 # Root orchestrator — deploys all modules
├── modules/
│   ├── acr.bicep              # Azure Container Registry (Basic SKU)
│   ├── appService.bicep       # Web App — Linux container runtime
│   ├── appServicePlan.bicep   # App Service Plan (B1)
│   ├── frontDoor.bicep        # Front Door profile, endpoint, origin, route
│   ├── keyvault.bicep         # Key Vault for runtime secrets
│   ├── keyvaultAccess.bicep   # RBAC — grants KV Secrets User role
│   ├── acrPull.bicep          # RBAC — grants AcrPull role
│   ├── monitoring.bicep       # Log Analytics + Application Insights
│   ├── networking.bicep       # VNet + subnets (reserved for future private access)
│   └── postgres.bicep         # PostgreSQL Flexible Server + firewall rules
└── scripts/
    ├── deploy-local.sh        # One-command local deployment
    └── setup-oidc.sh          # Bootstrap GitHub Actions OIDC auth
```

---

## 🔐 Security Design

| Layer | Control |
|-------|---------|
| **Edge** | Azure Front Door provides global anycast, TLS 1.2+, and built-in DDoS protection |
| **Transport** | HTTPS-only traffic; HTTP redirects to HTTPS |
| **App** | Managed identity (no passwords in config); FTPS disabled |
| **Secrets** | Key Vault with RBAC; app settings use `@Microsoft.KeyVault(...)` references |
| **Database** | PostgreSQL SSL required; firewall allows only Azure services + temporary admin IPs |
| **Registry** | ACR admin disabled; App Service pulls via managed-identity `AcrPull` |

> **Note:** The dev environment uses public PostgreSQL access restricted by firewall rules.  For production, migrate to private VNet integration (the `networking.bicep` module is already prepared for this).

---

## 🚀 Quick Start — Local Deployment

### Prerequisites
- [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli) installed and logged in (`az login`)
- [Docker](https://docs.docker.com/get-docker/) with Buildx
- `openssl` (for secret generation)

### One-Command Deploy

```bash
cd /path/to/atomic-habit-tracker
bash infra/scripts/deploy-local.sh
```

What the script does:
1. Generates secure secrets (`AUTH_SECRET`, PostgreSQL password) if missing
2. Creates a resource group and ACR
3. Builds and pushes the **runner** and **migrator** Docker images
4. Deploys the full Bicep stack
5. Grants the current user permission to write secrets to Key Vault
6. Seeds Key Vault with `DATABASE_URL` and `AUTH_SECRET`
7. Grants the App Service managed identity access to ACR and Key Vault
8. Configures App Service app settings (with Key Vault references)
9. Temporarily opens the PostgreSQL firewall for your local IP
10. Runs Prisma migrations via the migrator container
11. Closes the PostgreSQL firewall
12. Smoke-tests both App Service and Front Door

### Outputs

On success you will see:

```
========================================
Deployment complete!
Front Door URL: https://atomicly-dev-XXXX.azurefd.net
========================================
```

---

## 🔁 CI/CD — GitHub Actions

The repository includes `.github/workflows/ci-cd.yml` for fully automated deployments.

### Setup Steps

1. **Run the OIDC bootstrap script:**
   ```bash
   bash infra/scripts/setup-oidc.sh <github-owner>/<repo-name>
   ```
   Example:
   ```bash
   bash infra/scripts/setup-oidc.sh vngo4590/atomic-habit-tracker
   ```

2. **Add the following secrets** to your GitHub repository  
   *(Settings → Secrets and variables → Actions → New repository secret)*

   | Secret | Value |
   |--------|-------|
   | `AZURE_CLIENT_ID` | From `setup-oidc.sh` output |
   | `AZURE_TENANT_ID` | From `setup-oidc.sh` output |
   | `AZURE_SUBSCRIPTION_ID` | From `setup-oidc.sh` output |
   | `AZURE_UNIQUE_SUFFIX` | The 8-character hex suffix stored in `.azure-suffix` |
   | `POSTGRES_ADMIN_PASSWORD` | Contents of `.secrets/postgres-admin-password` |
   | `AUTH_SECRET` | Contents of `.secrets/auth-secret` |

3. **Push the workflow file** to GitHub.  If your OAuth token lacks the `workflow` scope, commit the file manually through the GitHub web UI.

### Pipeline Behavior
- **Pull Requests:** Runs lint, typecheck, tests, and build
- **Push to `master`:** Full CI validation → Docker build & push → Bicep deploy → migrations → health check
- **Manual trigger:** `workflow_dispatch` with optional image tag override

---

## 🔧 Key Configuration

### Bicep Parameters (`main.bicep`)

| Parameter | Default | Description |
|-----------|---------|-------------|
| `environment` | `dev` | Environment name |
| `location` | `australiaeast` | Azure region |
| `projectName` | `atomicly` | Prefix for all resource names |
| `uniqueSuffix` | *(required)* | 8-char hex to ensure global name uniqueness |
| `postgresAdminPassword` | *(secure)* | PostgreSQL admin password |
| `imageTag` | `dev-latest` | Docker image tag deployed to App Service |

### Generated Secrets (stored in `.secrets/`)

| File | Used For |
|------|----------|
| `.secrets/postgres-admin-password` | PostgreSQL `psqladmin` account |
| `.secrets/auth-secret` | Auth.js `AUTH_SECRET` (32-byte base64) |

> These files are `.gitignore`d and never committed.

---

## 📊 Monitoring & Observability

| Resource | Purpose |
|----------|---------|
| **Log Analytics Workspace** | Central ingestion for App Service HTTP logs, console logs, Front Door access logs |
| **Application Insights** | Distributed tracing and performance metrics for the Next.js app |

Access logs:
```bash
# App Service live logs
az webapp log tail --name app-atomicly-dev-aue \
  --resource-group rg-atomicly-dev-aue-<suffix>

# Front Door access logs (via Log Analytics)
# Query in Azure Portal → Log Analytics → Logs
```

---

## 💰 Cost Estimate (Dev)

| Resource | SKU / config | ~AUD/Month |
|----------|--------------|------------|
| App Service Plan | B1 Linux, always-on | ~$13 |
| PostgreSQL Flexible Server | B1ms Burstable, **20 GB** storage, autoGrow **disabled**, 7-day backup | ~$13 |
| Container Registry | Basic | ~$6 |
| Front Door Standard | Pay-as-you-go (custom WAF rules, no managed ruleset) | ~$5–10 |
| Key Vault | Standard | ~$0.10 |
| Log Analytics + App Insights | PerGB2018, **0.2 GB/day cap**, **14-day retention**, AppLogs + AuditLogs only | ~$2–3 |
| **Total** | | **~$40** |

### Phase 1 cost-floor levers (already applied)

The following defaults were tuned by the `cost-optimize-azure-infra` OpenSpec change. Each is a parameter so a raise is a reviewable Bicep diff, not a silent drift:

- **`logDailyQuotaGb = 0.2`** (`infra/modules/monitoring.bicep`) — workspace stops accepting new logs for the day once 0.2 GB is hit. Protects against a runaway log emitter generating unbounded ingestion cost. Raise deliberately if real traffic exceeds it.
- **`logRetentionInDays = 14`** — half the previous 30-day setting, roughly half the per-GB storage cost. Still enough to investigate a week-old incident.
- **App Service diagnostics dropped `AppServiceConsoleLogs` and `AppServiceHTTPLogs`** — Application Insights already captures application traces and per-request telemetry via the SDK, so streaming the same data through Log Analytics was pure duplicate cost. `AppLogs` (platform issues) and `AuditLogs` (config changes) stay because Insights does not cover them.
- **`storageSizeGB = 20`, `storageAutoGrow = 'Disabled'`** (`infra/modules/postgres.bicep`) — 20 GB is the Burstable minimum and is well above current usage. autoGrow off means a runaway write workload fails loudly instead of silently doubling the storage bill. **Note:** Azure Postgres Flexible Server storage can only grow in-place; an existing 32 GB server will not shrink via Bicep — reclaim it by dump → recreate at 20 GB → restore during a planned dev-env reset.

### Further cost-cutting (deferred to Phase 2 of the OpenSpec change)

Phase 2 swaps App Service for Azure Container Apps (scale-to-zero, ~$0 idle) and replaces Front Door + Azure WAF with Cloudflare Free (managed WAF, DDoS, rate limiting at $0/mo base). Target floor: **~$5–10/mo at zero traffic**. See `openspec/changes/cost-optimize-azure-infra/` for the design and migration plan.

> Tactical lever (any phase): stop the Postgres Flexible Server overnight via a scheduled GitHub Action. Storage still bills, compute does not. Saves ~30% on the Postgres line for an env that nobody uses outside working hours.

---

## 🛠️ Troubleshooting

### Image Pull Unauthorized (App Service 503)
The App Service managed identity needs `AcrPull` on ACR.  The Bicep template creates this role assignment automatically, but Azure RBAC can take 30–60 seconds to propagate after deployment.  The deployment script handles this by building the image **before** the Bicep deploy so the image is already in ACR when the app starts.

### Key Vault Forbidden
If the deployment script fails with `ForbiddenByRbac` when writing secrets, it means the current user's `Key Vault Secrets Officer` role assignment has not propagated yet.  The script now includes a 15-second wait after granting the role.  If it still fails, wait another 30 seconds and re-run the script — Bicep is idempotent and will skip already-created resources.

### Front Door Endpoint Timing
Azure Front Door Standard auto-generates a unique hash suffix for every endpoint (e.g. `atomicly-dev-XXXX-fab7fhdwbsehg7af.z01.azurefd.net`).  This hash is created **after** the Bicep deployment finishes, so `endpoint.properties.hostName` evaluated inside Bicep returns the short base name (`atomicly-dev-XXXX.azurefd.net`) which does **not** resolve to your route.

The deployment script and CI/CD workflow work around this by querying the Azure REST API **after** the Bicep deployment completes to get the real hostname.  If you see 404s from Front Door or redirects to the wrong domain, verify `AUTH_URL` and `NEXT_PUBLIC_APP_URL` in your App Service settings match the actual endpoint hostname shown in the Azure Portal.

#### Endpoint Stuck in `NotStarted`
In some Azure subscriptions/regions, Front Door Standard endpoints deployed via Bicep can get stuck with `deploymentStatus: NotStarted`.  The endpoint hostname resolves but returns HTTP 404 because the route was never pushed to the edge POPs.  This is an Azure platform issue, not a Bicep or app issue.

**Symptoms:**
- `az afd endpoint show` reports `deploymentStatus: NotStarted` indefinitely
- Direct App Service access (`*.azurewebsites.net`) works perfectly
- Front Door hostname returns HTTP 404

**Workaround (CI/CD workflow):**
The CI/CD workflow queries `deploymentStatus` after Bicep deployment.  Because the App Service origin is locked to Front Door traffic only (`ipSecurityRestrictionsDefaultAction: Deny`), the workflow **always uses the Front Door hostname** when it can be resolved — even if `deploymentStatus` is not yet `Succeeded`.  Falling back to the direct App Service URL would set `AUTH_URL` to an inaccessible host and break auth redirects.  If the Front Door hostname cannot be resolved at all, the workflow emits a warning.

**Bicep fix attempt:**
`infra/modules/frontDoor.bicep` adds `routeId` and `originId` tags to the endpoint resource.  This forces Bicep to update the endpoint **after** the route and origin are created, which can trigger the edge deployment that would otherwise be skipped.

**Manual remediation:**
If you need Front Door working and the endpoint is stuck:
1. Delete the endpoint (or the entire profile) in the Azure Portal.
2. Recreate it manually or re-run the deployment script.
3. If it remains stuck, open an Azure support ticket — this is a platform-side propagation issue.

---

## 🗺️ Roadmap / Production Hardening

- [ ] **Private networking** — move PostgreSQL and Key Vault into a VNet with private endpoints
- [ ] **Premium Front Door** — add WAF managed rules (OWASP) for advanced threat protection
- [ ] **Auto-scaling** — upgrade App Service Plan to P1v2 and configure scale-out rules
- [ ] **Custom domain** — add your own domain with managed TLS certificates
- [ ] **Blue/Green deploys** — use deployment slots for zero-downtime releases
- [ ] **Backup & DR** — enable geo-redundant backups for PostgreSQL

---

## 🧪 Preview environments (ephemeral per-PR stacks)

Every PR opened against `master` from a non-fork branch gets its own fully
isolated Azure stack — `rg-atomicly-pr-<pr>-<sha7>` — automatically deployed
by `.github/workflows/pr-preview.yml` and torn down by
`.github/workflows/pr-preview-teardown.yml` when the PR closes. An hourly
reaper (`.github/workflows/pr-preview-reaper.yml`) cleans anything older
than 24 h regardless of webhook state. Cost ceiling per active preview is
**~$1.06/day worst-case**; the reaper bounds a forgotten preview to ~$1.10
total. See `openspec/changes/ephemeral-pr-preview-envs/design.md` for the
full decision log.

### Naming + tag contract

| Resource | Template | Notes |
| --- | --- | --- |
| Resource group | `rg-atomicly-pr-<pr>-<sha7>` | Regex `^rg-atomicly-pr-[0-9]+-[a-f0-9]{7}$`. |
| Container Apps Environment | `cae-atomicly-pr-<pr>` | One per PR; reused across re-deploys. |
| Container App | `ca-atomicly-pr-<pr>` | Image tag carries the SHA. |
| Postgres Flexible Server | `psql-atomicly-pr-<pr>-<sha7>` | Globally DNS-unique. |
| Key Vault | `kv-atompr-<pr>-<sha7>` | 22 chars at PR=9999; max safe PR < 10⁶. |
| Container image | `cratomiclypreview<suffix>.azurecr.io/atomicly:pr-<pr>-<sha7>` | Shared preview ACR. |

Every preview resource MUST carry these five tags (the reaper + Azure Policy
both rely on them):

```
pr=<pr_number>
commit=<sha7>
lifetime=ephemeral
created-by=github-actions
created-at=<ISO-8601 UTC, set ONCE per deploy>
```

### Phase 0 bootstrap — one-time human + workflow setup

**Step 1 — Create the dedicated `pr-preview-atomicly` Azure AD app and
federated credentials.** This MUST be a separate app from the existing
dev/master principal so the dev RG remains unreachable from preview workflows.

```bash
# Run as a subscription Owner. Set REPO to vngo4590/atomic-habit-tracker.
REPO=vngo4590/atomic-habit-tracker
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
TENANT_ID=$(az account show --query tenantId -o tsv)

# 1a. Create the AAD app + service principal.
APP=$(az ad app create --display-name pr-preview-atomicly --query '{appId:appId,id:id}' -o json)
APP_ID=$(echo "$APP" | jq -r .appId)
APP_OBJ_ID=$(echo "$APP" | jq -r .id)
az ad sp create --id "$APP_ID"
SP_OBJ_ID=$(az ad sp show --id "$APP_ID" --query id -o tsv)

# 1b. Add the two federated credential subjects.
#     pull_request — used by pr-preview.yml + pr-preview-teardown.yml.
#     ref:refs/heads/master — used by pr-preview-reaper.yml (cron has no PR claim).
az ad app federated-credential create --id "$APP_OBJ_ID" --parameters '{
  "name": "github-pull-request",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:'"$REPO"':pull_request",
  "audiences": ["api://AzureADTokenExchange"]
}'
az ad app federated-credential create --id "$APP_OBJ_ID" --parameters '{
  "name": "github-master-branch",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:'"$REPO"':ref:refs/heads/master",
  "audiences": ["api://AzureADTokenExchange"]
}'

# 1c. Subscription-scoped Contributor. The Azure Policy assignments below are
#     the blast-radius bound that keeps this from being too permissive.
az role assignment create \
  --assignee-object-id "$SP_OBJ_ID" \
  --assignee-principal-type ServicePrincipal \
  --role Contributor \
  --scope "/subscriptions/$SUBSCRIPTION_ID"

echo "APP_ID=$APP_ID"
echo "SP_OBJ_ID=$SP_OBJ_ID"
```

**Step 2 — Assign the two preview-scoped Azure Policy definitions** from
`infra/policies/`. The dev RG MUST be excluded via `--not-scopes` so the
`deny-non-preview-rg` policy doesn't break the master pipeline.

```bash
# Replace <DEV_RG_ID> with the resourceId of the existing dev RG (e.g.
# /subscriptions/.../resourceGroups/rg-atomicly-dev-aue-XXXXXX).
DEV_RG_ID=$(az group show --name rg-atomicly-dev-aue-XXXXXX --query id -o tsv)
SHARED_RG_ID="/subscriptions/$SUBSCRIPTION_ID/resourceGroups/rg-atomicly-preview-shared"

# Create the policy definitions.
DENY_RG_DEF_ID=$(az policy definition create \
  --name atomicly-deny-non-preview-rg \
  --rules infra/policies/deny-non-preview-rg.json \
  --mode All \
  --query id -o tsv)

DENY_ROLE_DEF_ID=$(az policy definition create \
  --name atomicly-deny-cross-rg-role-assignments \
  --rules infra/policies/deny-cross-rg-role-assignments.json \
  --mode All \
  --query id -o tsv)

# Assign the deny-non-preview-rg policy at subscription scope, excluding the
# dev RG and the shared preview RG (both legitimately do not match the
# rg-atomicly-pr-* prefix).
az policy assignment create \
  --name atomicly-deny-non-preview-rg \
  --policy "$DENY_RG_DEF_ID" \
  --scope "/subscriptions/$SUBSCRIPTION_ID" \
  --not-scopes "$DEV_RG_ID" "$SHARED_RG_ID"

# Assign the deny-cross-rg-role-assignments policy, parameterised with the
# pr-preview principal's object ID.
az policy assignment create \
  --name atomicly-deny-cross-rg-role-assignments \
  --policy "$DENY_ROLE_DEF_ID" \
  --scope "/subscriptions/$SUBSCRIPTION_ID" \
  --params "{\"prPreviewPrincipalId\":{\"value\":\"$SP_OBJ_ID\"}}"
```

**Step 3 — Run the bootstrap workflow.** `gh workflow run
pr-preview-bootstrap.yml -f location=australiaeast -f acr_suffix=<unique>`
(or via the Actions UI) creates `rg-atomicly-preview-shared` and the
shared `cratomiclypreview<suffix>` ACR. Idempotent.

**Step 4 — Store the GitHub Actions secrets:**

| Secret | Value | Notes |
| --- | --- | --- |
| `AZURE_PREVIEW_CLIENT_ID` | `$APP_ID` from step 1a | NEW — preview-only. Do NOT reuse `AZURE_CLIENT_ID`. |
| `AZURE_TENANT_ID` | `$TENANT_ID` | Already present for master CI. |
| `AZURE_SUBSCRIPTION_ID` | `$SUBSCRIPTION_ID` | Already present for master CI. |
| `PREVIEW_ACR_LOGIN_SERVER` (variable, not secret) | `cratomiclypreview<suffix>.azurecr.io` | Set as a repo variable, not a secret. |

### Operator runbook

- **List active previews:**
  ```bash
  az group list --tag lifetime=ephemeral \
    --query "[?starts_with(name, 'rg-atomicly-pr-')].{name:name, pr:tags.pr, commit:tags.commit, created:tags.\"created-at\"}" \
    -o table
  ```
- **Read a preview URL:** The deploy job posts the Container App FQDN to
  the bot comment on the PR. To re-fetch:
  ```bash
  az containerapp show -n ca-atomicly-pr-<pr> -g rg-atomicly-pr-<pr>-<sha7> \
    --query properties.configuration.ingress.fqdn -o tsv
  ```
- **Add your reviewer IP to a preview** for 4 h:
  ```bash
  gh workflow run pr-preview-open.yml \
    -f pr_number=<pr> -f reviewer_ip=<your.public.ip>
  ```
  Revoke early with `-f revoke=true`.
- **Run the reaper manually (dry-run):**
  `gh workflow run pr-preview-reaper.yml -f dryRun=true`. Inspect the
  summary; non-zero quarantine count signals tag drift.
- **Fork-PR limitation:** PRs from forked repositories CANNOT obtain the
  OIDC token with the preview scope. `pr-preview.yml` detects this and
  exits with a skipped status. Fork contributors get standard CI only;
  they cannot get a preview environment.

---

## 📚 Related Documentation

- [`AGENTS.md`](../AGENTS.md) — Agent workflow conventions
- [`README.md`](../README.md) — Project overview and local development
- [Azure Bicep Documentation](https://docs.microsoft.com/en-us/azure/azure-resource-manager/bicep/)
- [Azure App Service — Custom Containers](https://docs.microsoft.com/en-us/azure/app-service/quickstart-custom-container?tabs=dotnet&pivots=container-linux)
- [Azure Front Door](https://docs.microsoft.com/en-us/azure/frontdoor/)
