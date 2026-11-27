import { Card, Skeleton } from "@/components/ui";

import styles from "./HabitsSkeleton.module.css";

/**
 * HabitsSkeleton — route-level loading placeholder for the /habits pages,
 * shaped like a page header plus a short list so nothing jumps when the
 * real content streams in.
 */
export function HabitsSkeleton() {
  return (
    <div className={styles.wrap} aria-busy="true" aria-live="polite">
      <span className={styles.srOnly}>Loading habits…</span>
      <Skeleton shape="text" width="6rem" />
      <Skeleton shape="text" width="14rem" height="2rem" />
      <Card padding="none">
        {[0, 1, 2].map((row) => (
          <div key={row} className={styles.row}>
            <Skeleton shape="circle" width="24px" height="24px" />
            <Skeleton shape="text" width="60%" />
          </div>
        ))}
      </Card>
    </div>
  );
}
