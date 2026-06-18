# Agent Instructions

## Framework Rule

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

This project uses Next.js 16.2, React 19, TypeScript, Tailwind CSS 4, and the App Router under `app/`.

## Project Shape

- `app/`: Next.js App Router files.
- `lib/`: shared types, helpers, auth/db helpers, repositories, server actions, store cache logic, and tests.
- `reference_ui/`: source reference implementation used for the completed UI port.
- `openspec/changes/port-reference-ui/`: completed OpenSpec proposal, design, specs, and task checklist for the reference UI port.
- `.agents/skills/`: project-local skills shared by all agents.
- `README.md`: app overview, routes, storage keys, validation commands, and implementation notes.

## App Context

- Product: Atomicly, an Atomic Habits practice app for designing habits, casting daily identity votes, and reflecting on progress.
- Data model: authenticated user data lives in PostgreSQL through Prisma repositories and is loaded from `app/(root)/layout.tsx` with `getStoreSnapshot(userId, todayKey())`. `components/StoreProvider.tsx` and `lib/store.ts` manage in-memory optimistic cache state around server actions; they are not a browser persistence layer. Browser `localStorage` is limited to local UI mirrors such as `atomicly:theme`, `atomicly:accent`, and `atomicly:theme-variant` (the selected named theme: light/dark/glass/neon/fairy/stars).
- Screens/routes: `/`, `/habits`, `/habits/new`, `/habits/[id]`, `/analytics`, `/journal`, `/review`, `/hall-of-fame`, `/pet`, `/identity`, and `/settings`.
- Pet Ecosystem (`/pet`): a procedural, evolving, mortal Tamagotchi world. The pure engine lives under `lib/pet/` (`genome.ts` seeded PRNG + temperaments, `sprite.ts` deterministic pixel-art generator, `evolution.ts` life-stage ladder, `simulation.ts` real-time satiety/health decay with permanent death, `mood.ts` mood + idle-animation derivation, `food.ts` food economy + `earnedFoodFrom`, `age.ts` age labels, `index.ts` barrel with `buildPetView`). There are NO hardcoded pets — appearance is a pure function of `(seed, temperament, stage)`. Pets are persisted in PostgreSQL via `lib/repositories/pets.ts` (`Pet` + `PetFeedLog` models), mutated through `lib/actions/pets.ts` (`adoptPetAction`, `feedPetAction`, `buryPetAction`, `deletePetAction`) with Zod contracts in `lib/contracts/pet.ts`, and loaded into the store by `getStoreSnapshot`. Food economy: completing a habit grants 3 feeds and each journalling activity (Journal entry, habit note, weekly review) grants 1; the pool is shared across pets (`availableFood = earnedToday − feedsUsedToday`). Decay is gentle — one feed/day keeps any pet alive. Caps: max 3 alive pets AND one adoption per calendar month, but releasing a pet frees that month's slot immediately. Cards show age + lifetime feeds and a Release button. UI lives in `app/(root)/pet/` (`page.tsx`, `PetEcosystem.tsx`, `PetCard.tsx`, `AdoptPanel.tsx`); `components/pet/MoodSprite.tsx` adds Framer Motion idle loops over `components/pet/PixelSprite.tsx`.
- Today page (`/`): shows only habits scheduled for today that are not yet done. No Morning/Afternoon/Evening grouping. Each card shows check circle, name+identity, streak, and 30-day progress. Supports habit search across all habits.
- All Habits (`/habits`): three tabs — All, Done Habits, Upcoming Habits. Each row has a check/undo circle. Supports habit search and sort by streak, rate, newest, or name.
- Schedule helpers (`lib/schedule.ts`): `isScheduledForDate(dateKey, schedule)`, `nextScheduledDateKey(fromDateKey, schedule)`, `formatNextDayLabel(dateKey)`.
- Schedule-aware metrics (`lib/store.ts`): `streak()`, `longestStreak()`, and `completionRate()` all respect `habit.schedule`. Unscheduled days do not break streaks; completion-rate denominator is scheduled days (bonus completions can exceed 100%).
- Auth redirect: `/login` and `/register` server components check `auth()` and redirect authenticated users to `/` (or a validated `callbackUrl`).
- UI shell: all app screens live under `app/(root)/` and share the sidebar layout in `app/(root)/layout.tsx`.
- Current OpenSpec status: `port-reference-ui` tasks are complete through phase 25 and the change is ready to archive.

## Implementation Workflow

1. Read the relevant OpenSpec artifacts before implementing planned OpenSpec work. For the backend/auth/mobile work, start with:
   - `openspec/changes/backend-auth-mobile-architecture/tasks.md`
   - `openspec/changes/backend-auth-mobile-architecture/design.md`
   - Any matching spec under `openspec/changes/backend-auth-mobile-architecture/specs/`
2. Check `reference_ui/` for source behavior and visual patterns before changing ported UI or logic.
3. Keep task completion scoped. Mark OpenSpec task checkboxes only after the code and validation for that task are complete.
4. Preserve user work in the git tree. Do not revert unrelated changes.

## Next.js Guidance

- Before editing routing, layout, metadata, fonts, CSS, Server Components, Client Components, or navigation behavior, read the relevant local docs from `node_modules/next/dist/docs/`.
- Use App Router conventions: `page.tsx`, `layout.tsx`, route groups, and colocated project files as described by the local docs.
- Add `"use client"` only where client-only React APIs or browser APIs are required.

## Code Style

- Prefer TypeScript and existing local patterns.
- Keep shared app logic in `lib/`; keep reusable UI in `components/` when created.
- Use `@/` imports where appropriate; `tsconfig.json` maps `@/*` to the repo root.
- Default to ASCII in new files unless the existing file or UI text needs otherwise.
- Avoid broad refactors while porting planned OpenSpec phases.

## Styling Conventions

- **Global stylesheet is modular.** `app/globals.css` is a thin entry that `@import`s partials under `app/styles/`:
  - `tokens.css` (CSS variables / dark theme), `base.css`, `typography.css`, `layout.css`, `components.css`, `animations.css`, `responsive.css`.
- **Per-component styles** live in `components/Component.module.css` next to the component.
- **Per-page styles** live in `app/(root)/<route>/page.module.css` next to the page.
- **No inline `style={{ ... }}` for static layout or colour.** Move such styles into a co-located `*.module.css`.
- **Allowed inline style:** dynamic CSS-variable passthrough (e.g. `style={{ "--mood-color": item.color }}`) so a generic module class can theme against per-data values. Always add a brief inline comment explaining why.
- **Allowed inline style:** Framer Motion animation values (`initial`, `animate`, `whileHover`, `whileTap`) — these are animation, not style.
- **SOLID + GRASP** apply throughout. Keep files under ~300 lines / ~7 KB; split components into folders with sub-components, hooks, and a barrel when they grow beyond that.

## Animation Conventions

- **Framer Motion** is the primary animation library. Prefer it for entrance animations, page transitions, gesture interactions, and staggered lists.
- **CSS transitions/keyframes** are still used for simple hover states and always-running ambient animations (e.g., `principle-float`).
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
  `npm run typecheck && npm run lint`
- Run build verification before final handoff for broad app changes:
  `npm run build`
- `npm test -- --run` may not pass flags through correctly in this project; prefer `npm exec vitest run`.

## Security

- Request-level security is enforced in `proxy.ts` (Next.js 16 uses `proxy.ts`, not `middleware.ts`): per-request CSP nonce, security headers, in-memory rate limiting, and a same-origin CSRF guard. Reusable primitives live in `lib/security/*`.
- Auth is timing-safe (`lib/auth/credentials.ts` always runs a bcrypt compare), passwords are capped at 72 UTF-8 bytes (`lib/contracts/auth.ts`), repeated failed logins for a real account hit a per-account exponential-backoff throttle (`lib/security/login-throttle.ts`), and login/register can require a Cloudflare Turnstile challenge (`lib/security/turnstile.ts`, fail-safe-off when unconfigured).
- Edge protection is Azure Front Door + a WAF policy (custom rate-limit + scanner-UA block rules on any SKU; OWASP DRS + Bot Manager only on the Premium SKU) in `infra/modules/`; the default `frontDoorSku` is Standard for cost, and the App Service origin is locked to the Front Door so the WAF cannot be bypassed.
- Before changing auth, headers/CSP, rate limiting, WAF, or ingress/Postgres networking, read the `atomic-habit-security` skill and `docs/architecture/security.md`.
- Deployment surfaces: master CI/CD lives in `.github/workflows/ci-cd.yml` and targets the shared dev RG. **PR previews** are provisioned by four additional, additive workflows (`pr-preview.yml`, `pr-preview-teardown.yml`, `pr-preview-reaper.yml`, `pr-preview-open.yml`) using `infra/preview.bicep`; they authenticate as a SEPARATE `pr-preview-atomicly` Azure AD app via `AZURE_PREVIEW_CLIENT_ID` and cannot touch the dev RG. See the `atomic-habit-pr-preview-env` skill before editing any preview workflow or `infra/preview*`.

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
