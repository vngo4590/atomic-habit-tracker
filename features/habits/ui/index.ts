/**
 * Habits feature — client UI entry point (`@/features/habits/ui`).
 *
 * Page-level React components for the habits feature. Kept separate from the
 * feature's `index.ts` barrel because server code imports that barrel and
 * must not pull React UI along with it.
 */
export { TodayView, type TodayViewProps } from "./today/TodayView";
export { TodaySkeleton } from "./today/TodaySkeleton";
