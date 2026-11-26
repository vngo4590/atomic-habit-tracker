import { describe, expect, it, vi } from "vitest";

import { optimistic } from "@/lib/store/optimistic";

vi.mock("@/lib/logger-client", () => ({
  clientLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

describe("optimistic", () => {
  it("rolls back, logs and toasts when the server action rejects", async () => {
    // Given an applied optimistic change and an action that rejects
    const rollback = vi.fn();
    const showToast = vi.fn();
    const onSuccess = vi.fn();

    // When the mutation runs
    const result = await optimistic({
      apply: () => rollback,
      action: () => Promise.reject(new Error("offline")),
      onSuccess,
      failure: { log: "Save failed", event: "test.failed", toast: "Couldn't save" },
      showToast,
    });

    // Then the change is undone and the user is told why
    expect(result).toBeUndefined();
    expect(rollback).toHaveBeenCalledTimes(1);
    expect(onSuccess).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith("Couldn't save", "offline");
  });

  it("rolls back and calls onRefused for an { ok: false } result", async () => {
    // Given an action that refuses without throwing
    const rollback = vi.fn();
    const onRefused = vi.fn();

    // When the mutation runs
    await optimistic({
      apply: () => rollback,
      action: async () => ({ ok: false as const, reason: "cap" }),
      isRefused: (result) => !result.ok,
      onRefused,
      failure: { log: "Save failed", event: "test.failed" },
    });

    // Then the optimistic change is reverted and the refusal is surfaced
    expect(rollback).toHaveBeenCalledTimes(1);
    expect(onRefused).toHaveBeenCalledWith({ ok: false, reason: "cap" });
  });

  it("keeps the change and reconciles on success", async () => {
    // Given an action that succeeds
    const rollback = vi.fn();
    const onSuccess = vi.fn();

    // When the mutation runs
    await optimistic({
      apply: () => rollback,
      action: async () => "saved",
      onSuccess,
      failure: { log: "Save failed", event: "test.failed" },
    });

    // Then nothing is rolled back and the server value is reconciled
    expect(rollback).not.toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalledWith("saved");
  });

  it("re-throws a thin error when rethrow is set", async () => {
    // Given a caller that wants to show its own dialog
    // When the action rejects
    const run = optimistic({
      action: () => Promise.reject(new Error("cycle")),
      failure: { log: "Save failed", event: "test.failed" },
      rethrow: true,
    });

    // Then the server message is propagated
    await expect(run).rejects.toThrow("cycle");
  });
});
