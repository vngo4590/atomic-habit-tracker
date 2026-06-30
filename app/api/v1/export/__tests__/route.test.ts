import { beforeEach, describe, expect, it, vi } from "vitest";

import { testHabit, testIdentity, testPreferences } from "@/lib/test/fixtures";
import type { StoreSnapshot } from "@/lib/types";

/**
 * Tests for the GET /api/v1/export backup endpoint. We mock the auth boundary
 * and the snapshot repository so the test exercises the real route handler +
 * pure builder without a database.
 */
const mocks = vi.hoisted(() => ({
  session: null as null | { user: { id: string } },
  auth: vi.fn(),
  findAuthUserById: vi.fn(),
  getStoreSnapshot: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));

vi.mock("@/lib/repositories/users", () => ({ findAuthUserById: mocks.findAuthUserById }));

vi.mock("@/lib/repositories/reflection", () => ({ getStoreSnapshot: mocks.getStoreSnapshot }));

function snapshot(): StoreSnapshot {
  return {
    habits: [testHabit({ id: "h1", name: "Read" })],
    journal: [{ id: "j1", date: "2026-06-02", title: "Win", body: "", mood: "good", tags: [] }],
    identity: testIdentity(),
    weeklyReview: { wentWell: "", smallestFix: "", identityVote: "" },
    weeklyReviews: [],
    completedLessons: [1],
    formationVerdicts: [],
    preferences: testPreferences(),
    pets: [],
    petFeedsUsedToday: 0,
  };
}

describe("GET /api/v1/export", () => {
  beforeEach(() => {
    mocks.session = null;
    mocks.auth.mockImplementation(async () => mocks.session);
    mocks.findAuthUserById.mockReset();
    mocks.findAuthUserById.mockImplementation(async (id: string) => ({
      id,
      name: "Ada",
      email: "ada@example.com",
      image: null,
      passwordHash: "hash",
    }));
    mocks.getStoreSnapshot.mockReset();
  });

  it("rejects unauthenticated export requests before reading data", async () => {
    // Given no session
    const { GET } = await import("@/app/api/v1/export/route");

    // When an anonymous caller hits the endpoint
    const response = await GET();

    // Then it is refused and the database is never touched
    expect(response.status).toBe(401);
    expect(mocks.getStoreSnapshot).not.toHaveBeenCalled();
  });

  it("returns a downloadable versioned backup for an authenticated user", async () => {
    // Given an authenticated user with some data
    mocks.session = { user: { id: "user_1" } };
    mocks.getStoreSnapshot.mockResolvedValue(snapshot());
    const { GET } = await import("@/app/api/v1/export/route");

    // When they request an export
    const response = await GET();
    const body = JSON.parse(await response.text());

    // Then they get an attachment carrying the full, marked backup envelope
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Disposition")).toContain("attachment");
    expect(response.headers.get("Content-Disposition")).toContain("atomicly-backup-");
    expect(body.app).toBe("atomicly");
    expect(body.schemaVersion).toBe(1);
    expect(body.data.habits).toHaveLength(1);
    expect(body.data.journal).toHaveLength(1);
    expect(mocks.getStoreSnapshot).toHaveBeenCalledWith("user_1", expect.any(String));
  });
});
