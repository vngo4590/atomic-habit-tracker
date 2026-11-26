import { handleApiError, jsonOk, readJson, withApiUser } from "@/lib/api/http";
import { preferencesSchema } from "@/features/settings/contracts";
import { logger } from "@/lib/logger";
import { getPreferences, savePreferences } from "@/features/settings/server";

const log = logger.child({ module: "api.v1.reflection.preferences" });

export const runtime = "nodejs";

export async function GET() {
  return withApiUser(async (userId) => {
    log.debug("GET /api/v1/reflection/preferences", { event: "api.reflection.preferences.get", userId });
    return jsonOk({ preferences: await getPreferences(userId) });
  });
}

export async function PATCH(request: Request) {
  return withApiUser(async (userId) => {
    log.debug("PATCH /api/v1/reflection/preferences", { event: "api.reflection.preferences.update", userId });
    const input = preferencesSchema.parse(await readJson(request));
    const preferences = await savePreferences(userId, input);

    return jsonOk({ preferences });
  }, handleApiError);
}
