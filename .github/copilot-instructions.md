# Copilot Instructions

## Framework

This project uses **Next.js 16.2** (App Router), **React 19**, **TypeScript**, **Tailwind CSS 4**, **Framer Motion**, **Prisma** (PostgreSQL), and **Auth.js** (JWT sessions with credentials provider).

> **Warning:** Next.js 16.2 has breaking changes vs training data. Before editing routing, layouts, metadata, fonts, CSS, or Server/Client Components, read the relevant guide in `node_modules/next/dist/docs/`.

## Build / Test / Lint Commands

```bash
# Run a single test file
npm exec vitest run path/to/file.test.ts

# Full test suite (no Docker/network required)
npm exec vitest run

# Typecheck
npm run typecheck

# Lint (app code only — avoids generated/reference files)
npm run lint:app

# Production build, then first-load JS budget (230 KB gz per route)
npm run build
npm run bundle:check

# E2E tests (requires Playwright + running app)
npm run test:e2e

# Aggregate backend gate (prisma validate + generate + typecheck + lint:app + vitest + build + bundle:check)
npm run backend:validate

# Prisma
npm run prisma:validate
npm run prisma:generate
npm run prisma:migrate:dev      # create/apply a new local migration
npm run prisma:migrate:deploy   # apply committed migrations
```

**Note:** `npm test -- --run` does not pass flags correctly; always use `npm exec vitest run`. Prefer `npm run lint:app` over `npm run lint` (the broad lint includes generated/reference files).

## Architecture

### Data Flow

1. **Server:** `app/(root)/layout.tsx` calls `getStoreSnapshot(userId, todayKey())` (`lib/server/store-snapshot.ts`, a server-only composition root over each feature's `server` entry) to load all user data from PostgreSQL via Prisma repositories.
2. **Client:** `components/StoreProvider.tsx` + `lib/store/` (composing the per-feature `features/<name>/store.ts` slices) provide an optimistic in-memory cache around server actions. This is *not* a browser persistence layer.
3. **Mutations:** All writes go through server actions in `features/<name>/actions.ts` (or `/api/v1` route handlers for mobile/external callers) with Zod contracts in `features/<name>/contracts.ts`. Auth is the exception: `lib/actions/auth.ts` + `lib/contracts/auth.ts`. Store slices apply writes optimistically via `optimistic()` (`lib/store/optimistic.ts`), which rolls back, logs and toasts on failure.
4. **Browser localStorage** is limited to UI-only mirrors (`atomicly:theme`, `atomicly:accent`).

Backend/deployment architecture notes live in `docs/architecture/backend-auth-mobile.md`. Active and archived design proposals live under `openspec/changes/` — read the matching `tasks.md` / `design.md` / `specs/` before implementing planned OpenSpec work.

### Key Directories

- `features/<name>/` — feature slices (`habits`, `stacks`, `reflection`, `settings`, `pet`) per ADR-0001: `index.ts` (client-safe pure-model barrel), `actions.ts`, `contracts.ts`, `store.ts` (client slice), `server.ts` + `server/` repositories, `model/` pure logic (no React/Prisma/I/O), `ui/` components and their CSS Modules. Other code imports a feature only via `@/features/<name>`, `/actions`, `/server`, `/store`, `/contracts` or `/ui` (ESLint-enforced). Import Zod schemas via `@/features/<name>/contracts`; never re-export contracts from `index.ts` (it drags Zod into every client bundle — check with `npm run bundle:report`).
- `lib/repositories/users.ts` — remaining shared Prisma data access (auth users).
- `lib/actions/auth.ts` — auth/account server actions (login, register, logout, profile, password change).
- `lib/contracts/` — auth Zod schemas (`auth.ts`) and shared primitives (`primitives.ts`).
- `lib/store/` — Client store composition root (`index.ts` exports `useStore`/`StoreState`), shared `optimistic()` mutation helper, and toast state. Per-feature slices live in `features/<name>/store.ts`; schedule-aware metrics (streak, completionRate) come from `@/features/habits`.
- `features/habits/model/schedule.ts` — Scheduling helpers; unscheduled days don't break streaks.
- `components/ui/` — design-system primitives (`Button`, `Card`, `Field`, `Tabs`, `EmptyState`, …) imported from `@/components/ui`.
- `components/nav/` — sidebar, mobile top/tab bars, hub `SectionTabs`, and Alt+Shift keyboard shortcuts.
- `components/motion/` — Reusable Framer Motion primitives (`FadeIn`, `StaggerContainer`, `HoverLift`, etc.) built on `m.*` inside `LazyMotion` (`MotionProvider.tsx`); never import `motion` from `framer-motion`.
- `lib/animations.ts` — Shared spring presets, easing curves, and variants.

### Auth

- `auth.ts` at repo root exports `auth`, `signIn`, `signOut` via NextAuth v5 beta.
- JWT strategy with `PrismaAdapter`. Custom credential validation in `lib/auth/credentials.ts`.
- Auth guard helpers: `lib/auth/session.ts` → `requireUserId()` / `requireCurrentUser()`.

### Logging

- Server-side: `lib/logger.ts` (structured, with redaction via `lib/logger-redact.ts`).
- Client-side: `lib/logger-client.ts` (dev-only).
- Never use raw `console.log` in app code.

## Conventions

### Styling

- Global styles are modular partials in `app/styles/` imported by `app/globals.css`.
- Design system: light and dark themes only; use semantic tokens from `app/styles/tokens.css` and primitives from `@/components/ui` (see the `atomic-habit-design-system` skill).
- Per-component: a colocated `Foo.module.css` (e.g. `components/ui/`, `features/<name>/ui/**`). Route files are thin; page UI and its CSS live in the feature's `ui/` folder.
- **No inline `style={{}}`** for static layout/colour. Allowed only for dynamic CSS-variable passthrough or Framer Motion animation values.

### Code Organization

- `@/` path alias maps to repo root.
- Add `"use client"` only when client APIs are actually needed.
- Keep files under ~300 lines; split into sub-components when they grow.
- SOLID + GRASP principles apply across multi-file changes.

### Commits & Branches

- Branch per task: `feat/`, `fix/`, `refactor/`, `docs/`, `test/`, `chore/`.
- Conventional Commits prefixes. One logical change per commit.
- Validate before push: tests → typecheck → build → bundle:check. GitHub Actions is intentionally disabled at the repo level, so this gate runs locally.

## Local Development

```powershell
# Start local PostgreSQL + apply migrations + seed dev user
npm run db:setup

# Dev server
npm run dev

# Dev credentials: dev@atomicly.local / Atomicly1!
```

Local PostgreSQL runs on port **55432** (not 5432) to avoid conflicts.

## Testing Notes

- Unit/integration tests run without Docker or network — they mock Prisma at the boundary.
- When stubbing `localStorage` in tests, use `Object.defineProperty(window, "localStorage", ...)` per file to avoid cross-worker leaks.

## Project Skills

Project-local skills live under `.agents/skills/` and are shared by all agents. Read `.agents/skills/atomic-habit-workflow/SKILL.md` at the start of any non-trivial session. Edit skills only inside `.agents/skills/`; every `SKILL.md` must start with YAML frontmatter (`--- name: ... description: ... ---`) or the loader silently drops it.
