"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

import { slideUpVariants } from "@/lib/animations";

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

export function OnboardingOverlay({ onComplete }: { onComplete: (name?: string) => void }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const current = STEPS[step];
  const blocked = step === 1 && !name.trim();

  const next = () => {
    if (blocked) {
      return;
    }
    if (step === STEPS.length - 1) {
      onComplete(name.trim() || undefined);
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
          className="overlay-card"
          style={{ width: 560, maxWidth: "92vw" }}
          variants={slideUpVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
            {STEPS.map((item, index) => (
              <motion.span
                key={item.eyebrow}
                style={{
                  width: 34,
                  height: 4,
                  borderRadius: 99,
                  background: index <= step ? "var(--accent)" : "var(--rule-strong)",
                }}
                initial={index === step ? { scaleX: 0 } : {}}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.3, delay: index === step ? 0.1 : 0 }}
              />
            ))}
          </div>
          <div className="eyebrow">{current.eyebrow}</div>
          <h2 className="h1" style={{ marginTop: 8 }}>
            {current.title}
          </h2>
          <p className="lede" style={{ lineHeight: 1.6 }}>
            {current.body}
          </p>
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
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 22,
            }}
          >
            <motion.button className="btn" onClick={() => onComplete(name.trim() || undefined)} whileTap={{ scale: 0.97 }}>
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
