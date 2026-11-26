import "server-only";

import { revalidatePath } from "next/cache";

/**
 * Refresh every cached app page after a habit-level change (create, edit,
 * check-in, stack change). Shared by the habits and stacks server actions;
 * it lives outside the "use server" files because those may only export
 * async functions.
 */
export function revalidateApp() {
  revalidatePath("/");
  revalidatePath("/habits");
  revalidatePath("/analytics");
  revalidatePath("/journal");
  revalidatePath("/review");
  revalidatePath("/lessons");
  revalidatePath("/identity");
  revalidatePath("/hall-of-fame");
  revalidatePath("/settings");
}
