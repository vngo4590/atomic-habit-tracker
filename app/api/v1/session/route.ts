import { jsonOk } from "@/lib/api/http";
import { getCurrentUser } from "@/lib/auth/session";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "api.v1.session" });

export const runtime = "nodejs";

export async function GET() {
  log.debug("GET /api/v1/session", { event: "api.session.get" });
  const user = await getCurrentUser();

  return jsonOk({
    authenticated: Boolean(user),
    user: user
      ? {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        }
      : null,
  });
}
