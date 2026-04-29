# Atomicly Habit Tracker

Atomicly is a local-first habit tracking app inspired by Atomic Habits. It helps users design small habits, check them in daily, reflect on patterns, learn through a 24-lesson curriculum, and track identity votes over time.

The app is implemented with Next.js 16.2, React 19, TypeScript, Tailwind CSS 4, and the App Router. It does not use a backend; all user data is stored in browser `localStorage`.

## Features

- Today dashboard with grouped habits, completion stats, streaks, mood check-in, and toast feedback.
- Habit library, habit detail pages, history wall, notes, contracts, and editable habit-loop fields.
- New habit builder using an inline Mad-Libs implementation intention sentence.
- Analytics with adherence stats, completion trend chart, weekday bars, and leaderboard.
- Journal, weekly review, identity ledger, settings, onboarding, lessons, and Hall of Fame flows.
- Persistent local state for habits, journal entries, identity, completed lessons, formation verdicts, theme, and accent preference.

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

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

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
- `lib/`: types, helpers, sample data, lessons data, store logic, and unit tests.
- `reference_ui/`: original reference implementation used during the port.
- `openspec/changes/port-reference-ui/`: OpenSpec proposal, design, specs, and completed task checklist.
- `.agents/skills/`: canonical project-local skills shared by Claude and Codex.
- `.claude/skills/`: generated compatibility copy/link for Claude; do not edit directly.

## Local Storage Keys

- `atomicly:store`: habits, journal entries, and identity state.
- `atomicly:lessons`: completed lesson IDs.
- `atomicly:formed`: Hall of Fame formation verdicts.
- `atomicly:onboarding-seen`: first-run onboarding completion flag.
- `atomicly:theme`: light or dark theme preference.
- `atomicly:accent`: selected accent hue.

## Implementation Notes

- The app is client-state first. Screens that read or write store data are Client Components.
- Shared state is exposed through `components/StoreProvider.tsx` and `lib/store.ts`.
- Date keys use local `YYYY-MM-DD` strings via `lib/helpers.ts`.
- Design tokens and reference classes live in `app/globals.css`.
- The current OpenSpec change `port-reference-ui` is implemented through phase 25 and ready to archive.
