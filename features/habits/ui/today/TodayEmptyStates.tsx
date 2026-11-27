import { CalendarDays, Moon, Sparkles } from "lucide-react";

import { Button, Card, EmptyState } from "@/components/ui";
import type { Habit } from "@/lib/types";

import { formatNextDayLabel } from "../../model/schedule";
import styles from "./TodayEmptyStates.module.css";

/** The three steps of the first-run guide, in order. */
const STEPS = [
  { title: "Pick a habit", text: "Start with something so small it takes two minutes." },
  { title: "Tie it to who you want to become", text: "\"I am a reader\" lasts longer than \"read more\"." },
  { title: "Check in daily", text: "Each check-in is a vote for that identity. Come back here to cast it." },
] as const;

/**
 * FirstRunOnboarding — shown on Today when the user has no habits at all.
 * Three short steps and the screen's single primary action.
 */
export function FirstRunOnboarding() {
  return (
    <Card as="section" padding="lg" className={styles.onboarding} aria-labelledby="first-run-heading">
      <p className={styles.eyebrow}>Welcome to Atomicly</p>
      <h2 id="first-run-heading" className={styles.title}>
        Build your first habit in three small steps
      </h2>
      <ol className={styles.steps}>
        {STEPS.map((step, index) => (
          <li key={step.title} className={styles.step}>
            <span className={styles.stepNumber} aria-hidden="true">
              {index + 1}
            </span>
            <span className={styles.stepText}>
              <span className={styles.stepTitle}>{step.title}</span>
              <span className={styles.stepBody}>{step.text}</span>
            </span>
          </li>
        ))}
      </ol>
      <Button href="/habits/new" className={styles.cta}>
        Create your first habit
      </Button>
    </Card>
  );
}

/** AllDoneState — every habit scheduled today is checked off. */
export function AllDoneState({ count }: { count: number }) {
  return (
    <Card padding="none">
      <EmptyState
        icon={<Sparkles />}
        title="All done for today"
        action={
          <Button href="/journal" variant="secondary">
            Write a reflection
          </Button>
        }
      >
        {`You cast ${count} ${count === 1 ? "vote" : "votes"} for who you're becoming. Rest easy - tomorrow is a new chance.`}
      </EmptyState>
    </Card>
  );
}

/** "tomorrow" / "on Mon, May 18"-style suffix for the rest-day message. */
function whenLabel(dateKey: string): string {
  const label = formatNextDayLabel(dateKey);
  return label === "Tomorrow" ? "tomorrow" : `on ${label}`;
}

/** RestDayState — habits exist but none are scheduled today. */
export function RestDayState({ next }: { next: { habit: Habit; dateKey: string } | null }) {
  return (
    <Card padding="none">
      <EmptyState
        icon={<Moon />}
        title="Rest day"
        action={
          <Button href="/habits" variant="secondary" icon={<CalendarDays size={16} />}>
            See all habits
          </Button>
        }
      >
        {next
          ? `Nothing is scheduled today. Next up: ${next.habit.name}, ${whenLabel(next.dateKey)}.`
          : "Nothing is scheduled today. Enjoy the break."}
      </EmptyState>
    </Card>
  );
}
