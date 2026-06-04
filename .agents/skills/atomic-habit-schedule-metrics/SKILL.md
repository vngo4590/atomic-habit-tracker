---
name: atomic-habit-schedule-metrics
description: Schedule-aware metric rules for Atomicly habits — how `streak()`, `longestStreak()`, and `completionRate()` in `lib/store.ts` interact with `isScheduledForDate()` in `lib/schedule.ts`. Use when reading, writing, or testing any habit metric, when adding analytics, or when reasoning about why a missed day did or did not break a streak.
---

# Atomicly Schedule-Aware Metrics

> **TL;DR:** Unscheduled days never break a streak. Completion-rate denominators count only scheduled days. Bonus completions can push rate above 100%.

All core habit metrics in `lib/store.ts` are **schedule-aware** — they evaluate progress against the days the user actually scheduled, not against every calendar day.

## 1. How schedules are stored

- `habit.schedule` is a plain-text string like `"Daily"`, `"Weekdays"`, `"Mon, Wed, Fri"`, or free-form text.
- `lib/schedule.ts` exports `isScheduledForDate(dateKey, schedule)` which returns `true` when the day-of-week for `dateKey` matches the parsed schedule (or `true` for free-form schedules).
- Other helpers: `nextScheduledDateKey(fromDateKey, schedule)`, `formatNextDayLabel(dateKey)`, `formatScheduleLabel(schedule)`.

## 2. Metric behaviour

| Function | Schedule-aware rule |
|---|---|
| `streak(habit)` | Walks backward from today. Done days count. Unscheduled missed days are **skipped** (they do not break the streak). Scheduled missed days **do** break it. The old "anchor to yesterday" behaviour is preserved for daily habits. |
| `longestStreak(habit)` | Compares consecutive done dates. If the gap between them contains **only** unscheduled days, the streak continues across the gap. Any scheduled missed day in the gap resets the count. |
| `completionRate(habit, days)` | Denominator is the number of **scheduled days** in the window, not total calendar days. Bonus completions on unscheduled days can push the rate above `1.0`. Free-text schedules fall back to calendar-day counting. |

## 3. Analytics page (`app/(root)/analytics/page.tsx`)

- **Daily completion chart**: shows `% of scheduled habits completed` on each day. Habits not scheduled for that day are excluded from the denominator.
- **Weekday breakdown**: only counts habits that were scheduled for that weekday in the 90-day lookback.

## 4. Consequences for UI / code changes

- Any code that calls `streak()`, `longestStreak()`, or `completionRate()` automatically respects schedules.
- If you add a new metric, use `isScheduledForDate()` from `lib/schedule.ts` to stay consistent.
- Tests for metrics should include both `"Daily"` habits (backward-compatible) and custom-schedule habits (gap-skipping, bonus days, etc.). See `atomic-habit-test-edge-cases` § Date and time.

## See Also

- `atomic-habit-architecture` — where `store.ts` and `schedule.ts` sit
- `atomic-habit-test-edge-cases` — scheduled vs unscheduled date scenarios to cover
- `atomic-habit-habit-stacking` — interacts with metrics on the Today page
