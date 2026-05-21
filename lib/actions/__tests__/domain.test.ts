import { beforeEach, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";

import { testFormationVerdict, testHabit, testIdentity, testJournalEntry, testPreferences, testWeeklyReview } from "@/lib/test/fixtures";

const mocks = vi.hoisted(() => ({
  requireUserId: vi.fn(),
  revalidatePath: vi.fn(),
  createHabit: vi.fn(),
  updateHabit: vi.fn(),
  archiveHabit: vi.fn(),
  upsertCheckIn: vi.fn(),
  getHabit: vi.fn(),
  createJournalEntry: vi.fn(),
  updateJournalEntry: vi.fn(),
  saveWeeklyReview: vi.fn(),
  saveIdentity: vi.fn(),
  markLessonComplete: vi.fn(),
  saveFormationVerdictRecord: vi.fn(),
  savePreferences: vi.fn(),
  dbHabitFindUnique: vi.fn(),
  dbHabitFindFirst: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/lib/auth/session", () => ({
  requireUserId: mocks.requireUserId,
}));

vi.mock("@/lib/repositories/habits", () => ({
  createHabit: mocks.createHabit,
  updateHabit: mocks.updateHabit,
  archiveHabit: mocks.archiveHabit,
  upsertCheckIn: mocks.upsertCheckIn,
  getHabit: mocks.getHabit,
}));

vi.mock("@/lib/db/client", () => ({
  db: {
    habit: {
      findUnique: mocks.dbHabitFindUnique,
      findFirst: mocks.dbHabitFindFirst,
    },
  },
}));

vi.mock("@/lib/repositories/reflection", () => ({
  createJournalEntry: mocks.createJournalEntry,
  markLessonComplete: mocks.markLessonComplete,
  saveFormationVerdict: mocks.saveFormationVerdictRecord,
  saveIdentity: mocks.saveIdentity,
  savePreferences: mocks.savePreferences,
  saveWeeklyReview: mocks.saveWeeklyReview,
  updateJournalEntry: mocks.updateJournalEntry,
}));

describe("domain server actions", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) {
      mock.mockReset();
    }
    mocks.requireUserId.mockResolvedValue("user_1");
  });

  it("creates habits for the authenticated user and revalidates app paths", async () => {
    const habit = testHabit({ id: "habit_new", name: "Read" });
    mocks.createHabit.mockResolvedValue(habit);
    const { createHabitAction } = await import("@/lib/actions/domain");

    await expect(createHabitAction({ name: "Read", identity: "reader", cue: "After coffee" })).resolves.toEqual(habit);

    expect(mocks.createHabit).toHaveBeenCalledWith("user_1", expect.objectContaining({
      name: "Read",
      identity: "reader",
      cue: "After coffee",
      emoji: "•",
      schedule: "Daily",
    }));
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/habits");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/settings");
  });

  it("updates, archives, and toggles habits through user-scoped repository calls", async () => {
    const habit = testHabit({ id: "habit_1", name: "Updated" });
    mocks.updateHabit.mockResolvedValue(habit);
    mocks.archiveHabit.mockResolvedValue(habit);
    mocks.upsertCheckIn.mockResolvedValue(habit);
    const { deleteHabitAction, logCheckInAction, toggleHabitAction, updateHabitAction } = await import("@/lib/actions/domain");

    await expect(updateHabitAction("habit_1", { name: "Updated" })).resolves.toEqual(habit);
    await expect(deleteHabitAction("habit_1")).resolves.toEqual(habit);
    await expect(toggleHabitAction("habit_1", "2030-01-02", true)).resolves.toEqual(habit);
    await expect(logCheckInAction("habit_1", "2030-01-02", { mood: 5, journal: "Good" })).resolves.toEqual(habit);

    expect(mocks.updateHabit).toHaveBeenCalledWith("user_1", "habit_1", { name: "Updated" });
    expect(mocks.archiveHabit).toHaveBeenCalledWith("user_1", "habit_1");
    expect(mocks.upsertCheckIn).toHaveBeenCalledWith("user_1", "habit_1", { dateKey: "2030-01-02", done: true });
    expect(mocks.upsertCheckIn).toHaveBeenCalledWith("user_1", "habit_1", {
      dateKey: "2030-01-02",
      done: true,
      mood: 5,
      journal: "Good",
    });
  });

  it("persists journal and weekly review actions and revalidates their routes", async () => {
    const entry = testJournalEntry({ id: "journal_1" });
    const review = testWeeklyReview();
    mocks.createJournalEntry.mockResolvedValue(entry);
    mocks.updateJournalEntry.mockResolvedValue({ ...entry, title: "Edited" });
    mocks.saveWeeklyReview.mockResolvedValue(review);
    const { createJournalEntryAction, saveWeeklyReviewAction, updateJournalEntryAction } = await import("@/lib/actions/domain");

    await expect(createJournalEntryAction({ date: "2030-01-02", title: "Small win" })).resolves.toEqual(entry);
    await expect(updateJournalEntryAction("journal_1", { title: "Edited" })).resolves.toMatchObject({ title: "Edited" });
    await expect(saveWeeklyReviewAction("2030-01-01", {
      wentWell: "A",
      smallestFix: "B",
      identityVote: "C",
    })).resolves.toEqual(review);

    expect(mocks.createJournalEntry).toHaveBeenCalledWith("user_1", expect.objectContaining({ dateKey: "2030-01-02" }));
    expect(mocks.updateJournalEntry).toHaveBeenCalledWith("user_1", "journal_1", { title: "Edited" });
    expect(mocks.saveWeeklyReview).toHaveBeenCalledWith("user_1", expect.objectContaining({ weekStartKey: "2030-01-01" }));
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/journal");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/review");
  });

  it("persists identity, preferences, lessons, and formation verdicts through user-scoped repositories", async () => {
    mocks.saveIdentity.mockResolvedValue(testIdentity());
    mocks.savePreferences.mockResolvedValue(testPreferences({ lessonMode: "random" }));
    mocks.markLessonComplete.mockResolvedValue([1, 2, 3]);
    mocks.saveFormationVerdictRecord.mockResolvedValue(testFormationVerdict());
    const { markLessonReadAction, saveFormationVerdictAction, saveIdentityAction, savePreferencesAction } = await import("@/lib/actions/domain");

    await expect(saveIdentityAction(testIdentity({ statement: "I show up" }))).resolves.toMatchObject({ statement: "I am someone who keeps promises to myself." });
    await expect(savePreferencesAction({ lessonMode: "random" })).resolves.toMatchObject({ lessonMode: "random" });
    await expect(markLessonReadAction(3)).resolves.toEqual([1, 2, 3]);
    await expect(saveFormationVerdictAction(testFormationVerdict())).resolves.toMatchObject({ habitId: "habit_1" });

    expect(mocks.saveIdentity).toHaveBeenCalledWith("user_1", expect.objectContaining({ statement: "I show up" }));
    expect(mocks.savePreferences).toHaveBeenCalledWith("user_1", { lessonMode: "random" });
    expect(mocks.markLessonComplete).toHaveBeenCalledWith("user_1", 3);
    expect(mocks.saveFormationVerdictRecord).toHaveBeenCalledWith("user_1", expect.objectContaining({ habitId: "habit_1" }));
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/lessons");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/hall-of-fame");
  });

  it("does not revalidate when repository validation fails", async () => {
    mocks.createHabit.mockRejectedValue(new ZodError([]));
    const { createHabitAction } = await import("@/lib/actions/domain");

    await expect(createHabitAction({ name: "", identity: "reader" })).rejects.toBeInstanceOf(ZodError);

    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated actions before repository writes", async () => {
    mocks.requireUserId.mockRejectedValue(new Error("redirect:/login"));
    const { createHabitAction, markLessonReadAction } = await import("@/lib/actions/domain");

    await expect(createHabitAction({ name: "Read", identity: "reader" })).rejects.toThrow("redirect:/login");
    await expect(markLessonReadAction(1)).rejects.toThrow("redirect:/login");

    expect(mocks.createHabit).not.toHaveBeenCalled();
    expect(mocks.markLessonComplete).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  describe("stack validation in updateHabitAction", () => {
    beforeEach(() => {
      mocks.getHabit.mockImplementation((_userId: string, habitId: string) =>
        Promise.resolve(testHabit({ id: habitId })),
      );
      mocks.dbHabitFindFirst.mockResolvedValue(null);
      mocks.dbHabitFindUnique.mockResolvedValue(null);
    });

    it("rejects linking a habit to itself", async () => {
      const { updateHabitAction } = await import("@/lib/actions/domain");

      await expect(updateHabitAction("habit_a", { stackNextId: "habit_a" })).rejects.toThrow("cannot stack with itself");
      expect(mocks.updateHabit).not.toHaveBeenCalled();
    });

    it("rejects when target is already another habit's stackNextId", async () => {
      mocks.dbHabitFindFirst.mockResolvedValue({ id: "habit_b" });
      const { updateHabitAction } = await import("@/lib/actions/domain");

      await expect(updateHabitAction("habit_a", { stackNextId: "habit_c" })).rejects.toThrow("already part of another stack");
      expect(mocks.updateHabit).not.toHaveBeenCalled();
    });

    it("rejects when linking would create a cycle", async () => {
      // A -> B -> C, trying to link C -> A
      mocks.dbHabitFindUnique.mockImplementation(({ where: { id } }: { where: { id: string } }) => {
        if (id === "habit_a") return Promise.resolve({ stackNextId: "habit_b" });
        if (id === "habit_b") return Promise.resolve({ stackNextId: "habit_c" });
        return Promise.resolve(null);
      });
      const { updateHabitAction } = await import("@/lib/actions/domain");

      await expect(updateHabitAction("habit_c", { stackNextId: "habit_a" })).rejects.toThrow("circular stack");
      expect(mocks.updateHabit).not.toHaveBeenCalled();
    });

    it("allows valid stack links after passing all validations", async () => {
      mocks.updateHabit.mockResolvedValue(testHabit({ id: "habit_a" }));
      const { updateHabitAction } = await import("@/lib/actions/domain");

      await expect(updateHabitAction("habit_a", { stackNextId: "habit_b" })).resolves.toBeDefined();
      expect(mocks.updateHabit).toHaveBeenCalledWith("user_1", "habit_a", expect.objectContaining({ stackNextId: "habit_b" }));
    });
  });
});
