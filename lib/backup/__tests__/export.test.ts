import { describe, expect, it } from "vitest";

import { backupEnvelopeSchema } from "@/lib/contracts/backup";
import { buildBackup } from "@/lib/backup/export";
import type { StoreSnapshot } from "@/lib/types";

/** A representative, fully-populated snapshot covering every backup block. */
function makeSnapshot(): StoreSnapshot {
  return {
    habits: [
      {
        id: "h1",
        name: "Read",
        emoji: "📚",
        cue: "After coffee",
        craving: "Learn",
        response: "Read two pages",
        reward: "Feel sharp",
        loopCue: "Coffee brewed",
        loopCraving: "Curiosity",
        loopResponse: "Open book",
        loopReward: "Progress",
        twoMin: "Read one sentence",
        identity: "reader",
        environment: "Desk",
        schedule: "Daily",
        time: "Morning",
        stackNextId: null,
        contract: "Pay $5 if skipped",
        contractPartners: ["Sam"],
        history: {
          "2026-06-01": true,
          "2026-06-02": { done: true, mood: 4, journal: "Good session" },
        },
        notes: [{ id: "n1", body: "Keep going", createdAt: "2026-06-02" }],
        createdAt: "2026-06-01",
      },
    ],
    journal: [
      { id: "j1", date: "2026-06-02", title: "Win", body: "Felt great", mood: "good", tags: ["focus"] },
    ],
    identity: { statement: "I am a reader", values: ["growth"] },
    weeklyReview: { wentWell: "", smallestFix: "", identityVote: "" },
    weeklyReviews: [
      {
        weekStartKey: "2026-06-01",
        wentWell: "Consistent",
        smallestFix: "Sleep earlier",
        identityVote: "reader",
        updatedAt: "2026-06-07T00:00:00.000Z",
      },
    ],
    completedLessons: [1, 2, 3],
    formationVerdicts: [
      { habitId: "h1", score: 4, reflection: "Sticking", formed: true, reviewedAt: "2026-06-07T00:00:00.000Z" },
    ],
    preferences: {
      theme: "dark",
      accentHue: 145,
      remindersEnabled: true,
      weeklyReviewNudge: true,
      accountabilityNudge: false,
      onboardingSeen: true,
      lessonMode: "sequential",
      timezone: "UTC",
    },
    pets: [
      {
        id: "p1",
        name: "Mochi",
        temperament: "calm",
        seed: 42,
        totalFeeds: 10,
        satiety: 3,
        health: 100,
        bornAt: "2026-06-01T00:00:00.000Z",
        lastFedAt: "2026-06-07T00:00:00.000Z",
        lastSimAt: "2026-06-07T00:00:00.000Z",
        isAlive: true,
        diedAt: null,
      },
    ],
    petFeedsUsedToday: 0,
  };
}

describe("buildBackup", () => {
  it("stamps the markers and an injectable exportedAt time", () => {
    // Given a snapshot and a pinned clock
    const envelope = buildBackup(makeSnapshot(), new Date("2026-06-21T08:00:00.000Z"));
    // Then the envelope carries the Atomicly markers and that exact timestamp
    expect(envelope.app).toBe("atomicly");
    expect(envelope.schemaVersion).toBe(1);
    expect(envelope.exportedAt).toBe("2026-06-21T08:00:00.000Z");
  });

  it("represents every snapshot block in the envelope", () => {
    // Given a fully-populated snapshot
    const envelope = buildBackup(makeSnapshot());
    const { data } = envelope;
    // Then no data block is dropped on the way into the backup
    expect(data.habits).toHaveLength(1);
    expect(data.habits[0].history["2026-06-02"]).toEqual({ done: true, mood: 4, journal: "Good session" });
    expect(data.habits[0].notes).toHaveLength(1);
    expect(data.journal).toHaveLength(1);
    expect(data.identity).toEqual({ statement: "I am a reader", values: ["growth"] });
    expect(data.weeklyReviews).toHaveLength(1);
    expect(data.completedLessons).toEqual([1, 2, 3]);
    expect(data.formationVerdicts).toHaveLength(1);
    expect(data.preferences?.theme).toBe("dark");
    expect(data.pets).toHaveLength(1);
  });

  it("produces an envelope that passes the import contract (round-trip safe)", () => {
    // Given an exported envelope
    const envelope = buildBackup(makeSnapshot());
    // Then it re-validates against the same schema the importer enforces
    expect(backupEnvelopeSchema.safeParse(envelope).success).toBe(true);
  });

  it("handles a snapshot with no pets or weekly reviews", () => {
    // Given a snapshot missing the optional pet/weeklyReview blocks
    const snapshot = makeSnapshot();
    delete snapshot.pets;
    delete snapshot.weeklyReviews;
    // When we build the backup
    const envelope = buildBackup(snapshot);
    // Then those blocks become empty arrays rather than throwing
    expect(envelope.data.pets).toEqual([]);
    expect(envelope.data.weeklyReviews).toEqual([]);
  });
});
