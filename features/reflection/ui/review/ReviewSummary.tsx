"use client";

import { useId } from "react";

import { ExpandableText } from "@/components/ExpandableText";
import { Button, Card } from "@/components/ui";
import type { WeeklyReviewAnswers } from "@/lib/types";

import { LazyMarkdown } from "../LazyMarkdown";
import { REVIEW_STEPS } from "./review-steps";
import styles from "./ReviewAnswers.module.css";

/** The three question/answer pairs of a saved review, as a description list. */
export function ReviewAnswers({ review, clamp = false }: { review: WeeklyReviewAnswers; clamp?: boolean }) {
  return (
    <dl className={styles.answers}>
      {REVIEW_STEPS.map((step) => {
        const text = review[step.field];
        return (
          <div key={step.field} className={styles.pair}>
            <dt className={styles.question}>{step.question}</dt>
            <dd className={styles.answer}>
              {!text ? (
                <span className={styles.empty}>Not answered yet.</span>
              ) : clamp ? (
                // Long answers get a Read more / Read less toggle so the page
                // stays scannable; the full markdown source is always rendered.
                <ExpandableText source={text} previewLines={4} collapsedThreshold={220}>
                  <LazyMarkdown>{text}</LazyMarkdown>
                </ExpandableText>
              ) : (
                <LazyMarkdown>{text}</LazyMarkdown>
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

/** Read-only view of this week's saved review with an Edit action. */
export function ReviewSummary({ review, onEdit }: { review: WeeklyReviewAnswers; onEdit: () => void }) {
  const headingId = useId();
  return (
    <Card as="section" padding="lg" aria-labelledby={headingId} className={styles.summary}>
      <div className={styles.summaryHeader}>
        <h2 id={headingId} className={styles.summaryTitle}>
          This week&apos;s review
        </h2>
        <Button variant="secondary" size="sm" onClick={onEdit}>
          Edit review
        </Button>
      </div>
      <ReviewAnswers review={review} clamp />
    </Card>
  );
}
