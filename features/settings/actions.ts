"use server";

/**
 * Settings server actions: save the signed-in user's preferences.
 */

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/auth/session";
import { logger, redactUserId } from "@/lib/logger";
import type { LessonMode, UserPreferences } from "@/lib/types";

import { savePreferences } from "./server";

// Keep the original module name so existing log queries and dashboards still match.
const log = logger.child({ module: "actions.domain" });

export async function savePreferencesAction(preferences: Partial<UserPreferences> & { lessonMode?: LessonMode }) {
  const userId = await requireUserId();
  log.info("Saving preferences", { event: "preferences.saved", userId: redactUserId(userId) });
  const saved = await savePreferences(userId, preferences);

  revalidatePath("/settings");
  revalidatePath("/lessons");
  return saved;
}
