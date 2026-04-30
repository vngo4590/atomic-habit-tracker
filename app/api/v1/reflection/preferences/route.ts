import { handleApiError, jsonOk, readJson, withApiUser } from "@/lib/api/http";
import { preferencesSchema } from "@/lib/contracts/domain";
import { getPreferences, savePreferences } from "@/lib/repositories/reflection";

export const runtime = "nodejs";

export async function GET() {
  return withApiUser(async (userId) => jsonOk({ preferences: await getPreferences(userId) }));
}

export async function PATCH(request: Request) {
  return withApiUser(async (userId) => {
    const input = preferencesSchema.parse(await readJson(request));
    const preferences = await savePreferences(userId, input);

    return jsonOk({ preferences });
  }, handleApiError);
}
