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
- `.agents/skills/`: canonical project-local skills shared by Claude and Codex.
- `.claude/skills/`: generated compatibility link/copy for Claude; do not edit directly.
- `README.md`: app overview, routes, storage keys, validation commands, and implementation notes.

## App Context

- Product: Atomicly, an Atomic Habits practice app for designing habits, casting daily identity votes, and reflecting on progress.
- Data model: authenticated user data lives in PostgreSQL through Prisma repositories and is loaded from `app/(root)/layout.tsx` with `getStoreSnapshot(userId, todayKey())`. `components/StoreProvider.tsx` and `lib/store.ts` manage in-memory optimistic cache state around server actions; they are not a browser persistence layer. Browser `localStorage` is limited to local UI mirrors such as `atomicly:theme` and `atomicly:accent`.
- Screens/routes: `/`, `/habits`, `/habits/new`, `/habits/[id]`, `/analytics`, `/journal`, `/review`, `/hall-of-fame`, `/identity`, and `/settings`.
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

## Shared Skills

- Edit project skills only under `.agents/skills/`.
- Run `.\scripts\sync-agent-skills.ps1` after changing shared skills so Claude and Codex see the same canonical skills.
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
- Validate before push: tests, typecheck, build, sync skills.
