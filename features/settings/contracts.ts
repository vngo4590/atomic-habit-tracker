/**
 * Settings feature — input validation (Zod schemas).
 *
 * `preferencesSchema` validates a partial preferences patch (theme, accent,
 * nudges, lesson mode, timezone) for the settings server action and the
 * `/api/v1/reflection/preferences` route. The backup envelope contract
 * (`backupEnvelopeSchema`) validates uploaded backup files before import.
 */

import { z } from "zod";

export const preferencesSchema = z.object({
  theme: z.enum(["light", "dark"]).optional(),
  accentHue: z.number().int().min(0).max(360).optional(),
  remindersEnabled: z.boolean().optional(),
  weeklyReviewNudge: z.boolean().optional(),
  accountabilityNudge: z.boolean().optional(),
  onboardingSeen: z.boolean().optional(),
  lessonMode: z.enum(["sequential", "random"]).optional(),
  timezone: z.string().trim().min(1).max(80).optional(),
});

export type PreferencesInput = z.infer<typeof preferencesSchema>;

// The backup envelope schemas live in the model folder (pure Zod) and are
// re-exported here so the feature keeps a single contracts entry point.
export * from "./model/backup-envelope";
