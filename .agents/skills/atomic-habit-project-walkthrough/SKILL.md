---
name: atomic-habit-project-walkthrough
description: Complete orientation guide for the Atomicly habit tracker codebase. Use when a new joiner (human or AI agent) needs to understand the project — what it does, how it's structured, where things live, how data flows, and how to contribute. Also use when answering "how does X work?", "where is Y?", or "what's the convention for Z?" questions about this repo.
---

# Atomicly — Project Walkthrough

## What Is Atomicly?

Atomicly is a backend-backed habit practice app inspired by *Atomic Habits*. Users design habits using the habit loop framework (cue -> craving -> response -> reward), check in daily, journal, reflect weekly, vote on their identity, and work through a 24-lesson curriculum. The app uses a PostgreSQL backend with Auth.js/NextAuth authentication; all authenticated habit domain data lives in the database.

**Stack:** Next.js 16.2.4 (App Router), React 19.2.4, TypeScript, Tailwind CSS 4, Prisma 7.8 with `@prisma/adapter-pg`, Auth.js/NextAuth v5 beta, PostgreSQL, Docker (local dev), Vitest.

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
npm run test:run             # unit/integration tests
npm run typecheck            # TypeScript
npm run lint:app             # scoped lint for app/components/lib/scripts
npm run build                # production build
npm run prisma:migrate:status # local migration status check
npm run backend:validate     # Prisma, TypeScript, lint, tests, and build
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
  api/v1/          # REST API for mobile/external clients
  api/auth/        # NextAuth handlers

components/        # Reusable client UI components
lib/
  actions/         # Server actions (domain.ts, auth.ts)
  api/             # API response helpers
  auth/            # credentials, register, password, session helpers
  contracts/       # Zod validation contracts shared by server actions and API
  db/              # Prisma client singleton
  generated/prisma/# Generated Prisma 7 client output
  repositories/    # User-scoped DB queries (habits.ts, reflection.ts, users.ts)
  date-keys.ts     # UTC/local date-key conversion helpers
  types.ts         # All shared TypeScript types
  store.ts         # In-memory optimistic cache (StoreState)
  helpers.ts       # Date key utils, formatting
  lessons-data.ts  # Static 24-lesson curriculum

prisma/
  schema.prisma    # All models (User, Habit, HabitCheckIn, JournalEntry, etc.)
  migrations/      # Committed migration SQL files
scripts/
  __tests__/local-db.test.ts
  local-db.ps1     # Local Docker Postgres helper for setup, cleanup, migrations, demo data
  README.md        # How to run local scripts and database helpers
  sync-agent-skills.ps1
docs/
  architecture/backend-auth-mobile.md # Provider choices, Vercel notes, migration safety

.agents/skills/    # Canonical project-local skills (edit here)
.claude/skills/    # Auto-generated symlink — DO NOT edit directly
```

---

## Routes

| Route | Screen |
|---|---|
| `/` | Today dashboard |
| `/habits` | Habit library |
| `/habits/new` | New habit builder |
| `/habits/[id]` | Habit detail with Overview reveal panels for the 4 laws and habit loop, plus journal/history/notes tabs |
| `/analytics` | Adherence stats and charts |
| `/journal` | Journal entries |
| `/review` | Weekly review with current review display/edit, top-five past review summaries, and paged archive |
| `/lessons` | 24-lesson curriculum |
| `/hall-of-fame` | 66-day formation review |
| `/identity` | Click-to-edit identity statement, core values, and vote ledger |
| `/settings` | Account, appearance, notifications, data |

---

## Data Flow

1. **Auth gate:** `proxy.ts` uses Auth.js session state and `lib/auth/routes.ts` to redirect unauthenticated protected routes to `/login`. All `app/(root)/` screens then call `requireCurrentUser()` / `requireUserId()` (from `lib/auth/session.ts`), which verifies the Auth.js JWT maps to an existing database user and redirects missing, expired, deleted, or otherwise invalid users to `/login`. JWT sessions expire after 1 day of inactivity via `SESSION_MAX_AGE_SECONDS`.
2. **Backend snapshot:** `app/(root)/layout.tsx` fetches the full user-scoped snapshot via `getStoreSnapshot(userId, todayKey())` and passes it to `StoreProvider`.
3. **Optimistic cache:** `components/StoreProvider.tsx` + `lib/store.ts` maintain an in-memory optimistic store. Mutations hit server actions immediately and the store updates before the server round-trip.
4. **Domain writes:** All habit/journal/identity mutations go through `lib/actions/domain.ts` which calls user-scoped repository functions in `lib/repositories/`.
5. **Mobile/API clients:** Use authenticated `/api/v1/` route handlers with stable `{ ok, data }` / `{ ok, error }` envelopes (see `app/api/v1/README.md`).
6. **Appearance sync:** `components/AppearanceSync.tsx` applies backend `preferences.theme` and `preferences.accentHue` globally through `lib/appearance.ts`.
7. **localStorage:** Only used for `atomicly:theme`, `atomicly:accent`, `atomicly:onboarding-seen` — UI mirrors only, NOT source of truth for domain data.

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
| `app/(root)/review/page.tsx` | Weekly review editor/display plus past review archive backed by `weeklyReviews` |
| `auth.ts` | NextAuth config (credentials provider, JWT+session callbacks) |
| `proxy.ts` | Auth.js-backed route protection redirect layer |
| `lib/auth/register.ts` | Account creation logic |
| `lib/repositories/habits.ts` | Habit DB queries |
| `lib/repositories/reflection.ts` | Journal, weekly review, lessons DB queries |
| `docs/architecture/backend-auth-mobile.md` | Provider choices, Vercel setup, migration safety, smoke checklist |
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

- `openspec/changes/settings-account-email-notifications/` is the active in-progress change.
- `openspec/changes/archive/2026-04-29-port-reference-ui/` contains the archived reference UI port.
- `openspec/changes/archive/2026-05-11-backend-auth-mobile-architecture/` contains the archived backend/auth/mobile architecture change.
- `openspec/specs/` now contains canonical specs synced from the archived backend/auth/mobile change: `backend-data-model`, `deployment-architecture`, `habit-api`, `mobile-bridge-readiness`, `reflection-api`, `responsive-app-shell`, and `user-auth`.

To propose a new change: `/openspec-propose <description>`.
To implement: `/opsx:apply`.
To archive after completion: `$openspec-archive-change archive <change-name>`.

---

## Testing

- Unit tests live alongside their modules in `__tests__/` subdirectories under `lib/`.
- Run `npm exec vitest run` (not `npm test -- --run`, which doesn't pass flags correctly).
- After changing server actions, repositories, or store logic, run the full test suite.
- Run `npm run build` before marking any broad change complete.
- For broad backend/deployment changes, run `npm run backend:validate` when practical; it performs Prisma validation/generation, typecheck, scoped lint, tests, and build.
