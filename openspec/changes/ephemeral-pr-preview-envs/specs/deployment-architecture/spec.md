## ADDED Requirements

### Requirement: Every pull request MUST get its own isolated Azure preview environment
The system SHALL deploy a fully isolated Azure stack (resource group, Container App, PostgreSQL Flexible Server, Key Vault, Log Analytics workspace) for every pull request opened against `master` from a non-fork branch. The deploy workflow MUST run on every `opened`, `reopened`, `synchronize`, and `ready_for_review` pull request event. The deployed preview URL MUST be reported back to the pull request as a comment. Drafts MAY be skipped for cost reasons.

#### Scenario: A pull request is opened
- **WHEN** a contributor opens a non-draft pull request against `master`
- **THEN** a workflow run starts whose deploy job creates a resource group whose name matches `^rg-atomicly-pr-[0-9]+-[a-f0-9]{7}$`, the run completes within 15 minutes, and a Container App, Postgres server, and Key Vault are present inside the resource group when the run reports success

#### Scenario: A pull request branch is force-pushed
- **WHEN** the head SHA of an open pull request changes
- **THEN** the in-flight preview deploy is cancelled via the `concurrency` group, the deploy job's pre-cleanup step deletes any resource group tagged with the same `pr` but a different `commit`, and only one resource group exists for the new SHA when the new run completes

#### Scenario: A pull request is opened from a fork
- **WHEN** a pull request's head repository differs from the base repository
- **THEN** the preview workflow exits with a skipped status and posts a comment explaining that fork PRs cannot use OIDC-authenticated Azure preview environments

### Requirement: Preview deployment MUST be gated by a green Playwright run against the live preview URL
The pull-request status check SHALL be reported as failed unless the full Playwright end-to-end suite passes against the deployed preview URL. A passing health check at `/api/healthz` MUST NOT, on its own, satisfy the gate.

#### Scenario: Preview comes up healthy but a Playwright test fails
- **WHEN** the preview deploy succeeds, `/api/healthz` returns 200, but at least one Playwright test fails against the preview URL
- **THEN** the pull-request check is reported as failed and the failure summary identifies the failing tests by name

#### Scenario: Playwright suite passes against the live preview
- **WHEN** every Playwright test in the suite passes against the preview URL
- **THEN** the pull-request check is reported as passed and a comment on the pull request links the preview URL and the Playwright run

### Requirement: Preview resources MUST be torn down within 24 hours of creation
Every preview resource group SHALL be deleted no later than 24 hours after its `created-at` tag, regardless of whether the originating pull request was merged, abandoned, or left open. Two independent mechanisms — a close-driven teardown workflow and an hourly safety-net cron — SHALL both be in place; either alone is insufficient. The cron MUST run at least hourly so the 24 h ceiling is met with no more than 1 h of jitter.

#### Scenario: A pull request is merged or closed
- **WHEN** a pull request transitions to the `closed` state (merged or unmerged)
- **THEN** a teardown workflow run completes within 5 minutes of the close event and submits `az group delete` for every resource group whose `pr` tag matches the closed pull request

#### Scenario: A preview is older than 24 hours
- **WHEN** the hourly reaper workflow runs and finds a resource group whose name matches `^rg-atomicly-pr-[0-9]+-[a-f0-9]{7}$`, carries the tags `lifetime=ephemeral` and `created-by=github-actions`, and has a `created-at` tag more than 24 hours in the past
- **THEN** the reaper submits `az group delete` for that resource group, even if the pull request is still open

#### Scenario: A resource group lacks the required prefix or tags
- **WHEN** the reaper finds a resource group that carries `lifetime=ephemeral` but whose name does not match `^rg-atomicly-pr-[0-9]+-[a-f0-9]{7}$`, OR a resource group whose name matches the prefix but is missing one of the required tags
- **THEN** the reaper does NOT delete that resource group, marks the run as failed, and emits a workflow-error annotation naming the resource group

### Requirement: Preview resources MUST carry ownership and lifetime tags
Every resource a preview workflow creates SHALL carry the tags `pr=<number>`, `commit=<sha>`, `lifetime=ephemeral`, `created-by=github-actions`, and `created-at=<ISO-8601 UTC timestamp>`. The teardown workflow and the safety-net reaper MUST rely on these tags rather than on resource names alone.

#### Scenario: A workflow creates an Azure resource for a preview
- **WHEN** any preview workflow creates a resource group, Container App, Postgres server, or Key Vault
- **THEN** the resource carries all five required tags and the `pr` and `commit` values match the originating pull request

#### Scenario: An untagged resource group exists in the subscription
- **WHEN** a resource group exists whose name matches `rg-atomicly-pr-*` but which lacks the `lifetime=ephemeral` tag
- **THEN** the reaper does NOT delete it and reports it as suspicious in the workflow log

### Requirement: Preview environments MUST use the cheapest viable Azure SKUs
Each preview environment SHALL use Postgres Flexible Server B1ms with 20 GB storage and autoGrow disabled, Container Apps consumption with `minReplicas: 0`, Log Analytics with at most 0.1 GB/day ingestion cap and at most 7-day retention, and a Standard-tier Key Vault. The preview hostname SHALL be the platform-default `*.azurecontainerapps.io` URL; no Front Door, WAF, Cloudflare, or custom domain is permitted on previews. The worst-case daily cost of a single preview, including the Log Analytics cap fully consumed, SHALL NOT exceed $1.50 USD per day at Azure Retail list price for Australia East.

#### Scenario: A new preview is provisioned
- **WHEN** the preview workflow runs Bicep against `infra/preview.bicep`
- **THEN** an inspection of the deployed resources shows Postgres SKU `Standard_B1ms`, storage 20 GB, autoGrow disabled, Container App workload profile `Consumption` with `minReplicas: 0`, Log Analytics workspace `workspaceCapping.dailyQuotaGb ≤ 0.1`, and no resources of type `Microsoft.Cdn/profiles`, `Microsoft.Network/frontDoors`, or `Microsoft.Network/FrontDoorWebApplicationFirewallPolicies`

#### Scenario: Forgotten preview cost ceiling
- **WHEN** an operator queries Azure Cost Management for a single preview resource group's accrued cost over a 24-hour idle period
- **THEN** the reported cost is at most $1.50 USD at Australia East list price

### Requirement: Preview origin MUST be locked to the deploying GitHub Actions runner
The Container App ingress for a preview SHALL deny inbound traffic by default and accept HTTPS only from (a) the public egress IP of the GitHub Actions runner that is currently running the deploy or test job, resolved at job start and removed at job end, and (b) optionally, a reviewer IP supplied through a separate `workflow_dispatch` workflow (not through `pull_request` inputs, which do not exist). Public, unauthenticated browsing of preview URLs from an arbitrary internet host SHALL NOT be possible.

#### Scenario: A preview URL is opened from an IP that is not currently allowlisted
- **WHEN** an HTTPS request reaches a preview Container App from an IP that is not present in the Container App's `ipSecurityRestrictions` allowlist
- **THEN** the Container App returns HTTP 403 before any application code runs, and the request is visible in the Container App ingress access log

#### Scenario: Playwright runs against a preview URL
- **WHEN** the Playwright job has added its runner's public IP to the Container App allowlist and issues a request to the preview URL
- **THEN** the request is allowed and the application responds normally; when the job exits, the trap-handler removes the IP from the allowlist

### Requirement: Preview workflows MUST NOT modify the master CI/CD pipeline or dev resource group
The change introducing preview environments SHALL be additive only. The existing `.github/workflows/ci-cd.yml`, the dev resource group `rg-atomicly-dev-*`, and the dev Front Door / App Service stack SHALL NOT be edited as part of the preview-environment change. Preview images SHALL be stored in a separate `rg-atomicly-preview-shared` resource group, not in the dev ACR.

#### Scenario: A preview workflow run inspects the dev resource group
- **WHEN** any preview workflow run completes
- **THEN** the Azure Activity Log for `rg-atomicly-dev-*` shows no write, role-assignment, or delete operations attributable to the `pr-preview` service principal during that run

#### Scenario: Master CI/CD continues to function during preview rollout
- **WHEN** master CI/CD runs after the preview workflows have shipped
- **THEN** `git diff master:.github/workflows/ci-cd.yml` returns no changes for the preview rollout commit range, and the dev deploy produces the same App Service revision behaviour as before the preview workflows existed

### Requirement: Preview database MUST be ephemeral and isolated per pull request
Each preview environment SHALL provision its own PostgreSQL Flexible Server. Preview workflows SHALL NOT connect to a shared dev or production database. Migrations SHALL be applied to the fresh server as a deliberate workflow step, not at application startup.

#### Scenario: Two pull requests are open simultaneously with conflicting schema changes
- **WHEN** PR A renames a column and PR B adds a column on the same table
- **THEN** each preview connects to its own Postgres server and neither deploy fails because of the other's schema

#### Scenario: Preview deploy without applied migrations
- **WHEN** the preview's Container App starts before `prisma migrate deploy` has run against the preview's Postgres
- **THEN** Playwright fails (because schema is missing) and the migration step's failure is surfaced as the root cause in the workflow log

### Requirement: Preview workflows MUST authenticate to Azure via OIDC with a dedicated principal, never with stored long-lived credentials
Preview workflows SHALL use Azure OIDC federated credentials against a **dedicated `pr-preview` Azure AD app**, separate from the existing dev/master principal. No Azure client secret, password, or other long-lived credential SHALL appear in any workflow file or Bicep parameter file. Federated credential subjects MUST cover both `repo:<owner>/<repo>:pull_request` (for PR-event-driven runs) and `repo:<owner>/<repo>:ref:refs/heads/master` (for the scheduled reaper). Per-run-generated database passwords passed through Bicep `@secure()` parameters are permitted and do not violate this requirement.

#### Scenario: A workflow file is reviewed for long-lived credentials
- **WHEN** a reviewer searches the four preview workflow files for the strings `AZURE_CLIENT_SECRET`, `client_secret`, `password=`, or hard-coded base64 secrets
- **THEN** no match is found, and the only Azure auth step is `azure/login@v2` with `client-id`, `tenant-id`, and `subscription-id` referenced from GitHub secrets

#### Scenario: A scheduled reaper run requests an OIDC token
- **WHEN** `pr-preview-reaper.yml` runs from the `schedule` trigger on the `master` branch
- **THEN** the issued OIDC token's `sub` claim is `repo:vngo4590/atomic-habit-tracker:ref:refs/heads/master` and Azure accepts it against a federated credential configured on the `pr-preview` app

#### Scenario: A PR-event workflow requests an OIDC token
- **WHEN** `pr-preview.yml` or `pr-preview-teardown.yml` runs from a `pull_request` event
- **THEN** the issued OIDC token's `sub` claim is `repo:vngo4590/atomic-habit-tracker:pull_request` and Azure accepts it against a federated credential configured on the `pr-preview` app
