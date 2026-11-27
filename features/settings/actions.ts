"use server";

/**
 * Settings server actions: save the signed-in user's preferences and restore
 * their data from an uploaded backup file.
 */

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";

import { requireUserId } from "@/lib/auth/session";
import { logger, redactUserId } from "@/lib/logger";
import type { LessonMode, UserPreferences } from "@/lib/types";

import { mergeBackup, savePreferences, type ImportSummary } from "./server";

// Keep the original module name so existing log queries and dashboards still match.
const log = logger.child({ module: "actions.domain" });
const backupLog = logger.child({ module: "actions.backup" });

export async function savePreferencesAction(preferences: Partial<UserPreferences> & { lessonMode?: LessonMode }) {
  const userId = await requireUserId();
  log.info("Saving preferences", { event: "preferences.saved", userId: redactUserId(userId) });
  const saved = await savePreferences(userId, preferences);

  revalidatePath("/settings");
  revalidatePath("/lessons");
  return saved;
}

// A backup file larger than this almost certainly isn't a legitimate Atomicly
// export; rejecting it early protects the server from oversized parse attempts.
const MAX_BACKUP_BYTES = 5 * 1024 * 1024; // 5 MB

/** Result returned to the Settings UI after an import attempt. */
export interface ImportResult {
  ok: boolean;
  message: string;
  summary?: ImportSummary;
}

/**
 * Server action that restores a user's data from an uploaded backup file.
 *
 * The UI reads the chosen file as text and passes it here. We size-check it,
 * parse the JSON, then hand the parsed object to `mergeBackup`, which validates
 * it against the backup contract and merges it transactionally. All failure
 * modes (too large, not JSON, not an Atomicly backup) return a friendly message
 * rather than throwing, so the Settings page can show a toast.
 *
 * @param fileText The raw text contents of the uploaded `.json` backup file.
 */
export async function importDataAction(fileText: string): Promise<ImportResult> {
  const userId = await requireUserId();

  if (typeof fileText !== "string" || fileText.trim().length === 0) {
    return { ok: false, message: "No file contents were received." };
  }

  // Reject oversized uploads before parsing to bound memory/CPU.
  if (Buffer.byteLength(fileText, "utf8") > MAX_BACKUP_BYTES) {
    backupLog.warn("Backup import rejected — file too large", {
      event: "backup.import.too_large",
      userId: redactUserId(userId),
    });
    return { ok: false, message: "That file is too large to be an Atomicly backup." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(fileText);
  } catch {
    return { ok: false, message: "That file isn't valid JSON." };
  }

  try {
    const summary = await mergeBackup(userId, parsed);
    revalidateApp();
    backupLog.info("Backup import succeeded", {
      event: "backup.import.action.ok",
      userId: redactUserId(userId),
      habits: summary.habits,
    });
    return { ok: true, message: summaryMessage(summary), summary };
  } catch (error) {
    if (error instanceof ZodError) {
      backupLog.warn("Backup import rejected — invalid backup", { event: "backup.import.invalid" });
      return { ok: false, message: "That file isn't a valid Atomicly backup." };
    }
    backupLog.error("Backup import failed", { event: "backup.import.action.failed", userId: redactUserId(userId), error });
    return { ok: false, message: "Something went wrong while importing. Your data was not changed." };
  }
}

/** Turn a merge summary into a short human sentence for the success toast. */
function summaryMessage(summary: ImportSummary): string {
  const parts: string[] = [];
  if (summary.habits) parts.push(`${summary.habits} habit${summary.habits === 1 ? "" : "s"}`);
  if (summary.checkIns) parts.push(`${summary.checkIns} check-in${summary.checkIns === 1 ? "" : "s"}`);
  if (summary.journal) parts.push(`${summary.journal} journal entr${summary.journal === 1 ? "y" : "ies"}`);
  if (parts.length === 0) return "Backup imported. Nothing new to restore.";
  return `Restored ${parts.join(", ")}.`;
}

/** Revalidate every screen that surfaces imported data so the UI reflects it. */
function revalidateApp() {
  revalidatePath("/");
  revalidatePath("/habits");
  revalidatePath("/analytics");
  revalidatePath("/journal");
  revalidatePath("/review");
  revalidatePath("/identity");
  revalidatePath("/hall-of-fame");
  revalidatePath("/settings");
}
