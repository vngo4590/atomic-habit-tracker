import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { habitCreateSchema } from "@/lib/contracts/domain";
import { createHabitAction } from "@/lib/actions/domain";
import { testHabit } from "@/lib/test/fixtures";
import { useStore } from "@/lib/store";

// ---------------------------------------------------------------------------
// Mocks — store tests need createHabitAction mocked so renderHook stays
// deterministic; schema tests are pure and don't need mocks at all.
// ---------------------------------------------------------------------------
vi.mock("@/lib/actions/domain", () => ({
  createHabitAction: vi.fn(),
  createJournalEntryAction: vi.fn(),
  deleteHabitAction: vi.fn(),
  logCheckInAction: vi.fn(async () => null),
  markLessonReadAction: vi.fn(),
  saveFormationVerdictAction: vi.fn(),
  saveIdentityAction: vi.fn(async (identity: unknown) => identity),
  savePreferencesAction: vi.fn(),
  saveWeeklyReviewAction: vi.fn(),
  toggleHabitAction: vi.fn(async () => null),
  updateHabitAction: vi.fn(async () => null),
  updateJournalEntryAction: vi.fn(async () => null),
}));

// ---------------------------------------------------------------------------
// Helper: minimal StoreSnapshot for renderHook
// ---------------------------------------------------------------------------
function makeSnapshot(habits = [testHabit()]) {
  return {
    habits,
    journal: [],
    identity: { statement: "", values: [] },
    weeklyReview: { wentWell: "", smallestFix: "", identityVote: "" },
    weeklyReviews: [],
    completedLessons: [],
    formationVerdicts: [],
    preferences: {
      theme: "light" as const,
      accentHue: 60,
      remindersEnabled: true,
      weeklyReviewNudge: true,
      accountabilityNudge: false,
      onboardingSeen: false,
      lessonMode: "sequential" as const,
      timezone: "UTC",
    },
  };
}

// ---------------------------------------------------------------------------
// habitCreateSchema — field length boundaries and whitespace trimming
// ---------------------------------------------------------------------------
describe("habitCreateSchema boundary validation", () => {
  it("accepts a name at exactly 120 characters and rejects one at 121", () => {
    // Given: names right at and just over the limit
    const at120 = "a".repeat(120);
    const at121 = "a".repeat(121);

    // When + Then: boundary is enforced
    expect(habitCreateSchema.safeParse({ name: at120, identity: "runner" }).success).toBe(true);
    expect(habitCreateSchema.safeParse({ name: at121, identity: "runner" }).success).toBe(false);
  });

  it("accepts an identity at exactly 120 characters and rejects one at 121", () => {
    // Given: identity values at and over the limit
    const at120 = "I ".padEnd(120, "x");
    const at121 = "I ".padEnd(121, "x");

    // When + Then
    expect(habitCreateSchema.safeParse({ name: "Run", identity: at120 }).success).toBe(true);
    expect(habitCreateSchema.safeParse({ name: "Run", identity: at121 }).success).toBe(false);
  });

  it("accepts text fields at 500 characters and rejects at 501", () => {
    // Given: cue values at and just over the per-field limit
    const at500 = "x".repeat(500);
    const at501 = "x".repeat(501);

    // When + Then: the same 500-char ceiling applies to cue, craving, response, etc.
    expect(habitCreateSchema.safeParse({ name: "Run", identity: "runner", cue: at500 }).success).toBe(true);
    expect(habitCreateSchema.safeParse({ name: "Run", identity: "runner", cue: at501 }).success).toBe(false);
  });

  it("accepts an emoji at 12 characters and rejects at 13", () => {
    // Given: emoji strings right at and over the limit
    const at12 = "x".repeat(12);
    const at13 = "x".repeat(13);

    // When + Then
    expect(habitCreateSchema.safeParse({ name: "Run", identity: "runner", emoji: at12 }).success).toBe(true);
    expect(habitCreateSchema.safeParse({ name: "Run", identity: "runner", emoji: at13 }).success).toBe(false);
  });

  it("accepts a contract at 1000 characters and rejects at 1001", () => {
    // Given: contract text at and over the limit
    const at1000 = "x".repeat(1000);
    const at1001 = "x".repeat(1001);

    // When + Then
    expect(habitCreateSchema.safeParse({ name: "Run", identity: "runner", contract: at1000 }).success).toBe(true);
    expect(habitCreateSchema.safeParse({ name: "Run", identity: "runner", contract: at1001 }).success).toBe(false);
  });

  it("rejects contractPartners containing empty or whitespace-only entries", () => {
    // Given: partner lists with blank entries that carry no information
    const withEmpty = { name: "Run", identity: "runner", contractPartners: [""] };
    const withWhitespace = { name: "Run", identity: "runner", contractPartners: ["   "] };
    const valid = { name: "Run", identity: "runner", contractPartners: ["Ada"] };

    // When + Then: blank entries fail; a real name passes
    expect(habitCreateSchema.safeParse(withEmpty).success).toBe(false);
    expect(habitCreateSchema.safeParse(withWhitespace).success).toBe(false);
    expect(habitCreateSchema.safeParse(valid).success).toBe(true);
  });

  it("trims leading and trailing whitespace from name and identity", () => {
    // Given: user-typed strings with extra surrounding spaces
    const input = { name: "  Run  ", identity: "  runner  " };

    // When: the schema parses the input
    const result = habitCreateSchema.parse(input);

    // Then: both fields are stripped to their core text
    expect(result.name).toBe("Run");
    expect(result.identity).toBe("runner");
  });

  it("rejects a name that trims to an empty string", () => {
    // Given: a name that appears non-empty but contains only whitespace
    const input = { name: "   ", identity: "runner" };

    // When + Then: required min-length check fires after trimming
    expect(habitCreateSchema.safeParse(input).success).toBe(false);
  });

  it("applies default values for optional fields when they are absent from the draft", () => {
    // Given: a minimal draft with only required fields
    const input = { name: "Meditate", identity: "meditator" };

    // When: the schema parses the draft
    const result = habitCreateSchema.parse(input);

    // Then: sensible defaults are applied for all omitted fields
    expect(result.emoji).toBe("•");
    expect(result.schedule).toBe("Daily");
    expect(result.time).toBe("Morning");
    expect(result.cue).toBe("");
    expect(result.contractPartners).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// addHabit — store optimistic behavior
// ---------------------------------------------------------------------------
describe("addHabit store optimistic behavior", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.mocked(createHabitAction).mockReset();
  });

  it("appends the habit to the store immediately with a pending ID before the server responds", async () => {
    // Given: a controlled promise so we can verify the pre-resolve state
    let resolveCreate!: (result: { ok: true; habit: ReturnType<typeof testHabit> }) => void;
    vi.mocked(createHabitAction).mockReturnValueOnce(
      new Promise((resolve) => { resolveCreate = resolve; }),
    );

    const { result } = renderHook(() => useStore(makeSnapshot([])));

    // When: addHabit is called
    act(() => result.current.addHabit({ name: "Meditate", identity: "meditator" }));

    // Then: the habit is immediately visible in the store with a temporary pending ID
    expect(result.current.habits).toHaveLength(1);
    expect(result.current.habits[0].id).toMatch(/^pending-/);
    expect(result.current.habits[0].name).toBe("Meditate");

    // Cleanup — resolve so we don't leave a dangling promise
    resolveCreate({ ok: true, habit: testHabit({ id: "server_1", name: "Meditate" }) });
    await act(async () => { await Promise.resolve(); });
  });

  it("replaces the pending entry with the server-assigned ID once the action resolves", async () => {
    // Given: a server response that arrives after the optimistic add
    const saved = testHabit({ id: "server_42", name: "Meditate" });
    let resolveCreate!: (result: { ok: true; habit: typeof saved }) => void;
    vi.mocked(createHabitAction).mockReturnValueOnce(
      new Promise((resolve) => { resolveCreate = resolve; }),
    );

    const { result } = renderHook(() => useStore(makeSnapshot([])));
    act(() => result.current.addHabit({ name: "Meditate", identity: "meditator" }));

    // When: the server action resolves with the persisted record
    await act(async () => {
      resolveCreate({ ok: true, habit: saved });
      await Promise.resolve();
    });

    // Then: the pending entry is gone; the server-assigned ID is in place
    expect(result.current.habits).toHaveLength(1);
    expect(result.current.habits[0].id).toBe("server_42");
    expect(result.current.habits.some((h) => h.id.startsWith("pending-"))).toBe(false);
  });

  it("rolls back the optimistic add and shows a Toast when the server refuses with the cap reason", async () => {
    // Given: a server that refuses the create because the active-habit cap is hit
    let resolveCreate!: (result: { ok: false; reason: "cap" }) => void;
    vi.mocked(createHabitAction).mockReturnValueOnce(
      new Promise((resolve) => { resolveCreate = resolve; }),
    );

    const { result } = renderHook(() => useStore(makeSnapshot([])));
    act(() => result.current.addHabit({ name: "Fourth", identity: "doer" }));

    // The optimistic entry is present before the server responds.
    expect(result.current.habits).toHaveLength(1);

    // When: the server returns a cap refusal
    await act(async () => {
      resolveCreate({ ok: false, reason: "cap" });
      await Promise.resolve();
    });

    // Then: the optimistic entry is rolled back and an explanatory Toast is shown
    expect(result.current.habits).toHaveLength(0);
    expect(result.current.toast?.msg).toBe("Couldn't create habit");
    expect(result.current.toast?.sub).toMatch(/active habits/i);
  });

  it("populates loopCue from cue in the optimistic entry when loopCue is absent from the draft", () => {
    // Given: a server promise that won't resolve during this test
    vi.mocked(createHabitAction).mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useStore(makeSnapshot([])));

    // When: addHabit is called with a cue but no explicit loopCue
    act(() => result.current.addHabit({ name: "Read", identity: "reader", cue: "After coffee" }));

    // Then: the optimistic entry inherits loopCue from the cue field
    expect(result.current.habits[0].loopCue).toBe("After coffee");
  });

  it("uses Daily and Morning as default schedule and time in the optimistic entry", () => {
    // Given: a minimal draft with no schedule or time
    vi.mocked(createHabitAction).mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useStore(makeSnapshot([])));

    // When: addHabit is called without scheduling fields
    act(() => result.current.addHabit({ name: "Run", identity: "runner" }));

    // Then: the optimistic entry uses the standard defaults
    expect(result.current.habits[0].schedule).toBe("Daily");
    expect(result.current.habits[0].time).toBe("Morning");
  });

  it("adds the habit to existing habits rather than replacing the list", () => {
    // Given: a store that already has one habit
    vi.mocked(createHabitAction).mockReturnValue(new Promise(() => {}));
    const existing = testHabit({ id: "existing_1", name: "Walk" });
    const { result } = renderHook(() => useStore(makeSnapshot([existing])));

    // When: a second habit is added
    act(() => result.current.addHabit({ name: "Run", identity: "runner" }));

    // Then: both habits are present in the store
    expect(result.current.habits).toHaveLength(2);
    expect(result.current.habits.some((h) => h.id === "existing_1")).toBe(true);
  });
});
