## Why

Atomicly is currently a local-first prototype backed by sample data and browser `localStorage`. The next phase needs to turn it into a deployable product: real users can sign in, create their own data, complete the full habit flow across devices, and use the app comfortably on mobile screens before a future mobile app bridge is built.

This change creates the architecture and implementation plan for a production-ready web app deployable on Vercel with a backend, authentication, durable storage, responsive UI, and clean separation between domain logic and presentation.

## What Changes

- Replace sample-data-first app state with authenticated, user-owned backend persistence.
- Add user authentication and protected app routes.
- Introduce database-backed models for habits, check-ins, notes, journal entries, identity, lessons, formation verdicts, preferences, and review data.
- Add a backend API/server-action layer that the web UI can use now and a mobile app can reuse later.
- Make all app screens responsive for mobile, tablet, and desktop.
- Add loading, empty, error, and offline-tolerant states needed for a real app.
- Add Vercel deployment architecture, environment variable requirements, and production validation tasks.
- Keep local-only reference/sample data out of normal authenticated user flows.

## Capabilities

### New Capabilities

- `user-auth`: User registration, login, logout, session handling, and route protection.
- `backend-data-model`: Durable database schema and ownership rules for all Atomicly domain data.
- `habit-api`: Server-side mutations and queries for habits, check-ins, notes, contracts, and history.
- `reflection-api`: Server-side mutations and queries for journal entries, weekly reviews, lessons, identity, settings, and Hall of Fame verdicts.
- `responsive-app-shell`: Mobile-compatible navigation, layouts, touch targets, and responsive rendering for every app screen.
- `deployment-architecture`: Vercel-ready runtime architecture, environment configuration, migrations, validation, and production observability.
- `mobile-bridge-readiness`: Shared contracts and service boundaries that allow a later mobile app to use the same backend safely.

### Modified Capabilities

- None. No baseline OpenSpec capabilities are archived yet.

## Impact

- App routes under `app/(root)/` will move from purely local client state to authenticated data access.
- `lib/store.ts` and `components/StoreProvider.tsx` will either be replaced or narrowed to client UI state/cache coordination.
- New backend modules will be added for authentication, database access, domain repositories, input validation, and API/server-action handlers.
- New database dependency and auth provider dependency will be introduced after final implementation decisions.
- Existing sample data remains useful for tests, seed scripts, and development fixtures but must not power authenticated production flows.
- Vercel deployment will require documented environment variables, migration commands, and production build validation.
