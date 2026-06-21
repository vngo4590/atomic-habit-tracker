import {
  BACKUP_APP_MARKER,
  BACKUP_SCHEMA_VERSION,
  type BackupEnvelope,
} from "@/lib/contracts/backup";
import type { Pet, StoreSnapshot } from "@/lib/types";

/**
 * Assemble a complete, versioned backup envelope from a user's store snapshot.
 *
 * This is a *pure* function: given the same snapshot it always produces the same
 * envelope (modulo the `exportedAt` timestamp, which the caller can pin for
 * deterministic tests). Keeping it side-effect-free means the export endpoint
 * stays a thin shell and the assembly logic is trivially unit-testable.
 *
 * Every user-owned block from the snapshot is represented so the backup is a
 * faithful, self-contained copy of the account's data. Pets are included for
 * portability even though import deliberately ignores them.
 *
 * @param snapshot The full data snapshot loaded from `getStoreSnapshot`.
 * @param now      Injectable clock for the `exportedAt` stamp (defaults to real time).
 */
export function buildBackup(snapshot: StoreSnapshot, now: Date = new Date()): BackupEnvelope {
  const pets: Pet[] = snapshot.pets ?? [];

  return {
    app: BACKUP_APP_MARKER,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    data: {
      habits: snapshot.habits.map((habit) => ({
        id: habit.id,
        name: habit.name,
        emoji: habit.emoji,
        cue: habit.cue,
        craving: habit.craving,
        response: habit.response,
        reward: habit.reward,
        loopCue: habit.loopCue,
        loopCraving: habit.loopCraving,
        loopResponse: habit.loopResponse,
        loopReward: habit.loopReward,
        twoMin: habit.twoMin,
        identity: habit.identity,
        environment: habit.environment,
        schedule: habit.schedule,
        time: habit.time,
        stackNextId: habit.stackNextId ?? null,
        contract: habit.contract,
        contractPartners: habit.contractPartners,
        // `history` and `notes` are copied verbatim — they already match the
        // backup contract shapes, so the whole per-habit record round-trips.
        history: habit.history,
        notes: habit.notes,
        createdAt: habit.createdAt,
      })),
      journal: snapshot.journal.map((entry) => ({
        id: entry.id,
        date: entry.date,
        title: entry.title,
        body: entry.body,
        mood: entry.mood,
        tags: entry.tags,
      })),
      identity: {
        statement: snapshot.identity.statement,
        values: snapshot.identity.values,
      },
      weeklyReviews: (snapshot.weeklyReviews ?? []).map((review) => ({
        weekStartKey: review.weekStartKey,
        wentWell: review.wentWell,
        smallestFix: review.smallestFix,
        identityVote: review.identityVote,
        updatedAt: review.updatedAt,
      })),
      completedLessons: snapshot.completedLessons,
      formationVerdicts: snapshot.formationVerdicts.map((verdict) => ({
        habitId: verdict.habitId,
        score: verdict.score,
        reflection: verdict.reflection,
        formed: verdict.formed,
        reviewedAt: verdict.reviewedAt,
      })),
      preferences: { ...snapshot.preferences },
      pets: pets.map((pet) => ({ ...pet })),
    },
  };
}
