import { Suspense } from "react";

import { TodaySkeleton, TodayView } from "@/features/habits/ui";
import { requireCurrentUser } from "@/lib/auth/session";

/**
 * Today (`/`) — thin route shell. Habit data comes from the store the
 * (root) layout already loaded; this page only adds the signed-in user's
 * first name for the greeting, streaming a matching skeleton meanwhile.
 */
export default function TodayPage() {
  return (
    <Suspense fallback={<TodaySkeleton />}>
      <TodayWithUser />
    </Suspense>
  );
}

async function TodayWithUser() {
  const user = await requireCurrentUser();
  // "Ada Lovelace" -> "Ada"; accounts without a name get a plain greeting.
  const firstName = user.name?.trim().split(/\s+/)[0] || null;
  return <TodayView userName={firstName} />;
}
