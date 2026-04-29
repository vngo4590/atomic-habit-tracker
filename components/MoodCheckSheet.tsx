"use client";

import { useState } from "react";

import { IconClose } from "@/components/Icons";
import type { CheckIn, Habit } from "@/lib/types";

const MOODS = [1, 2, 3, 4, 5];

export function MoodCheckSheet({
  habit,
  onClose,
  onSave,
}: {
  habit: Habit;
  dateKey: string;
  onClose: () => void;
  onSave: (payload: Partial<CheckIn>) => void;
}) {
  const [mood, setMood] = useState<number | null>(null);
  const [journal, setJournal] = useState("");

  return (
    <div className="overlay" role="dialog" aria-modal="true">
      <div className="overlay-card fade-up">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 24, alignItems: "start" }}>
          <div>
            <div className="eyebrow">Check-in</div>
            <h2 className="h2">{habit.name}</h2>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close">
            <IconClose style={{ width: 13, height: 13 }} />
          </button>
        </div>
        <div style={{ marginTop: 24 }}>
          <label className="field-label">Mood</label>
          <div style={{ display: "flex", gap: 8 }}>
            {MOODS.map((value) => (
              <button
                key={value}
                className={`btn ${mood === value ? "btn-accent" : ""}`}
                onClick={() => setMood(value)}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 20 }}>
          <label className="field-label" htmlFor="mood-journal">Journal note</label>
          <textarea
            id="mood-journal"
            className="input"
            value={journal}
            onChange={(event) => setJournal(event.target.value)}
            placeholder="What made this easier or harder today?"
          />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
          <button className="btn btn-ghost" onClick={onClose}>Skip - just mark it done</button>
          <button
            className="btn btn-primary"
            onClick={() => {
              onSave({
                ...(mood ? { mood } : {}),
                ...(journal.trim() ? { journal: journal.trim() } : {}),
              });
              onClose();
            }}
          >
            Save check-in
          </button>
        </div>
      </div>
    </div>
  );
}
