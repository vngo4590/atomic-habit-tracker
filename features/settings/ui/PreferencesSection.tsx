"use client";

import { Button, Switch } from "@/components/ui";
import { useStoreContext } from "@/components/StoreProvider";
import { clientLogger } from "@/lib/logger-client";
import type { UserPreferences } from "@/lib/types";

import { SettingRow, SettingsSection } from "./SettingsSection";

type NudgeKey = "remindersEnabled" | "weeklyReviewNudge" | "accountabilityNudge";

const NUDGES: ReadonlyArray<{ key: NudgeKey; label: string; hint: string }> = [
  { key: "remindersEnabled", label: "Daily reminders", hint: "Remind me to check in on today's habits." },
  { key: "weeklyReviewNudge", label: "Weekly review nudge", hint: "Remind me to reflect at the end of each week." },
  { key: "accountabilityNudge", label: "Accountability nudges", hint: "Nudge me when a habit starts to slip." },
];

/**
 * PreferencesSection — reminder switches and the welcome-tour replay. Every
 * change saves immediately (optimistic store write) and confirms with a toast.
 */
export function PreferencesSection() {
  const { preferences, setPreferences, showToast } = useStoreContext();

  const save = (patch: Partial<UserPreferences>, message: string) => {
    clientLogger.info("Preference changed", { page: "settings", fields: Object.keys(patch) });
    setPreferences(patch);
    showToast(message);
  };

  return (
    <SettingsSection id="preferences" title="Preferences" description="Saved to your account and used on every device.">
      {NUDGES.map((nudge) => (
        <SettingRow
          key={nudge.key}
          label={nudge.label}
          hint={nudge.hint}
          action={
            <Switch
              checked={preferences[nudge.key]}
              aria-label={nudge.label}
              onCheckedChange={(checked) => save({ [nudge.key]: checked }, `${nudge.label} ${checked ? "on" : "off"}`)}
            />
          }
        />
      ))}

      <SettingRow
        label="Welcome tour"
        hint="Replay the short introduction to Atomicly."
        action={
          <Button
            variant="secondary"
            size="sm"
            disabled={!preferences.onboardingSeen}
            onClick={() => save({ onboardingSeen: false }, "Welcome tour restarted")}
          >
            Replay tour
          </Button>
        }
      />
    </SettingsSection>
  );
}
