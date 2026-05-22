---
name: atomic-habit-project-walkthrough
description: Complete orientation guide for the Atomicly habit tracker codebase. Use when a new joiner (human or AI agent) needs to understand the project — what it does, how it's structured, where things live, how data flows, and how to contribute. Also use when answering "how does X work?", "where is Y?", or "what's the convention for Z?" questions about this repo.
---

# Atomicly — Project Walkthrough

## What Is Atomicly?

Atomicly is a backend-backed habit practice app inspired by *Atomic Habits*. Users design habits using the habit loop framework (cue -> craving -> response -> reward), check in daily, journal, reflect weekly, vote on their identity, and work through a 36-lesson curriculum. The app uses a PostgreSQL backend with Auth.js/NextAuth authentication; all authenticated habit domain data lives in the database.

**Stack:** Next.js 16.2.4 (App Router), React 19.2.4, TypeScript, Tailwind CSS 4, Framer Motion 12, Prisma 7.8 with `@prisma/adapter-pg`, Auth.js/NextAuth v5 beta, PostgreSQL, Docker (local dev), Vitest, Playwright (E2E).

---

## Getting Started (Local Dev)

```bash
npm install
npm run db:setup   # starts Docker postgres, runs migrations, seeds dev account
npm run dev
```

Dev credentials: `dev@atomicly.local` / `Atomicly1!`

The local Postgres container binds to **port 55432** (not 5432) to avoid conflicts.

Local database helper:

```bash
.\scripts\local-db.ps1 setup
.\scripts\local-db.ps1 migrate-deploy
.\scripts\local-db.ps1 clean
.\scripts\local-db.ps1 reset
.\scripts\local-db.ps1 migrate-dev -MigrationName add-example-field
.\scripts\local-db.ps1 random-data -Users 5 -HabitsPerUser 8 -Days 45
.\scripts\local-db.ps1 randomize -CleanFirst -Force -Users 5 -HabitsPerUser 8 -Days 45
.\scripts\local-db.ps1 fake-history -CleanFirst -Force -Users 3 -HabitsPerUser 8 -Days 120
```

The helper is guarded for the local Docker database URL on `localhost:55432`. Use it for local cleanup, migration deployment, and configurable demo data generation. `randomize`/`randomize-data` are aliases for `random-data`; `fake-history`/`history-data` create richer past habits, notes, check-ins, journals, weekly reviews, lesson progress, and formation verdicts. Pass `-CleanFirst -Force` when a fresh local test dataset is needed. Use the direct PowerShell helper, not `npm run`, when passing switch flags such as `-CleanFirst` or `-Force`.

Validation commands:

```bash
npm run test:run             # unit/integration tests (Vitest)
npm run test:e2e             # end-to-end tests (Playwright)
npm run typecheck            # TypeScript
npm run lint:app             # scoped lint for app/components/lib/scripts
npm run build                # production build
npm run prisma:migrate:status # local migration status check
npm run backend:validate     # Prisma, TypeScript, lint, tests, and build
```

Local Kubernetes (Docker Desktop) helper at `scripts/local-kube.ps1`:

```bash
npm run kube:deploy          # build images and apply k8s/local manifests
npm run kube:update          # rebuild app image and roll the deployment
npm run kube:restart         # restart the deployment pods
npm run kube:stop            # scale the deployment to zero
npm run kube:cleanup         # delete the local namespace and images
```

---

## Project Structure

```
app/
  (auth)/          # Login/register pages
  (root)/          # All authenticated app screens share sidebar layout
    layout.tsx     # Root layout: loads backend snapshot, wraps StoreProvider
    page.tsx       # Today dashboard
    habits/        # /habits, /habits/new, /habits/[id]
    analytics/     # /analytics
    journal/       # /journal
    review/        # /review (weekly review)
    lessons/       # /lessons
    hall-of-fame/  # /hall-of-fame
    identity/      # /identity
    settings/      # /settings
  api/v1/          # REST API for mobile/external clients (habits, reflection, session)
  api/healthz/     # Public health endpoint for containers/Kubernetes probes
  api/auth/        # NextAuth handlers

components/        # Reusable client UI components
  motion/          # Framer Motion primitives (FadeIn, SlideIn, HoverLift, etc.)
  StackCardGroup.tsx  # Apple Wallet-style stacked habit card group (Today page)
  StackDiagram.tsx    # Horizontal stack chain diagram (habit detail Stack tab)
lib/
  actions/         # Server actions (domain.ts, auth.ts)
  api/             # API response helpers
  animations.ts    # Shared Framer Motion presets, easings, durations, variants
  auth/            # credentials, register, password, session helpers
  contracts/       # Zod validation contracts shared by server actions and API
  db/              # Prisma client singleton (client.ts, config.ts)
  generated/prisma/# Generated Prisma 7 client output
  hooks/           # Shared React hooks (e.g., useMotionReduced)
  repositories/    # User-scoped DB queries (habits.ts, reflection.ts, users.ts)
  date-keys.ts     # UTC/local date-key conversion helpers
  types.ts         # All shared TypeScript types
  store.ts         # In-memory optimistic cache (StoreState)
  stack.ts         # Habit-stack linked-list helpers and patches
  schedule.ts      # Schedule parsing and date-checking utilities
  helpers.ts       # Date key utils, formatting
  lessons-data.ts  # Static 36-lesson curriculum
  sample-data.ts   # Sample/demo data fixtures
  test/            # Shared deterministic test fixtures and helpers

prisma/
  schema.prisma    # All models (User, Habit, HabitCheckIn, JournalEntry, etc.)
  migrations/      # Committed migration SQL files
  seed.ts          # Dev account + initial data seed
scripts/
  __tests__/       # Regression tests for local-db and local-k8s helpers
  local-db.ps1     # Local Docker Postgres helper (setup, cleanup, migrations, demo data)
  local-kube.ps1   # Local Docker Desktop Kubernetes helper (deploy, update, restart, stop, cleanup)
  sync-agent-skills.ps1
  README.md        # How to run local scripts and database helpers
e2e/               # Playwright end-to-end specs and auth fixtures
docs/
  architecture/backend-auth-mobile.md # Provider choices, Vercel notes, migration safety
infra/             # Azure Bicep templates and deployment scripts (cloud target)
k8s/
  local/           # Docker Desktop Kubernetes manifests for local testing
docker-compose.yml # Local Postgres + app compose stack
Dockerfile         # Multi-stage Next standalone runner and Prisma migrator image
.dockerignore      # Docker build-context exclusions
playwright.config.ts
vitest.config.mts

.agents/skills/    # Canonical project-local skills (edit here)
.claude/skills/    # Auto-generated symlink — DO NOT edit directly
```

---

## Routes

| Route | Screen |
|---|---|
| `/` | Today dashboard — shows only undone habits scheduled for today; stacked habits render as Apple Wallet-style `StackCardGroup` with expand/collapse; solo cards show check circle, name+identity, streak, 30-day progress; habit search across all habits |
| `/habits` | Habit library — All / Done / Upcoming tabs; check/undo circles; search and sort by streak, rate, newest, or name |
| `/habits/new` | New habit builder — inline Mad-Libs sentence with schedule presets and time-block selection |
| `/habits/[id]` | Habit detail with Overview reveal panels for the 4 laws and habit loop, plus journal/history/notes/contracts/**Stack** tabs (Stack tab renders the `StackDiagram` chain visualization with link/unlink controls); back button uses `router.back()` |
| `/analytics` | Adherence stats and charts |
| `/journal` | Journal entries |
| `/review` | Weekly review with current review display/edit, top-five past review summaries, and paged archive |
| `/lessons` | 36-lesson curriculum |
| `/hall-of-fame` | 66-day formation review |
| `/identity` | Click-to-edit identity statement, core values, and vote ledger |
| `/settings` | Account, appearance, and data controls (profile fetches real user name from `/api/v1/session`) |

---

## Data Flow

1. **Auth gate:** `proxy.ts` uses Auth.js session state and `lib/auth/routes.ts` to redirect unauthenticated protected routes to `/login`. All `app/(root)/` screens then call `requireCurrentUser()` / `requireUserId()` (from `lib/auth/session.ts`), which verifies the Auth.js JWT maps to an existing database user and redirects missing, expired, deleted, or otherwise invalid users to `/login`. JWT sessions expire after 1 day of inactivity via `SESSION_MAX_AGE_SECONDS`.
2. **Reverse auth gate:** `/login` and `/register` are server components that call `auth()` from `@/auth`. If `session.user` exists, they redirect to `/` (or a validated `callbackUrl`) so signed-in users never see the auth forms.
3. **Backend snapshot:** `app/(root)/layout.tsx` fetches the full user-scoped snapshot via `getStoreSnapshot(userId, todayKey())` and passes it to `StoreProvider`.
4. **Optimistic cache:** `components/StoreProvider.tsx` + `lib/store.ts` maintain an in-memory optimistic store. Mutations hit server actions immediately and the store updates before the server round-trip.
5. **Domain writes:** All habit/journal/identity mutations go through `lib/actions/domain.ts` which calls user-scoped repository functions in `lib/repositories/`.
6. **Mobile/API clients:** Use authenticated `/api/v1/` route handlers with stable `{ ok, data }` / `{ ok, error }` envelopes (see `app/api/v1/README.md`).
7. **Appearance sync:** `components/AppearanceSync.tsx` applies backend `preferences.theme` and `preferences.accentHue` globally through `lib/appearance.ts`.
8. **localStorage:** Only used for `atomicly:theme`, `atomicly:accent`, `atomicly:onboarding-seen` — UI mirrors only, NOT source of truth for domain data.

---

## Key Conventions

### Reading Next.js docs before editing routing/layouts
Before editing routing, layout, metadata, Server/Client components, or navigation, read the relevant guide in `node_modules/next/dist/docs/`. This project uses Next.js 16.2 which has breaking API changes from earlier versions.

### Server vs Client components
- Use `"use client"` only when browser APIs or React client-only hooks are needed.
- Page files (`page.tsx`) and layout files default to Server Components.
- Components that need `useState`, `useEffect`, or event handlers require `"use client"`.

### Server actions
- All domain mutations are server actions in `lib/actions/domain.ts`.
- Auth actions are in `lib/actions/auth.ts`.
- Server actions use the `"use server"` directive.

### Date keys
All habit-day references use local `YYYY-MM-DD` strings generated by helpers in `lib/helpers.ts` (e.g., `todayKey()`) or timezone-aware helpers in `lib/date-keys.ts` where UTC/local conversion matters. Do not use `new Date().toISOString()` as a user-local habit day.

### TypeScript paths
`@/` maps to the repo root (`tsconfig.json`). Always use `@/` imports for cross-directory references.

### Prisma
- Prisma 7 generates the client into `lib/generated/prisma`; application code imports `PrismaClient` from `@/lib/generated/prisma/client`.
- `lib/db/client.ts` creates the singleton Prisma client with `@prisma/adapter-pg` and `getDatabaseUrl()` from `lib/db/config.ts`.
- Edit `prisma/schema.prisma` then run `npm run prisma:migrate:dev -- --name <description>` or `.\scripts\local-db.ps1 migrate-dev -MigrationName <description>` to create a migration.
- Never edit migration SQL files by hand.
- The client is a singleton at `lib/db/client.ts`.

### Skills
- Edit skills only under `.agents/skills/`.
- After changes run `.\scripts\sync-agent-skills.ps1` to sync to `.claude/skills/`.
- All project-specific skills use the `atomic-habit-` prefix.

---

## Key Files to Know

| File | Purpose |
|---|---|
| `lib/types.ts` | All TypeScript interfaces (Habit, JournalEntry, UserPreferences, etc.) |
| `prisma/schema.prisma` | Database schema |
| `lib/actions/domain.ts` | All domain mutation server actions |
| `lib/contracts/domain.ts` | Shared Zod contracts for domain server actions and API route handlers |
| `lib/api/http.ts` | Stable API response/error helpers for `/api/v1` |
| `lib/store.ts` | Optimistic cache store definition |
| `components/StoreProvider.tsx` | React context wrapper for store |
| `components/AppearanceSync.tsx` | Applies theme/accent preferences to the document on all authenticated routes |
| `app/(root)/layout.tsx` | Root layout — snapshot load, provider setup |
| `app/(auth)/login/page.tsx` | Login route |
| `app/(auth)/register/page.tsx` | Registration route |
| `app/api/v1/README.md` | Mobile-ready API v1 route and response contract documentation |
| `app/api/healthz/route.ts` | Public health endpoint used by local Kubernetes probes |
| `app/(root)/review/page.tsx` | Weekly review editor/display plus past review archive backed by `weeklyReviews` |
| `auth.ts` | NextAuth config (credentials provider, JWT+session callbacks) |
| `proxy.ts` | Auth.js-backed route protection redirect layer |
| `app/(auth)/login/page.tsx` | Login route — redirects authenticated users to `/` or a validated `callbackUrl` |
| `app/(auth)/register/page.tsx` | Registration route — redirects authenticated users to `/` or a validated `callbackUrl` |
| `lib/auth/register.ts` | Account creation logic |
| `lib/schedule.ts` | Schedule parsing and date-checking utilities (`isScheduledForDate`, `nextScheduledDateKey`, `formatNextDayLabel`, `formatScheduleLabel`) |
| `lib/stack.ts` | Habit stack linked-list helpers: `getStackChain`, `getStackRoot`, `getSuccessor`, `wouldCreateCycle`, `stackInsertPatches`, `stackRemovePatches`, `getVisibleStackHabit`, `groupHabitsByStack` |
| `lib/animations.ts` | Shared Framer Motion presets — spring configs, easing curves, durations, variants |
| `lib/store.ts` | Schedule-aware metric calculations: `streak()`, `longestStreak()`, and `completionRate()` all respect `habit.schedule` via `isScheduledForDate` |
| `lib/repositories/habits.ts` | Habit DB queries (including `stackNextId` linked-list links) |
| `lib/repositories/reflection.ts` | Journal, weekly review, lessons DB queries |
| `components/StackCardGroup.tsx` | Apple Wallet-style stacked habit card group on Today page (expand/collapse, "+N more" overflow) |
| `components/StackDiagram.tsx` | Horizontal stack chain diagram with arrows and current-habit highlight |
| `components/motion/` | Reusable Framer Motion primitives (`FadeIn`, `SlideIn`, `HoverLift`, `ScaleOnTap`, `StaggerContainer`, `PageTransition`, `AnimatedNumber`) |
| `e2e/stack.spec.ts` | Playwright E2E test covering stack CRUD, exclusivity, and Today-page card stack interactions |
| `docs/architecture/backend-auth-mobile.md` | Provider choices, Vercel setup, migration safety, smoke checklist |
| `Dockerfile` | Multi-stage container build: `runner` for standalone Next.js, `migrator` for Prisma migrations |
| `k8s/local/` | Local Docker Desktop Kubernetes overlay: namespace, app Deployment/Service, migration Job, and local-only secrets. PostgreSQL is provided by the host Docker Compose database at `host.docker.internal:55432`. |
| `app/globals.css` | Design tokens and utility classes |
| `AGENTS.md` | Agent-specific instructions (read first before making changes) |
| `scripts/local-db.ps1` | Local Docker Postgres helper for setup, cleanup, migrations, seed, and demo data |
| `scripts/README.md` | Local script usage, examples, generated accounts, and troubleshooting |
| `scripts/__tests__/local-db.test.ts` | Regression tests for local database script command forwarding and generated fake-history content |

---

## OpenSpec Workflow

The project uses OpenSpec to track planned changes. Before implementing any planned feature:

1. Check `openspec/changes/` for an existing change.
2. Read `tasks.md` in the change directory for the implementation checklist.
3. Mark tasks complete only after code AND validation are done.

Current OpenSpec state:

- Active in-progress changes:
  - `openspec/changes/enhanced-habit-stacking/` — Habit-stack linked-list data model, Stack tab on habit detail, Apple Wallet-style stack cards on Today, and Playwright E2E setup. All `tasks.md` items are checked; ready to archive.
  - `openspec/changes/settings-account-email-notifications/` — Real account data, email verification, email-change confirmation flow, and transactional notification emails.
- Archived changes (`openspec/changes/archive/`):
  - `2026-04-29-port-reference-ui/` — Reference UI port.
  - `2026-05-11-backend-auth-mobile-architecture/` — Backend, auth, and mobile-API architecture.
  - `2026-05-12-add-unit-integration-tests/` — Unit and integration test coverage.
- Canonical specs in `openspec/specs/`: `analytics-screen`, `app-shell`, `backend-data-model`, `create-habit`, `deployment-architecture`, `design-tokens`, `habit-api`, `habit-detail`, `habit-store`, `habits-list`, `hall-of-fame`, `identity-screen`, `journal-screen`, `lessons-screen`, `mobile-bridge-readiness`, `onboarding`, `reflection-api`, `responsive-app-shell`, `settings-screen`, `test-coverage`, `today-screen`, `user-auth`, `weekly-review`.

To propose a new change: `/openspec-propose <description>`.
To implement: `/opsx:apply`.
To archive after completion: `$openspec-archive-change archive <change-name>`.

---

## Schedule-Aware Metrics

All core habit metrics in `lib/store.ts` are **schedule-aware** — they evaluate progress against the days the user actually scheduled, not against every calendar day.

### How schedules are stored
- `habit.schedule` is a plain-text string like `"Daily"`, `"Weekdays"`, `"Mon, Wed, Fri"`, or free-form text.
- `lib/schedule.ts` exports `isScheduledForDate(dateKey, schedule)` which returns `true` when the day-of-week for `dateKey` matches the parsed schedule (or `true` for free-form schedules).

### Metric behaviour

| Function | Schedule-aware rule |
|---|---|
| `streak(habit)` | Walks backward from today. Done days count. Unscheduled missed days are **skipped** (they do not break the streak). Scheduled missed days **do** break it. The old "anchor to yesterday" behaviour is preserved for daily habits. |
| `longestStreak(habit)` | Compares consecutive done dates. If the gap between them contains **only** unscheduled days, the streak continues across the gap. Any scheduled missed day in the gap resets the count. |
| `completionRate(habit, days)` | Denominator is the number of **scheduled days** in the window, not total calendar days. Bonus completions on unscheduled days can push the rate above `1.0`. Free-text schedules fall back to calendar-day counting. |

### Analytics page (`app/(root)/analytics/page.tsx`)
- **Daily completion chart**: shows `% of scheduled habits completed` on each day. Habits not scheduled for that day are excluded from the denominator.
- **Weekday breakdown**: only counts habits that were scheduled for that weekday in the 90-day lookback.

### Consequences for UI code
- Any code that calls `streak()`, `longestStreak()`, or `completionRate()` automatically respects schedules.
- If you add a new metric, use `isScheduledForDate()` from `lib/schedule.ts` to stay consistent.
- Tests for metrics should include both `"Daily"` habits (backward-compatible) and custom-schedule habits (gap-skipping, bonus days, etc.).

---

## Habit Stacking

Habit stacks are modeled as a **linked list** of habits via a self-referencing `stackNextId` field on `Habit`. Helpers live in `lib/stack.ts`.

### Data model rules
- `habit.stackNextId` is a nullable foreign key pointing to the next habit in the chain.
- **Exclusivity**: at most one habit may link to any given habit (enforced as a unique constraint on `stackNextId`).
- **No cycles**: server-side validation in habit update actions rejects any link that would form a cycle (direct or indirect). Use `wouldCreateCycle(habits, fromId, toId)` from `lib/stack.ts` before persisting a link.

### Core helpers (`lib/stack.ts`)
- `getStackRoot(habits, habitId)` — walk backward to find the chain head.
- `getStackChain(habits, rootId)` — return the ordered chain starting from a root.
- `getSuccessor(habits, habitId)` — return the habit that `habitId` links to.
- `stackInsertPatches(habits, sourceId, targetId, position)` — produce the `{id, stackNextId}` patch list to insert `source` before/after `target` while keeping the chain consistent.
- `stackRemovePatches(habits, habitId)` — produce patches to unlink a habit and reconnect its neighbors.
- `getVisibleStackHabit(habits, todayKey)` — return the first undone habit per chain for the Today screen.
- `groupHabitsByStack(habits)` — group habits by their root id for rendering.

### UI surfaces
- **Today (`/`)**: stacked chains render as `StackCardGroup` (Apple Wallet-style). Tapping expands to show the next up to 2 habits with a `+N more` overflow indicator. Solo habits continue to render as standalone cards.
- **Habit detail (`/habits/[id]`)**: a **Stack** tab renders `StackDiagram` (horizontal chain with arrows, current habit highlighted) plus link/unlink controls and inline error messaging for exclusivity/cycle violations.

---

## Testing

- Unit and deterministic integration tests live alongside their modules in `__tests__/` subdirectories under `app/`, `components/`, `lib/`, and `scripts/`.
- Shared deterministic test fixtures/helpers live under `lib/test/` for domain records, store context values, JSON route requests, and response parsing.
- Run a focused file with `npm exec vitest run path/to/file.test.ts`; run the full deterministic suite with `npm exec vitest run` (not `npm test -- --run`, which doesn't pass flags correctly).
- The default Vitest suite must not require Docker, Kubernetes, network access, seeded data, or a live database; document those checks as optional smoke tests instead.
- After changing server actions, repositories, or store logic, run the full test suite.
- **End-to-end tests** use Playwright. Specs live in `e2e/`, auth fixtures in `e2e/auth.setup.ts`, and config in `playwright.config.ts`. Run with `npm run test:e2e`. E2E tests require the dev server and seeded local database.
- Local Kubernetes manifests can be validated without applying them by running `kubectl kustomize k8s/local`; deterministic manifest assertions live in `scripts/__tests__/local-k8s.test.ts`.
- Run `npm run build` before marking any broad change complete.
- For broad backend/deployment changes, run `npm run backend:validate` when practical; it performs Prisma validation/generation, typecheck, scoped lint, tests, and build.
