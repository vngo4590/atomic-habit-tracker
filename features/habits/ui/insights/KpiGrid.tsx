import styles from "./KpiGrid.module.css";

export interface Kpi {
  label: string;
  value: string;
  detail: string;
  testId?: string;
}

/** Summary numbers as a description list: label, big value, one-line context. */
export function KpiGrid({ items }: { items: Kpi[] }) {
  return (
    <dl className={styles.grid}>
      {items.map((item) => (
        <div key={item.label} className={styles.kpi} data-testid={item.testId}>
          <dt className={styles.label}>{item.label}</dt>
          <dd className={styles.value}>{item.value}</dd>
          <dd className={styles.detail}>{item.detail}</dd>
        </div>
      ))}
    </dl>
  );
}
