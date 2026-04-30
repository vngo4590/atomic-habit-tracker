import { handleApiError, jsonError, jsonOk, readJson, withApiUser } from "@/lib/api/http";
import { formationVerdictSchema } from "@/lib/contracts/domain";
import { listFormationVerdicts, saveFormationVerdict } from "@/lib/repositories/reflection";

export const runtime = "nodejs";

export async function GET() {
  return withApiUser(async (userId) => jsonOk({ verdicts: await listFormationVerdicts(userId) }));
}

export async function POST(request: Request) {
  return withApiUser(async (userId) => {
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
