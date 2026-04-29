# Agent Instructions

## Framework Rule

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

This project uses Next.js 16.2, React 19, TypeScript, Tailwind CSS 4, and the App Router under `app/`.

## Project Shape

- `app/`: Next.js App Router files.
- `lib/`: shared types, helpers, data, store logic, and tests.
- `reference_ui/`: source reference implementation being ported.
- `openspec/changes/port-reference-ui/`: active OpenSpec proposal, design, specs, and task checklist.
- `.claude/skills/`: project-local skills and skill-maintenance workflows.

## Implementation Workflow

1. Read the relevant OpenSpec artifacts before implementing planned work:
   - `openspec/changes/port-reference-ui/tasks.md`
   - `openspec/changes/port-reference-ui/design.md`
   - Any matching spec under `openspec/changes/port-reference-ui/specs/`
2. Check `reference_ui/` for source behavior and visual patterns before recreating UI or logic.
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

## Validation

- Run focused tests after changing helpers, store logic, or components with tests:
  `npm exec vitest run`
- Run the full test suite when completing a phase:
  `npm exec vitest run`
- Run build verification before final handoff for broad app changes:
  `npm run build`
- `npm test -- --run` may not pass flags through correctly in this project; prefer `npm exec vitest run`.

## Skill Maintenance

- Use `.claude/skills/skill-improvement-loop/` to log and apply skill improvement opportunities.
- Project skill opportunities should be recorded in `.claude/skill-improvement/opportunities.jsonl` via the skill's scripts, not by manual JSON edits.
