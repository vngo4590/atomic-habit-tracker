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

Observation: even `/login` ships ~85 KB route-specific JS, so the root layout
pulls heavy client code (Framer Motion, the store, the nav) into every page.
`/habits/[id]`, `/journal` and `/review` add ~40 KB more, most likely the
Markdown renderer.

Phase D targets: no route above **200 KB** first-load, and `/` at least 25 %
below baseline (<= 190 KB).

### Phase D result

The 200 KB target assumed a smaller framework: React + the Next router alone
are 167 KB, leaving ~33 KB for the app shell plus the page. Achieved instead:

| Route | Baseline KB | Phase D KB | Change |
|---|---:|---:|---:|
| /login, /register | 253.0 | 188.6 | -25 % |
| /habits/[id] | 305.6 | 224.5 | -27 % |
| /journal | 291.7 | 218.0 | -25 % |
| /review | 291.9 | 217.7 | -25 % |
| /identity | 248.7 | 216.5 | -13 % |
| / (Today) | 252.9 | 229.0 | -9 % |

How: Framer Motion moved behind `LazyMotion` (`m.*` + async `domAnimation`),
the app shell's page fade and toast became CSS keyframes, the onboarding
overlay is lazy-loaded, and `components/ui` is marked side-effect free so
unused primitives tree-shake. Only Today, Pet and Habit detail (which animate)
still load the motion core. `npm run bundle:check` now fails the gate if any
route exceeds **230 KB** (run by `backend:validate`).

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
