import { handleApiError, jsonError, jsonOk, readJson, withApiUser } from "@/lib/api/http";
import { weeklyReviewSchema } from "@/lib/contracts/domain";
import { logger } from "@/lib/logger";
import { getWeeklyReview, saveWeeklyReview } from "@/lib/repositories/reflection";

const log = logger.child({ module: "api.v1.reflection.weekly-review" });

export const runtime = "nodejs";

export async function GET(request: Request) {
  const weekStartKey = new URL(request.url).searchParams.get("weekStartKey");

  if (!weekStartKey) {
    return jsonError("validation_failed", "weekStartKey is required.", 422, {
      weekStartKey: ["weekStartKey is required."],
    });
  }

  return withApiUser(async (userId) => {
    log.debug("GET /api/v1/reflection/weekly-review", {
      event: "api.reflection.weeklyReview.get",
      userId,
      weekStartKey,
    });
    return jsonOk({ review: await getWeeklyReview(userId, weekStartKey) });
  });
}

export async function PUT(request: Request) {
  return withApiUser(async (userId) => {
    log.debug("PUT /api/v1/reflection/weekly-review", { event: "api.reflection.weeklyReview.update", userId });
    const input = weeklyReviewSchema.parse(await readJson(request));
    const review = await saveWeeklyReview(userId, input);

    return jsonOk({ review });
  }, handleApiError);
}
