import { z } from "zod";

import { dateKeySchema, stringListSchema } from "@/lib/contracts/primitives";

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

export const lessonProgressSchema = z.object({
  lessonId: z.number().int().positive(),
});

export type JournalEntryInput = z.infer<typeof journalEntrySchema>;
export type WeeklyReviewInput = z.infer<typeof weeklyReviewSchema>;
