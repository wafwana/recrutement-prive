import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

const MAINTENANCE_MODE = true;

export async function middleware(request: NextRequest) {
  if (MAINTENANCE_MODE) {
    const { pathname } = request.nextUrl;

    if (pathname !== "/maintenance" && !pathname.startsWith("/_next/")) {
      return NextResponse.rewrite(new URL("/maintenance", request.url));
    }

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
