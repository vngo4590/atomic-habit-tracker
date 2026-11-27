# Agent Instructions

## Framework Rule

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

This project uses Next.js 16.2, React 19, TypeScript, Tailwind CSS 4, and the App Router under `app/`.

## Project Shape

- `app/`: Next.js App Router files — thin routes/layouts that compose feature UI.
- `features/<name>/`: feature slices (`habits`, `stacks`, `reflection`, `settings`, `pet`) per ADR-0001 — `model/` (pure domain logic), `server/` (Prisma repositories), `ui/`, `store.ts` (client cache slice), `actions.ts` (server actions), `contracts.ts` (Zod).
- `lib/`: shared kernel — types, helpers, date keys, logger, auth/db/security helpers, `lib/store/` (client store composition + `optimistic()` helper), `lib/server/store-snapshot.ts`, the auth-only `lib/actions/auth.ts` / `lib/contracts/auth.ts` / `lib/repositories/users.ts`, and tests.
- `components/`: app-shell and shared cross-feature components (`StoreProvider`, `Toast`, `Modal`, `AuthForm`, onboarding, `HelpTip`, `LineChart`, `ContractSheet`, `NotesManager`, ...); `components/ui/` design-system primitives; `components/nav/` navigation; `components/motion/` animation primitives.
- `docs/architecture/`: architecture notes and ADRs (`adr/0001`–`0003`); `design-system/atomicly/MASTER.md` is the design-system source of truth.
- `reference_ui/`: source reference implementation used for the completed UI port.
- `openspec/changes/`: active OpenSpec changes (archived ones under `openspec/changes/archive/`).
- `.agents/skills/`: project-local skills shared by all agents.
- `README.md`: app overview, routes, storage keys, validation commands, and implementation notes.

## App Context

- Product: Atomicly, an Atomic Habits practice app for designing habits, casting daily identity votes, and reflecting on progress.
- Data model: authenticated user data lives in PostgreSQL through Prisma repositories and is loaded from `app/(root)/layout.tsx` with `getStoreSnapshot(userId, todayKey())` (`lib/server/store-snapshot.ts`, a server-only composition root over each feature's `server` entry). Feature slices live under `features/<name>/` (`habits`, `stacks`, `reflection`, `settings`, `pet`) per ADR-0001. `components/StoreProvider.tsx` and `lib/store/` (`index.ts` composes `useStore` from the per-feature slices in `features/<name>/store.ts`; `optimistic.ts` is the shared apply/rollback/toast helper) manage in-memory optimistic cache state around server actions; they are not a browser persistence layer. Browser `localStorage` is limited to local UI mirrors such as `atomicly:theme` and `atomicly:accent` (the retired `atomicly:theme-variant` key is read once, mapped to light/dark by `lib/themes.ts`, then deleted).
- Screens/routes: `/`, `/habits`, `/habits/new`, `/habits/[id]`, `/analytics`, `/journal`, `/review`, `/hall-of-fame`, `/pet`, `/identity`, and `/settings`.
- Pet Ecosystem (`/pet`): a procedural, evolving, mortal Tamagotchi world. The pure engine lives under `features/pet/model/` (`genome.ts` seeded PRNG + temperaments, `sprite.ts` deterministic pixel-art generator, `evolution.ts` life-stage ladder, `simulation.ts` real-time satiety/health decay with permanent death, `mood.ts` mood + idle-animation derivation, `food.ts` food economy + `earnedFoodFrom`, `age.ts` age labels, `pet-view.ts` with `buildPetView`, re-exported by the `features/pet/index.ts` barrel). There are NO hardcoded pets — appearance is a pure function of `(seed, temperament, stage)`. Pets are persisted in PostgreSQL via `features/pet/server/` (`Pet` + `PetFeedLog` models), mutated through `features/pet/actions.ts` (`adoptPetAction`, `feedPetAction`, `buryPetAction`, `deletePetAction`) with Zod contracts in `features/pet/contracts.ts`, and loaded into the store by `getStoreSnapshot`. Food economy: completing a habit grants 3 feeds and each journalling activity (Journal entry, habit note, weekly review) grants 1; the pool is shared across pets (`availableFood = earnedToday − feedsUsedToday`). Decay is gentle — one feed/day keeps any pet alive. Caps: max 3 alive pets AND one adoption per calendar month, but releasing a pet frees that month's slot immediately. Cards show age + lifetime feeds and a Release button. The route is `app/(root)/pet/page.tsx`; the UI lives in `features/pet/ui/` (`PetEcosystem.tsx`, `usePetEcosystem.ts`, `PetCard.tsx`, `AdoptPanel.tsx`, `FoodPanel.tsx`); `features/pet/ui/MoodSprite.tsx` adds Framer Motion idle loops over `features/pet/ui/PixelSprite.tsx`.
- Today page (`/`, `features/habits/ui/today/`): a focus list of habits scheduled for today that are not yet done, then a collapsible "Completed (n)" list with undo, identity votes and quieter insights. Empty data shows first-run, rest-day or all-done states. No Morning/Afternoon/Evening grouping. Each row shows a check circle, name+identity and streak. Supports habit search across all habits.
- All Habits (`/habits`, `features/habits/ui/library/`): three tabs — All, Done today, Upcoming. Each row has a check/undo circle. Supports habit search and sort by streak, rate, newest, or name.
- Schedule helpers (`features/habits/model/schedule.ts`, imported via `@/features/habits`): `isScheduledForDate(dateKey, schedule)`, `nextScheduledDateKey(fromDateKey, schedule)`, `formatNextDayLabel(dateKey)`.
- Schedule-aware metrics (`features/habits/model/metrics.ts`, exported from `@/features/habits`): `streak()`, `longestStreak()`, and `completionRate()` all respect `habit.schedule`. Unscheduled days do not break streaks; completion-rate denominator is scheduled days (bonus completions can exceed 100%).
- Active-habit cap: a user may keep at most **3 active habits** (`MAX_ACTIVE_HABITS`). "Active" = not archived AND not inducted (no `FormationVerdict` with `decision = formed`). The shared predicate lives in `features/habits/model/habit-cap.ts` (`activeHabitCount`, `remainingHabitSlots`); the server enforces it authoritatively in `createHabit` (`features/habits/server/habits.repository.ts`, via `countActiveHabits`), returning a discriminated `{ ok: true, habit } | { ok: false, reason: "cap" }` result surfaced by `createHabitAction` and a 409 from `POST /api/v1/habits`. The client mirrors it on `/habits/new` (disabled submit + cap banner + reusable `components/HelpTip.tsx`), and the optimistic `addHabit` store path rolls back with a Toast on refusal. Inducting or archiving a habit frees a slot; existing over-cap data is grandfathered (never force-archived).
- Auth redirect: `/login` and `/register` server components check `auth()` and redirect authenticated users to `/` (or a validated `callbackUrl`).
- UI shell: all app screens live under `app/(root)/` and share the shell in `app/(root)/layout.tsx` — desktop sidebar, mobile top bar + bottom tab bar (`components/nav/`, driven by `components/nav/nav-items.ts`): Today, Habits, Reflect, Insights, Pet, with Settings via the avatar (Identity is reached from Settings). Alt+Shift+<key> shortcuts (`components/nav/useNavShortcuts.ts`): T, H, R, I, P, `,` plus N (new habit), J, W, A, F. Reflect (`/journal`, `/review`) and Insights (`/analytics`, `/hall-of-fame`) are hub tab groups rendered by per-route `layout.tsx` (`components/nav/SectionTabs.tsx`); `/reflect` and `/insights` redirect via `next.config.ts`. First-run users see `components/OnboardingOverlay.tsx`, lazy-loaded by `components/OnboardingGate.tsx` from the server-side `preferences.onboardingSeen` flag.
- Design system (ADR-0003): calm minimal, **light and dark themes only**, semantic tokens in `app/styles/tokens.css`, primitives in `components/ui/` (import from `@/components/ui`). See the `atomic-habit-design-system` skill.
- Current OpenSpec status: the `port-reference-ui` and `backend-auth-mobile-architecture` changes are complete and no longer in the tree; check `openspec/changes/` for active changes.

## Implementation Workflow

1. Read the relevant OpenSpec artifacts (`proposal.md`, `design.md`, `tasks.md`, `specs/`) under `openspec/changes/<name>/` before implementing planned OpenSpec work. Architecture decisions live in `docs/architecture/adr/`.
2. Check `reference_ui/` for source behavior and visual patterns before changing ported UI or logic.
3. Keep task completion scoped. Mark OpenSpec task checkboxes only after the code and validation for that task are complete.
4. Preserve user work in the git tree. Do not revert unrelated changes.

## Next.js Guidance

- Before editing routing, layout, metadata, fonts, CSS, Server Components, Client Components, or navigation behavior, read the relevant local docs from `node_modules/next/dist/docs/`.
- Use App Router conventions: `page.tsx`, `layout.tsx`, route groups, and colocated project files as described by the local docs.
- Add `"use client"` only where client-only React APIs or browser APIs are required.

## Code Style

- Prefer TypeScript and existing local patterns.
- Put business capabilities in their feature slice (`features/<name>/`); keep cross-cutting infrastructure in `lib/` (no business rules) and app-shell/shared UI in `components/`.
- Import another feature only through its public entry points: `@/features/<name>` (pure model barrel), `/actions`, `/server`, `/store`, `/contracts` or `/ui`. Deep imports and relative paths into another feature are ESLint errors (`eslint.config.mjs`); `model/` must stay free of React, Prisma, `server/` and actions. Never re-export `contracts.ts` from `index.ts` (it drags Zod into every client bundle).
- Use `@/` imports where appropriate; `tsconfig.json` maps `@/*` to the repo root.
- Default to ASCII in new files unless the existing file or UI text needs otherwise.
- Avoid broad refactors while porting planned OpenSpec phases.

## Styling Conventions

- **Global stylesheet is modular.** `app/globals.css` is a thin entry that `@import`s partials under `app/styles/`:
  - `tokens.css` (semantic design tokens, light on `:root` / dark on `[data-theme="dark"]`), `base.css`, `typography.css`, `layout.css`, `components.css`, `animations.css`, `responsive.css`.
- **Use the primitives first.** Buttons, cards, fields, tabs, empty states, skeletons, etc. come from `@/components/ui`; only consume semantic tokens (raw colour literals belong in `tokens.css` only).
- **Per-component styles** live in a colocated `*.module.css` next to the component (e.g. `components/ui/Button.module.css`, `features/habits/ui/today/TodayView.module.css`).
- **Per-page styles**: route files under `app/(root)/` are thin; page UI and its CSS Modules live in the feature's `ui/` folder.
- **No inline `style={{ ... }}` for static layout or colour.** Move such styles into a co-located `*.module.css`.
- **Allowed inline style:** dynamic CSS-variable passthrough (e.g. `style={{ "--mood-color": item.color }}`) so a generic module class can theme against per-data values. Always add a brief inline comment explaining why.
- **Allowed inline style:** Framer Motion animation values (`initial`, `animate`, `whileHover`, `whileTap`) — these are animation, not style.
- **SOLID + GRASP** apply throughout. Keep files under ~300 lines / ~7 KB; split components into folders with sub-components, hooks, and a barrel when they grow beyond that.

## Animation Conventions

- **Framer Motion** is the primary animation library. Prefer it for entrance animations, gesture interactions, and staggered lists.
- **Use `m`, never `motion`.** `components/motion/MotionProvider.tsx` wraps the app in `LazyMotion` and loads the animation features as a separate chunk; importing `motion` from `framer-motion` is an ESLint error. If the chunk fails to load, `<html>` gets the `motion-unavailable` class and CSS shows content unanimated. Keep the app shell (layout, nav, `PageTransition`, `Toast`) on CSS animations.
- **CSS transitions/keyframes** are still used for simple hover states, the `page-enter` route fade, and always-running ambient animations (e.g., `principle-float`).
- Honour reduced motion: CSS durations collapse via `tokens.css`; Framer components check `useReducedMotion()` (or `lib/hooks/useMotionReduced.ts`).
- Use `components/motion/` primitives for consistency: `FadeIn`, `StaggerContainer`, `HoverLift`, `ScaleOnTap`, `PageTransition`, `AnimatedNumber`.
- Shared animation configs live in `lib/animations.ts` — spring presets, easing curves, durations, and variants.
- Prefer spring physics (`type: "spring"`) for tactile interactions (buttons, cards, toggles).
- Use `whileInView` for scroll-triggered reveals; `AnimatePresence` for mount/unmount transitions.
- Keep animations performant: animate `transform` and `opacity` only where possible. Avoid animating `width`, `height`, or `box-shadow` on large lists.

## Validation

- Run focused tests after changing helpers, store logic, or components with tests:
  `npm exec vitest run path/to/file.test.ts`
- Run the full test suite when completing a phase:
  `npm exec vitest run`
- Run typecheck and lint after any implementation:
  `npm run typecheck && npm run lint:app`
- Run build verification before final handoff for broad app changes, then check the first-load JS budget (230 KB gzipped per route):
  `npm run build && npm run bundle:check`
- `npm test -- --run` may not pass flags through correctly in this project; prefer `npm exec vitest run`.

## Security

- Request-level security is enforced in `proxy.ts` (Next.js 16 uses `proxy.ts`, not `middleware.ts`): per-request CSP nonce, security headers, in-memory rate limiting, and a same-origin CSRF guard. Reusable primitives live in `lib/security/*`. `RATE_LIMIT_DISABLED=true` turns the in-process limiter off for PR previews and local E2E runs; production never sets it.
- Auth is timing-safe (`lib/auth/credentials.ts` always runs a bcrypt compare), passwords are capped at 72 UTF-8 bytes (`lib/contracts/auth.ts`), repeated failed logins for a real account hit a per-account exponential-backoff throttle (`lib/security/login-throttle.ts`), and login/register can require a Cloudflare Turnstile challenge (`lib/security/turnstile.ts`, fail-safe-off when unconfigured).
- Edge protection is Azure Front Door + a WAF policy (custom rate-limit + scanner-UA block rules on any SKU; OWASP DRS + Bot Manager only on the Premium SKU) in `infra/modules/`; the default `frontDoorSku` is Standard for cost, and the App Service origin is locked to the Front Door so the WAF cannot be bypassed.
- Before changing auth, headers/CSP, rate limiting, WAF, or ingress/Postgres networking, read the `atomic-habit-security` skill and `docs/architecture/security.md`.
- Deployment surfaces: master CI/CD lives in `.github/workflows/ci-cd.yml` (validate: typecheck, `lint:app`, tests, build, `bundle:check`) and targets the shared dev RG. GitHub Actions is currently **disabled at the repository level** on purpose, so run the validation gate locally; do not re-enable Actions as part of unrelated work. **PR previews** are provisioned by four additional, additive workflows (`pr-preview.yml`, `pr-preview-teardown.yml`, `pr-preview-reaper.yml`, `pr-preview-open.yml`) using `infra/preview.bicep`; they authenticate as a SEPARATE `pr-preview-atomicly` Azure AD app via `AZURE_PREVIEW_CLIENT_ID` and cannot touch the dev RG. See the `atomic-habit-pr-preview-env` skill before editing any preview workflow or `infra/preview*`.

## Shared Skills

- Edit project skills only under `.agents/skills/`.
- Use `.agents/skills/skill-improvement-loop/` to log and apply skill improvement opportunities.
- Project skill opportunities should be recorded in `.agents/skill-improvement/opportunities.jsonl` via the skill's scripts, not by manual JSON edits.

## Agent Workflow

Read `.agents/skills/atomic-habit-workflow/SKILL.md` at the start of every session. Key rules:
- Branch per task (`feat/`, `fix/`, `refactor/`, `docs/`, `test/`, `chore/`).
- Small incremental commits — one logical change per commit, Conventional Commits prefixes.
- Test every change. No exceptions.
- Comment everything for non-coder understanding.
- Follow SOLID + GRASP for any change spanning more than one file.
- Update skills and docs when you discover new patterns or stale info.
- Validate before push: tests, typecheck, build.

## Custom Agents

### `atomic-log-orchestrator`

- **Purpose:** Orchestrate parallel logging instrumentation across the codebase by deploying subagents to add, audit, and update logging in multiple files simultaneously.
- **Agent type:** Orchestrator that deploys subagents in parallel by file category.
- **Skills:** `atomic-habit-logging`, `atomic-habit-workflow`
- **Trigger phrases:**
  - "add logging to..."
  - "audit log coverage for..."
  - "ensure all files are instrumented"
  - "check logging compliance"
  - "update logging across..."
- **Behavior:**
  1. Scan the requested scope for files that lack logger imports.
  2. Categorize the target files by type: server action, repository, API route, component, or page.
  3. Deploy parallel subagents — one per file category — to add or update logging.
  4. Require each subagent to follow the `atomic-habit-logging` skill rules.
  5. Run validation after all subagents finish: `npm run typecheck`, `npm run lint`, `npm exec vitest run`.
  6. Report a summary of instrumented files and any follow-up issues.
- **Key rules:**
  - Never log sensitive data; always follow the redaction rules defined by `atomic-habit-logging`.
  - Server-side code uses `lib/logger.ts` — use `debug` for repositories and routes, `info` for server actions.
  - Client-side code uses `lib/logger-client.ts` — keep logging development-only and use `info` for user interactions.
  - Always validate the repo after instrumentation changes.
