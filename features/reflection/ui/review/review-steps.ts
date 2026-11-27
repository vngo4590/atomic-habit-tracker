import type { WeeklyReviewAnswers } from "@/lib/types";

/** One question in the guided weekly review. */
export interface ReviewStep {
  field: keyof WeeklyReviewAnswers;
  /** Short step name shown in the progress indicator. */
  title: string;
  /** The question itself — also the textarea's label. */
  question: string;
  hint: string;
}

/**
 * The guided review, in order: wins → friction & the smallest fix → the
 * identity to carry into next week. Each step maps 1:1 onto a stored
 * WeeklyReviewAnswers field, so saved reviews keep their shape.
 */
export const REVIEW_STEPS: readonly ReviewStep[] = [
  {
    field: "wentWell",
    title: "Wins",
    question: "What went well? Why?",
    hint: "Name a moment you're glad about and what made it work.",
  },
  {
    field: "smallestFix",
    title: "Friction",
    question: "What didn't? What's the smallest fix?",
    hint: "Pick one tiny adjustment for next week — make the cue obvious or the habit easier.",
  },
  {
    field: "identityVote",
    title: "Next week",
    question: "Who did I vote to become this week?",
    hint: "Name the identity you want next week's actions to keep voting for.",
  },
];

export const EMPTY_REVIEW: WeeklyReviewAnswers = { wentWell: "", smallestFix: "", identityVote: "" };

/** True iff any answer has text. */
export function hasReviewText(review: WeeklyReviewAnswers): boolean {
  return [review.wentWell, review.smallestFix, review.identityVote].some((value) => value.trim());
}

/** Strip extra fields (weekStartKey, updatedAt) down to just the answers. */
export function toReviewAnswers(review: WeeklyReviewAnswers): WeeklyReviewAnswers {
  return { wentWell: review.wentWell, smallestFix: review.smallestFix, identityVote: review.identityVote };
}

/**
 * First non-empty answer as a one-line plain-text preview of a past review.
 * Common markdown syntax (emphasis, headings, quotes, link targets) is
 * stripped so the preview reads as prose; the expanded view renders it fully.
 */
export function reviewPreview(review: WeeklyReviewAnswers): string {
  const source = review.wentWell || review.smallestFix || review.identityVote;
  if (!source.trim()) return "No notes saved yet.";
  return source
    .replace(/\]\([^)]*\)/g, "")
    .replace(/[*_`#>~[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
