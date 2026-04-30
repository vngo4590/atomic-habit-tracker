import { handleApiError, jsonOk, readJson, withApiUser } from "@/lib/api/http";
import { journalEntrySchema } from "@/lib/contracts/domain";
import { createJournalEntry, listJournalEntries } from "@/lib/repositories/reflection";

export const runtime = "nodejs";

export async function GET() {
  return withApiUser(async (userId) => jsonOk({ entries: await listJournalEntries(userId) }));
}

export async function POST(request: Request) {
  return withApiUser(async (userId) => {
    const input = journalEntrySchema.parse(await readJson(request));
    const entry = await createJournalEntry(userId, input);

    return jsonOk({ entry }, { status: 201 });
  }, handleApiError);
}
