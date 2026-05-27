"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

import { signIn, signOut } from "@/auth";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import type { AuthFormState } from "@/lib/contracts/auth";
import { loginSchema } from "@/lib/contracts/auth";
import { registerUser } from "@/lib/auth/register";
import { getCurrentUser } from "@/lib/auth/session";
import { logger, redactEmail, redactUserId } from "@/lib/logger";
import { updateUserName, updateUserPassword } from "@/lib/repositories/users";

const log = logger.child({ module: "actions.auth" });

function formValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function callbackUrl(formData: FormData) {
  const value = formData.get("callbackUrl");
  return typeof value === "string" && value.startsWith("/") ? value : "/";
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
  log.info("Password changed", { event: "auth.password_changed", userId: redactUserId(user.id) });
  return { ok: true, message: "Password changed." };
}
