/**
 * features/habits/ui — client views for habit pages. Route files stay thin
 * and render these. (Insights: /analytics and /hall-of-fame.)
 *
 * The sibling package.json declares this folder side-effect free (except
 * CSS) so each route only bundles the view it imports, not the whole barrel.
 */
export { AnalyticsView } from "./insights/AnalyticsView";
export { HallOfFameView } from "./insights/HallOfFameView";
