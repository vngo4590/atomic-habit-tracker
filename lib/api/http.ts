import { ZodError } from "zod";

import { auth } from "@/auth";

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
  const session = await auth();
  return session?.user?.id ?? null;
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
  const userId = await requireApiUserId();

  if (!userId) {
    return jsonError("unauthenticated", "Authentication is required.", 401);
  }

  try {
    return await handler(userId);
  } catch (error) {
    return onError(error);
  }
}

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return validationError(error);
  }

  return unknownError();
}
