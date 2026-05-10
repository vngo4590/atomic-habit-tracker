import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { findAuthUserById, type AuthUserRecord } from "@/lib/repositories/users";

export async function getCurrentSession() {
  return auth();
}

export async function getCurrentUser(): Promise<AuthUserRecord | null> {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return null;
  }

  return findAuthUserById(userId);
}

export async function getCurrentUserId() {
  const user = await getCurrentUser();
  return user?.id ?? null;
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireUserId() {
  const user = await requireCurrentUser();
  return user.id;
}
