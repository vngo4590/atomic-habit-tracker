import { z } from "zod";

/**
 * Zod contracts for the Atomicly data backup envelope.
 *
 * A "backup" is a single self-describing JSON file that captures a user's whole
 * dataset so they can download it (export) and later restore it (import). This
 * module is the *gatekeeper* for import: every byte of an uploaded file is run
 * through `backupEnvelopeSchema` before we touch the database, so a hand-edited
 * or foreign file can never reach a repository write.
 *
 * Design notes:
 *   - The schema is deliberately a little lenient on individual records (it
 *     coerces/defaults missing optional fields) so a backup taken from an older
 *     app version still restores. It is strict about the *envelope* shape so we
 *     can reject files that aren't Atomicly backups at all.
 *   - Records carry their own ids. Import upserts by id, which makes restoring
 *     the same file twice a harmless no-op (idempotent).
 *   - Pets are included for completeness/portability but are intentionally NOT
 *     part of the import contract's writeable set — see `lib/backup/import.ts`.
 */

// A YYYY-MM-DD calendar key, matching the rest of the domain contracts.
const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date key.");

// A single day's check-in as stored on `Habit.history`. The history map can
// hold either a bare boolean (legacy "done/not done") or a richer object with
// an optional mood (1-5) and journal note, so we accept both shapes.
const historyCheckInSchema = z.union([
  z.boolean(),
  z.object({
    done: z.boolean(),
    mood: z.number().int().min(1).max(5).nullable().optional(),
    journal: z.string().max(2000).optional(),
  }),
]);

// A free-form coaching note attached to a habit.
const noteSchema = z.object({
  id: z.string().min(1),
  body: z.string().min(1).max(1000),
  createdAt: z.string().min(1),
});

// A full habit record as it appears in the backup. This mirrors the `Habit`
// type in lib/types.ts (the export shape), including the nested check-in
// history, notes, and accountability contract.
const habitSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120),
  emoji: z.string().max(12).default("•"),
  cue: z.string().max(500).default(""),
  craving: z.string().max(500).default(""),
  response: z.string().max(500).default(""),
  reward: z.string().max(500).default(""),
  loopCue: z.string().max(500).default(""),
  loopCraving: z.string().max(500).default(""),
  loopResponse: z.string().max(500).default(""),
  loopReward: z.string().max(500).default(""),
  twoMin: z.string().max(500).default(""),
  identity: z.string().max(120).default(""),
  environment: z.string().max(500).default(""),
  schedule: z.string().max(120).default("Daily"),
  time: z.string().max(80).default("Morning"),
  stackNextId: z.string().nullable().optional(),
  contract: z.string().max(1000).default(""),
  contractPartners: z.array(z.string()).default([]),
  history: z.record(z.string(), historyCheckInSchema).default({}),
  notes: z.array(noteSchema).default([]),
  createdAt: z.string().min(1),
});

// A journal entry. `date` is an ISO-ish string in the export; we keep it loose
// because only its day matters when we re-derive the dateKey on import.
const journalEntrySchema = z.object({
  id: z.string().min(1),
  date: z.string().min(1),
  title: z.string().min(1).max(160),
  body: z.string().max(4000).default(""),
  mood: z.string().max(40).default("good"),
  tags: z.array(z.string()).default([]),
});

const identitySchema = z.object({
  statement: z.string().max(1000).default(""),
  values: z.array(z.string()).default([]),
});

const weeklyReviewSchema = z.object({
  weekStartKey: dateKeySchema,
  wentWell: z.string().max(4000).default(""),
  smallestFix: z.string().max(4000).default(""),
  identityVote: z.string().max(4000).default(""),
  updatedAt: z.string().optional(),
});

const formationVerdictSchema = z.object({
  habitId: z.string().min(1),
  score: z.number().min(0).max(5),
  reflection: z.string().max(2000).default(""),
  formed: z.boolean(),
  reviewedAt: z.string().optional(),
});

const preferencesSchema = z.object({
  theme: z.enum(["light", "dark"]).optional(),
  accentHue: z.number().int().min(0).max(360).optional(),
  remindersEnabled: z.boolean().optional(),
  weeklyReviewNudge: z.boolean().optional(),
  accountabilityNudge: z.boolean().optional(),
  onboardingSeen: z.boolean().optional(),
  lessonMode: z.enum(["sequential", "random"]).optional(),
  timezone: z.string().min(1).max(80).optional(),
});

// Pets are exported for portability but ignored by the importer. We validate
// them loosely so an unfamiliar field never blocks an otherwise-valid restore.
const petSchema = z
  .object({
    id: z.string().min(1),
    name: z.string(),
    temperament: z.string(),
    seed: z.number(),
  })
  .passthrough();

/**
 * The payload portion of a backup — every user-owned data block. All blocks are
 * optional so a partial backup (e.g. only habits) still validates and restores
 * what it contains.
 */
export const backupDataSchema = z.object({
  habits: z.array(habitSchema).default([]),
  journal: z.array(journalEntrySchema).default([]),
  identity: identitySchema.optional(),
  weeklyReviews: z.array(weeklyReviewSchema).default([]),
  completedLessons: z.array(z.number().int().positive()).default([]),
  formationVerdicts: z.array(formationVerdictSchema).default([]),
  preferences: preferencesSchema.optional(),
  pets: z.array(petSchema).default([]),
});

/** The current backup schema version. Bump when the shape changes incompatibly. */
export const BACKUP_SCHEMA_VERSION = 1;

/** The marker that identifies a file as an Atomicly backup. */
export const BACKUP_APP_MARKER = "atomicly";

/**
 * The top-level backup envelope. The `app` + `schemaVersion` markers let import
 * reject files that aren't Atomicly backups (or are from an incompatible future
 * version) before any data is read.
 */
export const backupEnvelopeSchema = z.object({
  app: z.literal(BACKUP_APP_MARKER),
  schemaVersion: z.number().int().min(1).max(BACKUP_SCHEMA_VERSION),
  exportedAt: z.string(),
  data: backupDataSchema,
});

export type BackupHabit = z.infer<typeof habitSchema>;
export type BackupData = z.infer<typeof backupDataSchema>;
export type BackupEnvelope = z.infer<typeof backupEnvelopeSchema>;
