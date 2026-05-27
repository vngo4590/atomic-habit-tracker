import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { logger, redactUserId } from "@/lib/logger";
import { findAuthUserById, type AuthUserRecord } from "@/lib/repositories/users";

const log = logger.child({ module: "auth.session" });

export async function getCurrentSession() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    log.debug("No auth session found", { event: "auth.session.not_found" });
    return session;
  }

  log.debug("Resolved auth session", {
    event: "auth.session.resolved",
    userId: redactUserId(userId),
  });
  return session;
}

export async function getCurrentUser(): Promise<AuthUserRecord | null> {
  const session = await getCurrentSession();
  const userId = session?.user?.id;

  if (!userId) {
    return null;
  }

  const user = await findAuthUserById(userId);

  if (!user) {
    log.debug("Auth user lookup returned no user", {
      event: "auth.session.not_found",
      userId: redactUserId(userId),
    });
    return null;
  }

  log.debug("Resolved auth user from session", {
    event: "auth.session.resolved",
    userId: redactUserId(user.id),
  });
  return user;
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
