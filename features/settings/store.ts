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
  const [preferences, setPreferencesState] = useState<UserPreferences>(snapshot.preferences);
  const preferencesRef = useRef(preferences);
  useEffect(() => {
    preferencesRef.current = preferences;
  }, [preferences]);
  const saveVersion = useRef(0);
  // Version of the latest save that wrote each field. Overlapping saves only
  // touch fields no newer save has written, so a late response or a failed
  // older save can never undo a newer change to another (or the same) field.
  const fieldVersion = useRef(new Map<keyof UserPreferences, number>());

  const setPreferences = useCallback(async (patch: Partial<UserPreferences>) => {
    const version = ++saveVersion.current;
    const fields = Object.keys(patch) as (keyof UserPreferences)[];
    // Remember the patched fields' old values so a failed save can restore them.
    const before = preferencesRef.current;
    const previous = Object.fromEntries(fields.map((key) => [key, before[key]])) as Partial<UserPreferences>;
    const ownsField = (key: keyof UserPreferences) => (fieldVersion.current.get(key) ?? 0) <= version;

    clientLogger.info("Saving preferences", {
      event: "store.preferences.save",
      fields: changedFields(patch),
    });
    let saved = false;
    await optimistic({
      apply: () => {
        fields.forEach((key) => fieldVersion.current.set(key, version));
        setPreferencesState((current) => ({ ...current, ...patch }));
        return () => {
          const restore = fields.filter(ownsField);
          setPreferencesState((current) => ({
            ...current,
            ...Object.fromEntries(restore.map((key) => [key, previous[key]])),
          }));
        };
      },
      action: () => savePreferencesAction(patch),
      onSuccess: (result) => {
        saved = true;
        // Adopt the server's values except where a newer save has taken over.
        const adopt = (Object.keys(result) as (keyof UserPreferences)[]).filter(ownsField);
        setPreferencesState((current) => ({
          ...current,
          ...Object.fromEntries(adopt.map((key) => [key, result[key]])),
        }));
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
  }, [showToast]);

  const setLessonMode = useCallback((lessonMode: UserPreferences["lessonMode"]) => {
    clientLogger.info("Setting lesson mode", {
      event: "store.preferences.lesson_mode",
      lessonMode,
    });
    void setPreferences({ lessonMode });
  }, [setPreferences]);

  return useMemo(
    () => ({ preferences, setPreferences, lessonMode: preferences.lessonMode, setLessonMode }),
    [preferences, setPreferences, setLessonMode],
  );
}