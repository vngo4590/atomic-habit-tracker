import { z } from "zod";

const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date key.");
const stringListSchema = z.array(z.string().trim().min(1)).default([]);

export const habitCreateSchema = z.object({
  name: z.string().trim().min(1, "Habit name is required.").max(120),
  emoji: z.string().trim().max(12).default("•"),
  cue: z.string().trim().max(500).default(""),
  craving: z.string().trim().max(500).default(""),
  response: z.string().trim().max(500).default(""),
  reward: z.string().trim().max(500).default(""),
  twoMin: z.string().trim().max(500).default(""),
  stack: z.string().trim().max(500).default(""),
  identity: z.string().trim().min(1, "Identity is required.").max(120),
  environment: z.string().trim().max(500).default(""),
  schedule: z.string().trim().max(120).default("Daily"),
  time: z.string().trim().max(80).default("Morning"),
  contract: z.string().trim().max(1000).default(""),
  contractPartners: stringListSchema,
});

export const habitUpdateSchema = habitCreateSchema.partial().extend({
  notes: z
    .array(
      z.object({
        id: z.string(),
        body: z.string().trim().min(1).max(1000),
        createdAt: dateKeySchema,
      }),
    )
    .optional(),
});

export const checkInSchema = z.object({
  dateKey: dateKeySchema,
  done: z.boolean().default(true),
  mood: z.number().int().min(1).max(5).nullable().optional(),
  journal: z.string().trim().max(2000).nullable().optional(),
});

export const noteSchema = z.object({
  body: z.string().trim().min(1, "Note body is required.").max(1000),
});

export const contractSchema = z.object({
  terms: z.string().trim().max(1000).default(""),
  partners: stringListSchema,
});

export const journalEntrySchema = z.object({
  dateKey: dateKeySchema,
  title: z.string().trim().min(1, "Title is required.").max(160),
  body: z.string().trim().max(4000).default(""),
  mood: z.string().trim().max(40).default("good"),
  tags: stringListSchema,
});

export const weeklyReviewSchema = z.object({
  weekStartKey: dateKeySchema,
  wentWell: z.string().trim().max(4000).default(""),
  smallestFix: z.string().trim().max(4000).default(""),
  identityVote: z.string().trim().max(4000).default(""),
});

export const identitySchema = z.object({
  statement: z.string().trim().max(1000).default(""),
  values: stringListSchema,
});

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

export const lessonProgressSchema = z.object({
  lessonId: z.number().int().positive(),
});

export const formationVerdictSchema = z.object({
  habitId: z.string().min(1),
  score: z.number().min(0).max(5),
  reflection: z.string().trim().max(2000).default(""),
  formed: z.boolean(),
  reviewedAt: z.string().datetime().optional(),
});

export type HabitCreateInput = z.infer<typeof habitCreateSchema>;
export type HabitUpdateInput = z.infer<typeof habitUpdateSchema>;
export type CheckInInput = z.infer<typeof checkInSchema>;
export type JournalEntryInput = z.infer<typeof journalEntrySchema>;
export type WeeklyReviewInput = z.infer<typeof weeklyReviewSchema>;
export type PreferencesInput = z.infer<typeof preferencesSchema>;
