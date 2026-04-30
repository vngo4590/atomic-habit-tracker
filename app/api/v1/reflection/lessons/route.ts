import { handleApiError, jsonOk, readJson, withApiUser } from "@/lib/api/http";
import { lessonProgressSchema, preferencesSchema } from "@/lib/contracts/domain";
import {
  getPreferences,
  listCompletedLessons,
  markLessonComplete,
  savePreferences,
} from "@/lib/repositories/reflection";

export const runtime = "nodejs";

export async function GET() {
  return withApiUser(async (userId) => {
    const [completedLessonIds, preferences] = await Promise.all([
      listCompletedLessons(userId),
      getPreferences(userId),
    ]);

    return jsonOk({ completedLessonIds, mode: preferences.lessonMode });
  });
}

export async function POST(request: Request) {
  return withApiUser(async (userId) => {
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
