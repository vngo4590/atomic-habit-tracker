"use client";

/**
 * Settings slice of the client store: user preferences (theme, accent,
 * nudges, timezone…) and the lesson mode, which is a preference mirrored as
 * its own field for convenience. Composed into the app-wide `StoreState` by
 * `useStore` in `lib/store`. Writes go through the shared `optimistic()` helper.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { clientLogger } from "@/lib/logger-client";
import { changedFields, optimistic, type ShowToast } from "@/lib/store/optimistic";
import type { StoreSnapshot, StoreState, UserPreferences } from "@/lib/types";

import { savePreferencesAction } from "./actions";

export type SettingsSlice = Pick<StoreState, "preferences" | "setPreferences" | "lessonMode" | "setLessonMode">;

export function useSettingsSlice(snapshot: Pick<StoreSnapshot, "preferences">, showToast: ShowToast): SettingsSlice {
  const [lessonModeState, setLessonModeState] = useState(snapshot.preferences.lessonMode);
  const [preferences, setPreferencesState] = useState<UserPreferences>(snapshot.preferences);
  const preferencesRef = useRef(preferences);
  useEffect(() => {
    preferencesRef.current = preferences;
  }, [preferences]);
  const saveVersion = useRef(0);

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

  const setPreferences = useCallback(async (patch: Partial<UserPreferences>) => {
    const version = ++saveVersion.current;
    // Remember the patched fields' old values so a failed save can restore them.
    const before = preferencesRef.current;
    const previous = Object.fromEntries(
      Object.keys(patch).map((key) => [key, before[key as keyof UserPreferences]]),
    ) as Partial<UserPreferences>;

    clientLogger.info("Saving preferences", {
      event: "store.preferences.save",
      fields: changedFields(patch),
    });
    let saved = false;
    await optimistic({
      apply: () => {
        setPreferencesState((current) => ({ ...current, ...patch }));
        if (patch.lessonMode) {
          setLessonModeState(patch.lessonMode);
        }
        // Only undo while no newer preference save has started.
        return () => {
          if (version !== saveVersion.current) return;
          setPreferencesState((current) => ({ ...current, ...previous }));
          if (previous.lessonMode) {
            setLessonModeState(previous.lessonMode);
          }
        };
      },
      action: () => savePreferencesAction(patch),
      onSuccess: (result) => {
        saved = true;
        if (version === saveVersion.current) {
          reconcile(result);
        }
      },
      failure: {
        log: "Preferences save failed",
        event: "store.preferences.save_failed",
        context: { fields: changedFields(patch) },
        toast: "Couldn't save settings",
      },
      showToast,
    });
    return saved;
  }, [reconcile, showToast]);

  return useMemo(
    () => ({ preferences, setPreferences, lessonMode: lessonModeState, setLessonMode }),
    [preferences, setPreferences, lessonModeState, setLessonMode],
  );
}
