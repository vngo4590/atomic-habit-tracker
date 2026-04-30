import { auth } from "@/auth";
import { jsonOk } from "@/lib/api/http";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();

  return jsonOk({
    authenticated: Boolean(session?.user?.id),
    user: session?.user?.id
      ? {
          id: session.user.id,
          name: session.user.name ?? null,
          email: session.user.email ?? null,
          image: session.user.image ?? null,
        }
      : null,
  });
}
