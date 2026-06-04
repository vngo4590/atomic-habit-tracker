"use client";

import { useState } from "react";

import type { Habit } from "@/lib/types";
import { capitalizeFirst, withCravingConnector, withCueConnector } from "@/lib/habit-sentence";

import styles from "./LoopDiagram.module.css";

type LoopField = "loopCue" | "loopCraving" | "loopResponse" | "loopReward";

type LoopCell = {
  number: string;
  step: string;
  lead: string;
  field: LoopField;
  placeholder: string;
};

/** The four habit-loop steps. Each cell renders as one column in the
    .loop grid (see app/styles/components.css). Placeholders are bare phrases
    (no leading "When"/"To") because the lead label above each cell, and the
    recap sentence below, supply those connective words. */
const CELLS: LoopCell[] = [
  { number: "01", step: "Cue", lead: "When", field: "loopCue", placeholder: "I pour my morning coffee" },
  { number: "02", step: "Craving", lead: "I want", field: "loopCraving", placeholder: "to become a reader" },
  { number: "03", step: "Response", lead: "So I", field: "loopResponse", placeholder: "read one page" },
  { number: "04", step: "Reward", lead: "And I get", field: "loopReward", placeholder: "a visible win" },
];

/**
 * LoopEditableValue — single cell value with click-to-edit support.
 * Local-only because the editor styling is tied to the .loop-cell layout
 * and is not reused elsewhere.
 */
function LoopEditableValue({
  value,
  placeholder,
  onSave,
}: {
  value: string;
  placeholder: string;
  onSave: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const empty = !value.trim();

  if (editing) {
    return (
      <div>
        <textarea
          className="input"
          rows={2}
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={placeholder}
        />
        <div className={styles.editorActions}>
          <button
            className="btn btn-sm"
            onClick={() => {
              setDraft(value);
              setEditing(false);
            }}
          >
            Cancel
          </button>
          <button
            className="btn btn-sm btn-primary"
            onClick={() => {
              onSave(draft);
              setEditing(false);
            }}
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      className={`loop-value ${styles.value} ${empty ? styles.valueEmpty : styles.valueFilled}`}
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
    >
      {empty ? placeholder : value}
    </button>
  );
}

/**
 * LoopDiagram — visualises a habit as the four-step Atomic Habits loop
 * (cue → craving → response → reward). Each step is editable inline.
 * Beneath the grid, the same values are recapped as a single sentence
 * for a quick scan.
 */
export function LoopDiagram({
  habit,
  onUpdate,
}: {
  habit: Habit;
  onUpdate: (patch: Partial<Pick<Habit, LoopField>>) => void;
}) {
  // Sentence-form recap below the grid. We supply the connective words
  // ("when ...", "I want ...") via small grammar helpers so the sentence
  // reads correctly whatever short phrase the user typed — and so older
  // habits whose craving was stored as "become X" still read "to become X".
  // Falls back to placeholder copy so the sentence is grammatical even
  // before the four fields are filled.
  const cueRaw = habit.loopCue.trim().toLowerCase();
  const cravingRaw = habit.loopCraving.trim().toLowerCase();
  const loopSentence = {
    cue: cueRaw ? capitalizeFirst(withCueConnector(cueRaw)) : "When the cue appears",
    craving: cravingRaw ? withCravingConnector(cravingRaw) : "to feel the payoff",
    response: habit.loopResponse.trim().toLowerCase() || "take the smallest next step",
    reward: habit.loopReward.trim().toLowerCase() || "a vote for my identity",
  };

  return (
    <div>
      <p className={`lede ${styles.intro}`}>
        Every habit follows the same four steps. Here&apos;s yours, laid out as a sentence diagram.
      </p>
      <div className="loop">
        {CELLS.map(({ number, step, lead, field, placeholder }) => (
          <div key={number} className="loop-cell">
            <div className="loop-step">{number} · {step}</div>
            <div className="loop-label">{lead}</div>
            <LoopEditableValue
              value={habit[field]}
              placeholder={placeholder}
              onSave={(value) => onUpdate({ [field]: value })}
            />
            <div className="loop-arrow" />
          </div>
        ))}
      </div>
      <div className={`card card-pad ${styles.recap}`}>
        <h3 className={`h3 ${styles.recapTitle}`}>The loop in a sentence</h3>
        <p className={styles.recapSentence}>
          <span className={styles.recapValue}>{loopSentence.cue}</span>, I want{" "}
          <span className={styles.recapValue}>{loopSentence.craving}</span>, so I{" "}
          <span className={styles.recapValue}>{loopSentence.response}</span>, and the reward is{" "}
          <span className={styles.recapReward}>{loopSentence.reward}</span>.
        </p>
      </div>
    </div>
  );
}
