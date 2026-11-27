---
name: atomic-habit-design-system
description: Atomicly's calm-minimal design system — semantic tokens in `app/styles/tokens.css`, light/dark theming (`lib/themes.ts`, `lib/appearance.ts`), the `components/ui/` primitive kit and when to use each, navigation/IA and Alt+Shift shortcuts (`components/nav/`), spacing/typography/layout scale, motion rules (LazyMotion + `m`, reduced motion), and the accessibility bar. Use when building or reviewing any page, component, theme, or navigation change, or when choosing between a primitive and custom markup.
---

# Atomicly Design System

> **TL;DR:** Calm, minimal, two themes (light + dark). Compose pages from `@/components/ui` primitives, style only with semantic tokens, keep one primary action per view, and meet the a11y bar (4.5:1 text, visible focus, 44px targets, reduced motion).

Source of truth: `design-system/atomicly/MASTER.md` (rules) and `docs/architecture/adr/0003-design-system-calm-minimal.md` (decision). This skill is the working summary; if they disagree, MASTER.md wins — update this skill.

## 1. Tokens (`app/styles/tokens.css`)

Raw colour literals live **only** in `tokens.css`. Everything else reads semantic variables.

| Group | Tokens |
|---|---|
| Surfaces | `--bg`, `--surface`, `--surface-2`, `--border`, `--border-strong`, `--scrim` |
| Text | `--text`, `--text-muted`, `--text-subtle` |
| Brand / accent | `--primary`, `--primary-hover`, `--on-primary`, `--primary-soft`, `--on-primary-soft`, `--ring` |
| Status | `--success` (= primary), `--warning`, `--danger`, `--danger-soft` |
| Type | `--font-body` (Plus Jakarta Sans via `--font-jakarta`), `--text-xs`…`--text-4xl` (12/14/16/18/20/24/30/36px), `--leading-body` 1.55, `--leading-heading` 1.2, `--tracking-heading`, `--weight-regular/medium/semibold/bold` |
| Spacing | `--space-1..16` on a 4px base (1, 2, 3, 4, 5, 6, 8, 10, 12, 16) |
| Layout | `--page-gutter` (16 → 32 at ≥768 → 48 at ≥1200), `--content-width` 1080px, `--reading-width` 680px, `--tap-target` 44px, `--sidebar-width` 240px, `--topbar-height` 56px, `--tabbar-height` 64px |
| Shape | `--radius-sm` 8, `--radius-md` 12, `--radius-lg` 16, `--radius-full` |
| Depth | `--shadow-sm`, `--shadow-lg` only; `--focus-ring` (two-layer halo) |
| Motion | `--duration-fast` 150ms, `--duration-base` 220ms, `--duration-slow` 320ms, `--ease-standard` |

**Legacy aliases** (`--ink*`, `--rule*`, `--accent*`, `--r-*`, `--serif`, `--mono`, `--shadow`, `--shadow-md`, `--shadow-xl`, `--transition-*`, `--font-sans`/`--font-serif`) exist only so older selectors keep working. Do not use them in new code; migrate when you touch a file.

## 2. Theming

- Exactly two themes: **light** (`:root`) and **dark** (`[data-theme="dark"]` on `<html>`), listed in `lib/themes.ts`.
- Retired themes map on read via `LEGACY_THEME_MAP`: glass/fairy → light, neon/stars → dark.
- The accent is one hue: `--accent-hue` (default 160, sage). `accentColor(hue)` = `oklch(0.48 0.09 hue)`; `--primary*` derive from it, so never hard-code a brand colour.
- Persistence: the server `theme`/accent preferences are authoritative; `localStorage` mirrors `atomicly:theme` and `atomicly:accent` for the no-flash inline script in `app/layout.tsx`. `lib/appearance.ts` (`applyAppearance`) sets the attributes; the legacy `atomicly:theme-variant` key is read once, mapped, and removed. `data-theme-variant` is gone.
- Check every new style in **both** themes. Never branch on the theme in JS for colours — use tokens.

## 3. Primitives (`components/ui/`, import from `@/components/ui`)

| Primitive | Use when | Notes |
|---|---|---|
| `Button` | Any action | `variant` primary/secondary/ghost/danger, `size` sm/md, `icon`, `loading`, `fullWidth`; `href` renders a `Link`. **One primary per view.** `buttonClassName()` styles a non-button element. `sm` is 36px tall — dense rows only. |
| `IconButton` | Icon-only action | `aria-label` is required; 44×44 hit area; `variant` ghost/secondary; `href` supported. |
| `Card` | Grouping related content | `as` div/section/article/li, `padding` none/md/lg. Don't nest cards. |
| `PageHeader` | Top of every page | Renders the page's single `<h1>`; `subtitle`, `eyebrow`, `actions` (at most one primary). |
| `Field` + `Input`/`Select`/`TextArea` | Every form control | `label` required; `hint`; `error` sets `aria-invalid` and links the message. Never a placeholder-only label. |
| `Switch` | Settings that apply immediately | `role="switch"`, `checked` + `onCheckedChange`. Use a form control + submit for save-later forms. |
| `Tabs`/`TabList`/`Tab`/`TabPanel` | In-page views sharing one URL | WAI-ARIA tabs, roving tabindex, arrows/Home/End, controlled or uncontrolled. |
| `RouteTabs` | Sibling routes in a hub | Links with `aria-current`; used by `components/nav/SectionTabs.tsx`. |
| `EmptyState` | Any empty list/view | `icon`, `title`, body, `action` (a CTA), `headingLevel`. Every list needs one. |
| `Skeleton` | Loading placeholders | `shape` block/text/circle with fixed `width`/`height` to avoid layout shift; `aria-hidden`. |
| `Badge` | Short status labels | `tone` neutral/primary/warning/danger. Never colour-only meaning. |
| `ProgressRing` | 0–1 progress | `role="progressbar"`; pass a `label`. |
| `Modal` | Must-acknowledge errors, confirmations | Re-exported from `components/Modal.tsx`; labelled dialog, Esc/backdrop close, focuses its primary button. Destructive actions confirm first. |
| `Toast` | Transient feedback | Re-exported from `components/Toast.tsx`; polite live region fed by `showToast` (`lib/store/toast.ts`). |

Reach for a primitive before writing markup. If a pattern repeats in two features, promote it to `components/ui/` (under the 300-line ESLint `max-lines` cap, with a colocated CSS Module and a test in `components/ui/__tests__/`). `components/ui/package.json` marks the kit side-effect-free — keep modules free of top-level side effects so unused primitives tree-shake.

**Icons:** Lucide only, 20px, stroke 1.75; decorative icons get `aria-hidden`. No emoji as UI icons.

## 4. Navigation and IA (`components/nav/`)

- `nav-items.ts` is the single source of truth (`NAV_ITEMS`): **Today** `/` (T), **Habits** `/habits` (H), **Reflect** `/journal` (R; also active on `/review`), **Insights** `/analytics` (I; also active on `/hall-of-fame`), **Pet** `/pet` (P), **Settings** `/settings` (`,`; reached via the avatar, also active on `/identity`, not in the tab bar).
- Extra page shortcuts: N → `/habits/new`, J → `/journal`, W → `/review`, A → `/analytics`, F → `/hall-of-fame`.
- `useNavShortcuts.ts`: shortcuts require **Alt+Shift** (no Ctrl/Meta), match `event.code`, and are ignored in inputs, selects, textareas and contentEditable (WCAG 2.1.4).
- Shell: `Sidebar.tsx` at ≥1024px; below that `MobileNav.tsx` renders the top bar (title, New habit, avatar) and the bottom tab bar. `components/Nav.tsx` is the entry used by `app/(root)/layout.tsx`.
- Hubs: `SectionTabs.tsx` (`REFLECT_TABS`, `INSIGHTS_TABS`) is rendered by per-route `layout.tsx` files; `/reflect` and `/insights` redirect in `next.config.ts`.
- Onboarding: `components/OnboardingGate.tsx` lazy-loads `components/OnboardingOverlay.tsx` while the server preference `onboardingSeen` is false (no localStorage mirror by design).
- A new top-level destination is an IA change: update `nav-items.ts` (label, href, icon, shortcut, matches), its tests, and the README route table.

## 5. Layout, spacing, typography

- Pages sit in `.main` (`app/styles/layout.css`), capped at `--content-width` and padded by `--page-gutter`; long-form reading uses `--reading-width`. On mobile, `.main` already pads for `--tabbar-height` — account for it before adding fixed elements.
- Spacing comes from `--space-*` only; prefer `gap` in flex/grid over margins.
- Type: one `<h1>` per page (via `PageHeader`), then `h2`/`h3` in order. Body is `--text-base` at `--leading-body`. Global helpers in `typography.css`: `.h1`/`.h2`/`.h3`, `.lede`, `.eyebrow`, `.muted`, `.mono` (tabular numbers), `.markdown-body`.
- Verify at 375 / 768 / 1024 / 1440; `responsive.css` overrides at ≤900px, ≤1023px and 1024–1180px. No horizontal scroll at 375px.

## 6. Motion

- Framer Motion loads through `LazyMotion` in `components/motion/MotionProvider.tsx` (wrapped in `app/(root)/layout.tsx`). **Use `m.*`, never `motion.*`** (ESLint error). `m` does not animate outside the provider (e.g. `(auth)` pages).
- If the feature chunk fails to load (after one retry), `<html>` gets `motion-unavailable` and CSS shows content statically.
- The shell (layout, nav, `PageTransition`, `Toast`) stays CSS-only; the route fade is the `page-enter` keyframe.
- Timings come from `--duration-*` / `lib/animations.ts`; animate `transform`/`opacity` only; motion explains a change, it does not decorate.
- Reduced motion: CSS durations collapse to 0.01ms automatically; Framer components must check `useReducedMotion()` (or `lib/hooks/useMotionReduced.ts`, which also treats narrow screens as reduced).
- Details: `atomic-habit-ui-animation`.

## 7. Accessibility bar (non-negotiable)

- Contrast ≥ 4.5:1 for text and ≥ 3:1 for UI and focus indicators, in both themes.
- Focus is always visible: the global `:focus-visible` outline (2px `var(--ring)`, 2px offset) in `base.css`; use `--focus-ring` for box-shadow cases. Never `outline: none` without a replacement.
- Touch targets ≥ 44px (`--tap-target`).
- Semantic HTML first; every icon-only control has an `aria-label`; tabs/switch/progress use their ARIA roles (the primitives handle this).
- Status is never colour-only — pair it with text or an icon.
- Everything is reachable and operable by keyboard; dialogs close on Esc.
- Live feedback goes through `Toast` (polite) — don't add ad-hoc live regions.

## 8. Checklist: adding a component or page

1. **Where:** feature UI in `features/<name>/ui/<area>/`; shared primitives in `components/ui/`; the route file `app/(root)/<route>/page.tsx` stays thin and imports its view from `@/features/<name>/ui`.
2. **Compose:** `PageHeader` + primitives; one primary action; an `EmptyState` with a CTA for every list; `Skeleton`s sized to the final layout.
3. **Style:** colocated `*.module.css` using semantic tokens and `--space-*`; no raw colours, no static inline `style={{}}` (CSS-variable passthrough only, with a comment). See `atomic-habit-css-conventions`.
4. **Theme:** check light, dark, and a non-default accent hue.
5. **Motion:** `m.*` only, reduced motion handled, no Framer Motion in the shell.
6. **A11y:** keyboard pass, visible focus, labels, 44px targets, contrast.
7. **Responsive:** 375 / 768 / 1024 / 1440, no horizontal scroll.
8. **Validate:** colocated `__tests__/` test, `npm run lint:app`, `npm run typecheck`, `npm exec vitest run <path>`; for new routes or heavy dependencies also `npm run build && npm run bundle:check` (230 KB gz first-load budget).

## See Also

- `atomic-habit-css-conventions` — CSS partials, CSS Modules, inline-style policy
- `atomic-habit-ui-animation` — Framer Motion primitives, springs, variants
- `atomic-habit-architecture` — feature-slice layout and import rules
- `atomic-habit-design-principles` — when to split a component
