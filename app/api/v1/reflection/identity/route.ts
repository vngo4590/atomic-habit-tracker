import { handleApiError, jsonOk, readJson, withApiUser } from "@/lib/api/http";
import { identitySchema } from "@/lib/contracts/domain";
import { getIdentity, saveIdentity } from "@/lib/repositories/reflection";

export const runtime = "nodejs";

export async function GET() {
  return withApiUser(async (userId) => jsonOk({ identity: await getIdentity(userId) }));
}

export async function PUT(request: Request) {
  return withApiUser(async (userId) => {
    const input = identitySchema.parse(await readJson(request));
    const identity = await saveIdentity(userId, input);

    return jsonOk({ identity });
  }, handleApiError);
}
