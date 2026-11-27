/**
 * features/reflection/ui — client views for the Reflect section
 * (/journal, /review) and /identity. Route files stay thin and render these.
 *
 * The sibling package.json declares this folder side-effect free (except
 * CSS) so each route only bundles the view it imports, not the whole barrel.
 */
export { IdentityView } from "./identity/IdentityView";
export { JournalView } from "./journal/JournalView";
export { WeeklyReviewView } from "./review/WeeklyReviewView";
