import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  session: null as null | { user: { id: string; name?: string | null; email?: string | null; image?: string | null } },
  auth: vi.fn(),
  createHabit: vi.fn(),
  getHabit: vi.fn(),
  listHabits: vi.fn(),
  createJournalEntry: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: mocks.auth,
}));

vi.mock("@/lib/repositories/habits", () => ({
  createHabit: mocks.createHabit,
  getHabit: mocks.getHabit,
  listHabits: mocks.listHabits,
}));

vi.mock("@/lib/repositories/reflection", () => ({
  createJournalEntry: mocks.createJournalEntry,
}));

async function body(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

describe("API v1 route contracts", () => {
  beforeEach(() => {
    mocks.session = null;
    mocks.auth.mockImplementation(async () => mocks.session);
    mocks.createHabit.mockReset();
    mocks.getHabit.mockReset();
    mocks.listHabits.mockReset();
    mocks.createJournalEntry.mockReset();
  });

  it("returns session status without exposing private auth details", async () => {
    mocks.session = { user: { id: "user_1", name: "Ada", email: "ada@example.com", image: null } };
    const { GET } = await import("@/app/api/v1/session/route");

    const response = await GET();
    const json = await body(response);

    expect(response.status).toBe(200);
    expect(json).toEqual({
      ok: true,
      data: {
        authenticated: true,
        user: { id: "user_1", name: "Ada", email: "ada@example.com", image: null },
      },
    });
  });

  it("rejects unauthenticated habit requests", async () => {
    const { GET } = await import("@/app/api/v1/habits/route");

    const response = await GET();
    const json = await body(response);

    expect(response.status).toBe(401);
    expect(json).toMatchObject({ ok: false, error: { code: "unauthenticated" } });
    expect(mocks.listHabits).not.toHaveBeenCalled();
  });

  it("uses shared validation for invalid habit creation", async () => {
    mocks.session = { user: { id: "user_1" } };
    const { POST } = await import("@/app/api/v1/habits/route");

    const response = await POST(
      new Request("https://atomicly.test/api/v1/habits", {
        method: "POST",
        body: JSON.stringify({ name: "", identity: "reader" }),
      }),
    );
    const json = await body(response);

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
    const json = await body(response);

    expect(response.status).toBe(404);
    expect(json).toMatchObject({ ok: false, error: { code: "not_found" } });
    expect(mocks.getHabit).toHaveBeenCalledWith("user_1", "habit_2");
  });

  it("creates journal entries without React client state", async () => {
    mocks.session = { user: { id: "user_1" } };
    mocks.createJournalEntry.mockResolvedValue({ id: "entry_1", date: "2026-04-30", title: "Win" });
    const { POST } = await import("@/app/api/v1/reflection/journal/route");

    const response = await POST(
      new Request("https://atomicly.test/api/v1/reflection/journal", {
        method: "POST",
        body: JSON.stringify({ dateKey: "2026-04-30", title: "Win" }),
      }),
    );
    const json = await body(response);

    expect(response.status).toBe(201);
    expect(json).toMatchObject({ ok: true, data: { entry: { id: "entry_1" } } });
    expect(mocks.createJournalEntry).toHaveBeenCalledWith(
      "user_1",
      expect.objectContaining({ dateKey: "2026-04-30", title: "Win" }),
    );
  });
});
