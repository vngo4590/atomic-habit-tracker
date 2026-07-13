import { beforeEach, describe, expect, it, vi } from "vitest";

import { testHabit } from "@/lib/test/fixtures";

// ---------------------------------------------------------------------------
// Mocks — hoisted so they are available before any imports resolve.
// We do NOT mock @/lib/actions/domain so the real action code runs.
// ---------------------------------------------------------------------------
const mocks = vi.hoisted(() => ({
  requireUserId: vi.fn(),
  revalidatePath: vi.fn(),
  createHabit: vi.fn(),
  upsertCheckIn: vi.fn(),
  updateHabit: vi.fn(),
  archiveHabit: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/auth/session", () => ({ requireUserId: mocks.requireUserId }));
vi.mock("@/lib/repositories/habits", () => ({
  createHabit: mocks.createHabit,
  updateHabit: mocks.updateHabit,
  archiveHabit: mocks.archiveHabit,
  upsertCheckIn: mocks.upsertCheckIn,
}));
vi.mock("@/lib/repositories/reflection", () => ({
  createJournalEntry: vi.fn(),
  markLessonComplete: vi.fn(),
  saveFormationVerdict: vi.fn(),
  saveIdentity: vi.fn(),
  savePreferences: vi.fn(),
  saveWeeklyReview: vi.fn(),
  updateJournalEntry: vi.fn(),
}));

// ---------------------------------------------------------------------------
// createHabitAction — default field population and loop-field inheritance
// ---------------------------------------------------------------------------
describe("createHabitAction default field population", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();
    mocks.requireUserId.mockResolvedValue("user_1");
    mocks.createHabit.mockResolvedValue({ ok: true, habit: testHabit() });
  });

  it("sends emoji '•', schedule 'Daily', and time 'Morning' when draft only has name and identity", async () => {
    // Given: the smallest valid draft — only required fields
    const { createHabitAction } = await import("@/lib/actions/domain");

    // When: the action is called
    await createHabitAction({ name: "Meditate", identity: "meditator" });

    // Then: the repository receives the expected structural defaults
    expect(mocks.createHabit).toHaveBeenCalledWith(
      "user_1",
      expect.objectContaining({
        emoji: "•",
        schedule: "Daily",
        time: "Morning",
        cue: "",
        craving: "",
        reward: "",
      }),
    );
  });

  it("uses the habit name as the initial response text when response is absent from the draft", async () => {
    // Given: a draft without an explicit response field
    const { createHabitAction } = await import("@/lib/actions/domain");

    // When: the action is called
    await createHabitAction({ name: "Run", identity: "runner" });

    // Then: response defaults to the habit name so the action description is pre-populated
    expect(mocks.createHabit).toHaveBeenCalledWith(
      "user_1",
      expect.objectContaining({ response: "Run" }),
    );
  });

  it("propagates cue to loopCue when loopCue is absent from the draft", async () => {
    // Given: a draft that specifies a cue but no loop-level cue
    const { createHabitAction } = await import("@/lib/actions/domain");

    // When: the action is called
    await createHabitAction({ name: "Read", identity: "reader", cue: "After coffee" });

    // Then: loopCue inherits the cue so the habit-loop summary matches the 4-laws cue
    expect(mocks.createHabit).toHaveBeenCalledWith(
      "user_1",
      expect.objectContaining({ loopCue: "After coffee" }),
    );
  });

  it("respects an explicit loopCue that intentionally differs from cue", async () => {
    // Given: a draft where the loop-level cue is a more specific version of the 4-laws cue
    const { createHabitAction } = await import("@/lib/actions/domain");

    // When: both cue and loopCue are provided
    await createHabitAction({
      name: "Read",
      identity: "reader",
      cue: "After coffee",
      loopCue: "Coffee poured and book already open on the desk",
    });

    // Then: the explicit loopCue is preserved — it is not overwritten by the cue default
    expect(mocks.createHabit).toHaveBeenCalledWith(
      "user_1",
      expect.objectContaining({ loopCue: "Coffee poured and book already open on the desk" }),
    );
  });

  it("propagates craving, response, and reward into their loop-level equivalents", async () => {
    // Given: a full 4-laws draft with no explicit loop fields
    const { createHabitAction } = await import("@/lib/actions/domain");

    // When: the action is called
    await createHabitAction({
      name: "Run",
      identity: "runner",
      craving: "Feel energized",
      response: "Run one mile",
      reward: "Log the run",
    });

    // Then: each loop field inherits from its 4-laws counterpart
    expect(mocks.createHabit).toHaveBeenCalledWith(
      "user_1",
      expect.objectContaining({
        loopCraving: "Feel energized",
        loopResponse: "Run one mile",
        loopReward: "Log the run",
      }),
    );
  });

  it("revalidates all major app routes after successful habit creation", async () => {
    // Given: an authenticated user and a successful repository call
    const { createHabitAction } = await import("@/lib/actions/domain");

    // When: the action runs
    await createHabitAction({ name: "Read", identity: "reader" });

    // Then: every route that renders habit data is invalidated
    for (const route of ["/", "/habits", "/analytics", "/identity", "/hall-of-fame"]) {
      expect(mocks.revalidatePath).toHaveBeenCalledWith(route);
    }
  });

  it("does not call the repository when the session is missing", async () => {
    // Given: no authenticated user
    mocks.requireUserId.mockRejectedValue(new Error("redirect:/login"));
    const { createHabitAction } = await import("@/lib/actions/domain");

    // When: the action is called
    await expect(createHabitAction({ name: "Read", identity: "reader" })).rejects.toThrow("redirect:/login");

    // Then: the repository is never reached and no cache is invalidated
    expect(mocks.createHabit).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// logCheckInAction — selective field forwarding via hasOwnProperty guard
// ---------------------------------------------------------------------------
describe("logCheckInAction selective field forwarding", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();
    mocks.requireUserId.mockResolvedValue("user_1");
    mocks.upsertCheckIn.mockResolvedValue(testHabit());
  });

  it("forwards both mood and journal when both keys are present in the payload", async () => {
    // Given: a full check-in payload
    const { logCheckInAction } = await import("@/lib/actions/domain");

    // When: the action is called with mood and journal
    await logCheckInAction("habit_1", "2030-01-15", { mood: 4, journal: "Great session" });

    // Then: the repository receives both fields
    expect(mocks.upsertCheckIn).toHaveBeenCalledWith(
      "user_1",
      "habit_1",
      expect.objectContaining({ mood: 4, journal: "Great session" }),
    );
  });

  it("omits the journal key from the repository call when journal is absent from the payload", async () => {
    // Given: a payload that only contains mood — journal was never typed
    const { logCheckInAction } = await import("@/lib/actions/domain");

    // When: the action is called
    await logCheckInAction("habit_1", "2030-01-15", { mood: 3 });

    // Then: journal is not forwarded (not even as undefined)
    const call = mocks.upsertCheckIn.mock.calls[0][2] as Record<string, unknown>;
    expect(Object.prototype.hasOwnProperty.call(call, "journal")).toBe(false);
    expect(call.mood).toBe(3);
  });

  it("omits the mood key from the repository call when mood is absent from the payload", async () => {
    // Given: a payload with only a journal note
    const { logCheckInAction } = await import("@/lib/actions/domain");

    // When: the action is called
    await logCheckInAction("habit_1", "2030-01-15", { journal: "Reflection note" });

    // Then: mood is not forwarded
    const call = mocks.upsertCheckIn.mock.calls[0][2] as Record<string, unknown>;
    expect(Object.prototype.hasOwnProperty.call(call, "mood")).toBe(false);
    expect(call.journal).toBe("Reflection note");
  });

  it("forwards mood: null to the repository when the payload explicitly clears mood", async () => {
    // Given: a payload where mood is intentionally null (the user removed their rating)
    const { logCheckInAction } = await import("@/lib/actions/domain");

    // When: the action is called
    await logCheckInAction("habit_1", "2030-01-15", { mood: null });

    // Then: null is forwarded so the repository can clear the mood column
    expect(mocks.upsertCheckIn).toHaveBeenCalledWith(
      "user_1",
      "habit_1",
      expect.objectContaining({ mood: null }),
    );
  });

  it("forwards done: false and no extra fields when the payload only requests an un-completion", async () => {
    // Given: a payload that only marks the habit as not done
    const { logCheckInAction } = await import("@/lib/actions/domain");

    // When: the action is called
    await logCheckInAction("habit_1", "2030-01-15", { done: false });

    // Then: done: false is forwarded, no mood or journal keys are present
    const call = mocks.upsertCheckIn.mock.calls[0][2] as Record<string, unknown>;
    expect(call.done).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(call, "mood")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(call, "journal")).toBe(false);
  });
});
