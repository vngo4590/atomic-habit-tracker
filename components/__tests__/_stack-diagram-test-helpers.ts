/**
 * Shared test setup for the split StackDiagram tests.
 *
 * The original `StackDiagram.test.tsx` was a single 30 KB file with 35
 * tests across one outer describe and five sub-describes (picker,
 * chip-interactions, drag, solo-join, mobile). Each sub-describe was
 * extracted into its own focused file (see siblings in this folder).
 *
 * All split files import `routerPush`, `routerBack`, and `makeHabit`
 * from here. Each split file installs its own vi.mock for
 * `next/navigation` because vi.mock is only hoisted within the file
 * that contains it.
 */

import { vi } from "vitest";

import type { Habit } from "@/lib/types";

/** Reference the StoreContextProvider used by every StackDiagram test. */
export { StackContextProvider } from "./_stack-test-utils";

/** Spy on Next.js router push/back so tests can assert navigation. */
export const routerPush = vi.fn();
export const routerBack = vi.fn();

/** Build a Habit fixture with sensible defaults plus an optional next-id. */
export function makeHabit(id: string, stackNextId?: string | null): Habit {
  return {
    id,
    name: `Habit ${id}`,
    emoji: "•",
    cue: "",
    craving: "",
    response: "",
    reward: "",
    loopCue: "",
    loopCraving: "",
    loopResponse: "",
    loopReward: "",
    twoMin: "",
    identity: "tester",
    environment: "",
    schedule: "Daily",
    time: "Morning",
    stackNextId: stackNextId ?? null,
    contract: "",
    contractPartners: [],
    history: {},
    notes: [],
    createdAt: "2030-01-01",
  };
}
