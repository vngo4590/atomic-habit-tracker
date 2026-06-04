---
name: atomic-habit-css-conventions
description: Styling conventions for Atomicly — modular `app/styles/` partials, CSS Modules colocated with components and pages, the inline-style policy, Tailwind v4 usage, and templates for adding new components or pages. Use whenever writing styles, adding a new component or page, or reviewing whether an inline `style={{}}` is justified.
---

# Atomicly CSS Conventions

> **TL;DR:** Global tokens in `app/styles/`. Component / page styles in colocated `*.module.css`. No inline `style={{}}` for static layout or colour — only for dynamic CSS-variable passthrough and Framer Motion props.

This repo uses **Tailwind v4** + **CSS Modules** + a small set of global design tokens. This skill is the source of truth for the styling layer.

## 1. Global stylesheet

`app/globals.css` is a thin entry that `@import`s the partials below in cascade order. Never add rules to `globals.css` directly — add them to the appropriate partial.

- `app/styles/tokens.css` — colours, fonts, shadows, transitions (the design system), plus the dark theme.
- `app/styles/base.css` — element reset, body baseline, scrollbars.
- `app/styles/typography.css` — `.h1` / `.h2` / `.h3`, `.lede`, `.markdown-body`, text helpers.
- `app/styles/layout.css` — `.app` shell, sidebar, brand mark, `.main`, `.page-header`.
- `app/styles/components.css` — `.card`, `.btn`, `.input`, `.chip`, `.habit-row`, `.loop`, `.principle-*`.
- `app/styles/animations.css` — `@keyframes` and animation utility classes (`.fade-up`, `.skeleton`, `.glass`, `.focus-ring`).
- `app/styles/responsive.css` — mobile (`max-width: 900px`) and tablet (`901–1180px`) overrides.

## 2. Per-component and per-page styles

- **Component**: `components/Foo.module.css` next to `components/Foo.tsx`. The component imports `styles` and applies classes.
- **Page**: `app/(root)/<route>/page.module.css` next to `page.tsx`.

## 3. Inline `style={{}}` policy

- **Never** for static layout, colour, or sizing. Move into a colocated `*.module.css`.
- **Allowed** for **dynamic CSS-variable passthrough**, e.g. `style={{ "--mood-color": item.color }}` so a generic module class can theme against per-data values. Always add a brief inline comment explaining why.
- **Allowed** for **Framer Motion animation values** (`initial`, `animate`, `whileHover`, `whileTap`) — these are animation, not style.

## 4. Adding a new component

```
components/
  Foo.tsx              // JSX + JSDoc
  Foo.module.css       // Co-located styles
  __tests__/
    Foo.test.tsx       // Given/When/Then test (see atomic-habit-test-quality-standard)
```

## 5. Adding a new page

```
app/(root)/foo/
  page.tsx
  page.module.css
  __tests__/
    page.test.tsx
```

If a page is > 7 KB or > 300 lines, decompose into section components inside `app/(root)/foo/sections/` and keep `page.tsx` as a thin composition layer. See `atomic-habit-design-principles` § 3 (splitting signals).

## 6. Module CSS vs Tailwind

Use module CSS for component-specific styling. Tailwind utilities are acceptable for one-off layout primitives, but prefer modules for anything reused or non-trivial.

## 7. Glossary

- **CSS Modules** — `*.module.css` files whose class names are locally scoped by Next.js at build time. Import `styles from './X.module.css'` and use `styles.className`.
- **CSS variable passthrough** — inline `style={{ "--token": value }}` used to feed per-data values (e.g. mood colour) into a generic CSS module class.

## See Also

- `atomic-habit-ui-animation` — Framer Motion primitives and motion-prop usage
- `atomic-habit-design-principles` — when to split a component / page
- `atomic-habit-workflow` — overall change workflow
