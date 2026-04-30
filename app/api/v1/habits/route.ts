import { handleApiError, jsonOk, readJson, withApiUser } from "@/lib/api/http";
import { habitCreateSchema } from "@/lib/contracts/domain";
import { createHabit, listHabits } from "@/lib/repositories/habits";

export const runtime = "nodejs";

export async function GET() {
  return withApiUser(async (userId) => jsonOk({ habits: await listHabits(userId) }));
}

export async function POST(request: Request) {
  return withApiUser(async (userId) => {
    const input = habitCreateSchema.parse(await readJson(request));
    const habit = await createHabit(userId, input);

    return jsonOk({ habit }, { status: 201 });
  }, handleApiError);
}
