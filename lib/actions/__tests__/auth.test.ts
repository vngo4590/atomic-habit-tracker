import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — must be hoisted so they apply before the module under test imports.
// ---------------------------------------------------------------------------

const getCurrentUserMock = vi.hoisted(() => vi.fn());
const updateUserNameMock = vi.hoisted(() => vi.fn());
const updateUserPasswordMock = vi.hoisted(() => vi.fn());
const revokeUserSessionsMock = vi.hoisted(() => vi.fn());
const hashPasswordMock = vi.hoisted(() => vi.fn());
const verifyPasswordMock = vi.hoisted(() => vi.fn());
const signInMock = vi.hoisted(() => vi.fn());

vi.mock("@/auth", () => ({
  signIn: signInMock,
  signOut: vi.fn(),
  updateSession: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: getCurrentUserMock,
}));

vi.mock("@/lib/repositories/users", () => ({
  findAuthUserByEmail: vi.fn(),
  findAuthUserById: vi.fn(),
  createUserWithDefaults: vi.fn(),
  updateUserName: updateUserNameMock,
  updateUserPassword: updateUserPasswordMock,
  revokeUserSessions: revokeUserSessionsMock,
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
  beforeEach(() => {
    getCurrentUserMock.mockReset();
    verifyPasswordMock.mockReset();
    hashPasswordMock.mockReset();
    updateUserPasswordMock.mockReset();
    revokeUserSessionsMock.mockReset();
    signInMock.mockReset();
  });

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

  it("rejects a new password that is too long", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user_1", name: "Alex", email: "alex@example.com", passwordHash: "hash" });
    verifyPasswordMock.mockResolvedValue(true);

    // Given a valid-shape password (letter + number + symbol) but > 128 chars.
    const tooLong = "Aa1!".repeat(33); // 132 chars

    const result = await changePasswordAction(
      { ok: false, message: "" },
      form({ currentPassword: "oldpass", newPassword: tooLong }),
    );

    expect(result.ok).toBe(false);
    expect(result.message).toBe("New password is too long.");
    expect(hashPasswordMock).not.toHaveBeenCalled();
  });

  it("changes the password, revokes other sessions, and refreshes the current session", async () => {
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
    // Security: a password change invalidates every previously-issued session...
    expect(revokeUserSessionsMock).toHaveBeenCalledWith("user_1");
    // ...but the CURRENT device is kept signed in by minting a fresh session via
    // the credentials sign-in path, using the NEW password, AFTER the revoke (so
    // its fresh authTime >= sessionsValidFrom).
    expect(signInMock).toHaveBeenCalledTimes(1);
    expect(signInMock).toHaveBeenCalledWith("credentials", {
      email: "alex@example.com",
      password: "NewPass1!",
      redirect: false,
    });
    // Ordering is load-bearing: revoke must run before the session re-mint.
    expect(revokeUserSessionsMock.mock.invocationCallOrder[0]).toBeLessThan(
      signInMock.mock.invocationCallOrder[0],
    );
    expect(result.ok).toBe(true);
    // Copy reflects reality: current device stays in, other devices signed out.
    expect(result.message).toBe("Password changed. You've been signed out on your other devices.");
    expect(result.message).not.toMatch(/sign in again/i);
  });

  // Regression (the reported bug): after a first successful change, a second
  // change in the SAME session must still resolve the current user and succeed
  // with the correct new current password — never bounce to "Not authenticated."
  it("allows a second in-session password change to succeed", async () => {
    // Given a still-authenticated user across two consecutive changes.
    getCurrentUserMock.mockResolvedValue({ id: "user_1", name: "Alex", email: "alex@example.com", passwordHash: "hash" });
    verifyPasswordMock.mockResolvedValue(true);
    hashPasswordMock.mockResolvedValueOnce("hash_b").mockResolvedValueOnce("hash_c");
    updateUserPasswordMock.mockResolvedValue({ id: "user_1", name: "Alex", email: "alex@example.com", passwordHash: "hash_b" });

    // When the user changes A→B, then B→C in the same session.
    const first = await changePasswordAction(
      { ok: false, message: "" },
      form({ currentPassword: "OldPass1!", newPassword: "NewPassB1!" }),
    );
    const second = await changePasswordAction(
      { ok: false, message: "" },
      form({ currentPassword: "NewPassB1!", newPassword: "NewPassC1!" }),
    );

    // Then both changes succeed and the second is never rejected as unauthenticated.
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(second.message).not.toBe("Not authenticated.");
    expect(revokeUserSessionsMock).toHaveBeenCalledTimes(2);
    expect(signInMock).toHaveBeenCalledTimes(2);
    // The second re-mint uses the NEW current password (B), proving the current
    // device is re-authenticated with fresh credentials each change.
    expect(signInMock).toHaveBeenLastCalledWith("credentials", {
      email: "alex@example.com",
      password: "NewPassC1!",
      redirect: false,
    });
  });

  // Regression: with a still-valid session, a wrong current password must report
  // the password as incorrect — NOT "Not authenticated." (the old misleading bug).
  it("reports a wrong current password as incorrect, not unauthenticated, while the session is valid", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user_1", name: "Alex", email: "alex@example.com", passwordHash: "hash" });
    verifyPasswordMock.mockResolvedValue(false);

    const result = await changePasswordAction(
      { ok: false, message: "" },
      form({ currentPassword: "wrong", newPassword: "NewPass1!" }),
    );

    expect(result.ok).toBe(false);
    expect(result.message).toBe("Current password is incorrect.");
    expect(result.message).not.toBe("Not authenticated.");
    // The password was actually checked (not short-circuited as unauthenticated).
    expect(verifyPasswordMock).toHaveBeenCalledWith("wrong", "hash");
    expect(updateUserPasswordMock).not.toHaveBeenCalled();
    expect(revokeUserSessionsMock).not.toHaveBeenCalled();
    expect(signInMock).not.toHaveBeenCalled();
  });
});
