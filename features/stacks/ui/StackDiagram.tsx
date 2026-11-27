"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Link2 } from "lucide-react";

import { useStoreContext } from "@/components/StoreProvider";
import { Button, Card, Modal } from "@/components/ui";
import type { Habit } from "@/lib/types";

import { getStackChain, isInStack } from "../model/stack";
import { StackChain } from "./StackChain";
import { StackLinkPicker } from "./StackLinkPicker";
import { insertMutationFor } from "./stack-picker";
import styles from "./StackDiagram.module.css";

type StackMutation = Parameters<ReturnType<typeof useStoreContext>["applyStackMutation"]>[0];

/**
 * StackDiagram — the Stack tab on a habit's detail page: shows the habit's
 * chain and lets the user link, remove and reorder habits.
 *
 *   - Chips open that habit (router.push, so Back walks the chain).
 *   - × on a chip removes just that habit; neighbours re-link on the server.
 *   - Dragging a chip by its grip reorders the chain; a ref suppresses the
 *     click that follows a real drag so users don't navigate by accident.
 *
 * Every change goes through `store.applyStackMutation` (atomic and validated
 * server-side). Failures open an error Modal the user must acknowledge.
 */
export function StackDiagram({
  habit,
  habits,
  onUpdate,
}: {
  habit: Habit;
  habits: Habit[];
  /** Legacy prop preserved for tests; changes go through store.applyStackMutation. */
  onUpdate?: (id: string, patch: Partial<Habit>) => void;
}) {
  void onUpdate;
  const store = useStoreContext();
  const router = useRouter();
  const [errorModal, setErrorModal] = useState<{ title: string; message: string } | null>(null);
  const [linkMode, setLinkMode] = useState<"before" | "after" | null>(null);

  const chain = useMemo(() => getStackChain(habit, habits), [habit, habits]);
  const position = chain.findIndex((item) => item.id === habit.id) + 1;
  const currentIsSolo = !isInStack(habit, habits);

  // Local order for Reorder.Group mid-drag, re-synced during render whenever
  // the confirmed chain changes ("storing info from previous renders").
  const chainKey = chain.map((item) => item.id).join("|");
  const [prevChainKey, setPrevChainKey] = useState(chainKey);
  const [orderedChain, setOrderedChain] = useState<Habit[]>(chain);
  if (prevChainKey !== chainKey) {
    setPrevChainKey(chainKey);
    setOrderedChain(chain);
  }
  const wasDraggedRef = useRef(false);

  /** Run one stack mutation, surfacing any failure in the error modal. */
  const mutate = async (mutation: StackMutation, title: string, fallback: string) => {
    try {
      await store.applyStackMutation(mutation);
      return true;
    } catch (error: unknown) {
      setErrorModal({ title, message: error instanceof Error ? error.message : fallback });
      return false;
    }
  };

  const handleLink = (selectedId: string) => {
    if (!linkMode) return;
    const mutation = insertMutationFor(habit, selectedId, habits, linkMode);
    setLinkMode(null);
    void mutate(mutation, "Couldn't update the stack", "Couldn't update the stack.");
  };

  const handleNodeRemove = (habitId: string) => {
    void mutate(
      { kind: "remove", habitId },
      "Couldn't remove from stack",
      "Couldn't remove the habit from the stack.",
    );
  };

  const handleChipClick = (nodeId: string) => {
    if (wasDraggedRef.current) {
      wasDraggedRef.current = false;
      return;
    }
    if (nodeId === habit.id) return;
    router.push(`/habits/${nodeId}`);
  };

  const commitReorder = async (nextChain: Habit[]) => {
    const nextIds = nextChain.map((item) => item.id);
    const currentIds = chain.map((item) => item.id);
    const sameOrder = nextIds.length === currentIds.length && nextIds.every((id, i) => id === currentIds[i]);
    if (sameOrder) return;
    const ok = await mutate({ kind: "reorder", habitIds: nextIds }, "Couldn't reorder the stack", "Couldn't reorder the stack.");
    if (!ok) setOrderedChain(chain);
  };

  return (
    <Card padding="lg" data-testid="stack-diagram" className={styles.card}>
      {chain.length > 1 ? (
        <>
          <div className={styles.chainHeader}>
            <p className={styles.position}>
              Step {position} of {chain.length}
            </p>
            <Button variant="ghost" size="sm" onClick={() => handleNodeRemove(habit.id)}>
              Remove from stack
            </Button>
          </div>
          <StackChain
            currentId={habit.id}
            orderedChain={orderedChain}
            onReorder={(next) => {
              wasDraggedRef.current = true;
              setOrderedChain(next);
            }}
            onChipClick={handleChipClick}
            onNodeRemove={handleNodeRemove}
            onDragEnd={() => {
              void commitReorder(orderedChain);
              setTimeout(() => {
                wasDraggedRef.current = false;
              }, 0);
            }}
          />
        </>
      ) : (
        <div className={styles.empty}>
          <span className={styles.emptyIcon} aria-hidden="true">
            <Link2 size={20} strokeWidth={1.75} />
          </span>
          <p className={styles.emptyLead}>This habit is not part of a stack.</p>
          <p className={styles.emptyHint}>Link it to another habit to build a chain.</p>
        </div>
      )}

      {linkMode ? (
        <StackLinkPicker
          habit={habit}
          habits={habits}
          mode={linkMode}
          currentIsSolo={currentIsSolo}
          onPick={handleLink}
          onCancel={() => setLinkMode(null)}
        />
      ) : (
        <div className={styles.linkActions}>
          <Button variant="secondary" size="sm" onClick={() => setLinkMode("after")}>
            Link after…
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setLinkMode("before")}>
            Link before…
          </Button>
        </div>
      )}

      <Modal
        open={!!errorModal}
        title={errorModal?.title ?? ""}
        message={errorModal?.message ?? ""}
        onClose={() => setErrorModal(null)}
        tone="error"
      />
    </Card>
  );
}
