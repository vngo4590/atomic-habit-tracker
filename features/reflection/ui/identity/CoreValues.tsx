"use client";

import { X } from "lucide-react";
import { useId, useState } from "react";

import { Button, Card, Field, Input } from "@/components/ui";
import { clientLogger } from "@/lib/logger-client";

import styles from "./CoreValues.module.css";

interface CoreValuesProps {
  values: string[];
  onChange: (values: string[]) => void;
}

/** Core values as removable chips plus a labelled "add a value" field. */
export function CoreValues({ values, onChange }: CoreValuesProps) {
  const headingId = useId();
  const [draft, setDraft] = useState("");
  const trimmed = draft.trim();
  const duplicate = values.some((value) => value.toLowerCase() === trimmed.toLowerCase());
  const canAdd = Boolean(trimmed) && !duplicate;

  const add = () => {
    clientLogger.info("Identity value save attempted", {
      page: "identity",
      canSave: canAdd,
      valueCount: values.length,
    });
    if (!canAdd) return;
    onChange([...values, trimmed]);
    setDraft("");
  };

  const remove = (value: string) => {
    clientLogger.info("Identity value removed", { page: "identity", valueCount: values.length });
    onChange(values.filter((item) => item !== value));
  };

  return (
    <Card as="section" padding="lg" aria-labelledby={headingId} className={styles.card}>
      <h2 id={headingId} className={styles.title}>
        Core values
      </h2>
      {values.length ? (
        <ul className={styles.chips} role="list">
          {values.map((value) => (
            <li key={value} className={styles.chip}>
              <span className={styles.chipLabel}>{value}</span>
              <button
                type="button"
                className={styles.remove}
                aria-label={`Remove core value ${value}`}
                onClick={() => remove(value)}
              >
                <X size={16} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>No core values yet. Add two or three words that guide your choices.</p>
      )}
      <form
        className={styles.addRow}
        onSubmit={(event) => {
          event.preventDefault();
          add();
        }}
      >
        <Field
          label="Add a value"
          error={trimmed && duplicate ? `“${trimmed}” is already one of your values.` : undefined}
          className={styles.addField}
        >
          <Input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="e.g. Curiosity" />
        </Field>
        <Button type="submit" variant="secondary" disabled={!canAdd} className={styles.addButton}>
          Add
        </Button>
      </form>
    </Card>
  );
}
