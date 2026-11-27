"use client";

import { Reorder, useDragControls } from "framer-motion";
import { ArrowRight, GripVertical, X } from "lucide-react";

import type { Habit } from "@/lib/types";

import styles from "./StackChain.module.css";

export interface StackChipItemProps {
  habit: Habit;
  isCurrent: boolean;
  isLast: boolean;
  onChipClick: (id: string) => void;
  onNodeRemove: (id: string) => void;
  onDragEnd: () => void;
}

/**
 * StackChipItem — one draggable habit in the stack chain.
 *
 * Only the grip handle starts a drag (via Framer Motion `dragControls`), so a
 * horizontal swipe on the chain still scrolls on touch screens. The chip label
 * opens that habit; the × removes just this habit from the chain. Each item
 * owns its own `useDragControls()` because hooks can't run inside a loop.
 */
export function StackChipItem({
  habit,
  isCurrent,
  isLast,
  onChipClick,
  onNodeRemove,
  onDragEnd,
}: StackChipItemProps) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      value={habit}
      data-testid={`stack-chip-item-${habit.id}`}
      dragListener={false}
      dragControls={dragControls}
      onDragEnd={onDragEnd}
      className={styles.chipItem}
    >
      <button
        type="button"
        className={styles.dragHandle}
        aria-label={`Drag ${habit.name} to reorder`}
        onPointerDown={(event) => {
          event.preventDefault();
          dragControls.start(event);
        }}
        data-testid={`stack-chip-drag-${habit.id}`}
      >
        <GripVertical size={16} strokeWidth={1.75} aria-hidden="true" />
      </button>
      <div
        data-testid="stack-chain-chip"
        data-chip-id={habit.id}
        data-chip=""
        className={`${styles.chip} ${isCurrent ? styles.chipCurrent : ""}`}
      >
        <button
          type="button"
          data-testid={`stack-chip-link-${habit.id}`}
          onClick={() => onChipClick(habit.id)}
          aria-label={isCurrent ? `Current: ${habit.name}` : `Open ${habit.name}`}
          aria-current={isCurrent ? "step" : undefined}
          className={styles.chipLink}
        >
          <span aria-hidden="true">{habit.emoji}</span>
          <span>{habit.name}</span>
        </button>
        <button
          type="button"
          aria-label={`Remove ${habit.name} from stack`}
          data-testid={`stack-chip-remove-${habit.id}`}
          onClick={(event) => {
            event.stopPropagation();
            event.preventDefault();
            void onNodeRemove(habit.id);
          }}
          onPointerDown={(event) => event.stopPropagation()}
          className={styles.chipRemove}
        >
          <X size={14} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>
      {!isLast && <ArrowRight className={styles.arrow} size={16} strokeWidth={1.75} aria-hidden="true" />}
    </Reorder.Item>
  );
}
