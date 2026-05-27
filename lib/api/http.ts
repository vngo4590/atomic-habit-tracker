import { ZodError } from "zod";

import { getCurrentUserId } from "@/lib/auth/session";
import { logger, redactUserId } from "@/lib/logger";

const log = logger.child({ module: "api" });

/** Generate a short random request ID for correlating log entries. */
function generateRequestId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export interface ApiErrorBody {
  ok: false;
  error: {
    code: string;
    message: string;
    fields?: Record<string, string[]>;
  };
}

export interface ApiSuccessBody<T> {
  ok: true;
  data: T;
}

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return Response.json({ ok: true, data } satisfies ApiSuccessBody<T>, init);
}

export function jsonError(code: string, message: string, status: number, fields?: Record<string, string[]>) {
  return Response.json(
    {
      ok: false,
      error: {
        code,
        message,
        ...(fields ? { fields } : {}),
      },
    } satisfies ApiErrorBody,
    { status },
  );
}

export async function requireApiUserId() {
  return getCurrentUserId();
}

export function validationError(error: ZodError) {
  return jsonError("validation_failed", "Request validation failed.", 422, error.flatten().fieldErrors);
}

export function unknownError() {
  return jsonError("internal_error", "Something went wrong.", 500);
}

export async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export async function withApiUser(
  handler: (userId: string) => Promise<Response>,
  onError: (error: unknown) => Response = handleApiError,
) {
  const requestId = generateRequestId();
  const userId = await requireApiUserId();

  if (!userId) {
    log.warn("API request rejected — unauthenticated", { event: "api.unauthenticated", requestId });
    return jsonError("unauthenticated", "Authentication is required.", 401);
  }

  try {
    return await handler(userId);
  } catch (error) {
    log.error("API request failed", { event: "api.request_failed", requestId, userId: redactUserId(userId), error });
    return onError(error);
  }
}

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    log.warn("API validation failed", { event: "api.validation_failed" });
    return validationError(error);
  }

  log.error("Unhandled API error", { event: "api.internal_error", error });
  return unknownError();
}
