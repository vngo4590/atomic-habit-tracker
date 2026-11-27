import { Info } from "lucide-react";

import { HelpTip } from "@/components/HelpTip";

import { MAX_ACTIVE_HABITS } from "../../model/habit-cap";
import styles from "./CapBanner.module.css";

/** One explanation of the active-habit cap, shared by the heading tip and the
 *  "cap reached" banner so the wording never drifts. */
export const CAP_EXPLANATION =
  `Atomicly keeps you focused: you can track at most ${MAX_ACTIVE_HABITS} active habits at once. ` +
  "Once a habit is inducted into the Hall of Fame it still counts on your dashboard but frees " +
  "a slot, so you can start a new one. Archiving a habit also frees a slot.";

/** CapBanner — calm, informational notice shown when no habit slot is free. */
export function CapBanner() {
  return (
    <div className={styles.banner} role="note">
      <Info className={styles.icon} size={18} strokeWidth={1.75} aria-hidden="true" />
      <p className={styles.text}>
        You&apos;ve reached the maximum of {MAX_ACTIVE_HABITS} active habits. Induct one into the Hall of Fame
        or archive one to free a slot for a new habit.{" "}
        <HelpTip label="Why can't I add a habit?">{CAP_EXPLANATION}</HelpTip>
      </p>
    </div>
  );
}
