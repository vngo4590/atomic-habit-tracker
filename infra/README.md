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

| Resource | SKU | ~AUD/Month |
|----------|-----|------------|
| App Service Plan | B1 | ~$13 |
| PostgreSQL Flexible Server | B1ms Burstable | ~$15 |
| Container Registry | Basic | ~$6 |
| Front Door Standard | Pay-as-you-go | ~$5–10 |
| Key Vault | Standard | ~$0.10 |
| Log Analytics | Pay-as-you-go | ~$3–5 |
| **Total** | | **~$40–50** |

> Stop the App Service when not in use to save ~$13/month.

---

## 🛠️ Troubleshooting

### Image Pull Unauthorized (App Service 503)
The App Service managed identity needs `AcrPull` on ACR.  The Bicep template creates this role assignment automatically, but Azure RBAC can take 30–60 seconds to propagate after deployment.  The deployment script handles this by building the image **before** the Bicep deploy so the image is already in ACR when the app starts.

### Key Vault Forbidden
If the deployment script fails with `ForbiddenByRbac` when writing secrets, it means the current user's `Key Vault Secrets Officer` role assignment has not propagated yet.  The script now includes a 15-second wait after granting the role.  If it still fails, wait another 30 seconds and re-run the script — Bicep is idempotent and will skip already-created resources.

### Front Door Hostname Timing Issue
Azure Front Door Standard auto-generates a unique hash suffix for every endpoint (e.g. `atomicly-dev-XXXX-fab7fhdwbsehg7af.z01.azurefd.net`).  This hash is created **after** the Bicep deployment finishes, so `endpoint.properties.hostName` evaluated inside Bicep returns the short base name (`atomicly-dev-XXXX.azurefd.net`) which does **not** resolve to your route.

The deployment script and CI/CD workflow work around this by querying the Azure REST API **after** the Bicep deployment completes to get the real hostname.  If you see 404s from Front Door or redirects to the wrong domain, verify `AUTH_URL` and `NEXT_PUBLIC_APP_URL` in your App Service settings match the actual endpoint hostname shown in the Azure Portal.

---

## 🗺️ Roadmap / Production Hardening

- [ ] **Private networking** — move PostgreSQL and Key Vault into a VNet with private endpoints
- [ ] **Premium Front Door** — add WAF managed rules (OWASP) for advanced threat protection
- [ ] **Auto-scaling** — upgrade App Service Plan to P1v2 and configure scale-out rules
- [ ] **Custom domain** — add your own domain with managed TLS certificates
- [ ] **Blue/Green deploys** — use deployment slots for zero-downtime releases
- [ ] **Backup & DR** — enable geo-redundant backups for PostgreSQL

---

## 📚 Related Documentation

- [`AGENTS.md`](../AGENTS.md) — Agent workflow conventions
- [`README.md`](../README.md) — Project overview and local development
- [Azure Bicep Documentation](https://docs.microsoft.com/en-us/azure/azure-resource-manager/bicep/)
- [Azure App Service — Custom Containers](https://docs.microsoft.com/en-us/azure/app-service/quickstart-custom-container?tabs=dotnet&pivots=container-linux)
- [Azure Front Door](https://docs.microsoft.com/en-us/azure/frontdoor/)
