import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

// Production remains in construction by default. The OWNER can explicitly authorize
// the public launch by setting MAINTENANCE_MODE=false in the production environment.
const MAINTENANCE_MODE = process.env.MAINTENANCE_MODE !== "false";
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
