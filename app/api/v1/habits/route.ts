import { handleApiError, jsonError, jsonOk, readJson, withApiUser } from "@/lib/api/http";
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
    const result = await createHabit(userId, input);

    // The active-habit cap is a client-visible refusal, not an unexpected
    // failure, so surface it as 409 Conflict (distinct from a 500) with the
    // reason code so API clients can react precisely.
    if (!result.ok) {
      log.info("POST /api/v1/habits refused — active cap reached", { event: "api.habits.capped", userId });
      return jsonError("habit_cap_reached", "You can have at most 3 active habits at a time.", 409);
    }

    return jsonOk({ habit: result.habit }, { status: 201 });
  }, handleApiError);
}
