## Context

Atomicly is a Next.js 16.2 App Router application with Auth.js, Prisma 7, PostgreSQL, server actions, route handlers, and a standalone container build. The current documented production path targets Vercel, but the codebase already includes a multi-stage Dockerfile with separate `runner` and `migrator` targets, a public `/api/healthz` endpoint, and production-safe Prisma migration commands.

The Azure deployment path should preserve those runtime boundaries while adding repeatable infrastructure provisioning, secure secret handling, migration sequencing, and environment/region rollout controls. The first Azure deployment should optimize for low operational overhead and early-stage cost rather than Kubernetes ownership.

## Goals / Non-Goals

**Goals:**

- Define an Azure-native IaC structure for Container Apps, PostgreSQL Flexible Server, ACR, Key Vault, managed identities, and observability.
- Provide parameterized environment and region rollout through pipeline inputs and `.bicepparam` files.
- Document custom domain rollout for owned domains, DNS records, managed TLS certificate binding, and canonical app URL updates.
- Run infrastructure preview before apply, then deploy application images and migrations in a safe sequence.
- Use workload identity federation for pipeline authentication instead of stored Azure credentials.
- Keep the deployment reversible with Container Apps revisions and explicit migration/rollback guidance.

**Non-Goals:**

- Replace the existing Vercel-compatible deployment path.
- Introduce AKS, Helm, or Kubernetes production manifests.
- Implement active-active multi-region application behavior in the first iteration.
- Add background workers, queues, storage accounts, or CDN behavior beyond what the current app needs.
- Change the application data model, auth model, or API contracts.

## Decisions

### Use Azure Container Apps for the web runtime

Deploy the existing Docker `runner` target to Azure Container Apps on the Consumption plan. Container Apps fits the current application because it runs a full Node container, supports HTTP ingress, revisions, scale-to-zero, managed identity, ACR pulls, and logs without requiring AKS cluster ownership.

Alternatives considered:

- Azure App Service for Containers: simpler traditional hosting, but less cost-efficient for idle traffic and less aligned with the existing migrator/job split.
- Azure Static Web Apps: not appropriate for this stateful Next.js app with Auth.js, Prisma, Node runtime route handlers, server actions, and PostgreSQL.
- AKS: too much operational overhead until Atomicly has workloads that justify owning Kubernetes control plane concerns.

### Use Azure Container Apps Jobs for migrations

Deploy the Docker `migrator` target as an on-demand Container Apps Job that runs `npm run prisma:migrate:deploy`. The pipeline must run the migration job before shifting web traffic to the new revision.

Alternatives considered:

- Run migrations on app startup: rejected because multiple app replicas can race and startup failure couples schema changes to web availability.
- Run migrations from the CI runner directly: acceptable for simple public database access, but worse for private networking and least-privilege isolation.

### Use Bicep for Azure infrastructure

Use Bicep modules under `infra/modules/` and environment/region parameter files under `infra/params/`. Bicep is Azure-native, supports `what-if`, and keeps resource definitions close to Azure platform behavior with less provider setup than Terraform.

Alternatives considered:

- Terraform: valid if the team already has Terraform modules or multi-cloud requirements, but adds backend/provider management that is unnecessary for this Azure-only path.
- Azure Developer CLI: useful wrapper for templates and bootstrap, but this change should keep the underlying IaC explicit and reviewable.

### Prefer GitHub Actions with OIDC for CI/CD

Use GitHub Actions if this repository is hosted in GitHub. Configure Azure login through workload identity federation and environment approvals for production. Azure DevOps Pipelines remain an equivalent option when the organization requires Azure Repos, release gates, or centralized enterprise controls.

Alternatives considered:

- Stored service principal secret: rejected because workload identity federation removes secret rotation and leak risk.
- Manual portal deployment: rejected because it cannot provide repeatable region rollout or reviewable infra diffs.

### Parameterize environment and region rollout

Represent rollout targets as pipeline inputs and Bicep parameter files, for example `dev.australiaeast.bicepparam`, `prod.australiaeast.bicepparam`, and `prod.australiasoutheast.bicepparam`. The first production posture should be single-region active, with a second region introduced as DR/passive unless database replication, cache/session behavior, traffic routing, and migration sequencing are explicitly designed for active-active.

### Support custom domain rollout with DNS verification and managed TLS

Treat custom domains as a documented deployment step with optional IaC support for Azure DNS. The operator must own or register the domain through a registrar, then either delegate the zone to Azure DNS or create required records with the existing DNS provider.

For direct Azure Container Apps binding, use a managed certificate where possible. Apex domains require an `A` record pointing to the Container Apps environment static IP plus a TXT verification record. Subdomains require a `CNAME` record pointing directly to the generated Container Apps hostname plus a TXT verification record. If CAA records exist, allow DigiCert so Azure Container Apps managed certificate issuance and renewal can succeed.

The first domain rollout should prefer a `www` subdomain because CNAME rollout is simpler and avoids apex-specific constraints. The apex domain can redirect to `www` through a DNS/front-door strategy later, or be bound directly when an A record is acceptable. If the app later uses Azure Front Door for global routing, domain ownership, certificate management, and canonical URL handling should move to Front Door rather than binding user-facing domains directly to each regional Container App.

### Keep secrets in Key Vault and access with managed identity

Store `DATABASE_URL`, `AUTH_SECRET`, optional OAuth secrets, and any stable server action encryption key in Key Vault. Container Apps should reference secrets using managed identity where supported. `NEXT_PUBLIC_APP_URL` and `AUTH_URL` must be managed per deployed public origin, and image builds must account for values that are inlined at build time.

### Start with one web replica unless horizontal scale is configured safely

The repo documents that horizontal scale requires a stable `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` and shared cache coordination for Next.js revalidation/cache behavior. The Azure deployment should start with one replica or explicitly provide those settings before increasing `maxReplicas` beyond one.

## Risks / Trade-offs

- Cold starts from `minReplicas: 0` can affect login and dashboard latency -> Use `minReplicas: 1` for production if user experience requires warm availability.
- PostgreSQL Flexible Server cost can dominate early Azure spend -> Start with the smallest production-acceptable tier and scale based on metrics; avoid Burstable for production reliability.
- Private database networking can make CI migration execution harder -> Run migrations as a Container Apps Job inside the Azure environment instead of directly from the external runner.
- `NEXT_PUBLIC_APP_URL` is inlined at build time -> Use a single global public origin when possible, or build/tag images per public origin.
- Custom domain certificate issuance can fail if DNS is misconfigured, points through an unsupported intermediate CNAME, or CAA records exclude DigiCert -> Validate DNS records before binding and document provider-specific records.
- Database migrations are not automatically reversible -> Prefer additive migrations, snapshot before production schema changes, and roll back app revisions first after additive migrations.
- Multi-region active-active is complex -> Begin single-region active and document DR separately before routing writes to multiple regions.

## Migration Plan

1. Add Bicep modules and parameter files for shared and regional Azure resources.
2. Add CI workflow for tests, build validation, and Docker image build checks.
3. Add infrastructure plan workflow that runs Bicep validation and `what-if` on pull requests touching `infra/**`.
4. Add deployment workflow with environment and region inputs.
5. Deploy infrastructure to a dev region.
6. Register or confirm ownership of the production domain and configure DNS hosting.
7. Bind the custom hostname to the target Container App, issue or bind TLS, and update `AUTH_URL` and `NEXT_PUBLIC_APP_URL`.
8. Build and push `runner` and `migrator` images tagged with the Git SHA.
9. Run the migration job against the target PostgreSQL server.
10. Deploy the web container as a new Container Apps revision.
11. Smoke test `/api/healthz` and a minimal authenticated flow through the custom domain where feasible.
12. Promote traffic to the new revision after smoke checks pass.

Rollback should first shift Container Apps traffic to the previous healthy revision. If an additive migration has already run, leave the schema in place and deploy a compatible code revision. Destructive schema changes require a separate restore or forward-fix plan.

## Open Questions

- Should the first production Azure region be `australiaeast`, or should the region be selected by expected user geography and data residency requirements?
- Will production use a single global domain through Azure Front Door, or one public origin per region?
- Will the owned domain be hosted in Azure DNS, or will DNS records remain with an external registrar/provider?
- Should production use `minReplicas: 0` for cost or `minReplicas: 1` for predictable latency?
- Does the organization prefer GitHub Actions or Azure DevOps as the pipeline system of record?
