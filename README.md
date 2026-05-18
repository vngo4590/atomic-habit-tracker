# Atomicly Habit Tracker

Atomicly is a habit tracking app inspired by Atomic Habits. It helps users design small habits, check them in daily, reflect on patterns, learn through a 36-lesson curriculum, and track identity votes over time.

The app is implemented with Next.js 16.2, React 19, TypeScript, Tailwind CSS 4, Framer Motion, Prisma, Auth.js, PostgreSQL, and the App Router. Authenticated habit, reflection, lesson, identity, and preference data is loaded from the backend and written through server actions or `/api/v1` route handlers.

## Features

- Today dashboard showing only undone habits scheduled for today, with completion stats, streaks, 30-day progress, mood check-in, toast feedback, and habit search. Stacked habits are revealed sequentially — once the first habit in a chain is done, the next appears.
- Habit library with All / Done / Upcoming tabs, check/undo circles, streaks, 30-day progress, and habit search.
- Habit detail pages with history wall, notes, contracts, editable habit-loop fields, a Stack tab for linking habits into chains, and back-button navigation.
- New habit builder using an inline Mad-Libs implementation intention sentence with schedule presets and time-block selection.
- Analytics with schedule-aware adherence stats, completion trend chart, weekday bars, and leaderboard. Metrics evaluate progress against scheduled days only, and bonus completions on unscheduled days are counted positively.
- Journal, weekly review, identity ledger, settings, onboarding, lessons, and Hall of Fame flows.
- Habit stacking: link habits into linear chains (A -> B -> C) so they appear sequentially on the Today page. Circular dependencies are prevented with clear feedback.
- Backend persistence for habits, journal entries, identity, completed lessons, formation verdicts, and user preferences, with local mirroring only for immediate appearance/onboarding UI.

## Routes

| Route | Screen |
| --- | --- |
| `/` | Today |
| `/habits` | All habits |
| `/habits/new` | Create habit |
| `/habits/[id]` | Habit detail |
| `/analytics` | Analytics |
| `/journal` | Journal |
| `/review` | Weekly review |
| `/lessons` | Daily lessons and library |
| `/hall-of-fame` | 66-day habit formation review |
| `/identity` | Identity statement and vote ledger |
| `/settings` | Account, appearance, and data controls |

## Quick Start With Docker

Prerequisites:

- Node.js 20 or newer.
- Docker Desktop or a compatible Docker engine.
- PowerShell 7 or Windows PowerShell.

Install dependencies:

```bash
npm install
```

Create a local environment file if you do not already have one:

```powershell
Copy-Item .env.example .env
```

Start local PostgreSQL in Docker, apply migrations, and seed the development account:

```powershell
npm run db:setup
```

Run the development server:

```powershell
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The local Docker database seeds a development account:

- Email: `dev@atomicly.local`
- Password: `Atomicly1!`

The local PostgreSQL container binds to host port `55432` to avoid conflicts with any PostgreSQL service already using `5432`.

## Local Database Scripts

The project includes a PowerShell database helper at `scripts/local-db.ps1`. It only runs destructive data operations against the local Docker database URL on `localhost:55432`.

Common commands:

```powershell
.\scripts\local-db.ps1 setup
.\scripts\local-db.ps1 migrate-deploy
.\scripts\local-db.ps1 migrate-dev -MigrationName add-example-field
.\scripts\local-db.ps1 seed
.\scripts\local-db.ps1 clean
.\scripts\local-db.ps1 reset
.\scripts\local-db.ps1 random-data -Users 5 -HabitsPerUser 8 -Days 45
.\scripts\local-db.ps1 randomize -CleanFirst -Force -Users 5 -HabitsPerUser 8 -Days 45
.\scripts\local-db.ps1 fake-history -CleanFirst -Force -Users 3 -HabitsPerUser 8 -Days 120
```

Equivalent npm shortcuts:

```powershell
npm run db:local
npm run db:clean
npm run db:random -- -Users 5 -HabitsPerUser 8 -Days 45
npm run db:fake-history -- -Users 3 -HabitsPerUser 8 -Days 120
```

Use the direct PowerShell command, not `npm run`, when passing switch flags such as `-CleanFirst` or `-Force`.

Script actions:

| Action | Purpose |
| --- | --- |
| `up` | Start the local PostgreSQL container. |
| `down` | Stop the Docker Compose stack. |
| `logs` | Tail local PostgreSQL logs. |
| `setup` | Start PostgreSQL, apply committed migrations, and seed the dev user. |
| `clean` | Delete all local app data after confirmation. Use `-Force` to skip the prompt. |
| `reset` | Recreate the Docker volume, apply migrations, and seed the dev user. |
| `migrate-dev` | Create/apply a new local Prisma migration. Pass `-MigrationName <name>`. |
| `migrate-deploy` | Apply committed migrations to the local database. |
| `seed` | Run `prisma/seed.ts`. |
| `random-data`, `randomize`, `randomize-data` | Generate demo users, habits, check-ins, journal entries, reviews, lessons, and formation verdicts. Use `-CleanFirst -Force` for a fresh randomized local dataset. |
| `fake-history`, `history-data` | Generate richer historical users with past habits, notes, check-ins, journals, weekly reviews, lesson progress, and formation verdicts for analytics/history testing. |

## Validation

Run a focused test file while iterating:

```bash
npm exec vitest run path/to/file.test.ts
```

Run the full deterministic unit/integration suite. This suite is designed to run without Docker, Kubernetes, network access, seeded data, or a live database:

```bash
npm exec vitest run
```

Run TypeScript and scoped linting:

```bash
npm run typecheck
npm run lint:app
```

Run a production build:

```bash
npm run build
```

Validate the local Kubernetes overlay without applying it to a cluster:

```powershell
kubectl kustomize k8s/local
```

Optional environment-dependent smoke checks:

- `npm run db:setup` starts the local Docker PostgreSQL database, applies migrations, and seeds the dev account.
- `kubectl apply -k k8s/local` applies the local Kubernetes overlay to Docker Desktop Kubernetes.
- `kubectl -n atomicly-local wait --for=condition=complete job/atomicly-migrate --timeout=120s` verifies the migration job against the host Docker PostgreSQL database.
- `kubectl -n atomicly-local rollout status deployment/atomicly-web` verifies the local Kubernetes web rollout.

The broad `npm run lint` command may include generated or reference files. Prefer `npm run lint:app` when validating app changes.

## Local Kubernetes Deployment

The repo includes a Docker Desktop-friendly Kubernetes overlay in `k8s/local/`. The current overlay defines:

| File | Resource |
| --- | --- |
| `namespace.yaml` | `atomicly-local` namespace |
| `secrets.yaml` | `atomicly-secrets` with `DATABASE_URL` and `AUTH_SECRET` |
| `migrate-job.yaml` | one-shot Prisma migration `Job` using `atomicly-migrator:local` |
| `app.yaml` | `atomicly-web` `Deployment` and NodePort `Service` |
| `kustomization.yaml` | local overlay resource list |

Kubernetes does not run PostgreSQL. The app and migration job use the local Docker Compose PostgreSQL container on the host at `host.docker.internal:55432`.

Prerequisites:

- Docker Desktop with Kubernetes enabled.
- `kubectl` configured to use the Docker Desktop context.
- Docker image builds running against the same Docker Desktop engine as the cluster.

Check the Kubernetes context:

```powershell
kubectl config get-contexts
kubectl config use-context docker-desktop
kubectl get nodes
```

Build the local images:

```powershell
docker build `
  --target runner `
  --build-arg NEXT_PUBLIC_APP_URL=http://localhost:30080 `
  --build-arg DEPLOYMENT_VERSION=local `
  -t atomicly:local .

docker build `
  --target migrator `
  -t atomicly-migrator:local .
```

Or run the full local Kubernetes deployment flow:

```powershell
npm run deploy:kube
```

Start the local Docker PostgreSQL database that the Kubernetes pods will use:

```powershell
npm run db:up
```

Apply the local Kubernetes resources:

```powershell
kubectl apply -k k8s/local
```

Wait for the migration job and app deployment:

```powershell
kubectl -n atomicly-local wait --for=condition=complete job/atomicly-migrate --timeout=120s
kubectl -n atomicly-local rollout status deployment/atomicly-web
```

Open the app:

```powershell
Start-Process http://localhost:30080
```

For local Kubernetes testing, register a new account through the UI. The Kubernetes migration job applies schema only; it does not seed the development user because `prisma/seed.ts` is intentionally blocked in production mode.

Useful inspection commands:

```powershell
kubectl -n atomicly-local get pods,svc,jobs
kubectl -n atomicly-local logs deployment/atomicly-web
kubectl -n atomicly-local logs job/atomicly-migrate
kubectl -n atomicly-local describe pod -l app.kubernetes.io/name=atomicly-web
```

Rebuild and restart the app after code changes:

```powershell
docker build `
  --target runner `
  --build-arg NEXT_PUBLIC_APP_URL=http://localhost:30080 `
  --build-arg DEPLOYMENT_VERSION=local `
  -t atomicly:local .

kubectl -n atomicly-local rollout restart deployment/atomicly-web
kubectl -n atomicly-local rollout status deployment/atomicly-web
```

Equivalent npm shortcuts:

```powershell
npm run kube:update
npm run kube:restart
npm run kube:stop
npm run kube:cleanup
```

If migrations changed, rebuild and rerun the migrator:

```powershell
docker build --target migrator -t atomicly-migrator:local .
kubectl -n atomicly-local delete job atomicly-migrate --ignore-not-found
kubectl apply -f k8s/local/migrate-job.yaml
kubectl -n atomicly-local wait --for=condition=complete job/atomicly-migrate --timeout=120s
```

Clean up the local deployment:

```powershell
kubectl delete -k k8s/local
```

Notes:

- `k8s/local/secrets.yaml` contains local-only sample secrets. Replace them before adapting these manifests for a shared or production cluster.
- Run `npm run db:up` before applying the overlay or rerunning the migration job.
- The app manifest uses `imagePullPolicy: Never`, so the cluster uses the images built locally as `atomicly:local` and `atomicly-migrator:local`.
- The app is exposed at `http://localhost:30080` through NodePort `30080`.
- Readiness and liveness probes call `/api/healthz`.
- The default app replica count is `1`. Before scaling horizontally, configure a stable `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` at build time and add shared cache coordination for Next.js revalidation/cache behavior.
- `NEXT_PUBLIC_APP_URL` is inlined at build time by Next.js, so build the image with the public URL users will open.

## Project Structure

- `app/`: Next.js App Router routes and layouts.
- `app/(root)/`: shared sidebar shell and all app screens.
- `components/`: reusable client UI components.
- `lib/`: types, helpers, lessons data, auth/db helpers, repositories, server actions, store cache logic, and unit tests.
- `scripts/`: local automation helpers, including Docker/PostgreSQL database management.
- `k8s/local/`: local Docker Desktop Kubernetes overlay for the app deployment and migration job.
- `reference_ui/`: original reference implementation used during the port.
- `Dockerfile`: multi-stage container build with `runner` and `migrator` targets.
- `docs/architecture/backend-auth-mobile.md`: backend, auth, database, and deployment architecture notes.
- `openspec/changes/settings-account-email-notifications/`: active OpenSpec change.
- `openspec/changes/archive/`: archived OpenSpec changes, including the completed reference UI port and backend/auth/mobile architecture work.
- `.agents/skills/`: canonical project-local skills shared by Claude and Codex.
- `.claude/skills/`: generated compatibility copy/link for Claude; do not edit directly.

## Data Flow

- Authenticated app routes require a valid Auth.js session and an existing database user; missing, expired, deleted, or otherwise invalid users are redirected to `/login`.
- JWT sessions expire after 1 day of inactivity.
- `app/(root)/layout.tsx` loads the user-owned backend snapshot with `getStoreSnapshot(userId, todayKey())`.
- `components/StoreProvider.tsx` and `lib/store.ts` keep an in-memory optimistic cache around server actions. They are not a browser persistence layer.
- Domain writes go through `lib/actions/domain.ts` and user-scoped repositories under `lib/repositories/`.
- Mobile-ready clients use the authenticated `/api/v1` route handlers, documented in `app/api/v1/README.md`.
- `localStorage` is limited to local UI mirrors such as `atomicly:theme`, `atomicly:accent`, and `atomicly:onboarding-seen`; it is not the source of truth for authenticated domain data.
- `lib/sample-data.ts` is retained as a development/reference fixture module only. Normal authenticated flows do not import it.

## Implementation Notes

- Screens read the authenticated backend snapshot from the root layout and issue mutations through server actions.
- Shared client state is exposed through `components/StoreProvider.tsx` and `lib/store.ts` as optimistic cache coordination.
- Date keys use local `YYYY-MM-DD` strings via `lib/helpers.ts`.
- Schedule evaluation uses `lib/schedule.ts` helpers (`isScheduledForDate`, `nextScheduledDateKey`) to determine which habits appear on a given day.
- Streaks, completion rates, and analytics charts are **schedule-aware**: unscheduled days do not break streaks, and completion rates are measured against scheduled days (bonus completions can exceed 100%). See `lib/store.ts`.
- Design tokens and reference classes live in `app/globals.css`.
- Auth pages (`/login`, `/register`) redirect already-authenticated users to the main app flow.
- The active OpenSpec change is `settings-account-email-notifications`.
- Deployment architecture specs live under `openspec/specs/deployment-architecture/`; provider choices and deployment notes are in `docs/architecture/backend-auth-mobile.md`.
