const PUBLIC_FILE = /\.(.*)$/;

export const authRoutes = ["/login", "/register"] as const;

export function isAuthRoute(pathname: string) {
  return authRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export function isPublicPath(pathname: string) {
  return (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    PUBLIC_FILE.test(pathname) ||
    isAuthRoute(pathname)
  );
}

export function isProtectedPath(pathname: string) {
  return !isPublicPath(pathname);
}

export function hasSessionUser(session: unknown) {
  return Boolean(
    session &&
      typeof session === "object" &&
      "user" in session &&
      (session as { user?: unknown }).user,
  );
}

export function loginRedirectUrl(requestUrl: string) {
  const url = new URL(requestUrl);
  const loginUrl = new URL("/login", url);
  const callback = `${url.pathname}${url.search}`;

  if (callback !== "/") {
    loginUrl.searchParams.set("callbackUrl", callback);
  }

  return loginUrl;
}
