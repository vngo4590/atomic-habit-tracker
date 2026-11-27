/**
 * Habits feature — input validation (Zod schemas).
 *
 * One source of truth for what a valid habit, check-in, note, habit contract
 * and Hall of Fame formation verdict look like. Used by the browser, the
 * server actions, the repositories and the `/api/v1` route handlers so every
 * entry point accepts and rejects exactly the same input.
 */

import { z } from "zod";

import { dateKeySchema, stringListSchema } from "@/lib/contracts/primitives";

const optionalStringListSchema = z.array(z.string().trim().min(1));
const habitTextSchema = z.string().trim().max(500);
const habitNameSchema = z.string().trim().min(1, "Habit name is required.").max(120);
const habitEmojiSchema = z.string().trim().max(12);
const habitIdentitySchema = z.string().trim().min(1, "Identity is required.").max(120);
const habitScheduleSchema = z.string().trim().max(120);
const habitTimeSchema = z.string().trim().max(80);
const habitContractSchema = z.string().trim().max(1000);

export const habitCreateSchema = z.object({
  name: habitNameSchema,
  emoji: habitEmojiSchema.default("•"),
  cue: habitTextSchema.default(""),
  craving: habitTextSchema.default(""),
  response: habitTextSchema.default(""),
  reward: habitTextSchema.default(""),
  loopCue: habitTextSchema.default(""),
  loopCraving: habitTextSchema.default(""),
  loopResponse: habitTextSchema.default(""),
  loopReward: habitTextSchema.default(""),
  twoMin: habitTextSchema.default(""),
  identity: habitIdentitySchema,
  environment: habitTextSchema.default(""),
  schedule: habitScheduleSchema.default("Daily"),
  time: habitTimeSchema.default("Morning"),
  stackNextId: z.string().nullable().optional(),
  contract: habitContractSchema.default(""),
  contractPartners: stringListSchema,
});

export const habitUpdateSchema = z.object({
  name: habitNameSchema.optional(),
  emoji: habitEmojiSchema.optional(),
  cue: habitTextSchema.optional(),
  craving: habitTextSchema.optional(),
  response: habitTextSchema.optional(),
  reward: habitTextSchema.optional(),
  loopCue: habitTextSchema.optional(),
  loopCraving: habitTextSchema.optional(),
  loopResponse: habitTextSchema.optional(),
  loopReward: habitTextSchema.optional(),
  twoMin: habitTextSchema.optional(),
  identity: habitIdentitySchema.optional(),
  environment: habitTextSchema.optional(),
  schedule: habitScheduleSchema.optional(),
  time: habitTimeSchema.optional(),
  stackNextId: z.string().nullable().optional(),
  contract: habitContractSchema.optional(),
  contractPartners: optionalStringListSchema.optional(),
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
export type NoteInput = z.infer<typeof noteSchema>;
export type ContractInput = z.infer<typeof contractSchema>;
export type FormationVerdictInput = z.infer<typeof formationVerdictSchema>;
