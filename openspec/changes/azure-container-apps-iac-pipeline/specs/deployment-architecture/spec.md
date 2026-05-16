## ADDED Requirements

### Requirement: Azure Container Apps deployment is supported
The system SHALL document and support Azure Container Apps as an Azure production deployment target for the standalone Next.js container runtime.

#### Scenario: Developer prepares Azure deployment
- **WHEN** a developer reads the deployment documentation
- **THEN** they can identify the Azure services, required environment variables, container targets, migration flow, and validation steps needed for deployment

#### Scenario: Azure runtime hosts backend paths
- **WHEN** the app runs on Azure Container Apps
- **THEN** Auth.js, Prisma, server actions, and route handlers execute in a Node.js-compatible container runtime

### Requirement: Azure deployment uses managed platform services
The system SHALL use managed Azure services for compute, database, container registry, secrets, and observability rather than self-managed virtual machines or Kubernetes clusters.

#### Scenario: Azure resources are provisioned
- **WHEN** the Azure infrastructure is deployed
- **THEN** it provisions Azure Container Apps, Azure Database for PostgreSQL Flexible Server, Azure Container Registry, Azure Key Vault, managed identities, Log Analytics, and Application Insights

#### Scenario: Kubernetes is considered
- **WHEN** the production Azure architecture is selected for the current application scale
- **THEN** AKS is excluded unless future workloads justify Kubernetes ownership and operating cost

### Requirement: Azure deployment has cost guardrails
The system SHALL configure Azure deployment defaults that minimize idle cost while allowing production reliability settings to be raised explicitly.

#### Scenario: Early-stage deployment is configured
- **WHEN** the initial Azure deployment is provisioned
- **THEN** Container Apps scale settings and PostgreSQL compute settings are documented with their cost and latency trade-offs

#### Scenario: Production latency requires warm capacity
- **WHEN** cold starts are not acceptable for production users
- **THEN** the deployment can set the web Container App minimum replicas to at least one

### Requirement: Azure deployment has security guardrails
The system SHALL configure Azure deployment defaults that minimize secret exposure and restrict database access.

#### Scenario: Application reads secrets
- **WHEN** the web or migration container needs sensitive configuration
- **THEN** it reads the configuration from Key Vault or Container Apps secrets backed by managed identity rather than source-controlled values

#### Scenario: Database connectivity is hardened
- **WHEN** the Azure deployment is promoted beyond a simple development environment
- **THEN** PostgreSQL connectivity is restricted through private networking or private endpoint access from the Azure application environment

### Requirement: Azure deployment supports custom domain rollout
The system SHALL document how to register, delegate, verify, bind, and validate an owned custom domain for Azure-hosted Atomicly environments.

#### Scenario: Developer prepares custom domain rollout
- **WHEN** a developer reads the Azure deployment documentation
- **THEN** they can identify the domain registration or ownership prerequisite, DNS hosting option, required DNS records, certificate binding step, and app URL configuration update

#### Scenario: Custom domain is validated
- **WHEN** the custom domain rollout is complete
- **THEN** the domain serves the app over HTTPS and the authenticated app uses the custom domain as its canonical origin

### Requirement: Horizontal scale is explicitly gated
The system SHALL document and enforce the application prerequisites for scaling Azure web replicas horizontally.

#### Scenario: Operator configures multiple replicas
- **WHEN** the Azure web app maximum replicas are configured above one
- **THEN** the deployment configuration includes a stable server action encryption key and documents cache or revalidation consistency constraints

#### Scenario: Horizontal scale prerequisites are missing
- **WHEN** the Azure deployment does not provide the required multi-replica settings
- **THEN** the default deployment remains limited to a single running web replica
