"use client";

import { Button } from "@/components/ui";

import styles from "./PrincipleIntro.module.css";

export interface PrincipleIntroProps {
  eyebrow: string;
  title: string;
  body: string;
  action: string;
  /** Four short words that illustrate the principle (decorative). */
  steps: readonly [string, string, string, string];
  onStart: () => void;
}

/**
 * PrincipleIntro — explains the 4 laws or the habit loop in one short
 * paragraph and offers a single button to start filling it in. Shown until
 * the habit has values for that section, so the page never opens on four
 * empty inputs.
 */
export function PrincipleIntro({ eyebrow, title, body, action, steps, onStart }: PrincipleIntroProps) {
  return (
    <section className={styles.intro} aria-label={eyebrow}>
      <div className={styles.copy}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.body}>{body}</p>
        <Button size="sm" onClick={onStart}>
          {action}
        </Button>
      </div>
      <ol className={styles.steps} aria-hidden="true">
        {steps.map((step) => (
          <li key={step} className={styles.step}>
            {step}
          </li>
        ))}
      </ol>
    </section>
  );
}
