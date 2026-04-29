## 1. Test Infrastructure & Dev Dependencies

- [x] 1.1 Install Vitest, @vitejs/plugin-react, jsdom, @testing-library/react, vite-tsconfig-paths as dev dependencies
- [x] 1.2 Create `vitest.config.mts` with jsdom environment and tsconfigPaths plugin
- [x] 1.3 Add `"test": "vitest"` script to `package.json`

## 2. TypeScript Types

- [x] 2.1 Create `lib/types.ts` with `Habit`, `CheckIn`, `Note`, `JournalEntry`, `Identity`, `ToastState`, and `StoreState` interfaces
- [x] 2.2 Create `lib/lessons-data.ts` with the `Lesson` interface and all 24 lesson objects from the reference

## 3. Helper Functions & Tests

- [x] 3.1 Create `lib/helpers.ts` with `todayKey()`, `dateAdd()`, and `fmt` (long, short, weekday, time formatters)
- [x] 3.2 Write `lib/__tests__/helpers.test.ts` — tests for `todayKey`, `dateAdd`, and `fmt`
- [x] 3.3 Run `npm test` and confirm all helper tests pass

## 4. Sample Data

- [ ] 4.1 Create `lib/sample-data.ts` with `seedHistory()` and the six `SAMPLE_HABITS` array
- [ ] 4.2 Add `SAMPLE_JOURNAL` and default `SAMPLE_IDENTITY` to `lib/sample-data.ts`

## 5. Store (React Context + localStorage)

- [ ] 5.1 Create `lib/store.ts` with `useStore()` implementing all mutations: `toggleHabit`, `logCheckIn`, `addHabit`, `updateHabit`, `deleteHabit`, `addJournal`, `setIdentity`, `showToast`
- [ ] 5.2 Implement `streak()`, `longestStreak()`, and `completionRate()` as store methods in `lib/store.ts`
- [ ] 5.3 Add localStorage hydration in `useStore()`: load from `atomicly:store` on mount, persist on every state change
- [ ] 5.4 Create `components/StoreProvider.tsx` as a React Context provider wrapping the store
- [ ] 5.5 Write `lib/__tests__/store.test.ts` — tests for `toggleHabit` (on/off), `streak`, `longestStreak`, `completionRate`
- [ ] 5.6 Run `npm test` and confirm all store tests pass

## 6. Design Tokens & Global CSS

- [ ] 6.1 Replace `app/globals.css` with ported design tokens (CSS custom properties for colors, typography, radius, shadow) from `reference_ui/styles.css`
- [ ] 6.2 Port all base classes into `globals.css`: `.card`, `.btn`, `.habit-row`, `.check`, `.chip`, `.loop`, `.tabs`, `.tab`, `.dot`, `.input`, `.field-label`, `.eyebrow`, `.h1`, `.h2`, `.h3`, `.lede`, `.muted`, `.mono`, `.fade-up`, `.page-header`, `.vote-bar`, `.streak-pill`, `.overlay`, `.overlay-card`, `.toast`
- [ ] 6.3 Add `@theme inline` block to expose `--font-serif`, `--font-sans`, `--font-mono` as Tailwind tokens

## 7. Root Layout & Fonts

- [ ] 7.1 Update `app/layout.tsx` to load `Instrument_Serif`, `Inter_Tight`, and `JetBrains_Mono` via `next/font/google`, exposing them as CSS variables
- [ ] 7.2 Update metadata title to "Atomic Habits" and remove default Geist fonts

## 8. Icons Component

- [ ] 8.1 Create `components/Icons.tsx` exporting all named icon components (`IconToday`, `IconList`, `IconPlus`, `IconChart`, `IconJournal`, `IconReview`, `IconIdentity`, `IconSettings`, `IconCheck`, `IconFlame`, `IconArrow`, `IconBack`, `IconEdit`, `IconTrash`, `IconLink`, `IconStar`, `IconSun`, `IconMoon`, `IconSearch`, `IconClose`, `IconBook`) as typed React SVG components

## 9. App Shell Layout & Navigation

- [ ] 9.1 Create `app/(root)/layout.tsx` wrapping all routes with `StoreProvider`, sidebar, and main content area
- [ ] 9.2 Create `components/Nav.tsx` rendering the sidebar with brand mark, grouped nav items (Practice / Reflect / Learn / Become), keyboard shortcuts, and user footer
- [ ] 9.3 Wire `usePathname()` in Nav to apply the active style to the current route's nav item
- [ ] 9.4 Create `components/Toast.tsx` that reads `toast` from the store context and auto-dismisses after 2.4s

## 10. Today Screen

- [ ] 10.1 Create `components/CompletionRing.tsx` — SVG donut ring accepting `pct` prop
- [ ] 10.2 Create `components/HabitRow.tsx` — single habit row with check button, habit name/meta, identity chip, streak pill, and arrow
- [ ] 10.3 Create `app/(root)/page.tsx` as the Today screen: greeting, stats row (ring + streak + sparkline), identity vote panel, and habit groups by time of day

## 11. Mood Components

- [ ] 11.1 Create `components/MoodCheckSheet.tsx` — modal overlay with 5-point mood selector and journal textarea
- [ ] 11.2 Create `components/MoodChart.tsx` — SVG line chart of mood over the last N days for a habit
- [ ] 11.3 Create `components/HabitJournalStream.tsx` — renders check-in entries that have mood or journal text, with delete per entry

## 12. Habits List Screen

- [ ] 12.1 Create `app/(root)/habits/page.tsx` with filter tabs, sort dropdown, and table of all habits (streak, best, 30-day bar)

## 13. Editable Field Components

- [ ] 13.1 Create `components/EditableLaw.tsx` — click-to-edit inline field used for the four habit laws in the Overview tab
- [ ] 13.2 Create `components/EditableLine.tsx` — single-line click-to-edit field used for Environment

## 14. Habit Detail Sub-components

- [ ] 14.1 Create `components/LoopDiagram.tsx` — four-cell cue→craving→response→reward grid with sentence summary
- [ ] 14.2 Create `components/HistoryWall.tsx` — 26×7 dot grid with click-to-toggle past days
- [ ] 14.3 Create `components/NotesManager.tsx` — notes composer, list, single-delete, and bulk-delete with select mode
- [ ] 14.4 Create `components/ContractSheet.tsx` — accountability contract modal with terms textarea and invite inputs

## 15. Habit Detail Screen

- [ ] 15.1 Create `app/(root)/habits/[id]/page.tsx` assembling the five-tab layout using all sub-components (Overview, Loop, Journal, History, Notes)
- [ ] 15.2 Wire the "Mark done / Done today · edit" button to `toggleHabit` + `MoodCheckSheet`

## 16. Create Habit Screen

- [ ] 16.1 Create `app/(root)/habits/new/page.tsx` with the Mad-Libs sentence builder (`MLInput`, `MLChip` inline components), schedule picker, time picker, and habit stack section
- [ ] 16.2 Implement `finalize()` logic that constructs `cue`, `response`, `twoMin`, and `schedule` from the form fields before calling `addHabit`

## 17. Analytics Screen

- [ ] 17.1 Create `components/LineChart.tsx` — SVG line + area chart accepting a `data` array of `{ pct }` points
- [ ] 17.2 Create `app/(root)/analytics/page.tsx` with four summary stats, line chart (14/30/90-day tabs), day-of-week bar chart, and habit leaderboard

## 18. Journal Screen

- [ ] 18.1 Create `app/(root)/journal/page.tsx` with compose toggle, mood buttons, three reflection prompts, and entry list

## 19. Weekly Review Screen

- [ ] 19.1 Create `app/(root)/review/page.tsx` with 7-day strip, Wins/Slips columns, and three reflection textareas

## 20. Lessons Screen

- [ ] 20.1 Create `app/(root)/lessons/page.tsx` implementing the three views (Home, Reader, Library) as local state within the page component
- [ ] 20.2 Implement `pickToday()` day-stable lesson selection with sequential and random modes
- [ ] 20.3 Persist lesson completion to `atomicly:lessons` in localStorage

## 21. Hall of Fame Screen

- [ ] 21.1 Create `components/FormationQuestionnaire.tsx` — 5-question 1–5 scale modal with reflection textarea and verdict buttons
- [ ] 21.2 Create `app/(root)/hall-of-fame/page.tsx` with "Ready for review", inducted gallery, and in-progress progress bars
- [ ] 21.3 Persist formation verdicts to `atomicly:formed` in localStorage

## 22. Identity Screen

- [ ] 22.1 Create `app/(root)/identity/page.tsx` with editable identity statement, core values chips (+ Add value), and vote ledger with progress bars

## 23. Settings Screen

- [ ] 23.1 Create `app/(root)/settings/page.tsx` with Account, Appearance (theme + accent), Notifications (toggle rows), and Data (export JSON + reset) groups
- [ ] 23.2 Implement theme toggle: set/read `data-theme` on `document.documentElement`
- [ ] 23.3 Implement accent picker: update `--accent` CSS variable on `document.documentElement`
- [ ] 23.4 Implement JSON export: serialize store state to a downloadable `.json` file

## 24. Onboarding Overlay

- [ ] 24.1 Create `components/OnboardingOverlay.tsx` — 4-step overlay with progress dots, name input, and identity explanation
- [ ] 24.2 Wire onboarding into `app/(root)/layout.tsx`: show when `atomicly:store` is absent from localStorage, set a seen flag on completion

## 25. Final Verification

- [ ] 25.1 Run `npm run build` and confirm no TypeScript or Next.js build errors
- [ ] 25.2 Run `npm test` and confirm all Vitest tests pass
- [ ] 25.3 Start the dev server (`npm run dev`) and verify all 10 screens render correctly by navigating to each route
- [ ] 25.4 Verify dark mode toggle in Settings applies the dark theme correctly
- [ ] 25.5 Verify habit check-in, mood sheet, and toast notification work end-to-end on the Today screen
- [ ] 25.6 Verify localStorage persistence by checking in a habit, refreshing the page, and confirming it remains done
