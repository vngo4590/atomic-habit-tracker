import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUserId: vi.fn(),
  revalidatePath: vi.fn(),
  mergeBackup: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

vi.mock("@/lib/auth/session", () => ({ requireUserId: mocks.requireUserId }));

vi.mock("@/lib/backup/import", () => ({ mergeBackup: mocks.mergeBackup }));

import { importDataAction } from "@/lib/actions/backup";

const validFile = JSON.stringify({
  app: "atomicly",
  schemaVersion: 1,
  exportedAt: "2026-06-21T00:00:00.000Z",
  data: { habits: [] },
});

describe("importDataAction", () => {
  beforeEach(() => {
    mocks.requireUserId.mockReset();
    mocks.requireUserId.mockResolvedValue("user_1");
    mocks.revalidatePath.mockReset();
    mocks.mergeBackup.mockReset();
  });

  it("rejects empty input without touching the database", async () => {
    // Given an empty upload
    const result = await importDataAction("");
    // Then it fails fast and never imports
    expect(result.ok).toBe(false);
    expect(mocks.mergeBackup).not.toHaveBeenCalled();
  });

  it("rejects a file that is not valid JSON", async () => {
    // Given a non-JSON file
    const result = await importDataAction("{not json");
    // Then it reports the parse failure and skips the import
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/JSON/i);
    expect(mocks.mergeBackup).not.toHaveBeenCalled();
  });

  it("merges a valid backup, revalidates, and reports a summary", async () => {
    // Given a valid backup and a successful merge
    mocks.mergeBackup.mockResolvedValue({
      habits: 2,
      checkIns: 5,
      notes: 0,
      contracts: 0,
      journal: 1,
      weeklyReviews: 0,
      lessons: 0,
      formationVerdicts: 0,
      identity: false,
      preferences: false,
      skipped: 0,
    });

    // When the user imports
    const result = await importDataAction(validFile);

    // Then it succeeds, refreshes the app, and summarises the restore
    expect(result.ok).toBe(true);
    expect(result.message).toMatch(/2 habits/);
    expect(mocks.mergeBackup).toHaveBeenCalledWith("user_1", expect.objectContaining({ app: "atomicly" }));
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/");
  });

  it("returns a friendly message when the backup is invalid", async () => {
    // Given a merge that rejects the file via Zod
    const { ZodError } = await import("zod");
    mocks.mergeBackup.mockRejectedValue(new ZodError([]));

    // When the user imports
    const result = await importDataAction(validFile);

    // Then a friendly, non-technical message is returned
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Atomicly backup/i);
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("does not change data when an unexpected error occurs", async () => {
    // Given an unexpected failure during merge
    mocks.mergeBackup.mockRejectedValue(new Error("db down"));

    // When the user imports
    const result = await importDataAction(validFile);

    // Then it fails safely and reassures the user nothing changed
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/not changed/i);
  });
});
