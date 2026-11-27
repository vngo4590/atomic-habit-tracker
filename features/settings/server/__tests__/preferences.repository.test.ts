import { beforeEach, describe, expect, it, vi } from "vitest";

import { getPreferences, savePreferences } from "../preferences.repository";

describe("preferences repository", () => {
  beforeEach(() => {
    process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/atomicly";
  });

  it("upserts preferences with defaults and accepted patch values", async () => {
    const db = {
      userPreference: {
        upsert: vi.fn(async () => ({
          theme: "dark",
          accentHue: 145,
          remindersEnabled: false,
          weeklyReviewNudge: true,
          accountabilityNudge: true,
          onboardingSeen: true,
          lessonMode: "random",
          timezone: "Australia/Sydney",
        })),
      },
    };

    await expect(getPreferences("user_1", db as never)).resolves.toMatchObject({ theme: "dark", lessonMode: "random" });
    await expect(savePreferences("user_1", { lessonMode: "random" }, db as never)).resolves.toMatchObject({ timezone: "Australia/Sydney" });

    expect(db.userPreference.upsert).toHaveBeenLastCalledWith({
      where: { userId: "user_1" },
      create: { userId: "user_1", lessonMode: "random" },
      update: { lessonMode: "random" },
    });
  });
});
