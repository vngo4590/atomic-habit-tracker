import { Skeleton } from "@/components/ui";

import styles from "./TodayView.module.css";

/**
 * TodaySkeleton — loading placeholder with the same shape as TodayView
 * (header, three rows, insights) so nothing jumps when data arrives.
 */
export function TodaySkeleton() {
  return (
    <div className={styles.page} aria-busy="true" aria-label="Loading today">
      <div className={styles.skeletonHeader}>
        <div className={styles.skeletonText}>
          <Skeleton shape="text" width="9rem" />
          <Skeleton shape="text" width="14rem" height="2rem" />
        </div>
        <Skeleton shape="circle" width={48} height={48} />
      </div>
      <div className={styles.skeletonList}>
        <Skeleton height={60} />
        <Skeleton height={60} />
        <Skeleton height={60} />
      </div>
      <Skeleton height={120} />
    </div>
  );
}
