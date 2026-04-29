"use client";

import { useState } from "react";

import { IconClose } from "@/components/Icons";
import { fmt } from "@/lib/helpers";
import type { CheckIn, Habit } from "@/lib/types";

const MOODS = [
  { value: 1, face: "😢", label: "Awful", color: "oklch(60% 0.12 30)" },
  { value: 2, face: "😕", label: "Meh", color: "oklch(65% 0.10 60)" },
  { value: 3, face: "😐", label: "Okay", color: "oklch(70% 0.04 90)" },
  { value: 4, face: "🙂", label: "Good", color: "oklch(70% 0.10 145)" },
  { value: 5, face: "😄", label: "Great", color: "oklch(68% 0.13 145)" },
];

function checkIn(value: Habit["history"][string]): CheckIn | null {
  return typeof value === "object" && value !== null ? value : null;
}

export function MoodCheckSheet({
  habit,
  dateKey,
  onClose,
  onSave,
}: {
  habit: Habit;
  dateKey: string;
  onClose: () => void;
  onSave: (payload: Partial<CheckIn>) => void;
}) {
  const existing = checkIn(habit.history[dateKey]);
  const [mood, setMood] = useState<number | null>(existing?.mood ?? null);
  const [journal, setJournal] = useState(existing?.journal ?? "");

  return (
    <div className="overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="overlay-card fade-up" style={{ width: 560, position: "relative" }} onClick={(event) => event.stopPropagation()}>
        <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close" style={{ position: "absolute", top: 18, right: 18 }}>
          <IconClose style={{ width: 13, height: 13 }} />
        </button>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 24, alignItems: "start" }}>
          <div>
            <div className="eyebrow">Check-in · {fmt.short(dateKey)}</div>
            <h1 className="h1" style={{ fontSize: 30, marginTop: 8, marginBottom: 8, lineHeight: 1.15 }}>
              How did <em>{habit.name.toLowerCase()}</em> feel?
            </h1>
            <p style={{ margin: "0 0 24px", fontFamily: "var(--serif)", fontSize: 15, fontStyle: "italic", color: "var(--ink-3)", lineHeight: 1.5 }}>
              Optional, but tracking how habits make you feel reveals which ones are working.
            </p>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 24 }}>
          {MOODS.map((item) => {
            const active = mood === item.value;
            return (
              <button
                key={item.value}
                onClick={() => setMood(item.value)}
                style={{
                  flex: 1,
                  padding: "18px 8px 12px",
                  borderRadius: 12,
                  border: `1px solid ${active ? item.color : "var(--rule-strong)"}`,
                  background: active ? `color-mix(in oklch, ${item.color} 12%, var(--bg-elev))` : "var(--bg-elev)",
                  cursor: "pointer",
                  transition: "all .14s",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                  transform: active ? "translateY(-2px)" : "none",
                }}
              >
                <span style={{ fontSize: 32, lineHeight: 1, filter: active ? "none" : "saturate(0.4) opacity(0.65)" }}>{item.face}</span>
                <span className="mono" style={{ fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: active ? item.color : "var(--ink-3)", fontWeight: active ? 600 : 400 }}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
        <div style={{ marginTop: 20 }}>
          <label className="field-label" htmlFor="mood-journal">Journal note</label>
          <textarea
            id="mood-journal"
            className="input"
            value={journal}
            onChange={(event) => setJournal(event.target.value)}
            placeholder={mood && mood <= 2 ? "What got in the way? Be honest." : mood && mood >= 4 ? "What made today work? Capture it." : "How was it? Anything to remember?"}
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
