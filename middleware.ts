import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

// Public production remains in construction until the OWNER explicitly authorizes launch.
// Preview/development deployments remain available for authorized testing.
const IS_PRODUCTION = process.env.VERCEL_ENV === "production";
const MAINTENANCE_MODE = IS_PRODUCTION || process.env.MAINTENANCE_MODE === "true";
const PUBLIC_PATHS = new Set(["/", "/connexion", "/maintenance", "/mot-de-passe-oublie", "/reinitialisation-mot-de-passe"]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  });

  const isOwner = token?.role === "OWNER";

  if (MAINTENANCE_MODE && !isOwner) {
    if (pathname !== "/maintenance" && !pathname.startsWith("/_next/")) {
      return NextResponse.rewrite(new URL("/maintenance", request.url));
    }
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.has(pathname) || pathname.startsWith("/inscription") || pathname.startsWith("/_next/")) {
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL("/connexion", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/).*)"],
};
