"use client";

import { useState, type FormEvent } from "react";

import { Button, Card } from "@/components/ui";
import type { Habit } from "@/lib/types";

import { IdentityStep, NameStep, WhenStep } from "../new/AnswerSteps";
import { rankIdentities, visibleIdentities } from "../new/identity-suggestions";
import {
  scheduleLabelFromState,
  scheduleStateFromLabel,
  toggleScheduleDay,
  type Preset,
} from "../schedule/schedule-state";
import styles from "./HabitDetail.module.css";

/** The fields the habit sentence owns — the only ones an edit may patch. */
export type HabitSentencePatch = Pick<Habit, "name" | "identity" | "loopCue" | "environment" | "schedule">;

export interface HabitEditPanelProps {
  habit: Habit;
  habits: Habit[];
  onCancel: () => void;
  onSave: (patch: HabitSentencePatch) => void;
}

/**
 * HabitEditPanel — edits the habit's sentence (action, identity, cue, place)
 * and schedule with the same fields as the create wizard, so changing a habit
 * feels identical to designing one. Laws, loop and notes are never touched.
 */
export function HabitEditPanel({ habit, habits, onCancel, onSave }: HabitEditPanelProps) {
  const initialSchedule = scheduleStateFromLabel(habit.schedule);
  const [name, setName] = useState(habit.name);
  const [identity, setIdentity] = useState(habit.identity);
  const [cue, setCue] = useState(habit.loopCue);
  const [location, setLocation] = useState(habit.environment);
  const [preset, setPreset] = useState<Preset>(initialSchedule.preset);
  const [customDays, setCustomDays] = useState<string[]>(initialSchedule.customDays);

  const suggestions = visibleIdentities(rankIdentities(habits), identity);
  const nameError = name.trim() ? undefined : "Give the habit a name.";

  const toggleDay = (day: string) => {
    setCustomDays(toggleScheduleDay(preset, customDays, day));
    setPreset("custom");
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;
    onSave({
      name: trimmedName,
      identity: identity.trim(),
      loopCue: cue.trim(),
      environment: location.trim(),
      schedule: scheduleLabelFromState(preset, customDays),
    });
  };

  return (
    <Card as="section" padding="lg" aria-labelledby="habit-edit-title" className={styles.editCard}>
      <form className={styles.editForm} onSubmit={submit} noValidate>
        <h2 id="habit-edit-title" className={styles.sectionTitle}>
          Edit habit
        </h2>
        <NameStep value={name} error={nameError} onChange={setName} />
        <IdentityStep value={identity} suggestions={suggestions} onChange={setIdentity} />
        <WhenStep
          cue={cue}
          location={location}
          preset={preset}
          customDays={customDays}
          onCueChange={setCue}
          onLocationChange={setLocation}
          onPresetChange={setPreset}
          onToggleDay={toggleDay}
        />
        <div className={styles.editActions}>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={!name.trim()}>
            Save changes
          </Button>
        </div>
      </form>
    </Card>
  );
}
