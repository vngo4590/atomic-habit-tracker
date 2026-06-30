import { buildBackup } from "@/lib/backup/export";
import { withApiUser } from "@/lib/api/http";
import { todayKey } from "@/lib/helpers";
import { logger, redactUserId } from "@/lib/logger";
import { getStoreSnapshot } from "@/lib/repositories/reflection";

const log = logger.child({ module: "api.v1.export" });

export const runtime = "nodejs";

/**
 * GET /api/v1/export
 *
 * Streams the authenticated user's *entire* dataset as a single versioned JSON
 * backup file. This is the authoritative export path (the Settings page and any
 * mobile/external client download from here) so the file is always built from
 * the database via `getStoreSnapshot`, never from a possibly-stale client cache.
 *
 * The response sets `Content-Disposition: attachment` with a dated filename so
 * browsers save it straight to disk. The body is the raw envelope (not wrapped
 * in the usual `{ ok, data }` API shape) so the saved file *is* the backup and
 * can be fed straight back into import.
 */
export async function GET() {
  return withApiUser(async (userId) => {
    log.debug("GET /api/v1/export", { event: "api.export.get", userId: redactUserId(userId) });

    // The pet ecosystem and weekly-review row are loaded against "today"; the
    // export only consumes the full weeklyReviews array + pets, so today's key
    // is a safe anchor here.
    const snapshot = await getStoreSnapshot(userId, todayKey());
    const envelope = buildBackup(snapshot);

    const filename = `atomicly-backup-${todayKey()}.json`;

    log.info("Data export generated", {
      event: "api.export.generated",
      userId: redactUserId(userId),
      habitCount: envelope.data.habits.length,
      journalCount: envelope.data.journal.length,
    });

    return new Response(JSON.stringify(envelope, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        // A backup reflects the moment it was taken — never serve a cached copy.
        "Cache-Control": "no-store",
      },
    });
  });
}
