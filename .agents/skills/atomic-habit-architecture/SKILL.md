---
name: atomic-habit-architecture
description: Canonical map of the Atomicly codebase — project tree, request/data flow from auth to database, and a key-files table. Use when locating where a feature lives, deciding where to add new code, or tracing how a user action propagates from the browser through server actions, repositories, Prisma, and Postgres.
---

# Atomicly Architecture

> **TL;DR:** App Router under `app/`. Authenticated screens load a `getStoreSnapshot(userId, todayKey())` snapshot in `app/(root)/layout.tsx` and wrap it in `StoreProvider`. All writes go through feature server actions (`features/<name>/actions.ts`) → feature repositories (`features/<name>/server/`) → Prisma.

## 1. Project Structure

Atomicly is a **modular monolith** (ADR-0001, `docs/architecture/adr/0001-modular-monolith-feature-slices.md`): business capabilities live in feature slices under `features/`, `lib/` is a shared kernel with no business rules, and `app/` routes are thin.

```
app/
  (auth)/          # Login/register pages
  (root)/          # All authenticated screens; share the nav shell
    layout.tsx     # Loads backend snapshot, wraps MotionProvider + StoreProvider + Nav
    page.tsx       # Today — thin; renders TodayView from @/features/habits/ui
    habits/        # /habits, /habits/new, /habits/[id]
    analytics/  hall-of-fame/   # Insights hub (layout.tsx renders SectionTabs)
    journal/    review/         # Reflect hub (layout.tsx renders SectionTabs)
    pet/  identity/  settings/
  api/v1/          # REST API for mobile/external clients (habits, reflection, session, export)
  api/healthz/     # Public health endpoint for containers/Kubernetes probes
  api/auth/        # NextAuth handlers
  styles/          # Global CSS partials (tokens, base, typography, layout, components, animations, responsive)

features/<name>/   # habits | stacks | reflection | settings | pet
  index.ts         # Public pure-model barrel (client-safe; NEVER re-exports contracts)
  model/           # Pure domain logic — no React, Prisma, server/ or actions (ESLint-enforced)
  server/          # Prisma repositories (*.repository.ts) + mappers
  server.ts        # Server-only barrel over server/
  actions.ts       # "use server" actions: validate contracts, requireUserId, call repositories
  contracts.ts     # Zod schemas (import via @/features/<name>/contracts)
  store.ts         # Client store slice (useXSlice) composed by lib/store
  ui/              # Feature UI + CSS Modules (index.ts barrel), e.g. habits/ui/{today,library,new,detail,insights,schedule}
  __tests__/       # Action/store/model tests (plus server/__tests__, ui/__tests__)

components/        # Shared app-shell + cross-feature UI (StoreProvider, Toast, Modal, AuthForm,
                   # AppearanceSync, OnboardingGate/Overlay, HelpTip, LineChart, NotesManager, ...)
  ui/              # Design-system primitives — import from @/components/ui (atomic-habit-design-system)
  nav/             # nav-items.ts, Sidebar, MobileNav, SectionTabs, useNavShortcuts
  motion/          # MotionProvider (LazyMotion) + m-based primitives (FadeIn, StaggerContainer, ...)
lib/               # Shared kernel
  actions/auth.ts  # Auth/account server actions (the only server actions left in lib/)
  contracts/       # auth.ts (auth schemas) + primitives.ts (dateKeySchema, stringListSchema)
  repositories/    # users.ts (auth user queries)
  server/          # store-snapshot.ts -> getStoreSnapshot (server-only composition root)
  store/           # index.ts (useStore composes feature slices), optimistic.ts, toast.ts, default-snapshot.ts
  auth/  db/  security/  api/  hooks/   # session/credentials, Prisma client, proxy primitives, HTTP helpers, hooks
  generated/prisma/# Generated Prisma 7 client output
  animations.ts    # Shared Framer Motion presets, easings, durations, variants
  themes.ts  appearance.ts  # Light/dark theme list + legacy mapping; apply theme/accent to <html>
  date-keys.ts  helpers.ts  types.ts  logger*.ts  revalidate-app.ts  sample-data.ts
  test/            # Shared deterministic test fixtures and helpers

prisma/            # schema.prisma, migrations/, seed.ts
scripts/           # local-db.ps1, local-kube.ps1, measure-bundle.mjs + tests
e2e/               # Playwright end-to-end specs and auth setup
docs/architecture/ # backend-auth-mobile.md, security.md, revamp-baseline.md, adr/0001-0003
design-system/atomicly/MASTER.md  # Design-system source of truth
infra/             # Azure Bicep templates and deployment scripts
k8s/local/         # Docker Desktop Kubernetes manifests
.agents/skills/    # Project-local skills (edit here)
```

### Import rules (`eslint.config.mjs`)

- Outside a feature, import it **only** through `@/features/<name>` (pure model), `/actions`, `/server`, `/store`, `/contracts` or `/ui`. Deep imports (`@/features/habits/model/metrics`) and relative paths that climb into another feature are lint errors.
- `features/*/model/**` may not import `react`, `server-only`, `pg`, `@prisma/*`, db/repositories/generated, any `server`, or any `actions` — keep it pure and unit-testable. Across features it may only use another feature's `index`, `/contracts`, `/actions`, `/server` entry points.
- Inside a feature, use relative imports (e.g. actions import repositories via `./server`).
- Server-side dependencies between features stay one-way (e.g. stacks → habits; the stack-link validator lives in `features/habits/server/`).
- Never re-export `contracts.ts` (Zod) from `index.ts`: it added ~64 KB gz to every route. `npm run bundle:check` enforces a 230 KB gz first-load budget.
- Import `m` (not `motion`) from `framer-motion`.
- `features/**` and `components/ui/**` files are capped at 300 lines (`max-lines`, blanks/comments excluded).
- Tests (`__tests__/`, `*.test.*`, `e2e/`) are exempt from the import restrictions.
## 2. Data Flow

1. **Auth gate**: `proxy.ts` uses Auth.js session state and `lib/auth/routes.ts` to redirect unauthenticated protected routes to `/login`. All `app/(root)/` screens then call `requireCurrentUser()` / `requireUserId()` (`lib/auth/session.ts`), which verifies the JWT maps to an existing DB user and redirects missing/expired/deleted users to `/login`. JWT sessions expire after 1 day via `SESSION_MAX_AGE_SECONDS`.
2. **Reverse auth gate**: `/login` and `/register` are server components that call `auth()` from `@/auth`; if signed in, they redirect to `/` (or a validated `callbackUrl`).
3. **Backend snapshot**: `app/(root)/layout.tsx` fetches the full user-scoped snapshot via `getStoreSnapshot(userId, todayKey())` (`lib/server/store-snapshot.ts`, a server-only composition root over each feature's `server` entry) and passes it to `StoreProvider`.
4. **Optimistic cache**: `components/StoreProvider.tsx` + `lib/store/index.ts` maintain an in-memory optimistic store composed from per-feature slices (`features/<name>/store.ts`). Mutations go through `optimistic()` in `lib/store/optimistic.ts` (apply, call action, reconcile, or roll back + toast + log on failure). Overlapping writes are guarded by per-item ownership: check-in claims (`features/habits/store-check-ins.ts`), stack `linkOwner` (`features/stacks/store.ts`) and per-field preference versions (`features/settings/store.ts`), so a slow response never overwrites a newer change.
5. **Domain writes**: Habit mutations go through `features/habits/actions.ts`, stack mutations through `features/stacks/actions.ts`, journal/identity/review/lesson mutations through `features/reflection/actions.ts`, preferences and backup import through `features/settings/actions.ts`, and pet mutations through `features/pet/actions.ts`. Each calls user-scoped repository functions in `features/<name>/server/*.repository.ts` (`lib/repositories/users.ts` remains for auth only). See the import rules in § 1.
6. **Mobile/API clients**: Use authenticated `/api/v1/` route handlers with stable `{ ok, data }` / `{ ok, error }` envelopes (see `app/api/v1/README.md`).
7. **Appearance sync**: `components/AppearanceSync.tsx` applies backend `preferences.theme` and `preferences.accentHue` via `lib/appearance.ts`.
8. **localStorage**: Only used for `atomicly:theme` and `atomicly:accent` (the retired `atomicly:theme-variant` key is read once and mapped to light/dark) — UI mirrors only, **never** source of truth for domain data.

## 3. Routes

Navigation (`components/nav/nav-items.ts`): Today, Habits, Reflect (`/journal` + `/review` tabs), Insights (`/analytics` + `/hall-of-fame` tabs), Pet, and Settings via the avatar; Alt+Shift+key shortcuts. `/reflect` → `/journal` and `/insights` → `/analytics` redirect in `next.config.ts`. Page UI lives in the owning feature's `ui/` folder.

| Route | Screen |
|---|---|
| `/` | Today (`features/habits/ui/today/`) — focus list of undone habits scheduled for today, collapsible "Completed (n)" with undo, identity votes, quiet insights; first-run / rest-day / all-done empty states; stacked habits render as `StackCardGroup`; habit search across all habits |
| `/habits` | Habit library (`features/habits/ui/library/`) — All / Done today / Upcoming tabs; check/undo circles; search and sort by streak, rate, newest, or name |
| `/habits/new` | New habit builder (`features/habits/ui/new/`) — inline Mad-Libs sentence with schedule presets and time-block selection |
| `/habits/[id]` | Habit detail (`features/habits/ui/detail/`) with Overview reveal panels for the 4 laws and habit loop, plus journal/history/notes/contracts/**Stack** tabs |
| `/analytics` | Adherence stats and charts (`features/habits/ui/insights/`) |
| `/journal` | Journal entries (`features/reflection/ui/journal/`) |
| `/review` | Weekly review (`features/reflection/ui/review/`) with current review display/edit, top-five past summaries, paged archive |
| `/hall-of-fame` | 66-day formation review (`features/habits/ui/insights/`) |
| `/pet` | Pet Ecosystem (`features/pet/ui/`) — see `atomic-habit-pet-ecosystem` |
| `/identity` | Click-to-edit identity statement, core values, and vote ledger (`features/reflection/ui/identity/`) |
| `/settings` | Account, appearance (light/dark + accent), preferences, and data controls (`features/settings/ui/`) |

## 4. Key Files

| File | Purpose |
|---|---|
| `lib/types.ts` | All shared TypeScript interfaces |
| `prisma/schema.prisma` | Database schema |
| `features/habits/` | Habits slice: `model/` (schedule, metrics, habit-cap, habit-sentence), `contracts.ts`, `actions.ts`, `server/` repositories (habits, check-ins, notes/contract, formation verdicts) |
| `features/stacks/` | Stacks slice: `model/` (stack helpers, `StackError`), `contracts.ts`, `actions.ts`, `server/stacks.repository.ts` |
| `features/reflection/` | Reflection slice: `contracts.ts`, `actions.ts`, `server/` (journal, weekly-review, identity, lessons repositories) |
| `features/settings/` | Settings slice: preferences + backup — `model/backup-envelope.ts` (contract), `model/backup-export.ts` (`buildBackup`), `server/backup-import*.ts` (`mergeBackup`), `actions.ts` (`savePreferencesAction`, `importDataAction`) |
| `lib/server/store-snapshot.ts` | `getStoreSnapshot` — server-only composition root used by the layout and export route |
| `features/<name>/contracts.ts` | Zod contracts shared by actions and API (shared primitives in `lib/contracts/primitives.ts`) |
| `lib/api/http.ts` | Stable API response/error helpers for `/api/v1` |
| `lib/store/index.ts` | Optimistic cache composition root (`useStore`, `StoreState`, `defaultSnapshot`) |
| `lib/store/optimistic.ts` | Shared optimistic-mutation helper (rollback, toast, client log) |
| `features/<name>/store.ts` | Client store slice per feature (client-only entry point; not re-exported from `index.ts`) |
| `components/StoreProvider.tsx` | React context wrapper for the store |
| `app/(root)/layout.tsx` | Snapshot load, provider setup |
| `auth.ts` | NextAuth config (credentials provider, JWT+session callbacks) |
| `proxy.ts` | Auth.js-backed route protection redirect layer |
| `lib/auth/register.ts` | Account creation logic |
| `features/habits/model/schedule.ts` | Schedule parsing — see `atomic-habit-schedule-metrics` |
| `features/stacks/model/stack.ts` / `stack-errors.ts` | Habit stack helpers — see `atomic-habit-habit-stacking` |
| `features/pet/model/` / `features/pet/server/` | Procedural pet engine + persistence — see `atomic-habit-pet-ecosystem` |
| `lib/animations.ts` | Shared Framer Motion presets — see `atomic-habit-ui-animation` |
| `components/ui/` / `components/nav/` / `app/styles/tokens.css` | Design system primitives, navigation, tokens — see `atomic-habit-design-system` |
| `eslint.config.mjs` | Feature-boundary, pure-model, `m`-only and `max-lines` rules |
| `scripts/measure-bundle.mjs` | `npm run bundle:check` first-load JS budget |
| `features/*/server/` | Prisma data access |
| `lib/logger.ts` / `lib/logger-client.ts` | Structured logging — see `atomic-habit-logging` |
| `docs/architecture/backend-auth-mobile.md` | Provider choices, Vercel notes, migration safety |
| `Dockerfile` / `k8s/local/` | Container build + local Kubernetes overlay |
| `AGENTS.md` | Agent-specific instructions |

## 5. Conventions referenced elsewhere

- **Local dev commands** → `atomic-habit-local-dev`
- **Styling / CSS modules** → `atomic-habit-css-conventions`
- **Design system (tokens, themes, primitives, nav, a11y)** → `atomic-habit-design-system`
- **SOLID + GRASP** → `atomic-habit-design-principles`
- **Tests** → `atomic-habit-test-engineer` and its sub-skills
- **Logging** → `atomic-habit-logging`
- **Schedule metrics** → `atomic-habit-schedule-metrics`
- **Habit stacking** → `atomic-habit-habit-stacking`
- **Pet ecosystem** → `atomic-habit-pet-ecosystem`
- **Security (auth, CSP, WAF, rate limiting, origin lockdown)** → `atomic-habit-security`

## 6. Reading Next.js docs before editing routing/layouts

Before editing routing, layout, metadata, Server/Client components, or navigation, read the relevant guide in `node_modules/next/dist/docs/`. This project uses Next.js 16.2 which has breaking API changes from earlier versions.
