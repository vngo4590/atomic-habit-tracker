# Revamp baseline metrics

Captured 2026-11-27 on `master` (`1fac9c4`) before the modular/UI revamp.
Re-measure after each phase and compare. A phase must not regress these
numbers without a written reason.

## Validation gate

| Check | Result | Wall time |
|---|---|---|
| `npm exec vitest run` | 122 files, 928 passed, 2 skipped | ~97 s |
| `npm run typecheck` + `npm run lint:app` | clean | ~27 s |
| `npm run build` | 25 pages, success | ~36 s |

## First-load JavaScript (gzipped), `npm run bundle:report`

Shared framework JS: **168.3 KB**

| Route | First-load KB | Route-specific KB |
|---|---:|---:|
| /habits/[id] | 305.6 | 137.2 |
| /review | 291.9 | 123.6 |
| /journal | 291.7 | 123.4 |
| /login, /register | 253.0 | 84.7 |
| / | 252.9 | 84.6 |
| /settings | 250.7 | 82.4 |
| /habits/new | 250.6 | 82.3 |
| /pet | 250.6 | 82.2 |
| /habits | 250.3 | 82.0 |
| /analytics | 249.6 | 81.3 |
| /hall-of-fame | 249.4 | 81.1 |
| /identity | 248.7 | 80.3 |

Method: first-load = shared framework files + the union of every segment's
`entryJSFiles` (root layout, group layout and page), de-duplicated and gzipped.

Observation: even `/login` (which renders under `app/(auth)/layout.tsx`, not
the app shell) ships ~85 KB route-specific JS. That is not explained by the
`(root)` shell (`StoreProvider`, `Nav`), which `/login` never loads, so the
weight comes from the login page's own client imports and shared chunks;
attribute it with chunk analysis before optimising. `/habits/[id]`,
`/journal` and `/review` add ~40 KB more, most likely the Markdown renderer.

Phase D targets: no route above **200 KB** first-load, and `/` at least 25 %
below baseline (<= 190 KB).

## Code-health hotspots (lines)

| File | Lines |
|---|---:|
| lib/store.ts | 1,054 |
| app/styles/components.css | 760 |
| lib/repositories/habits.ts | 639 |
| app/(root)/page.tsx | 533 |
| app/(root)/settings/page.tsx | 497 |
| components/StackDiagram.tsx | 489 |
| app/(root)/review/page.tsx | 452 |
| app/styles/responsive.css | 445 |
| lib/repositories/reflection.ts | 438 |
| app/(root)/journal/page.tsx | 400 |

## Known defects found during the survey

- `useStore().toggleHabit` does not roll back the optimistic check-in when
  `toggleHabitAction` rejects, so the UI can show a vote that was never saved
  (ADR-0002).
