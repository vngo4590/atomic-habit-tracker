# Atomicly Habit Tracker

Atomicly is a habit tracking app inspired by Atomic Habits. It helps users design small habits, check them in daily, reflect on patterns, and track identity votes over time.

The app is implemented with Next.js 16.2, React 19, TypeScript, Tailwind CSS 4, Framer Motion, Prisma, Auth.js, PostgreSQL, and the App Router. Authenticated habit, reflection, lesson, identity, and preference data is loaded from the backend and written through server actions or `/api/v1` route handlers.

## Features

- Today dashboard showing only undone habits scheduled for today, with completion stats, streaks, 30-day progress, mood check-in, toast feedback, and habit search.
- Habit library with All / Done / Upcoming tabs, check/undo circles, streaks, 30-day progress, and habit search.
- Habit detail pages with history wall, notes, contracts, editable habit-loop fields, and back-button navigation.
- New habit builder using an inline Mad-Libs implementation intention sentence with schedule presets and time-block selection.
- Analytics with schedule-aware adherence stats, completion trend chart, weekday bars, and leaderboard. Metrics evaluate progress against scheduled days only, and bonus completions on unscheduled days are counted positively.
- Journal, weekly review, identity ledger, settings, onboarding, and Hall of Fame flows.
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
| `/hall-of-fame` | 66-day habit formation review |
| `/pet` | Pet Ecosystem — adopt, feed, and evolve procedural pixel pets by completing habits |
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
- `app/(root)/`: shared sidebar shell and all app screens. Each route has a co-located `page.module.css` for page-specific styles.
- `app/styles/`: modular global stylesheet partials (see "Styles & Design Tokens" below).
- `app/globals.css`: thin entry point that `@import`s the modular partials in cascade order.
- `components/`: reusable client UI components. Each non-trivial component has a co-located `Component.module.css` next to it.
- `lib/`: types, helpers, auth/db helpers, repositories, server actions, store cache logic, and unit tests.
- `scripts/`: local automation helpers, including Docker/PostgreSQL database management.
- `k8s/local/`: local Docker Desktop Kubernetes overlay for the app deployment and migration job.
- `reference_ui/`: original reference implementation used during the port.
- `Dockerfile`: multi-stage container build with `runner` and `migrator` targets.
- `docs/architecture/backend-auth-mobile.md`: backend, auth, database, and deployment architecture notes.
- `docs/architecture/security.md`: security architecture — threat model, app + infra controls (CSP, rate limiting, timing-safe auth, Front Door WAF, origin lockdown, Postgres TLS), and residual risks.
- `openspec/changes/`: active OpenSpec changes.
- `openspec/changes/archive/`: archived OpenSpec changes, including the completed reference UI port and backend/auth/mobile architecture work.
- `.agents/skills/`: project-local skills shared by all agents.

## Styles & Design Tokens

The styling layer is intentionally modular. There is **no monolithic global stylesheet** and **no inline `style={{...}}` for static layout or colour values**.

| Layer | Location | Purpose |
| --- | --- | --- |
| Design tokens | `app/styles/tokens.css` | CSS variables for colours, fonts, shadows, transitions; light + dark theme. |
| Element baseline | `app/styles/base.css` | Reset, `<body>` baseline, scrollbar styling. |
| Typography | `app/styles/typography.css` | `.h1`/`.h2`/`.h3`, `.lede`, `.markdown-body`, text helpers. |
| App shell | `app/styles/layout.css` | `.app` grid, sidebar, brand, `.main`, `.page-header`. |
| Component classes | `app/styles/components.css` | `.card`, `.btn`, `.input`, `.chip`, `.habit-row`, `.loop`, `.principle-*`, `.stack-*`, etc. |
| Animations | `app/styles/animations.css` | `@keyframes` + animation utility classes (`.fade-up`, `.skeleton`, `.glass`, `.focus-ring`). |
| Theme variants | `app/styles/themes.css` | `[data-theme-variant="glass\|neon\|fairy\|stars"]` token overrides driven by the theme registry in `lib/themes.ts`. |
| Responsive | `app/styles/responsive.css` | Mobile (`max-width: 900px`) and tablet (`901–1180px`) overrides. |
| Per-component | `components/*.module.css` | Locally-scoped CSS Module next to the component. |
| Per-page | `app/(root)/*/page.module.css` | Locally-scoped CSS Module next to the page. |

`app/globals.css` is a thin entry file that `@import`s the partials in cascade order (Tailwind preflight → tokens → base → typography → layout → components → animations → themes → responsive).

**Selectable themes.** `lib/themes.ts` is the registry of named themes (Bright, Midnight, Glass, Neon, Fairy, Starlight). The Settings → Appearance gallery lets users pick a theme and a custom accent hue. The selection is persisted as a UI-only `localStorage` mirror under `atomicly:theme-variant` (the base light/dark mode still persists server-side via the `theme` preference) and applied as a `data-theme-variant` attribute on `<html>`. A pre-hydration inline script in `app/layout.tsx` applies the stored theme before paint to avoid a flash. Each theme can declare a signature click effect rendered by `components/ClickFX.tsx` (pure particle logic in `lib/click-fx.ts`).

**Pet Ecosystem.** The `/pet` tab is a procedural, evolving, mortal Tamagotchi world. Instead of a fixed roster, every creature is generated deterministically from a genome — a random `seed` plus the `temperament` the user picks at adoption — so two players who both choose "Fiery" still get visibly different pets. The pure engine lives under `lib/pet/`: `genome.ts` (seeded PRNG + temperaments), `sprite.ts` (bilateral-symmetry pixel-art generator), `evolution.ts` (egg → hatchling → juvenile → adult → elder stages that reveal new seed-derived features), `simulation.ts` (real-time satiety/health decay with **permanent death**), `mood.ts` (mood + Framer Motion idle animation), `food.ts` (the food economy), and `age.ts` (friendly age labels). Pets are persisted in PostgreSQL (`Pet` + `PetFeedLog` models) through `lib/repositories/pets.ts`, mutated via `lib/actions/pets.ts`, and loaded by `getStoreSnapshot`. Each card shows the pet's **age** and **lifetime feeds**, and a **Release** button (with a confirm prompt) removes any pet.

Rules that make raising a pet meaningful:

- **Feed power.** Completing a habit grants **3 feeds**; every reflective act — a Journal entry, a habit journal note, or a saved Weekly Review — grants **1** (`lib/pet/food.ts`, `earnedFoodFrom`).
- **Survival.** Decay is gentle: **one feed per day keeps any pet alive** (even the hungriest temperament). Neglect empties satiety, then drains health over ~4 days to permanent death.
- **Shared daily pool.** `availableFood = earnedToday − feedsUsedToday`, spent across all pets via the feed stepper.
- **Caps.** At most **3 alive pets** at once, and only **one adoption per calendar month** — but **releasing a pet immediately frees that month's slot**, so a delete-then-adopt works instantly.

`components/pet/MoodSprite.tsx` wraps `components/pet/PixelSprite.tsx` with mood-driven idle loops; all 8 moods (`dead`, `sick`, `hungry`, `sleeping`, `content`, `happy`, `excited`, `inLove`) are reachable from satiety/health/recency/time-of-day. Adding/applying the schema requires a running local Postgres (`npm run db:setup`, or `npm run prisma:migrate:deploy` against a configured database).

**Inline `style={{}}` is reserved for dynamic CSS-variable passthrough** (e.g. `style={{ "--mood-color": item.color }}`) so a generic module class can theme against per-data values. Every such usage is documented inline.

See `.agents/skills/atomic-habit-workflow/SKILL.md` for the full styling convention.

## Implementation Notes

- Screens read the authenticated backend snapshot from the root layout and issue mutations through server actions.
- Shared client state is exposed through `components/StoreProvider.tsx` and `lib/store.ts` as optimistic cache coordination.
- Date keys use local `YYYY-MM-DD` strings via `lib/helpers.ts`.
- Schedule evaluation uses `lib/schedule.ts` helpers (`isScheduledForDate`, `nextScheduledDateKey`) to determine which habits appear on a given day.
- Streaks, completion rates, and analytics charts are **schedule-aware**: unscheduled days do not break streaks, and completion rates are measured against scheduled days (bonus completions can exceed 100%). See `lib/store.ts`.
- Design tokens live in `app/styles/tokens.css`; component classes live in `app/styles/components.css`; everything is re-imported by `app/globals.css`.
- Component-level and page-level styles are co-located CSS Modules; the design system follows SOLID + GRASP principles documented in `.agents/skills/atomic-habit-workflow/SKILL.md`.
- Auth pages (`/login`, `/register`) redirect already-authenticated users to the main app flow.
- The active OpenSpec change is `settings-account-email-notifications`.
- Deployment architecture specs live under `openspec/specs/deployment-architecture/`; provider choices and deployment notes are in `docs/architecture/backend-auth-mobile.md`.
- Security controls (CSP nonce, security headers, rate limiting, same-origin CSRF guard, and timing-safe auth) are enforced in `proxy.ts` + `lib/security/*`; edge protection is Azure Front Door + WAF with the App Service origin locked to the Front Door. See `docs/architecture/security.md`.
