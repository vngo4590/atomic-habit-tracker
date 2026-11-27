/**
 * Habits feature - client UI entry point (`@/features/habits/ui`).
 *
 * Page-level React components for Today, /habits, and Insights (/analytics, /hall-of-fame). Kept separate
 * from the feature's `index.ts` barrel because server code imports that barrel
 * and must not pull React UI along with it.
 *
 * The sibling package.json declares this folder side-effect free (except
 * CSS) so each route only bundles the page it imports, not the whole barrel.
 */
export { TodayView, type TodayViewProps } from "./today/TodayView";
export { TodaySkeleton } from "./today/TodaySkeleton";
export { HabitsLibrary } from "./library/HabitsLibrary";
export { NewHabitWizard } from "./new/NewHabitWizard";
export { HabitDetail } from "./detail/HabitDetail";
export { AnalyticsView } from "./insights/AnalyticsView";
export { HallOfFameView } from "./insights/HallOfFameView";
