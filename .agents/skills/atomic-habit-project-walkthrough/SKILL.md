---
name: atomic-habit-project-walkthrough
description: Complete orientation guide for the Atomicly habit tracker codebase. Use when a new joiner (human or AI agent) needs to understand the project — what it does, how it's structured, where things live, how data flows, and how to contribute. Also use when answering "how does X work?", "where is Y?", or "what's the convention for Z?" questions about this repo.
---

# Atomicly — Project Walkthrough

## What Is Atomicly?

Atomicly is a local-first habit practice app inspired by *Atomic Habits*. Users design habits using the habit loop framework (cue → craving → response → reward), check in daily, journal, reflect weekly, vote on their identity, and work through a 24-lesson curriculum. The app uses a PostgreSQL backend with NextAuth authentication; all habit domain data lives in the database.

**Stack:** Next.js 16.2 (App Router), React 19, TypeScript, Tailwind CSS 4, Prisma, Auth.js (NextAuth v5 beta), PostgreSQL, Docker (local dev), Vitest.

---

## Getting Started (Local Dev)

```bash
npm install
npm run db:setup   # starts Docker postgres, runs migrations, seeds dev account
npm run dev
```

Dev credentials: `dev@atomicly.local` / `Atomicly1!`

The local Postgres container binds to **port 55432** (not 5432) to avoid conflicts.

Validation commands:

```bash
npm exec vitest run          # unit tests
npm run build                # production build
npm exec eslint -- app components lib  # scoped lint (prefer over npm run lint)
```

---

## Project Structure

```
app/
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
  login/ register/ # Auth pages (unauthenticated)

components/        # Reusable client UI components
lib/
  actions/         # Server actions (domain.ts, auth.ts)
  auth/            # credentials, register, password, session helpers
  db/              # Prisma client singleton
  repositories/    # User-scoped DB queries (habits.ts, reflection.ts, users.ts)
  types.ts         # All shared TypeScript types
  store.ts         # In-memory optimistic cache (StoreState)
  helpers.ts       # Date key utils, formatting
  lessons-data.ts  # Static 24-lesson curriculum

prisma/
  schema.prisma    # All models (User, Habit, HabitCheckIn, JournalEntry, etc.)
  migrations/      # Committed migration SQL files

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
| `/habits/[id]` | Habit detail / history wall |
| `/analytics` | Adherence stats and charts |
| `/journal` | Journal entries |
| `/review` | Weekly review |
| `/lessons` | 24-lesson curriculum |
| `/hall-of-fame` | 66-day formation review |
| `/identity` | Identity statement + vote ledger |
| `/settings` | Account, appearance, notifications, data |

---

## Data Flow

1. **Auth gate:** All `app/(root)/` screens call `requireUserId()` (from `lib/auth/session.ts`), which redirects unauthenticated users to `/login`.
2. **Backend snapshot:** `app/(root)/layout.tsx` fetches the full user-scoped snapshot via `getStoreSnapshot(userId, todayKey())` and passes it to `StoreProvider`.
3. **Optimistic cache:** `components/StoreProvider.tsx` + `lib/store.ts` maintain an in-memory optimistic store. Mutations hit server actions immediately and the store updates before the server round-trip.
4. **Domain writes:** All habit/journal/identity mutations go through `lib/actions/domain.ts` which calls user-scoped repository functions in `lib/repositories/`.
5. **Mobile/API clients:** Use authenticated `/api/v1/` route handlers (see `app/api/v1/README.md`).
6. **localStorage:** Only used for `atomicly:theme`, `atomicly:accent`, `atomicly:onboarding-seen` — UI mirrors only, NOT source of truth for domain data.

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
All date references use local `YYYY-MM-DD` strings generated by helpers in `lib/helpers.ts` (e.g., `todayKey()`). Never use `new Date().toISOString()` for date keys.

### TypeScript paths
`@/` maps to the repo root (`tsconfig.json`). Always use `@/` imports for cross-directory references.

### Prisma
- Edit `prisma/schema.prisma` then run `prisma migrate dev --name <description>` to create a migration.
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
| `lib/store.ts` | Optimistic cache store definition |
| `components/StoreProvider.tsx` | React context wrapper for store |
| `app/(root)/layout.tsx` | Root layout — snapshot load, provider setup |
| `auth.ts` | NextAuth config (credentials provider, JWT+session callbacks) |
| `lib/auth/register.ts` | Account creation logic |
| `lib/repositories/habits.ts` | Habit DB queries |
| `lib/repositories/reflection.ts` | Journal, weekly review, lessons DB queries |
| `app/globals.css` | Design tokens and utility classes |
| `AGENTS.md` | Agent-specific instructions (read first before making changes) |

---

## OpenSpec Workflow

The project uses OpenSpec to track planned changes. Before implementing any planned feature:

1. Check `openspec/changes/` for an existing change.
2. Read `tasks.md` in the change directory for the implementation checklist.
3. Mark tasks complete only after code AND validation are done.

To propose a new change: `/openspec-propose <description>`
To implement: `/opsx:apply`

---

## Testing

- Unit tests live alongside their modules in `__tests__/` subdirectories under `lib/`.
- Run `npm exec vitest run` (not `npm test -- --run`, which doesn't pass flags correctly).
- After changing server actions, repositories, or store logic, run the full test suite.
- Run `npm run build` before marking any broad change complete.
