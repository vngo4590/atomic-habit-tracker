"use client";

import { NotebookPen } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useStoreContext } from "@/components/StoreProvider";
import { Button, Card, EmptyState, PageHeader } from "@/components/ui";
import { clientLogger } from "@/lib/logger-client";
import type { JournalEntry } from "@/lib/types";

import { groupByWeek } from "./group-by-week";
import { JournalComposer, type JournalDraft } from "./JournalComposer";
import { JournalEntryCard } from "./JournalEntryCard";
import styles from "./JournalView.module.css";

/**
 * JournalView — the /journal page. A calm, single reading column: the
 * compose box comes first ("How did today go?"), then past entries grouped
 * by week, newest first. Entries edit inline.
 */
export function JournalView() {
  const { journal, addJournal, updateJournal } = useStoreContext();
  const [editingId, setEditingId] = useState<string | null>(null);
  // Optimistic patches so an edited entry updates instantly in the list.
  const [overrides, setOverrides] = useState<Record<string, Partial<JournalEntry>>>({});
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    clientLogger.info("Page viewed", { page: "journal" });
  }, []);

  const groups = useMemo(() => {
    const entries = journal
      .map((entry) => ({ ...entry, ...(overrides[entry.id] ?? {}) }))
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
    return groupByWeek(entries);
  }, [journal, overrides]);

  const create = (draft: JournalDraft) => {
    addJournal({ ...draft, tags: [] });
  };

  const saveEdit = (id: string, draft: JournalDraft) => {
    setOverrides((current) => ({ ...current, [id]: draft }));
    updateJournal(id, draft);
    setEditingId(null);
  };

  return (
    <div className={styles.page}>
      <PageHeader title="Journal" subtitle="A few honest lines a day. Notice what's working and what isn't." />

      <Card padding="lg" className={styles.composeCard}>
        <JournalComposer mode="new" onSave={create} titleRef={titleRef} />
      </Card>

      {groups.length === 0 ? (
        <Card>
          <EmptyState
            icon={<NotebookPen strokeWidth={1.75} />}
            title="Your journal is empty"
            action={
              <Button variant="secondary" onClick={() => titleRef.current?.focus()}>
                Write your first entry
              </Button>
            }
          >
            Entries you save appear here, grouped by week, so you can spot patterns over time.
          </EmptyState>
        </Card>
      ) : (
        <div className={styles.weeks}>
          {groups.map((group) => (
            <section key={group.weekStart} className={styles.week} aria-labelledby={`week-${group.weekStart}`}>
              <h2 id={`week-${group.weekStart}`} className={styles.weekHeading}>
                {group.label}
                <span className={styles.weekCount}>
                  {group.items.length} {group.items.length === 1 ? "entry" : "entries"}
                </span>
              </h2>
              <ul className={styles.entries} role="list">
                {group.items.map((entry) => (
                  <li key={entry.id}>
                    <JournalEntryCard
                      entry={entry}
                      editing={editingId === entry.id}
                      onEdit={() => setEditingId(entry.id)}
                      onSave={(draft) => saveEdit(entry.id, draft)}
                      onCancel={() => setEditingId(null)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
