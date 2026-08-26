import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

// Production is functional. Maintenance can be enabled explicitly through Vercel.
const MAINTENANCE_MODE = process.env.MAINTENANCE_MODE === "true";
const PUBLIC_PATHS = new Set(["/", "/connexion", "/maintenance"]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (MAINTENANCE_MODE) {
    if (pathname !== "/maintenance" && !pathname.startsWith("/_next/") && !pathname.startsWith("/api/")) {
      return NextResponse.rewrite(new URL("/maintenance", request.url));
    }
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.has(pathname) || pathname.startsWith("/_next/")) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  });

  if (!token) {
    return NextResponse.redirect(new URL("/connexion", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/).*)"],
};
