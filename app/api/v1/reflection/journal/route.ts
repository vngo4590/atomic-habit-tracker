import { handleApiError, jsonOk, readJson, withApiUser } from "@/lib/api/http";
import { journalEntrySchema } from "@/lib/contracts/domain";
import { logger } from "@/lib/logger";
import { createJournalEntry, listJournalEntries } from "@/lib/repositories/reflection";

const log = logger.child({ module: "api.v1.reflection.journal" });

export const runtime = "nodejs";

export async function GET() {
  return withApiUser(async (userId) => {
    log.debug("GET /api/v1/reflection/journal", { event: "api.reflection.journal.list", userId });
    return jsonOk({ entries: await listJournalEntries(userId) });
  });
}

export async function POST(request: Request) {
  return withApiUser(async (userId) => {
    log.debug("POST /api/v1/reflection/journal", { event: "api.reflection.journal.create", userId });
    const input = journalEntrySchema.parse(await readJson(request));
    const entry = await createJournalEntry(userId, input);

    return jsonOk({ entry }, { status: 201 });
  }, handleApiError);
}
