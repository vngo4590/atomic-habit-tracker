/**
 * Shared test fixtures and store helpers for the split journal page tests.
 *
 * The original `page.test.tsx` was a single 41 KB file with 54 tests
 * across 11 describe blocks. Each describe was extracted into its own
 * focused file (see siblings in this folder) so failures point at a
 * specific user flow.
 *
 * Each test file installs its own `vi.mock("@/components/StoreProvider")`
 * because Vitest only hoists vi.mock calls within the file that contains
 * them. The factory in every test reads from the `storeRef.current`
 * exported here, so tests share a single mutable store snapshot.
 */

import { vi } from "vitest";

import { testStoreContext } from "@/lib/test/fixtures";
import type { StoreState } from "@/lib/types";

/**
 * Mutable container the StoreProvider mock factory reads from. Each test
 * calls `setStore(...)` to swap the snapshot before render().
 */
export const storeRef: { current: StoreState } = { current: testStoreContext() };

/** Set the store context the next render() will see. */
export function setStore(next: StoreState) {
  storeRef.current = next;
}

/** Build a fresh StoreState with default journal action stubs. */
export function makeStore(patch: Partial<StoreState> = {}): StoreState {
  return testStoreContext({
    addJournal: vi.fn(),
    updateJournal: vi.fn(),
    ...patch,
  });
}

export type { StoreState };

