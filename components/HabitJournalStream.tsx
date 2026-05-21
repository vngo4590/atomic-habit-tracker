"use client";

import { useState } from "react";

import { IconTrash } from "@/components/Icons";
import { MarkdownText } from "@/components/MarkdownText";
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

export function HabitJournalStream({
  habit,
  onSaveEntry,
  onClearEntry,
}: {
  habit: Habit;
  onSaveEntry: (dateKey: string, payload: Partial<CheckIn>) => void;
  onClearEntry: (dateKey: string) => void;
}) {
  const entries = Object.entries(habit.history)
    .map(([date, value]) => ({ date, entry: checkIn(value) }))
    .filter((item): item is { date: string; entry: CheckIn } => Boolean(item.entry?.journal || item.entry?.mood))
    .sort((a, b) => b.date.localeCompare(a.date));

  if (entries.length === 0) {
    return (
      <div className="card card-pad" style={{ textAlign: "center", padding: "40px 20px" }}>
        <div style={{ fontFamily: "var(--serif)", fontSize: 18, fontStyle: "italic", color: "var(--ink-3)", marginBottom: 8 }}>
          No journal entries for this habit yet.
        </div>
        <div className="muted" style={{ fontSize: 12.5 }}>
          When you check it done, you can capture a mood and quick note. Those entries will live here.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {entries.map(({ date, entry }) => (
        <HabitJournalCard
          key={date}
          date={date}
          entry={entry}
          onSave={(payload) => onSaveEntry(date, payload)}
          onClear={() => onClearEntry(date)}
        />
      ))}
    </div>
  );
}

function HabitJournalCard({
  date,
  entry,
  onSave,
  onClear,
}: {
  date: string;
  entry: CheckIn;
  onSave: (payload: Partial<CheckIn>) => void;
  onClear: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [mood, setMood] = useState(entry.mood ?? 3);
  const [journal, setJournal] = useState(entry.journal ?? "");
  const moodMeta = entry.mood ? MOODS[entry.mood - 1] : null;

  if (editing) {
    return (
      <div className="card card-pad">
        <div className="muted mono" style={{ fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>
          {fmt.short(date)}
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {MOODS.map((item) => (
            <button
              key={item.value}
              className="chip"
              style={{
                borderColor: mood === item.value ? item.color : "var(--rule)",
                background: mood === item.value ? `color-mix(in oklch, ${item.color} 14%, var(--bg-elev))` : "var(--bg-sunk)",
              }}
              onClick={() => setMood(item.value)}
            >
              <span>{item.face}</span>
              {item.label}
            </button>
          ))}
        </div>
        <textarea className="input" rows={4} value={journal} onChange={(event) => setJournal(event.target.value)} placeholder="Add a note for this check-in." />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
          <button className="btn btn-sm" onClick={() => { setMood(entry.mood ?? 3); setJournal(entry.journal ?? ""); setEditing(false); }}>Cancel</button>
          <button
            className="btn btn-sm btn-primary"
            onClick={() => {
              onSave({ mood, journal: journal.trim() || undefined });
              setEditing(false);
            }}
          >
            Save entry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card card-pad" style={moodMeta ? { borderColor: moodMeta.color } : undefined}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: entry.journal ? 8 : 0 }}>
        <div>
          <div className="muted mono" style={{ fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            {fmt.short(date)}
          </div>
          {moodMeta && (
            <div style={{ fontSize: 13, color: moodMeta.color, marginTop: 2 }}>
              <span style={{ marginRight: 6 }}>{moodMeta.face}</span>
              {moodMeta.label}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn btn-sm btn-ghost" onClick={() => { setMood(entry.mood ?? 3); setJournal(entry.journal ?? ""); setEditing(true); }}>
            Edit
          </button>
          <button className="btn btn-sm btn-ghost" onClick={onClear} aria-label={`Clear journal entry for ${fmt.short(date)}`}>
            <IconTrash style={{ width: 12, height: 12 }} />
          </button>
        </div>
      </div>
      {entry.journal && (
        <MarkdownText
          style={{ fontFamily: "var(--serif)", fontSize: 15, lineHeight: 1.5, color: "var(--ink-2)" }}
        >
          {entry.journal}
        </MarkdownText>
      )}
    </div>
  );
}
