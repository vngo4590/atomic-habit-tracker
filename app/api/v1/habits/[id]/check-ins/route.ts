import { handleApiError, jsonError, jsonOk, readJson, withApiUser } from "@/lib/api/http";
import { checkInSchema } from "@/lib/contracts/domain";
import { upsertCheckIn } from "@/lib/repositories/habits";

export const runtime = "nodejs";

interface HabitRouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: HabitRouteContext) {
  const { id } = await context.params;

  return withApiUser(async (userId) => {
    const input = checkInSchema.parse(await readJson(request));
    const habit = await upsertCheckIn(userId, id, input);

    if (!habit) {
      return jsonError("not_found", "Habit was not found.", 404);
    }

    return jsonOk({ habit });
  }, handleApiError);
}
