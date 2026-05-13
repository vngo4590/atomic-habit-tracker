## Why

Atomicly needs an Azure deployment path that is cost-conscious, secure, repeatable, and not tied to manual portal setup. The current deployment documentation targets Vercel, while the codebase already supports containerized deployment through standalone Next.js output, a runner image, a migrator image, PostgreSQL, and a health endpoint.

## What Changes

- Add an Azure infrastructure-as-code deployment option based on Azure Container Apps, Azure Database for PostgreSQL Flexible Server, Azure Container Registry, Key Vault, and observability resources.
- Add a parameterized pipeline model for environment and region rollout using Bicep and workload identity federation.
- Define safe deployment sequencing for infrastructure updates, image publishing, database migrations, web revision rollout, smoke checks, and rollback.
- Preserve the existing Vercel-compatible deployment path while documenting Azure as an additional supported target.
- Require cost and security guardrails for the Azure path, including managed identity, Key Vault-backed secrets, private database connectivity, and scale settings.

## Capabilities

### New Capabilities

- `azure-iac-pipeline`: Infrastructure-as-code and CI/CD behavior for Azure region rollout, migration execution, image deployment, and operational validation.

### Modified Capabilities

- `deployment-architecture`: Extend deployment requirements to cover Azure Container Apps as a supported production target alongside the existing Vercel-compatible runtime guidance.

## Impact

- Adds infrastructure files under `infra/` for Bicep modules and environment/region parameter files.
- Adds pipeline definitions under `.github/workflows/` or Azure DevOps equivalent YAML, with GitHub Actions preferred unless the repository is hosted in Azure DevOps.
- Uses existing Dockerfile `runner` and `migrator` targets without changing application behavior.
- Uses existing runtime configuration requirements: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `NEXT_PUBLIC_APP_URL`, and stable server action encryption key before horizontal scale.
- Requires Azure resources for Container Apps, PostgreSQL Flexible Server, ACR, Key Vault, managed identities, Log Analytics, and Application Insights.
