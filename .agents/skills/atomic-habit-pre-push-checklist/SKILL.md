---
name: atomic-habit-pre-push-checklist
description: The mandatory pre-push validation checklist for Atomicly — branch hygiene, commit shape, test/typecheck/lint/build, console-log policy, docs upkeep, and recovery rules when something is broken. Use as a literal pre-push gate before every `git push` and when deciding how to recover from a failed validation step.
---

# Atomicly Pre-Push Checklist

> **TL;DR:** Tests → typecheck → lint → build → push. No raw `console.log`. Docs updated when needed. `git revert` over `git reset --hard`.

This skill is the **pre-flight checklist** for every push. It is referenced by `atomic-habit-workflow` and by every coding agent that prepares a commit.

## 1. The checklist

```
□ Branch is feat/ | fix/ | refactor/ | docs/ | test/ | chore/
□ Each commit is one logical change with a Conventional Commits prefix
□ Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com> trailer present
□ Every new function / component has a JSDoc block
□ No new inline style={{...}} for static layout/colour (CSS variables OK)
□ No raw console.log / .warn / .error in app code (use lib/logger.ts or lib/logger-client.ts)
□ Tests pass:                npm exec vitest run
□ TypeScript clean:          npm run typecheck
□ Lint clean:                npm run lint:app
□ Build succeeds:            npm run build
□ Docs updated (if needed):  README.md, AGENTS.md
□ Branch pushed:             git push -u origin <branch>
```

For broad backend / deployment changes, additionally run `npm run backend:validate` (Prisma validate/generate, typecheck, scoped lint, tests, build).

## 2. Validation commands

```powershell
# Focused test run during development:
npm exec vitest run path/to/file.test.ts

# Run a directory:
npm exec vitest run components/__tests__

# Full unit suite (required before push):
npm exec vitest run

# Typecheck + lint + build (each required before push):
npm run typecheck
npm run lint:app
npm run build
```

> Do **not** use `npm test -- --run`; flags do not pass through reliably.

## 3. Documentation upkeep

After any change that affects architecture, dependencies, routes, data flow, or UI behaviour, update:

- `README.md` — human-facing overview
- `AGENTS.md` — agent-facing conventions and validation commands

If you add a new dependency, list it in README. If you change a validation command, update AGENTS.md. If you add a new route or screen, add it to the routes table in both files. Stale docs are worse than no docs.

## 4. Recovery rules

- If tests fail, fix them **before** adding new code. Don't pile fixes on top of red.
- If the build fails, fix it **before** committing — broken builds in source control waste everyone's time.
- If you are stuck for more than 10 minutes, commit your current progress with a `WIP:` prefix and ask for help.
- **Never** leave the repo in a broken state at the end of a session.
- If you must roll something back, prefer `git revert` over `git reset --hard` so history stays auditable.

## See Also

- `atomic-habit-workflow` — the surrounding session workflow
- `atomic-habit-local-dev` — what each validation command actually does
- `atomic-habit-logging` — why raw `console.log` is banned in app code
