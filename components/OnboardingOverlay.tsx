"use client";

import { AnimatePresence, m } from "framer-motion";
import { useState } from "react";

import { slideUpVariants } from "@/lib/animations";
import { clientLogger } from "@/lib/logger-client";

import styles from "./OnboardingOverlay.module.css";
import { useFocusTrap } from "./useFocusTrap";

/** Ordered onboarding steps shown after a user signs up. Each step has its
    own eyebrow/title/body and the button label at the bottom of the card.
    The name step was removed because the user's name is already captured
    during registration, so prompting again would be redundant. */
const STEPS = [
  {
    eyebrow: "Welcome",
    title: "Build evidence, one vote at a time.",
    body: "Atomicly turns each habit check-in into a visible vote for the person you are becoming.",
    action: "Begin",
  },
  {
    eyebrow: "Identity",
    title: "Habits are identity votes.",
    body: "The goal is not only to finish tasks. It is to collect proof that a new identity is already true.",
    action: "Continue",
  },
  {
    eyebrow: "Ready",
    title: "Start with the smallest useful action.",
    body: "Check off one habit today, add a mood note, and let the ledger do the remembering.",
    action: "Start",
  },
];

/**
 * OnboardingOverlay — first-run multi-step intro shown on top of the
 * Today page right after a user has signed up. The user can either step
 * through the cards (Begin → Continue → Start) or Skip at any time.
 *
 * The user's name is collected at registration, so this overlay no longer
 * asks for it. `onComplete` is therefore a zero-arg callback — it just
 * signals "the overlay should close and never show again for this user".
 */
export function OnboardingOverlay({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];

  // Advance to the next step, completing onboarding when we reach the end
  // of the list. Kept as a single intent-named handler so call sites read
  // as "Continue" / "Start" rather than raw setState calls.
  const next = () => {
    if (step === STEPS.length - 1) {
      clientLogger.info("Onboarding completed", {
        event: "onboarding.complete",
        stepCount: STEPS.length,
      });
      onComplete();
      return;
    }
    setStep((value) => value + 1);
  };

  const handleDismiss = () => {
    clientLogger.info("Onboarding dismissed", {
      event: "onboarding.dismiss",
      stepIndex: step,
      stepCount: STEPS.length,
    });
    onComplete();
  };

  // Keep keyboard focus inside the tour; Escape behaves like Skip.
  const dialogRef = useFocusTrap<HTMLDivElement>(handleDismiss);

  return (
    <m.div
      ref={dialogRef}
      className="overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <AnimatePresence mode="wait">
        <m.div
          key={step}
          className={`overlay-card ${styles.card}`}
          variants={slideUpVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {/* Progress dots — one capsule per step, accent-coloured up to
              the current step, rule-coloured beyond it. */}
          <div className={styles.progress}>
            {STEPS.map((item, index) => (
              <m.span
                key={item.eyebrow}
                data-testid="onboarding-progress-dot"
                className={`${styles.progressDot} ${
                  index <= step ? styles.progressDotActive : styles.progressDotInactive
                }`}
                initial={index === step ? { scaleX: 0 } : {}}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.3, delay: index === step ? 0.1 : 0 }}
              />
            ))}
          </div>
          <div className="eyebrow">{current.eyebrow}</div>
          <h2 id="onboarding-title" className={`h1 ${styles.title}`}>{current.title}</h2>
          <p className={`lede ${styles.body}`}>{current.body}</p>
          <div className={styles.footer}>
            <m.button
              className="btn"
              onClick={handleDismiss}
              whileTap={{ scale: 0.97 }}
            >
              Skip
            </m.button>
            {/* autoFocus: each step remounts this card, so focus lands on the
                new step's primary action instead of falling back to the page. */}
            <m.button
              className="btn btn-primary"
              onClick={next}
              autoFocus
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
            >
              {current.action}
            </m.button>
          </div>
        </m.div>
      </AnimatePresence>
    </m.div>
  );
}
