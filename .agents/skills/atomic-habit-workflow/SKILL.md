# Atomicly Agent Workflow

## Purpose
Mandatory workflow conventions for every coding session on the Atomicly habit tracker. Follow these rules on every change — no exceptions.

## 1. Branch Per Task
- Create a new branch for every distinct task or instruction.
- Branch naming: `feat/<short-description>`, `fix/<short-description>`, `docs/<short-description>`, `test/<short-description>`.
- Never commit directly to `master`.
- Push the branch to origin after each meaningful commit.

## 2. Small Incremental Commits
- Commit after every logical, self-contained change — not after finishing an entire feature.
- A commit should do one thing: add a component, fix a bug, add a test, update docs.
- If a commit message needs "and", it is too big — split it.
- Example good commits:
  - `feat(habits): animate habit row check toggle with spring`
  - `test(toast): add entrance/exit animation coverage`
  - `docs(readme): add framer-motion to tech stack`

## 3. Test Every Change
- If you create or modify a component, write or update a test.
- If you modify `lib/` helpers, write or update a unit test.
- Run focused tests after every file change: `npm exec vitest run path/to/file.test.ts`
- Run the full suite before pushing: `npm exec vitest run`
- Run the build before final handoff: `npm run build`
- A change is NOT complete until tests pass.
- If a test is hard to write, that is a signal the code has too many side effects — refactor first.

## 4. Comment for Non-Coders
- Every function, component, and non-trivial block of code MUST have a comment explaining what it does and why.
- Write comments as if explaining to a product manager who cannot read code.
- Bad: `// increment counter`
- Good: `// When the user checks off a habit, we increment their daily streak so the UI can show fire icons and encourage consistency.`
- Bad: `// map over habits`
- Good: `// Group habits by time of day (Morning/Afternoon/Evening) so the Today page shows them in the order the user is most likely to complete them.`
- Export boundaries and public APIs especially need JSDoc-style comments.
- CSS custom properties and animation tokens need comments explaining their visual purpose.

## 5. Update Skills When Opportunities Arise
- After every session, ask: "Did I discover a pattern, convention, or gotcha that future agents should know?"
- If yes, update the relevant `.agents/skills/atomic-habit-*` skill.
- If no skill exists, consider creating one.
- Run `scripts/sync-agent-skills.ps1` after editing skills.
- Log skill improvement opportunities in `.agents/skills/skill-improvement-loop/`.

## 6. Keep Docs Current
- After any change that affects architecture, dependencies, routes, data flow, or UI behavior, update:
  - `README.md` for human-facing overview changes
  - `AGENTS.md` for agent-facing conventions and validation commands
- If you add a new dependency, list it in README.
- If you change a validation command, update AGENTS.md.
- If you add a new route or screen, add it to the routes table in both files.
- Stale docs are worse than no docs.

## 7. Validation Checklist (Before Every Push)
```
□ Tests pass:      npm exec vitest run
□ TypeScript clean: npm run typecheck
□ Build succeeds:   npm run build
□ Skills synced:    ./scripts/sync-agent-skills.ps1
□ Docs updated:     README.md, AGENTS.md reviewed
□ Committed small:  each commit is one logical change
□ Branch pushed:    git push -u origin <branch-name>
```

## 8. Error Handling
- If tests fail, fix them before adding new code.
- If the build fails, fix it before committing.
- If you are stuck for more than 10 minutes, commit your current progress with a `WIP:` prefix and ask for help.
- Never leave the repo in a broken state at the end of a session.
