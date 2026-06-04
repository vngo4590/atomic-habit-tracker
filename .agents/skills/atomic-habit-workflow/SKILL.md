---
name: atomic-habit-workflow
description: Mandatory session-level workflow conventions for the Atomicly habit tracker — branch per task, small Conventional Commits, test-every-change rule, preserve user work, and pre-push validation. Load at the start of every coding session and before any change to this repo. Links to atomic sub-skills for detailed design principles, CSS conventions, and the pre-push checklist.
---

# Atomicly Agent Workflow

> **TL;DR:** Branch → tiny commit → test → repeat. Comment everything. Validate before push. No exceptions.

This skill is the **source of truth for *how* we change code** in this repo. It keeps the mandatory session rules inline so they're never one click away. Detailed conventions live in linked sub-skills.

## Always-load detail sub-skills (read as needed during the session)

| Topic | Sub-skill |
|---|---|
| SOLID + GRASP, file-size signals, dependency direction | **`atomic-habit-design-principles`** |
| CSS Modules, global partials, inline-style policy, templates | **`atomic-habit-css-conventions`** |
| Pre-push validation checklist and recovery rules | **`atomic-habit-pre-push-checklist`** |
| Server/client logger, redaction, taxonomy | **`atomic-habit-logging`** |
| Framer Motion primitives and animation conventions | **`atomic-habit-ui-animation`** |
| Where things live in the tree | **`atomic-habit-architecture`** |
| Local dev / DB / validation commands | **`atomic-habit-local-dev`** |
| Test quality + tier policy + edge cases + mocks | **`atomic-habit-test-engineer`** and its sub-skills |

## 1. Branch per task

- Create a new branch for every distinct task or instruction.
- Branch naming: `feat/`, `fix/`, `refactor/`, `docs/`, `test/`, `chore/`.
- Never commit directly to `master`.
- Push the branch to origin after each meaningful commit so reviewers can follow along.

## 2. Small incremental commits

- Commit after every logical, self-contained change — not after finishing an entire feature.
- One commit = one thing. If the message needs the word "and", split it.
- Use Conventional Commits prefixes (`feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `style`, `perf`) with an optional scope.

**Good:**
- `feat(habits): animate habit row check toggle with spring`
- `test(toast): add entrance/exit animation coverage`
- `docs(readme): add framer-motion to tech stack`
- `refactor(modal): extract inline styles to Modal.module.css`

**Bad:**
- `update stuff`, `feat: today page + new habit form + tests`, `wip`

Every commit must include `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>` when AI-assisted.

## 3. Test every change

A change is not complete until tests pass.

- New / modified **component** → write or update a test in `components/__tests__/`.
- Modified **`lib/` helper or repository** → write or update a unit test next to it.
- Changed **server action** → update or add a test in `lib/actions/__tests__/`.
- If a test is hard to write, that is a signal the code has too many side effects — refactor first.

Detail and tier guidance → `atomic-habit-test-engineer` and the test sub-skills.

## 4. Comment for non-coders

Every function, component, and non-trivial block of code MUST have a comment explaining what it does **and why**.

- Write comments as if explaining to a product manager who cannot read code.
- Export boundaries and public APIs need JSDoc-style comments.
- CSS custom properties, design tokens, and animation tokens need comments explaining their **visual** purpose.

| Bad | Good |
| --- | --- |
| `// increment counter` | `// When the user checks off a habit, we increment their daily streak so the UI can show fire icons and encourage consistency.` |
| `// map over habits` | `// Group habits by time of day (Morning/Afternoon/Evening) so the Today page shows them in the order the user is most likely to complete them.` |
| `// reset state` | `// On Cancel, restore the draft from the saved value so unsaved edits don't leak back into the next edit session.` |

Top-of-file JSDoc on a component should explain: what it is, when it's rendered, what its key interactions are, and any non-obvious styling decisions.

## 5. Preserve user work

- Do not revert unrelated changes. Stay in the git tree the user gave you.
- If you must roll something back, prefer `git revert` over `git reset --hard` so history stays auditable.
- If you are stuck for more than 10 minutes, commit your progress with a `WIP:` prefix and ask for help.
- Never leave the repo in a broken state at the end of a session.

## 6. SOLID + GRASP

Multi-file changes must respect SOLID + GRASP. The detailed rules and Atomicly-specific splitting signals (files > 300 lines / > 7 KB) live in **`atomic-habit-design-principles`**.

## 7. Styling

CSS Modules + global partials in `app/styles/`. No inline `style={{}}` for static layout or colour. Full rules → **`atomic-habit-css-conventions`**.

## 8. Validate before push

Use **`atomic-habit-pre-push-checklist`** as a literal pre-flight before every `git push`. Minimum gate:

```powershell
npm exec vitest run     # tests
npm run typecheck       # TypeScript
npm run lint:app        # lint
npm run build           # production build
```

Then push:

```powershell
git push -u origin <branch>
```

## 9. Update skills and docs when opportunities arise

After every session, ask: "Did I discover a pattern, convention, or gotcha that future agents should know?"

- If yes, update the relevant `.agents/skills/atomic-habit-*` skill (or its sub-skill — keep edits close to the canonical owner).
- If no skill exists, consider creating one.
- Log unresolved skill-improvement opportunities via the `skill-improvement-loop` scripts.
- Update `README.md` and `AGENTS.md` when architecture, dependencies, routes, data flow, or UI behaviour change.

## 10. AI agent etiquette

- Read this file at the start of every coding session.
- Read the relevant sub-skill for the area you're touching (see the table at the top).
- For non-trivial work (multiple files, architectural decisions), consult the `rubber-duck` agent **before** implementing — design feedback is cheap at the plan stage.
- Use the OpenSpec skills (`openspec-propose`, `openspec-apply-change`, `openspec-archive-change`, `openspec-explore`) when the work spans multiple sessions or needs upfront design.
