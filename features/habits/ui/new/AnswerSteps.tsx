"use client";

import { Field, Input } from "@/components/ui";

import { SchedulePicker } from "../schedule/SchedulePicker";
import type { Preset } from "../schedule/schedule-state";
import styles from "./WizardSteps.module.css";

/** Tiny, two-minute starting habits offered as one-tap examples. */
const NAME_EXAMPLES = [
  "read one page",
  "do 10 push-ups",
  "meditate for 2 minutes",
  "write one sentence",
  "drink a glass of water",
];

const MAX_CHARS = 60;

function SuggestionChips({
  label,
  options,
  selected,
  onPick,
  testId,
}: {
  label: string;
  options: string[];
  selected: string;
  onPick: (value: string) => void;
  testId?: string;
}) {
  if (options.length === 0) return null;
  return (
    <div className={styles.suggestions}>
      <p className={styles.suggestionsLabel} id={`${testId}-label`}>
        {label}
      </p>
      <div className={styles.chips} role="group" aria-labelledby={`${testId}-label`} data-testid={testId}>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className={styles.chip}
            aria-pressed={selected.trim() === option}
            onClick={() => onPick(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

export function NameStep({
  value,
  error,
  onChange,
}: {
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <>
      <Field label="I will…" hint="Start tiny — something you could do in two minutes." error={error} required>
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="read one page"
          maxLength={MAX_CHARS}
          autoComplete="off"
        />
      </Field>
      <SuggestionChips label="Need an idea?" options={NAME_EXAMPLES} selected={value} onPick={onChange} testId="name-examples" />
    </>
  );
}

export function IdentityStep({
  value,
  error,
  suggestions,
  onChange,
}: {
  value: string;
  error?: string;
  suggestions: string[];
  onChange: (value: string) => void;
}) {
  return (
    <>
      <Field
        label="So I can become…"
        hint="Every time you show up is a vote for this kind of person."
        error={error}
        required
      >
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="a reader"
          maxLength={MAX_CHARS}
          autoComplete="off"
        />
      </Field>
      <SuggestionChips
        label="Identities you already vote for"
        options={suggestions}
        selected={value}
        onPick={onChange}
        testId="identity-suggestions"
      />
    </>
  );
}

export function WhenStep({
  cue,
  location,
  preset,
  customDays,
  onCueChange,
  onLocationChange,
  onPresetChange,
  onToggleDay,
}: {
  cue: string;
  location: string;
  preset: Preset;
  customDays: string[];
  onCueChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onPresetChange: (preset: Preset) => void;
  onToggleDay: (day: string) => void;
}) {
  return (
    <>
      <Field label="When?" hint="Tie it to something you already do — e.g. “after I pour my coffee”.">
        <Input
          value={cue}
          onChange={(event) => onCueChange(event.target.value)}
          placeholder="after I pour my coffee"
          maxLength={MAX_CHARS}
          autoComplete="off"
        />
      </Field>
      <Field label="Where?" hint="Optional. A specific place makes the cue obvious.">
        <Input
          value={location}
          onChange={(event) => onLocationChange(event.target.value)}
          placeholder="at my desk"
          maxLength={MAX_CHARS}
          autoComplete="off"
        />
      </Field>
      <SchedulePicker
        preset={preset}
        customDays={customDays}
        onPresetChange={onPresetChange}
        onToggleDay={onToggleDay}
      />
    </>
  );
}
