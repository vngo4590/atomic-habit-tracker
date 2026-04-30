import { handleApiError, jsonError, jsonOk, readJson, withApiUser } from "@/lib/api/http";
import { weeklyReviewSchema } from "@/lib/contracts/domain";
import { getWeeklyReview, saveWeeklyReview } from "@/lib/repositories/reflection";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const weekStartKey = new URL(request.url).searchParams.get("weekStartKey");

  if (!weekStartKey) {
    return jsonError("validation_failed", "weekStartKey is required.", 422, {
      weekStartKey: ["weekStartKey is required."],
    });
  }

  return withApiUser(async (userId) => jsonOk({ review: await getWeeklyReview(userId, weekStartKey) }));
}

export async function PUT(request: Request) {
  return withApiUser(async (userId) => {
    const input = weeklyReviewSchema.parse(await readJson(request));
    const review = await saveWeeklyReview(userId, input);

    return jsonOk({ review });
  }, handleApiError);
}
