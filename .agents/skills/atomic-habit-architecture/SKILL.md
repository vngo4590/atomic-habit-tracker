---
name: atomic-habit-architecture
description: Canonical map of the Atomicly codebase — project tree, request/data flow from auth to database, and a key-files table. Use when locating where a feature lives, deciding where to add new code, or tracing how a user action propagates from the browser through server actions, repositories, Prisma, and Postgres.
---

# Atomicly Architecture

> **TL;DR:** App Router under `app/`. Authenticated screens load a `getStoreSnapshot(userId, todayKey())` snapshot in `app/(root)/layout.tsx` and wrap it in `StoreProvider`. All writes go through `lib/actions/` → `lib/repositories/` → Prisma.

## 1. Project Structure

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
    hall-of-fame/  # /hall-of-fame
    identity/      # /identity
    settings/      # /settings
  api/v1/          # REST API for mobile/external clients (habits, reflection, session)
  api/healthz/     # Public health endpoint for containers/Kubernetes probes
  api/auth/        # NextAuth handlers

components/        # Reusable client UI components
  motion/          # Framer Motion primitives (FadeIn, SlideIn, HoverLift, etc.)
  StackCardGroup.tsx  # Apple-Wallet stacked habit card group (Today page)
  StackDiagram.tsx    # Stack chain diagram (habit detail Stack tab)
  Modal.tsx           # Accessible blocking dialog
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
  stack.ts         # Habit-stack linked-list helpers (cycle-safe)
  stack-errors.ts  # StackError + codes shared across repo/action/API/UI
  schedule.ts      # Schedule parsing and date-checking utilities
  helpers.ts       # Date key utils, formatting
  sample-data.ts   # Sample/demo data fixtures
  test/            # Shared deterministic test fixtures and helpers

prisma/
  schema.prisma    # All models
  migrations/      # Committed migration SQL files
  seed.ts          # Dev account + initial data seed
scripts/           # local-db.ps1, local-kube.ps1 + tests
e2e/               # Playwright end-to-end specs and auth fixtures
docs/architecture/backend-auth-mobile.md
infra/             # Azure Bicep templates and deployment scripts
k8s/local/         # Docker Desktop Kubernetes manifests
.agents/skills/    # Project-local skills (edit here)
```

## 2. Data Flow

1. **Auth gate**: `proxy.ts` uses Auth.js session state and `lib/auth/routes.ts` to redirect unauthenticated protected routes to `/login`. All `app/(root)/` screens then call `requireCurrentUser()` / `requireUserId()` (`lib/auth/session.ts`), which verifies the JWT maps to an existing DB user and redirects missing/expired/deleted users to `/login`. JWT sessions expire after 1 day via `SESSION_MAX_AGE_SECONDS`.
2. **Reverse auth gate**: `/login` and `/register` are server components that call `auth()` from `@/auth`; if signed in, they redirect to `/` (or a validated `callbackUrl`).
3. **Backend snapshot**: `app/(root)/layout.tsx` fetches the full user-scoped snapshot via `getStoreSnapshot(userId, todayKey())` and passes it to `StoreProvider`.
4. **Optimistic cache**: `components/StoreProvider.tsx` + `lib/store.ts` maintain an in-memory optimistic store. Mutations hit server actions immediately and the store updates before the server round-trip.
5. **Domain writes**: All habit/journal/identity mutations go through `lib/actions/domain.ts`, which calls user-scoped repository functions in `lib/repositories/`.
6. **Mobile/API clients**: Use authenticated `/api/v1/` route handlers with stable `{ ok, data }` / `{ ok, error }` envelopes (see `app/api/v1/README.md`).
7. **Appearance sync**: `components/AppearanceSync.tsx` applies backend `preferences.theme` and `preferences.accentHue` via `lib/appearance.ts`.
8. **localStorage**: Only used for `atomicly:theme` and `atomicly:accent` — UI mirrors only, **never** source of truth for domain data.

## 3. Routes

| Route | Screen |
|---|---|
| `/` | Today dashboard — only undone habits scheduled for today; stacked habits render as `StackCardGroup`; solo cards show check circle, name+identity, streak, 30-day progress; habit search across all habits |
| `/habits` | Habit library — All / Done / Upcoming tabs; check/undo circles; search and sort by streak, rate, newest, or name |
| `/habits/new` | New habit builder — inline Mad-Libs sentence with schedule presets and time-block selection |
| `/habits/[id]` | Habit detail with Overview reveal panels for the 4 laws and habit loop, plus journal/history/notes/contracts/**Stack** tabs |
| `/analytics` | Adherence stats and charts |
| `/journal` | Journal entries |
| `/review` | Weekly review with current review display/edit, top-five past summaries, paged archive |
| `/hall-of-fame` | 66-day formation review |
| `/identity` | Click-to-edit identity statement, core values, and vote ledger |
| `/settings` | Account, appearance, and data controls |

## 4. Key Files

| File | Purpose |
|---|---|
| `lib/types.ts` | All shared TypeScript interfaces |
| `prisma/schema.prisma` | Database schema |
| `lib/actions/domain.ts` | All domain mutation server actions |
| `lib/contracts/domain.ts` | Zod contracts shared by actions and API |
| `lib/api/http.ts` | Stable API response/error helpers for `/api/v1` |
| `lib/store.ts` | Optimistic cache store + schedule-aware metrics |
| `components/StoreProvider.tsx` | React context wrapper for the store |
| `app/(root)/layout.tsx` | Snapshot load, provider setup |
| `auth.ts` | NextAuth config (credentials provider, JWT+session callbacks) |
| `proxy.ts` | Auth.js-backed route protection redirect layer |
| `lib/auth/register.ts` | Account creation logic |
| `lib/schedule.ts` | Schedule parsing — see `atomic-habit-schedule-metrics` |
| `lib/stack.ts` / `lib/stack-errors.ts` | Habit stack helpers — see `atomic-habit-habit-stacking` |
| `lib/animations.ts` | Shared Framer Motion presets — see `atomic-habit-ui-animation` |
| `lib/repositories/habits.ts` / `reflection.ts` | Prisma data access |
| `lib/logger.ts` / `lib/logger-client.ts` | Structured logging — see `atomic-habit-logging` |
| `docs/architecture/backend-auth-mobile.md` | Provider choices, Vercel notes, migration safety |
| `Dockerfile` / `k8s/local/` | Container build + local Kubernetes overlay |
| `AGENTS.md` | Agent-specific instructions |

## 5. Conventions referenced elsewhere

- **Local dev commands** → `atomic-habit-local-dev`
- **Styling / CSS modules** → `atomic-habit-css-conventions`
- **SOLID + GRASP** → `atomic-habit-design-principles`
- **Tests** → `atomic-habit-test-engineer` and its sub-skills
- **Logging** → `atomic-habit-logging`
- **Schedule metrics** → `atomic-habit-schedule-metrics`
- **Habit stacking** → `atomic-habit-habit-stacking`

## 6. Reading Next.js docs before editing routing/layouts

Before editing routing, layout, metadata, Server/Client components, or navigation, read the relevant guide in `node_modules/next/dist/docs/`. This project uses Next.js 16.2 which has breaking API changes from earlier versions.
