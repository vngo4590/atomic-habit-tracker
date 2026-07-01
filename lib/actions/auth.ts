"use server";

import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { signIn, signOut, updateSession } from "@/auth";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import type { AuthFormState } from "@/lib/contracts/auth";
import { loginSchema } from "@/lib/contracts/auth";
import { registerUser } from "@/lib/auth/register";
import { getCurrentUser } from "@/lib/auth/session";
import { clientIpFromHeaders } from "@/lib/security/rate-limit";
import { TURNSTILE_FIELD, verifyTurnstileToken } from "@/lib/security/turnstile";
import { logger, redactEmail, redactUserId } from "@/lib/logger";
import { updateUserName, updateUserPassword, revokeUserSessions } from "@/lib/repositories/users";

const log = logger.child({ module: "actions.auth" });

function formValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function callbackUrl(formData: FormData) {
  const value = formData.get("callbackUrl");
  return typeof value === "string" && value.startsWith("/") ? value : "/";
}

/**
 * Verifies the Cloudflare Turnstile bot challenge for an auth submission.
 * Returns true when verification passes (or Turnstile is not configured).
 */
async function passesBotChallenge(formData: FormData): Promise<boolean> {
  const token = formValue(formData, TURNSTILE_FIELD);
  const ip = clientIpFromHeaders(await headers());
  return verifyTurnstileToken(token, ip);
}

export async function loginAction(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = formValue(formData, "email");
  const parsed = loginSchema.safeParse({
    email,
    password: formValue(formData, "password"),
  });

  if (!parsed.success) {
    log.info("Login validation failed", { event: "auth.login_validation_failed", email: redactEmail(email) });
    return {
      ok: false,
      message: "Check the highlighted fields.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  log.info("Login attempted", { event: "auth.login_attempted", email: redactEmail(parsed.data.email) });

  if (!(await passesBotChallenge(formData))) {
    log.warn("Login blocked — bot challenge failed", {
      event: "auth.login_bot_challenge_failed",
      email: redactEmail(parsed.data.email),
    });
    return { ok: false, message: "Bot verification failed. Please try again." };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: callbackUrl(formData),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      log.warn("Login failed — invalid credentials", { event: "auth.login_failed", email: redactEmail(parsed.data.email) });
      return {
        ok: false,
        message: "Invalid email or password.",
      };
    }
    // Next.js redirect throws a non-Error object — do not log it as an error
    throw error;
  }

  return { ok: true, message: "" };
}

export async function registerAction(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = formValue(formData, "email");

  if (!(await passesBotChallenge(formData))) {
    log.warn("Registration blocked — bot challenge failed", {
      event: "auth.register_bot_challenge_failed",
      email: redactEmail(email),
    });
    return { ok: false, message: "Bot verification failed. Please try again." };
  }

  const result = await registerUser({
    name: formValue(formData, "name"),
    email,
    password: formValue(formData, "password"),
  });

  if (!result.ok) {
    log.info("Registration failed", { event: "auth.register_failed", email: redactEmail(email), reason: result.message });
    return {
      ok: false,
      message: result.message,
      errors: result.errors,
    };
  }

  log.info("User registered", { event: "auth.registered", email: redactEmail(email), userId: redactUserId(result.user.id) });

  try {
    await signIn("credentials", {
      email: result.user.email,
      password: formValue(formData, "password"),
      redirectTo: callbackUrl(formData),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      log.warn("Post-registration sign-in failed", { event: "auth.register_signin_failed", email: redactEmail(email) });
      return {
        ok: false,
        message: "Account created, but sign-in failed. Please sign in manually.",
      };
    }
    throw error;
  }

  return { ok: true, message: "" };
}

export async function logoutAction() {
  log.info("User logged out", { event: "auth.logout" });
  await signOut({ redirectTo: "/login" });
  redirect("/login");
}

/**
 * Signs the user out of every device. Advances their session revocation cutoff
 * so all previously-issued sessions are rejected on their next request, then
 * clears the current cookie. Use this for "lost device" / account-security flows.
 */
export async function signOutEverywhereAction() {
  const user = await getCurrentUser();
  if (user) {
    await revokeUserSessions(user.id);
    log.info("User signed out of all devices", {
      event: "auth.signout_all",
      userId: redactUserId(user.id),
    });
  }
  await signOut({ redirectTo: "/login" });
  redirect("/login");
}

export interface ProfileFormState {
  ok: boolean;
  message: string;
}

export async function updateProfileAction(_prevState: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const user = await getCurrentUser();
  if (!user) {
    log.warn("Profile update attempted without auth", { event: "auth.profile_update_unauthenticated" });
    return { ok: false, message: "Not authenticated." };
  }

  const name = formValue(formData, "name").trim();
  if (!name || name.length < 2) {
    return { ok: false, message: "Name must be at least 2 characters." };
  }
  if (name.length > 80) {
    return { ok: false, message: "Name is too long." };
  }

  await updateUserName(user.id, name);
  log.info("Profile updated", { event: "auth.profile_updated", userId: redactUserId(user.id) });
  return { ok: true, message: "Profile updated." };
}

export async function changePasswordAction(_prevState: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const user = await getCurrentUser();
  if (!user) {
    log.warn("Password change attempted without auth", { event: "auth.password_change_unauthenticated" });
    return { ok: false, message: "Not authenticated." };
  }

  const currentPassword = formValue(formData, "currentPassword");
  const newPassword = formValue(formData, "newPassword");

  if (!user.passwordHash) {
    return { ok: false, message: "Password change is not available for this account." };
  }

  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) {
    log.warn("Password change failed — incorrect current password", { event: "auth.password_change_failed", userId: redactUserId(user.id) });
    return { ok: false, message: "Current password is incorrect." };
  }

  if (newPassword.length < 8) {
    log.warn("Password change failed — new password too short", { event: "auth.password_change_failed", userId: redactUserId(user.id) });
    return { ok: false, message: "New password must be at least 8 characters." };
  }
  if (newPassword.length > 128) {
    log.warn("Password change failed — new password too long", { event: "auth.password_change_failed", userId: redactUserId(user.id) });
    return { ok: false, message: "New password is too long." };
  }
  if (!/[A-Za-z]/.test(newPassword)) {
    log.warn("Password change failed — new password missing letter", { event: "auth.password_change_failed", userId: redactUserId(user.id) });
    return { ok: false, message: "New password must include a letter." };
  }
  if (!/[0-9]/.test(newPassword)) {
    log.warn("Password change failed — new password missing number", { event: "auth.password_change_failed", userId: redactUserId(user.id) });
    return { ok: false, message: "New password must include a number." };
  }
  if (!/[^A-Za-z0-9]/.test(newPassword)) {
    log.warn("Password change failed — new password missing symbol", { event: "auth.password_change_failed", userId: redactUserId(user.id) });
    return { ok: false, message: "New password must include a symbol." };
  }

  const newHash = await hashPassword(newPassword);
  await updateUserPassword(user.id, newHash);
  // Revoke every existing session so a stolen or stale cookie cannot outlive the
  // password it was created under. This advances the user's `sessionsValidFrom`
  // cutoff to "now", which would ALSO revoke the current device.
  await revokeUserSessions(user.id);
  // Ordering is load-bearing: re-issue the CURRENT session's cookie with a fresh
  // `authTime` (via the `update` jwt trigger) AFTER the revoke above, so that
  // `authTime >= sessionsValidFrom`. `isSessionRevoked` uses a strict `<`, so an
  // equal timestamp is not revoked — the current device stays signed in while
  // every other device (whose older `authTime` predates the cutoff) stays revoked.
  // Reversing this order would silently sign the current device out again.
  await updateSession({});
  log.info("Password changed", { event: "auth.password_changed", userId: redactUserId(user.id) });
  return { ok: true, message: "Password changed. You've been signed out on your other devices." };
}
