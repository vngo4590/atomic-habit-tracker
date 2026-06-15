"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/auth/session";
import { petAdoptSchema, petBurySchema, petDeleteSchema, petFeedSchema } from "@/lib/contracts/pet";
import { todayKey } from "@/lib/helpers";
import { logger, redactUserId } from "@/lib/logger";
import { adoptPet, buryPet, deletePet, feedPet, type FeedResult } from "@/lib/repositories/pets";
import type { Pet, PetDraft } from "@/lib/types";

const log = logger.child({ module: "actions.pets" });

/**
 * Adopt a brand-new pet from a chosen temperament. The repository seeds a unique
 * creature and enforces the ecosystem cap; we surface its result to the store.
 */
export async function adoptPetAction(draft: PetDraft): Promise<Pet> {
  const userId = await requireUserId();
  const input = petAdoptSchema.parse(draft);
  log.info("Adopting pet", { event: "pet.adopted", userId: redactUserId(userId), temperament: input.temperament });

  const pet = await adoptPet(userId, input, Date.now());

  revalidatePath("/pet");
  return pet;
}

/**
 * Feed a pet by `amount`, spending from today's shared food pool. Returns the
 * full result (including the clamped amount and whether the pet evolved) so the
 * UI can celebrate appropriately.
 */
export async function feedPetAction(petId: string, amount: number): Promise<FeedResult> {
  const userId = await requireUserId();
  const input = petFeedSchema.parse({ petId, amount });
  log.info("Feeding pet", { event: "pet.fed", userId: redactUserId(userId), petId: input.petId, amount: input.amount });

  const result = await feedPet(userId, input.petId, input.amount, todayKey(), Date.now());

  revalidatePath("/pet");
  return result;
}

/** Lay a (dead) pet to rest, removing it from the graveyard. */
export async function buryPetAction(petId: string): Promise<boolean> {
  const userId = await requireUserId();
  const input = petBurySchema.parse({ petId });
  log.info("Burying pet", { event: "pet.buried", userId: redactUserId(userId), petId: input.petId });

  const buried = await buryPet(userId, input.petId, Date.now());

  revalidatePath("/pet");
  return buried;
}

/** Release any pet (alive or dead) from the ecosystem at the user's request. */
export async function deletePetAction(petId: string): Promise<boolean> {
  const userId = await requireUserId();
  const input = petDeleteSchema.parse({ petId });
  log.info("Releasing pet", { event: "pet.released", userId: redactUserId(userId), petId: input.petId });

  const deleted = await deletePet(userId, input.petId);

  revalidatePath("/pet");
  return deleted;
}
