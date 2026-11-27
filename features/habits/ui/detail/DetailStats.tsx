"use client";

import Link from "next/link";
import { Award, Sprout } from "lucide-react";

import { Card, ProgressRing } from "@/components/ui";

import { FORMATION_DAYS, type FormationStatus } from "./formation";
import styles from "./DetailStats.module.css";

export interface DetailStatsProps {
  active: number;
  best: number;
  rate: number;
  total: number;
  formation: FormationStatus;
}

/** One stat: a label div followed by its value div (e2e reads the sibling). */
function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={styles.stat}>
      <div className={styles.label}>{label}</div>
      <div className={styles.value}>{value}</div>
    </div>
  );
}

/** Where the habit is on its 66-day formation journey, or its verdict. */
function FormationSummary({ formation }: { formation: FormationStatus }) {
  if (formation.kind === "growing") {
    return (
      <div className={styles.formation}>
        <ProgressRing value={formation.progress} size={48} strokeWidth={5} label="Progress to formation review">
          <Sprout size={18} strokeWidth={1.75} aria-hidden="true" />
        </ProgressRing>
        <p className={styles.formationText}>
          <strong>
            Day {formation.age} of {FORMATION_DAYS}
          </strong>
          <span>Formation review unlocks at day {FORMATION_DAYS}.</span>
        </p>
      </div>
    );
  }

  const copy = {
    ready: { title: "Ready for its formation review", body: "Decide whether it has become automatic." },
    formed: { title: "Formed — in the Hall of Fame", body: "You judged this habit as part of who you are." },
    "not-yet": { title: "Not formed yet", body: "Reviewed and kept going. Keep casting votes." },
  }[formation.kind];

  return (
    <div className={styles.formation}>
      <span className={styles.formationIcon} aria-hidden="true">
        <Award size={22} strokeWidth={1.75} />
      </span>
      <p className={styles.formationText}>
        <strong>{copy.title}</strong>
        <span>{copy.body}</span>
      </p>
      <Link className={styles.formationLink} href="/hall-of-fame">
        Hall of Fame
      </Link>
    </div>
  );
}

/**
 * DetailStats — the four numbers that matter for one habit plus its
 * formation status, in one card under the header.
 */
export function DetailStats({ active, best, rate, total, formation }: DetailStatsProps) {
  return (
    <Card as="section" padding="md" aria-label="Habit stats" className={styles.card}>
      <div className={styles.grid}>
        <Stat label="Active streak" value={`${active}d`} />
        <Stat label="Best streak" value={`${best}d`} />
        <Stat label="30-day rate" value={`${rate}%`} />
        <Stat label="Total check-ins" value={total} />
      </div>
      <FormationSummary formation={formation} />
    </Card>
  );
}
