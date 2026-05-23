"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

import { slideUpVariants } from "@/lib/animations";

import styles from "./OnboardingOverlay.module.css";

/** Ordered onboarding steps. Each step has its own eyebrow/title/body and
    the button label at the bottom of the card. The body is shown once. */
const STEPS = [
  {
    eyebrow: "Welcome",
    title: "Build evidence, one vote at a time.",
    body: "Atomicly turns each habit check-in into a visible vote for the person you are becoming.",
    action: "Begin",
  },
  {
    eyebrow: "Name",
    title: "What should we call you?",
    body: "This stays in this browser and helps personalize the practice.",
    action: "Continue",
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
 * Today page. Users can either step through it (Begin → Continue → …) or
 * Skip at any time. The "name" step is skipped automatically when the
 * user already registered with a name.
 */
export function OnboardingOverlay({
  onComplete,
  initialName,
}: {
  onComplete: (name?: string) => void;
  initialName?: string;
}) {
  // If the user already provided a name during registration, skip the name step.
  const hasName = Boolean(initialName?.trim());
  const [step, setStep] = useState(0);
  const [name, setName] = useState(initialName ?? "");
  const current = STEPS[step];
  // Block "Continue" on the name step until the user enters a name.
  const blocked = step === 1 && !name.trim();

  // Advance to the next step, completing onboarding at the end. Honours the
  // hasName shortcut by skipping past the name step on step 0.
  const next = () => {
    if (blocked) return;
    if (step === STEPS.length - 1) {
      onComplete(name.trim() || undefined);
      return;
    }
    if (step === 0 && hasName) {
      setStep(2);
      return;
    }
    setStep((value) => value + 1);
  };

  return (
    <motion.div
      className="overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <AnimatePresence mode="wait">
        <motion.div
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
              <motion.span
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
          <h2 className={`h1 ${styles.title}`}>{current.title}</h2>
          <p className={`lede ${styles.body}`}>{current.body}</p>
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <input
                className="input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name"
                autoFocus
              />
            </motion.div>
          )}
          <div className={styles.footer}>
            <motion.button
              className="btn"
              onClick={() => onComplete(name.trim() || undefined)}
              whileTap={{ scale: 0.97 }}
            >
              Skip
            </motion.button>
            <motion.button
              className="btn btn-primary"
              disabled={blocked}
              onClick={next}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
            >
              {current.action}
            </motion.button>
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
