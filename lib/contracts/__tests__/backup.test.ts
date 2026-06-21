import { describe, expect, it } from "vitest";

import {
  BACKUP_APP_MARKER,
  BACKUP_SCHEMA_VERSION,
  backupEnvelopeSchema,
} from "@/lib/contracts/backup";

/**
 * Build a minimal valid backup envelope, then let individual tests override
 * pieces of it. Keeps each test focused on the one thing it is asserting.
 */
function makeEnvelope(overrides: Record<string, unknown> = {}) {
  return {
    app: BACKUP_APP_MARKER,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: "2026-06-21T00:00:00.000Z",
    data: {},
    ...overrides,
  };
}

describe("backup envelope contract", () => {
  it("accepts a minimal well-formed envelope and defaults empty blocks", () => {
    // Given a backup with the markers but an empty data block
    const result = backupEnvelopeSchema.safeParse(makeEnvelope());
    // Then it validates and every data array defaults to empty
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.data.habits).toEqual([]);
      expect(result.data.data.journal).toEqual([]);
      expect(result.data.data.completedLessons).toEqual([]);
    }
  });

  it("rejects files that are not Atomicly backups", () => {
    // Given a file whose app marker is something else
    const result = backupEnvelopeSchema.safeParse(makeEnvelope({ app: "someOtherApp" }));
    // Then the import gate refuses it
    expect(result.success).toBe(false);
  });

  it("rejects an incompatible future schema version", () => {
    // Given a backup from a newer, unknown schema version
    const result = backupEnvelopeSchema.safeParse(
      makeEnvelope({ schemaVersion: BACKUP_SCHEMA_VERSION + 1 }),
    );
    // Then we refuse rather than risk misreading the shape
    expect(result.success).toBe(false);
  });

  it("validates a habit with nested history and notes and fills defaults", () => {
    // Given a habit carrying a mixed history map (bare boolean + rich object)
    const result = backupEnvelopeSchema.safeParse(
      makeEnvelope({
        data: {
          habits: [
            {
              id: "h1",
              name: "Read",
              identity: "reader",
              createdAt: "2026-06-01",
              history: {
                "2026-06-01": true,
                "2026-06-02": { done: true, mood: 4, journal: "Two pages" },
              },
              notes: [{ id: "n1", body: "Keep going", createdAt: "2026-06-02" }],
            },
          ],
        },
      }),
    );
    // Then it parses and unspecified habit fields receive their defaults
    expect(result.success).toBe(true);
    if (result.success) {
      const habit = result.data.data.habits[0];
      expect(habit.emoji).toBe("•");
      expect(habit.schedule).toBe("Daily");
      expect(habit.contractPartners).toEqual([]);
    }
  });

  it("rejects an out-of-range mood inside habit history", () => {
    // Given a history entry with a mood above the 1-5 scale
    const result = backupEnvelopeSchema.safeParse(
      makeEnvelope({
        data: {
          habits: [
            {
              id: "h1",
              name: "Read",
              identity: "reader",
              createdAt: "2026-06-01",
              history: { "2026-06-01": { done: true, mood: 9 } },
            },
          ],
        },
      }),
    );
    // Then validation fails so corrupt data never reaches the database
    expect(result.success).toBe(false);
  });

  it("tolerates unknown pet fields so restores are not blocked by them", () => {
    // Given a pet block carrying a field the importer does not know about
    const result = backupEnvelopeSchema.safeParse(
      makeEnvelope({
        data: {
          pets: [{ id: "p1", name: "Mochi", temperament: "calm", seed: 42, mystery: "future" }],
        },
      }),
    );
    // Then it still validates (pets are export-only and loosely checked)
    expect(result.success).toBe(true);
  });

  it("rejects a weekly review with a malformed week key", () => {
    // Given a weekly review whose weekStartKey is not YYYY-MM-DD
    const result = backupEnvelopeSchema.safeParse(
      makeEnvelope({
        data: { weeklyReviews: [{ weekStartKey: "06/14/2026" }] },
      }),
    );
    // Then it is refused
    expect(result.success).toBe(false);
  });
});
