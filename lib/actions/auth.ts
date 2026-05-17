"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

import { signIn, signOut } from "@/auth";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import type { AuthFormState } from "@/lib/contracts/auth";
import { loginSchema } from "@/lib/contracts/auth";
import { registerUser } from "@/lib/auth/register";
import { getCurrentUser } from "@/lib/auth/session";
import { updateUserName, updateUserPassword } from "@/lib/repositories/users";

function formValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function callbackUrl(formData: FormData) {
  const value = formData.get("callbackUrl");
  return typeof value === "string" && value.startsWith("/") ? value : "/";
}

export async function loginAction(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formValue(formData, "email"),
    password: formValue(formData, "password"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Check the highlighted fields.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: callbackUrl(formData),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        ok: false,
        message: "Invalid email or password.",
      };
    }
    throw error;
  }

  return { ok: true, message: "" };
}

export async function registerAction(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const result = await registerUser({
    name: formValue(formData, "name"),
    email: formValue(formData, "email"),
    password: formValue(formData, "password"),
  });

  if (!result.ok) {
    return {
      ok: false,
      message: result.message,
      errors: result.errors,
    };
  }

  try {
    await signIn("credentials", {
      email: result.user.email,
      password: formValue(formData, "password"),
      redirectTo: callbackUrl(formData),
    });
  } catch (error) {
    if (error instanceof AuthError) {
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
  return { ok: true, message: "Profile updated." };
}

export async function changePasswordAction(_prevState: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, message: "Not authenticated." };
  }

  const currentPassword = formValue(formData, "currentPassword");
  const newPassword = formValue(formData, "newPassword");

  if (!user.passwordHash) {
    return { ok: false, message: "Password change is not available for this account." };
  }

  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) {
    return { ok: false, message: "Current password is incorrect." };
  }

  if (newPassword.length < 8) {
    return { ok: false, message: "New password must be at least 8 characters." };
  }
  if (newPassword.length > 128) {
    return { ok: false, message: "New password is too long." };
  }
  if (!/[A-Za-z]/.test(newPassword)) {
    return { ok: false, message: "New password must include a letter." };
  }
  if (!/[0-9]/.test(newPassword)) {
    return { ok: false, message: "New password must include a number." };
  }
  if (!/[^A-Za-z0-9]/.test(newPassword)) {
    return { ok: false, message: "New password must include a symbol." };
  }

  const newHash = await hashPassword(newPassword);
  await updateUserPassword(user.id, newHash);
  return { ok: true, message: "Password changed." };
}
