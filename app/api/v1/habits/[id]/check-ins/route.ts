import { handleApiError, jsonError, jsonOk, readJson, withApiUser } from "@/lib/api/http";
import { checkInSchema } from "@/lib/contracts/domain";
import { logger } from "@/lib/logger";
import { upsertCheckIn } from "@/lib/repositories/habits";

const log = logger.child({ module: "api.v1.habits.check-ins" });

export const runtime = "nodejs";

interface HabitRouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: HabitRouteContext) {
  const { id } = await context.params;

  return withApiUser(async (userId) => {
    log.debug("POST /api/v1/habits/:id/check-ins", { event: "api.habits.checkIn.create", userId, habitId: id });
    const input = checkInSchema.parse(await readJson(request));
    const habit = await upsertCheckIn(userId, id, input);

    if (!habit) {
      return jsonError("not_found", "Habit was not found.", 404);
    }

    return jsonOk({ habit });
  }, handleApiError);
}
