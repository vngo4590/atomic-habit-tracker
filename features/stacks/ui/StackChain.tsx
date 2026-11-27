"use client";

import { Reorder } from "framer-motion";

import type { Habit } from "@/lib/types";

import { StackChipItem } from "./StackChipItem";
import styles from "./StackChain.module.css";

export interface StackChainProps {
  /** The habit whose detail page we're on (highlighted in the chain). */
  currentId: string;
  /** Chain in its local (possibly mid-drag) order. */
  orderedChain: Habit[];
  onReorder: (next: Habit[]) => void;
  onChipClick: (id: string) => void;
  onNodeRemove: (id: string) => void;
  onDragEnd: () => void;
}

/**
 * StackChain — the horizontal, drag-to-reorder row of chips for a habit
 * stack. Scrolls sideways on narrow screens (with a visible scrollbar so users
 * know there is more) rather than wrapping, which would break reordering.
 */
export function StackChain({
  currentId,
  orderedChain,
  onReorder,
  onChipClick,
  onNodeRemove,
  onDragEnd,
}: StackChainProps) {
  return (
    <Reorder.Group
      axis="x"
      values={orderedChain}
      onReorder={onReorder}
      data-testid="stack-chain-list"
      className={styles.chainList}
      aria-label="Habits in this stack, in order"
    >
      {orderedChain.map((item, index) => (
        <StackChipItem
          key={item.id}
          habit={item}
          isCurrent={item.id === currentId}
          isLast={index === orderedChain.length - 1}
          onChipClick={onChipClick}
          onNodeRemove={onNodeRemove}
          onDragEnd={onDragEnd}
        />
      ))}
    </Reorder.Group>
  );
}
