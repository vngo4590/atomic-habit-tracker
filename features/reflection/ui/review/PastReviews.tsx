"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";

import { Button, Card } from "@/components/ui";
import { fmt } from "@/lib/helpers";
import type { WeeklyReview } from "@/lib/types";

import { reviewPreview } from "./review-steps";
import { ReviewAnswers } from "./ReviewSummary";
import styles from "./PastReviews.module.css";

const PAGE_SIZE = 5;

interface PastReviewsProps {
  reviews: WeeklyReview[];
  onEdit: (review: WeeklyReview) => void;
}

/**
 * PastReviews — earlier weeks as a collapsed list. Each row shows the week
 * and a one-line preview; expanding it reveals the full answers and an Edit
 * action. Older weeks load five at a time.
 */
export function PastReviews({ reviews, onEdit }: PastReviewsProps) {
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const headingId = useId();
  const shown = reviews.slice(0, visible);
  const remaining = reviews.length - shown.length;

  return (
    <Card as="section" aria-labelledby={headingId} className={styles.card}>
      <h2 id={headingId} className={styles.title}>
        Past reviews
        {reviews.length ? <span className={styles.count}>{reviews.length}</span> : null}
      </h2>
      {reviews.length === 0 ? (
        <p className={styles.empty}>No past reviews yet. Each week you save a review, it collects here.</p>
      ) : (
        <ul className={styles.list} role="list">
          {shown.map((review) => {
            const open = openKey === review.weekStartKey;
            const label = `Week of ${fmt.short(review.weekStartKey)}`;
            const panelId = `past-review-${review.weekStartKey}`;
            return (
              <li key={review.weekStartKey} className={styles.item}>
                <button
                  type="button"
                  className={styles.row}
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() => setOpenKey(open ? null : review.weekStartKey)}
                >
                  <span className={styles.rowText}>
                    <span className={styles.week}>{label}</span>
                    <span className={styles.preview}>{reviewPreview(review)}</span>
                  </span>
                  <ChevronDown className={styles.chevron} size={20} strokeWidth={1.75} aria-hidden="true" />
                </button>
                {open ? (
                  <div id={panelId} className={styles.panel}>
                    <ReviewAnswers review={review} />
                    <div className={styles.panelActions}>
                      <Button
                        variant="secondary"
                        size="sm"
                        aria-label={`Edit review for ${label}`}
                        onClick={() => onEdit(review)}
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      {remaining > 0 ? (
        <Button variant="ghost" size="sm" onClick={() => setVisible((count) => count + PAGE_SIZE)}>
          Show {Math.min(PAGE_SIZE, remaining)} older
        </Button>
      ) : null}
    </Card>
  );
}
