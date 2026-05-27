---
name: atomic-habit-workflow
description: Mandatory agent workflow conventions for the Atomicly habit tracker. Load at the start of every coding session and before any change to this repo. Covers branch-per-task naming, small incremental Conventional Commits, test-every-change rules, commenting expectations for non-coder readability, SOLID + GRASP for multi-file changes, skill/docs upkeep, and the pre-push validation checklist (tests, typecheck, build). Use whenever planning, branching, committing, pushing, or asking "what's the workflow for X?" in this repo.
---

# Atomicly Agent Workflow

> **TL;DR:** Branch → tiny commit → test → repeat. Comment everything. Follow SOLID + GRASP. No exceptions.

## Purpose

Mandatory workflow conventions for every coding session on the Atomicly habit tracker. Follow these rules on every change — no exceptions.

This skill is the **source of truth** for *how* we write code in this repo. The walkthrough skill tells you *what* the code does; this one tells you *how* to change it safely.

## When this skill is in scope

Read this file:

- At the start of every session that involves writing code.
- Before opening a new feature or refactor branch.
- Before pushing — use it as a pre-flight checklist.

If you only have time to read one section, read **Pre-push checklist** at the bottom.

---

## 1. Branch per task

- Create a new branch for every distinct task or instruction.
- Branch naming:
  - `feat/<short-description>` — new behaviour
  - `fix/<short-description>` — bug fix
  - `refactor/<short-description>` — internal restructure with no behaviour change
  - `docs/<short-description>` — docs / skills / README only
  - `test/<short-description>` — tests only
  - `chore/<short-description>` — tooling, dependencies, config
- Never commit directly to `master`.
- Push the branch to origin after each meaningful commit so reviewers can follow along.

## 2. Small incremental commits

- Commit after every logical, self-contained change — not after finishing an entire feature.
- A commit should do **one thing**: add a component, fix a bug, add a test, update docs.
- If a commit message needs the word "and", it is too big — split it.
- Use [Conventional Commits](https://www.conventionalcommits.org/) prefixes (`feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `style`, `perf`) with an optional scope.

**Good commits:**

- `feat(habits): animate habit row check toggle with spring`
- `test(toast): add entrance/exit animation coverage`
- `docs(readme): add framer-motion to tech stack`
- `refactor(modal): extract inline styles to Modal.module.css`

**Bad commits:**

- `update stuff`
- `feat: today page + new habit form + tests`
- `wip`

Every commit must include the `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>` trailer when the change was made with AI assistance.

## 3. Test every change

A change is not complete until tests pass.

- If you create or modify a **component**, write or update a test in `components/__tests__/`.
- If you modify a **`lib/` helper or repository**, write or update a unit test next to it.
- If you change a **server action**, update or add a test in `lib/actions/__tests__/`.
- If a test is hard to write, that is a signal the code has too many side effects — refactor first.

### Test commands

```powershell
# Focused tests for a single file — use during development:
npm exec vitest run path/to/file.test.ts

# Run a directory:
npm exec vitest run components/__tests__

# Full unit suite — run before pushing:
npm exec vitest run

# TypeScript + lint:
npm run typecheck
npm run lint

# Production build (catches CSS module / server-component issues):
npm run build
```

Do **not** use `npm test -- --run`; flags do not pass through reliably. Always use `npm exec vitest run`.

### Local data for manual testing

When manual testing requires user data, ensure the local database is running and seeded:

```powershell
.\scripts\local-db.ps1 up
.\scripts\local-db.ps1 migrate-deploy
.\scripts\local-db.ps1 fake-history   # generates fake user + habit history
```

Fake user credentials: `history1@atomicly.local` / `Atomicly1!`.

## 4. Comment for non-coders

Every function, component, and non-trivial block of code MUST have a comment explaining what it does and why.

- Write comments as if explaining to a product manager who cannot read code.
- Export boundaries and public APIs especially need JSDoc-style comments.
- CSS custom properties, design tokens, and animation tokens need comments explaining their **visual** purpose.

| Bad | Good |
| --- | --- |
| `// increment counter` | `// When the user checks off a habit, we increment their daily streak so the UI can show fire icons and encourage consistency.` |
| `// map over habits` | `// Group habits by time of day (Morning/Afternoon/Evening) so the Today page shows them in the order the user is most likely to complete them.` |
| `// reset state` | `// On Cancel, restore the draft from the saved value so unsaved edits don't leak back into the next edit session.` |

Top-of-file JSDoc on a component should explain: what it is, when it's rendered, what its key interactions are, and any non-obvious styling decisions (e.g. CSS variable passthrough patterns).

## 5. SOLID + GRASP — the design contract

Code under refactor or new work must respect these principles. They are non-negotiable for any change spanning more than one file.

### SOLID

| Principle | What it means here |
| --- | --- |
| **S — Single responsibility** | One reason to change per file. A page file should compose section components; a helper module should own *one* concept. Files > 300 lines or > 7 KB are a strong signal to split. |
| **O — Open/closed** | Extend with new variants, not new conditionals branching on `kind`. Example: add a new mood by appending to `MOODS`, not by `if (mood === "anger") { ... }`. |
| **L — Liskov substitution** | A new variant component must satisfy the same prop contract as its siblings. Don't sneak in extra required props at one call site. |
| **I — Interface segregation** | Props interfaces should expose only what each call site needs. Don't add `onEverything` callbacks; split into focused props. |
| **D — Dependency inversion** | Components import from `lib/` and `components/`. `lib/` modules never import from `components/`. Server actions live in `lib/actions/` and depend on repositories, not the other way around. |

### GRASP

| Pattern | When to apply |
| --- | --- |
| **Information Expert** | The thing that owns the data owns the logic that operates on it. Streak math lives on the store, not in the JSX. |
| **Creator** | Components mount their own children; `useState` lives next to where it's read. Don't pass state up to a parent just to pass it back down. |
| **Low Coupling** | Section components receive what they render via props; they should not reach into the global store unless they own a self-contained surface (sidebar, drawer). |
| **High Cohesion** | Each module groups things that change together. Page-specific styles → `page.module.css`. Shared design tokens → `app/styles/tokens.css`. |
| **Controller** | One handler per user intent. Don't call `applyStackMutation` from three places — wrap it in a `handleReorder` (or similar) function that documents intent. |
| **Polymorphism** | Replace `if/else` style logic with named variants (e.g. CSS module modifier classes `.chipDone` / `.chipPending` instead of branching `style={...}` inline). |
| **Pure fabrication** | When something doesn't fit a domain concept (e.g. animation primitives, motion variants), put it in a clearly-named utility module (`lib/animations.ts`, `components/motion/`). |
| **Indirection** | Server actions sit between the page and the repository. The page never opens a Prisma client directly. |
| **Protected variations** | Hide volatility behind interfaces. The repository layer is the only place that knows about Prisma types; everything above it sees domain types from `lib/types.ts`. |

## 6. Style + module conventions

This repo uses **Tailwind v4** + **CSS Modules** + a small set of global design tokens.

- **Global stylesheet** lives in `app/styles/`:
  - `tokens.css` — colours, fonts, shadows, transitions (the design system).
  - `base.css` — element reset, body baseline, scrollbars.
  - `typography.css` — `.h1`/`.h2`/`.h3`, `.lede`, `.markdown-body`.
  - `layout.css` — `.app` shell, sidebar, `.main`, `.page-header`.
  - `components.css` — `.card`, `.btn`, `.input`, `.chip`, `.habit-row`, etc.
  - `animations.css` — `@keyframes` + animation utility classes.
  - `responsive.css` — mobile `@media` overrides.
- **`app/globals.css`** is a thin entry point that `@import`s the partials in cascade order. Never add rules to it directly — add them to the appropriate partial.
- **Per-component styles** live in `Component.module.css` next to the component. The component imports `styles` and applies classes — never inline `style={{ ... }}` for static layout/colour values.
- **Per-page styles** live in `page.module.css` next to the page. Same rules as components.
- **Inline `style={{ ... }}` is allowed only for dynamic CSS-variable passthrough** — e.g. `style={{ "--mood-color": item.color }}` so a generic module class can theme against per-data colours. Always comment why.
- **Animation values driven by motion props** (`initial`, `animate`, `whileHover`, `whileTap`) stay on the JSX — they're animation, not style.

### Adding a new component

```
components/
  Foo.tsx              // JSX + JSDoc
  Foo.module.css       // Co-located styles
  __tests__/
    Foo.test.tsx       // Given/When/Then test
```

### Adding a new page

```
app/(root)/foo/
  page.tsx
  page.module.css
  __tests__/
    page.test.tsx
```

If a page is > 7 KB or > 300 lines, decompose it into section components inside `app/(root)/foo/sections/` and keep `page.tsx` as a thin composition layer.

## 7. Update skills when opportunities arise

After every session, ask: "Did I discover a pattern, convention, or gotcha that future agents should know?"

- If yes, update the relevant `.agents/skills/atomic-habit-*` skill.
- If no skill exists, consider creating one.
- Log unresolved skill improvement opportunities in `.agents/skill-improvement/opportunities.jsonl` via the `skill-improvement-loop` skill's scripts.

## 8. Keep docs current

After any change that affects architecture, dependencies, routes, data flow, or UI behavior, update:

- `README.md` for human-facing overview changes
- `AGENTS.md` for agent-facing conventions and validation commands

If you add a new dependency, list it in README.
If you change a validation command, update AGENTS.md.
If you add a new route or screen, add it to the routes table in both files.

Stale docs are worse than no docs.

## 9. Pre-push checklist

Before `git push`, walk through this list. If any item fails, fix it before pushing.

```
□ Branch is feat/ | fix/ | refactor/ | docs/ | test/ | chore/
□ Each commit is one logical change with a Conventional Commits prefix
□ Co-authored-by trailer is present
□ Every new function/component has a JSDoc block
□ No new inline style={{...}} for static layout/colour (variables OK)
□ Tests pass:                npm exec vitest run
□ TypeScript clean:          npm run typecheck
□ Lint clean:                npm run lint
□ Build succeeds:            npm run build
□ No raw console.log in app code (use lib/logger.ts or lib/logger-client.ts)
□ Docs updated (if needed):  README.md, AGENTS.md
□ Branch pushed:             git push -u origin <branch>
```

## 10. Error handling and recovery

- If tests fail, fix them before adding new code. Don't pile fixes on top of red.
- If the build fails, fix it before committing — broken builds in source control waste everyone's time.
- If you are stuck for more than 10 minutes, commit your current progress with a `WIP:` prefix and ask for help.
- Never leave the repo in a broken state at the end of a session.
- If you must roll something back, prefer `git revert` over `git reset --hard` so history stays auditable.

## 11. AI agent etiquette

When working as (or with) an AI agent:

- Read this file at the start of each session before writing any code.
- Read the relevant `atomic-habit-*` skill for the area you're touching:
  - `atomic-habit-project-walkthrough` for orientation.
  - `atomic-habit-test-engineer` for tests.
  - `atomic-habit-ui-animation` for motion work.
  - `atomic-habit-forward-deploy-engineer` for infra/deployment concerns.
- For non-trivial work (multiple files, architectural decisions), consult the `rubber-duck` agent **before** implementing — design feedback is cheap at the plan stage and expensive after the code is written.
- Use the OpenSpec skills (`openspec-propose`, `openspec-apply-change`, `openspec-archive-change`, `openspec-explore`) when the work spans multiple sessions or needs upfront design.

## 12. Glossary

- **GRASP** — General Responsibility Assignment Software Patterns. A set of nine OO design heuristics by Craig Larman.
- **SOLID** — Single responsibility / Open-closed / Liskov / Interface segregation / Dependency inversion.
- **CSS Modules** — `*.module.css` files whose class names are locally scoped by Next.js at build time. Import `styles from './X.module.css'` and use `styles.className`.
- **CSS variable passthrough** — Inline `style={{ "--token": value }}` used to feed per-data values (e.g. mood colour) into a generic CSS module class.
- **Module CSS vs Tailwind** — Use module CSS for component-specific styling; Tailwind utilities are acceptable for one-off layout primitives but prefer modules for anything reused or non-trivial.

## 13. Logging

All code in the Atomicly repo must use the structured logger. Raw `console.log` / `console.warn` / `console.error` calls are not permitted in application code (they are fine in scripts, seeds, and test helpers).

### Server-side (`lib/logger.ts`)

- Import and use a child logger scoped to the module: `const log = logger.child({ module: "actions.auth" });`
- **All server actions** must emit structured info-level logs for significant business events (create, update, delete, auth events).
- **All repositories** must emit debug-level logs at the start of each exported function.
- **All API route handlers** must emit an explicit debug-level log at the start of each handler, usually inside `withApiUser` so the log includes `userId`.
- **Errors**: Log unexpected errors at `error` level. Log expected failures (validation, auth rejection) at `warn` level.
- **Never** log raw user content (journal body, review answers, notes), raw request payloads, raw `FormData`, or full error stacks in production.
- **Always** use allowlisted fields — pass only known-safe context to log calls.
- **Sensitive data** must be redacted using helpers from `lib/logger-redact.ts`:
  - `redactEmail(email)` — partial mask (`a***@domain.com`)
  - `redactUserId(id)` — truncated to 8 chars
  - Fields named `password`, `passwordHash`, `secret`, `token` → never logged
- **Correlation**: Pass `requestId` when available (API routes generate one automatically).
- **Event naming**: Use dotted taxonomy — `auth.login_attempted`, `habit.created`, `repo.habit.list`, `api.unauthenticated`.

### Client-side (`lib/logger-client.ts`)

- Client logging is **development-only** — all output is suppressed in production.
- Use `clientLogger.info(...)` for significant UI events during development.
- Never log sensitive data even in development — same redaction rules apply.
- If production client telemetry is needed, route through a dedicated API endpoint.

### Log levels

| Level | When to use |
| --- | --- |
| `debug` | Diagnostic information (repository DB calls, auth flow details). Off in production unless `LOG_LEVEL=debug`. |
| `info` | Significant business events (habit created, user registered, preferences saved). |
| `warn` | Expected-but-notable failures (invalid login, validation rejection, unauthenticated API call). |
| `error` | Unexpected failures only (unhandled exceptions, DB connection failures). |

### Adding logging to new code

When creating a new server action:
```ts
import { logger, redactUserId } from "@/lib/logger";
const log = logger.child({ module: "actions.mymodule" });

export async function myAction(input: MyInput) {
  const userId = await requireUserId();
  log.info("Doing the thing", { event: "thing.done", userId: redactUserId(userId), entityId: input.id });
  // ... implementation
}
```

When creating a new repository function:
```ts
import { logger, redactUserId } from "@/lib/logger";
const log = logger.child({ module: "repo.myentity" });

export async function findEntity(userId: string, entityId: string, db: DbClient = defaultDb) {
  log.debug("Finding entity", { event: "repo.entity.find", userId: redactUserId(userId), entityId });
  // ... implementation
}
```
