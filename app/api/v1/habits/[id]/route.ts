import { handleApiError, jsonError, jsonOk, readJson, withApiUser } from "@/lib/api/http";
import { habitUpdateSchema } from "@/lib/contracts/domain";
import { logger } from "@/lib/logger";
import { archiveHabit, getHabit, updateHabit } from "@/lib/repositories/habits";
import { isStackError } from "@/lib/stack-errors";

const log = logger.child({ module: "api.v1.habits.id" });

function handleHabitMutationError(error: unknown) {
  if (isStackError(error)) {
    return jsonError(error.code, error.message, 422);
  }
  return handleApiError(error);
}

export const runtime = "nodejs";

interface HabitRouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: HabitRouteContext) {
  const { id } = await context.params;

  return withApiUser(async (userId) => {
    log.debug("GET /api/v1/habits/:id", { event: "api.habits.get", userId, habitId: id });
    const habit = await getHabit(userId, id);

    if (!habit) {
      return jsonError("not_found", "Habit was not found.", 404);
    }

    return jsonOk({ habit });
  });
}

export async function PATCH(request: Request, context: HabitRouteContext) {
  const { id } = await context.params;

  return withApiUser(async (userId) => {
    log.debug("PATCH /api/v1/habits/:id", { event: "api.habits.update", userId, habitId: id });
    const input = habitUpdateSchema.parse(await readJson(request));
    const habit = await updateHabit(userId, id, input);

    if (!habit) {
      return jsonError("not_found", "Habit was not found.", 404);
    }

    return jsonOk({ habit });
  }, handleHabitMutationError);
}

export async function DELETE(_request: Request, context: HabitRouteContext) {
  const { id } = await context.params;

  return withApiUser(async (userId) => {
    log.debug("DELETE /api/v1/habits/:id", { event: "api.habits.delete", userId, habitId: id });
    const habit = await archiveHabit(userId, id);

    if (!habit) {
      return jsonError("not_found", "Habit was not found.", 404);
    }

    return jsonOk({ habit });
  });
}
