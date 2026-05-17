import { describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — must be hoisted so they apply before the module under test imports.
// ---------------------------------------------------------------------------

const getCurrentUserMock = vi.hoisted(() => vi.fn());
const updateUserNameMock = vi.hoisted(() => vi.fn());
const updateUserPasswordMock = vi.hoisted(() => vi.fn());
const hashPasswordMock = vi.hoisted(() => vi.fn());
const verifyPasswordMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: getCurrentUserMock,
}));

vi.mock("@/lib/repositories/users", () => ({
  findAuthUserByEmail: vi.fn(),
  findAuthUserById: vi.fn(),
  createUserWithDefaults: vi.fn(),
  updateUserName: updateUserNameMock,
  updateUserPassword: updateUserPasswordMock,
}));

vi.mock("@/lib/auth/password", () => ({
  hashPassword: hashPasswordMock,
  verifyPassword: verifyPasswordMock,
}));

// Import the functions under test *after* mocks are registered.
import { updateProfileAction, changePasswordAction } from "@/lib/actions/auth";

function form(data: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(data)) {
    fd.set(key, value);
  }
  return fd;
}

describe("updateProfileAction", () => {
  it("rejects unauthenticated users", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    const result = await updateProfileAction({ ok: false, message: "" }, form({ name: "Alex" }));

    expect(result.ok).toBe(false);
    expect(result.message).toBe("Not authenticated.");
    expect(updateUserNameMock).not.toHaveBeenCalled();
  });

  it("rejects a name that is too short", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user_1", name: "Old", email: "old@example.com" });

    const result = await updateProfileAction({ ok: false, message: "" }, form({ name: "A" }));

    expect(result.ok).toBe(false);
    expect(result.message).toBe("Name must be at least 2 characters.");
    expect(updateUserNameMock).not.toHaveBeenCalled();
  });

  it("rejects a name that is too long", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user_1", name: "Old", email: "old@example.com" });

    const result = await updateProfileAction({ ok: false, message: "" }, form({ name: "A".repeat(81) }));

    expect(result.ok).toBe(false);
    expect(result.message).toBe("Name is too long.");
    expect(updateUserNameMock).not.toHaveBeenCalled();
  });

  it("updates the user's name when valid", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user_1", name: "Old", email: "old@example.com" });
    updateUserNameMock.mockResolvedValue({ id: "user_1", name: "New Name", email: "old@example.com" });

    const result = await updateProfileAction({ ok: false, message: "" }, form({ name: "New Name" }));

    expect(updateUserNameMock).toHaveBeenCalledWith("user_1", "New Name");
    expect(result.ok).toBe(true);
    expect(result.message).toBe("Profile updated.");
  });
});

describe("changePasswordAction", () => {
  it("rejects unauthenticated users", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    const result = await changePasswordAction({ ok: false, message: "" }, form({ currentPassword: "old", newPassword: "new" }));

    expect(result.ok).toBe(false);
    expect(result.message).toBe("Not authenticated.");
  });

  it("rejects when the account has no password hash", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user_1", name: "Alex", email: "alex@example.com", passwordHash: null });

    const result = await changePasswordAction(
      { ok: false, message: "" },
      form({ currentPassword: "oldpass", newPassword: "newpass" }),
    );

    expect(result.ok).toBe(false);
    expect(result.message).toBe("Password change is not available for this account.");
  });

  it("rejects when the current password is incorrect", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user_1", name: "Alex", email: "alex@example.com", passwordHash: "hash" });
    verifyPasswordMock.mockResolvedValue(false);

    const result = await changePasswordAction(
      { ok: false, message: "" },
      form({ currentPassword: "wrong", newPassword: "NewPass1!" }),
    );

    expect(verifyPasswordMock).toHaveBeenCalledWith("wrong", "hash");
    expect(result.ok).toBe(false);
    expect(result.message).toBe("Current password is incorrect.");
    expect(hashPasswordMock).not.toHaveBeenCalled();
  });

  it("rejects a new password that is too short", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user_1", name: "Alex", email: "alex@example.com", passwordHash: "hash" });
    verifyPasswordMock.mockResolvedValue(true);

    const result = await changePasswordAction(
      { ok: false, message: "" },
      form({ currentPassword: "oldpass", newPassword: "short1!" }),
    );

    expect(result.ok).toBe(false);
    expect(result.message).toBe("New password must be at least 8 characters.");
  });

  it("rejects a new password missing a letter", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user_1", name: "Alex", email: "alex@example.com", passwordHash: "hash" });
    verifyPasswordMock.mockResolvedValue(true);

    const result = await changePasswordAction(
      { ok: false, message: "" },
      form({ currentPassword: "oldpass", newPassword: "12345678!" }),
    );

    expect(result.ok).toBe(false);
    expect(result.message).toBe("New password must include a letter.");
  });

  it("rejects a new password missing a number", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user_1", name: "Alex", email: "alex@example.com", passwordHash: "hash" });
    verifyPasswordMock.mockResolvedValue(true);

    const result = await changePasswordAction(
      { ok: false, message: "" },
      form({ currentPassword: "oldpass", newPassword: "Password!" }),
    );

    expect(result.ok).toBe(false);
    expect(result.message).toBe("New password must include a number.");
  });

  it("rejects a new password missing a symbol", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user_1", name: "Alex", email: "alex@example.com", passwordHash: "hash" });
    verifyPasswordMock.mockResolvedValue(true);

    const result = await changePasswordAction(
      { ok: false, message: "" },
      form({ currentPassword: "oldpass", newPassword: "Password1" }),
    );

    expect(result.ok).toBe(false);
    expect(result.message).toBe("New password must include a symbol.");
  });

  it("changes the password when everything is valid", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user_1", name: "Alex", email: "alex@example.com", passwordHash: "hash" });
    verifyPasswordMock.mockResolvedValue(true);
    hashPasswordMock.mockResolvedValue("new_hash");
    updateUserPasswordMock.mockResolvedValue({ id: "user_1", name: "Alex", email: "alex@example.com", passwordHash: "new_hash" });

    const result = await changePasswordAction(
      { ok: false, message: "" },
      form({ currentPassword: "oldpass", newPassword: "NewPass1!" }),
    );

    expect(verifyPasswordMock).toHaveBeenCalledWith("oldpass", "hash");
    expect(hashPasswordMock).toHaveBeenCalledWith("NewPass1!");
    expect(updateUserPasswordMock).toHaveBeenCalledWith("user_1", "new_hash");
    expect(result.ok).toBe(true);
    expect(result.message).toBe("Password changed.");
  });
});
