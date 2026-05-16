## 1. Infrastructure Structure

- [ ] 1.1 Create `infra/` with Bicep entry point, modules directory, and environment/region parameter directory.
- [ ] 1.2 Add naming, tagging, and location parameters shared by all Azure resources.
- [ ] 1.3 Add parameter files for the initial dev and production Azure regions.
- [ ] 1.4 Add domain parameters for canonical hostname, apex versus subdomain routing, DNS zone usage, and certificate mode.

## 2. Azure Resource Modules

- [ ] 2.1 Add Bicep module for Azure Container Registry with managed identity-compatible image pull permissions.
- [ ] 2.2 Add Bicep module for Log Analytics and Application Insights.
- [ ] 2.3 Add Bicep module for Key Vault with RBAC access for deployment and Container Apps identities.
- [ ] 2.4 Add Bicep module for Azure Database for PostgreSQL Flexible Server with documented compute, backup, and network settings.
- [ ] 2.5 Add Bicep module for Azure Container Apps environment with observability integration.
- [ ] 2.6 Add Bicep module for the web Container App using the Docker `runner` image, health endpoint, ingress, scale settings, and Key Vault-backed secrets.
- [ ] 2.7 Add Bicep module or resource definition for the migration Container Apps Job using the Docker `migrator` image.
- [ ] 2.8 Add optional Azure DNS zone and record support for managed domains hosted in Azure DNS.
- [ ] 2.9 Add custom hostname and managed certificate binding support for the web Container App where it can be automated safely.

## 3. Pipeline Authentication And Planning

- [ ] 3.1 Add pipeline documentation for configuring Azure workload identity federation and least-privilege role assignments.
- [ ] 3.2 Add CI workflow that runs install, Prisma validation, typecheck, lint, tests, build, and Docker target build checks.
- [ ] 3.3 Add infrastructure plan workflow that runs Bicep validation and Azure `what-if` for changes under `infra/**`.
- [ ] 3.4 Configure production deployment workflow to require environment approval before applying infrastructure or shifting traffic.

## 4. Image Build And Deployment Workflow

- [ ] 4.1 Add deployment workflow inputs for environment and Azure region.
- [ ] 4.2 Build and push Docker `runner` and `migrator` images to ACR using immutable Git SHA tags.
- [ ] 4.3 Deploy or update Azure infrastructure with the selected parameter file.
- [ ] 4.4 Run the migration Container Apps Job with the matching migrator image and fail the deployment if it fails.
- [ ] 4.5 Deploy the web image as a new Container Apps revision.
- [ ] 4.6 Run `/api/healthz` smoke validation before routing production traffic to the new revision.
- [ ] 4.7 Add rollback instructions or workflow steps for shifting traffic back to the previous healthy revision.
- [ ] 4.8 Add custom-domain rollout workflow or runbook steps to read Container Apps DNS targets, verify DNS records, bind the hostname, and validate HTTPS.

## 5. Documentation And Runtime Configuration

- [ ] 5.1 Document required Azure environment variables and which values are build-time versus runtime configuration.
- [ ] 5.2 Document region rollout strategy, including single-region active default and constraints before active-active multi-region.
- [ ] 5.3 Document cost settings and trade-offs for Container Apps minimum replicas and PostgreSQL compute tier.
- [ ] 5.4 Document security guardrails for Key Vault, managed identity, private database connectivity, and secret rotation.
- [ ] 5.5 Document horizontal scale prerequisites, including stable server action encryption key and cache/revalidation constraints.
- [ ] 5.6 Document domain registration options, including using an external registrar with Azure DNS delegation or leaving DNS at the existing provider.
- [ ] 5.7 Document required DNS records for subdomain and apex Container Apps bindings, including CNAME, A, TXT verification, and DigiCert CAA considerations.
- [ ] 5.8 Document how custom domain rollout updates `AUTH_URL`, `NEXT_PUBLIC_APP_URL`, and image build selection when the public URL changes.

## 6. Validation

- [ ] 6.1 Run Bicep validation for each committed parameter file.
- [ ] 6.2 Run a `what-if` preview against at least the dev Azure target.
- [ ] 6.3 Run the full application validation suite with `npm run backend:validate`.
- [ ] 6.4 Perform a dev Azure smoke deployment and verify migration job completion, web revision health, and `/api/healthz`.
- [ ] 6.5 Validate custom domain DNS and HTTPS binding in a non-production or staging target where a test domain is available.
- [ ] 6.6 Verify the OpenSpec change status is apply-ready after all artifacts are complete.
