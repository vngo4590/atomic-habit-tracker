import { handleApiError, jsonError, jsonOk, readJson, withApiUser } from "@/lib/api/http";
import { contractSchema } from "@/lib/contracts/domain";
import { saveContract } from "@/lib/repositories/habits";

export const runtime = "nodejs";

interface HabitRouteContext {
  params: Promise<{ id: string }>;
}

export async function PUT(request: Request, context: HabitRouteContext) {
  const { id } = await context.params;

  return withApiUser(async (userId) => {
    const input = contractSchema.parse(await readJson(request));
    const habit = await saveContract(userId, id, input);

    if (!habit) {
      return jsonError("not_found", "Habit was not found.", 404);
    }

    return jsonOk({ habit });
  }, handleApiError);
}
