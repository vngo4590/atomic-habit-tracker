# Atomicly Habit Tracker

Atomicly is a habit tracking app inspired by Atomic Habits. It helps users design small habits, check them in daily, reflect on patterns, learn through a 24-lesson curriculum, and track identity votes over time.

The app is implemented with Next.js 16.2, React 19, TypeScript, Tailwind CSS 4, Prisma, Auth.js, PostgreSQL, and the App Router. Authenticated habit, reflection, lesson, identity, and preference data is loaded from the backend and written through server actions or `/api/v1` route handlers.

## Features

- Today dashboard with grouped habits, completion stats, streaks, mood check-in, and toast feedback.
- Habit library, habit detail pages, history wall, notes, contracts, and editable habit-loop fields.
- New habit builder using an inline Mad-Libs implementation intention sentence.
- Analytics with adherence stats, completion trend chart, weekday bars, and leaderboard.
- Journal, weekly review, identity ledger, settings, onboarding, lessons, and Hall of Fame flows.
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
| `/settings` | Account, appearance, notification, and data controls |

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

Run unit tests:

```bash
npm exec vitest run
```

Run a production build:

```bash
npm run build
```

Run scoped linting for the app code:

```bash
npm exec eslint -- app components lib
```

The broad `npm run lint` command may include generated or reference files. Prefer the scoped command above when validating app changes.

## Project Structure

- `app/`: Next.js App Router routes and layouts.
- `app/(root)/`: shared sidebar shell and all app screens.
- `components/`: reusable client UI components.
- `lib/`: types, helpers, lessons data, auth/db helpers, repositories, server actions, store cache logic, and unit tests.
- `scripts/`: local automation helpers, including Docker/PostgreSQL database management.
- `reference_ui/`: original reference implementation used during the port.
- `openspec/changes/port-reference-ui/`: OpenSpec proposal, design, specs, and completed task checklist.
- `.agents/skills/`: canonical project-local skills shared by Claude and Codex.
- `.claude/skills/`: generated compatibility copy/link for Claude; do not edit directly.

## Data Flow

- Authenticated app routes require `auth()` and redirect unauthenticated users to `/login`.
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
- Design tokens and reference classes live in `app/globals.css`.
- The current OpenSpec change `port-reference-ui` is implemented through phase 25 and ready to archive.

## Backend Architecture Plan

The active backend plan lives at `openspec/changes/backend-auth-mobile-architecture/`.
Provider choices and deployment notes are documented in `docs/architecture/backend-auth-mobile.md`.
