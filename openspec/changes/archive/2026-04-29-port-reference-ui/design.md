## Context

A complete reference UI lives in `reference_ui/` as plain React + vanilla JS files (no bundler, no TypeScript). The `app/` directory is an untouched Next.js 16 scaffold. The port translates the reference design 1:1 into production Next.js code — same visual output, same interactions, properly typed and structured.

Current state: `app/page.tsx` renders the default Create Next App landing page. No routes, no components, no store, no custom styles.

## Goals / Non-Goals

**Goals:**
- All 10 screens from the reference UI are reachable via Next.js file-system routes
- State persists across page refreshes via localStorage
- Design tokens and visual output match the reference exactly (same oklch palette, same fonts, same layout)
- Pure logic (helpers, store mutations) is covered by Vitest unit tests
- TypeScript throughout — no `any`, no implicit types

**Non-Goals:**
- Backend, database, or API routes — localStorage only
- Authentication / user accounts
- Real notification scheduling (settings toggles are UI-only)
- Real accountability contract email sending (UI-only)
- Mobile / responsive layout (reference is a desktop app)
- Server-side rendering of user data (all screens are client components)

## Decisions

### D1: Route group `(root)` for the sidebar shell

**Decision:** All app screens live under `app/(root)/` and share `app/(root)/layout.tsx`, which renders the sidebar + main content wrapper. The root `app/layout.tsx` only sets up `<html>`/`<body>`, fonts, and global CSS.

**Why:** The sidebar persists across all routes. A route group layout is the canonical Next.js pattern for a persistent shell without a URL segment. Alternatives like a single `page.tsx` with JS-based routing (mirroring the reference) would lose URL-addressability and break the browser back button.

### D2: All screens are Client Components

**Decision:** Every screen file has `'use client'` at the top. No React Server Components for screen content.

**Why:** All screens read from the store (React Context), use `useState`/`useMemo`/`useEffect`, and interact with localStorage. Server Components can't access any of these. The store context requires a client boundary at the layout level anyway.

### D3: React Context + localStorage for state

**Decision:** `lib/store.ts` exports `useStore()` which returns all state + mutations. `components/StoreProvider.tsx` wraps the shell layout with a Context. All state is hydrated from localStorage on mount and persisted on every mutation.

**Why:** No server, no database. The reference uses in-memory state; localStorage is the minimal persistence upgrade. React Context avoids prop-drilling across the deep component tree. Alternatives (Zustand, Jotai) add a dependency for no additional benefit given the scope.

**Persistence key:** `atomicly:store` for habits/journal/identity; `atomicly:formed` for Hall of Fame verdicts; `atomicly:lessons` for lesson completion. Separate keys allow partial resets.

### D4: CSS — port reference styles to globals.css, layer Tailwind for utilities

**Decision:** The entire `reference_ui/styles.css` is ported into `app/globals.css` as raw CSS (CSS custom properties, base classes like `.card`, `.btn`, `.habit-row`, etc.). Tailwind 4's `@import "tailwindcss"` is kept at the top; the `@theme inline` block exposes design tokens to Tailwind. Tailwind utility classes are used sparingly in JSX for layout/spacing where they don't conflict with the custom class system.

**Why:** The reference relies heavily on a custom class system (`.card`, `.h1`, `.eyebrow`, `.check`, etc.). Replacing all of these with Tailwind utilities would require rewriting every component and risks visual drift. Keeping the custom classes as-is in `globals.css` means the JSX can be a near-direct translation of the reference JSX.

### D5: Fonts via `next/font/google`

**Decision:** Load `Instrument_Serif`, `Inter_Tight`, and `JetBrains_Mono` via `next/font/google` in `app/layout.tsx`. Expose them as CSS variables: `--font-serif`, `--font-sans`, `--font-mono`. Reference these variables in `globals.css` (replacing the font stacks in the reference CSS).

**Why:** `next/font` self-hosts fonts, eliminates layout shift, and is the recommended approach in Next.js 16. The reference uses Google Fonts CDN; the font names map directly.

### D6: Next.js file-system routing for all screens

**Decision:**
```
app/(root)/page.tsx             → Today
app/(root)/habits/page.tsx      → Habits list
app/(root)/habits/[id]/page.tsx → Habit detail
app/(root)/habits/new/page.tsx  → Create habit
app/(root)/analytics/page.tsx
app/(root)/journal/page.tsx
app/(root)/review/page.tsx
app/(root)/lessons/page.tsx
app/(root)/hall-of-fame/page.tsx
app/(root)/identity/page.tsx
app/(root)/settings/page.tsx
```

**Why:** The reference's `route.name` JS switch maps 1:1 to Next.js route segments. URL-addressable routes make linking, back-navigation, and future deep-linking work out of the box. The habit detail `[id]` dynamic segment replaces `route.habitId`.

### D7: Vitest for unit tests

**Decision:** Vitest + `@testing-library/react` for unit tests. Test files live at `lib/__tests__/`. Only pure logic is tested: `helpers.ts` functions and store mutation logic.

**Why:** The Next.js docs recommend Vitest for unit testing. UI component testing at this fidelity adds little value over running the dev server. The real regression risk is in date math and streak calculations — those are pure functions that unit tests catch immediately.

## Risks / Trade-offs

- **localStorage size limits** → Habits with long history (90+ days × many habits) can grow large. For the expected scope (< 20 habits), well within the 5MB limit. Mitigation: compact date-key storage (ISO string slices) keeps payloads small.
- **oklch in older browsers** → The design uses `oklch()` colors, which require Chrome 111+/Safari 16.4+. This matches Next.js 16's own browser support floor, so no mitigation needed.
- **Hydration mismatch** → localStorage isn't available on the server. Mitigation: all screens are Client Components; store hydration happens in `useEffect` on mount. The store starts with sample data on first mount if localStorage is empty, avoiding the empty-state flash.
- **Font fallback flash** → Instrument Serif is a display font; mismatched fallback causes layout shift. Mitigation: `next/font` with `display: 'swap'` and adjusted `sizeAdjust` on the fallback font.

## Open Questions

- None blocking implementation. Accent-color persistence (Settings screen) can reuse the `atomicly:store` key or a separate `atomicly:prefs` key — either is fine; implement whichever is cleaner.
