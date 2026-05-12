# deployment-architecture Specification

## Purpose
Define the production and local deployment architecture for Atomicly, including Vercel-compatible runtime boundaries, migration flow, validation expectations, and Docker Desktop Kubernetes support for local smoke testing.
## Requirements
### Requirement: Production configuration is documented
The system SHALL document all required environment variables, provider setup, and deployment commands for Vercel.

#### Scenario: Developer prepares Vercel deployment
- **WHEN** a developer reads the deployment documentation
- **THEN** they can identify all required auth, database, and app URL environment variables

### Requirement: Database migrations are deployable
The system SHALL provide migration commands and validation steps suitable for production deployment.

#### Scenario: Production deploy runs migrations
- **WHEN** a production release is prepared
- **THEN** the database schema can be migrated without relying on local development state

### Requirement: Production build validates backend integration
The system SHALL run build, type, lint, test, and migration status checks before considering the backend deployable.

#### Scenario: Missing environment variable during build validation
- **WHEN** required production configuration is missing
- **THEN** validation fails with actionable output

### Requirement: Runtime boundaries are Vercel-compatible
The system SHALL keep database and auth code in Node.js-compatible runtime paths unless explicitly verified for Edge runtime.

#### Scenario: API route uses database access
- **WHEN** a route handler reads or writes database data
- **THEN** it executes in a runtime compatible with the configured database client

### Requirement: Local Kubernetes deployment is documented and scriptable
The system SHALL document and provide repeatable commands for the Docker Desktop Kubernetes deployment flow used for local deployment smoke testing.

#### Scenario: Developer deploys to local Kubernetes
- **WHEN** a developer runs the documented local Kubernetes deployment flow
- **THEN** they can build the `atomicly:local` and `atomicly-migrator:local` images, start the local Docker PostgreSQL database, apply `k8s/local`, wait for the migration job and app rollout, and open the app at `http://localhost:30080`

#### Scenario: Developer updates or restarts the local Kubernetes app
- **WHEN** a developer needs to rebuild, restart, stop, or clean up the local deployment
- **THEN** the documented commands include `npm run deploy:kube`, `npm run kube:update`, `npm run kube:restart`, `npm run kube:stop`, and `npm run kube:cleanup`
