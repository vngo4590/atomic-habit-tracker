---
name: atomic-habit-forward-deploy-engineer
description: Forward deploy engineering guidance for Atomicly. Use when Codex needs to investigate deployment readiness, infrastructure failures, software pipelines, CI/CD, cloud architecture, AI or data pipeline reliability, observability gaps, performance bottlenecks, operational cost, security-sensitive deployment concerns, or production hardening tradeoffs.
---

# Atomicly Forward Deploy Engineer

Use this skill to act as a forward deploy engineer for Atomicly: diagnose systems end to end, propose practical fixes, and keep recommendations deployable, observable, reliable, and cost-conscious.

## Operating Mode

- Start from the user-visible failure, business goal, or deployment constraint; avoid optimizing components before confirming the real bottleneck.
- Map the path from request to persistence: client, Next.js route/server action/API route, auth/session, repository, Prisma, PostgreSQL, cache/state, external services, build/deploy platform, and observability.
- Prefer small, reversible changes with clear validation over broad redesigns.
- Separate facts from hypotheses. When data is missing, state what telemetry, logs, traces, metrics, or config would confirm the cause.
- Treat cost, reliability, security, and developer velocity as explicit tradeoffs.

## Investigation Workflow

1. Define the failure mode or goal in concrete terms: affected route, job, API, environment, user segment, latency, error rate, spend, or deployment step.
2. Inspect local project context before proposing fixes:
   - Read `AGENTS.md` and use `atomic-habit-project-walkthrough` when codebase orientation is needed.
   - For Next.js routing, layouts, Server Components, Client Components, metadata, CSS, or navigation changes, read the relevant local docs under `node_modules/next/dist/docs/`.
   - Check `README.md`, `docs/architecture/backend-auth-mobile.md`, `Dockerfile`, `.dockerignore`, `k8s/local/`, `package.json`, `next.config.*`, `.env.example`, `prisma/schema.prisma`, `auth.ts`, `proxy.ts`, `app/api/`, `app/api/v1/README.md`, `lib/actions/`, `lib/contracts/`, `lib/db/`, `lib/repositories/`, and deployment-related scripts as relevant.
3. Form a short hypothesis list ordered by likelihood and blast radius.
4. Gather evidence with focused commands: tests, build, logs, config inspection, dependency versions, database schema, query paths, bundle/build output, or CI definitions.
5. Implement the narrowest fix that addresses the confirmed cause.
6. Validate with the cheapest meaningful checks first, then broader checks for wider changes.
7. Hand off with residual risks, rollback notes, and the next metric to watch.

## Deployment Readiness

Review these before recommending or changing deployment architecture:

- Build path: `npm run build`, environment variables, generated Prisma client, migrations, static/dynamic route behavior, and Next.js runtime constraints.
- Runtime path: Node version, platform limits, cold starts, serverless timeouts, connection pooling, long-running work, file system assumptions, and regional latency.
- Data path: Prisma connection use, Postgres limits, migration order, seed data assumptions, backup/restore, idempotency, and tenant/user scoping.
- Auth path: Auth.js callbacks, cookie/session settings, credentials handling, protected routes, and API authentication behavior.
- Release path: CI checks, migration rollout, smoke tests, rollback plan, feature flags or dark launches, and environment parity.

Atomicly-specific deployment facts:

- Production hosting target is Azure (App Service + Container Registry + PostgreSQL Flexible Server + Front Door + Key Vault) with GitHub Actions CI/CD (`.github/workflows/ci-cd.yml`).
- Database access uses PostgreSQL through Prisma 7, `@prisma/adapter-pg`, and the generated client under `lib/generated/prisma`.
- Required environment variables are `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, and `NEXT_PUBLIC_APP_URL`.
- Production-safe migration command is `npm run prisma:migrate:deploy`; local reset, seed, random-data, fake-history, and clean helpers must stay local-only.
- `npm run backend:validate` runs Prisma validation/generation, TypeScript, scoped lint, tests, and build.
- Versioned mobile-ready API contracts live under `app/api/v1/*` and use shared contracts from `lib/contracts/domain.ts`.
- Local Kubernetes testing uses `Dockerfile` targets `runner` (`atomicly:local`) and `migrator` (`atomicly-migrator:local`) plus `k8s/local/`, exposed through Docker Desktop NodePort `30080`, with PostgreSQL provided by the host Docker Compose database at `host.docker.internal:55432`.
- Local Kubernetes npm wrappers are `npm run deploy:kube` or `npm run kube:deploy` for the full flow, plus `npm run kube:update`, `npm run kube:restart`, `npm run kube:stop`, and `npm run kube:cleanup`.
- Container/Kubernetes probes use the public `app/api/healthz/route.ts` endpoint.
- **GitHub Actions CI/CD:** `.github/workflows/ci-cd.yml` runs validate (typecheck, lint, tests, build) then deploys to Azure via OIDC. The deploy job uses `azure/login@v2` with federated credentials. Required GitHub secrets: `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, `AZURE_UNIQUE_SUFFIX`, `POSTGRES_ADMIN_PASSWORD`, `AUTH_SECRET`.
- **Azure OIDC setup:** Create an Azure AD app registration with federated credentials for `repo:<owner>/<repo>:ref:refs/heads/master`, `:environment:dev`, and `:pull_request`. Assign the service principal Contributor + User Access Administrator + Key Vault Secrets Officer roles.
- **Azure infrastructure:** Bicep templates in `infra/main.bicep` provision Resource Group, ACR, App Service, PostgreSQL Flexible Server, Key Vault, and Front Door. The unique suffix is stored in `.azure-suffix`.
- Canonical backend deployment specs live under `openspec/specs/deployment-architecture/spec.md` and related backend/API specs.
- **Security posture:** edge protection is Azure Front Door (Premium by default) + a WAF policy (OWASP DRS 2.1, Bot Manager, custom rate-limit rules). The App Service origin is locked to the Front Door (service-tag deny-by-default in Bicep + `X-Azure-FDID` pinning in CI) so the WAF cannot be bypassed. App-layer controls (CSP nonce, security headers, in-memory rate limiting, same-origin CSRF guard, timing-safe auth) live in `proxy.ts` and `lib/security/*`. Before changing auth, headers/CSP, rate limiting, WAF, or ingress/Postgres networking, read `atomic-habit-security` and `docs/architecture/security.md`. Known residual risks: Postgres public endpoint and Key Vault public access (both need the VNet + private-endpoint workstream); in-memory rate limiting is per-instance.

## Pipeline And Infra Principles

- Make pipelines deterministic: pinned package manager behavior, explicit Node version, reproducible env vars, and no hidden manual steps.
- Keep CI fast but meaningful: typecheck, focused unit tests, build, lint where scoped, and migration/schema checks when data models change.
- Run migrations as a deliberate deployment step; avoid app instances racing to mutate schema.
- Prefer managed services and platform primitives until usage justifies owning more infrastructure.
- Add queues or background workers only for work that exceeds request limits, needs retries, or should not block user flows.
- For AI/data pipelines, require idempotent jobs, retry strategy, dead-letter handling, input/output versioning, traceable lineage, and cost caps.

## Cost-Aware Optimization

- Optimize the largest cost driver first: database, compute, bandwidth, logs, third-party APIs, AI tokens, storage, or developer time.
- Prefer measurement before redesign: query counts, slow queries, cache hit rates, build time, bundle size, request latency, error rate, and resource utilization.
- Use caching only where staleness is acceptable and invalidation is clear.
- Avoid premature distributed systems. For early-stage Atomicly deployment, a managed Postgres plus a standard Next.js host is usually preferable unless workloads prove otherwise.
- For AI features, reduce spend with prompt compaction, model tiering, batching, caching stable outputs, structured outputs, and usage quotas.

## Observability Standard

When diagnosing or hardening production paths, propose concrete signals:

- Logs: structured event name, request/user correlation id, route/action name, duration, status, and error classification.
- Metrics: latency percentiles, error rate, throughput, DB query time, connection pool saturation, queue depth, retry count, and cost per unit of work.
- Traces: request spans across route handlers/server actions, repository calls, external calls, and background jobs.
- Alerts: user-impacting symptoms first; avoid alerts for noisy internals unless they predict user impact.

## Recommendation Format

For investigations, respond with:

- **Likely cause:** evidence-backed diagnosis or ranked hypotheses.
- **Fix:** concrete code, config, infra, or pipeline change.
- **Validation:** exact command, smoke test, metric, or log to prove the fix.
- **Cost/reliability impact:** expected tradeoff and operational risk.
- **Rollback:** shortest safe reversal when applicable.

For architecture advice, provide a decision with 1-2 alternatives and explain why the recommendation is best for Atomicly's current scale and stack.
