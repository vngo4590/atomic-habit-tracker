import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { hasSessionUser, isAuthRoute, isProtectedPath, loginRedirectUrl } from "@/lib/auth/routes";

export default auth((request: NextRequest & { auth?: unknown }) => {
  const pathname = request.nextUrl.pathname;
  const hasSession = hasSessionUser(request.auth);

  if (!hasSession && isProtectedPath(pathname)) {
    return NextResponse.redirect(loginRedirectUrl(request.url));
  }

  if (hasSession && isAuthRoute(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
