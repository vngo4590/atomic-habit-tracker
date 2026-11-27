import { Card } from "@/components/ui";

import { FOOD_PER_HABIT, FOOD_PER_JOURNAL } from "..";
import styles from "./FoodPanel.module.css";

const SOURCES = [
  { label: "Complete a habit", amount: FOOD_PER_HABIT },
  { label: "Write a journal entry", amount: FOOD_PER_JOURNAL },
  { label: "Add a note to a check-in", amount: FOOD_PER_JOURNAL },
  { label: "Save a weekly review", amount: FOOD_PER_JOURNAL },
] as const;

/**
 * Today's shared food pool — the bridge between showing up for habits and
 * caring for companions — with a collapsible explanation of how food is earned.
 */
export function FoodPanel({ availableFood }: { availableFood: number }) {
  return (
    <Card as="section" aria-labelledby="pet-food-title" className={styles.panel}>
      <div className={styles.summary}>
        <p className={styles.count} aria-live="polite">
          {availableFood}
        </p>
        <div>
          <h2 id="pet-food-title" className={styles.title}>
            Food available today
          </h2>
          <p className={styles.note}>Shared by all your companions. Resets at midnight.</p>
        </div>
      </div>

      <details className={styles.details}>
        <summary className={styles.toggle}>How to earn food</summary>
        <ul className={styles.sources}>
          {SOURCES.map((source) => (
            <li key={source.label} className={styles.source}>
              <span>{source.label}</span>
              <span className={styles.amount}>+{source.amount} food</span>
            </li>
          ))}
        </ul>
      </details>
    </Card>
  );
}
