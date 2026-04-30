"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

import { signIn, signOut } from "@/auth";
import type { AuthFormState } from "@/lib/contracts/auth";
import { loginSchema } from "@/lib/contracts/auth";
import { registerUser } from "@/lib/auth/register";

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
