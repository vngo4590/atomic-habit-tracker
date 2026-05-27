import { handleApiError, jsonOk, readJson, withApiUser } from "@/lib/api/http";
import { identitySchema } from "@/lib/contracts/domain";
import { logger } from "@/lib/logger";
import { getIdentity, saveIdentity } from "@/lib/repositories/reflection";

const log = logger.child({ module: "api.v1.reflection.identity" });

export const runtime = "nodejs";

export async function GET() {
  return withApiUser(async (userId) => {
    log.debug("GET /api/v1/reflection/identity", { event: "api.reflection.identity.get", userId });
    return jsonOk({ identity: await getIdentity(userId) });
  });
}

export async function PUT(request: Request) {
  return withApiUser(async (userId) => {
    log.debug("PUT /api/v1/reflection/identity", { event: "api.reflection.identity.update", userId });
    const input = identitySchema.parse(await readJson(request));
    const identity = await saveIdentity(userId, input);

    return jsonOk({ identity });
  }, handleApiError);
}
