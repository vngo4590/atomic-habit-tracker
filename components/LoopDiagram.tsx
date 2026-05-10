"use client";

import { useState } from "react";

import type { Habit } from "@/lib/types";

type LoopField = "loopCue" | "loopCraving" | "loopResponse" | "loopReward";

type LoopCell = {
  number: string;
  step: string;
  lead: string;
  field: LoopField;
  placeholder: string;
};

const CELLS: LoopCell[] = [
  { number: "01", step: "Cue", lead: "When", field: "loopCue", placeholder: "When 7am, after I pour coffee..." },
  { number: "02", step: "Craving", lead: "I want", field: "loopCraving", placeholder: "To feel curious, calm, strong..." },
  { number: "03", step: "Response", lead: "So I", field: "loopResponse", placeholder: "Open the book. Put on the shoes." },
  { number: "04", step: "Reward", lead: "And I get", field: "loopReward", placeholder: "One visible win." },
];

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
        <textarea className="input" rows={2} autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={placeholder} />
        <div style={{ display: "flex", gap: 6, marginTop: 6, justifyContent: "flex-end" }}>
          <button className="btn btn-sm" onClick={() => { setDraft(value); setEditing(false); }}>Cancel</button>
          <button className="btn btn-sm btn-primary" onClick={() => { onSave(draft); setEditing(false); }}>Save</button>
        </div>
      </div>
    );
  }

  return (
    <button
      className="loop-value"
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      style={{
        appearance: "none",
        width: "100%",
        minHeight: 48,
        border: "1px dashed transparent",
        borderRadius: "var(--r-md)",
        background: "transparent",
        padding: "4px 0",
        textAlign: "left",
        cursor: "pointer",
        color: empty ? "var(--ink-3)" : "var(--ink)",
        fontStyle: empty ? "italic" : "normal",
      }}
    >
      {empty ? placeholder : value}
    </button>
  );
}

export function LoopDiagram({
  habit,
  onUpdate,
}: {
  habit: Habit;
  onUpdate: (patch: Partial<Pick<Habit, LoopField>>) => void;
}) {
  const loopSentence = {
    cue: habit.loopCue.toLowerCase() || "the cue appears",
    craving: habit.loopCraving.toLowerCase() || "the reward",
    response: habit.loopResponse.toLowerCase() || "take the smallest next step",
    reward: habit.loopReward.toLowerCase() || "a vote for my identity",
  };

  return (
    <div>
      <p className="lede" style={{ marginBottom: 24, fontStyle: "italic" }}>
        Every habit follows the same four steps. Here&apos;s yours, laid out as a sentence diagram.
      </p>
      <div className="loop">
        {CELLS.map(({ number, step, lead, field, placeholder }) => (
          <div key={number} className="loop-cell">
            <div className="loop-step">{number} · {step}</div>
            <div className="loop-label">{lead}</div>
            <LoopEditableValue value={habit[field]} placeholder={placeholder} onSave={(value) => onUpdate({ [field]: value })} />
            <div className="loop-arrow" />
          </div>
        ))}
      </div>
      <div className="card card-pad" style={{ marginTop: 24, background: "var(--bg-sunk)" }}>
        <h3 className="h3" style={{ marginBottom: 8 }}>The loop in a sentence</h3>
        <p style={{ margin: 0, fontFamily: "var(--serif)", fontSize: 20, fontStyle: "italic", color: "var(--ink-2)", lineHeight: 1.4 }}>
          When <span style={{ color: "var(--ink)" }}>{loopSentence.cue}</span>, I crave{" "}
          <span style={{ color: "var(--ink)" }}>{loopSentence.craving}</span>, so I{" "}
          <span style={{ color: "var(--ink)" }}>{loopSentence.response}</span>, and the reward is{" "}
          <span style={{ color: "var(--accent)" }}>{loopSentence.reward}</span>.
        </p>
      </div>
    </div>
  );
}
