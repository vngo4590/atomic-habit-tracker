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

# Production build
npm run build

# E2E tests (requires Playwright + running app)
npm run test:e2e

# Aggregate backend gate (prisma validate + generate + typecheck + lint:app + vitest + build)
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

1. **Server:** `app/(root)/layout.tsx` calls `getStoreSnapshot(userId, todayKey())` to load all user data from PostgreSQL via Prisma repositories.
2. **Client:** `components/StoreProvider.tsx` + `lib/store.ts` provide an optimistic in-memory cache around server actions. This is *not* a browser persistence layer.
3. **Mutations:** All writes go through server actions in `lib/actions/` (or `/api/v1` route handlers for mobile/external callers) with Zod contracts in `lib/contracts/`.
4. **Browser localStorage** is limited to UI-only mirrors (`atomicly:theme`, `atomicly:accent`, `atomicly:theme-variant`).

Backend/deployment architecture notes live in `docs/architecture/backend-auth-mobile.md`. Active and archived design proposals live under `openspec/changes/` — read the matching `tasks.md` / `design.md` / `specs/` before implementing planned OpenSpec work.

### Key Directories

- `lib/repositories/` — Prisma data access (one file per entity).
- `lib/actions/` — Server actions that validate via contracts and call repositories.
- `lib/contracts/` — Zod schemas for action inputs.
- `lib/store.ts` — Client-side optimistic state and schedule-aware metrics (streak, completionRate).
- `lib/schedule.ts` — Scheduling helpers; unscheduled days don't break streaks.
- `components/motion/` — Reusable Framer Motion primitives (`FadeIn`, `StaggerContainer`, `HoverLift`, etc.).
- `lib/animations.ts` — Shared spring presets, easing curves, and variants.

### Auth

- `auth.ts` at repo root exports `auth`, `signIn`, `signOut` via NextAuth v5 beta.
- JWT strategy with `PrismaAdapter`. Custom credential validation in `lib/auth/credentials.ts`.
- Auth guard helper: `lib/auth/require-user.ts` → `requireUserId()`.

### Logging

- Server-side: `lib/logger.ts` (structured, with redaction via `lib/logger-redact.ts`).
- Client-side: `lib/logger-client.ts` (dev-only).
- Never use raw `console.log` in app code.

## Conventions

### Styling

- Global styles are modular partials in `app/styles/` imported by `app/globals.css`.
- Per-component: `components/Foo.module.css`. Per-page: `app/(root)/route/page.module.css`.
- **No inline `style={{}}`** for static layout/colour. Allowed only for dynamic CSS-variable passthrough or Framer Motion animation values.

### Code Organization

- `@/` path alias maps to repo root.
- Add `"use client"` only when client APIs are actually needed.
- Keep files under ~300 lines; split into sub-components when they grow.
- SOLID + GRASP principles apply across multi-file changes.

### Commits & Branches

- Branch per task: `feat/`, `fix/`, `refactor/`, `docs/`, `test/`, `chore/`.
- Conventional Commits prefixes. One logical change per commit.
- Validate before push: tests → typecheck → build.

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
