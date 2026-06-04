---
name: atomic-habit-design-principles
description: SOLID and GRASP design principles applied to the Atomicly codebase, with repo-specific guidance on file size, module boundaries, dependency direction, and when to split a file. Use whenever a change spans more than one file, when refactoring a growing component or module, or when reviewing whether a new abstraction belongs.
---

# Atomicly Design Principles

> **TL;DR:** One reason to change per file. Files >300 lines or >7 KB are a signal to split. `lib/` never imports from `components/`. Replace `if (kind === ...)` branching with named variants.

These are the non-negotiable design rules for any change spanning more than one file. They are referenced from `atomic-habit-workflow`.

## 1. SOLID

| Principle | What it means here |
| --- | --- |
| **S — Single responsibility** | One reason to change per file. A page file should compose section components; a helper module should own *one* concept. Files > 300 lines or > 7 KB are a strong signal to split. |
| **O — Open/closed** | Extend with new variants, not new conditionals branching on `kind`. Example: add a new mood by appending to `MOODS`, not by `if (mood === "anger") { ... }`. |
| **L — Liskov substitution** | A new variant component must satisfy the same prop contract as its siblings. Don't sneak in extra required props at one call site. |
| **I — Interface segregation** | Props interfaces should expose only what each call site needs. Don't add `onEverything` callbacks; split into focused props. |
| **D — Dependency inversion** | Components import from `lib/` and `components/`. `lib/` modules never import from `components/`. Server actions live in `lib/actions/` and depend on repositories, not the other way around. |

## 2. GRASP

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

## 3. Splitting signals

Split a file or component when **any** of these is true:
- It exceeds ~300 lines or ~7 KB.
- It has more than one reason to change (multiple consumers asking different things of it).
- A single test would need to cover unrelated branches.
- The same data is being passed through more than two levels of props.

Decompose into:
- `components/Foo/` with `Foo.tsx` (composition), sub-component files, optional `Foo.module.css`, and a barrel `index.ts`.
- Or `app/(root)/<route>/sections/` for page-specific sections, keeping `page.tsx` as a thin composition layer.

## 4. Glossary

- **GRASP** — General Responsibility Assignment Software Patterns. Nine OO design heuristics by Craig Larman.
- **SOLID** — Single responsibility / Open-closed / Liskov / Interface segregation / Dependency inversion.

## See Also

- `atomic-habit-workflow` — session-level conventions that invoke these principles
- `atomic-habit-css-conventions` — module-vs-global styling rules that follow from High Cohesion
- `atomic-habit-architecture` — the dependency direction rules in concrete form
