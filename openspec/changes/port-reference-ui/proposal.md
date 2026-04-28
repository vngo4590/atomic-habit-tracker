## Why

The project has a complete, pixel-perfect reference UI (`reference_ui/`) built as a standalone HTML/plain-React prototype, but the Next.js application (`app/`) is still the default Create Next App scaffold. The reference UI needs to be ported into the actual Next.js codebase so it can be developed, tested, deployed, and persisted properly.

## What Changes

- Replace the default Next.js scaffold (`app/page.tsx`, `app/layout.tsx`, `app/globals.css`) with the full Atomic Habit Tracker application
- Port all 10 screens from the reference UI into proper Next.js routes
- Convert plain-React/vanilla-JS patterns into TypeScript client components
- Replace in-memory state with localStorage-persisted state via React Context
- Replace the reference's custom CSS with Tailwind 4 CSS variables + a ported design token system in `globals.css`
- Add Vitest for unit testing pure logic (helpers, store mutations)
- Wire up Next.js App Router file-system routing for all screens and the shared sidebar shell

## Capabilities

### New Capabilities

- `design-tokens`: Global CSS custom properties, dark mode support, oklch color system, typography (Instrument Serif, Inter Tight, JetBrains Mono), and base component styles ported from `reference_ui/styles.css`
- `app-shell`: Sidebar navigation with grouped nav items, keyboard shortcuts, brand mark, and avatar — wrapping all authenticated screens via a route-group layout
- `habit-store`: Central React Context store with localStorage persistence; all CRUD operations for habits, journal entries, and identity state; streak/completion rate calculations
- `today-screen`: Daily check-in dashboard with time-of-day habit groups, completion ring, 14-day sparkline, identity vote panel, and mood check-in sheet
- `habits-list`: Sortable, filterable table of all habits with streak/rate columns; navigates to habit detail
- `habit-detail`: Five-tab detail view per habit — overview (4 laws, environment, contract, mood chart), loop diagram, journal stream, 26-week history wall, notes manager
- `create-habit`: Mad-Libs sentence builder for new habits with schedule picker, identity reuse, and optional habit stacking
- `analytics-screen`: Line chart of daily completion, day-of-week bar chart, habit leaderboard — across 14/30/90-day ranges
- `journal-screen`: Standalone journal with compose UI, mood tagging, reflection prompts, and entry list
- `weekly-review`: 7-day strip summary, wins/slips analysis, and three-question reflection form
- `lessons-screen`: 24 Atomic Habits principle nuggets with sequential/random mode, curriculum map, lesson reader, and progress tracking
- `hall-of-fame`: 66-day formation tracker, formation questionnaire, inducted habits gallery, and in-progress habits
- `identity-screen`: Identity statement editor, core values manager, and all-time vote ledger by identity
- `settings-screen`: Theme toggle (light/dark), accent color picker, notifications config, and data export/reset
- `onboarding`: 4-step overlay shown on first visit — welcome, name, identity explanation, dashboard entry

### Modified Capabilities

## Impact

- `app/` directory — all files replaced or restructured
- `app/globals.css` — rewritten with ported design tokens
- `app/layout.tsx` — updated with new fonts and metadata
- New directories: `app/(root)/` (shell layout + all screen routes), `components/`, `lib/`
- New dev dependencies: `vitest`, `@vitejs/plugin-react`, `jsdom`, `@testing-library/react`, `vite-tsconfig-paths`
- No backend, no database — localStorage only
- Fonts added via `next/font/google`: Instrument Serif, Inter Tight, JetBrains Mono
