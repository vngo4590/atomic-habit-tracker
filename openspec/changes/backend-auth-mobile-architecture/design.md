## Context

Atomicly currently runs as a local-first Next.js app with sample data and browser `localStorage`. The completed reference UI proves the habit, reflection, lesson, identity, and settings flows, but it is not yet a product users can sign into across devices.

The next phase must create a production architecture that can run on Vercel, persist real user-owned data, protect app routes, support mobile screen sizes, and expose backend contracts that a future mobile app can reuse.

Relevant current constraints:

- Next.js 16.2, React 19, TypeScript, Tailwind CSS 4, and App Router are already in use.
- Existing UI screens live under `app/(root)/`.
- Existing state lives in `lib/store.ts` and localStorage; this should become transitional only.
- Baseline OpenSpec capabilities for the ported UI now exist under `openspec/specs/`.
- The target deployment path is Vercel.

## Goals / Non-Goals

**Goals:**

- Add real authentication so users can register, log in, log out, and access only their own data.
- Replace mock/sample-backed production flows with database-backed data.
- Preserve the completed product flow: onboarding, create habit, check-in, mood, notes, journal, review, lessons, Hall of Fame, identity, settings, export.
- Make all screens responsive from mobile to desktop.
- Define backend contracts that are usable by both the web app and a future mobile app.
- Keep the architecture deployable on Vercel with documented environment variables and migration steps.
- Add tests around auth guards, ownership rules, core mutations, and responsive rendering.

**Non-Goals:**

- Native mobile app implementation.
- Push notifications, email delivery, or background job infrastructure beyond architecture placeholders.
- Teams, shared accounts, or multi-tenant organizations.
- Paid subscriptions or billing.
- Realtime collaboration.
- Importing existing user localStorage data into accounts, unless added by a later migration change.

## Decisions

### D1: Use PostgreSQL as the durable system of record

**Decision:** Add PostgreSQL for all authenticated user data and model it with Prisma.

**Rationale:** Atomicly data is relational: users own habits; habits own check-ins, notes, contracts, and formation verdicts; journal and review entries belong to users; lesson completion and preferences are user-scoped. PostgreSQL fits these relationships and is widely supported by Vercel-compatible providers. Prisma gives typed queries, migrations, and a clear schema artifact for future mobile API development.

**Alternatives considered:**

- Supabase client-first access: attractive for auth and database in one platform, but pushes more data-access policy into provider-specific rules and makes the app architecture less portable.
- MongoDB: workable, but the domain is naturally relational and needs ownership joins and date-key uniqueness.
- Continue localStorage: not acceptable for login, cross-device sync, or production deployment.

### D2: Use Auth.js-compatible authentication with server-verified sessions

**Decision:** Add Auth.js/NextAuth-style authentication with database-backed user identity, protected app routes, and server-side session checks. Credentials login is the minimum required provider; OAuth can be added if desired without changing the domain model.

**Rationale:** The app is a Next.js App Router project and needs web sessions that work with Server Components, Server Actions, Route Handlers, and route protection. Server-verified sessions prevent client-side-only authorization mistakes.

**Alternatives considered:**

- Clerk/Auth0/Kinde: faster hosted auth, but adds external product coupling and may be more than needed for the first production backend.
- Custom password/session stack: maximum control, but high security risk and slower delivery.

### D3: Split backend code into auth, db, repositories, actions, and route handlers

**Decision:** Introduce backend modules with clear ownership:

- `lib/auth/`: auth config, session helpers, password/OAuth provider setup.
- `lib/db/`: Prisma client and database utilities.
- `lib/repositories/`: domain data access with required `userId` scoping.
- `lib/actions/`: server actions used by web forms and UI mutations.
- `app/api/v1/`: versioned route handlers for mobile-ready API contracts.
- `lib/contracts/`: shared validation schemas and response types.

**Rationale:** The current client store mixes state, persistence, and domain mutation logic. Splitting backend concerns prevents ownership bugs, makes server-side testing easier, and keeps a future mobile app from depending on React-specific code.

### D4: Use Server Actions for web UX and Route Handlers for mobile contracts

**Decision:** Web pages should use Server Actions for form submissions and mutations where possible. The same repository functions and validation contracts should power `/api/v1/*` Route Handlers for future mobile clients.

**Rationale:** Server Actions fit App Router forms and reduce client API boilerplate. Route Handlers provide explicit HTTP contracts for mobile. Both paths share validation and repositories so behavior does not fork.

**Alternatives considered:**

- REST-only web data access: simpler contract surface, but more client boilerplate and less App Router leverage.
- GraphQL/tRPC: useful at larger scale, but unnecessary for this phase and adds tooling before the backend model is stable.

### D5: Treat sample data as development fixtures only

**Decision:** Remove sample data from authenticated production flows. Keep sample data only for tests, local seeds, Storybook-like fixtures if added later, or unauthenticated marketing/demo examples.

**Rationale:** The user explicitly wants no mock-up data this time. A new account should start from empty/default user-owned records, not preloaded sample habits.

### D6: Make responsive behavior a first-class architecture concern

**Decision:** Refactor the app shell and screens around responsive primitives before polishing individual screens:

- Mobile: bottom navigation or drawer, single-column content, sticky primary actions, large touch targets.
- Tablet: compact sidebar or two-column layouts where space allows.
- Desktop: preserve the current sidebar-led workspace.

**Rationale:** The completed UI was desktop-first. Mobile compatibility cannot be added safely by only tweaking page-level CSS; navigation, tables, modals, charts, and dense cards need responsive patterns.

### D7: Store user preferences in the database and mirror theme locally

**Decision:** Persist preferences such as theme, accent, notification toggles, lesson mode, and onboarding completion in the database. Mirror theme/accent in localStorage only as a quick paint optimization.

**Rationale:** Preferences should follow authenticated users across devices. Local mirroring avoids a flash while server data loads.

### D8: Use UTC timestamps plus user-local date keys for habit days

**Decision:** Store timestamps as UTC and store habit/check-in day keys as `YYYY-MM-DD` strings resolved in the user's selected timezone.

**Rationale:** Habit tracking is day-based and user-local. A separate date key prevents UTC midnight from moving check-ins to the wrong habit day while preserving auditable timestamps.

### D9: Deploy with Vercel-compatible runtime defaults

**Decision:** Keep Node.js runtime for auth/database routes and actions. Avoid Edge-only assumptions for Prisma/database access. Document environment variables, migration commands, and preview/production validation.

**Rationale:** Prisma and relational database drivers commonly need Node.js runtime behavior. Vercel supports full-stack Next.js deployments, and Prisma documents Vercel deployment patterns including generating Prisma Client during builds.

### D10: Add production readiness checks before migration completes

**Decision:** The change is not complete until build, tests, migrations, auth smoke tests, route protection checks, mobile viewport checks, and Vercel environment documentation are done.

**Rationale:** Backend/auth changes can appear to work locally while failing in production due to missing env vars, migrations, cookie settings, or responsive regressions.

## Risks / Trade-offs

- **Auth/session misconfiguration** -> Use server-side auth helpers everywhere, add route protection tests, and document required production env vars.
- **User data leakage across accounts** -> Require `userId` in every repository query and add tests proving cross-user records are inaccessible.
- **Prisma/serverless connection pressure** -> Use provider pooling where available and keep runtime/database guidance in deployment docs.
- **Large localStorage-to-database rewrite** -> Implement in vertical slices and keep UI behavior stable while moving data screen by screen.
- **Mobile UI regressions on dense screens** -> Add responsive acceptance checks for tables, charts, modals, habit rows, and navigation.
- **Future mobile API drift** -> Define `/api/v1` contracts and shared validation schemas now, even if the web primarily uses Server Actions.
- **No sample data makes first-run screens sparse** -> Build proper empty states and onboarding prompts instead of seeding fake habits.

## Migration Plan

1. Add dependencies, environment templates, and backend scaffolding without changing user-facing behavior.
2. Add Prisma schema and migrations for users, preferences, identity, habits, check-ins, notes, contracts, journal, reviews, lessons, and formation verdicts.
3. Add authentication routes and protect the app shell.
4. Add repository and validation layers with ownership tests.
5. Move habit flows from local store to backend.
6. Move reflection, lesson, identity, Hall of Fame, and settings flows to backend.
7. Refactor app shell and screens for responsive mobile layouts.
8. Add `/api/v1` route handlers backed by the same contracts/repositories.
9. Remove sample data from production authenticated flows.
10. Add Vercel deployment documentation and run production readiness checks.

Rollback strategy:

- Before database-backed flows are merged, rollback is a normal code revert.
- After migrations are introduced, use additive migrations first and avoid destructive schema changes until the new flow is validated.
- Keep local development seed data separate from production data paths.

## Open Questions

- Which auth providers should launch first: email/password only, OAuth, or both?
- Which managed PostgreSQL provider should be used for production: Vercel Postgres/Neon/Supabase/other?
- Should existing localStorage users receive an import flow into their new account?
- Should mobile use cookie sessions, bearer tokens, or a separate mobile auth flow when the native app phase begins?

## References

- Vercel documents Next.js deployment as zero-configuration with Vercel-specific scalability and preview deployment support.
- Prisma documents Next.js + Vercel deployment patterns and recommends generating Prisma Client during deployment builds.
- Next.js learning docs cover App Router authentication with NextAuth.js/Auth.js-style route protection and server-side session handling.
