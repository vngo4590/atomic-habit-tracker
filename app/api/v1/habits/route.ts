import { handleApiError, jsonOk, readJson, withApiUser } from "@/lib/api/http";
import { habitCreateSchema } from "@/lib/contracts/domain";
import { logger } from "@/lib/logger";
import { createHabit, listHabits } from "@/lib/repositories/habits";

const log = logger.child({ module: "api.v1.habits" });

export const runtime = "nodejs";

export async function GET() {
  return withApiUser(async (userId) => {
    log.debug("GET /api/v1/habits", { event: "api.habits.list", userId });
    return jsonOk({ habits: await listHabits(userId) });
  });
}

export async function POST(request: Request) {
  return withApiUser(async (userId) => {
    log.debug("POST /api/v1/habits", { event: "api.habits.create", userId });
    const input = habitCreateSchema.parse(await readJson(request));
    const habit = await createHabit(userId, input);

    return jsonOk({ habit }, { status: 201 });
  }, handleApiError);
}
