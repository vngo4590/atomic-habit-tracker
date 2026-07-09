import { beforeEach, describe, expect, it, vi } from "vitest";

import { testHabit, testIdentity, testPreferences, testWeeklyReview } from "@/lib/test/fixtures";
import { jsonBody, jsonRequest } from "@/lib/test/http";

const mocks = vi.hoisted(() => ({
  session: null as null | { user: { id: string; name?: string | null; email?: string | null; image?: string | null } },
  auth: vi.fn(),
  findAuthUserById: vi.fn(),
  createHabit: vi.fn(),
  getHabit: vi.fn(),
  listHabits: vi.fn(),
  updateHabit: vi.fn(),
  upsertCheckIn: vi.fn(),
  saveContract: vi.fn(),
  createJournalEntry: vi.fn(),
  listJournalEntries: vi.fn(),
  getIdentity: vi.fn(),
  saveIdentity: vi.fn(),
  getWeeklyReview: vi.fn(),
  saveWeeklyReview: vi.fn(),
  getPreferences: vi.fn(),
  savePreferences: vi.fn(),
  listCompletedLessons: vi.fn(),
  markLessonComplete: vi.fn(),
  listFormationVerdicts: vi.fn(),
  saveFormationVerdict: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: mocks.auth,
}));

vi.mock("@/lib/repositories/users", () => ({
  findAuthUserById: mocks.findAuthUserById,
}));

vi.mock("@/lib/repositories/habits", () => ({
  createHabit: mocks.createHabit,
  getHabit: mocks.getHabit,
  listHabits: mocks.listHabits,
  saveContract: mocks.saveContract,
  updateHabit: mocks.updateHabit,
  upsertCheckIn: mocks.upsertCheckIn,
}));

vi.mock("@/lib/repositories/reflection", () => ({
  createJournalEntry: mocks.createJournalEntry,
  getIdentity: mocks.getIdentity,
  getPreferences: mocks.getPreferences,
  getWeeklyReview: mocks.getWeeklyReview,
  listCompletedLessons: mocks.listCompletedLessons,
  listFormationVerdicts: mocks.listFormationVerdicts,
  listJournalEntries: mocks.listJournalEntries,
  markLessonComplete: mocks.markLessonComplete,
  saveFormationVerdict: mocks.saveFormationVerdict,
  saveIdentity: mocks.saveIdentity,
  savePreferences: mocks.savePreferences,
  saveWeeklyReview: mocks.saveWeeklyReview,
}));

describe("API v1 route contracts", () => {
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

    [
      mocks.createHabit,
      mocks.getHabit,
      mocks.listHabits,
      mocks.updateHabit,
      mocks.upsertCheckIn,
      mocks.saveContract,
      mocks.createJournalEntry,
      mocks.listJournalEntries,
      mocks.getIdentity,
      mocks.saveIdentity,
      mocks.getWeeklyReview,
      mocks.saveWeeklyReview,
      mocks.getPreferences,
      mocks.savePreferences,
      mocks.listCompletedLessons,
      mocks.markLessonComplete,
      mocks.listFormationVerdicts,
      mocks.saveFormationVerdict,
    ].forEach((mock) => mock.mockReset());
  });

  it("returns session status without exposing private auth details", async () => {
    mocks.session = { user: { id: "user_1", name: "Ada", email: "ada@example.com", image: null } };
    const { GET } = await import("@/app/api/v1/session/route");

    const response = await GET();
    const json = await jsonBody(response);

    expect(response.status).toBe(200);
    expect(json).toEqual({
      ok: true,
      data: {
        authenticated: true,
        user: { id: "user_1", name: "Ada", email: "ada@example.com", image: null },
      },
    });
  });

  it("treats a JWT for a deleted database user as unauthenticated", async () => {
    mocks.session = { user: { id: "deleted_user" } };
    mocks.findAuthUserById.mockResolvedValue(null);
    const { GET } = await import("@/app/api/v1/habits/route");

    const response = await GET();
    const json = await jsonBody(response);

    expect(response.status).toBe(401);
    expect(json).toMatchObject({ ok: false, error: { code: "unauthenticated" } });
    expect(mocks.findAuthUserById).toHaveBeenCalledWith("deleted_user");
    expect(mocks.listHabits).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated habit requests", async () => {
    const { GET } = await import("@/app/api/v1/habits/route");

    const response = await GET();
    const json = await jsonBody(response);

    expect(response.status).toBe(401);
    expect(json).toMatchObject({ ok: false, error: { code: "unauthenticated" } });
    expect(mocks.listHabits).not.toHaveBeenCalled();
  });

  it("uses shared validation for invalid habit creation", async () => {
    mocks.session = { user: { id: "user_1" } };
    const { POST } = await import("@/app/api/v1/habits/route");

    const response = await POST(jsonRequest("https://atomicly.test/api/v1/habits", { name: "", identity: "reader" }));
    const json = await jsonBody(response);

    expect(response.status).toBe(422);
    expect(json).toMatchObject({ ok: false, error: { code: "validation_failed" } });
    expect(mocks.createHabit).not.toHaveBeenCalled();
  });

  it("returns not found for cross-user habit access", async () => {
    mocks.session = { user: { id: "user_1" } };
    mocks.getHabit.mockResolvedValue(null);
    const { GET } = await import("@/app/api/v1/habits/[id]/route");

    const response = await GET(new Request("https://atomicly.test/api/v1/habits/habit_2"), {
      params: Promise.resolve({ id: "habit_2" }),
    });
    const json = await jsonBody(response);

    expect(response.status).toBe(404);
    expect(json).toMatchObject({ ok: false, error: { code: "not_found" } });
    expect(mocks.getHabit).toHaveBeenCalledWith("user_1", "habit_2");
  });

  it("lists and creates habits with stable success envelopes", async () => {
    mocks.session = { user: { id: "user_1" } };
    mocks.listHabits.mockResolvedValue([testHabit({ id: "habit_1" })]);
    mocks.createHabit.mockResolvedValue({ ok: true, habit: testHabit({ id: "habit_2", name: "Write" }) });
    const { GET, POST } = await import("@/app/api/v1/habits/route");

    const listResponse = await GET();
    const createResponse = await POST(jsonRequest("https://atomicly.test/api/v1/habits", { name: "Write", identity: "writer" }));

    expect(listResponse.status).toBe(200);
    await expect(jsonBody(listResponse)).resolves.toMatchObject({ ok: true, data: { habits: [{ id: "habit_1" }] } });
    expect(createResponse.status).toBe(201);
    await expect(jsonBody(createResponse)).resolves.toMatchObject({ ok: true, data: { habit: { id: "habit_2", name: "Write" } } });
    expect(mocks.listHabits).toHaveBeenCalledWith("user_1");
    expect(mocks.createHabit).toHaveBeenCalledWith("user_1", expect.objectContaining({ name: "Write", identity: "writer" }));
  });

  it("returns 409 when creating a habit is refused by the active-habit cap", async () => {
    mocks.session = { user: { id: "user_1" } };
    // The repository refuses the create with the discriminated cap result.
    mocks.createHabit.mockResolvedValue({ ok: false, reason: "cap" });
    const { POST } = await import("@/app/api/v1/habits/route");

    const response = await POST(jsonRequest("https://atomicly.test/api/v1/habits", { name: "Fourth", identity: "doer" }));

    expect(response.status).toBe(409);
    await expect(jsonBody(response)).resolves.toMatchObject({ ok: false, error: { code: "habit_cap_reached" } });
  });

  it("updates habit check-ins, notes, and contracts through nested route handlers", async () => {
    mocks.session = { user: { id: "user_1" } };
    mocks.upsertCheckIn.mockResolvedValue(testHabit({ id: "habit_1" }));
    mocks.updateHabit.mockResolvedValue(testHabit({ id: "habit_1", notes: [{ id: "note_1", body: "Keep visible", createdAt: "2030-01-02" }] }));
    mocks.saveContract.mockResolvedValue(testHabit({ id: "habit_1", contract: "Pay $5", contractPartners: ["Ada"] }));
    const checkIns = await import("@/app/api/v1/habits/[id]/check-ins/route");
    const notes = await import("@/app/api/v1/habits/[id]/notes/route");
    const contract = await import("@/app/api/v1/habits/[id]/contract/route");
    const context = { params: Promise.resolve({ id: "habit_1" }) };

    await expect(jsonBody(await checkIns.POST(jsonRequest("https://atomicly.test/api/v1/habits/habit_1/check-ins", { dateKey: "2030-01-02", done: true, mood: 5 }), context))).resolves.toMatchObject({ ok: true });
    await expect(jsonBody(await notes.PUT(jsonRequest("https://atomicly.test/api/v1/habits/habit_1/notes", { notes: [{ id: "note_1", body: "Keep visible", createdAt: "2030-01-02" }] }, { method: "PUT" }), context))).resolves.toMatchObject({ ok: true });
    await expect(jsonBody(await contract.PUT(jsonRequest("https://atomicly.test/api/v1/habits/habit_1/contract", { terms: "Pay $5", partners: ["Ada"] }, { method: "PUT" }), context))).resolves.toMatchObject({ ok: true });

    expect(mocks.upsertCheckIn).toHaveBeenCalledWith("user_1", "habit_1", expect.objectContaining({ dateKey: "2030-01-02" }));
    expect(mocks.updateHabit).toHaveBeenCalledWith("user_1", "habit_1", expect.objectContaining({ notes: expect.any(Array) }));
    expect(mocks.saveContract).toHaveBeenCalledWith("user_1", "habit_1", { terms: "Pay $5", partners: ["Ada"] });
  });

  it("returns validation and not-found envelopes for nested habit writes", async () => {
    mocks.session = { user: { id: "user_1" } };
    mocks.upsertCheckIn.mockResolvedValue(null);
    const { POST } = await import("@/app/api/v1/habits/[id]/check-ins/route");

    const invalid = await POST(jsonRequest("https://atomicly.test/api/v1/habits/habit_1/check-ins", { dateKey: "bad" }), {
      params: Promise.resolve({ id: "habit_1" }),
    });
    expect(invalid.status).toBe(422);
    await expect(jsonBody(invalid)).resolves.toMatchObject({ ok: false, error: { code: "validation_failed" } });

    const missing = await POST(jsonRequest("https://atomicly.test/api/v1/habits/habit_1/check-ins", { dateKey: "2030-01-02", done: true }), {
      params: Promise.resolve({ id: "habit_1" }),
    });
    expect(missing.status).toBe(404);
    await expect(jsonBody(missing)).resolves.toMatchObject({ ok: false, error: { code: "not_found" } });
  });

  it("creates journal entries without React client state", async () => {
    mocks.session = { user: { id: "user_1" } };
    mocks.createJournalEntry.mockResolvedValue({ id: "entry_1", date: "2026-04-30", title: "Win" });
    const { POST } = await import("@/app/api/v1/reflection/journal/route");

    const response = await POST(jsonRequest("https://atomicly.test/api/v1/reflection/journal", { dateKey: "2026-04-30", title: "Win" }));
    const json = await jsonBody(response);

    expect(response.status).toBe(201);
    expect(json).toMatchObject({ ok: true, data: { entry: { id: "entry_1" } } });
    expect(mocks.createJournalEntry).toHaveBeenCalledWith(
      "user_1",
      expect.objectContaining({ dateKey: "2026-04-30", title: "Win" }),
    );
  });

  it("handles lesson progress and lesson mode without React state", async () => {
    mocks.session = { user: { id: "user_1" } };
    mocks.listCompletedLessons.mockResolvedValue([1, 2]);
    mocks.getPreferences.mockResolvedValue(testPreferences({ lessonMode: "sequential" }));
    mocks.markLessonComplete.mockResolvedValue([1, 2, 3]);
    mocks.savePreferences.mockResolvedValue(testPreferences({ lessonMode: "random" }));
    const { GET, POST } = await import("@/app/api/v1/reflection/lessons/route");

    await expect(jsonBody(await GET())).resolves.toMatchObject({ ok: true, data: { completedLessonIds: [1, 2], mode: "sequential" } });
    await expect(jsonBody(await POST(jsonRequest("https://atomicly.test/api/v1/reflection/lessons", { lessonId: 3 })))).resolves.toMatchObject({ ok: true, data: { completedLessonIds: [1, 2, 3] } });
    await expect(jsonBody(await POST(jsonRequest("https://atomicly.test/api/v1/reflection/lessons", { lessonMode: "random" })))).resolves.toMatchObject({ ok: true, data: { mode: "random" } });

    expect(mocks.markLessonComplete).toHaveBeenCalledWith("user_1", 3);
    expect(mocks.savePreferences).toHaveBeenCalledWith("user_1", { lessonMode: "random" });
  });

  it("handles identity, preferences, weekly review, and formation verdict reflection routes", async () => {
    mocks.session = { user: { id: "user_1" } };
    mocks.saveIdentity.mockResolvedValue(testIdentity({ statement: "I show up" }));
    mocks.savePreferences.mockResolvedValue(testPreferences({ theme: "dark" }));
    mocks.getWeeklyReview.mockResolvedValue(testWeeklyReview({ weekStartKey: "2030-01-01" }));
    mocks.saveWeeklyReview.mockResolvedValue(testWeeklyReview({ weekStartKey: "2030-01-01" }));
    mocks.saveFormationVerdict.mockResolvedValue({ habitId: "habit_1", formed: true });
    const identity = await import("@/app/api/v1/reflection/identity/route");
    const preferences = await import("@/app/api/v1/reflection/preferences/route");
    const weekly = await import("@/app/api/v1/reflection/weekly-review/route");
    const verdicts = await import("@/app/api/v1/reflection/formation-verdicts/route");

    await expect(jsonBody(await identity.PUT(jsonRequest("https://atomicly.test/api/v1/reflection/identity", { statement: "I show up", values: [] }, { method: "PUT" })))).resolves.toMatchObject({ ok: true, data: { identity: { statement: "I show up" } } });
    await expect(jsonBody(await preferences.PATCH(jsonRequest("https://atomicly.test/api/v1/reflection/preferences", { theme: "dark" }, { method: "PATCH" })))).resolves.toMatchObject({ ok: true, data: { preferences: { theme: "dark" } } });
    await expect(jsonBody(await weekly.GET(new Request("https://atomicly.test/api/v1/reflection/weekly-review?weekStartKey=2030-01-01")))).resolves.toMatchObject({ ok: true, data: { review: { weekStartKey: "2030-01-01" } } });
    await expect(jsonBody(await weekly.PUT(jsonRequest("https://atomicly.test/api/v1/reflection/weekly-review", { weekStartKey: "2030-01-01", wentWell: "A", smallestFix: "B", identityVote: "C" }, { method: "PUT" })))).resolves.toMatchObject({ ok: true });
    await expect(jsonBody(await verdicts.POST(jsonRequest("https://atomicly.test/api/v1/reflection/formation-verdicts", { habitId: "habit_1", score: 4, formed: true })))).resolves.toMatchObject({ ok: true, data: { verdict: { habitId: "habit_1" } } });
  });

  it("rejects missing weekly review query params before repository reads", async () => {
    mocks.session = { user: { id: "user_1" } };
    const { GET } = await import("@/app/api/v1/reflection/weekly-review/route");

    const response = await GET(new Request("https://atomicly.test/api/v1/reflection/weekly-review"));

    expect(response.status).toBe(422);
    await expect(jsonBody(response)).resolves.toMatchObject({ ok: false, error: { code: "validation_failed" } });
    expect(mocks.getWeeklyReview).not.toHaveBeenCalled();
  });
});
