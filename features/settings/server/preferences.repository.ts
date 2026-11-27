import "server-only";

/**
 * Preferences repository — reads and writes a user's settings row
 * (`UserPreference`), filling any missing value from `defaultPreferences`.
 */

import { db as defaultDb } from "@/lib/db/client";
import { validateDatabaseUrl } from "@/lib/db/config";
import { logger, redactUserId } from "@/lib/logger";
import type { UserPreferences } from "@/lib/types";

import { preferencesSchema, type PreferencesInput } from "../contracts";

type DbClient = typeof defaultDb;

export const defaultPreferences: UserPreferences = {
  theme: "light",
  accentHue: 60,
  remindersEnabled: true,
  weeklyReviewNudge: true,
  accountabilityNudge: false,
  onboardingSeen: false,
  lessonMode: "sequential",
  timezone: "UTC",
};

// Keep the original module name so existing log queries and dashboards still match.
const log = logger.child({ module: "repo.reflection" });

function toPreferences(record: Partial<UserPreferences> | null | undefined): UserPreferences {
  return {
    ...defaultPreferences,
    ...record,
  };
}

export async function getPreferences(userId: string, db: DbClient = defaultDb) {
  log.debug("Getting preferences", { event: "repo.preferences.get", userId: redactUserId(userId) });
  validateDatabaseUrl();

  const record = await db.userPreference.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });

  return toPreferences({
    theme: record.theme,
    accentHue: record.accentHue,
    remindersEnabled: record.remindersEnabled,
    weeklyReviewNudge: record.weeklyReviewNudge,
    accountabilityNudge: record.accountabilityNudge,
    onboardingSeen: record.onboardingSeen,
    lessonMode: record.lessonMode,
    timezone: record.timezone,
  });
}

export async function savePreferences(userId: string, input: PreferencesInput, db: DbClient = defaultDb) {
  log.debug("Saving preferences", {
    event: "repo.preferences.save",
    userId: redactUserId(userId),
    theme: input.theme,
    remindersEnabled: input.remindersEnabled,
    timezone: input.timezone,
  });
  validateDatabaseUrl();
  const data = preferencesSchema.parse(input);

  const record = await db.userPreference.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });

  return toPreferences({
    theme: record.theme,
    accentHue: record.accentHue,
    remindersEnabled: record.remindersEnabled,
    weeklyReviewNudge: record.weeklyReviewNudge,
    accountabilityNudge: record.accountabilityNudge,
    onboardingSeen: record.onboardingSeen,
    lessonMode: record.lessonMode,
    timezone: record.timezone,
  });
}
