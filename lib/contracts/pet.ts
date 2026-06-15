/**
 * pet.ts — Zod contracts validating every pet mutation at the trust boundary.
 *
 * These schemas are shared by the server actions (and any future API routes) so
 * the rules for adopting, feeding, and burying a pet are defined exactly once.
 * They guard against malformed or hostile input before it reaches the database.
 */

import { z } from "zod";

import { TEMPERAMENTS } from "@/lib/pet/genome";

/** The allowed temperament ids, derived from the engine registry so they can't drift. */
const temperamentIds = TEMPERAMENTS.map((t) => t.id) as [string, ...string[]];

/** Adopting a pet: a display name and one of the known temperaments. */
export const petAdoptSchema = z.object({
  name: z.string().trim().min(1, "Give your pet a name.").max(40),
  temperament: z.enum(temperamentIds),
});

/** Feeding a pet: which pet, and how many food units (bounded for sanity). */
export const petFeedSchema = z.object({
  petId: z.string().min(1),
  amount: z.number().int().min(1).max(8),
});

/** Burying a (dead) pet: just the pet id. */
export const petBurySchema = z.object({
  petId: z.string().min(1),
});

/** Releasing (deleting) any pet, alive or dead: just the pet id. */
export const petDeleteSchema = z.object({
  petId: z.string().min(1),
});

export type PetAdoptInput = z.infer<typeof petAdoptSchema>;
export type PetFeedInput = z.infer<typeof petFeedSchema>;
export type PetBuryInput = z.infer<typeof petBurySchema>;
export type PetDeleteInput = z.infer<typeof petDeleteSchema>;
