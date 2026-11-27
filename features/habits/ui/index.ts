/**
 * features/habits/ui — page-level UI for the /habits routes. Import from
 * "@/features/habits/ui"; the route files in app/(root)/habits stay thin.
 *
 * The sibling package.json declares this folder side-effect free (except
 * CSS) so each route only bundles the page it imports, not the whole barrel.
 */
export { HabitsLibrary } from "./library/HabitsLibrary";
export { NewHabitWizard } from "./new/NewHabitWizard";
export { HabitDetail } from "./detail/HabitDetail";
