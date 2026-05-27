import { handleApiError, jsonOk, readJson, withApiUser } from "@/lib/api/http";
import { lessonProgressSchema, preferencesSchema } from "@/lib/contracts/domain";
import { logger } from "@/lib/logger";
import {
  getPreferences,
  listCompletedLessons,
  markLessonComplete,
  savePreferences,
} from "@/lib/repositories/reflection";

const log = logger.child({ module: "api.v1.reflection.lessons" });

export const runtime = "nodejs";

export async function GET() {
  return withApiUser(async (userId) => {
    log.debug("GET /api/v1/reflection/lessons", { event: "api.reflection.lessons.get", userId });
    const [completedLessonIds, preferences] = await Promise.all([
      listCompletedLessons(userId),
      getPreferences(userId),
    ]);

    return jsonOk({ completedLessonIds, mode: preferences.lessonMode });
  });
}

export async function POST(request: Request) {
  return withApiUser(async (userId) => {
    log.debug("POST /api/v1/reflection/lessons", { event: "api.reflection.lessons.post", userId });
    const body = await readJson(request);

    if (typeof body === "object" && body && "lessonMode" in body) {
      const preferences = await savePreferences(userId, preferencesSchema.pick({ lessonMode: true }).parse(body));
      return jsonOk({ mode: preferences.lessonMode });
    }

    const input = lessonProgressSchema.parse(body);
    const completedLessonIds = await markLessonComplete(userId, input.lessonId);

    return jsonOk({ completedLessonIds });
  }, handleApiError);
}
