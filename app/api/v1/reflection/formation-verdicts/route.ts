import { handleApiError, jsonError, jsonOk, readJson, withApiUser } from "@/lib/api/http";
import { formationVerdictSchema } from "@/lib/contracts/domain";
import { logger } from "@/lib/logger";
import { listFormationVerdicts, saveFormationVerdict } from "@/lib/repositories/reflection";

const log = logger.child({ module: "api.v1.reflection.formation-verdicts" });

export const runtime = "nodejs";

export async function GET() {
  return withApiUser(async (userId) => {
    log.debug("GET /api/v1/reflection/formation-verdicts", { event: "api.reflection.formationVerdict.list", userId });
    return jsonOk({ verdicts: await listFormationVerdicts(userId) });
  });
}

export async function POST(request: Request) {
  return withApiUser(async (userId) => {
    log.debug("POST /api/v1/reflection/formation-verdicts", { event: "api.reflection.formationVerdict.create", userId });
    const input = formationVerdictSchema.parse(await readJson(request));
    const verdict = await saveFormationVerdict(userId, {
      ...input,
      reviewedAt: input.reviewedAt ?? new Date().toISOString(),
    });

    if (!verdict) {
      return jsonError("not_found", "Habit was not found.", 404);
    }

    return jsonOk({ verdict }, { status: 201 });
  }, handleApiError);
}
