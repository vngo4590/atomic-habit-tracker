import "server-only";

/**
 * Pet mapper - converts raw Prisma `Pet` rows into the store's `Pet` shape and
 * the engine's `PetVitals`, and persists a death discovered on read ("simulate
 * on read") so it becomes permanent. Shared by the pet repositories.
 */

import { db as defaultDb } from "@/lib/db/client";
import { logger } from "@/lib/logger";
import type { Pet } from "@/lib/types";

import { simulatePet, tuningFor, type PetVitals } from "../model/simulation";

export type DbClient = typeof defaultDb;

/** The shape of a raw Prisma `Pet` row (the fields we read). */
export type PetRow = {
  id: string;
  name: string;
  temperament: string;
  seed: number;
  totalFeeds: number;
  satiety: number;
  health: number;
  bornAt: Date;
  lastFedAt: Date;
  lastSimAt: Date;
  isAlive: boolean;
  diedAt: Date | null;
};

const log = logger.child({ module: "repo.pets" });

/** Map a raw database row into the serialisable `Pet` shape used by the store. */
export function toPet(row: PetRow): Pet {
  return {
    id: row.id,
    name: row.name,
    temperament: row.temperament,
    seed: row.seed,
    totalFeeds: row.totalFeeds,
    satiety: row.satiety,
    health: row.health,
    bornAt: row.bornAt.toISOString(),
    lastFedAt: row.lastFedAt.toISOString(),
    lastSimAt: row.lastSimAt.toISOString(),
    isAlive: row.isAlive,
    diedAt: row.diedAt ? row.diedAt.toISOString() : null,
  };
}

/** Build the simulation's `PetVitals` from a database row (dates -> epoch ms). */
export function vitalsFromRow(row: PetRow): PetVitals {
  return {
    satiety: row.satiety,
    health: row.health,
    lastSimAt: row.lastSimAt.getTime(),
    lastFedAt: row.lastFedAt.getTime(),
    bornAt: row.bornAt.getTime(),
    isAlive: row.isAlive,
    diedAt: row.diedAt ? row.diedAt.getTime() : null,
  };
}

/**
 * If a pet has died since its last checkpoint, persist that death (permanently)
 * and return the updated row. Alive pets are returned unchanged at their stored
 * checkpoint so the client can keep simulating from the same anchor.
 */
export async function persistDeathIfNeeded(row: PetRow, now: number, db: DbClient): Promise<PetRow> {
  if (!row.isAlive) {
    return row;
  }
  const simulated = simulatePet(vitalsFromRow(row), tuningFor(row.temperament), now);
  if (simulated.isAlive) {
    return row;
  }

  log.info("Pet died of neglect", { event: "pet.died", petId: row.id });
  const updated = await db.pet.update({
    where: { id: row.id },
    data: {
      isAlive: false,
      health: 0,
      satiety: 0,
      diedAt: simulated.diedAt ? new Date(simulated.diedAt) : new Date(now),
      lastSimAt: simulated.diedAt ? new Date(simulated.diedAt) : new Date(now),
    },
  });
  return updated as PetRow;
}
