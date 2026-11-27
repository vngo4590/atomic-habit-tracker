"use client";

import { PenLine } from "lucide-react";
import { useId, useState } from "react";

import { Button, Card, EmptyState, Field, TextArea } from "@/components/ui";
import { clientLogger } from "@/lib/logger-client";

import styles from "./IdentityStatement.module.css";

interface IdentityStatementProps {
  statement: string;
  onSave: (statement: string) => void;
}

/** The long-form "I am the kind of person who…" statement, editable in place. */
export function IdentityStatement({ statement, onSave }: IdentityStatementProps) {
  const headingId = useId();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(statement);
  const hasStatement = Boolean(statement.trim());

  const startEditing = () => {
    clientLogger.info("Identity statement edit opened", { page: "identity" });
    setDraft(statement);
    setEditing(true);
  };

  const save = () => {
    clientLogger.info("Identity statement saved", { page: "identity", changed: draft !== statement });
    if (draft !== statement) onSave(draft);
    setEditing(false);
  };

  return (
    <Card as="section" padding="lg" aria-labelledby={headingId} className={styles.card}>
      <div className={styles.header}>
        <h2 id={headingId} className={styles.title}>
          Identity statement
        </h2>
        {hasStatement && !editing ? (
          <Button variant="ghost" size="sm" onClick={startEditing}>
            <PenLine size={16} strokeWidth={1.75} aria-hidden="true" />
            Edit statement
          </Button>
        ) : null}
      </div>

      {editing ? (
        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <Field label="Your statement" hint="Write it in the present tense: “I am someone who…”">
            <TextArea rows={6} value={draft} onChange={(event) => setDraft(event.target.value)} autoFocus />
          </Field>
          <div className={styles.actions}>
            <Button variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button type="submit">Save statement</Button>
          </div>
        </form>
      ) : hasStatement ? (
        <blockquote className={styles.statement}>{statement}</blockquote>
      ) : (
        <EmptyState
          headingLevel={3}
          title="No identity statement yet"
          action={
            <Button variant="secondary" onClick={startEditing}>
              Write your statement
            </Button>
          }
        >
          Describe the person you want to become. Your habits are the evidence.
        </EmptyState>
      )}
    </Card>
  );
}
