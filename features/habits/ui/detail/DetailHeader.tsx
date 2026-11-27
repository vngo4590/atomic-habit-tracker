"use client";

import { useState } from "react";
import { Check, NotebookPen, Pencil, Trash2 } from "lucide-react";

import { Button, PageHeader } from "@/components/ui";
import { composeHabitSentence, formatScheduleLabel, identityClaim } from "@/features/habits";
import type { Habit } from "@/lib/types";

import styles from "./HabitDetail.module.css";

const ICON = { size: 18, strokeWidth: 1.75 } as const;

export interface DetailHeaderProps {
  habit: Habit;
  doneToday: boolean;
  editing: boolean;
  onToggleDone: () => void;
  onEditEntry: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * DetailHeader — the habit's name, its plan as one sentence, the identity it
 * votes for, and the day's actions: check in, edit the entry, edit the habit
 * and a two-step delete. Actions are hidden while the edit panel is open so
 * there is only one thing to do at a time.
 */
export function DetailHeader({
  habit,
  doneToday,
  editing,
  onToggleDone,
  onEditEntry,
  onEdit,
  onDelete,
}: DetailHeaderProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const actions = editing ? undefined : (
    <>
      <Button
        variant={doneToday ? "secondary" : "primary"}
        icon={doneToday ? <Check {...ICON} /> : undefined}
        onClick={onToggleDone}
      >
        {doneToday ? "Done today · tap to unmark" : "Mark done"}
      </Button>
      {doneToday ? (
        <Button variant="ghost" icon={<NotebookPen {...ICON} />} onClick={onEditEntry}>
          Edit entry
        </Button>
      ) : null}
      <Button variant="ghost" icon={<Pencil {...ICON} />} onClick={onEdit}>
        Edit habit
      </Button>
      {confirmDelete ? (
        <span className={styles.confirm} role="group" aria-label="Confirm deleting this habit">
          <Button variant="danger" icon={<Trash2 {...ICON} />} onClick={onDelete}>
            Confirm delete
          </Button>
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
        </span>
      ) : (
        <Button variant="ghost" icon={<Trash2 {...ICON} />} onClick={() => setConfirmDelete(true)}>
          Delete habit
        </Button>
      )}
    </>
  );

  return (
    <div className={styles.header}>
      <PageHeader
        eyebrow={`${formatScheduleLabel(habit.schedule)} · ${habit.time}`}
        title={habit.name}
        subtitle={composeHabitSentence(habit)}
        actions={actions}
      />
      <p className={styles.identity}>
        <em>{identityClaim(habit.identity)}</em>. Each check-in is a vote for that.
      </p>
    </div>
  );
}
