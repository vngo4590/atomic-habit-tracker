---
name: atomic-habit-css-conventions
description: Styling conventions for Atomicly — modular `app/styles/` partials, CSS Modules colocated with components and pages, the inline-style policy, Tailwind v4 usage, and templates for adding new components or pages. Use whenever writing styles, adding a new component or page, or reviewing whether an inline `style={{}}` is justified.
---

# Atomicly CSS Conventions

> **TL;DR:** Global tokens in `app/styles/`. Reach for `@/components/ui` primitives first; component / page styles live in colocated `*.module.css` using **semantic tokens only**. No inline `style={{}}` for static layout or colour — only for dynamic CSS-variable passthrough and Framer Motion props.

This repo uses **Tailwind v4** + **CSS Modules** + a small set of global design tokens. This skill is the source of truth for the styling layer; tokens, themes, primitives and the a11y bar are summarised in `atomic-habit-design-system`.

## 1. Global stylesheet

`app/globals.css` is a thin entry that `@import`s the partials below in cascade order. Never add rules to `globals.css` directly — add them to the appropriate partial.

- `app/styles/tokens.css` — semantic tokens (colour roles, type scale, spacing, radius, shadow, motion, layout) for light (`:root`) and dark (`[data-theme="dark"]`), plus deprecated legacy aliases. The **only** file allowed raw colour literals.
- `app/styles/base.css` — element reset, body baseline, global `:focus-visible` ring, scrollbars.
- `app/styles/typography.css` — `.h1` / `.h2` / `.h3`, `.lede`, `.eyebrow`, `.muted`, `.mono`, `.markdown-body`.
- `app/styles/layout.css` — `.app` shell, `.main`, `.page-header` (sidebar/tab-bar styles live in `components/nav/*.module.css`).
- `app/styles/components.css` — legacy shared classes (`.card`, `.btn`, `.input`, `.chip`, `.habit-row`, `.loop`, `.principle-*`, `.stack-*`). Prefer `components/ui` primitives in new code.
- `app/styles/animations.css` — `@keyframes` and animation utilities (`.fade-up`, `.skeleton`, `page-enter`, the `.motion-unavailable` fallback).
- `app/styles/responsive.css` — mobile (`max-width: 900px`), below-desktop (`max-width: 1023px`) and small-desktop (`1024–1180px`) overrides.

## 2. Per-component and per-page styles

- **Primitive**: `components/ui/Foo.tsx` + `components/ui/Foo.module.css`, exported from `components/ui/index.ts`.
- **Feature component**: `features/<name>/ui/<area>/Foo.tsx` + `Foo.module.css` (e.g. `features/habits/ui/today/TodayView.module.css`).
- **Shared app component**: `components/Foo.tsx` + `components/Foo.module.css`.
- **Page**: `app/(root)/<route>/page.tsx` is a thin shell that renders a view from `@/features/<name>/ui`; the view and its CSS Module live in the feature's `ui/` folder. Don't add `page.module.css` files (route-level files such as `loading.tsx` may keep a small colocated module, e.g. `app/(root)/habits/loading.module.css`).
- Use only semantic tokens (`--surface`, `--text-muted`, `--primary`, `--space-4`, `--radius-md`, …). Legacy aliases (`--ink*`, `--rule*`, `--accent*`, `--r-*`, `--shadow-md/xl`, `--transition-*`) are deprecated — migrate them when you touch a rule.

## 3. Inline `style={{}}` policy

- **Never** for static layout, colour, or sizing. Move into a colocated `*.module.css`.
- **Allowed** for **dynamic CSS-variable passthrough**, e.g. `style={{ "--mood-color": item.color }}` so a generic module class can theme against per-data values. Always add a brief inline comment explaining why.
- **Allowed** for **Framer Motion animation values** (`initial`, `animate`, `whileHover`, `whileTap`) — these are animation, not style.

## 4. Adding a new component

```
features/<name>/ui/<area>/      // or components/ui/ for a shared primitive
  Foo.tsx              // JSX + JSDoc; compose @/components/ui primitives
  Foo.module.css       // Co-located styles, semantic tokens only
  __tests__/
    Foo.test.tsx       // Given/When/Then test (see atomic-habit-test-quality-standard)
```

Export it from the feature's `ui/index.ts` if other code needs it. ESLint caps `features/**` and `components/ui/**` files at 300 lines.

## 5. Adding a new page

```
app/(root)/foo/
  page.tsx             // thin: import { FooView } from "@/features/<name>/ui"
features/<name>/ui/foo/
  FooView.tsx
  FooView.module.css
  __tests__/
    FooView.test.tsx
```

If a view is > 7 KB or > 300 lines, decompose it into section components in the same `ui/<area>/` folder and keep the view a thin composition layer. See `atomic-habit-design-principles` § 3 (splitting signals) and the page checklist in `atomic-habit-design-system`.
## 6. Module CSS vs Tailwind

Use module CSS for component-specific styling. Tailwind utilities are acceptable for one-off layout primitives, but prefer modules for anything reused or non-trivial.

## 7. Glossary

- **CSS Modules** — `*.module.css` files whose class names are locally scoped by Next.js at build time. Import `styles from './X.module.css'` and use `styles.className`.
- **CSS variable passthrough** — inline `style={{ "--token": value }}` used to feed per-data values (e.g. mood colour) into a generic CSS module class.

## See Also

- `atomic-habit-design-system` — tokens, light/dark themes, `components/ui` primitives, a11y bar
- `atomic-habit-ui-animation` — Framer Motion primitives and motion-prop usage
- `atomic-habit-design-principles` — when to split a component / page
- `atomic-habit-workflow` — overall change workflow
