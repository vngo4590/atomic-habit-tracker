"use client";

/**
 * Settings slice of the client store: user preferences (theme, accent,
 * nudges, timezone…) and the lesson mode, which is a preference mirrored as
 * its own field for convenience. Composed into the app-wide `StoreState` by
 * `useStore` in `lib/store`. Writes go through the shared `optimistic()` helper.
 */

import { useCallback, useMemo, useState } from "react";

import { clientLogger } from "@/lib/logger-client";
import { changedFields, optimistic } from "@/lib/store/optimistic";
import type { StoreSnapshot, StoreState, UserPreferences } from "@/lib/types";

import { savePreferencesAction } from "./actions";

export type SettingsSlice = Pick<StoreState, "preferences" | "setPreferences" | "lessonMode" | "setLessonMode">;

export function useSettingsSlice(snapshot: Pick<StoreSnapshot, "preferences">): SettingsSlice {
  const [lessonModeState, setLessonModeState] = useState(snapshot.preferences.lessonMode);
  const [preferences, setPreferencesState] = useState<UserPreferences>(snapshot.preferences);

  /** Adopt the server's saved preferences (and its lesson mode mirror). */
  const reconcile = useCallback((saved: UserPreferences) => {
    setPreferencesState(saved);
    setLessonModeState(saved.lessonMode);
  }, []);

  const setLessonMode = useCallback((lessonMode: UserPreferences["lessonMode"]) => {
    setLessonModeState(lessonMode);
    setPreferencesState((current) => ({ ...current, lessonMode }));
    clientLogger.info("Setting lesson mode", {
      event: "store.preferences.lesson_mode",
      lessonMode,
    });
    void optimistic({
      action: () => savePreferencesAction({ lessonMode }),
      onSuccess: reconcile,
      failure: {
        log: "Lesson mode save failed",
        event: "store.preferences.lesson_mode_failed",
        context: { lessonMode },
      },
    });
  }, [reconcile]);

  const setPreferences = useCallback((patch: Partial<UserPreferences>) => {
    setPreferencesState((current) => ({ ...current, ...patch }));
    if (patch.lessonMode) {
      setLessonModeState(patch.lessonMode);
    }
    clientLogger.info("Saving preferences", {
      event: "store.preferences.save",
      fields: changedFields(patch),
    });
    void optimistic({
      action: () => savePreferencesAction(patch),
      onSuccess: reconcile,
      failure: {
        log: "Preferences save failed",
        event: "store.preferences.save_failed",
        context: { fields: changedFields(patch) },
      },
    });
  }, [reconcile]);

  return useMemo(
    () => ({ preferences, setPreferences, lessonMode: lessonModeState, setLessonMode }),
    [preferences, setPreferences, lessonModeState, setLessonMode],
  );
}
