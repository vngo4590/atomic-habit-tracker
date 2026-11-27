"use client";

import { ChevronDown } from "lucide-react";

import { Button, Field, Input } from "@/components/ui";

import type { LawOverrides } from "./build-habit-draft";
import styles from "./WizardSteps.module.css";

const LAWS: { key: keyof LawOverrides; label: string; hint: string }[] = [
  { key: "cue", label: "1. Make it obvious", hint: "The cue that reminds you." },
  { key: "craving", label: "2. Make it attractive", hint: "Why you want it." },
  { key: "twoMin", label: "3. Make it easy", hint: "The two-minute version for hard days." },
  { key: "reward", label: "4. Make it satisfying", hint: "How you'll feel the win." },
];

/**
 * LawsStep — the optional "Make it stick" step. The four laws are pre-filled
 * from earlier answers (shown as placeholders), so most people can skip it;
 * the fields stay tucked inside a disclosure until asked for.
 */
export function LawsStep({
  laws,
  defaults,
  onChange,
}: {
  laws: LawOverrides;
  defaults: Required<LawOverrides>;
  onChange: (key: keyof LawOverrides, value: string) => void;
}) {
  const customised = LAWS.some((law) => laws[law.key]?.trim());
  return (
    <>
      <p className={styles.intro}>
        We&apos;ve drafted the four laws of behaviour change from your answers. You can tune them now or later
        from the habit&apos;s page.
      </p>
      <details className={styles.disclosure} open={customised || undefined}>
        <summary>
          Customise the four laws
          <ChevronDown className={styles.chevron} size={18} strokeWidth={1.75} aria-hidden="true" />
        </summary>
        <div className={styles.lawFields}>
          {LAWS.map((law) => (
            <Field key={law.key} label={law.label} hint={law.hint}>
              <Input
                value={laws[law.key] ?? ""}
                placeholder={defaults[law.key]}
                onChange={(event) => onChange(law.key, event.target.value)}
                maxLength={120}
                autoComplete="off"
              />
            </Field>
          ))}
        </div>
      </details>
    </>
  );
}

export interface ReviewItem {
  label: string;
  value: string;
  step: number;
}

/** ReviewStep — the composed sentence plus every answer with an Edit link. */
export function ReviewStep({
  sentence,
  items,
  onEdit,
}: {
  sentence: string;
  items: ReviewItem[];
  onEdit: (step: number) => void;
}) {
  return (
    <>
      <p className={styles.sentence} data-testid="habit-sentence-preview">
        {sentence}
      </p>
      <dl className={styles.summary}>
        {items.map((item) => (
          <div key={item.label} className={styles.summaryRow}>
            <dt>{item.label}</dt>
            <dd>{item.value || <span className={styles.empty}>Not set</span>}</dd>
            <Button variant="ghost" size="sm" onClick={() => onEdit(item.step)} aria-label={`Edit ${item.label.toLowerCase()}`}>
              Edit
            </Button>
          </div>
        ))}
      </dl>
    </>
  );
}
