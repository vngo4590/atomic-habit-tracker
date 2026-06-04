---
name: atomic-habit-project-walkthrough
description: Top-level orientation index for the Atomicly habit tracker codebase. Use when a new joiner (human or AI agent) needs the lay of the land — what the app does, the stack, the routes, and which atomic sub-skill owns each detailed area (architecture, local dev, schedule metrics, habit stacking, CSS, testing, logging, deployment). Also use to answer "how does X work?", "where is Y?", or "what's the convention for Z?" by routing to the right sub-skill.
---

# Atomicly — Project Walkthrough

> **TL;DR:** This file is an **orientation index**. For details, follow the links to the atomic sub-skill that owns each area.

## What Is Atomicly?

Atomicly is a backend-backed habit practice app inspired by *Atomic Habits*. Users design habits using the habit loop framework (cue → craving → response → reward), check in daily, journal, reflect weekly, vote on their identity, and work through a 36-lesson curriculum. The app uses a PostgreSQL backend with Auth.js / NextAuth authentication; all authenticated habit domain data lives in the database.

**Stack:** Next.js 16.2.4 (App Router), React 19.2.4, TypeScript, Tailwind CSS 4, Framer Motion 12, Prisma 7.8 with `@prisma/adapter-pg`, Auth.js / NextAuth v5 beta, PostgreSQL, Docker (local dev), Vitest, Playwright (E2E).

## Quick start

```bash
npm install
npm run db:setup   # starts Docker postgres, runs migrations, seeds dev account
npm run dev
```

Dev credentials: `dev@atomicly.local` / `Atomicly1!`. Local Postgres binds to **port 55432**.

For **all** local dev commands (DB lifecycle, seed/demo data, validation, kube overlay) → see **`atomic-habit-local-dev`**.

## Sub-skill index

| Topic | Sub-skill |
|---|---|
| Project tree, data flow, routes, key files | **`atomic-habit-architecture`** |
| Local setup, DB scripts, validation commands | **`atomic-habit-local-dev`** |
| Schedule-aware metrics (streak, completionRate) | **`atomic-habit-schedule-metrics`** |
| Habit stacking (linked-list, mutations, UI) | **`atomic-habit-habit-stacking`** |
| Styling (CSS Modules, partials, inline-style policy) | **`atomic-habit-css-conventions`** |
| SOLID + GRASP design rules | **`atomic-habit-design-principles`** |
| Animation primitives and patterns | **`atomic-habit-ui-animation`** |
| Logging conventions and redaction | **`atomic-habit-logging`** |
| Test quality bar | **`atomic-habit-test-quality-standard`** |
| Test tier policy and orchestration | **`atomic-habit-test-tier-policy`** |
| Test edge-case checklist | **`atomic-habit-test-edge-cases`** |
| Test mocking patterns + jsdom/ESM gotchas | **`atomic-habit-test-mocking-patterns`** |
| Overall test engineering | **`atomic-habit-test-engineer`** |
| Forward-deploy / production / infra | **`atomic-habit-forward-deploy-engineer`** |
| Branch / commit / push workflow | **`atomic-habit-workflow`** |
| Pre-push validation gate | **`atomic-habit-pre-push-checklist`** |

## Routes (one-line summary)

| Route | Screen |
|---|---|
| `/` | Today dashboard — undone habits scheduled today; stacks render as `StackCardGroup` |
| `/habits` | Habit library — All / Done / Upcoming tabs; search + sort |
| `/habits/new` | New habit builder (Mad-Libs sentence, schedule presets) |
| `/habits/[id]` | Habit detail (Overview / journal / history / notes / contracts / Stack tabs) |
| `/analytics` | Adherence stats and charts |
| `/journal` | Journal entries |
| `/review` | Weekly review (current + archive) |
| `/hall-of-fame` | 66-day formation review |
| `/identity` | Identity statement, core values, vote ledger |
| `/settings` | Account, appearance, data controls |

Full route descriptions and the data-flow diagram live in **`atomic-habit-architecture`**.

## OpenSpec workflow

The project uses OpenSpec to track planned changes. Before implementing any planned feature:

1. Check `openspec/changes/` for an existing change.
2. Read `tasks.md` in the change directory for the implementation checklist.
3. Mark tasks complete only after code AND validation are done.

Current OpenSpec state:

- Active in-progress changes:
  - `openspec/changes/enhanced-habit-stacking/` — Habit-stack linked-list data model, Stack tab on habit detail, Apple Wallet-style stack cards on Today, and Playwright E2E setup. All `tasks.md` items checked; ready to archive.
  - `openspec/changes/settings-account-email-notifications/` — Real account data, email verification, email-change confirmation flow, and transactional notification emails.
- Archived changes (`openspec/changes/archive/`):
  - `2026-04-29-port-reference-ui/` — Reference UI port.
  - `2026-05-11-backend-auth-mobile-architecture/` — Backend, auth, and mobile-API architecture.
  - `2026-05-12-add-unit-integration-tests/` — Unit and integration test coverage.
- Canonical specs in `openspec/specs/`: `analytics-screen`, `app-shell`, `backend-data-model`, `create-habit`, `deployment-architecture`, `design-tokens`, `habit-api`, `habit-detail`, `habit-store`, `habits-list`, `hall-of-fame`, `identity-screen`, `journal-screen`, `mobile-bridge-readiness`, `onboarding`, `reflection-api`, `responsive-app-shell`, `settings-screen`, `test-coverage`, `today-screen`, `user-auth`, `weekly-review`.

To propose / implement / archive a change use `openspec-propose`, `openspec-apply-change`, `openspec-archive-change`.

## Key conventions (one-liners — see linked sub-skill for detail)

- **Next.js 16.2** has breaking changes from earlier versions. Before editing routing / layouts / metadata / fonts / CSS / Server or Client Components, read the relevant guide in `node_modules/next/dist/docs/`.
- **Server vs Client**: `"use client"` only when browser APIs or React client-only hooks are needed. Page and layout files default to Server Components.
- **Server actions** live in `lib/actions/`; auth actions in `lib/actions/auth.ts`. Domain mutations always flow `action → repository → Prisma`.
- **Date keys**: use helpers in `lib/helpers.ts` (`todayKey()`) and `lib/date-keys.ts`. Never `new Date().toISOString()` as a user-local habit day.
- **Path alias**: `@/` maps to repo root.
- **Prisma 7**: generates client into `lib/generated/prisma`; app code imports from `@/lib/generated/prisma/client`. Singleton at `lib/db/client.ts`. Never edit migration SQL files by hand.
- **Skills**: edit only under `.agents/skills/` — single shared location. All project-specific skills use the `atomic-habit-` prefix.

## Notes

This file used to be a 30 KB monolith. It is now a router. If you find yourself adding more than a one-line summary here, the content probably belongs in the relevant sub-skill instead (or in a new one — see `atomic-habit-skill-editor`).
