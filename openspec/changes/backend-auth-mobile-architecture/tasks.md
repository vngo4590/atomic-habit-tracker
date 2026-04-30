## 1. Architecture Baseline

- [ ] 1.1 Read local Next.js 16 docs for App Router route handlers, server actions, forms, middleware/proxy, cookies, and deployment-relevant runtime behavior
- [ ] 1.2 Decide and document final provider choices for auth and PostgreSQL in `README.md` or a new deployment architecture doc
- [ ] 1.3 Add required dependencies for Prisma, database client/adapter, Auth.js/NextAuth, password hashing, and validation
- [ ] 1.4 Add `.env.example` with auth, database, app URL, and deployment variables
- [ ] 1.5 Add backend folders: `lib/auth`, `lib/db`, `lib/repositories`, `lib/actions`, `lib/contracts`, and `app/api/v1`

## 2. Database Schema

- [ ] 2.1 Initialize Prisma configuration and database client
- [ ] 2.2 Create Prisma models for User, Account/Session if required by auth, UserPreference, IdentityProfile, Habit, HabitCheckIn, HabitNote, HabitContract, JournalEntry, WeeklyReview, LessonProgress, and FormationVerdict
- [ ] 2.3 Add unique constraints for user-scoped habit IDs/slugs where needed and one check-in per habit/date key
- [ ] 2.4 Add initial migration and verify it applies locally
- [ ] 2.5 Add seed/dev fixture script that is explicit development-only and does not run in production authenticated flows

## 3. Authentication

- [ ] 3.1 Create auth configuration, session helper, sign-in, sign-out, and registration server actions
- [ ] 3.2 Create login/register/logout UI routes with pending and error states
- [ ] 3.3 Protect authenticated app routes and redirect unauthenticated users to login
- [ ] 3.4 Add authenticated user menu state to the app shell
- [ ] 3.5 Add tests for successful login, failed login, logout, and protected-route redirect behavior

## 4. Validation Contracts and Repositories

- [ ] 4.1 Add shared validation schemas for habits, check-ins, notes, contracts, journal entries, weekly reviews, identity, preferences, lessons, and formation verdicts
- [ ] 4.2 Implement repository helpers that require `userId` for every user-owned query and mutation
- [ ] 4.3 Add repository tests proving cross-user reads and writes are rejected or return not found
- [ ] 4.4 Add date-key utilities that preserve user-local `YYYY-MM-DD` habit days with UTC timestamps

## 5. Habit Backend Flow

- [ ] 5.1 Replace habit list data loading with authenticated database queries
- [ ] 5.2 Replace create-habit flow with a server action and validation feedback
- [ ] 5.3 Replace habit detail loading and update flows with authenticated database queries/mutations
- [ ] 5.4 Replace habit check-in toggle and mood/journal save with server-backed mutations
- [ ] 5.5 Replace notes, history wall, and contract persistence with database-backed mutations
- [ ] 5.6 Add empty states for new users with no habits
- [ ] 5.7 Add tests for create, update, delete, check-in, mood save, notes, and ownership behavior

## 6. Reflection and Learning Backend Flow

- [ ] 6.1 Replace Journal page reads/writes with authenticated database-backed actions
- [ ] 6.2 Replace Weekly Review save/load with database-backed actions keyed by user and week
- [ ] 6.3 Replace Lessons completion and mode persistence with database-backed user progress
- [ ] 6.4 Replace Identity statement/core values persistence with database-backed profile data
- [ ] 6.5 Replace Hall of Fame formation verdict persistence with database-backed records
- [ ] 6.6 Replace Settings preference persistence with database-backed preferences and local theme/accent mirroring
- [ ] 6.7 Add tests for journal, review, lesson progress, identity, formation verdicts, and preferences

## 7. Versioned API for Mobile Bridge

- [ ] 7.1 Create `/api/v1/session` route handler for authenticated client session status
- [ ] 7.2 Create `/api/v1/habits` route handlers for list, create, update, delete, check-in, notes, history, and contracts
- [ ] 7.3 Create `/api/v1/reflection` route handlers for journal entries, weekly reviews, identity, lessons, preferences, and formation verdicts
- [ ] 7.4 Share validation schemas and repository functions between server actions and API route handlers
- [ ] 7.5 Add API contract tests for success, validation failure, unauthenticated, and cross-user access cases
- [ ] 7.6 Document API response shapes and authentication assumptions for a future mobile client

## 8. Responsive App Shell and Screens

- [ ] 8.1 Refactor `app/(root)/layout.tsx` and navigation into responsive desktop sidebar plus mobile navigation/drawer behavior
- [ ] 8.2 Update Today and habit row interactions for mobile touch targets and single-column layout
- [ ] 8.3 Update Habits list and Habit detail screens so tables, tabs, history wall, notes, and modals fit mobile widths
- [ ] 8.4 Update Analytics charts, Journal, Weekly Review, Lessons, Hall of Fame, Identity, and Settings for mobile layouts
- [ ] 8.5 Add responsive CSS utilities or component primitives that avoid one-off mobile fixes per page
- [ ] 8.6 Verify all routes at 390px, 768px, and desktop widths with no unintended horizontal overflow

## 9. Local Store Removal and Data Boundaries

- [ ] 9.1 Remove `localStorage` as the source of truth for authenticated domain data
- [ ] 9.2 Narrow or replace `StoreProvider` so it only manages transient UI state, optimistic state, or cache coordination
- [ ] 9.3 Keep sample data limited to tests, dev seeds, or explicitly unauthenticated demo fixtures
- [ ] 9.4 Update README and AGENTS context to describe the new backend data flow

## 10. Vercel Deployment Readiness

- [ ] 10.1 Add deployment documentation for Vercel project setup, env vars, database provisioning, migrations, and auth callback URLs
- [ ] 10.2 Add package scripts for Prisma generate, migration status/deploy, and backend validation
- [ ] 10.3 Verify `npm run build` works with backend configuration
- [ ] 10.4 Verify tests pass with an isolated test database or mocked repository layer
- [ ] 10.5 Add production smoke checklist for login, create habit, check-in, journal, settings, and mobile viewport
- [ ] 10.6 Document rollback and migration safety notes

## 11. Final Validation

- [ ] 11.1 Run TypeScript, scoped ESLint, unit/integration tests, and production build
- [ ] 11.2 Run migration apply/status checks against local development database
- [ ] 11.3 Start the dev server and verify full authenticated flow without mock data
- [ ] 11.4 Verify unauthenticated route protection for all app routes and API routes
- [ ] 11.5 Verify responsive behavior across mobile, tablet, and desktop viewports
- [ ] 11.6 Confirm OpenSpec requirements are satisfied and update the task checklist
