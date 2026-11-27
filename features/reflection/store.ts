"use client";

/**
 * Reflection slice of the client store: journal entries, the identity
 * statement, weekly reviews and lesson progress, plus their optimistic
 * mutations. Composed into the app-wide `StoreState` by `useStore` in
 * `lib/store`. Writes go through the shared `optimistic()` helper.
 */

import { useCallback, useMemo, useRef, useState } from "react";

import { todayKey } from "@/lib/helpers";
import { clientLogger } from "@/lib/logger-client";
import { changedFields, optimistic } from "@/lib/store/optimistic";
import type {
  Identity,
  JournalEntry,
  StoreSnapshot,
  StoreState,
  WeeklyReview,
  WeeklyReviewAnswers,
} from "@/lib/types";

import {
  createJournalEntryAction,
  markLessonReadAction,
  saveIdentityAction,
  saveWeeklyReviewAction,
  updateJournalEntryAction,
} from "./actions";

export type ReflectionSlice = Pick<
  StoreState,
  | "journal"
  | "addJournal"
  | "updateJournal"
  | "identity"
  | "setIdentity"
  | "weeklyReview"
  | "weeklyReviews"
  | "setWeeklyReview"
  | "completedLessons"
  | "markLessonRead"
>;

/** Replace (or add) a week's review and keep the list newest-week first. */
function upsertReview(current: WeeklyReview[], review: WeeklyReview) {
  return [
    review,
    ...current.filter((item) => item.weekStartKey !== review.weekStartKey),
  ].sort((a, b) => b.weekStartKey.localeCompare(a.weekStartKey));
}

export function useReflectionSlice(
  snapshot: Pick<StoreSnapshot, "journal" | "identity" | "weeklyReview" | "weeklyReviews" | "completedLessons">,
): ReflectionSlice {
  const [journal, setJournal] = useState<JournalEntry[]>(snapshot.journal);
  const [identity, setIdentityState] = useState<Identity>(snapshot.identity);
  const [weeklyReview, setWeeklyReviewState] = useState<WeeklyReviewAnswers>(snapshot.weeklyReview);
  const [weeklyReviews, setWeeklyReviews] = useState<WeeklyReview[]>(snapshot.weeklyReviews ?? []);
  const [completedLessons, setCompletedLessons] = useState<Set<number>>(
    () => new Set(snapshot.completedLessons),
  );
  const updateJournalVersion = useRef(0);
  const pendingJournalPatches = useRef(new Map<string, Partial<JournalEntry>>());
  const identityVersion = useRef(0);

  const addJournal = useCallback((entry: Partial<JournalEntry>) => {
    const tempId = `pending-${Date.now()}`;
    setJournal((currentJournal) => [
      {
        id: tempId,
        date: todayKey(),
        title: "",
        body: "",
        mood: "good",
        tags: [],
        ...entry,
      },
      ...currentJournal,
    ]);

    clientLogger.info("Creating journal entry", {
      event: "store.journal.create",
      journalId: tempId,
      dateKey: entry.date ?? todayKey(),
      mood: entry.mood ?? "good",
      tagCount: entry.tags?.length ?? 0,
      hasTitle: Boolean(entry.title?.trim()),
      hasBody: Boolean(entry.body?.trim()),
    });

    void optimistic({
      action: () => createJournalEntryAction(entry),
      onSuccess: (saved) => {
        setJournal((currentJournal) =>
          currentJournal.map((journalEntry) => {
            if (journalEntry.id !== tempId) {
              return journalEntry;
            }

            const pendingPatch = pendingJournalPatches.current.get(tempId) ?? {};
            pendingJournalPatches.current.delete(tempId);
            const merged = { ...saved, ...journalEntry, ...pendingPatch, id: saved.id };
            if (
              merged.title !== saved.title ||
              merged.body !== saved.body ||
              merged.mood !== saved.mood ||
              merged.date !== saved.date ||
              merged.tags.join("\u0000") !== saved.tags.join("\u0000")
            ) {
              void optimistic({
                action: () =>
                  updateJournalEntryAction(saved.id, {
                    date: merged.date,
                    title: merged.title,
                    body: merged.body,
                    mood: merged.mood,
                    tags: merged.tags,
                  }),
                failure: {
                  log: "Journal entry reconciliation failed",
                  event: "store.journal.reconcile_failed",
                  context: { journalId: saved.id },
                },
              });
            }
            return merged;
          }),
        );
      },
      failure: {
        log: "Journal creation failed",
        event: "store.journal.create_failed",
        context: { journalId: tempId },
      },
    });
  }, []);

  const updateJournal = useCallback((id: string, patch: Partial<JournalEntry>) => {
    const version = ++updateJournalVersion.current;
    // Journal entries are anchored to the day they happened — the date is
    // assigned at creation and is never editable afterwards. Strip any
    // incoming `date` from the patch defensively so neither the optimistic
    // cache nor the server mutation can move an entry to a different day.
    const { date: _ignoredDate, ...safePatch } = patch;
    void _ignoredDate;
    if (id.startsWith("pending-")) {
      pendingJournalPatches.current.set(id, {
        ...(pendingJournalPatches.current.get(id) ?? {}),
        ...safePatch,
      });
    }
    setJournal((currentJournal) =>
      currentJournal.map((entry) => (entry.id === id ? { ...entry, ...safePatch } : entry)),
    );

    clientLogger.info("Updating journal entry", {
      event: "store.journal.update",
      journalId: id,
      fields: changedFields(safePatch),
      isPending: id.startsWith("pending-"),
    });

    void optimistic({
      action: () => updateJournalEntryAction(id, safePatch),
      onSuccess: (saved) => {
        if (!saved || version !== updateJournalVersion.current) {
          return;
        }
        setJournal((currentJournal) =>
          currentJournal.map((entry) => (entry.id === id ? { ...entry, ...saved, ...safePatch } : entry)),
        );
      },
      failure: {
        log: "Journal update failed",
        event: "store.journal.update_failed",
        context: { journalId: id, fields: changedFields(safePatch) },
      },
    });
  }, []);

  const setIdentity = useCallback((nextIdentity: Identity) => {
    const version = ++identityVersion.current;
    setIdentityState(nextIdentity);
    clientLogger.info("Saving identity", {
      event: "store.identity.save",
      hasStatement: Boolean(nextIdentity.statement.trim()),
      valuesCount: nextIdentity.values.length,
    });
    void optimistic({
      action: () => saveIdentityAction(nextIdentity),
      onSuccess: (saved) => {
        if (version !== identityVersion.current) {
          return;
        }
        setIdentityState((current) => ({ ...current, ...saved, statement: nextIdentity.statement }));
      },
      failure: {
        log: "Identity save failed",
        event: "store.identity.save_failed",
        context: { valuesCount: nextIdentity.values.length },
      },
    });
  }, []);

  const setWeeklyReview = useCallback((weekStartKey: string, answers: WeeklyReviewAnswers) => {
    setWeeklyReviewState(answers);
    const optimisticReview: WeeklyReview = {
      weekStartKey,
      ...answers,
      updatedAt: new Date().toISOString(),
    };
    setWeeklyReviews((current) => upsertReview(current, optimisticReview));

    clientLogger.info("Saving weekly review", {
      event: "store.weekly-review.save",
      weekStartKey,
    });

    void optimistic({
      action: () => saveWeeklyReviewAction(weekStartKey, answers),
      onSuccess: (saved) => {
        setWeeklyReviewState(saved);
        setWeeklyReviews((current) => upsertReview(current, saved));
      },
      failure: {
        log: "Weekly review save failed",
        event: "store.weekly-review.save_failed",
        context: { weekStartKey },
      },
    });
  }, []);

  const markLessonRead = useCallback((lessonId: number) => {
    setCompletedLessons((current) => new Set([...current, lessonId]));
    clientLogger.info("Marking lesson read", {
      event: "store.lesson.read",
      lessonId,
    });
    void optimistic({
      action: () => markLessonReadAction(lessonId),
      onSuccess: (completed) => setCompletedLessons(new Set(completed)),
      failure: {
        log: "Lesson completion sync failed",
        event: "store.lesson.read_failed",
        context: { lessonId },
      },
    });
  }, []);

  return useMemo(
    () => ({
      journal,
      addJournal,
      updateJournal,
      identity,
      setIdentity,
      weeklyReview,
      weeklyReviews,
      setWeeklyReview,
      completedLessons,
      markLessonRead,
    }),
    [
      journal,
      addJournal,
      updateJournal,
      identity,
      setIdentity,
      weeklyReview,
      weeklyReviews,
      setWeeklyReview,
      completedLessons,
      markLessonRead,
    ],
  );
}
