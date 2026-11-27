"use client";

import { useState } from "react";

import { Button, Input } from "@/components/ui";
import type { Habit } from "@/lib/types";

import { STACK_PICKER_DEFAULT_LIMIT, emptyPickerMessage, pickableHabits } from "./stack-picker";
import styles from "./StackLinkPicker.module.css";

export interface StackLinkPickerProps {
  habit: Habit;
  habits: Habit[];
  mode: "before" | "after";
  currentIsSolo: boolean;
  onPick: (habitId: string) => void;
  onCancel: () => void;
}

/**
 * StackLinkPicker — searchable list of habits that can be linked
 * before/after the current one. Shows the first
 * `STACK_PICKER_DEFAULT_LIMIT` matches, with a "Show all" escape hatch.
 */
export function StackLinkPicker({ habit, habits, mode, currentIsSolo, onPick, onCancel }: StackLinkPickerProps) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);

  const available = pickableHabits(habit, habits, query);
  const visible = expanded ? available : available.slice(0, STACK_PICKER_DEFAULT_LIMIT);
  const hiddenCount = available.length - visible.length;

  return (
    <div className={styles.picker} data-testid="stack-link-picker">
      <p className={styles.prompt} id="stack-link-prompt">
        Select a habit to link {mode}:
      </p>
      <Input
        type="search"
        placeholder="Search habits..."
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          // A new search resets the expansion so results stay focused.
          setExpanded(false);
        }}
        data-testid="stack-link-search"
        aria-label="Search habits to link"
        autoFocus
      />
      {available.length === 0 ? (
        <p className={styles.empty} data-testid="stack-link-empty" role="status">
          {emptyPickerMessage(query, currentIsSolo)}
        </p>
      ) : (
        <>
          <div
            className={styles.options}
            data-testid="stack-link-options"
            role="group"
            aria-labelledby="stack-link-prompt"
          >
            {visible.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                data-chip=""
                className={styles.option}
                data-testid={`stack-link-option-${candidate.id}`}
                onClick={() => onPick(candidate.id)}
              >
                <span aria-hidden="true">{candidate.emoji}</span>
                {candidate.name}
              </button>
            ))}
          </div>
          {hiddenCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              data-testid="stack-link-show-all"
              onClick={() => setExpanded(true)}
              aria-expanded={false}
            >
              Show all {available.length} habits ({hiddenCount} more) — or refine with search
            </Button>
          )}
          {expanded && available.length > STACK_PICKER_DEFAULT_LIMIT && (
            <Button
              variant="ghost"
              size="sm"
              data-testid="stack-link-show-less"
              onClick={() => setExpanded(false)}
              aria-expanded={true}
            >
              Show less (first {STACK_PICKER_DEFAULT_LIMIT})
            </Button>
          )}
        </>
      )}
      <div className={styles.footer}>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
