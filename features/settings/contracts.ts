/**
 * Settings feature — input validation (Zod schemas).
 *
 * `preferencesSchema` validates a partial preferences patch (theme, accent,
 * nudges, lesson mode, timezone) for the settings server action and the
 * `/api/v1/reflection/preferences` route.
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
