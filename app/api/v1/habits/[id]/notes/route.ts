import { handleApiError, jsonError, jsonOk, readJson, withApiUser } from "@/lib/api/http";
import { habitUpdateSchema } from "@/lib/contracts/domain";
import { logger } from "@/lib/logger";
import { updateHabit } from "@/lib/repositories/habits";

const log = logger.child({ module: "api.v1.habits.notes" });

export const runtime = "nodejs";

interface HabitRouteContext {
  params: Promise<{ id: string }>;
}

export async function PUT(request: Request, context: HabitRouteContext) {
  const { id } = await context.params;

  return withApiUser(async (userId) => {
    log.debug("PUT /api/v1/habits/:id/notes", { event: "api.habits.notes.update", userId, habitId: id });
    const input = habitUpdateSchema.pick({ notes: true }).parse(await readJson(request));
    const habit = await updateHabit(userId, id, input);

    if (!habit) {
      return jsonError("not_found", "Habit was not found.", 404);
    }

    return jsonOk({ habit });
  }, handleApiError);
}
