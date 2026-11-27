import { Check } from "lucide-react";

import styles from "./StepIndicator.module.css";

export interface StepIndicatorProps {
  steps: { id: string; label: string }[];
  current: number;
}

/**
 * StepIndicator — "Step 2 of 5" plus a row of labelled dots. Finished steps
 * show a check; the current step carries aria-current="step".
 */
export function StepIndicator({ steps, current }: StepIndicatorProps) {
  return (
    <nav className={styles.wrap} aria-label="Create habit progress">
      <p className={styles.count}>
        Step {current + 1} of {steps.length}
      </p>
      <ol className={styles.list}>
        {steps.map((step, index) => {
          const state = index < current ? styles.done : index === current ? styles.current : "";
          return (
            <li key={step.id} className={`${styles.item} ${state}`} aria-current={index === current ? "step" : undefined}>
              <span className={styles.dot} aria-hidden="true">
                {index < current ? <Check size={12} strokeWidth={2.5} /> : index + 1}
              </span>
              <span className={styles.label}>
                {step.label}
                {index < current ? <span className={styles.srOnly}> (done)</span> : null}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
