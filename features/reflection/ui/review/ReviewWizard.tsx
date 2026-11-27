"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Button, Card, Field, TextArea } from "@/components/ui";
import type { WeeklyReviewAnswers } from "@/lib/types";

import { REVIEW_STEPS } from "./review-steps";
import styles from "./ReviewWizard.module.css";

interface ReviewWizardProps {
  /** Heading, e.g. "This week's review" or "Week of Nov 9". */
  title: string;
  initial: WeeklyReviewAnswers;
  onSave: (answers: WeeklyReviewAnswers) => void;
  onCancel: () => void;
}

/**
 * ReviewWizard — the weekly review as a short guided form: one question per
 * step with a progress indicator, Back / Next, and Save on the last step.
 * Steps are also directly reachable from the indicator so a returning user
 * can jump to the answer they want to change.
 */
export function ReviewWizard({ title, initial, onSave, onCancel }: ReviewWizardProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<WeeklyReviewAnswers>(initial);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const headingId = useId();
  const current = REVIEW_STEPS[step];
  const isLast = step === REVIEW_STEPS.length - 1;

  // Move focus to the new question so keyboard and screen-reader users land
  // on it after Next / Back.
  useEffect(() => {
    fieldRef.current?.focus();
  }, [step]);

  return (
    <Card as="section" padding="lg" aria-labelledby={headingId} className={styles.wizard}>
      <div className={styles.top}>
        <h2 id={headingId} className={styles.title}>
          {title}
        </h2>
        <p className={styles.counter} aria-live="polite">
          Step {step + 1} of {REVIEW_STEPS.length}
        </p>
      </div>

      <ol className={styles.steps} aria-label="Review progress">
        {REVIEW_STEPS.map((item, index) => {
          const state = index === step ? "current" : answers[item.field].trim() ? "done" : "todo";
          return (
            <li key={item.field} className={styles.stepItem}>
              <button
                type="button"
                className={styles.stepButton}
                data-state={state}
                aria-current={index === step ? "step" : undefined}
                onClick={() => setStep(index)}
              >
                <span className={styles.stepBar} aria-hidden="true" />
                <span className={styles.stepName}>{item.title}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <div key={current.field} className={styles.body}>
        <Field label={current.question} hint={current.hint}>
          <TextArea
            ref={fieldRef}
            rows={5}
            value={answers[current.field]}
            onChange={(event) => setAnswers((prev) => ({ ...prev, [current.field]: event.target.value }))}
          />
        </Field>
      </div>

      <div className={styles.actions}>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <div className={styles.nav}>
          {step > 0 ? (
            <Button variant="secondary" onClick={() => setStep((value) => value - 1)}>
              Back
            </Button>
          ) : null}
          {isLast ? (
            <Button onClick={() => onSave(answers)}>Save review</Button>
          ) : (
            <Button onClick={() => setStep((value) => value + 1)}>Next</Button>
          )}
        </div>
      </div>
    </Card>
  );
}
