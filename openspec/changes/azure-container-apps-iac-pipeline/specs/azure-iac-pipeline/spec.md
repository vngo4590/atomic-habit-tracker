## ADDED Requirements

### Requirement: Azure infrastructure is deployed through Bicep
The system SHALL define Azure infrastructure as Bicep files with reusable modules and environment-specific parameter files.

#### Scenario: Developer reviews Azure infrastructure
- **WHEN** a developer inspects the infrastructure directory
- **THEN** they can identify Bicep modules for Container Apps, PostgreSQL, ACR, Key Vault, managed identities, and observability

#### Scenario: Developer selects deployment target
- **WHEN** a developer deploys infrastructure for an environment and region
- **THEN** the deployment uses a parameter file that encodes that environment and Azure region

### Requirement: Pipeline authenticates to Azure without stored credentials
The system SHALL use workload identity federation for CI/CD authentication to Azure.

#### Scenario: Pipeline deploys infrastructure
- **WHEN** the pipeline runs Azure deployment commands
- **THEN** it authenticates through OIDC or workload identity federation rather than a stored client secret

#### Scenario: Pipeline permissions are assigned
- **WHEN** the pipeline identity is configured
- **THEN** it receives only the Azure permissions required to deploy and update the target resource group and supporting deployment resources

### Requirement: Pipeline previews infrastructure changes before applying
The system SHALL preview Azure infrastructure changes before applying them to an environment.

#### Scenario: Pull request changes infrastructure
- **WHEN** a pull request changes files under `infra/`
- **THEN** the pipeline runs Bicep validation and an Azure `what-if` preview for the selected target

#### Scenario: Production infrastructure changes are reviewed
- **WHEN** a production infrastructure change is proposed
- **THEN** the predicted Azure resource changes are visible before the deployment is approved

### Requirement: Pipeline builds and publishes application images
The system SHALL build and publish separate web and migration container images from the existing Dockerfile targets.

#### Scenario: Application deploy is triggered
- **WHEN** a deploy pipeline runs for a commit
- **THEN** it builds the `runner` image and pushes it to Azure Container Registry with an immutable commit tag

#### Scenario: Migration image is required
- **WHEN** a deploy pipeline runs for a commit
- **THEN** it builds the `migrator` image and pushes it to Azure Container Registry with an immutable commit tag

### Requirement: Database migrations run before web traffic is promoted
The system SHALL execute production-safe Prisma migrations as a discrete deployment step before promoting a new web revision.

#### Scenario: New web revision is deployed
- **WHEN** the pipeline has pushed new application images
- **THEN** it runs the Azure Container Apps migration job with the matching migrator image before routing traffic to the new web revision

#### Scenario: Migration fails
- **WHEN** the migration job exits unsuccessfully
- **THEN** the pipeline stops the deployment and does not promote the new web revision

### Requirement: Web deployment uses Container Apps revisions
The system SHALL deploy web changes as Azure Container Apps revisions and promote traffic only after validation.

#### Scenario: New revision passes smoke checks
- **WHEN** the new web revision responds successfully to the health check
- **THEN** the pipeline can route production traffic to that revision

#### Scenario: New revision fails smoke checks
- **WHEN** the new web revision fails the health check
- **THEN** the pipeline keeps traffic on the previous healthy revision or rolls traffic back to it

### Requirement: Region rollout is parameterized
The system SHALL allow deployment workflows to select environment and Azure region without editing pipeline code.

#### Scenario: Operator starts manual deployment
- **WHEN** an operator starts the deployment workflow
- **THEN** they can choose an allowed environment and Azure region from workflow inputs

#### Scenario: Additional region is added
- **WHEN** a new supported Azure region is introduced
- **THEN** it is added through a new parameter file and allowed pipeline input rather than duplicating deployment logic

### Requirement: Custom domain rollout is documented and parameterized
The system SHALL document how an owned domain is connected to the Azure deployment and expose domain settings through deployment parameters.

#### Scenario: Operator owns a domain
- **WHEN** an operator prepares production domain rollout
- **THEN** the documentation explains how to use an existing registrar or delegate the domain to Azure DNS

#### Scenario: Domain is configured for an environment
- **WHEN** a deployment target has a custom domain
- **THEN** the target parameter file includes the canonical hostname and whether the hostname is apex or subdomain

### Requirement: DNS records support Container Apps hostname verification
The system SHALL document the DNS records required to verify and route custom domains to Azure Container Apps.

#### Scenario: Subdomain is configured
- **WHEN** a subdomain such as `www.example.com` is used
- **THEN** DNS includes a CNAME to the generated Container Apps hostname and a TXT verification record for the subdomain

#### Scenario: Apex domain is configured
- **WHEN** an apex domain such as `example.com` is used
- **THEN** DNS includes an A record to the Container Apps environment static IP and a TXT verification record for the apex domain

### Requirement: Custom domains use managed TLS where possible
The system SHALL bind custom domains to TLS certificates before treating the domain rollout as complete.

#### Scenario: Managed certificate is issued
- **WHEN** the DNS records satisfy Azure Container Apps managed certificate requirements
- **THEN** the custom hostname is bound to a managed certificate and marked secured

#### Scenario: Managed certificate cannot be issued
- **WHEN** DNS, CAA, or routing constraints prevent managed certificate issuance
- **THEN** the rollout documentation directs the operator to fix DNS/CAA records or use a certificate stored in Key Vault

### Requirement: Application URLs match the custom domain
The system SHALL configure application URL settings to match the public custom domain used by users.

#### Scenario: Custom domain becomes canonical
- **WHEN** a custom domain is promoted for an environment
- **THEN** `AUTH_URL` and `NEXT_PUBLIC_APP_URL` are set to the exact HTTPS origin for that domain

#### Scenario: Build-time public URL changes
- **WHEN** `NEXT_PUBLIC_APP_URL` changes for a target deployment
- **THEN** the deployment rebuilds or selects an image built with that public URL

### Requirement: Azure deployment exposes operational signals
The system SHALL configure logging, metrics, and health validation for the Azure deployment.

#### Scenario: Application is deployed
- **WHEN** the Azure environment is provisioned
- **THEN** Container Apps logs are sent to Log Analytics and application telemetry is available through Application Insights

#### Scenario: Health endpoint is monitored
- **WHEN** the web container is running
- **THEN** platform probes and smoke tests can call `/api/healthz`
