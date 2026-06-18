## ADDED Requirements

### Requirement: Edge tier MUST provide WAF, DDoS, and TLS termination at no fixed monthly cost
The production deployment SHALL terminate public TLS, inspect traffic with a Web Application Firewall, and absorb L3/L4 DDoS at the edge through a provider whose base cost is $0/mo at this project's traffic level (currently zero users). Cloudflare Free is the chosen provider; any replacement MUST meet the same security floor.

#### Scenario: A request reaches the application
- **WHEN** any HTTPS request is sent to the public application hostname
- **THEN** it is first inspected by the edge WAF (managed OWASP rule set OR equivalent custom rules covering SQLi, XSS, RFI, and known scanner user-agents) before being forwarded to the origin

#### Scenario: Repeated requests from a single IP
- **WHEN** a single source IP issues more than the configured rate-limit threshold within the configured window
- **THEN** the edge returns HTTP 429 without contacting the origin

### Requirement: Origin MUST reject any request that did not transit the chosen edge
The application origin (App Service or Container App) SHALL deny by default and accept inbound HTTPS only from the chosen edge provider, verified by **both** an IP allowlist scoped to that provider's published egress ranges AND a per-request authenticity proof (provider-issued client certificate via Authenticated Origin Pulls OR a secret header rotated at deploy time). A single layer (IP allowlist alone OR header alone) is NOT sufficient.

#### Scenario: Direct request to the origin hostname
- **WHEN** an attacker sends an HTTPS request directly to the origin's platform hostname (bypassing the edge)
- **THEN** the origin returns HTTP 403 (or TLS handshake fails) and the request is logged as an origin-bypass attempt

#### Scenario: Spoofed authenticity header from an unlisted IP
- **WHEN** a request arrives with a valid-looking authenticity header but from a source IP outside the edge provider's published ranges
- **THEN** the origin rejects the request before any application code runs

### Requirement: Compute tier MUST scale to zero when there are no in-flight requests
The application compute tier SHALL bill $0/hour for compute when no requests are being served, and SHALL automatically provision capacity within 5 seconds of an incoming request. Storage and platform fees (registry, control plane) are exempt from this requirement.

#### Scenario: No traffic for an hour
- **WHEN** the application receives no requests for at least 30 minutes
- **THEN** the compute tier is scaled to zero replicas and incurs no per-second compute charges

#### Scenario: First request after idle
- **WHEN** the first request arrives after a scale-to-zero period
- **THEN** the request completes successfully within the platform's documented cold-start window (target ≤ 5 seconds end-to-end)

### Requirement: Observability ingestion MUST be bounded by a daily cap
Log Analytics workspace ingestion SHALL be capped at a configured daily volume (default 0.2 GB/day) so that a runaway log emitter cannot generate unbounded cost. Ingestion above the cap is dropped, not deferred-billed. Retention SHALL default to 14 days.

#### Scenario: Daily cap is reached
- **WHEN** ingested log volume in the current 24h window exceeds the configured cap
- **THEN** the workspace stops accepting new log data for the remainder of the window and emits a platform-level capacity alert

#### Scenario: Routine deploy without runaway logging
- **WHEN** a normal deploy emits the usual application and platform logs
- **THEN** total daily ingestion stays below the cap and all logs are retained for at least 14 days

### Requirement: Database storage MUST be sized for actual workload, not future projections
The PostgreSQL Flexible Server SHALL be provisioned with the minimum storage tier supported (currently 20 GB) and autoGrow SHALL be disabled. A storage increase MUST be a deliberate, reviewed Bicep change rather than an automatic upgrade.

#### Scenario: Database storage approaches capacity
- **WHEN** disk usage exceeds 80% of provisioned storage
- **THEN** an operator alert fires (no silent autoGrow) so capacity decisions are explicit

### Requirement: Infrastructure cost MUST be auditable in source control
The deployment SHALL keep all cost-driving SKUs, retention windows, daily caps, and scale parameters in version-controlled Bicep files (or equivalent IaC) so that any cost increase is reviewable as a pull-request diff. Manual portal-driven SKU upgrades are NOT permitted.

#### Scenario: Operator wants to know why a bill increased
- **WHEN** the monthly invoice for the project rises unexpectedly
- **THEN** a `git log` on `infra/` shows every SKU, capacity, retention, or cap change that could plausibly explain the increase
