---
name: atomic-habit-test-mocking-patterns
description: Mocking and isolation patterns for Atomicly tests — vi.mock and vi.hoisted recipes, mock Prisma client injection, fixture usage, Framer Motion jsdom workarounds, next-auth ESM interop, and known module-resolution traps. Use when setting up a test, debugging a flaky or environment-dependent failure, or onboarding a new test file.
---

# Atomicly Test Mocking Patterns

> **TL;DR:** Mock at the boundary, hoist when needed, never duplicate fixture shapes, and stub `IntersectionObserver` for `whileInView`.

This skill is the source of truth for **how to isolate the subject under test** without spinning up real infrastructure. Pair with `atomic-habit-test-tier-policy` (which says you must isolate).

## 1. Mocking server actions in component / store tests

```typescript
vi.mock("@/lib/actions/domain", () => ({
  createHabitAction: vi.fn(),
  // ... list every action the module under test imports
}));
```

Use `vi.hoisted()` when mocks must be available before imports:

```typescript
const mocks = vi.hoisted(() => ({
  requireUserId: vi.fn(),
  revalidatePath: vi.fn(),
  createHabit: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/auth/session", () => ({ requireUserId: mocks.requireUserId }));
vi.mock("@/lib/repositories/habits", () => ({ createHabit: mocks.createHabit }));
```

## 2. Injecting a mock Prisma client

Repository functions accept an optional `db` argument for testing:

```typescript
const db = {
  habit: {
    create: vi.fn(async () => ({ id: "h_1", name: "Run" })),
    findMany: vi.fn(async () => []),
  },
} as never;

await createHabit("user_1", payload, db);
expect(db.habit.create).toHaveBeenCalledWith(expect.objectContaining({ data: { userId: "user_1", name: "Run" } }));
```

## 3. Using fixtures

Always start from `testHabit()`, `testJournalEntry()`, `testStoreSnapshot()`, etc. and patch only what the test cares about:

```typescript
const habit = testHabit({ id: "h_edge", history: { "2030-01-01": true, "2030-01-03": true } });
```

Never hardcode full fixture objects inline — drift from the type definition will cause silent mismatches.

## 4. Date keys

Use `todayKey()` from `lib/helpers.ts` for the current local date. Use `lib/date-keys.ts` helpers when UTC/local conversion matters. Never use `new Date().toISOString().slice(0, 10)` as a habit day key.

## 5. Framer Motion in jsdom

- **`whileInView`** requires an `IntersectionObserver` mock:
  ```typescript
  beforeEach(() => {
    global.IntersectionObserver = vi.fn(() => ({
      observe: vi.fn(),
      disconnect: vi.fn(),
      unobserve: vi.fn(),
    })) as unknown as typeof IntersectionObserver;
  });
  ```
- **`AnimatePresence` with `mode="wait"`** causes tests to hang in jsdom because exit animations never complete. Avoid this mode in testable components, or mock `AnimatePresence` as a pass-through.
- **Spring transitions support exactly 2 keyframes.** Using `[1, 1.15, 1]` with `type: "spring"` causes a hard runtime crash. Use `duration` + `ease` tween for multi-keyframe animations.

## 6. Lucide icons

Lucide-react icons use `LucideProps`, not `SVGProps<SVGSVGElement>`. The `size` prop is valid:
```typescript
import type { LucideProps } from "lucide-react";
type IconProps = LucideProps;
```

## 7. `next-auth` / `next/server` ESM interop

`next-auth` internally imports `next/server` (without `.js`), which fails in vitest on Node.js with ESM/CJS interop errors. If a test file or its imports transitively pull in `next-auth`, mock `@/lib/actions/domain` (or whichever local module imports `next-auth`) at the **very top** of the test file:

```typescript
vi.mock("@/lib/actions/domain", () => ({
  createHabitAction: vi.fn(),
  toggleHabitAction: vi.fn(),
  // ... every exported action
}));
```

## 8. App Router pages in component tests

Importing App Router `page.tsx` files directly into jsdom tests can trigger hydration and module-resolution issues. Prefer testing the underlying client components (the ones marked `"use client"`) rather than the page entry point. If you must test a page, ensure all server-side dependencies (auth, data fetching) are mocked before the import.

## 9. localStorage stubbing

When stubbing `localStorage` in tests, use `Object.defineProperty(window, "localStorage", { configurable: true, value: { ... } })` per file. Other test files leak partial stubs across workers and break `removeItem` / `clear`.

## 10. Test isolation troubleshooting

If a test passes individually but fails in the full suite, suspect:
1. **Module cache pollution** — another test loaded a real module that conflicts with your mock.
2. **Global state leakage** — `localStorage`, `document.documentElement` attributes, or timers not cleaned up in `afterEach`.
3. **Missing mock reset** — `vi.clearAllMocks()` in `beforeEach` is not always enough; use `vi.resetAllMocks()` or re-assign `vi.fn()` references.

## See Also

- `atomic-habit-test-quality-standard` — the assertion bar
- `atomic-habit-test-tier-policy` — what may and may not be mocked at each tier
- `atomic-habit-test-edge-cases` — scenarios these mocks must cover
